#!/usr/bin/env node
/**
 * generate-nav-sections.js — Générateur du manifeste de sections sidebar
 * Design System msyx.fr — bin/generate-nav-sections.js v2.0 (parsing statique)
 *
 * Usage :
 *   node bin/generate-nav-sections.js          # Génère et inline dans shared/nav.js
 *   node bin/generate-nav-sections.js --check  # Valide sans écrire (mode CI)
 *
 * Scanne les `.main > section[id]` (enfants DIRECTS de .main) de chaque page
 * listée dans NAV_PAGES_PATHS, extrait {id, label} depuis le premier
 * `.section-header h2` (sinon premier h2 descendant, sinon id), et inline le
 * résultat entre les marqueurs AUTO-GENERATED dans shared/nav.js.
 *
 * Parsing 100% STATIQUE (string/regex) — AUCUN navigateur, AUCUNE dépendance
 * (pas de jsdom/cheerio/parse5). Même philosophie que bin/generate-registry.js :
 * rapide (< 5s) et robuste en CI (zéro download navigateur, zéro apt/sudo).
 *
 * Réplique la sémantique `.main > section[id]` via un scanner de profondeur de
 * balises : repère l'ouverture de l'élément `class="main"`, suit sa fermeture
 * par comptage de profondeur (div/section), et ne retient que les
 * `<section id="...">` à profondeur 1 sous .main (PAS les sections imbriquées
 * dans les démos, ni celles hors .main). Le label réplique `textContent.trim()`
 * (strip des balises internes + décodage des entités + collapse des espaces).
 *
 * La MÊME fonction d'extraction sert à la génération ET au --check
 * → idempotence garantie (match exact, 0 flakiness).
 *
 * Anti-dérive CI (#528, esprit #516/#523) :
 *   --check : régénère en mémoire, compare à l'inliné actuel → exit 1 si divergence.
 *   Garantit que le manifeste ne peut pas dériver des sections réelles.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CHECK_MODE = process.argv.includes('--check');

// ─── Chemins ──────────────────────────────────────────────────────────────────

const SCRIPT_DIR = path.dirname(__filename);
const ROOT = path.resolve(SCRIPT_DIR, '..');
const NAV_JS_PATH = path.join(ROOT, 'shared', 'nav.js');

// Marqueurs délimitant le bloc auto-généré dans nav.js
const MARKER_START = '/* AUTO-GENERATED NAV SECTIONS START — ne pas éditer à la main (bin/generate-nav-sections.js) */';
const MARKER_END   = '/* AUTO-GENERATED NAV SECTIONS END */';

// Pages à scanner — miroir de NAV_PAGES dans shared/nav.js (pages non-flat uniquement).
const NAV_PAGES_PATHS = [
  '/pages/getting-started.html',
  '/pages/fondation.html',
  '/pages/composants.html',
  '/pages/formulaires.html',
  '/pages/navigation.html',
  '/pages/data.html',
  '/pages/feedback.html',
  '/pages/overlays.html',
  '/pages/divers.html',
  '/pages/templates.html',
];

// Comptes cibles par page (rendu réel, 2026-06-15).
// Le --check échoue si un compte dévie (détecte un risque de sur/sous-comptage).
const EXPECTED_COUNTS = {
  '/pages/getting-started.html': 6,
  '/pages/fondation.html':       16,
  '/pages/composants.html':      13,
  '/pages/formulaires.html':     17,
  '/pages/navigation.html':      8,
  '/pages/data.html':            16,
  '/pages/feedback.html':        12,
  '/pages/overlays.html':        7,
  '/pages/divers.html':          11,
  '/pages/templates.html':       6,
};
const EXPECTED_TOTAL = 112;

// ─── Décodage des entités HTML ─────────────────────────────────────────────────

// Entités nommées courantes rencontrées dans les copies user-facing du DS.
// (Le DS interdit les diacritiques bruts → entités fréquentes, cf. check-diacritics.sh)
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  // Accents/ligatures FR usuels
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  agrave: 'à', acirc: 'â', auml: 'ä', aacute: 'á',
  ugrave: 'ù', ucirc: 'û', uuml: 'ü', uacute: 'ú',
  igrave: 'ì', icirc: 'î', iuml: 'ï', iacute: 'í',
  ograve: 'ò', ocirc: 'ô', ouml: 'ö', oacute: 'ó',
  ccedil: 'ç', ntilde: 'ñ',
  Eacute: 'É', Egrave: 'È', Ecirc: 'Ê',
  Agrave: 'À', Acirc: 'Â', Ccedil: 'Ç',
  // Symboles courants
  rarr: '→', larr: '←', uarr: '↑', darr: '↓', harr: '↔',
  hellip: '…', mdash: '—', ndash: '–', times: '×', deg: '°',
  laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™',
  euro: '€', middot: '·', bull: '•', dagger: '†', sect: '§',
};

/**
 * Décode les entités HTML d'une chaîne :
 *   - numériques décimales (&#NN;) et hexadécimales (&#xHH;)
 *   - nommées courantes (table NAMED_ENTITIES)
 * Une entité inconnue est laissée telle quelle (comportement conservateur).
 * @param {string} str
 * @returns {string}
 */
function decodeEntities(str) {
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, function (whole, body) {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const num = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isNaN(num)) return whole;
      try {
        return String.fromCodePoint(num);
      } catch (e) {
        return whole;
      }
    }
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)) {
      return NAMED_ENTITIES[body];
    }
    return whole; // entité nommée inconnue → inchangée
  });
}

/**
 * Réplique `element.textContent.trim()` (collapse whitespace) à partir d'un
 * fragment HTML : retire toutes les balises internes, décode les entités,
 * collapse les espaces (incl. retours ligne/tabs), trim.
 * @param {string} innerHtml  contenu HTML interne (sans la balise englobante)
 * @returns {string}
 */
function htmlToText(innerHtml) {
  const noTags = innerHtml.replace(/<[^>]*>/g, '');
  const decoded = decodeEntities(noTags);
  return decoded.replace(/\s+/g, ' ').trim();
}

// ─── Scanner de balises (profondeur) ───────────────────────────────────────────

/**
 * Trouve le prochain tag `<...>` à partir de `from`, en sautant les
 * commentaires HTML `<!-- ... -->`.
 *
 * IMPORTANT : la recherche du `>` de fin est SENSIBLE AUX GUILLEMETS. Un `>`
 * situé à l'intérieur d'une valeur d'attribut quotée (simple ou double) ne
 * termine PAS le tag. Indispensable pour les attributs qui embarquent du
 * markup, ex. `data-copy='<button ...>...</button>'` (divers.html). C'est ce
 * qui faisait diverger un tokenizer naïf `indexOf('>')` du parser navigateur.
 *
 * @returns {{ tagStart: number, tagEnd: number, raw: string } | null}
 *   tagStart = position du '<', tagEnd = position juste après le '>'.
 */
function nextTag(html, from) {
  let i = html.indexOf('<', from);
  while (i !== -1) {
    // Commentaire HTML → sauter jusqu'à -->
    if (html.startsWith('<!--', i)) {
      const close = html.indexOf('-->', i + 4);
      if (close === -1) return null;
      i = html.indexOf('<', close + 3);
      continue;
    }
    // Scanner jusqu'au '>' de fermeture, en respectant les attributs quotés.
    let quote = null; // null | '"' | "'"
    for (let j = i + 1; j < html.length; j++) {
      const ch = html[j];
      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '>') {
        return { tagStart: i, tagEnd: j + 1, raw: html.slice(i, j + 1) };
      }
    }
    return null; // tag non terminé
  }
  return null;
}

// Éléments « void » HTML5 (auto-fermants, jamais de balise fermante).
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Analyse un tag brut `<...>` et retourne ses métadonnées.
 * @param {string} raw  ex. '<section id="foo" class="bar">'
 * @returns {{ name: string, isClose: boolean, isSelfClose: boolean, attrs: string }}
 */
function parseTag(raw) {
  const inner = raw.slice(1, -1); // enlève < >
  const isClose = inner[0] === '/';
  const body = isClose ? inner.slice(1) : inner;
  const m = /^([a-zA-Z][a-zA-Z0-9-]*)/.exec(body);
  const name = m ? m[1].toLowerCase() : '';
  const isSelfClose = /\/\s*$/.test(inner);
  const attrs = m ? body.slice(m[0].length) : '';
  return { name, isClose, isSelfClose, attrs };
}

/**
 * Indique si un tag (ouvrant) modifie la profondeur de nesting.
 * Les éléments void et les self-closing ne comptent pas.
 */
function affectsDepth(tag) {
  if (tag.isSelfClose) return false;
  if (VOID_ELEMENTS.has(tag.name)) return false;
  return true;
}

/**
 * Extrait la valeur de l'attribut `id` d'une chaîne d'attributs.
 * @returns {string|null}
 */
function extractId(attrs) {
  const m = /\bid\s*=\s*"([^"]*)"|^\s*id\s*=\s*'([^']*)'|\bid\s*=\s*'([^']*)'/.exec(attrs);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

/**
 * Détermine si un tag ouvrant porte la classe `main` (élément conteneur .main).
 */
function hasMainClass(attrs) {
  const m = /\bclass\s*=\s*"([^"]*)"|\bclass\s*=\s*'([^']*)'/.exec(attrs);
  if (!m) return false;
  const classes = (m[1] ?? m[2] ?? '').split(/\s+/);
  return classes.includes('main');
}

/**
 * Extrait, pour une page HTML, les sections `.main > section[id]` (enfants
 * directs de .main) avec leur label. Parsing 100% statique avec comptage de
 * profondeur. Réplique la sémantique `document.querySelectorAll('.main > section[id]')`.
 *
 * @param {string} html  contenu HTML de la page
 * @returns {Array<{id: string, label: string}>}
 */
function extractSections(html) {
  // 1) Localiser le tag ouvrant de .main
  let mainOpenEnd = -1;
  {
    let cursor = 0;
    let tag;
    while ((tag = nextTag(html, cursor)) !== null) {
      const parsed = parseTag(tag.raw);
      if (!parsed.isClose && parsed.name === 'div' && hasMainClass(parsed.attrs)) {
        mainOpenEnd = tag.tagEnd;
        break;
      }
      // Couvrir le cas (hypothétique) <main class="main"> ou autre élément
      if (!parsed.isClose && parsed.name === 'main' && (hasMainClass(parsed.attrs) || true)) {
        // Note : aujourd'hui toutes les pages utilisent <div class="main">.
        // On ne matche <main> que s'il porte explicitement class="main".
        if (hasMainClass(parsed.attrs)) {
          mainOpenEnd = tag.tagEnd;
          break;
        }
      }
      cursor = tag.tagEnd;
    }
  }
  if (mainOpenEnd === -1) {
    throw new Error('Conteneur .main introuvable dans la page.');
  }

  // 2) Parcourir le contenu de .main en suivant la profondeur.
  //    depth = 0 → directement sous .main (enfants directs).
  //    On collecte les <section id> ouverts à depth === 0.
  const sections = [];
  let depth = 0;
  let cursor = mainOpenEnd;
  let tag;

  while ((tag = nextTag(html, cursor)) !== null) {
    const parsed = parseTag(tag.raw);
    cursor = tag.tagEnd;

    if (parsed.isClose) {
      if (depth === 0) {
        // Fermeture qui ramène sous le niveau de .main → fin de .main.
        // (le </div> de .main lui-même)
        break;
      }
      depth--;
      continue;
    }

    // Tag ouvrant
    const isDirectChildSection =
      parsed.name === 'section' && depth === 0;

    if (isDirectChildSection) {
      const id = extractId(parsed.attrs);
      if (id) {
        // Trouver la fin de cette section pour en extraire le label.
        const sectionInner = sliceSectionInner(html, cursor);
        const label = extractLabel(sectionInner) || id;
        sections.push({ id, label });
      }
    }

    if (affectsDepth(parsed)) {
      depth++;
    }
  }

  return sections;
}

/**
 * À partir de la position juste APRÈS le tag ouvrant d'une <section> (de
 * profondeur connue = enfant direct de .main), retourne le HTML interne de la
 * section (jusqu'à son </section> appariée par comptage de profondeur).
 * @param {string} html
 * @param {number} from  index juste après '<section ...>'
 * @returns {string}
 */
function sliceSectionInner(html, from) {
  let depth = 0;
  let cursor = from;
  let tag;
  while ((tag = nextTag(html, cursor)) !== null) {
    const parsed = parseTag(tag.raw);
    if (parsed.isClose) {
      if (depth === 0) {
        // </section> appariée
        return html.slice(from, tag.tagStart);
      }
      depth--;
    } else if (affectsDepth(parsed)) {
      depth++;
    }
    cursor = tag.tagEnd;
  }
  // Section non fermée (HTML malformé) → tout le reste
  return html.slice(from);
}

/**
 * Extrait le label d'une section depuis son HTML interne.
 * Réplique : `sec.querySelector('.section-header h2') || sec.querySelector('h2')`
 * puis `textContent.trim()`.
 *   1. premier <h2> à l'intérieur d'un élément `class="...section-header..."`
 *   2. sinon premier <h2> descendant
 * @param {string} sectionInner
 * @returns {string|null}
 */
function extractLabel(sectionInner) {
  // (1) premier .section-header h2 (en document order)
  const headerH2 = firstSectionHeaderH2(sectionInner);
  if (headerH2 !== null) return htmlToText(headerH2);

  // (2) fallback : premier h2 descendant
  const m = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(sectionInner);
  if (m) return htmlToText(m[1]);

  return null;
}

/**
 * Trouve le contenu interne du premier <h2> situé DANS le premier élément
 * portant la classe `section-header`, en document order. Suit la fermeture de
 * cet élément par comptage de profondeur (le section-header peut contenir
 * d'autres balises avant le h2).
 * @param {string} sectionInner
 * @returns {string|null} contenu interne du h2, ou null si absent
 */
function firstSectionHeaderH2(sectionInner) {
  let cursor = 0;
  let tag;
  while ((tag = nextTag(sectionInner, cursor)) !== null) {
    const parsed = parseTag(tag.raw);
    cursor = tag.tagEnd;
    if (parsed.isClose) continue;
    if (parsed.isSelfClose) continue;
    if (hasSectionHeaderClass(parsed.attrs)) {
      // Délimiter le contenu de ce section-header, puis y chercher le 1er h2.
      const innerStart = cursor;
      let depth = 0;
      let c2 = innerStart;
      let t2;
      let innerEnd = sectionInner.length;
      while ((t2 = nextTag(sectionInner, c2)) !== null) {
        const p2 = parseTag(t2.raw);
        if (p2.isClose) {
          if (depth === 0) { innerEnd = t2.tagStart; break; }
          depth--;
        } else if (affectsDepth(p2)) {
          depth++;
        }
        c2 = t2.tagEnd;
      }
      const headerInner = sectionInner.slice(innerStart, innerEnd);
      const m = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(headerInner);
      return m ? m[1] : null;
    }
  }
  return null;
}

/**
 * Indique si une chaîne d'attributs porte la classe `section-header`.
 */
function hasSectionHeaderClass(attrs) {
  const m = /\bclass\s*=\s*"([^"]*)"|\bclass\s*=\s*'([^']*)'/.exec(attrs);
  if (!m) return false;
  const classes = (m[1] ?? m[2] ?? '').split(/\s+/);
  return classes.includes('section-header');
}

// ─── Extraction toutes pages ───────────────────────────────────────────────────

/**
 * Extrait les sections de toutes les pages de NAV_PAGES_PATHS.
 * @returns {Object.<string, Array<{id: string, label: string}>>}
 */
function extractSectionsAllPages() {
  const manifest = {};
  for (const pagePath of NAV_PAGES_PATHS) {
    const filePath = path.join(ROOT, pagePath.replace(/^\//, ''));
    const html = fs.readFileSync(filePath, 'utf8');
    manifest[pagePath] = extractSections(html);
  }
  return manifest;
}

// ─── Sérialisation JS ─────────────────────────────────────────────────────────

/**
 * Sérialise le manifeste en JS littéral inlinable.
 * Produit un bloc propre entre les marqueurs START/END.
 */
function serializeManifest(manifest) {
  const lines = [MARKER_START];
  lines.push('const NAV_SECTIONS_MANIFEST = {');

  const entries = Object.entries(manifest);
  entries.forEach(function ([pagePath, sections], i) {
    const isLast = i === entries.length - 1;
    const sectionsJson = JSON.stringify(sections);
    lines.push('  "' + pagePath + '": ' + sectionsJson + (isLast ? '' : ','));
  });

  lines.push('};');
  lines.push(MARKER_END);
  return lines.join('\n');
}

// ─── Lecture / Écriture nav.js ────────────────────────────────────────────────

/**
 * Extrait le bloc auto-généré actuellement inliné dans nav.js.
 * Retourne null si les marqueurs sont absents (première exécution).
 */
function readCurrentBlock(navJs) {
  const startIdx = navJs.indexOf(MARKER_START);
  const endIdx   = navJs.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1) return null;
  return navJs.slice(startIdx, endIdx + MARKER_END.length);
}

/**
 * Insère ou remplace le bloc auto-généré dans nav.js.
 * Si les marqueurs existent → remplace entre START et END.
 * Si absents → insère juste avant resolvePageSections() (première exécution).
 */
function injectBlock(navJs, newBlock) {
  const startIdx = navJs.indexOf(MARKER_START);
  const endIdx   = navJs.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    return navJs.slice(0, startIdx) + newBlock + navJs.slice(endIdx + MARKER_END.length);
  }

  const insertBefore = 'async function resolvePageSections()';
  const insertIdx = navJs.indexOf(insertBefore);
  if (insertIdx === -1) {
    throw new Error('Marqueur d\'insertion introuvable : "' + insertBefore + '"');
  }
  return navJs.slice(0, insertIdx) + newBlock + '\n\n' + navJs.slice(insertIdx);
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Valide les comptes par page et le total.
 * Échoue si un compte dévie de EXPECTED_COUNTS.
 */
function validateCounts(manifest) {
  let total = 0;
  const errors = [];

  for (const [pagePath, sections] of Object.entries(manifest)) {
    const count = sections.length;
    total += count;
    const expected = EXPECTED_COUNTS[pagePath];
    if (expected !== undefined && count !== expected) {
      errors.push('  ' + pagePath + ': attendu ' + expected + ', obtenu ' + count);
    }
    console.log('  ' + pagePath + ': ' + count + ' sections');
  }

  console.log('  TOTAL: ' + total + ' sections');

  if (total !== EXPECTED_TOTAL) {
    errors.push('Total: attendu ' + EXPECTED_TOTAL + ', obtenu ' + total);
  }

  if (errors.length) {
    console.error('\n[ERREUR] Comptes inattendus :');
    errors.forEach(e => console.error(e));
    console.error('\nSi des sections ont été ajoutées/supprimées, mettre à jour EXPECTED_COUNTS dans bin/generate-nav-sections.js.');
    return false;
  }

  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(function main() {
  try {
    console.log('[generate-nav-sections] Mode: ' + (CHECK_MODE ? '--check (CI)' : 'génération'));
    console.log('[generate-nav-sections] Extraction des sections (parsing statique)...');

    const manifest = extractSectionsAllPages();

    console.log('\n[generate-nav-sections] Sections par page :');
    const valid = validateCounts(manifest);
    if (!valid) {
      process.exit(1);
    }

    const newBlock = serializeManifest(manifest);
    const navJs = fs.readFileSync(NAV_JS_PATH, 'utf8');

    if (CHECK_MODE) {
      const currentBlock = readCurrentBlock(navJs);
      if (currentBlock === null) {
        console.error('\n[ERREUR --check] Aucun bloc AUTO-GENERATED trouvé dans shared/nav.js.');
        console.error('Lancez : node bin/generate-nav-sections.js (sans --check) pour initialiser.');
        process.exit(1);
      }
      if (currentBlock === newBlock) {
        console.log('\n[OK] Manifeste à jour — aucune divergence détectée.');
        process.exit(0);
      } else {
        console.error('\n[ERREUR --check] Manifeste obsolète dans shared/nav.js !');
        console.error('Les sections des pages ont changé. Lancez :');
        console.error('  node bin/generate-nav-sections.js');
        console.error('puis committez shared/nav.js.');
        process.exit(1);
      }
    }

    const updatedNavJs = injectBlock(navJs, newBlock);
    fs.writeFileSync(NAV_JS_PATH, updatedNavJs, 'utf8');

    // Idempotence : 2ème run = 0 changement
    const navJs2 = fs.readFileSync(NAV_JS_PATH, 'utf8');
    const block2 = readCurrentBlock(navJs2);
    if (block2 !== newBlock) {
      console.error('\n[ERREUR] Idempotence KO — le bloc diffère après réécriture. Bug dans injectBlock().');
      process.exit(1);
    }

    console.log('\n[OK] shared/nav.js mis à jour — manifeste inliné entre marqueurs AUTO-GENERATED.');
    process.exit(0);

  } catch (err) {
    console.error('\n[FATAL] ' + err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
})();
