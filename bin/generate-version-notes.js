#!/usr/bin/env node
/**
 * generate-version-notes.js — Inline VERSION_NOTES dans shared/nav.js (#645)
 * Miroir de bin/generate-nav-sections.js : lit shared/version-notes.json, valide
 * le schéma, sérialise `const VERSION_NOTES = …;` entre marqueurs AUTO-GENERATED.
 *
 * Usage :
 *   node bin/generate-version-notes.js          # Génère et inline dans shared/nav.js
 *   node bin/generate-version-notes.js --check  # Valide sans écrire (mode CI, exit 1 si drift)
 *
 * Le DS est vanilla zéro-fetch runtime (#528) → inlining obligatoire, PAS d'import JSON runtime.
 * Le générateur n'écrit JAMAIS hors des marqueurs.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CHECK_MODE = process.argv.includes('--check');

const SCRIPT_DIR = path.dirname(__filename);
const ROOT = path.resolve(SCRIPT_DIR, '..');
const NAV_JS_PATH = path.join(ROOT, 'shared', 'nav.js');
const NOTES_JSON_PATH = path.join(ROOT, 'shared', 'version-notes.json');

const MARKER_START = '/* AUTO-GENERATED VERSION NOTES START — ne pas éditer à la main (bin/generate-version-notes.js) */';
const MARKER_END   = '/* AUTO-GENERATED VERSION NOTES END */';

const VALID_TYPES = new Set(['nouveaute', 'amelioration', 'correction', 'securite']);
const SEMVER_RE = /^\d+\.\d+\.\d+$/;      // sans préfixe v
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Validation du schéma ───────────────────────────────────────────────────
function validateNotes(data) {
  const errors = [];
  if (typeof data !== 'object' || data === null) { return ['Racine : objet attendu.']; }
  if (typeof data.next !== 'object' || data.next === null || !Array.isArray(data.next.highlights)) {
    errors.push('next.highlights : tableau attendu (peut être vide).');
  }
  if (!Array.isArray(data.released)) { errors.push('released : tableau attendu.'); return errors; }

  let prevDate = null;
  data.released.forEach(function (n, i) {
    const tag = 'released[' + i + ']';
    if (!SEMVER_RE.test(n.version || '')) errors.push(tag + '.version invalide (X.Y.Z sans « v ») : ' + n.version);
    if (!ISO_DATE_RE.test(n.date || ''))  errors.push(tag + '.date invalide (YYYY-MM-DD) : ' + n.date);
    if (typeof n.titre !== 'string' || !n.titre.trim()) errors.push(tag + '.titre manquant.');
    if (!Array.isArray(n.highlights) || n.highlights.length === 0) errors.push(tag + '.highlights vide.');
    (n.highlights || []).forEach(function (h, j) {
      if (!VALID_TYPES.has(h.type)) errors.push(tag + '.highlights[' + j + '].type hors énum : ' + h.type);
      if (typeof h.text !== 'string' || !h.text.trim()) errors.push(tag + '.highlights[' + j + '].text manquant.');
    });
    // Ordre récent-d'abord (dates décroissantes)
    if (prevDate !== null && n.date > prevDate) errors.push(tag + ' : ordre non décroissant (récent-d\'abord attendu).');
    prevDate = n.date;
  });
  return errors;
}

function serializeNotes(data) {
  return [MARKER_START, 'const VERSION_NOTES = ' + JSON.stringify(data) + ';', MARKER_END].join('\n');
}

function readCurrentBlock(navJs) {
  const s = navJs.indexOf(MARKER_START), e = navJs.indexOf(MARKER_END);
  if (s === -1 || e === -1) return null;
  return navJs.slice(s, e + MARKER_END.length);
}

function injectBlock(navJs, newBlock) {
  const s = navJs.indexOf(MARKER_START), e = navJs.indexOf(MARKER_END);
  if (s !== -1 && e !== -1) return navJs.slice(0, s) + newBlock + navJs.slice(e + MARKER_END.length);
  const anchor = 'function buildHeader()';
  const idx = navJs.indexOf(anchor);
  if (idx === -1) throw new Error('Ancre d\'insertion introuvable : "' + anchor + '"');
  return navJs.slice(0, idx) + newBlock + '\n\n' + navJs.slice(idx);
}

(function main() {
  try {
    console.log('[generate-version-notes] Mode: ' + (CHECK_MODE ? '--check (CI)' : 'génération'));
    const data = JSON.parse(fs.readFileSync(NOTES_JSON_PATH, 'utf8'));
    const errors = validateNotes(data);
    if (errors.length) {
      console.error('\n[ERREUR] shared/version-notes.json invalide :');
      errors.forEach(e => console.error('  ' + e));
      process.exit(1);
    }
    const newBlock = serializeNotes(data);
    const navJs = fs.readFileSync(NAV_JS_PATH, 'utf8');

    if (CHECK_MODE) {
      const cur = readCurrentBlock(navJs);
      if (cur === null) { console.error('\n[ERREUR --check] Bloc AUTO-GENERATED VERSION NOTES absent de shared/nav.js. Lancez le générateur sans --check.'); process.exit(1); }
      if (cur === newBlock) { console.log('\n[OK] VERSION_NOTES à jour.'); process.exit(0); }
      console.error('\n[ERREUR --check] VERSION_NOTES obsolète dans shared/nav.js. Lancez :\n  node bin/generate-version-notes.js\npuis committez shared/nav.js.');
      process.exit(1);
    }

    fs.writeFileSync(NAV_JS_PATH, injectBlock(navJs, newBlock), 'utf8');
    const block2 = readCurrentBlock(fs.readFileSync(NAV_JS_PATH, 'utf8'));
    if (block2 !== newBlock) { console.error('\n[ERREUR] Idempotence KO — bloc différent après réécriture.'); process.exit(1); }
    console.log('\n[OK] shared/nav.js mis à jour — VERSION_NOTES inliné entre marqueurs.');
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL] ' + err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
})();
