#!/usr/bin/env node
/**
 * extract-react-classes.js — extraction des classes CSS émises par un .tsx
 * Design System msyx.fr — bin/lib/extract-react-classes.js v1.2
 *
 * Extrait de bin/generate-registry.js (#747) pour être testable en isolation
 * (require() direct, sans exécuter tout le script generate-registry.js qui a
 * des effets de bord au chargement — scan CSS, lecture/écriture registre…).
 *
 * Historique #747 : la classe de caractères du token littéral n'acceptait
 * pas `_`, donc toute classe BEM en double underscore (ex. `split-button__caret`,
 * `diff__line`) était silencieusement absente du Set retourné — pas d'erreur,
 * juste un token qui ne matchait aucune regle et disparaissait. Conséquence :
 * le filet anti-fantôme de generate-registry.js (parité React #523) était
 * aveugle sur ces classes.
 *
 * Historique #889 : le motif « variable intermédiaire » — `const itemClasses
 * = [...].filter(Boolean).join(" ")` puis `className={itemClasses}` plus
 * loin dans le fichier — n'était couvert par AUCUNE des 3 formes ci-dessous
 * (ni littéral, ni template, ni tableau inline dans `className={[...]}`).
 * C'est pourtant le motif dominant du package (~40 composants dont
 * `Timeline`/`Rail`/`ActionMenu`/`DataGrid`/`SortableList`), qui passaient
 * donc au vert sans aucune vérification. Cf. étape 4 ci-dessous.
 *
 * @param {string} tsx  contenu du fichier .tsx
 * @param {Object} [opts]
 * @param {Set<string>} [opts.knownSingle]  classes mono-mot légitimes (whitelist)
 * @param {Object<string,string[]>} [opts.variantExpansions]  table d'expansion des segments dynamiques
 * @returns {Set<string>} classes avec le point (ex. '.btn-primary', '.split-button__caret')
 */
function extractReactClasses(tsx, opts = {}) {
  const knownSingle = opts.knownSingle || new Set();
  const variantExpansions = opts.variantExpansions || {};
  const set = new Set();

  /**
   * Traite une valeur brute de className (littérale ou template) :
   * extrait les tokens kebab/BEM ou mono-mots whitelist, et expanse les
   * segments dynamiques connus.
   */
  function processClassValue(raw) {
    // a) tokens littéraux kebab, BEM (__), ou mono-mots whitelist
    for (const tok of raw.split(/[\s${}()`]+/).filter(Boolean)) {
      // Ignorer les tokens qui ressemblent à du JS (contiennent [, ", etc.)
      if (tok.includes('"') || tok.includes('[') || tok.includes('.')) continue;
      if (knownSingle.has(tok)) {
        set.add('.' + tok);
      } else if (
        // #747 : la classe de caractères inclut désormais `_` pour couvrir
        // les éléments/modificateurs BEM (`bloc__element`, `bloc__element--mod`).
        /^[a-z][a-z0-9_-]*$/.test(tok) &&
        // Signal de validité : un tiret (kebab classique, ex. `btn-primary`)
        // OU un double underscore (BEM element, ex. `diff__line`, qui peut
        // n'avoir AUCUN tiret). Un simple underscore isolé reste ambigu
        // (identifiant JS type snake_case) et n'est pas suffisant seul.
        (tok.includes('-') || tok.includes('__')) &&
        // Un token se terminant par '-' ou '_' est un préfixe partiel
        // (ex. "login-card--" avant le ${variant}) → pas une classe valide.
        !tok.endsWith('-') &&
        !tok.endsWith('_')
      ) {
        set.add('.' + tok);
      }
    }
    // b) variants dynamiques `prefix-${expr}` → expansion via table
    const DYN_RE = /([a-z][a-z0-9-]*-)\$\{([^}]+)\}/g;
    let d;
    while ((d = DYN_RE.exec(raw)) !== null) {
      const key = d[1] + '${' + d[2].trim() + '}';
      const values = variantExpansions[key];
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

  // 4. Motif « variable intermédiaire » (#889) :
  //      const itemClasses = [base, isActive && "actif"].filter(Boolean).join(" ");
  //      return <div className={itemClasses} />;
  //    Anti faux-positif : on ne scanne QUE les déclarations `const <nom> = …`
  //    dont le <nom> est réellement référencé tel quel dans un
  //    `className={<nom>}` ailleurs dans le fichier — jamais un scan aveugle
  //    de tous les `.join(...)` du fichier (qui pourrait capturer un tableau
  //    sans rapport avec des classes CSS et faire remonter un phantom
  //    fantaisiste). La valeur associée n'est pas ré-analysée pour sa forme
  //    exacte (tableau + `.join`, concaténation `+`, ternaire…) : on extrait
  //    tout littéral de chaîne présent dans le membre droit de la déclaration,
  //    jusqu'au `;` qui la termine — même tokenizer que les formes 1-3
  //    (`processClassValue` rejette déjà tout ce qui ne ressemble pas à une
  //    classe kebab/BEM/whitelist).
  const classNameVarNames = new Set();
  const CLASSNAME_VAR_RE = /className=\{\s*([A-Za-z_$][\w$]*)\s*\}/g;
  while ((m = CLASSNAME_VAR_RE.exec(tsx)) !== null) {
    classNameVarNames.add(m[1]);
  }
  for (const varName of classNameVarNames) {
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const declRe = new RegExp('const\\s+' + escaped + '\\s*=\\s*([\\s\\S]*?);');
    const decl = declRe.exec(tsx);
    if (!decl) continue; // pas une const locale (ex. prop déstructurée) → rien à extraire
    const STR_INSIDE_RE = /"([^"]+)"|'([^']+)'|`([^`]+)`/g;
    let s;
    while ((s = STR_INSIDE_RE.exec(decl[1])) !== null) {
      processClassValue(s[1] ?? s[2] ?? s[3] ?? '');
    }
  }

  return set;
}

module.exports = { extractReactClasses };
