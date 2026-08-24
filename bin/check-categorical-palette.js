#!/usr/bin/env node
// check-categorical-palette.js — gate du contrat de(s) echelle(s) categorielle(s) (#800)
//
// Le DS garantit qu'une echelle de tokens categoriels (--cat-1..N par defaut)
// est SEPARABLE et LISIBLE dans les 8 combos theme/mode (MSYX/ACSSI/NHOOD/AUCHAN x
// dark/light). Ce gate le VERIFIE en parsant le CSS source (zero navigateur,
// zero dependance npm) — il ne le suppose pas.
//
//   C1  ΔH(OKLCh) >= seuil        -- separabilite de teinte, toute paire
//   C2  ΔE(OKLab) >= seuil        -- separabilite perceptuelle, toute paire
//                                    (ferme le trou de C1 : deux teintes
//                                     lointaines a faible chroma restent
//                                     confondues)
//   C3  contraste >= seuil vs le token de surface du combo (WCAG 2.1 SC 1.4.11)
//
// Conception EXTENSIBLE (#800 §"perimetre elargi") : la liste des tokens a
// verifier et les seuils sont des PARAMETRES (voir SCALES ci-dessous), pas
// des constantes enfouies dans la logique de parsing/verification. La
// suite prevue (#812, echelle --chart-1..5) ajoute une entree a SCALES et
// reutilise exactement le meme moteur (parseBlocks/resolve/checkScale) —
// aucun second controleur a ecrire.
//
// Usage :
//   node bin/check-categorical-palette.js                       # verifie la config "cat" (defaut)
//   node bin/check-categorical-palette.js --scale=cat            # idem, explicite
//   node bin/check-categorical-palette.js --json                 # sortie JSON (CI)
//   node bin/check-categorical-palette.js --tokens=<path> --themes=<path>
//                                                                 # fixtures (tests uniquement)
//
// Exit 0 = contrat tenu · exit 1 = violation C1/C2/C3 · exit 2 = erreur de
// parsing/completude (forme invalide, declaration manquante).
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOKENS_CSS_PATH = path.join(ROOT, 'shared', 'css', 'tokens.css');
const THEMES_CSS_PATH = path.join(ROOT, 'shared', 'css', 'themes.css');

// THEMES/MODES decrivent la structure de theming du DS (THEME_CONFIG de
// shared/components.js) — 8 combos, communs a TOUTES les echelles verifiees
// par ce gate. Ce ne sont pas des parametres de contrat (contrairement a
// SCALES ci-dessous) : ajouter un theme est un changement structurel du DS,
// pas une variation de seuils.
const THEMES = ['acssi', 'nhood', 'auchan']; // + 'msyx' traite a part (vit dans :root, pas de [data-theme])
const MSYX = 'msyx';

// ─── Configuration des echelles verifiees (parametres, pas des constantes) ─
// Chaque entree : prefixe de variable (--{varPrefix}-1..{count}), nombre
// d'entrees, 3 seuils chiffres, et le token de reference pour le contraste.
// #812 ajoutera ici une entree "chart" ({varPrefix:'chart', count:5, ...})
// sans toucher au moteur de verification.
const SCALES = {
  cat: {
    varPrefix: 'cat',
    count: 8,
    minHueDeg: 30,
    minDeltaE: 0.12,
    minContrast: 3.0,
    surfaceToken: '--surface-solid',
  },
  // #812 — echelle de SERIES DE GRAPHIQUES (data.html), distincte de --cat-* (categoriel
  // generique). Memes 3 criteres, memes 8 combos, MEME moteur (aucune ligne de
  // parsing/verification specifique a --chart-* : c'est la preuve d'extensibilite promise
  // par #800). Seul C3 (contraste >= 3:1) est non negociable pour cette echelle (arbitrage
  // Mike 2026-08-04) ; C1/C2 sont verifies avec des seuils PROPRES, plus bas que ceux de
  // --cat-* : --chart-* n'a jamais porte de contrat de separabilite avant ce ticket et son
  // perimetre est de reparer le defaut de contraste SANS re-hue les teintes existantes
  // ("teintes proches des actuelles") — hors quelques exceptions documentees dans la PR.
  // Voir le tableau avant/apres complet dans la PR #812.
  chart: {
    varPrefix: 'chart',
    count: 5,
    minHueDeg: 6,
    minDeltaE: 0.08,
    minContrast: 3.0,
    surfaceToken: '--surface-solid',
  },
};

// ─── 1. Parsing ─────────────────────────────────────────────────────────────

// Retire les commentaires CSS /* ... */ (CSS n'autorise pas l'imbrication).
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Extrait les blocs { selecteur -> { --token: valeur } } d'un texte CSS.
// Parsing plat (pas de regles imbriquees dans tokens.css/themes.css) :
// suffisant pour ce style de fichier, coherent avec les autres gates du repo.
function parseBlocks(css) {
  const clean = stripComments(css);
  const blocks = {};
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = blockRe.exec(clean)) !== null) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2];
    if (!selector) continue;
    const vars = blocks[selector] || (blocks[selector] = {});
    const declRe = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
    let d;
    while ((d = declRe.exec(body)) !== null) {
      vars[d[1]] = d[2].trim();
    }
  }
  return blocks;
}

// tokensPath/themesPath overridables (tests uniquement — cf. tests/test-check-categorical-palette.sh
// qui pointe des fixtures adverses sans toucher au vrai CSS du repo).
function loadBlocks(tokensPath, themesPath) {
  const tokensCss = fs.readFileSync(tokensPath || TOKENS_CSS_PATH, 'utf8');
  const themesCss = fs.readFileSync(themesPath || THEMES_CSS_PATH, 'utf8');
  return {
    tokens: parseBlocks(tokensCss),
    themes: parseBlocks(themesCss),
  };
}

// ─── 2. Resolution de la cascade ────────────────────────────────────────────
// Ordre effectif (le dernier applicable gagne) — cf. #800 §2 :
//   1. :root                                    (tokens.css)
//   2. [data-mode="light"]                      (tokens.css, si mode=light)
//   3. [data-theme="X"]                         (themes.css, si theme=X) --
//      MEME specificite que 2, mais themes.css est importe APRES tokens.css
//      -> il gagne a egalite de specificite.
//   4. [data-theme="X"][data-mode="light"]      (themes.css, specificite 0,2,0)
//
// Pour theme === 'msyx' (vit dans :root, aucun [data-theme="msyx"] genere
// par build-themes.js), seules les couches 1 et 2 s'appliquent.
function resolve(blocks, theme, mode) {
  const out = {};
  const root = blocks.tokens[':root'] || {};
  Object.assign(out, root);
  if (mode === 'light') {
    Object.assign(out, blocks.tokens['[data-mode="light"]'] || {});
  }
  if (theme !== MSYX) {
    Object.assign(out, blocks.themes[`[data-theme="${theme}"]`] || {});
    if (mode === 'light') {
      Object.assign(out, blocks.themes[`[data-theme="${theme}"][data-mode="light"]`] || {});
    }
  }
  return out;
}

function layerLabel(theme, mode) {
  if (theme === MSYX) {
    return mode === 'light' ? '[data-mode="light"] (tokens.css)' : ':root (tokens.css)';
  }
  return mode === 'light'
    ? `[data-theme="${theme}"][data-mode="light"] (themes.css)`
    : `[data-theme="${theme}"] (themes.css)`;
}

// Renvoie le bloc BRUT (non resolu, pas de fallback) de la couche portant
// nativement les tokens de ce theme/mode — celui ou D4 exige la declaration
// explicite. C'est different de resolve() qui merge les couches parentes.
function ownLayer(blocks, theme, mode) {
  if (theme === MSYX) {
    return mode === 'light' ? (blocks.tokens['[data-mode="light"]'] || {}) : (blocks.tokens[':root'] || {});
  }
  return mode === 'light'
    ? (blocks.themes[`[data-theme="${theme}"][data-mode="light"]`] || {})
    : (blocks.themes[`[data-theme="${theme}"]`] || {});
}

// ─── 3. Couleur ─────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  let h = hex.trim();
  if (h[0] !== '#') return null;
  h = h.slice(1);
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function isLiteralHex(value) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function srgbChannelToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// WCAG 2.x relative luminance.
function relativeLuminance(rgb) {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// (L1 + 0.05) / (L2 + 0.05), L1 = plus claire des deux.
function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const l1 = Math.max(lA, lB);
  const l2 = Math.min(lA, lB);
  return (l1 + 0.05) / (l2 + 0.05);
}

// OKLab (Björn Ottosson, https://bottosson.github.io/posts/oklab/).
function srgbToOklab(rgb) {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

function oklabToOklch(lab) {
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
}

// Distance angulaire circulaire, resultat dans [0, 180].
function hueDistance(h1, h2) {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

// Distance euclidienne en OKLab.
function deltaEOk(labA, labB) {
  const dL = labA.L - labB.L;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// ─── 4. Verifications ───────────────────────────────────────────────────────
// V0 COMPLETUDE (bloquant AVANT tout le reste, exit 2) : les N entrees sont
//     declarees LITTERALEMENT dans les couches propres a chaque theme/mode.
//     Une entree manquante fait heriter la valeur DARK en mode clair — c'est
//     le defaut avere de --chart-* en nhood-light (cf. groom #800 §3).
// V1 FORME : valeur hex litterale (ni var(), ni color-mix(), ni rgb()).
// V2 C1/C2 : toutes les paires de chaque combo.
// V3 C3    : chaque entree de chaque combo vs le token de surface resolu du
//            MEME combo.

function combosFor() {
  const combos = [];
  for (const mode of ['dark', 'light']) {
    combos.push({ theme: MSYX, mode });
  }
  for (const theme of THEMES) {
    for (const mode of ['dark', 'light']) {
      combos.push({ theme, mode });
    }
  }
  return combos;
}

function varNames(scale) {
  const names = [];
  for (let i = 1; i <= scale.count; i++) names.push(`--${scale.varPrefix}-${i}`);
  return names;
}

// Verifie la completude + la forme litterale de TOUTES les declarations
// attendues, sur la couche PROPRE (pas resolue) de chaque combo. Retourne un
// tableau d'erreurs structurelles (vide = OK). Chaque erreur nomme la couche.
function checkStructure(blocks, scale) {
  const errors = [];
  const names = varNames(scale);
  for (const { theme, mode } of combosFor()) {
    const layer = ownLayer(blocks, theme, mode);
    const label = layerLabel(theme, mode);
    for (const name of names) {
      const raw = layer[name];
      if (raw === undefined) {
        errors.push(`Declaration manquante : ${name} absente de la couche ${label} (combo ${theme}-${mode}).`);
        continue;
      }
      if (!isLiteralHex(raw)) {
        errors.push(`Valeur non litterale : ${name} = "${raw}" dans ${label} (combo ${theme}-${mode}) — hex litteral obligatoire (jamais var(), color-mix(), rgb()).`);
      }
    }
  }
  return errors;
}

// Verifie C1/C2/C3 sur les combos resolus. Retourne { violations, table } —
// table = releve par combo (min ΔH, min ΔE, min contraste) pour l'affichage.
function checkContract(blocks, scale) {
  const names = varNames(scale);
  const violations = [];
  const table = [];

  for (const { theme, mode } of combosFor()) {
    const resolved = resolve(blocks, theme, mode);
    const comboId = `${theme}-${mode}`;

    const rgbs = names.map((name) => hexToRgb(resolved[name]));
    const oklabs = rgbs.map((rgb) => (rgb ? srgbToOklab(rgb) : null));
    const oklchs = oklabs.map((lab) => (lab ? oklabToOklch(lab) : null));

    const surfaceRaw = resolved[scale.surfaceToken];
    const surfaceRgb = surfaceRaw ? hexToRgb(surfaceRaw) : null;

    let minHue = Infinity;
    let minDeltaE = Infinity;
    let minContrast = Infinity;

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (!oklchs[i] || !oklchs[j]) continue;
        const dH = hueDistance(oklchs[i].H, oklchs[j].H);
        const dE = deltaEOk(oklabs[i], oklabs[j]);
        minHue = Math.min(minHue, dH);
        minDeltaE = Math.min(minDeltaE, dE);
        if (dH < scale.minHueDeg) {
          violations.push(`C1 violee : combo ${comboId}, paire ${names[i]}/${names[j]} — ΔH(OKLCh) = ${dH.toFixed(1)}° (seuil >= ${scale.minHueDeg}°).`);
        }
        if (dE < scale.minDeltaE) {
          violations.push(`C2 violee : combo ${comboId}, paire ${names[i]}/${names[j]} — ΔE(OKLab) = ${dE.toFixed(3)} (seuil >= ${scale.minDeltaE}).`);
        }
      }
    }

    for (let i = 0; i < names.length; i++) {
      if (!rgbs[i] || !surfaceRgb) continue;
      const contrast = contrastRatio(rgbs[i], surfaceRgb);
      minContrast = Math.min(minContrast, contrast);
      if (contrast < scale.minContrast) {
        violations.push(`C3 violee : combo ${comboId}, ${names[i]} = ${resolved[names[i]]} — contraste ${contrast.toFixed(2)}:1 vs ${scale.surfaceToken} (seuil >= ${scale.minContrast}:1).`);
      }
    }

    table.push({
      combo: comboId,
      minHueDeg: Number.isFinite(minHue) ? Number(minHue.toFixed(1)) : null,
      minDeltaE: Number.isFinite(minDeltaE) ? Number(minDeltaE.toFixed(3)) : null,
      minContrast: Number.isFinite(minContrast) ? Number(minContrast.toFixed(2)) : null,
    });
  }

  return { violations, table };
}

// Verifie une echelle complete (V0+V1 puis V2+V3). Fonction reutilisable par
// une autre echelle (#812) — aucune constante specifique a --cat-* dedans.
function checkScale(blocks, scale) {
  const structuralErrors = checkStructure(blocks, scale);
  if (structuralErrors.length > 0) {
    return { exitCode: 2, structuralErrors, violations: [], table: [] };
  }
  const { violations, table } = checkContract(blocks, scale);
  return { exitCode: violations.length > 0 ? 1 : 0, structuralErrors: [], violations, table };
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function printTable(scaleName, table) {
  console.log(`\nEchelle --${scaleName}-* — recapitulatif des 8 combos :`);
  console.log('  combo        minΔH(OKLCh)  minΔE(OKLab)  min contraste');
  for (const row of table) {
    console.log(
      `  ${row.combo.padEnd(12)} ${String(row.minHueDeg + '°').padEnd(13)} ${String(row.minDeltaE).padEnd(13)} ${row.minContrast}:1`
    );
  }
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const scaleArg = args.find((a) => a.startsWith('--scale='));
  const scaleName = scaleArg ? scaleArg.split('=')[1] : 'cat';
  const tokensArg = args.find((a) => a.startsWith('--tokens='));
  const themesArg = args.find((a) => a.startsWith('--themes='));

  const scale = SCALES[scaleName];
  if (!scale) {
    console.error(`Echelle inconnue : "${scaleName}". Echelles disponibles : ${Object.keys(SCALES).join(', ')}`);
    process.exit(2);
  }

  let blocks;
  try {
    blocks = loadBlocks(
      tokensArg ? tokensArg.split('=').slice(1).join('=') : undefined,
      themesArg ? themesArg.split('=').slice(1).join('=') : undefined
    );
  } catch (err) {
    console.error(`Erreur de lecture/parsing CSS : ${err.message}`);
    process.exit(2);
  }

  const result = checkScale(blocks, scale);

  if (asJson) {
    console.log(JSON.stringify({ scale: scaleName, ...result }, null, 2));
    process.exit(result.exitCode);
  }

  if (result.exitCode === 2) {
    console.error(`ECHEC (completude/forme) — echelle --${scale.varPrefix}-*:\n`);
    for (const e of result.structuralErrors) console.error(`  - ${e}`);
    process.exit(2);
  }

  if (result.exitCode === 1) {
    console.error(`ECHEC (contrat C1/C2/C3) — echelle --${scale.varPrefix}-*:\n`);
    for (const v of result.violations) console.error(`  - ${v}`);
    printTable(scale.varPrefix, result.table);
    process.exit(1);
  }

  console.log(`OK — echelle --${scale.varPrefix}-* : contrat tenu sur les 8 combos (C1 >= ${scale.minHueDeg}°, C2 >= ${scale.minDeltaE}, C3 >= ${scale.minContrast}:1).`);
  printTable(scale.varPrefix, result.table);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  SCALES,
  stripComments,
  parseBlocks,
  resolve,
  ownLayer,
  layerLabel,
  hexToRgb,
  isLiteralHex,
  relativeLuminance,
  contrastRatio,
  srgbToOklab,
  oklabToOklch,
  hueDistance,
  deltaEOk,
  checkStructure,
  checkContract,
  checkScale,
  combosFor,
  varNames,
};
