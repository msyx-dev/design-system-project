// Test de non-regression — issue #247
// Verifie que les 4 SVG logo-msyx*.svg contiennent au moins 2 paths
// (enveloppe organique + M en double-pic de montagne en blanc).
// Regression v2.43.0 (S24 #209) : potrace mode trace simple n'avait livre
// que l'enveloppe exterieure, le M caracteristique etait absent.

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '../../assets');
const LOGO_FILES = [
  'logo-msyx.svg',
  'logo-msyx-mark.svg',
  'logo-msyx-dark.svg',
  'logo-msyx-light.svg',
];

let failed = false;

for (const file of LOGO_FILES) {
  const filePath = path.join(ASSETS_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`FAIL: ${file} introuvable`);
    failed = true;
    continue;
  }

  const svg = fs.readFileSync(filePath, 'utf8');

  // 1. Au moins 2 paths (enveloppe + M)
  const pathMatches = svg.match(/<path\s/g) || [];
  if (pathMatches.length < 2) {
    console.error(`FAIL: ${file} doit contenir au moins 2 paths (enveloppe + M en pic de montagne) — actuel: ${pathMatches.length}`);
    failed = true;
    continue;
  }

  // 2. ViewBox 1475x1562 conserve
  if (!svg.includes('viewBox="0 0 1475 1562"')) {
    console.error(`FAIL: ${file} viewBox doit rester 0 0 1475 1562`);
    failed = true;
    continue;
  }

  // 3. role + aria-label conserves (a11y)
  if (!svg.includes('role="img"') || !svg.includes('aria-label="msyx')) {
    console.error(`FAIL: ${file} doit conserver role="img" et aria-label="msyx*"`);
    failed = true;
    continue;
  }

  // 4. M en blanc present (fill="#ffffff" sur un des paths)
  if (!svg.includes('fill="#ffffff"')) {
    console.error(`FAIL: ${file} doit contenir un path avec fill="#ffffff" (M en pic blanc)`);
    failed = true;
    continue;
  }

  console.log(`OK: ${file} — ${pathMatches.length} paths, viewBox conserve, M blanc present`);
}

if (failed) {
  process.exit(1);
}

console.log('OK: tous les SVG logo-msyx ont le M en pic de montagne (#247 non-regression)');
