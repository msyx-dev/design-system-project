#!/usr/bin/env node
/**
 * check-dead-classes.js — Garde-fou « classe posée par le JS mais absente du CSS » (#765)
 * Design System msyx.fr — bin/check-dead-classes.js v1.0
 *
 * Contexte : trois occurrences du même défaut sur trois composants sans lien
 * (chevron accordéon #749, `.split-pane--dragging` #763, `.json-node--last`
 * port #596) — le JS pose une classe d'état, le CSS ne la consomme jamais.
 * Invisible en test (la classe *est* posée dans le DOM) et en review (il faut
 * ouvrir un deuxième fichier pour vérifier).
 *
 * Ce que fait le script :
 *   1. Extrait les classes posées par le JS dans shared/components.js et
 *      shared/nav.js : `classList.add(...)`, `classList.toggle(...)`,
 *      `classList.remove(...)` (multi-arguments), `className = …`,
 *      `className += …`, `setAttribute('class', …)`.
 *   2. Extrait tous les sélecteurs de classe définis dans shared/css/**\/*.css
 *      (tous les modules, y compris les barrels).
 *   3. Signale toute classe posée par le JS qui n'apparaît dans AUCUN
 *      sélecteur CSS.
 *
 * Le piège de ce ticket est le bruit — trois familles de faux positifs sont
 * gérées explicitement :
 *   - classes construites dynamiquement (`'btn-' + variant`) : impossible à
 *     résoudre statiquement. Le scanner ne garde que les TOKENS d'un segment
 *     littéral dont la frontière (début/fin) est garantie par un espace
 *     appartenant AU MÊME segment littéral (ou par le début/la fin de toute
 *     l'expression). Un token collé au `+` sans espace (ex: `'btn-'` dans
 *     `'btn ' + variant`… non — ex réel : `'btn btn-' + variant`) est
 *     ignoré proprement plutôt que de produire un faux positif/négatif.
 *   - classes construites via template literal avec interpolation
 *     (`` `foo-${x}` ``) : même traitement, le segment interpolé est opaque.
 *   - classes hors périmètre (page CSS, hook JS pur, etc.) : liste
 *     d'EXEMPTIONS documentée ci-dessous, une raison par entrée (cohérent
 *     avec `// ds-allow-innerhtml: <raison>` de bin/check-innerhtml.js).
 *
 * Usage :
 *   node bin/check-dead-classes.js                    # warn-only, exit 0 (défaut)
 *   node bin/check-dead-classes.js --strict            # exit 1 si classes mortes non exemptées
 *   node bin/check-dead-classes.js --js=a.js,b.js --css=dir1,file2.css   # fichiers custom (tests)
 *
 * Zéro dépendance (cohérent avec bin/generate-*.js et bin/check-innerhtml.js).
 * Scanner artisanal conscient des chaînes/template literals et des
 * parenthèses/accolades/crochets imbriqués — pas un vrai parseur AST, mais
 * suffisant pour ce style de code (même principe que check-innerhtml.js).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_JS_FILES = ['shared/components.js', 'shared/nav.js'];
const DEFAULT_CSS_TARGETS = ['shared/css'];

// ─── Exemptions ─────────────────────────────────────────────────────────────
// Une classe posée par le JS peut être légitimement absente de shared/css/
// pour des raisons précises. Chaque entrée EXIGE une raison (même principe
// que la dérogation `ds-allow-innerhtml` de bin/check-innerhtml.js) — ne
// JAMAIS ajouter une classe ici pour faire taire le garde-fou sans avoir
// vérifié qu'elle est réellement stylée ailleurs ou qu'il s'agit d'un hook
// JS pur sans style dédié.
const EXEMPTIONS = {
  // (déclarées après audit du premier run réel — voir docs/DS-PRINCIPLES.md
  // §9 « anti-dette » pour la définition de « hook JS sans style »)
};

// ─── Scanner de chaînes/template literals (même principe que check-innerhtml.js) ──

function scanStringLiteral(src, start) {
  const quote = src[start];
  let i = start + 1;
  let hasInterpolation = false;
  let raw = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') { raw += src.slice(i, i + 2); i += 2; continue; }
    if (quote === '`' && ch === '$' && src[i + 1] === '{') {
      hasInterpolation = true;
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        const c2 = src[i];
        if (c2 === '{') { depth++; i++; continue; }
        if (c2 === '}') { depth--; i++; continue; }
        if (c2 === "'" || c2 === '"' || c2 === '`') {
          const r = scanStringLiteral(src, i);
          i = r.end;
          continue;
        }
        i++;
      }
      continue;
    }
    if (ch === quote) return { end: i + 1, hasInterpolation, raw };
    raw += ch;
    i++;
  }
  return { end: i, hasInterpolation, raw }; // non terminee -- ne devrait pas arriver sur du JS valide
}

function unescapeLiteral(raw) {
  return raw.replace(/\\(.)/g, (m, c) => {
    if (c === 'n') return '\n';
    if (c === 't') return '\t';
    return c; // \' \" \` \\ etc -> caractere litteral
  });
}

// Scanne une liste d'« arguments » séparés par des virgules top-level, chaque
// argument étant lui-même découpé en segments top-level séparés par `+`.
// `start` = index juste après le caractère ouvrant déjà consommé par
// l'appelant (le `(` d'un appel, OU l'opérateur `=`/`+=` d'une affectation).
// Fin de scan : `;` top-level, OU fermeture `)`/`]`/`}` qui ferait passer la
// profondeur sous 0 (fin de la construction englobante).
function scanArgs(src, start) {
  let i = start;
  let depth = 0;
  let segStart = start;
  let curSegs = [];
  const args = [];

  function pushSeg(end) {
    const rawText = src.slice(segStart, end);
    const trimmed = rawText.trim();
    if (!trimmed) return;
    const firstCh = trimmed[0];
    if (firstCh === "'" || firstCh === '"' || firstCh === '`') {
      const r = scanStringLiteral(trimmed, 0);
      if (r.end === trimmed.length && !(firstCh === '`' && r.hasInterpolation)) {
        curSegs.push({ type: 'literal', value: unescapeLiteral(r.raw) });
        return;
      }
    }
    curSegs.push({ type: 'dynamic' });
  }

  function pushArg(end) {
    pushSeg(end);
    args.push(curSegs);
    curSegs = [];
  }

  while (i < src.length) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const r = scanStringLiteral(src, i);
      i = r.end;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; i++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) { pushArg(i); return { end: i, args }; }
      depth--; i++; continue;
    }
    if (depth === 0 && ch === ';') { pushArg(i); return { end: i, args }; }
    if (depth === 0 && ch === ',') { pushArg(i); segStart = i + 1; i++; continue; }
    if (depth === 0 && ch === '+' && src[i + 1] !== '+') { pushSeg(i); segStart = i + 1; i++; continue; }
    i++;
  }
  pushArg(i);
  return { end: i, args };
}

// Extrait les tokens de classe « sûrs » d'une liste de segments (un seul
// argument). Un token littéral n'est retenu que si sa frontière gauche/droite
// est garantie : soit un espace appartenant AU MÊME segment littéral, soit
// le tout début/toute la fin de l'expression complète (rien à coller).
function extractSafeTokens(segments) {
  const safe = [];
  segments.forEach((seg, idx) => {
    if (seg.type !== 'literal') return;
    const content = seg.value;
    if (!content) return;
    const isFirstSeg = idx === 0;
    const isLastSeg = idx === segments.length - 1;
    const startsWs = isFirstSeg || /^\s/.test(content);
    const endsWs = isLastSeg || /\s$/.test(content);
    const tokens = content.split(/\s+/).filter(Boolean);
    tokens.forEach((tok, j) => {
      const isFirstTok = j === 0;
      const isLastTok = j === tokens.length - 1;
      const safeStart = !isFirstTok || startsWs;
      const safeEnd = !isLastTok || endsWs;
      if (safeStart && safeEnd) safe.push(tok);
    });
  });
  return safe;
}

function lineAt(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) {
    if (src[i] === '\n') line++;
  }
  return line;
}

// ─── Extraction des classes posées par le JS ───────────────────────────────

function findJsClasses(relPath, src) {
  // occurrences[className] = [{ file, line, construct }]
  const occurrences = new Map();

  function record(cls, index, construct) {
    if (!cls || /[${}]/.test(cls)) return; // garde-fou : jamais un fragment resté opaque
    if (!occurrences.has(cls)) occurrences.set(cls, []);
    occurrences.get(cls).push({ file: relPath, line: lineAt(src, index), construct });
  }

  // 1. classList.add(...) / classList.remove(...) — tous les arguments comptent.
  {
    const re = /\.classList\.(add|remove)\(/g;
    let m;
    while ((m = re.exec(src))) {
      const { args } = scanArgs(src, m.index + m[0].length);
      args.forEach((segs) => {
        extractSafeTokens(segs).forEach((tok) => record(tok, m.index, 'classList.' + m[1]));
      });
    }
  }

  // 2. classList.toggle('x', cond) — seul le 1er argument est un nom de classe.
  {
    const re = /\.classList\.toggle\(/g;
    let m;
    while ((m = re.exec(src))) {
      const { args } = scanArgs(src, m.index + m[0].length);
      if (args[0]) extractSafeTokens(args[0]).forEach((tok) => record(tok, m.index, 'classList.toggle'));
    }
  }

  // 3. .className = … / .className += …
  {
    const re = /\.className\s*(\+?=)(?!=)/g;
    let m;
    while ((m = re.exec(src))) {
      const { args } = scanArgs(src, m.index + m[0].length);
      if (args[0]) extractSafeTokens(args[0]).forEach((tok) => record(tok, m.index, 'className' + m[1]));
    }
  }

  // 4. setAttribute('class', …)
  {
    const re = /\.setAttribute\(/g;
    let m;
    while ((m = re.exec(src))) {
      const { args } = scanArgs(src, m.index + m[0].length);
      if (args.length >= 2 && args[0].length === 1 && args[0][0].type === 'literal' && args[0][0].value === 'class') {
        extractSafeTokens(args[1]).forEach((tok) => record(tok, m.index, 'setAttribute(class)'));
      }
    }
  }

  return occurrences;
}

// ─── Extraction des sélecteurs de classe CSS ───────────────────────────────
// Même règle que bin/generate-registry.js::extractClasses (cohérence outillage) :
// un `.classname` précédé d'une frontière de sélecteur (espace, virgule,
// `{`, `>`, `;`, `+`, `~`, `(`, ou début de ligne), lettre initiale, suivi de
// lettres/chiffres/tirets/underscores. Exclut pseudo-classes/éléments et
// sélecteurs d'attribut embarqués.
const CSS_CLASS_RE = /(?:^|[\s,{>;+~(])(\.[a-zA-Z][a-zA-Z0-9_-]*)/gm;

function extractCssClasses(content) {
  const found = new Set();
  let m;
  CSS_CLASS_RE.lastIndex = 0;
  while ((m = CSS_CLASS_RE.exec(content))) {
    const cls = m[1].slice(1); // enleve le '.'
    if (!cls.includes(':') && !cls.includes('[') && !cls.includes(')')) {
      found.add(cls);
    }
  }
  return found;
}

function scanCssFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (dir.endsWith('.css')) results.push(dir);
    return results;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanCssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Résolution de chemins (accepte relatif-repo ET absolu — cf. tests mktemp) ──

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { strict: false, jsFiles: null, cssTargets: null };
  argv.forEach((a) => {
    if (a === '--strict') opts.strict = true;
    else if (a.startsWith('--js=')) opts.jsFiles = a.slice('--js='.length).split(',').filter(Boolean);
    else if (a.startsWith('--css=')) opts.cssTargets = a.slice('--css='.length).split(',').filter(Boolean);
  });
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const jsFiles = opts.jsFiles || DEFAULT_JS_FILES;
  const cssTargets = opts.cssTargets || DEFAULT_CSS_TARGETS;

  // ── Fail-closed : un fichier/répertoire attendu introuvable = scan
  //    incomplet, JAMAIS un [OK] trompeur (cf. review #758 sur check-innerhtml.js).
  let missingCount = 0;
  jsFiles.forEach((relPath) => {
    const abs = resolvePath(relPath);
    if (!fs.existsSync(abs)) {
      console.error('[check-dead-classes] ERREUR : fichier JS introuvable : ' + relPath);
      missingCount++;
    }
  });
  const cssFiles = [];
  cssTargets.forEach((relPath) => {
    const abs = resolvePath(relPath);
    if (!fs.existsSync(abs)) {
      console.error('[check-dead-classes] ERREUR : cible CSS introuvable : ' + relPath);
      missingCount++;
      return;
    }
    cssFiles.push(...scanCssFiles(abs));
  });

  if (missingCount > 0) {
    console.error(
      '\n[ÉCHEC] ' + missingCount + ' fichier(s)/répertoire(s) attendu(s) introuvable(s) — scan ' +
      'incomplet, impossible de garantir l\'inventaire. Corrigez le chemin ou la liste par défaut.'
    );
    process.exit(1);
  }
  if (cssFiles.length === 0) {
    console.error('\n[ÉCHEC] Aucun fichier CSS trouvé dans les cibles — scan incomplet.');
    process.exit(1);
  }

  // ── Classes definies en CSS ────────────────────────────────────────────
  const cssClasses = new Set();
  cssFiles.forEach((abs) => {
    const content = fs.readFileSync(abs, 'utf8');
    extractCssClasses(content).forEach((c) => cssClasses.add(c));
  });

  // ── Classes posées par le JS ───────────────────────────────────────────
  const allOccurrences = new Map(); // className -> [{file, line, construct}]
  jsFiles.forEach((relPath) => {
    const abs = resolvePath(relPath);
    const src = fs.readFileSync(abs, 'utf8');
    const occ = findJsClasses(relPath, src);
    occ.forEach((locs, cls) => {
      if (!allOccurrences.has(cls)) allOccurrences.set(cls, []);
      allOccurrences.get(cls).push(...locs);
    });
  });

  // ── Croisement ──────────────────────────────────────────────────────────
  const deadClasses = [];
  const exemptedFound = [];
  const sortedClassNames = Array.from(allOccurrences.keys()).sort();
  sortedClassNames.forEach((cls) => {
    if (cssClasses.has(cls)) return; // vivante — rien à signaler
    if (Object.prototype.hasOwnProperty.call(EXEMPTIONS, cls)) {
      exemptedFound.push({ cls, reason: EXEMPTIONS[cls], locs: allOccurrences.get(cls) });
      return;
    }
    deadClasses.push({ cls, locs: allOccurrences.get(cls) });
  });

  // ── Rapport ─────────────────────────────────────────────────────────────
  console.log('[check-dead-classes] ' + sortedClassNames.length + ' classe(s) distincte(s) posée(s) par le JS analysé.');
  console.log('[check-dead-classes] ' + cssClasses.size + ' classe(s) distincte(s) trouvée(s) dans ' + cssFiles.length + ' fichier(s) CSS.');
  console.log('[check-dead-classes] Exemptions déclarées consommées : ' + exemptedFound.length + ' / ' + Object.keys(EXEMPTIONS).length);

  if (exemptedFound.length) {
    console.log('\n[check-dead-classes] Classes exemptées (raison documentée) :');
    exemptedFound.forEach(({ cls, reason, locs }) => {
      console.log('  .' + cls + '  — ' + reason);
      locs.slice(0, 1).forEach((l) => console.log('    posée dans ' + l.file + ':' + l.line + ' (' + l.construct + ')'));
    });
  }

  if (deadClasses.length) {
    console.log('\n[check-dead-classes] ' + deadClasses.length + ' classe(s) posée(s) par le JS et ABSENTE(S) de shared/css/ :\n');
    deadClasses.forEach(({ cls, locs }) => {
      console.log('  .' + cls);
      locs.forEach((l) => console.log('    ' + l.file + ':' + l.line + ' (' + l.construct + ')'));
    });
  } else {
    console.log('\n[check-dead-classes] Aucune classe morte détectée (hors exemptions).');
  }

  console.log(
    '\n[check-dead-classes] Récapitulatif : ' + deadClasses.length + ' classe(s) morte(s), ' +
    exemptedFound.length + ' exemptée(s), ' + (sortedClassNames.length - deadClasses.length - exemptedFound.length) +
    ' vivante(s) sur ' + sortedClassNames.length + ' analysée(s).'
  );

  if (deadClasses.length > 0) {
    if (opts.strict) {
      console.error(
        '\n[ÉCHEC --strict] ' + deadClasses.length + ' classe(s) posée(s) par le JS n\'ont aucune règle ' +
        'CSS dans shared/css/. Ajoutez la règle CSS manquante, ou déclarez une exemption documentée ' +
        '(raison obligatoire) si le cas est réellement légitime (hook JS pur, style porté par une page, etc.).'
      );
      process.exit(1);
    }
    console.log(
      '\n[WARN] mode par défaut (warn-only) — voir la liste ci-dessus. Relancer avec --strict ' +
      'pour un passage bloquant.'
    );
    process.exit(0);
  }

  console.log('[OK] Aucune classe morte non exemptée.');
  process.exit(0);
}

main();
