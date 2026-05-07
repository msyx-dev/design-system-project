// Test de non-regression — issue #206
// Verifie que shared/nav.js parse sans SyntaxError et que le span header-version est correctement clos.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const navPath = path.resolve(__dirname, '../../shared/nav.js');
const src = fs.readFileSync(navPath, 'utf8');

// 1. SyntaxError check
try {
  execSync(`node -c ${navPath}`, { stdio: 'pipe' });
} catch (err) {
  console.error('FAIL: nav.js a une SyntaxError');
  process.exit(1);
}

// 2. Le span header-version doit etre correctement clos
// La quote fermante apres </span> est la correction du bug #206
const headerVersionMatches = src.match(/<span class="header-version">v[\d.]+<\/span>'/g);
if (!headerVersionMatches || headerVersionMatches.length !== 1) {
  console.error('FAIL: header-version span mal forme ou manquant');
  process.exit(1);
}

// 3. Presence des elements structurels attendus dans le header
const requiredPatterns = [
  { pattern: /<a href="\/site\.html" class="header-logo">/, label: 'header-logo link' },
  { pattern: /<img src="\/assets\/logo-msyx\.svg"/, label: 'logo-msyx.svg img' },
  { pattern: /<span class="header-spacer">/, label: 'header-spacer' },
  { pattern: /<div class="theme-switcher">/, label: 'theme-switcher' },
  { pattern: /<div class="mode-toggle">/, label: 'mode-toggle' },
];

for (const { pattern, label } of requiredPatterns) {
  if (!pattern.test(src)) {
    console.error(`FAIL: element manquant dans nav.js — ${label}`);
    process.exit(1);
  }
}

console.log('OK: nav.js parse + header-version span bien clos (#206 non-regression)');
