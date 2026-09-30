/**
 * react-exports.js — noms React que le consommateur importe, par entrée du registre (#938)
 *
 * Extraite de bin/generate-registry.js pour etre testable en isolation (meme
 * precedent que extract-react-classes.js #747 et validate-example.js #748) :
 * le generateur est un script a effets de bord, rien de ceci ne l'est.
 *
 * Probleme resolu : REACT_TO_REGISTRY mappe un DOSSIER React vers une entree du
 * registre, pas les noms que le consommateur IMPORTE (le dossier `Code` exporte
 * `CodeBlock`, `CopyButton`… ; le dossier `Kanban` exporte `KanbanBoard`…).
 * La passe « orphelins » de shared/check-components.sh (#938) cherche ces noms
 * dans le code du consommateur : il faut donc les materialiser dans le registre,
 * ou le script shell n'y a pas acces (la table vit dans une constante JS).
 *
 * Precedent : le champ derive `module[]` (#506, DS-PRINCIPLES §8.2) — recalcule a
 * chaque passe, JAMAIS saisi a la main, supprime quand il n'a pas de sens.
 *
 * API :
 *   parseIndexExports(src)               -> [{ path, names }]
 *   reactKeyForPath(path, reactToRegistry) -> string | null
 *   deriveReactExports({ indexSrc, reactToRegistry, reactCoveredBy }) -> Map<entree, string[]>
 *   validateReactFields(components)      -> string[]   (vide = OK)
 */

'use strict';

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Classe « simple » : une seule classe, sans combinateur ni pseudo (le meme
// critere sert a la passe orphelins de check-components.sh, #938).
const SIMPLE_CLASS_RE = /^\.[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Retire les commentaires de ligne et de bloc d'une source TS en respectant les
 * litteraux de chaine (un `//` dans `"./a//b"` n'est pas un commentaire).
 * @param {string} src
 * @returns {string}
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') j++;
        j++;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * Lit les instructions `export { … } from "<chemin>"` d'un index.ts.
 *  - `export type { … }` est ignoree en bloc (aucun nom de valeur) ;
 *  - un membre `type X` est ignore ;
 *  - `A as B` : le nom retenu est `B`, celui que le consommateur importe.
 * @param {string} src contenu de packages/react/src/index.ts
 * @returns {{path: string, names: string[]}[]} dans l'ordre du fichier
 */
function parseIndexExports(src) {
  const re = /export\s+(type\s+)?\{([^}]*)\}\s*from\s*(["'])([^"']+)\3/g;
  const clean = stripComments(src);
  const result = [];
  let m;
  while ((m = re.exec(clean)) !== null) {
    if (m[1]) continue; // export type { … } from
    const names = [];
    for (const raw of m[2].split(',')) {
      const member = raw.trim();
      if (!member || /^type\s/.test(member)) continue;
      const asMatch = /\bas\s+([A-Za-z_$][\w$]*)$/.exec(member);
      names.push(asMatch ? asMatch[1] : member);
    }
    if (names.length > 0) result.push({ path: m[4], names });
  }
  return result;
}

/**
 * Cle REACT_TO_REGISTRY d'un chemin d'export :
 *   - `components/<Dir>/…`                           -> `<Dir>`
 *   - sinon le chemin complet s'il est une cle       -> `icons/Icon`
 *   - sinon son dernier segment                      -> `hooks/useChartReveal` -> `useChartReveal`
 * Une cle absente de REACT_TO_REGISTRY est ignoree (null).
 * @param {string} modPath chemin tel qu'ecrit dans `from "…"`
 * @param {Object<string,string>} reactToRegistry
 * @returns {string|null}
 */
function reactKeyForPath(modPath, reactToRegistry) {
  const clean = modPath.replace(/^\.\//, '').replace(/\.(?:tsx?|jsx?)$/, '');
  const dir = /^components\/([^/]+)\//.exec(clean);
  let key;
  if (dir) key = dir[1];
  else if (has(reactToRegistry, clean)) key = clean;
  else key = clean.split('/').pop();
  return has(reactToRegistry, key) ? key : null;
}

/**
 * Derive, pour chaque entree du registre, l'union triee (sans doublon) des noms
 * exportes par les dossiers React qui la mappent. Une entree de REACT_COVERED_BY
 * n'a pas de dossier propre : c'est `[<wrapper>]`.
 * L'ordre est celui des unites de code (`sort()` par defaut), independant de la
 * locale : le resultat doit etre identique sur toute machine (idempotence).
 * @param {{indexSrc: string, reactToRegistry: Object<string,string>, reactCoveredBy: Object<string,string>}} p
 * @returns {Map<string, string[]>} entree -> noms ; les entrees sans export sont absentes
 */
function deriveReactExports({ indexSrc, reactToRegistry, reactCoveredBy }) {
  const byEntry = new Map();
  for (const { path: modPath, names } of parseIndexExports(indexSrc)) {
    const key = reactKeyForPath(modPath, reactToRegistry);
    if (key === null) continue;
    const entry = reactToRegistry[key];
    if (!byEntry.has(entry)) byEntry.set(entry, new Set());
    for (const n of names) byEntry.get(entry).add(n);
  }
  for (const [entry, wrapper] of Object.entries(reactCoveredBy)) {
    byEntry.set(entry, new Set([wrapper]));
  }
  const result = new Map();
  for (const [entry, set] of byEntry) result.set(entry, [...set].sort());
  return result;
}

/**
 * Valide les deux cles du registre ajoutees par #938.
 *  - toute entree `react:"ported"` a un `reactExports` non vide ;
 *  - toute entree portant `structural` la pose a `true`, a `kind` != `module`
 *    et a au moins une classe simple dans `cssClasses` (une entree sans classe
 *    simple ne peut pas etre detectee par la passe orphelins : la declarer
 *    structurante serait un blocage impossible a lever autrement que par
 *    l'allowlist).
 * @param {Object[]} components entrees du registre (apres derivation)
 * @returns {string[]} messages d'erreur ; vide = OK
 */
function validateReactFields(components) {
  const errors = [];
  for (const comp of components) {
    if (comp.react === 'ported'
        && !(Array.isArray(comp.reactExports) && comp.reactExports.length > 0)) {
      errors.push(`${comp.name} → react:"ported" sans reactExports (aucun export de packages/react/src/index.ts ne mappe cette entrée)`);
    }
    if (has(comp, 'structural')) {
      if (comp.structural !== true) {
        errors.push(`${comp.name} → structural doit valoir true (ou être absent), reçu ${JSON.stringify(comp.structural)}`);
      } else {
        if (comp.kind === 'module') {
          errors.push(`${comp.name} → structural:true interdit sur kind:"module" (extraction générée, classes génériques)`);
        }
        const simple = (comp.cssClasses || []).filter(c => typeof c === 'string' && SIMPLE_CLASS_RE.test(c));
        if (simple.length === 0) {
          errors.push(`${comp.name} → structural:true exige au moins une classe simple dans cssClasses (sinon la passe orphelins ne peut pas la détecter)`);
        }
      }
    }
  }
  return errors;
}

module.exports = {
  SIMPLE_CLASS_RE,
  stripComments,
  parseIndexExports,
  reactKeyForPath,
  deriveReactExports,
  validateReactFields,
};
