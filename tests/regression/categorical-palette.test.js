// Test de non-regression — issue #800
// Verifie le CALCUL PUR de bin/check-categorical-palette.js sur fixtures :
// hex -> OKLab/OKLCh, contraste WCAG, resolution de cascade 4 couches, et le
// comportement de checkStructure/checkContract/checkScale (completude/forme
// puis C1/C2/C3) — independamment des vraies valeurs shared/css/tokens.css.
//
// Modele : tests/regression/generate-version-notes.test.js (script Node
// autonome, exit 1 si un cas echoue, zero dependance).
'use strict';

const path = require('path');

const gate = require(path.join('..', '..', 'bin', 'check-categorical-palette.js'));

let pass = 0;
let fail = 0;

function ok(label) {
  pass++;
  console.log('  PASS: ' + label);
}

function ko(label, detail) {
  fail++;
  console.error('  FAIL: ' + label + (detail ? ' — ' + detail : ''));
}

function assertEqual(label, actual, expected) {
  if (actual === expected) {
    ok(label);
  } else {
    ko(label, `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

function assertClose(label, actual, expected, tolerance) {
  if (typeof actual === 'number' && Math.abs(actual - expected) <= tolerance) {
    ok(label);
  } else {
    ko(label, `attendu ~${expected} (+/-${tolerance}), obtenu ${actual}`);
  }
}

function assertTrue(label, cond, detail) {
  if (cond) ok(label);
  else ko(label, detail);
}

// ─── hexToRgb / isLiteralHex ────────────────────────────────────────────────

assertEqual('hexToRgb #fff (raccourci 3 chiffres)', JSON.stringify(gate.hexToRgb('#fff')), JSON.stringify({ r: 255, g: 255, b: 255 }));
assertEqual('hexToRgb #000000', JSON.stringify(gate.hexToRgb('#000000')), JSON.stringify({ r: 0, g: 0, b: 0 }));
assertEqual('hexToRgb #3b82f6', JSON.stringify(gate.hexToRgb('#3b82f6')), JSON.stringify({ r: 59, g: 130, b: 246 }));
assertEqual('hexToRgb valeur invalide -> null', gate.hexToRgb('not-a-color'), null);

assertTrue('isLiteralHex accepte un hex 6 chiffres', gate.isLiteralHex('#3b82f6') === true);
assertTrue('isLiteralHex accepte un hex 3 chiffres', gate.isLiteralHex('#fff') === true);
assertTrue('isLiteralHex refuse var()', gate.isLiteralHex('var(--accent)') === false);
assertTrue('isLiteralHex refuse color-mix()', gate.isLiteralHex('color-mix(in srgb, var(--accent) 12%, transparent)') === false);
assertTrue('isLiteralHex refuse rgb()', gate.isLiteralHex('rgb(59, 130, 246)') === false);

// ─── Couleur : luminance / contraste / OKLab (valeurs de reference connues) ─
// Reference OKLab pour sRGB (255,0,0) — Bjorn Ottosson, https://bottosson.github.io/posts/oklab/
// L=0.627955, a=0.224863, b=0.125846 (tolerance 1e-4 sur l'arrondi de calcul).
const redOklab = gate.srgbToOklab({ r: 255, g: 0, b: 0 });
assertClose('srgbToOklab(#ff0000).L reference Ottosson', redOklab.L, 0.627955, 1e-4);
assertClose('srgbToOklab(#ff0000).a reference Ottosson', redOklab.a, 0.224863, 1e-4);
assertClose('srgbToOklab(#ff0000).b reference Ottosson', redOklab.b, 0.125846, 1e-4);

assertClose('relativeLuminance blanc = 1.0', gate.relativeLuminance({ r: 255, g: 255, b: 255 }), 1.0, 1e-9);
assertClose('relativeLuminance noir = 0.0', gate.relativeLuminance({ r: 0, g: 0, b: 0 }), 0.0, 1e-9);
assertClose('contrastRatio noir/blanc = 21:1 (max WCAG)', gate.contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21, 1e-6);
assertClose('contrastRatio identite = 1:1', gate.contrastRatio({ r: 100, g: 100, b: 100 }, { r: 100, g: 100, b: 100 }), 1, 1e-9);

assertClose('hueDistance circulaire (10 vs 350 -> 20)', gate.hueDistance(10, 350), 20, 1e-9);
assertClose('hueDistance circulaire (10 vs 200 -> 170)', gate.hueDistance(10, 200), 170, 1e-9);
assertClose('hueDistance meme teinte -> 0', gate.hueDistance(45, 45), 0, 1e-9);

const oklchRed = gate.oklabToOklch(redOklab);
assertTrue('oklabToOklch retourne un H dans [0,360)', oklchRed.H >= 0 && oklchRed.H < 360, `H=${oklchRed.H}`);
assertClose('deltaEOk identite = 0', gate.deltaEOk(redOklab, redOklab), 0, 1e-9);

// ─── parseBlocks ─────────────────────────────────────────────────────────────

const FIXTURE_TOKENS_CSS = `
:root {
    --surface-solid: #1e293b;
    --cat-1: #2f7fff;
    --cat-2: #c599f8;
}
[data-mode="light"] {
    --surface-solid: #ffffff;
    --cat-1: #056eff;
    --cat-2: #a200fe;
}
`;

const blocksTokens = gate.parseBlocks(FIXTURE_TOKENS_CSS);
assertTrue(':root parse avec 2 declarations attendues', Object.keys(blocksTokens[':root'] || {}).length === 3, JSON.stringify(blocksTokens));
assertEqual(':root --cat-1 valeur', blocksTokens[':root']['--cat-1'], '#2f7fff');
assertEqual('[data-mode="light"] --surface-solid valeur', blocksTokens['[data-mode="light"]']['--surface-solid'], '#ffffff');

const FIXTURE_WITH_COMMENT = `
:root {
    /* commentaire multi
       lignes */
    --cat-1: #2f7fff; /* inline */
}
`;
const blocksComment = gate.parseBlocks(FIXTURE_WITH_COMMENT);
assertEqual('parseBlocks retire les commentaires (multi-ligne + inline)', blocksComment[':root']['--cat-1'], '#2f7fff');

// ─── resolve() : cascade 4 couches ──────────────────────────────────────────

const FIXTURE_BLOCKS = {
  tokens: {
    ':root': { '--surface-solid': '#1e293b', '--cat-1': '#2f7fff' },
    '[data-mode="light"]': { '--surface-solid': '#ffffff', '--cat-1': '#056eff' },
  },
  themes: {
    '[data-theme="nhood"]': { '--surface-solid': '#0f2415', '--cat-1': '#00e05f' },
    '[data-theme="nhood"][data-mode="light"]': { '--cat-1': '#004b1b' },
    // fixture volontairement incomplete : --surface-solid absent de la couche
    // light pour verifier l'heritage dark -> defaut avere de --chart-* nhood-light
  },
};

assertEqual('resolve msyx-dark = :root brut', gate.resolve(FIXTURE_BLOCKS, 'msyx', 'dark')['--cat-1'], '#2f7fff');
assertEqual('resolve msyx-light = :root + [data-mode=light]', gate.resolve(FIXTURE_BLOCKS, 'msyx', 'light')['--cat-1'], '#056eff');
assertEqual('resolve nhood-dark = :root + [data-theme=nhood]', gate.resolve(FIXTURE_BLOCKS, 'nhood', 'dark')['--cat-1'], '#00e05f');
assertEqual('resolve nhood-light = 4 couches, la derniere gagne', gate.resolve(FIXTURE_BLOCKS, 'nhood', 'light')['--cat-1'], '#004b1b');
assertEqual(
  'resolve nhood-light herite --surface-solid DARK (piege de cascade #800 §2, absent de la couche 4)',
  gate.resolve(FIXTURE_BLOCKS, 'nhood', 'light')['--surface-solid'],
  '#0f2415'
);

// ─── checkStructure : completude + forme (V0/V1) ────────────────────────────

function makeScale(overrides) {
  return Object.assign({ varPrefix: 'cat', count: 2, minHueDeg: 30, minDeltaE: 0.12, minContrast: 3.0, surfaceToken: '--surface-solid' }, overrides || {});
}

const completeBlocks = {
  tokens: {
    ':root': { '--surface-solid': '#1e293b', '--cat-1': '#2f7fff', '--cat-2': '#c599f8' },
    '[data-mode="light"]': { '--surface-solid': '#ffffff', '--cat-1': '#056eff', '--cat-2': '#a200fe' },
  },
  themes: {
    '[data-theme="acssi"]': { '--surface-solid': '#00457a', '--cat-1': '#fee800', '--cat-2': '#00fe64' },
    '[data-theme="acssi"][data-mode="light"]': { '--surface-solid': '#ffffff', '--cat-1': '#0092fa', '--cat-2': '#8200fc' },
    '[data-theme="nhood"]': { '--surface-solid': '#0f2415', '--cat-1': '#00e05f', '--cat-2': '#00fdfb' },
    '[data-theme="nhood"][data-mode="light"]': { '--surface-solid': '#ffffff', '--cat-1': '#004b1b', '--cat-2': '#2c7372' },
  },
};

assertEqual('checkStructure : fixture complete -> 0 erreur', gate.checkStructure(completeBlocks, makeScale()).length, 0);

// Fixture incomplete : --cat-2 absent de la couche nhood-light (D4 — la parade)
const incompleteBlocks = JSON.parse(JSON.stringify(completeBlocks));
delete incompleteBlocks.themes['[data-theme="nhood"][data-mode="light"]']['--cat-2'];
const structErrors = gate.checkStructure(incompleteBlocks, makeScale());
assertTrue('checkStructure detecte une declaration manquante (nhood-light)', structErrors.length === 1, JSON.stringify(structErrors));
assertTrue('le message nomme la couche concernee', /nhood/.test(structErrors[0]) && /light/.test(structErrors[0]), structErrors[0]);

// Fixture avec valeur non litterale (var())
const varBlocks = JSON.parse(JSON.stringify(completeBlocks));
varBlocks.tokens[':root']['--cat-1'] = 'var(--accent)';
const varErrors = gate.checkStructure(varBlocks, makeScale());
assertTrue('checkStructure detecte une valeur var() non litterale', varErrors.length === 1, JSON.stringify(varErrors));

// ─── checkContract : C1/C2/C3 (V2/V3) ──────────────────────────────────────

assertEqual('checkContract : fixture complete conforme -> 0 violation', gate.checkContract(completeBlocks, makeScale()).violations.length, 0);

// Fixture C1 violee : deux teintes trop proches (memes RVB quasi identiques)
const closeHueBlocks = JSON.parse(JSON.stringify(completeBlocks));
closeHueBlocks.tokens[':root']['--cat-2'] = '#2f80ff'; // quasi identique a --cat-1 #2f7fff
const closeHueResult = gate.checkContract(closeHueBlocks, makeScale());
assertTrue('checkContract detecte une violation C1 (teintes trop proches)', closeHueResult.violations.some((v) => v.includes('C1 violee')), JSON.stringify(closeHueResult.violations));

// Fixture C3 violee : entree quasi identique a la surface (contraste ~1:1)
const lowContrastBlocks = JSON.parse(JSON.stringify(completeBlocks));
lowContrastBlocks.tokens[':root']['--cat-1'] = '#1e293c'; // quasi identique a --surface-solid #1e293b
const lowContrastResult = gate.checkContract(lowContrastBlocks, makeScale());
assertTrue('checkContract detecte une violation C3 (contraste insuffisant vs surface)', lowContrastResult.violations.some((v) => v.includes('C3 violee')), JSON.stringify(lowContrastResult.violations));

// ─── checkScale : orchestration + exit codes ────────────────────────────────

assertEqual('checkScale fixture complete conforme -> exitCode 0', gate.checkScale(completeBlocks, makeScale()).exitCode, 0);
assertEqual('checkScale fixture incomplete -> exitCode 2 (structurel avant contrat)', gate.checkScale(incompleteBlocks, makeScale()).exitCode, 2);
assertEqual('checkScale violation C1 -> exitCode 1', gate.checkScale(closeHueBlocks, makeScale()).exitCode, 1);

// ─── SCALES : parametrage extensible (#812) ─────────────────────────────────

assertTrue('SCALES expose une config "cat" avec seuils en parametres (pas de constante enfouie)', gate.SCALES.cat && gate.SCALES.cat.varPrefix === 'cat' && gate.SCALES.cat.count === 8);
assertTrue('SCALES.cat seuils = ceux de la spec #800 (30deg / 0.12 / 3:1)', gate.SCALES.cat.minHueDeg === 30 && gate.SCALES.cat.minDeltaE === 0.12 && gate.SCALES.cat.minContrast === 3.0);

// SCALES.chart (#812) — extension officialisee, MEME moteur, seuils propres.
assertTrue('SCALES expose une config "chart" (5 entrees, aucun 2e controleur)', gate.SCALES.chart && gate.SCALES.chart.varPrefix === 'chart' && gate.SCALES.chart.count === 5);
assertTrue('SCALES.chart C3 non negociable = 3:1, comme --cat-*', gate.SCALES.chart.minContrast === 3.0 && gate.SCALES.chart.surfaceToken === '--surface-solid');
assertTrue('SCALES.chart C1/C2 : seuils propres, plus bas que --cat-* (perimetre #812 : pas de re-hue)', gate.SCALES.chart.minHueDeg < gate.SCALES.cat.minHueDeg && gate.SCALES.chart.minDeltaE < gate.SCALES.cat.minDeltaE);

// ─── Sanity check final : le vrai CSS du repo doit etre conforme ───────────
// (regression : si une valeur est modifiee sans relancer le gate, ce test le
// detecte aussi, en plus de node bin/check-categorical-palette.js en CI)
try {
  const fs = require('fs');
  const realBlocks = {
    tokens: gate.parseBlocks(fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'css', 'tokens.css'), 'utf8')),
    themes: gate.parseBlocks(fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'css', 'themes.css'), 'utf8')),
  };
  const realResult = gate.checkScale(realBlocks, gate.SCALES.cat);
  assertEqual('sanity check : shared/css reel conforme au contrat --cat-* (exitCode 0)', realResult.exitCode, 0);
  const realChartResult = gate.checkScale(realBlocks, gate.SCALES.chart);
  assertEqual('sanity check : shared/css reel conforme au contrat --chart-* (exitCode 0, #812)', realChartResult.exitCode, 0);
} catch (err) {
  ko('sanity check shared/css reel', err.message);
}

console.log('');
console.log(`Resultats : ${pass} PASS, ${fail} FAIL`);
if (fail > 0) {
  process.exit(1);
}
console.log('Tous les tests OK');
process.exit(0);
