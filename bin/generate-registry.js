#!/usr/bin/env node
/**
 * generate-registry.js — Générateur auto du components-registry.json
 * Design System msyx.fr — bin/generate-registry.js v1.2
 *
 * Usage : node bin/generate-registry.js [--check] [--skip-validate]
 *   --check           Valide le registre sans écrire (mode CI recommandé)
 *   --skip-validate   Saute la validation fantôme (développement uniquement)
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

// ─── Validation des kind:component (#516) ─────────────────────────────────────

/**
 * Extrait toutes les classes CSS citées dans un snippet HTML (attributs class="...").
 * @param {string} html
 * @returns {Set<string>} classes avec le point (ex. '.btn-primary')
 */
function extractClassesFromHtml(html) {
  const set = new Set();
  if (!html) return set;
  const RE = /class="([^"]*)"/g;
  let m;
  while ((m = RE.exec(html)) !== null) {
    for (const c of m[1].split(/\s+/).filter(Boolean)) set.add('.' + c);
  }
  return set;
}

// Cache des classes de démonstration par page
const pageClassesCache = new Map();

/**
 * Charge et retourne toutes les classes CSS présentes dans le markup HTML d'une page démo.
 * @param {string} pageName  ex. "feedback" → pages/feedback.html
 * @returns {Set<string>}
 */
function loadPageClasses(pageName) {
  if (!pageName) return new Set();
  if (pageClassesCache.has(pageName)) return pageClassesCache.get(pageName);
  const pagePath = path.join(ROOT, 'pages', pageName + '.html');
  let set = new Set();
  if (fs.existsSync(pagePath)) {
    const content = fs.readFileSync(pagePath, 'utf8');
    set = extractClassesFromHtml(content);
  }
  pageClassesCache.set(pageName, set);
  return set;
}

// Set complet de toutes les classes CSS réelles (construit à partir du scan)
// Note : on reconstruit ici depuis groupMap (toutes les classes vues dans TOUS les fichiers CSS)
const allCssClasses = new Set();
for (const [, info] of groupMap.entries()) {
  for (const cls of info.classes) allCssClasses.add(cls);
}

// Validation : détecter les classes fantômes dans les kind:component
// Une classe est fantôme si absente du CSS ET absente de la démo de la page ET hors whitelist.
// La whitelist est intentionnellement vide : utilities.css/layout.css sont déjà dans allCssClasses.
const WHITELIST = new Set([
  // Ajoutez ici uniquement les faux positifs confirmés après un run de validation
]);

const phantoms = [];

/**
 * Extrait les classes atomiques d'une entrée cssClasses.
 * Un item peut être :
 *   - une classe simple : ".btn-primary" → [".btn-primary"]
 *   - un sélecteur composé : ".main .section-header .overline" → [".main",".section-header",".overline"]
 * Les sélecteurs composés sont légitimes (CSS réel) → on valide chaque token séparément.
 * @param {string[]} cssClasses
 * @returns {Set<string>}
 */
function expandCssClasses(cssClasses) {
  const set = new Set();
  if (!cssClasses) return set;
  for (const entry of cssClasses) {
    // Séparer sur les espaces pour gérer les sélecteurs composés
    for (const token of entry.split(/\s+/).filter(Boolean)) {
      // Conserver uniquement les tokens qui démarrent par un point
      if (token.startsWith('.')) set.add(token);
    }
  }
  return set;
}

if (!process.argv.includes('--skip-validate')) {
  for (const comp of newComponents) {
    if (comp.kind !== 'component') continue;   // valider uniquement les hand-written
    const pageClasses = loadPageClasses(comp.page);
    const cited = new Set([
      ...expandCssClasses(comp.cssClasses),
      ...extractClassesFromHtml(comp.example),
    ]);
    for (const cls of cited) {
      const inCss  = allCssClasses.has(cls);
      const inDemo = pageClasses.has(cls);
      const inWl   = WHITELIST.has(cls);
      if (!inCss && !inDemo && !inWl) {
        phantoms.push({ component: comp.name, class: cls });
      }
    }
  }

  if (phantoms.length > 0) {
    console.error('');
    console.error('❌ Classes CSS fantômes détectées dans des kind:component :');
    for (const p of phantoms) console.error(`   - ${p.component} → ${p.class}`);
    console.error('');
    console.error('Corrigez ces entrées dans shared/components-registry.json avant de continuer.');
    console.error('(Correction rapide : lire le CSS réel dans shared/css/components/*.css + la démo dans pages/*.html)');
    process.exit(1);
  }
}

// ─── Normalisation du champ react (#523) ─────────────────────────────────────
// Règle : kind:module → n-a forcé ; kind:component sans react → pending ;
// valeur existante ported/pending/n-a préservée (merge).
// NOTE : la normalisation s'effectue AVANT la validation parité (bloc ci-dessous).
const VALID_REACT_VALUES = new Set(['ported', 'pending', 'n-a']);

for (const comp of newComponents) {
  if (comp.kind === 'module') {
    comp.react = 'n-a';
  } else if (comp.kind === 'component') {
    if (!VALID_REACT_VALUES.has(comp.react)) {
      comp.react = 'pending';
    }
  }
}

// ─── Parité React (#523) ──────────────────────────────────────────────────────

const REACT_SRC_ROOT = path.join(ROOT, 'packages', 'react', 'src', 'components');

// Table de mapping : composant React (dir) → nom d'entrée registre.
// Source de vérité unique du lien React↔registre (robuste vs inférence).
// Mise à jour requise à chaque nouveau portage React.
const REACT_TO_REGISTRY = {
  Button:      'buttons',
  PageHeader:  'page-header',
  ThemeToggle: 'theme-toggle',
  UserMenu:    'user-menu',
  LoginScreen: 'login-screen',
};

// Expansions des variants dynamiques (unions TS fermées).
// Mise à jour requise quand un nouveau variant est ajouté côté React.
// Un variant non listé → la classe dynamique n'est PAS vérifiée
// (sous-détection assumée — jamais de faux positif).
const REACT_VARIANT_EXPANSIONS = {
  // Button
  'btn-${variant}':              ['primary', 'secondary', 'ghost', 'danger', 'warning'],
  'btn-${size}':                 ['sm', 'lg'],   // md exclu (pas de classe CSS)
  // LoginScreen
  'login-card--${variant}':      ['internal-only', 'public-multi-providers', 'internal-with-fallback'],
  'login-provider-btn--${p.id}': ['google', 'apple', 'microsoft', 'github'],
};

// Whitelist : classes mono-mot légitimes émises par React (filtres kebab les ignoreraient).
// Compléter si un nouveau composant React émet des classes mono-mot.
const REACT_KNOWN_SINGLE = new Set(['overline', 'lead', 'subtitle', 'open']);

/**
 * Extrait les classes CSS émises par un fichier .tsx (parsing statique).
 * Stratégie ciblée : on cherche uniquement les valeurs de className=
 *   - className="literal classes"
 *   - className={`template ${expr} classes`}
 *   - className={["cls1","cls2",...].filter(...).join(" ")} (tableaux de littéraux)
 * Puis on expanse les segments dynamiques connus via REACT_VARIANT_EXPANSIONS.
 * @param {string} tsx   contenu du fichier .tsx
 * @returns {Set<string>} classes avec le point (ex. '.btn-primary')
 */
function extractReactClasses(tsx) {
  const set = new Set();

  /**
   * Traite une valeur brute de className (littérale ou template) :
   * extrait les tokens kebab ou mono-mots whitelist, et expanse les segments dynamiques connus.
   */
  function processClassValue(raw) {
    // a) tokens littéraux kebab ou mono-mots whitelist
    for (const tok of raw.split(/[\s${}()`]+/).filter(Boolean)) {
      // Ignorer les tokens qui ressemblent à du JS (contiennent [, ", etc.)
      if (tok.includes('"') || tok.includes('[') || tok.includes('.')) continue;
      if (REACT_KNOWN_SINGLE.has(tok)) {
        set.add('.' + tok);
      } else if (/^[a-z][a-z0-9-]*$/.test(tok) && tok.includes('-') && !tok.endsWith('-')) {
        // Filtre : un token se terminant par '-' ou '--' est un préfixe partiel
        // (ex. "login-card--" avant le ${variant}) → pas une classe valide.
        set.add('.' + tok);
      }
    }
    // b) variants dynamiques `prefix-${expr}` → expansion via table
    const DYN_RE = /([a-z][a-z0-9-]*-)\$\{([^}]+)\}/g;
    let d;
    while ((d = DYN_RE.exec(raw)) !== null) {
      const key = d[1] + '${' + d[2].trim() + '}';
      const values = REACT_VARIANT_EXPANSIONS[key];
      if (values) {
        for (const v of values) set.add('.' + d[1] + v);
      }
    }
  }

  // 1. className="literal string"
  const LITERAL_RE = /className="([^"]*)"/g;
  let m;
  while ((m = LITERAL_RE.exec(tsx)) !== null) {
    processClassValue(m[1]);
  }

  // 2. className={`template string`}  (backtick à l'intérieur de className={...})
  const TEMPLATE_RE = /className=\{`([^`]*)`\}/g;
  while ((m = TEMPLATE_RE.exec(tsx)) !== null) {
    processClassValue(m[1]);
  }

  // 3. className={[...].filter(...).join(...)} — tableaux de littéraux de chaînes
  //    On extrait tous les "string literals" entre crochets qui suivent className={
  const ARRAY_RE = /className=\{\[([^\]]*)\]/g;
  while ((m = ARRAY_RE.exec(tsx)) !== null) {
    const arrayContent = m[1];
    const STR_INSIDE_RE = /"([^"]+)"|'([^']+)'|`([^`]+)`/g;
    let s;
    while ((s = STR_INSIDE_RE.exec(arrayContent)) !== null) {
      processClassValue(s[1] ?? s[2] ?? s[3] ?? '');
    }
  }

  return set;
}

const reactPhantoms = [];   // classe React absente du CSS réel
const reactDrift   = [];    // composant ported dont le marquage est incohérent

if (!process.argv.includes('--skip-validate') && fs.existsSync(REACT_SRC_ROOT)) {
  // (a) + (b) : vérifier chaque composant React mappé
  for (const [dir, regName] of Object.entries(REACT_TO_REGISTRY)) {
    const compDir = path.join(REACT_SRC_ROOT, dir);
    if (!fs.existsSync(compDir)) continue;

    // Concat de tous les .tsx du composant (hors *.test.tsx)
    const tsxFiles = fs.readdirSync(compDir)
      .filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
    const emitted = new Set();
    for (const f of tsxFiles) {
      for (const c of extractReactClasses(fs.readFileSync(path.join(compDir, f), 'utf8'))) {
        emitted.add(c);
      }
    }

    // (a) chaque classe émise doit exister dans le CSS réel
    for (const cls of emitted) {
      if (!allCssClasses.has(cls)) {
        reactPhantoms.push({ component: dir, registry: regName, class: cls });
      }
    }

    // (b) cohérence du marquage : l'entrée registre doit être react:ported
    const entry = newComponents.find(c => c.name === regName);
    if (!entry) {
      reactDrift.push({ component: dir, registry: regName,
        reason: 'entrée registre introuvable' });
    } else if (entry.react !== 'ported') {
      reactDrift.push({ component: dir, registry: regName,
        reason: `react="${entry.react}" — attendu "ported"` });
    }
  }

  // (b) réciproque : une entrée react:ported SANS composant React mappé → erreur
  const portedNames = new Set(Object.values(REACT_TO_REGISTRY));
  for (const comp of newComponents) {
    if (comp.react === 'ported' && !portedNames.has(comp.name)) {
      reactDrift.push({ component: '(registre)', registry: comp.name,
        reason: 'react="ported" mais aucun composant React dans REACT_TO_REGISTRY' });
    }
  }
}

// ─── Construction du nouveau registry ─────────────────────────────────────────

const newRegistry = {
  version: existingRegistry.version || '2.59.0',
  generated: {
    at: new Date().toISOString(),
    by: 'bin/generate-registry.js v1.2',
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

// ─── Écart global parité React (toujours affiché) ────────────────────────────
const reactCounts = { ported: 0, pending: 0, 'n-a': 0 };
for (const comp of newComponents) {
  if (comp.react && reactCounts[comp.react] !== undefined) reactCounts[comp.react]++;
}
const reactPortable = reactCounts.ported + reactCounts.pending;
const reactParityLine = `Parité React : ${reactCounts.ported} ported / ${reactPortable} portables `
  + `(${reactCounts.pending} pending, ${reactCounts['n-a']} n-a)`;

// ─── Mode --check (CI) ────────────────────────────────────────────────────────
// En mode --check, on valide sans écrire (idéal pour le step CI).

if (process.argv.includes('--check')) {
  console.log('=== generate-registry.js v1.2 — Design System msyx.fr (mode --check) ===');
  console.log(`Version  : ${newRegistry.version}`);
  console.log(`Total composants  : ${newRegistry.components.length}`);
  console.log('Validation fantômes : OK (0 classe fantôme)');
  console.log(reactParityLine);
  if (reactPhantoms.length > 0 || reactDrift.length > 0) {
    console.error('\n❌ Parité React (#523) :');
    for (const p of reactPhantoms)
      console.error(`   [classe absente du CSS] ${p.component} (${p.registry}) → ${p.class}`);
    for (const d of reactDrift)
      console.error(`   [marquage incohérent]   ${d.component} (${d.registry}) → ${d.reason}`);
    console.error('\nCorrigez : aligner la classe React sur le CSS du DS, ou le champ react du registre.');
    process.exit(1);
  }
  console.log('Parité React       : OK (0 dérive)');
  if (isIdempotent) {
    console.log('Idempotence       : OK (registre à jour)');
  } else {
    console.warn('⚠ Registre non à jour — lancez `npm run generate-registry` en local pour synchroniser.');
  }
  console.log('OK (--check)');
  process.exit(0);
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

fs.writeFileSync(REGISTRY_PATH, newJson, 'utf8');

// ─── Rapport React (dérive signalée même hors --check) ───────────────────────
if (reactPhantoms.length > 0 || reactDrift.length > 0) {
  console.error('\n❌ Parité React (#523) :');
  for (const p of reactPhantoms)
    console.error(`   [classe absente du CSS] ${p.component} (${p.registry}) → ${p.class}`);
  for (const d of reactDrift)
    console.error(`   [marquage incohérent]   ${d.component} (${d.registry}) → ${d.reason}`);
  console.error('\nCorrigez : aligner la classe React sur le CSS du DS, ou le champ react du registre.');
  process.exit(1);
}

// ─── Rapport ──────────────────────────────────────────────────────────────────

const totalComponents = newComponents.length;
const totalClasses = newComponents.reduce((acc, c) => acc + (c.cssClasses || []).length, 0);

console.log('=== generate-registry.js v1.2 — Design System msyx.fr ===');
console.log(`Registry : ${REGISTRY_PATH}`);
console.log(`Version  : ${newRegistry.version}`);
console.log(`Total composants  : ${totalComponents}`);
console.log(`Total classes CSS : ${totalClasses}`);
console.log(reactParityLine);
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
