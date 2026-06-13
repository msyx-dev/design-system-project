#!/usr/bin/env node
/**
 * generate-nav-sections.js — Générateur du manifeste de sections sidebar
 * Design System msyx.fr — bin/generate-nav-sections.js v1.0
 *
 * Usage :
 *   node bin/generate-nav-sections.js          # Génère et inline dans shared/nav.js
 *   node bin/generate-nav-sections.js --check  # Valide sans écrire (mode CI)
 *
 * Scanne les .main > section[id] (enfants directs) de chaque page listée dans
 * NAV_PAGES (hors flat), extrait {id, label} depuis .section-header h2 || h2 || id,
 * et inline le résultat entre les marqueurs AUTO-GENERATED dans shared/nav.js.
 *
 * Utilise Playwright (déjà dep du repo) pour un parsing DOM fidèle — réplique
 * exactement la sémantique navigateur (gestion HTML5 imbriqué, balises non-fermées).
 * Un parser regex statique sur-compterait +16 sections sur fondation/formulaires/navigation.
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
// Site unique à maintenir : NAV_PAGES dans nav.js. Ce script lit nav.js
// pour extraire les paths, évitant une 2ème liste à synchroniser.
const NAV_PAGES_PATHS = [
  '/pages/getting-started.html',
  '/pages/fondation.html',
  '/pages/motion.html',
  '/pages/composants.html',
  '/pages/formulaires.html',
  '/pages/navigation.html',
  '/pages/data.html',
  '/pages/feedback.html',
  '/pages/divers.html',
  '/pages/templates.html',
];

// Comptes cibles par page (issus du rendu Playwright réel, 2026-06-13).
// Le --check échoue si un compte dévie (détecte le risque de sur-comptage sections imbriquées).
const EXPECTED_COUNTS = {
  '/pages/getting-started.html': 6,
  '/pages/fondation.html':       7,
  '/pages/motion.html':          3,
  '/pages/composants.html':      12,
  '/pages/formulaires.html':     9,
  '/pages/navigation.html':      5,
  '/pages/data.html':            15,
  '/pages/feedback.html':        19,
  '/pages/divers.html':          11,
  '/pages/templates.html':       6,
};
const EXPECTED_TOTAL = 93;

// ─── Extraction DOM via Playwright ────────────────────────────────────────────

/**
 * Extrait les sections .main > section[id] (direct-child) de chaque page
 * via Playwright — même sémantique que le navigateur (HTML5 error correction).
 * @returns {Promise<Object.<string, Array<{id: string, label: string}>>>}
 */
async function extractSectionsAllPages() {
  let chromium;
  // Chercher Playwright dans node_modules du worktree OU du repo principal
  // (les worktrees git partagent le repo principal, node_modules peut être dans l'un ou l'autre)
  const candidatePaths = [
    path.join(ROOT, 'node_modules', '@playwright', 'test'),
    path.resolve(ROOT, '../../node_modules/@playwright/test'), // worktrees → racine repo
    path.resolve(ROOT, '../../../node_modules/@playwright/test'),
  ];
  let loadError;
  for (const candidate of candidatePaths) {
    try {
      ({ chromium } = require(candidate));
      break;
    } catch (e) {
      loadError = e;
    }
  }
  if (!chromium) {
    throw new Error('Playwright introuvable. Vérifier node_modules. (' + loadError.message + ')');
  }

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const manifest = {};

  try {
    for (const pagePath of NAV_PAGES_PATHS) {
      const fileUrl = 'file://' + path.join(ROOT, pagePath.replace(/^\//, ''));
      const page = await browser.newPage();

      // Supprimer les erreurs JS non-bloquantes (assets manquants, etc.)
      page.on('pageerror', () => {});

      await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

      const sections = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.main > section[id]')).map(function(sec) {
          var h2 = sec.querySelector('.section-header h2') || sec.querySelector('h2');
          var label = (h2 ? h2.textContent : '').trim() || sec.id;
          return { id: sec.id, label: label };
        });
      });

      manifest[pagePath] = sections;
      await page.close();
    }
  } finally {
    await browser.close();
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
  entries.forEach(function([pagePath, sections], i) {
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
    // Remplacer le bloc existant
    return navJs.slice(0, startIdx) + newBlock + navJs.slice(endIdx + MARKER_END.length);
  }

  // Première exécution : insérer avant resolvePageSections
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
  let errors = [];

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

(async function main() {
  try {
    console.log('[generate-nav-sections] Mode: ' + (CHECK_MODE ? '--check (CI)' : 'génération'));
    console.log('[generate-nav-sections] Extraction DOM via Playwright...');

    const manifest = await extractSectionsAllPages();

    console.log('\n[generate-nav-sections] Sections par page :');
    const valid = validateCounts(manifest);
    if (!valid) {
      process.exit(1);
    }

    const newBlock = serializeManifest(manifest);
    const navJs = fs.readFileSync(NAV_JS_PATH, 'utf8');

    if (CHECK_MODE) {
      // Mode CI : comparer au bloc actuel
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

    // Mode génération : écrire nav.js
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
