#!/usr/bin/env node
/**
 * check-innerhtml.js — Garde-fou anti-XSS sur les affectations innerHTML (#758)
 * Design System msyx.fr — bin/check-innerhtml.js v1.0
 *
 * Contexte : escapeHTML() (shared/components.js) n'échappe que & < > — jamais
 * les guillemets. Une donnée consumer concaténée dans un innerHTML en contexte
 * ATTRIBUT (ex: `'<img src="' + escapeHTML(url) + '">'`) reste exploitable
 * (`url = 'x" onerror="alert(1)'`). La bonne pratique DS (#746, #758) est de
 * construire les nœuds (createElement/setAttribute/textContent/appendChild),
 * jamais de concaténer une donnée dans une chaîne assignée à innerHTML.
 *
 * Usage :
 *   node bin/check-innerhtml.js                  # scanne shared/components.js + shared/nav.js
 *   node bin/check-innerhtml.js <file1> <file2>   # scanne des fichiers spécifiques (tests)
 *
 * Règle :
 *   ÉCHOUE (exit 1) sur toute affectation `.innerHTML = …` dont la valeur
 *   contient une variable — concaténation `+` avec un identifiant/appel/accès
 *   de membre, OU template literal avec `${…}` — sans dérogation justifiée.
 *   ÉCHOUE également sur tout appel `constantMarkup(…)` dont l'argument n'est
 *   pas UNE SEULE chaîne littérale (pas de concaténation, pas d'interpolation).
 *
 *   AUTORISE :
 *     - `innerHTML = ''` / `innerHTML = ""` (wipe)
 *     - une ou plusieurs chaînes littérales concaténées entre elles SANS
 *       aucune variable (ex: `'<span>' + '</span>'`)
 *     - une dérogation explicite par commentaire `// ds-allow-innerhtml: <raison>`
 *       sur la ligne de l'affectation OU la ligne immédiatement précédente.
 *
 * Zéro dépendance (cohérent avec bin/generate-*.js) — scanner artisanal
 * conscient des chaînes/template literals et des parenthèses/accolades
 * imbriquées (pas un vrai parseur AST, mais suffisant pour ce style de code).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_FILES = ['shared/components.js', 'shared/nav.js'];

const ALLOW_RE = /ds-allow-innerhtml\s*:/;

// ─── Scanner de chaînes/template literals ──────────────────────────────────

// Scanne une chaîne/template littérale commençant à `start` (src[start] est
// le guillemet/backtick ouvrant). Retourne { end, hasInterpolation } —
// `end` = index juste après le guillemet fermant, `hasInterpolation` = true
// si un ${...} a été rencontré (template literal uniquement).
function scanStringLiteral(src, start) {
  const quote = src[start];
  let i = start + 1;
  let hasInterpolation = false;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') { i += 2; continue; }
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
    if (ch === quote) return { end: i + 1, hasInterpolation };
    i++;
  }
  return { end: i, hasInterpolation }; // non terminée — ne devrait pas arriver sur du JS valide
}

// Scanne une expression JS à partir de `start` jusqu'au `;` de fin de
// statement au niveau racine (profondeur 0), ou jusqu'à la première
// parenthèse/accolade/crochet fermant(e) englobant(e) si on est appelé depuis
// un contexte d'argument (ex: constantMarkup(...)).
// Retourne { end, segments } — segments = morceaux top-level séparés par des
// `+` (chaque élément = texte brut du segment, trimé).
function scanExpression(src, start) {
  let i = start;
  let depth = 0;
  let segStart = start;
  const segments = [];
  function flushSegment(end) {
    const text = src.slice(segStart, end).trim();
    if (text) segments.push(text);
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
      if (depth === 0) { flushSegment(i); return { end: i, segments }; }
      depth--; i++; continue;
    }
    if (depth === 0 && ch === ';') { flushSegment(i); return { end: i, segments }; }
    if (depth === 0 && ch === '+' && src[i + 1] !== '+') {
      flushSegment(i);
      i++;
      segStart = i;
      continue;
    }
    i++;
  }
  flushSegment(i);
  return { end: i, segments };
}

// Un segment est "pur littéral" s'il s'agit d'UNE SEULE chaîne/template
// littérale, sans rien avant/après, et (si template literal) sans ${...}.
function isPureLiteralSegment(text) {
  if (!text) return true;
  const quote = text[0];
  if (quote !== "'" && quote !== '"' && quote !== '`') return false;
  const r = scanStringLiteral(text, 0);
  if (r.end !== text.length) return false; // reste du texte après la chaîne → pas pur
  if (quote === '`' && r.hasInterpolation) return false;
  return true;
}

function lineAt(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) {
    if (src[i] === '\n') line++;
  }
  return line;
}

function lineText(lines, lineNo) {
  return (lines[lineNo - 1] || '').trim();
}

function hasDerogation(lines, lineNo) {
  return ALLOW_RE.test(lineText(lines, lineNo)) || ALLOW_RE.test(lineText(lines, lineNo - 1));
}

// ─── Scan d'un fichier ──────────────────────────────────────────────────────

function resolvePath(relPath) {
  return path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
}

function scanFile(relPath) {
  const abs = resolvePath(relPath);
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');
  const violations = [];
  let allowCount = 0;

  // 1. Affectations `.innerHTML = …` (pas `==`, pas `+=`).
  const assignRe = /\.innerHTML\s*=(?!=)/g;
  let m;
  while ((m = assignRe.exec(src))) {
    const assignLine = lineAt(src, m.index);
    const rhsStart = m.index + m[0].length;
    const { segments } = scanExpression(src, rhsStart);

    const joined = segments.join('').trim();
    const isWipe = joined === "''" || joined === '""';
    const isAllLiteral = segments.length > 0 && segments.every(isPureLiteralSegment);
    const isSafe = isWipe || isAllLiteral || segments.length === 0;

    if (isSafe) continue;

    if (hasDerogation(lines, assignLine)) {
      allowCount++;
      continue;
    }

    violations.push({
      line: assignLine,
      excerpt: lineText(lines, assignLine),
      reason: 'innerHTML concaténé à une variable (donnée non littérale) sans dérogation `// ds-allow-innerhtml: <raison>`',
    });
  }

  // 2. Appels `constantMarkup(...)` — argument doit être UNE SEULE chaîne littérale.
  //    Exclut la déclaration `function constantMarkup(html) { ... }` elle-même
  //    (le paramètre `html` n'est pas un « appel » avec un argument littéral).
  const cmRe = /\bconstantMarkup\(/g;
  while ((m = cmRe.exec(src))) {
    const before = src.slice(Math.max(0, m.index - 20), m.index);
    if (/function\s+$/.test(before)) continue;
    const argStart = m.index + m[0].length;
    const callLine = lineAt(src, m.index);
    const { segments } = scanExpression(src, argStart);
    const isSingleLiteral = segments.length === 1 && isPureLiteralSegment(segments[0]);

    if (isSingleLiteral) continue;

    if (hasDerogation(lines, callLine)) {
      allowCount++;
      continue;
    }

    violations.push({
      line: callLine,
      excerpt: lineText(lines, callLine),
      reason: 'constantMarkup(...) doit recevoir UNE SEULE chaîne littérale (jamais de concaténation/interpolation) sans dérogation `// ds-allow-innerhtml: <raison>`',
    });
  }

  return { relPath, violations, allowCount };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const argFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = argFiles.length ? argFiles : DEFAULT_FILES;

  let totalViolations = 0;
  let totalAllow = 0;
  let missingCount = 0;
  let scannedCount = 0;

  files.forEach((relPath) => {
    const abs = resolvePath(relPath);
    if (!fs.existsSync(abs)) {
      // Fail-closed (pas fail-open) : un garde-fou de sécurité qui ne trouve
      // pas le fichier à scanner doit ÉCHOUER, pas rendre [OK] silencieusement
      // (cf. review #758 — sinon un renommage/déplacement de fichier fait
      // passer le gate CI au vert sans avoir rien scanné).
      console.error('[check-innerhtml] ERREUR : fichier introuvable : ' + relPath);
      missingCount++;
      return;
    }
    scannedCount++;
    const { violations, allowCount } = scanFile(relPath);
    totalAllow += allowCount;
    if (violations.length) {
      totalViolations += violations.length;
      console.error('\n[check-innerhtml] ' + violations.length + ' violation(s) dans ' + relPath + ' :\n');
      violations.forEach((v) => {
        console.error('  ' + relPath + ':' + v.line);
        console.error('    ' + v.excerpt);
        console.error('    → ' + v.reason);
        console.error('');
      });
    }
  });

  console.log('[check-innerhtml] Dérogations `ds-allow-innerhtml` justifiées : ' + totalAllow);

  if (missingCount > 0) {
    console.error(
      '\n[ÉCHEC] ' + missingCount + ' fichier(s) attendu(s) introuvable(s) — scan incomplet, ' +
      'impossible de garantir l\'absence de vecteur XSS. Corrigez le chemin ou la liste DEFAULT_FILES.'
    );
    process.exit(1);
  }

  if (scannedCount === 0) {
    console.error('\n[ÉCHEC] Aucun fichier scanné — la liste de fichiers est vide.');
    process.exit(1);
  }

  if (totalViolations > 0) {
    console.error(
      '[ÉCHEC] ' + totalViolations + ' affectation(s) innerHTML/constantMarkup non sûre(s) détectée(s).\n' +
      'Corrigez en construisant les nœuds (createElement/setAttribute/textContent/appendChild),\n' +
      'ou posez une dérogation justifiée `// ds-allow-innerhtml: <raison>` si le cas est réellement sûr\n' +
      '(cf. docs/DS-PRINCIPLES.md §11).'
    );
    process.exit(1);
  }

  console.log('[OK] ' + scannedCount + ' fichier(s) scanné(s), aucune affectation innerHTML/constantMarkup non sûre détectée.');
  process.exit(0);
}

main();
