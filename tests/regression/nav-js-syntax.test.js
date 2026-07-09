// Test de non-regression — issue #206
// Verifie que shared/nav.js parse sans SyntaxError et que le badge de version est correctement clos.
// Note #645 : le span header-version (statique) a ete remplace par un bouton
// .version-badge cliquable (dogfood du composant version-notes, #614) — le
// check ci-dessous est adapte a ce nouveau markup (meme esprit : template
// literal bien ferme, VERSION definie).
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

// 2. Le badge .version-badge doit etre correctement clos (prevention #206, adapte #645)
// Apres refactor #211 : template literal avec ${VERSION}, pas de concat fragile.
// Apres #645 : le badge est son propre template literal (versionBadgeHtml) —
// on verifie qu'il est bien ferme et reference bien ${VERSION}.
const versionBadgeTemplateLiteral = src.match(/`<button class="version-badge header-version-badge"[^`]*v\$\{VERSION\}[^`]*<\/button>`/);
const versionConstant = src.match(/const VERSION = '[0-9]+\.[0-9]+\.[0-9]+';/);
if (!versionBadgeTemplateLiteral) {
  console.error('FAIL: version-badge absent ou mal forme dans template literal (prevention #206, #645)');
  process.exit(1);
}
if (!versionConstant) {
  console.error('FAIL: const VERSION manquante en tete de nav.js (AC1 #211)');
  process.exit(1);
}

// 3. Presence des elements structurels attendus dans le header
// Note: le logo reference logoMSYX.png depuis le hotfix #247 (v2.54.10)
// Note: mode-toggle-btn remplace par mode-switch depuis v2.55.0 (#265)
// Note: brand configurable depuis v2.78.0 (#570) — href et logoSrc sont maintenant
//   des template literals dynamiques (brandHref, brandLogoSrc) avec defaults retro-compat.
//   On verifie les defauts via les variables brandCfg plutot que les strings literales.
const requiredPatterns = [
  { pattern: /class="header-logo"/, label: 'header-logo link' },
  { pattern: /var brandLogoSrc = brandCfg\.logoSrc \|\| '\/assets\/sources\/logoMSYX\.png'/, label: 'logoMSYX.png default (brand configurable #570)' },
  { pattern: /<span class="header-spacer">/, label: 'header-spacer' },
  { pattern: /<div class="theme-switcher">/, label: 'theme-switcher' },
  { pattern: /<div class="mode-toggle">/, label: 'mode-toggle' },
  { pattern: /<button id="mode-switch" class="mode-switch"/, label: 'mode-switch button' },
];

for (const { pattern, label } of requiredPatterns) {
  if (!pattern.test(src)) {
    console.error(`FAIL: element manquant dans nav.js — ${label}`);
    process.exit(1);
  }
}

console.log('OK: nav.js parse + version-badge bien clos (#206, #645 non-regression)');
