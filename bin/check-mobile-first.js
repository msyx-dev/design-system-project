#!/usr/bin/env node
// check-mobile-first.js — Garde-fou « mobile-first » sur les @media du CSS partagé (#1023)
// Design System msyx.fr — bin/check-mobile-first.js v1.0
//
// Contexte : DS-PRINCIPLES §4 impose le mobile-first — la règle de base décrit le
// mobile, `@media (min-width: …)` l'enrichit. Un `@media (max-width: …)` ne reste
// admis que pour UNE exception : masquer ou sortir du flux sur une plage, quand le
// `display` natif au retour ne s'écrit pas sans recopier celui d'un autre composant.
// Cette exception se DÉCLARE sur la ligne qui ouvre le bloc, par un commentaire CSS
// portant la chaîne exacte `exception §4 :` suivie de la raison. Exemple :
//
//     @media (max-width: 640px) { /* exception §4 : masquage sur une plage */
//
// Usage :
//   node bin/check-mobile-first.js              # shared/css (récursif) + shared/styles.css
//   node bin/check-mobile-first.js <chemin> …   # fichiers ou dossiers : remplace la portée (tests)
//
// Règle :
//   ÉCHOUE (exit 1) sur tout `@media` dont le prélude contient une borne HAUTE de
//   largeur — `max-width`, ou la syntaxe de plage `width < N`, `width <= N`,
//   `N > width`, `N >= width` — si la ligne qui porte le `{` ouvrant ne contient pas
//   `exception §4 :` suivi d'une raison non vide.
//
//   IGNORE :
//     - `@container (max-width: …)` : sans conteneur ancêtre la requête ne s'applique
//       pas, le rendu complet reste le défaut ; une réécriture en `min-width` ferait
//       passer en compact toute carte hors conteneur (DS-PRINCIPLES §4, #1023 A3) ;
//     - les commentaires CSS, multi-lignes compris (ils citent parfois
//       `(max-width: 768px)` pour expliquer une réécriture) ;
//     - le contenu des chaînes ("…", '…') ;
//     - `max-width: 600px;` en PROPRIÉTÉ (ce n'est pas une media query) ;
//     - les bornes basses : `min-width`, `width >= N`, `N <= width`.
//   GÈRE un prélude coupé sur plusieurs lignes (de `@media` jusqu'au `{`) : le
//   marqueur est alors attendu sur la ligne du `{`.
//
// Fail-closed : chemin introuvable, portée vide ou commentaire non fermé (qui
// masquerait la fin du fichier) → exit 1, jamais [OK] silencieux.
//
// Pourquoi en node et pas en grep : un grep signale les commentaires multi-lignes
// qui citent `(max-width: 768px)` (faux positif) et rate un prélude coupé sur deux
// lignes (faux négatif). Seul un retrait des commentaires qui conserve les numéros
// de ligne évite les deux. Patron : bin/check-innerhtml.js, zéro dépendance.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ROOTS = ['shared/css', 'shared/styles.css'];

// Marqueur d'exception : chaîne exacte, suivie d'une raison (pas seulement la fin du commentaire).
const MARKER = 'exception §4 :';
const MARKER_RE = /exception §4 :[ \t]*(?!\*\/)\S/;

// Borne HAUTE de largeur dans un prélude `@media` (commentaires et chaînes déjà retirés).
const UPPER_BOUND_RE = /max-(?:device-)?width|width\s*<|>\s*=?\s*width/i;

// ─── Nettoyage : commentaires et chaînes → espaces, retours à la ligne conservés ──

// Retourne { code, error }. `code` a la longueur et les retours à la ligne de `src`,
// mais chaque caractère d'un commentaire ou du contenu d'une chaîne y est un espace :
// les numéros de ligne restent ceux du fichier d'origine.
function blank(src) {
  const out = src.split('');
  const n = src.length;
  function wipe(from, to) {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  }
  let i = 0;
  while (i < n) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) {
        return { code: out.join(''), error: { index: i, message: 'commentaire non fermé : le reste du fichier échappe au contrôle' } };
      }
      wipe(i, end + 2);
      i = end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      // Une chaîne CSS se termine au guillemet apparié, ou au retour à la ligne non échappé.
      let k = i + 1;
      while (k < n && src[k] !== ch && src[k] !== '\n') k += src[k] === '\\' ? 2 : 1;
      wipe(i + 1, Math.min(k, n));
      i = k < n && src[k] === ch ? k + 1 : k;
      continue;
    }
    i++;
  }
  return { code: out.join(''), error: null };
}

// ─── Scan d'une source CSS ──────────────────────────────────────────────────

// Retourne { queries, violations, error }.
//   queries    : tous les @media qui portent une borne haute de largeur (marqués ou non)
//   violations : ceux dont la ligne du `{` ne porte pas le marqueur
// Chaque entrée : { line (ligne de @media), braceLine (ligne du `{`), excerpt }.
function scanSource(src) {
  const { code, error } = blank(src);
  const lines = src.split('\n');
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStarts.push(i + 1);
  function lineAt(index) {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= index) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  }

  const queries = [];
  const violations = [];
  const mediaRe = /@media(?![\w-])/gi;
  let m;
  while ((m = mediaRe.exec(code))) {
    const open = code.indexOf('{', m.index);
    const prelude = code.slice(m.index, open === -1 ? code.length : open);
    if (!UPPER_BOUND_RE.test(prelude)) continue;
    const line = lineAt(m.index);
    const braceLine = lineAt(open === -1 ? code.length - 1 : open);
    const entry = { line, braceLine, excerpt: (lines[line - 1] || '').trim() };
    queries.push(entry);
    // Le marqueur se cherche dans le texte D'ORIGINE (il vit dans un commentaire).
    if (!MARKER_RE.test(lines[braceLine - 1] || '')) violations.push(entry);
  }
  return { queries, violations, error: error ? { line: lineAt(error.index), message: error.message } : null };
}

// ─── Portée ─────────────────────────────────────────────────────────────────

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function display(abs) {
  const rel = path.relative(ROOT, abs);
  return rel.startsWith('..') ? abs : rel;
}

// .css d'un dossier, en récursif, triés.
function walk(dir, found) {
  fs.readdirSync(dir).sort().forEach((name) => {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, found);
    else if (st.isFile() && name.endsWith('.css')) found.push(abs);
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const roots = args.length ? args : DEFAULT_ROOTS;

  const files = [];
  let missing = 0;
  roots.forEach((r) => {
    const abs = resolvePath(r);
    if (!fs.existsSync(abs)) {
      console.error('[check-mobile-first] ERREUR : chemin introuvable : ' + r);
      missing++;
    } else if (fs.statSync(abs).isDirectory()) {
      walk(abs, files);
    } else {
      files.push(abs); // fichier passé explicitement : scanné tel quel
    }
  });

  let total = 0;
  let broken = 0;
  const bad = [];
  files.forEach((abs) => {
    const { queries, violations, error } = scanSource(fs.readFileSync(abs, 'utf8'));
    total += queries.length;
    if (error) {
      console.error('[check-mobile-first] ' + display(abs) + ':' + error.line + ': ' + error.message);
      broken++;
    }
    violations.forEach((v) => bad.push({ file: display(abs), v }));
  });

  bad.forEach(({ file, v }) => {
    console.error(
      file + ':' + v.line + ': @media (max-width…) sans marqueur « ' + MARKER + ' <raison> » (DS-PRINCIPLES §4)' +
      (v.braceLine !== v.line ? ' — marqueur attendu ligne ' + v.braceLine + ', celle du « { »' : '')
    );
    console.error('    ' + v.excerpt);
  });

  if (files.length === 0 && missing === 0) {
    console.error('[check-mobile-first] ERREUR : aucun fichier CSS à scanner — portée vide.');
  }
  if (missing > 0 || broken > 0 || files.length === 0) {
    console.error(
      '[ÉCHEC] scan incomplet (' + missing + ' chemin(s) introuvable(s), ' + broken + ' fichier(s) au commentaire non fermé) : ' +
      'impossible de garantir l\'absence de @media max-width non motivé.'
    );
    process.exit(1);
  }

  if (bad.length > 0) {
    console.error(
      '\n[ÉCHEC] ' + bad.length + ' @media avec borne haute de largeur sans exception déclarée.\n' +
      'Réécrivez en mobile-first (base = mobile, @media (min-width: (X+0.02)px) pour l\'enrichissement),\n' +
      'ou, si c\'est un masquage / une sortie de flux sur une plage, déclarez-le sur la ligne du « { » :\n' +
      '  @media (max-width: 640px) { /* ' + MARKER + ' <raison> */\n' +
      '(cf. docs/DS-PRINCIPLES.md §4, sous-section « Garde-fou »).'
    );
    process.exit(1);
  }

  console.log(
    '[OK] ' + files.length + ' fichier(s) CSS scanné(s) : ' + total + ' media queries max-width, toutes marquées « ' + MARKER + ' ». ' +
    'Les @container (max-width) sont hors garde (DS-PRINCIPLES §4).'
  );
  process.exit(0);
}

if (require.main === module) main();

module.exports = { scanSource, blank, MARKER, MARKER_RE };
