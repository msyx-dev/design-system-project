#!/usr/bin/env node
/**
 * generate-registry.js — Générateur auto du components-registry.json
 * Design System msyx.fr — bin/generate-registry.js v1.3
 *
 * Usage : node bin/generate-registry.js [--check] [--skip-validate] [--frontier-strict]
 *   --check            Valide le registre sans écrire (mode CI recommandé)
 *   --skip-validate    Saute la validation fantôme (développement uniquement)
 *   --frontier-strict  Active le mode bloquant pour la frontière page↔registre (#511)
 *                      (défaut : warn-only — bascule bloquante après #508 livré)
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
const { extractReactClasses } = require('./lib/extract-react-classes');
const {
  extractDataAttrsFromHtml,
  hasMainClassCitation,
  findPhantomDataAttrs,
} = require('./lib/validate-example');

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

// ─── Map inverse classe→fichiers (#506) ───────────────────────────────────────
// Construite en une passe depuis groupMap.
// Map : classe (avec point, ex. '.card') → Set<chemin repo> (ex. Set{'shared/css/components/cards.css'})
const classToFiles = new Map();
for (const [, info] of groupMap.entries()) {
  for (const cls of info.classes) {
    if (!classToFiles.has(cls)) classToFiles.set(cls, new Set());
    classToFiles.get(cls).add(info.sourceFile);
  }
}

// Whitelist : kind:component légitimement sans module (aucune classe résoluble)
// reset-natif / texture-grain  → cssClasses: []  (sélecteurs natifs/pseudo-éléments)
// brand-acssi                  → cssClasses: null
const MODULE_EXEMPT = new Set(['reset-natif', 'texture-grain', 'brand-acssi']);

/**
 * Déduit module[] (chemins repo des modules CSS) depuis les cssClasses d'un composant.
 * Tri stable : modules propres (components/X.css sans '_') d'abord, transverses (_*) ensuite,
 * puis tri alphabétique dans chaque groupe — requis pour l'idempotence (2e run = 0 diff).
 * @param {Object} comp  entrée composant
 * @param {Map}    classToFiles  map classe→Set<chemin>
 * @returns {string[]} chemins repo dédoublonnés et triés ; [] si aucune classe résoluble
 */
function resolveModules(comp, classToFiles) {
  const files = new Set();
  for (const cls of expandCssClasses(comp.cssClasses)) {
    const f = classToFiles.get(cls);
    if (f) for (const p of f) files.add(p);
  }
  // Tri stable : fichiers sans '_' (modules propres) avant les transverses (_a11y, _responsive, _base…)
  return Array.from(files).sort((a, b) => {
    const aTransverse = /\/_[^/]+\.css$/.test(a);
    const bTransverse = /\/_[^/]+\.css$/.test(b);
    if (aTransverse !== bTransverse) return aTransverse ? 1 : -1;
    return a.localeCompare(b);
  });
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

// ─── Frontière page↔registre (#511) — constantes d'exemption ─────────────────
// Cf. DS-PRINCIPLES §6.1 — source de vérité normative. Maintenir en cohérence.

/**
 * Modules transverses exemptés de la réciprocité section↔entrée registre.
 * Convention : préfixe '_' (ex. _base, _a11y, _responsive) OU appartenance à cette liste.
 * Ces entrées sont kind:module (pas kind:component) et sans champ page.
 */
const TRANSVERSE_MODULES = new Set([
  'base', 'a11y', 'responsive', 'theming', 'section-header', 'signature',
]);

/**
 * Pages de référence : leurs sections documentent des fondations (tokens, typographie…)
 * et n'exigent PAS d'entrée kind:component. Exclues de la règle 1 de réciprocité.
 */
const REFERENCE_PAGES = new Set(['fondation', 'motion', 'getting-started']);

/**
 * Pages composant soumises à la réciprocité stricte section↔entrée registre.
 */
const COMPONENT_PAGES = new Set([
  'composants', 'formulaires', 'data', 'feedback', 'navigation', 'divers', 'templates',
]);

/**
 * Extrait les id des <section id="..."> d'un markup HTML.
 * @param {string} html
 * @returns {Set<string>} identifiants sans le '#'
 */
function extractSectionIds(html) {
  const set = new Set();
  if (!html) return set;
  const RE = /<section\b[^>]*\bid="([^"]+)"/g;
  let m;
  while ((m = RE.exec(html)) !== null) set.add(m[1]);
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

// ─── Validation du champ `example` (#748) ─────────────────────────────────────
// Le champ `example` n'était validé par rien : 3 composants audités (#613
// segmented-control, #468 context-menu, #594 mention), 3 exemples faux ou
// incomplets. Un `example` faux est copié-collé tel quel par les consumers
// et par les agents qui portent le composant en React (mode de défaillance
// identique à l'incident <ActionMenu> `.open`, côté vanilla cette fois).
//
// Règle retenue -- pragmatique, 2 contrôles, chacun attrape un défaut
// RÉELLEMENT constaté (validation manuelle des 3 audits + mesure d'impact
// sur les 138 entrées du registre, cf. RESULT #748) :
//
//   (A) Classe principale absente -- aucune des `cssClasses` du composant
//       n'apparaît parmi les classes citées par l'`example`. Signal fort
//       d'un copier-coller depuis un autre composant, ou de `cssClasses`
//       devenues obsolètes (ex. renommage `.zone-banner` → `.alert--kpi`
//       non répercuté). Exempté si l'`example` ne cite AUCUNE classe (cas
//       des composants pilotés 100% par JS, ex. `toast` : uniquement des
//       appels `showToast(...)`, aucun markup statique à montrer -- rien à
//       comparer, pas un défaut).
//   (B) Attribut `data-*` fantôme -- tout `data-*` cité dans l'`example`
//       doit être lu par le JS du DS (`shared/components.js` +
//       `shared/nav.js`), sous forme littérale (`'data-x'`/`"data-x"`) OU
//       `dataset.xCamel`. Restreint aux entrées AVEC `jsInit` non-null : si
//       `jsInit` est absent, aucun JS du DS ne peut lire quoi que ce soit --
//       l'attribut est alors un simple hook documentaire pour le gabarit du
//       consommateur (ex. `access-denied`), pas un contrat DS. C'est cette
//       règle qui aurait attrapé les 2 défauts constatés (#613
//       `data-segmented-id`, #468 `data-context-menu`) -- « le point le
//       plus rentable et le plus simple » (texte de l'issue).
//
// Hors périmètre assumé (documenté, pas implémenté) : la cohérence de la
// « classe d'état » posée par le JS après `jsInit` (3e contrôle suggéré par
// l'issue). Non généralisable de façon fiable : la majorité des entrées
// partagent le même `jsInit` umbrella (`initComponents`), qui ne permet pas
// de corréler une entrée à UNE classe d'état précise sans heuristique
// fragile (source de faux positifs). Laissé pour un ticket dédié si le
// besoin se confirme.
//
// (C) Évalué et NON implémenté (#789 -- suite de #781/#748) : détecter les
// sélecteurs `querySelector`/`querySelectorAll` que `jsInit` interroge de
// façon OBLIGATOIRE (absence => sortie de fonction ou exception), et exiger
// leur présence dans `example` -- ce qui aurait attrapé `fab` (`.fab-trigger`
// manquant, cf. #789) de façon automatique plutôt que manuelle.
//
// Analyse menée : sur les ~175 sites `querySelector()` (hors `*All`) de
// `shared/components.js`, seuls ~22 suivent un idiome de garde détectable
// mécaniquement (`var/let/const X = ...querySelector(...); if (!X) return`).
// Croisement de ces 22 avec le registre : un seul défaut réel trouvé
// (`.fab-trigger`, corrigé dans #789) -- tous les autres sont soit sans
// `example` du tout (règle inapplicable), soit portés par le `jsInit`
// umbrella `initComponents` (partagé par 6 entrées -- tabs/accordion/
// dropdown/kanban/backlog/charts -- impossible d'attribuer un sélecteur
// requis à UNE entrée précise sans heuristique fragile), soit déjà cités
// correctement.
//
// Faille structurelle qui condamne l'inverse aussi : le défaut RÉEL trouvé
// pendant #789 sur `carousel` (`.carousel-btn-prev`/`.carousel-btn-next`
// absentes des `cssClasses`) N'AURAIT PAS été détecté par cette règle --
// ces deux sélecteurs sont interrogés SANS garde de retour anticipé (seul
// `!track || !slides.length` déclenche un `return`), exactement comme
// d'autres sélecteurs authentiquement optionnels (`.carousel-dots`). Un
// idiome de garde absent ne veut donc pas dire « non requis » : le signal
// syntaxique est trop faible pour discriminer fiablement requis/optionnel
// à travers ~60 fonctions `init*` de styles hétérogènes (var/let/const,
// retours anticipés à une ou plusieurs lignes, conditions composées,
// sélecteurs construits dynamiquement type `'#' + id`).
//
// Conclusion : garder cette règle en dehors de generate-registry.js. Elle
// produirait soit des faux positifs non actionnables (umbrella), soit une
// fausse sécurité sur les cas qu'elle rate silencieusement (carousel). Un
// check à faux positifs/négatifs significatifs finit désactivé par le
// premier qui s'y heurte -- pire que pas de check. Les défauts de ce type
// restent capturés par audit manuel ciblé (cf. #781, #789), pas par un
// gate automatique.
//
// Mode --check (CI) : WARN-ONLY par défaut (objectif = produire l'inventaire,
// pas bloquer -- même défaut que check-dead-classes.js #765). Bascule
// bloquante : --example-strict.
//
// Fail-closed : shared/components.js ou shared/nav.js introuvable → erreur
// explicite + exit 1, jamais un inventaire silencieusement incomplet.

const DS_JS_FILES_FOR_EXAMPLE = ['shared/components.js', 'shared/nav.js'];
let dsJsBlobForExample = '';
for (const relJs of DS_JS_FILES_FOR_EXAMPLE) {
  const absJs = path.join(ROOT, relJs);
  if (!fs.existsSync(absJs)) {
    console.error(`[generate-registry] ERREUR : fichier JS introuvable pour la validation du champ example (#748) : ${relJs}`);
    process.exit(1);
  }
  dsJsBlobForExample += fs.readFileSync(absJs, 'utf8') + '\n';
}

// toCamelCase / extractDataAttrsFromHtml / hasMainClassCitation /
// findPhantomDataAttrs — extraites dans bin/lib/validate-example.js (#748,
// testables en isolation, même principe que bin/lib/extract-react-classes.js
// pour #747).

const exampleIssues = []; // { component, problem }

if (!process.argv.includes('--skip-validate')) {
  for (const comp of newComponents) {
    if (!comp.example) continue;

    // (A) classe principale absente de l'example
    const compClassesForExample = expandCssClasses(comp.cssClasses);
    const citedClassesForExample = extractClassesFromHtml(comp.example);
    if (!hasMainClassCitation(compClassesForExample, citedClassesForExample)) {
      exampleIssues.push({
        component: comp.name,
        problem: `aucune classe de cssClasses (${[...compClassesForExample].slice(0, 3).join(', ')}…) citée dans l'example`,
      });
    }

    // (B) attribut data-* fantôme (uniquement si un jsInit existe réellement)
    if (comp.jsInit) {
      const dataAttrs = extractDataAttrsFromHtml(comp.example);
      for (const attr of findPhantomDataAttrs(dataAttrs, dsJsBlobForExample)) {
        exampleIssues.push({
          component: comp.name,
          problem: `attribut ${attr} cité dans l'example mais absent de shared/components.js et shared/nav.js (jsInit="${comp.jsInit}")`,
        });
      }
    }
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

// ─── Pont page↔module (#506) : peupler module[] sur les kind:component ───────
// module[] est dérivé automatiquement depuis cssClasses via classToFiles.
// Jamais de saisie manuelle : la régénération remplace tout module existant.
let modulesPopulated = 0;
for (const comp of newComponents) {
  if (comp.kind !== 'component') { delete comp.module; continue; }
  if (MODULE_EXEMPT.has(comp.name)) { delete comp.module; continue; }
  const mods = resolveModules(comp, classToFiles);
  if (mods.length > 0) {
    comp.module = mods;
    modulesPopulated++;
  } else {
    delete comp.module; // aucune classe résoluble → omettre (idempotent)
  }
}

// ─── Parité React (#523) ──────────────────────────────────────────────────────

const REACT_SRC_BASE = path.join(ROOT, 'packages', 'react', 'src');
const REACT_SRC_ROOT = path.join(REACT_SRC_BASE, 'components');

/**
 * Résout le dossier source d'une clé REACT_TO_REGISTRY.
 * Par défaut une clé désigne un dossier de `src/components/<clé>` (cas
 * general : un composant = un dossier). Si la clé contient un `/`, le
 * dernier segment est le nom de fichier (pas un sous-dossier) : la clé
 * désigne un chemin relatif à `src/` DONT ON RETIRE le dernier segment
 * (ex. `icons/Icon` → dossier `src/icons/`, pour scanner `Icon.tsx`) —
 * nécessaire pour les primitives qui ne vivent pas sous `components/`
 * (#870 : Icon vit dans `src/icons/Icon.tsx`, jamais vu par le scanner
 * sinon). Sans ce `dirname`, le chemin résolu (`src/icons/Icon`, sans
 * extension) n'existe pas → le garde-fou `fs.existsSync` plus bas `continue`
 * silencieusement et le scanner anti-fantôme ne valide jamais Icon.tsx.
 * @param {string} key  clé de REACT_TO_REGISTRY
 * @returns {string} chemin absolu du dossier à scanner
 */
function resolveReactCompDir(key) {
  return key.includes('/')
    ? path.join(REACT_SRC_BASE, path.dirname(key))
    : path.join(REACT_SRC_ROOT, key);
}

// Table de mapping : composant React (dir, ou chemin relatif à src/ s'il
// contient un '/' — cf. resolveReactCompDir) → nom d'entrée registre.
// Source de vérité unique du lien React↔registre (robuste vs inférence).
// Mise à jour requise à chaque nouveau portage React.
const REACT_TO_REGISTRY = {
  Button:      'buttons',
  PageHeader:  'page-header',
  'icons/Icon': 'icon',  // #870 — primitif hors src/components/ (src/icons/Icon.tsx)
  ThemeToggle: 'theme-switcher',  // #518 — ThemeToggle émet .mode-switch (canonique, layout.css)
  UserMenu:    'user-menu',
  LoginScreen: 'login-screen',
  Toast:       'toast',
  Modal:       'modal',
  Tabs:        'tabs',
  ActionMenu:  'action-menu',
  Input:       'inputs',
  SegmentedControl: 'segmented-control',
  ThemeSwitcher: 'theme-switcher',  // #452 — compose ThemeToggle, même entrée registre (deux dirs → 1 composant DS)
  Dropdown:    'dropdown',  // #457 — dropdown custom div-based (≠ Select natif de Input/)
  Slider:      'slider',  // #463 — variante simple uniquement (dual non portée)
  NumberInput: 'number-input',  // #464
  SearchInput: 'search-input',  // #465
  TagInput:    'tag-input',  // #466
  FileUpload:  'file-upload',  // #469
  OTPInput:    'otp-input',  // #625 (Sprint 3 Formulaires B)
  Quiz:        'quiz-poll',  // #626 — Quiz + Poll co-localisés dans components/Quiz/
  PasswordInput: 'password-toggle',  // #627
  ColorInput:  'color-picker',  // #592
  TransferList: 'transfer-list',  // #593
  FormValidation: 'form-validation',  // #599 — dir components/FormValidation/ (FormErrorSummary) ; le hook useFormValidation vit dans src/hooks/
  Tooltip: 'tooltip',
  Popover: 'popover',
  Drawer: 'drawer',
  BottomSheet: 'bottom-sheet',
  FAB: 'fab',
  VersionBadge: 'version-notes',
  VersionNotes: 'version-notes',  // #650 — 2e dir → même entrée registre (cf. ThemeToggle/ThemeSwitcher)
  Progress: 'progress',
  ProgressTracker: 'progress-tracker',
  Gauge: 'gauge',
  UsageMeter: 'usage-meter',
  ActivityFeed: 'activity-feed',
  RiskMatrix: 'risk-matrix',
  TreeView: 'tree-view',
  HeatmapCalendar: 'heatmap-calendar',
  VirtualList: 'virtual-list',
  useChartReveal: 'charts',
  useCountUp: 'counter',
  DataGrid:    'data-grid',  // #695 — entrée 'data-grid' existait déjà (pending → ported)
  // #695 — les 3 fichiers UserFeedbackProvider/Modal/Button sont co-localisés
  // dans UN SEUL dossier components/UserFeedback/ (cf. précédent Quiz+Poll dans
  // components/Quiz/) : une seule clé de dossier réel, pas 3 clés par fichier.
  UserFeedback: 'user-feedback',
  NotificationBell: 'notification-bell',  // #717 — port du contrat cloche du header vanilla
  SiteHeader: 'site-header',              // #716 — header applicatif composable (compose les briques ci-dessus)
  Graph: 'graph',                         // #676 — wrapper I6-1 view-only pilotant le moteur bundlé depuis shared/graph/
  ContextMenu: 'context-menu',            // #468 — menu clic droit ; classe d'état .show (≠ .open d'ActionMenu)
  Accordion: 'accordion',                 // #461 — port du bloc inline d'initComponents (il n'existe PAS d'initAccordion)
  SplitButton: 'split-button',            // #600 — action primaire + caret menu (panneau sur le primitif .menu #520)
  MentionInput: 'mention',                // #594 — dropdown @ au caret (mirror-div réimplémenté côté package)
  JsonViewer: 'json-viewer',              // #596 — arbre JSON repliable, .json-tree/.json-node--last non émis (dead CSS)
  SplitPane: 'splitter',                  // #595 — panneaux redimensionnables, drag Pointer Events réimplémenté (window.__pointerDrag non disponible côté React)
  Calendar: 'calendar',                   // #760 — date-picker INLINE single/range
  TimePicker: 'time-picker',              // #761 — time-picker 24h/12h ; entrée registre dédiée (scission #770, ex-lumpée dans 'calendar')
  Rail: 'sidebar-rail',                   // #857 — rail compact + sidebar déployée (2 états d'1 composant), réutilise .sidebar-link-disabled (layout.css)
  Timeline: 'timeline',                   // #852 — fil vertical à deux niveaux, entièrement contrôlé, réutilise le vocabulaire .activity-* d'ActivityFeed (lists.css)
  SortableList: 'sortable-list',          // #853 — réordonnancement souris (DnD HTML5)/tactile (Pointer Events)/clavier (roving tabindex + Ctrl+↑/↓, contrat #836 inchangé)
  Card: 'cards',                          // #871 — Lot 1 décoratifs A : .card + card-flat/compact/horizontal/muted, CardIcon (.card-icon--*)
  CardMedia: 'card-media',                // #871 — compose Card, ajoute .card-media/.card-thumb/.card-body
  Badge: 'badges',                        // #871 — .badge + 6 variantes sémantiques réelles (issue en annonçait 7, cf. RELEASES) + .badge-nav
  Avatar: 'avatar',                       // #871 — 5 tailles + .avatar-gradient + .avatar-status(online/busy/offline), AvatarGroup co-localisé
  Divider: 'divider',                     // #871 — .divider (hr) / .divider-label (div) ; .divider-gradient/.divider-vertical hors périmètre (absents des cssClasses de l'entrée registre)
  Alert: 'alert',                         // #872 — Lot 2 décoratifs B : 4 variantes sémantiques + composition kpi/cta (AlertIcon/Title/Body/Desc/Value/Actions)
  Skeleton: 'skeleton',                   // #872 — .skeleton + text/title/avatar/btn
  EmptyState: 'empty-state',              // #872 — .empty-state/.empty-state-icon
  Spinner: 'spinner',                     // #872 — Spinner/SpinnerDots/LoadingBar/LoadingOverlay co-localisés dans components/Spinner/
  Pagination: 'pagination',               // #873 — Lot 3 décoratifs C : fenêtrage pur getPaginationRange, racine <nav>, PaginationInfo co-localisé
  Breadcrumb: 'breadcrumb',               // #873 — contrat ARIA vanilla reproduit (nav+aria-label+aria-current), structure <li> unifiée
  Stepper: 'stepper',                     // #873 — états .completed/.active/.pending exposés en props typées
  AchievementBadge: 'achievement-badge',  // #873 — AchievementBadge/AchievementGrid/AchievementProgress co-localisés dans components/AchievementBadge/
  Chips: 'chips',                         // #874 — Chip/ChipFilterGroup/ChipInput co-localisés dans components/Chips/ (fermeture/filtre/saisie, ChipInput = alias déprécié de TagInput)
  Rating: 'rating',                       // #874 — contrat clavier #836 (radiogroup APG) repris à l'identique
  Code: 'code',                           // #874 — dossier components/Code/ ; exporte CodeBlock/CopyButton/InlineCode/CodeKeyword/CodeString/CodeComment/CodeFunction/CodeNumber
};

// Entrées du registre couvertes par un wrapper React EXISTANT, sans dossier
// `src/components/` propre : un seul wrapper sert plusieurs entrées du
// registre (cf. #519 — zone-banner/upgrade-prompt sont les variantes
// .alert--kpi/.alert--cta d'Alert, pas des composants séparés). Distincte de
// REACT_TO_REGISTRY (qui mappe un DOSSIER réel à scanner) : ici il n'y a rien
// à scanner, les classes de ces entrées sont déjà couvertes par le scan réel
// du wrapper listé dans REACT_TO_REGISTRY. Même logique de séparation que
// REACT_CSS_UNDETECTABLE / REACT_JS_HOOK_CLASSES (#889) — deux tables qui
// disent chacune une chose vraie, plutôt qu'une seule où l'on glisse des
// exceptions par des clés fictives.
//
// Contrat : une entrée n'entre ici que si son champ `reactComponent` dans
// shared/components-registry.json désigne bien le wrapper couvrant (valeur
// de droite ci-dessous) — c'est ce lien qui rend la table vérifiable, validé
// mécaniquement plus bas (bloc réciprocité react:ported).
const REACT_COVERED_BY = {
  'zone-banner':    'Alert',   // .alert--kpi (#519) — reactComponent: "Alert" dans le registre
  'upgrade-prompt': 'Alert',   // .alert--cta (#519) — reactComponent: "Alert" dans le registre
  'copy-button':    'CodeBlock', // même initCopyButtons que `code` (#874) — reactComponent: "CodeBlock" dans le registre
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
const REACT_KNOWN_SINGLE = new Set([
  'overline', 'lead', 'subtitle', 'open',
  'dropdown', 'arrow', 'check', 'selected', 'icon',  // #457 — Dropdown
  'menu',  // #600 — SplitButton : panneau `class="menu split-button__menu"` (primitif canonique menu.css:12)
]);

// Whitelist : classes CSS réelles (confirmées par lecture manuelle du CSS
// source) mais non détectables par `extractClasses` (regex CSS-side) parce
// qu'elles n'apparaissent QUE comme second token d'un sélecteur composé
// adjacent sans séparateur (ex. `.dropdown-option.selected` — le `.selected`
// n'est précédé d'aucun caractère de la classe séparateur `[\s,{>;+~(]`).
// Ne JAMAIS ajouter ici une classe non vérifiée à la main dans le CSS —
// documenter la référence exacte à chaque ajout (#457).
const REACT_CSS_UNDETECTABLE = new Set([
  '.version-notes-dialog', // overlays/version-notes.css compound dialog.modal-dialog.version-notes-dialog
  '.risk-dot-hidden',      // data.css compound .risk-dot.risk-dot-hidden
  '.risk-dot-visible',     // data.css compound .risk-dot.risk-dot-visible
  '.selected',       // forms.css:53 .dropdown-option.selected (compound, non capturé)
  '.dropdown-value', // formulaires.html / components.js — span JS-hook sans règle CSS dédiée (hérite .dropdown-trigger)
  '.split-pane--dragging', // splitter.css — AUCUNE règle CSS aujourd'hui (bug DS suivi séparément, #763). Émise quand même côté React pour la parité vanilla ; #763 la rendra visible des deux côtés simultanément.
  '.cal-prev', // templates.css:84 — hook JS query-selector du vanilla (initCalendar), AUCUNE règle .cal-prev dédiée : le style vient de .cal-nav button (descendant, sans classe). Émise côté React pour parité markup (#760).
  '.cal-next', // idem .cal-prev — #760
  // #889 — repasse du package une fois le motif « variable intermédiaire »
  // couvert par extractReactClasses (#889) : les 4 classes ci-dessous sont
  // toutes réellement stylées, seulement invisibles du scanner CSS-side
  // (extractClasses ci-dessus, même limite documentée que .selected plus haut).
  '.number-input--compact',  // forms.css:216-224 — compound .number-input-wrap.number-input--compact (x3 règles)
  '.number-input--disabled', // forms.css:160 — compound .number-input-wrap.number-input--disabled
  '.initially-hidden',       // lists.css:166 — compound .activity-item.initially-hidden (fix #775/#778 : la classe A un backing CSS aujourd'hui, contrairement au commentaire historique dans ActivityFeed.tsx qui la disait sans CSS — commentaire à rafraîchir séparément)
  '.drag-over',               // lists.css:107 — compound .sortable-item.drag-over
  // #873 — Lot 3 décoratifs C : 4 classes réellement stylées, invisibles du
  // scanner CSS-side car second token d'un sélecteur composé sans séparateur.
  '.nav',        // feedback.css:43 — compound .page-btn.nav (Pagination, boutons précédent/suivant)
  '.bc-responsive', // navigation.css:44 — compound .breadcrumbs.bc-responsive (Breadcrumb, collapse mobile)
  '.completed',  // navigation.css:23,28 — compound .step-dot.completed / .step-line.completed (Stepper)
  '.pending',    // navigation.css:25 — compound .step-dot.pending (Stepper)
  '.new',        // badges.css:106 — compound .achievement.new (AchievementBadge)
  // #874 — Lot 4 interactifs A : compound sans séparateur, réellement stylé.
  '.copy-btn--success', // interactive.css:30,45,58 — compound .copy-btn.copy-btn--success (+ .copy-btn--inline.copy-btn--success, + `.copy-btn.copy-btn--success .copy-tooltip`)
  '.chip-icon', // badges.css:30 — compound .chip.chip-icon (posé sur la racine quand `icon` est fourni)
]);

// Whitelist DISTINCTE de REACT_CSS_UNDETECTABLE — ne pas fusionner (#889,
// revue de review) : ici, aucune des classes n'a de règle CSS, nulle part,
// même en sélecteur composé. Ce ne sont pas des faux négatifs de la regex
// CSS-side — ce sont des classes que le wrapper émet volontairement, sans
// aucun style attaché, pour rester accrochable par du JS (le sien ou celui
// du vanilla de référence). Objectif de la séparation : garder la liste
// ci-dessus strictement réservée aux faux négatifs de regex (chacune de ses
// entrées DOIT avoir une règle CSS vérifiable), et rendre visible ici la
// liste des classes qui n'ont VRAIMENT aucun style — pour qu'une classe qui
// devient inutile un jour ne se noie pas dans l'autre liste.
// Ne JAMAIS ajouter ici une classe dont on n'a pas vérifié qu'elle n'a
// AUCUNE règle CSS ET qu'elle est réellement consommée par un hook vérifié
// (vanilla ou React) — documenter la référence exacte du hook à chaque
// ajout. Une classe sans CSS ET sans hook n'est pas un hook JS : c'est du
// code mort, à retirer du wrapper (cf. `.progress-tracker-multi-layout`,
// #889 — trouvée ici puis retirée du wrapper une fois confirmé qu'aucun
// hook, ni vanilla ni React, ne la consommait).
const REACT_JS_HOOK_CLASSES = new Set([
  '.search-with-suggestions', // AUCUNE règle CSS. Hook vanilla réel : shared/components.js:598 (`wrap.classList.contains('search-with-suggestions')`, initSearchInput). Émise côté React pour calquer le markup du vanilla (formulaires.html) — #889.
  '.sortable-list--numbered', // AUCUNE règle CSS. Hook vanilla réel : shared/components.js:3500 (`list.classList.contains('sortable-list--numbered')`, initSortableLists). Émise côté React pour calquer le markup du vanilla (composants.html:714) — classe déjà morte identifiée AVANT le port (issue #889, section « Deux classes mortes déjà connues »), non imputable au wrapper.
]);

// extractReactClasses(tsx, opts) — extraite dans bin/lib/extract-react-classes.js
// (#747, testable en isolation). Voir ce fichier pour la doc + la cause racine
// du bug BEM (classe de caractères sans `_`).

const reactPhantoms = [];   // classe React absente du CSS réel
const reactDrift   = [];    // composant ported dont le marquage est incohérent

if (!process.argv.includes('--skip-validate') && fs.existsSync(REACT_SRC_ROOT)) {
  // (a) + (b) : vérifier chaque composant React mappé
  for (const [dir, regName] of Object.entries(REACT_TO_REGISTRY)) {
    const compDir = resolveReactCompDir(dir);
    if (!fs.existsSync(compDir)) continue;

    // Concat de tous les .tsx du composant (hors *.test.tsx)
    const tsxFiles = fs.readdirSync(compDir)
      .filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
    const emitted = new Set();
    for (const f of tsxFiles) {
      const reactClassOpts = { knownSingle: REACT_KNOWN_SINGLE, variantExpansions: REACT_VARIANT_EXPANSIONS };
      for (const c of extractReactClasses(fs.readFileSync(path.join(compDir, f), 'utf8'), reactClassOpts)) {
        emitted.add(c);
      }
    }

    // (a) chaque classe émise doit exister dans le CSS réel, OU dans l'une
    // des deux whitelists ci-dessus (#889) : REACT_CSS_UNDETECTABLE (faux
    // négatif connu du scanner CSS-side, classe réellement stylée) ou
    // REACT_JS_HOOK_CLASSES (aucun style, hook JS volontaire — deux natures
    // distinctes, gardées dans deux listes distinctes, cf. commentaires
    // ci-dessus).
    for (const cls of emitted) {
      if (!allCssClasses.has(cls) && !REACT_CSS_UNDETECTABLE.has(cls) && !REACT_JS_HOOK_CLASSES.has(cls)) {
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
  // Un composant mappé = un dossier réel scanné (REACT_TO_REGISTRY) OU une
  // entrée couverte par un wrapper existant sans dossier propre
  // (REACT_COVERED_BY, #872 — zone-banner/upgrade-prompt couverts par Alert).
  const portedNames = new Set(Object.values(REACT_TO_REGISTRY));
  for (const name of Object.keys(REACT_COVERED_BY)) portedNames.add(name);
  for (const comp of newComponents) {
    if (comp.react === 'ported' && !portedNames.has(comp.name)) {
      reactDrift.push({ component: '(registre)', registry: comp.name,
        reason: 'react="ported" mais aucun composant React dans REACT_TO_REGISTRY' });
    }
  }

  // (c) REACT_COVERED_BY vérifiable : le `reactComponent` déclaré dans le
  // registre pour chaque entrée couverte DOIT désigner le même wrapper que
  // la table — sinon la table dérive silencieusement d'un registre modifié
  // sans mise à jour symétrique (#872).
  for (const [regName, wrapperName] of Object.entries(REACT_COVERED_BY)) {
    const entry = newComponents.find(c => c.name === regName);
    if (!entry) {
      reactDrift.push({ component: `(${wrapperName})`, registry: regName,
        reason: 'entrée registre introuvable (REACT_COVERED_BY)' });
    } else if (entry.reactComponent !== wrapperName) {
      reactDrift.push({ component: `(${wrapperName})`, registry: regName,
        reason: `reactComponent="${entry.reactComponent}" — attendu "${wrapperName}" (REACT_COVERED_BY)` });
    } else if (entry.react !== 'ported') {
      reactDrift.push({ component: `(${wrapperName})`, registry: regName,
        reason: `react="${entry.react}" — attendu "ported"` });
    }
  }
}

// ─── Construction du nouveau registry ─────────────────────────────────────────

const newRegistry = {
  version: existingRegistry.version || '2.59.0',
  generated: {
    at: new Date().toISOString(),
    by: 'bin/generate-registry.js v1.3',
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

// ─── Validation pont module[] (#506) ─────────────────────────────────────────
// Ensemble de tous les sourceFile connus (pour vérifier que les items de module[] existent)
const knownSourceFiles = new Set();
for (const [, info] of groupMap.entries()) knownSourceFiles.add(info.sourceFile);

const moduleErrors = [];
const kindComponentTotal = newComponents.filter(c => c.kind === 'component').length;
const kindComponentExempted = MODULE_EXEMPT.size; // 3 entrées whitelistées
let moduleValidPopulated = 0;
for (const comp of newComponents) {
  if (comp.kind !== 'component') continue;
  const exempt = MODULE_EXEMPT.has(comp.name);
  const mods = comp.module || [];
  if (!exempt && mods.length === 0) {
    moduleErrors.push(`${comp.name} → aucun module résolu (cssClasses orphelines ?)`);
  }
  if (!exempt && mods.length > 0) moduleValidPopulated++;
  for (const m of mods) {
    if (!knownSourceFiles.has(m)) {
      moduleErrors.push(`${comp.name} → module inexistant dans le scan CSS : ${m}`);
    }
  }
}
const modulePontLine = `Pont module[]  : ${moduleValidPopulated} composants peuplés / ${kindComponentTotal} kind:component (${kindComponentExempted} exemptés : ${[...MODULE_EXEMPT].join(', ')})`;

// ─── Écart global parité React (toujours affiché) ────────────────────────────
const reactCounts = { ported: 0, pending: 0, 'n-a': 0 };
for (const comp of newComponents) {
  if (comp.react && reactCounts[comp.react] !== undefined) reactCounts[comp.react]++;
}
const reactPortable = reactCounts.ported + reactCounts.pending;
const reactParityLine = `Parité React : ${reactCounts.ported} ported / ${reactPortable} portables `
  + `(${reactCounts.pending} pending, ${reactCounts['n-a']} n-a)`;

// ─── Frontière page↔registre (#511) ──────────────────────────────────────────
// Vérifie la réciprocité : toute <section id> d'une page composant ↔ une entrée
// kind:component dans le registre. Deux directions :
//   (1) section sans entrée → "section-sans-entree"
//   (2) entrée sans section → "entree-orpheline"
// Warn-only par défaut ; bloquant avec --frontier-strict (après #508 livré).
// Exemptions : TRANSVERSE_MODULES + REFERENCE_PAGES. Cf. DS-PRINCIPLES §6.1.

const frontierErrors = [];

if (!process.argv.includes('--skip-validate')) {
  // Index registre : page → Set(entry.name) pour les kind:component avec page
  const regByPage = new Map();
  for (const c of newComponents) {
    if (c.kind !== 'component' || !c.page) continue;
    if (!regByPage.has(c.page)) regByPage.set(c.page, new Set());
    regByPage.get(c.page).add(c.name);
  }

  for (const page of COMPONENT_PAGES) {
    const pagePath = path.join(ROOT, 'pages', page + '.html');
    const html = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';
    const sectionIds = extractSectionIds(html);
    const entries = regByPage.get(page) || new Set();

    // (1) section sans entrée registre (hors transverses)
    for (const id of sectionIds) {
      if (!entries.has(id) && !TRANSVERSE_MODULES.has(id)) {
        frontierErrors.push({ type: 'section-sans-entree', page, id });
      }
    }
    // (2) entrée registre sans section correspondante (entrée orpheline/fantôme)
    for (const name of entries) {
      if (!sectionIds.has(name)) {
        frontierErrors.push({ type: 'entree-orpheline', page, name });
      }
    }
  }
}

const frontierStrict = process.argv.includes('--frontier-strict');
const frontierLine = frontierErrors.length === 0
  ? 'Frontière page↔registre : OK (0 violation)'
  : `Frontière page↔registre : ⚠ ${frontierErrors.length} violation(s) (warn-only — bascule bloquante après #508)`;

// ─── Validation du champ example (#748) — ligne de rapport ───────────────────
const exampleStrict = process.argv.includes('--example-strict');
const exampleLine = exampleIssues.length === 0
  ? 'Validation example      : OK (0 défaut)'
  : `Validation example      : ⚠ ${exampleIssues.length} défaut(s) (warn-only — bascule bloquante via --example-strict)`;

// ─── Mode --check (CI) ────────────────────────────────────────────────────────
// En mode --check, on valide sans écrire (idéal pour le step CI).

if (process.argv.includes('--check')) {
  console.log('=== generate-registry.js v1.3 — Design System msyx.fr (mode --check) ===');
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
  console.log(modulePontLine);
  if (moduleErrors.length > 0) {
    console.error('\n❌ Pont module[] (#506) — incohérences :');
    for (const e of moduleErrors) console.error('   - ' + e);
    console.error('\nCorrigez : régénérez le registre (`npm run generate-registry`) ou vérifiez les cssClasses de ces entrées.');
    process.exit(1);
  }
  console.log('Pont module[]      : OK (0 incohérence)');
  if (isIdempotent) {
    console.log('Idempotence       : OK (registre à jour)');
  } else {
    console.warn('⚠ Registre non à jour — lancez `npm run generate-registry` en local pour synchroniser.');
  }
  // Frontière page↔registre (#511)
  console.log(frontierLine);
  if (frontierErrors.length > 0) {
    console.error('\n⚠ Frontière page↔registre (#511) — violations détectées :');
    for (const e of frontierErrors) {
      if (e.type === 'section-sans-entree')
        console.error(`   [section sans entrée]  ${e.page}.html #${e.id} → ajouter une entrée kind:component dans le registre`);
      else
        console.error(`   [entrée orpheline]     ${e.page} → "${e.name}" sans <section id="${e.name}"> dans la page`);
    }
    console.error('\nCorrection : aligner sections et registre, ou utiliser sectionId (si name diverge de id), ou exempter (module transverse).');
    console.error('Bascule bloquante : --frontier-strict (activer après #508 livré). Cf. DS-PRINCIPLES §6.1.');
    if (frontierStrict) {
      console.error('\n❌ Mode --frontier-strict actif : violations bloquantes.');
      process.exit(1);
    }
    // warn-only : on continue sans exit(1)
  }
  // Validation du champ example (#748)
  console.log(exampleLine);
  if (exampleIssues.length > 0) {
    console.error('\n⚠ Champ example (#748) — défauts détectés (inventaire) :');
    for (const e of exampleIssues) console.error(`   - ${e.component} → ${e.problem}`);
    console.error('\nCorrection : mettre à jour l\'example dans shared/components-registry.json (classes/attributs réels).');
    console.error('Bascule bloquante : --example-strict (après triage de l\'inventaire, cf. #748).');
    if (exampleStrict) {
      console.error('\n❌ Mode --example-strict actif : défauts bloquants.');
      process.exit(1);
    }
    // warn-only : on continue sans exit(1)
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
console.log(modulePontLine);
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
