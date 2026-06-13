#!/usr/bin/env node
/**
 * generate-registry.js — Générateur auto du components-registry.json
 * Design System msyx.fr — bin/generate-registry.js v1.0
 *
 * Usage : node bin/generate-registry.js
 *
 * Scanne tous les .css dans shared/css/**\/*.css, extrait les sélecteurs
 * .classname et produit shared/components-registry.json enrichi.
 * Préserve les composants existants déclarés à la main (merge intelligent).
 *
 * Catégorisation par fichier source :
 *   shared/css/utilities.css       → utility
 *   shared/css/layout.css          → layout
 *   shared/css/themes.css          → theme
 *   shared/css/components/*.css    → component
 *   autres                         → other
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Chemins ──────────────────────────────────────────────────────────────────

const SCRIPT_DIR = path.dirname(__filename);
const ROOT = path.resolve(SCRIPT_DIR, '..');
const CSS_ROOT = path.join(ROOT, 'shared', 'css');
const REGISTRY_PATH = path.join(ROOT, 'shared', 'components-registry.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scanne récursivement un répertoire et retourne tous les .css trouvés.
 * @param {string} dir
 * @returns {string[]} chemins absolus
 */
function scanCssFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

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

/**
 * Extrait tous les sélecteurs .classname d'un contenu CSS.
 * Règle : commence par `.`, lettre, puis lettres/chiffres/tirets/underscores.
 * Ignore les pseudo-classes, pseudo-éléments, sélecteurs combinés.
 * @param {string} content
 * @returns {string[]} classes uniques (avec le point)
 */
function extractClasses(content) {
  // Regex : sélecteur de classe standalone au début d'un token de sélecteur
  // Capture .classname qui ne soit pas précédé par un autre token
  const CLASS_RE = /(?:^|[\s,{>;+~(])(\.[a-zA-Z][a-zA-Z0-9_-]+)/gm;
  const found = new Set();
  let match;

  while ((match = CLASS_RE.exec(content)) !== null) {
    const cls = match[1];
    // Exclure les pseudo-classes et modificateurs (:hover, ::before, etc.)
    // et les sélecteurs d'attribut embarqués
    if (!cls.includes(':') && !cls.includes('[') && !cls.includes(')')) {
      found.add(cls);
    }
  }

  return Array.from(found).sort();
}

/**
 * Détermine la catégorie d'une classe selon le fichier source.
 * @param {string} absolutePath
 * @returns {'utility'|'layout'|'theme'|'component'|'other'}
 */
function categorize(absolutePath) {
  const rel = path.relative(CSS_ROOT, absolutePath).replace(/\\/g, '/');

  if (rel === 'utilities.css') return 'utility';
  if (rel === 'layout.css') return 'layout';
  if (rel === 'themes.css') return 'theme';
  if (rel.startsWith('components/')) return 'component';
  return 'other';
}

/**
 * Produit un nom de groupe lisible depuis le chemin relatif.
 * Ex: components/buttons.css → buttons
 *     utilities.css          → utilities
 * @param {string} absolutePath
 * @returns {string}
 */
function groupName(absolutePath) {
  const rel = path.relative(CSS_ROOT, absolutePath).replace(/\\/g, '/');
  return rel.replace(/^components\//, '').replace(/\.css$/, '').replace(/^_/, '');
}

// ─── Lecture du registry existant ──────────────────────────────────────────────

let existingRegistry = { version: '2.59.0', generated: {}, components: [] };
if (fs.existsSync(REGISTRY_PATH)) {
  try {
    existingRegistry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    console.error('WARN: impossible de lire le registry existant, repartant de zéro.', e.message);
  }
}

// Index des composants existants : name → objet complet
const existingByName = new Map();
for (const comp of (existingRegistry.components || [])) {
  if (comp.name) existingByName.set(comp.name, comp);
}

// Toutes les classes déjà déclarées dans les composants existants (avec le point)
const existingClasses = new Set();
for (const comp of (existingRegistry.components || [])) {
  for (const cls of (comp.cssClasses || [])) {
    existingClasses.add(cls);
  }
}

// ─── Scan des CSS ─────────────────────────────────────────────────────────────

// Fichiers à scanner — uniquement les CSS qui forment le DS distribué
// (on exclut themes.css car il ne contient que des variables, pas des classes)
const cssFiles = scanCssFiles(CSS_ROOT).filter(f => {
  const rel = path.relative(CSS_ROOT, f).replace(/\\/g, '/');
  // Exclure les barrels (components.css, components-core.css), fonts, tokens
  if (['tokens.css', 'fonts.css', 'components.css', 'components-core.css', 'themes.css'].includes(rel)) {
    return false;
  }
  return true;
});

// Map : groupName → { category, sourceFile, classes[] }
const groupMap = new Map();

for (const cssFile of cssFiles) {
  const content = fs.readFileSync(cssFile, 'utf8');
  const classes = extractClasses(content);
  if (classes.length === 0) continue;

  const cat = categorize(cssFile);
  const gn = groupName(cssFile);
  const relPath = path.relative(ROOT, cssFile).replace(/\\/g, '/');

  if (!groupMap.has(gn)) {
    groupMap.set(gn, { category: cat, sourceFile: relPath, classes: [] });
  }
  const entry = groupMap.get(gn);
  for (const cls of classes) {
    if (!entry.classes.includes(cls)) entry.classes.push(cls);
  }
}

// ─── Construction du nouveau registry ─────────────────────────────────────────

// 1. Garder tous les composants existants tels quels (ils ont des metadata enrichies)
const newComponents = [...(existingRegistry.components || [])];

// 2. Ajouter les nouvelles entrées (classes auto-générées non encore référencées)
let addedGroups = 0;
let addedClasses = 0;

for (const [gn, info] of groupMap.entries()) {
  // Classes de ce groupe qui ne sont pas encore dans aucun composant existant
  const newClasses = info.classes.filter(cls => !existingClasses.has(cls));

  if (newClasses.length === 0) continue;

  // Vérifier si un composant du même nom existe déjà
  if (existingByName.has(gn)) {
    // Fusionner les nouvelles classes dans le composant existant
    const existing = existingByName.get(gn);
    const merged = [...(existing.cssClasses || [])];
    for (const cls of newClasses) {
      if (!merged.includes(cls)) {
        merged.push(cls);
        existingClasses.add(cls);
        addedClasses++;
      }
    }
    // Mettre à jour in-place dans newComponents
    const idx = newComponents.indexOf(existing);
    if (idx !== -1) {
      newComponents[idx] = { ...existing, cssClasses: merged };
    }
  } else {
    // Nouveau groupe : créer une entrée auto-générée
    // kind="module" : entrée miroir d'un fichier CSS (source_file), distincte
    // des composants curés à la main (kind="component"). Cf. #381.
    const entry = {
      name: gn,
      kind: 'module',
      category: info.category,
      source_file: info.sourceFile,
      cssClasses: newClasses,
      jsInit: null,
      generated: true,
    };
    newComponents.push(entry);
    for (const cls of newClasses) existingClasses.add(cls);
    addedGroups++;
    addedClasses += newClasses.length;
  }
}

// ─── Mise à jour version et metadata ──────────────────────────────────────────

const newRegistry = {
  version: existingRegistry.version || '2.59.0',
  generated: {
    at: new Date().toISOString(),
    by: 'bin/generate-registry.js v1.0',
  },
  components: newComponents,
};

// ─── Idempotence check ────────────────────────────────────────────────────────

const newJson = JSON.stringify(newRegistry, null, 2) + '\n';
let previousJson = '';
if (fs.existsSync(REGISTRY_PATH)) {
  previousJson = fs.readFileSync(REGISTRY_PATH, 'utf8');
}

// Pour comparer l'idempotence, on ignore le champ generated.at (timestamp)
function stripTimestamp(json) {
  return json.replace(/"at": "[^"]*"/, '"at": "__TS__"');
}

const isIdempotent = stripTimestamp(newJson) === stripTimestamp(previousJson);

// ─── Écriture ─────────────────────────────────────────────────────────────────

fs.writeFileSync(REGISTRY_PATH, newJson, 'utf8');

// ─── Rapport ──────────────────────────────────────────────────────────────────

const totalComponents = newComponents.length;
const totalClasses = newComponents.reduce((acc, c) => acc + (c.cssClasses || []).length, 0);

console.log('=== generate-registry.js v1.0 — Design System msyx.fr ===');
console.log(`Registry : ${REGISTRY_PATH}`);
console.log(`Version  : ${newRegistry.version}`);
console.log(`Total composants  : ${totalComponents}`);
console.log(`Total classes CSS : ${totalClasses}`);
if (addedGroups > 0 || addedClasses > 0) {
  console.log(`Nouveaux groupes  : +${addedGroups}`);
  console.log(`Nouvelles classes : +${addedClasses}`);
} else {
  console.log('Aucune nouvelle classe détectée — registry à jour (idempotent).');
}
if (isIdempotent) {
  console.log('Idempotence : OK (2e run = 0 changement structurel)');
}
console.log('OK');
