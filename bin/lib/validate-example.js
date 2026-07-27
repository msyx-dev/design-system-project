#!/usr/bin/env node
/**
 * validate-example.js — helpers purs pour la validation du champ `example`
 * du registre (#748) — Design System msyx.fr
 *
 * Extraits de bin/generate-registry.js pour être testables en isolation
 * (même principe que bin/lib/extract-react-classes.js, #747) : ces fonctions
 * n'ont aucun effet de bord (pas de fs, pas de process.exit) et peuvent être
 * exercées avec des fixtures en mémoire, sans dépendre de l'état réel du
 * dépôt (shared/components.js, pages/*.html...).
 *
 * Règle retenue (cf. commentaire détaillé dans bin/generate-registry.js) :
 *   (A) hasMainClassCitation() — l'example doit citer au moins une des
 *       cssClasses déclarées du composant (sinon : copier-coller depuis un
 *       autre composant, ou cssClasses obsolètes).
 *   (B) findPhantomDataAttrs() — tout data-* cité dans l'example doit être
 *       lu par le JS du DS (littéral ou dataset.xCamel).
 *
 * LIMITE CONNUE, évaluée et NON implémentée (#789) : (C) détecter les
 * sélecteurs que `jsInit` interroge de façon OBLIGATOIRE (absence => sortie
 * de fonction) et exiger leur présence dans `example` — aurait attrapé
 * `fab` (`.fab-trigger` manquant) automatiquement. Non fiable en pratique :
 * `jsInit` umbrella partagé (`initComponents`, 6 entrées) rend l'attribution
 * impossible, ET l'idiome de garde (`if (!x) return`) est absent pour des
 * sélecteurs pourtant réellement importants (ex. `.carousel-btn-prev`,
 * défaut réel trouvé en #789 mais que cette règle n'aurait PAS détecté).
 * Signal syntaxique trop faible pour discriminer requis/optionnel de façon
 * fiable sur ~60 fonctions `init*` hétérogènes → volontairement absent.
 * Détail complet : bin/generate-registry.js, section « Validation du champ
 * example (#748) », paragraphe (C).
 */

'use strict';

/**
 * Convertit un nom d'attribut kebab-case (sans le préfixe `data-`) en
 * camelCase, pour retrouver la forme `dataset.xCamel` posée par le JS.
 * @param {string} kebab  ex. 'context-menu'
 * @returns {string} ex. 'contextMenu'
 */
function toCamelCase(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Extrait les noms d'attributs data-* cités dans un snippet HTML (le nom
 * seul, avec le préfixe `data-`, sans la valeur).
 * @param {string} html
 * @returns {Set<string>} ex. Set{'data-context-menu', 'data-max'}
 */
function extractDataAttrsFromHtml(html) {
  const set = new Set();
  if (!html) return set;
  const RE = /[\s<]data-([a-z0-9-]+)(?:=|[\s>])/g;
  let m;
  while ((m = RE.exec(html)) !== null) set.add('data-' + m[1]);
  return set;
}

/**
 * Règle (A) : l'example cite-t-il au moins une classe du composant ?
 * Retourne `true` (pas de défaut) si :
 *   - le composant n'a aucune cssClasses résoluble (rien à comparer), OU
 *   - l'example ne cite AUCUNE classe (composant 100% piloté par JS, ex.
 *     toast : showToast(...), aucun markup statique à montrer), OU
 *   - au moins une classe du composant est citée dans l'example.
 * @param {Set<string>} compClasses   classes du composant (avec le point)
 * @param {Set<string>} citedClasses  classes citées par l'example (avec le point)
 * @returns {boolean} true = OK, false = défaut (aucune classe du composant citée)
 */
function hasMainClassCitation(compClasses, citedClasses) {
  if (!compClasses || compClasses.size === 0) return true;
  if (!citedClasses || citedClasses.size === 0) return true; // rien à comparer
  for (const cls of compClasses) {
    if (citedClasses.has(cls)) return true;
  }
  return false;
}

/**
 * Règle (B) : liste les attributs data-* cités dans l'example mais jamais
 * lus par le JS fourni (ni littéralement, ni via dataset.xCamel).
 * @param {Set<string>} dataAttrsCited  ex. Set{'data-context-menu'}
 * @param {string} jsBlob  contenu concaténé des fichiers JS du DS
 * @returns {string[]} attributs fantômes (ex. ['data-context-menu'])
 */
function findPhantomDataAttrs(dataAttrsCited, jsBlob) {
  const phantoms = [];
  for (const attr of dataAttrsCited) {
    const camel = toCamelCase(attr.slice('data-'.length));
    const hasLiteral = jsBlob.includes(attr);
    const hasDataset = jsBlob.includes('dataset.' + camel);
    if (!hasLiteral && !hasDataset) phantoms.push(attr);
  }
  return phantoms;
}

module.exports = {
  toCamelCase,
  extractDataAttrsFromHtml,
  hasMainClassCitation,
  findPhantomDataAttrs,
};
