#!/usr/bin/env node
/**
 * check-orphans.js — passe « orphelins » de shared/check-components.sh (#938)
 *
 * Sens que `check-components.sh` ne voyait pas : un composant LIVRE par sync.sh
 * (ses classes sont definies dans les copies DS du consommateur) mais JAMAIS MONTE
 * dans le code du consommateur. Cas d'ecole : `<SiteHeader>` monte sans la prop
 * `versionNotes`, donc le badge de version est livre et absent de l'ecran.
 *
 * Module pur Node (>= 20, engines du depot) + CLI interne (`require.main === module`).
 * Testable en isolation, meme patron que les gardes `bin/check-*.js`.
 *
 * API :
 *   scanOrphans({ registry, cssDir, srcDir, allowlist }) -> { entries, counts }
 *     registry  objet du registre, ou chemin de components-registry.json
 *     cssDir    dossier CSS du consommateur (copies `ds-*.css`, `components/*.css`, `ds-nav.js`)
 *     srcDir    code source du consommateur (corpus scanne)
 *     allowlist contenu brut du `.ds-allowlist` (string), tableau de lignes, ou null.
 *               Seules les lignes `orphelin:<nom-entree>` comptent ici.
 *     entries   [{ name, kind, status }] dans l'ordre du registre, entrees `kind:"module"` exclues
 *     status    consommee | orphelin | orphelin-structurel | accepte | non-mesurable | non-livree
 *     counts    { delivered, consumed, orphans, structural, accepted, unmeasurable, undelivered }
 *               (delivered = consumed + orphans + accepted ; orphans INCLUT les structurels)
 *   formatReport({ entries, counts }, { srcDir, cssDir }) -> { text, structuralCount }
 *
 * PRINCIPE DE SURETE (spec #938, arbitrage 7) : toute incertitude compte « consomme ».
 * La liste informative peut omettre un orphelin ; le blocage (orphelin structurel)
 * ne doit jamais se declencher a tort. Consequences dans ce fichier :
 *   - S1 est un simple test de mot entier, commentaires et chaines compris ;
 *   - une entree « livree » exige une classe DEFINIE (commentaires CSS retires) ;
 *   - sans classe simple, l'entree n'est jamais declaree orpheline (non-mesurable).
 * Exception assumee : les fichiers `*.test.*` / `*.spec.*` sont exclus du corpus (la
 * seule trace de `.version-badge` chez keepthread etait un test).
 *
 * Signaux de consommation (corpus = sources hors tests) :
 *   S1 classe      : une classe DISCRIMINANTE de l'entree apparait comme mot entier
 *   S2 import      : un nom de `reactExports` est importe de '@msyx-dev/react[/...]'
 *                    (`import type` et membres `type X` ne comptent pas)
 *   S3 composition : forme lowerCamel d'un export d'au moins 2 mots PascalCase, suivie
 *                    de `={` (ex. `versionNotes={`) — la prop de composition de SiteHeader
 *   S4 shell       : le corpus cite `ds-nav.js` -> ses classes rejoignent le corpus S1
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { SIMPLE_CLASS_RE } = require('./react-exports.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'shared', 'components-registry.json');

const SOURCE_EXTS = new Set([
  '.html', '.htm', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx',
  '.vue', '.svelte', '.astro', '.php', '.mdx',
]);
const EXCLUDED_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.git', '.claude']);
const TEST_FILE_RE = /\.(test|spec)\./;
const SHELL_NAME = 'ds-nav.js';
const REACT_PKG_RE = '@msyx-dev\\/react(?:\\/[^"\']*)?';

const STATUS_LABEL = {
  'orphelin-structurel': 'ORPHELIN-STRUCTUREL',
  orphelin: 'ORPHELIN',
  accepte: 'ORPHELIN-ACCEPTÉ',
  'non-mesurable': 'NON-MESURABLE',
};
const LABEL_WIDTH = 21; // plus longue etiquette (ORPHELIN-STRUCTUREL, 19) + 2 espaces

// --------------------------------------------------------------------------
// Lecture du systeme de fichiers
// --------------------------------------------------------------------------

function readIfFile(p) {
  try {
    return fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8') : null;
  } catch (_) {
    return null;
  }
}

function listFiles(dir, re) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => (d.isFile() || d.isSymbolicLink()) && re.test(d.name))
      .map((d) => path.join(dir, d.name));
  } catch (_) {
    return [];
  }
}

/**
 * Corpus source : fichiers de srcDir (recursif), extensions de SOURCE_EXTS.
 * Exclus : repertoires EXCLUDED_DIRS, `<cssDir>/components`, fichiers `ds-*` et
 * `*.test.*` / `*.spec.*`. Les liens symboliques de repertoire ne sont pas suivis
 * (boucles) ; ceux de fichiers le sont.
 * @returns {string} contenu concatene
 */
function collectCorpus(srcDir, cssDir) {
  const skipDir = path.resolve(cssDir, 'components');
  const parts = [];
  const walk = (dir) => {
    let dirents;
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const d of dirents) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        if (EXCLUDED_DIRS.has(d.name) || path.resolve(full) === skipDir) continue;
        walk(full);
      } else if (d.isFile() || d.isSymbolicLink()) {
        if (d.name.startsWith('ds-') || TEST_FILE_RE.test(d.name)) continue;
        if (!SOURCE_EXTS.has(path.extname(d.name).toLowerCase())) continue;
        const txt = readIfFile(full);
        if (txt !== null) parts.push(txt);
      }
    }
  };
  walk(srcDir);
  return parts.join('\n');
}

// --------------------------------------------------------------------------
// Jetons
// --------------------------------------------------------------------------

/** Mots entiers au sens « borne par un caractere hors [A-Za-z0-9_-] ». */
function wordSet(text) {
  return new Set(text.match(/[A-Za-z0-9_-]+/g) || []);
}

/**
 * Classes DEFINIES dans les copies DS du consommateur (`<css>/ds-*.css`,
 * `<css>/components/*.css`). Commentaires, url(...) et chaines sont retires avant
 * lecture : `.svg` d'un `url(sprite.svg)` ou une classe citee en commentaire ne
 * sont pas des definitions.
 * @returns {Set<string>} noms sans le point
 */
function deliveredClasses(cssDir) {
  const files = [
    ...listFiles(cssDir, /^ds-.*\.css$/),
    ...listFiles(path.join(cssDir, 'components'), /\.css$/),
  ];
  const defined = new Set();
  for (const f of files) {
    const css = (readIfFile(f) || '')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/url\([^)]*\)/g, ' ')
      .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, ' ');
    const re = /\.([A-Za-z][A-Za-z0-9_-]*)/g;
    let m;
    while ((m = re.exec(css)) !== null) defined.add(m[1]);
  }
  return defined;
}

// --------------------------------------------------------------------------
// S2 — imports React
// --------------------------------------------------------------------------

/**
 * Noms importes de '@msyx-dev/react' (et sous-chemins). Couvre :
 *   import { A, B as C, type D } from '@msyx-dev/react'   (multi-ligne) -> A, B
 *   export { A } from '@msyx-dev/react'                   (re-export)   -> A
 *   import * as DS from '@msyx-dev/react'                 (espace de noms) -> alias `DS`
 * Ignores : `import type …`, `export type …`, membres `type X`, import par defaut.
 * @returns {{ names: Set<string>, namespaces: string[] }}
 */
function parseReactImports(corpus) {
  const names = new Set();
  const namespaces = [];
  const re = new RegExp(`\\b(?:import|export)\\s+(type\\s+)?([^;'"]*?)\\s*from\\s*(["'])${REACT_PKG_RE}\\3`, 'g');
  let m;
  while ((m = re.exec(corpus)) !== null) {
    if (m[1]) continue; // import type / export type : aucun nom de valeur
    const clause = m[2];
    const braces = /\{([^}]*)\}/.exec(clause);
    if (braces) {
      const body = braces[1].replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
      for (const raw of body.split(',')) {
        const member = raw.trim();
        if (!member || /^type\s/.test(member)) continue;
        names.add(member.split(/\s+as\s+/)[0].trim());
      }
    }
    const ns = /\*\s*as\s+([A-Za-z_$][\w$]*)/.exec(clause);
    if (ns) namespaces.push(ns[1]);
  }
  return { names, namespaces };
}

// --------------------------------------------------------------------------
// S3 — prop de composition
// --------------------------------------------------------------------------

/** `VersionNotes` -> `versionNotes` ; null si < 2 mots PascalCase (`Button`, `Icon`, `useX`). */
function compositionProp(exportName) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(exportName)) return null;
  const words = exportName.match(/[A-Z][a-z0-9]*/g) || [];
  if (words.length < 2) return null;
  return exportName[0].toLowerCase() + exportName.slice(1);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --------------------------------------------------------------------------
// Allowlist
// --------------------------------------------------------------------------

/** Lignes `orphelin:<nom>` du `.ds-allowlist` (un commentaire `#` en fin de ligne est tolere). */
function parseAllowlist(allowlist) {
  const lines = Array.isArray(allowlist) ? allowlist : String(allowlist || '').split(/\r?\n/);
  const accepted = new Set();
  for (const raw of lines) {
    const m = /^\s*orphelin:([^\s#]+)/.exec(String(raw));
    if (m) accepted.add(m[1]);
  }
  return accepted;
}

// --------------------------------------------------------------------------
// Moteur
// --------------------------------------------------------------------------

function scanOrphans({ registry, cssDir, srcDir, allowlist }) {
  const reg = typeof registry === 'string' ? JSON.parse(fs.readFileSync(registry, 'utf8')) : registry;
  if (!reg || !Array.isArray(reg.components)) throw new Error('registre invalide : `components` absent');
  if (!cssDir || !fs.existsSync(cssDir)) throw new Error(`répertoire CSS inexistant : ${cssDir}`);
  if (!srcDir || !fs.statSync(srcDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`répertoire source inexistant : ${srcDir}`);
  }

  // 1. Perimetre : tout sauf les extractions generees `kind:"module"`.
  const scope = reg.components.filter((c) => c && c.kind !== 'module');

  // 2-3. Classes simples, puis discriminantes (listees par UNE seule entree du perimetre).
  const simple = new Map(); // nom d'entree -> classes simples (sans point)
  const listedBy = new Map(); // classe -> nb d'entrees qui la listent
  for (const c of scope) {
    const classes = [...new Set((c.cssClasses || []).filter((x) => SIMPLE_CLASS_RE.test(x)).map((x) => x.slice(1)))];
    simple.set(c.name, classes);
    for (const cls of classes) listedBy.set(cls, (listedBy.get(cls) || 0) + 1);
  }
  const discriminant = (name) => {
    const all = simple.get(name);
    const own = all.filter((cls) => listedBy.get(cls) === 1);
    return own.length ? own : all;
  };

  // 4. Classes definies dans les copies DS livrees.
  const defined = deliveredClasses(cssDir);

  // 5. Corpus source + jetons S1 (+ shell S4).
  const corpus = collectCorpus(srcDir, cssDir);
  const tokens = wordSet(corpus);
  if (corpus.includes(SHELL_NAME)) {
    // Charger le shell vaut consommer ce qu'il rend. Sa copie `<css>/ds-nav.js` est la
    // reference ; absente, `shared/nav.js` (dont sync.sh la copie a l'identique) la remplace.
    const shell = readIfFile(path.join(cssDir, SHELL_NAME)) ?? readIfFile(path.join(REPO_ROOT, 'shared', 'nav.js')) ?? '';
    for (const t of wordSet(shell)) tokens.add(t);
  }
  const imports = parseReactImports(corpus);

  const consumed = (c) => {
    // S1
    if (discriminant(c.name).some((cls) => tokens.has(cls))) return true;
    const exportsList = Array.isArray(c.reactExports) ? c.reactExports : [];
    for (const exp of exportsList) {
      // S2
      if (imports.names.has(exp)) return true;
      for (const ns of imports.namespaces) {
        if (new RegExp(`(?<![\\w$])${escapeRe(ns)}\\s*\\.\\s*${escapeRe(exp)}(?![\\w$])`).test(corpus)) return true;
      }
      // S3
      const prop = compositionProp(exp);
      if (prop && new RegExp(`(?<![A-Za-z0-9_$])${escapeRe(prop)}\\s*=\\s*\\{`).test(corpus)) return true;
    }
    return false;
  };

  // 6-7. Statut.
  const accepted = parseAllowlist(allowlist);
  const entries = [];
  for (const c of scope) {
    const classes = simple.get(c.name);
    const hasExports = Array.isArray(c.reactExports) && c.reactExports.length > 0;
    let status;
    if (!classes.length && !hasExports) {
      status = 'non-mesurable';
    } else if (!classes.length) {
      // Aucune classe : impossible de prouver la livraison. Consomme si un signal React
      // le dit ; sinon on ne pretend pas « livre jamais monte » (sûreté).
      status = consumed(c) ? 'consommee' : 'non-mesurable';
    } else if (!classes.some((cls) => defined.has(cls))) {
      status = 'non-livree';
    } else if (consumed(c)) {
      status = 'consommee';
    } else if (accepted.has(c.name)) {
      status = 'accepte';
    } else if (c.structural === true) {
      status = 'orphelin-structurel';
    } else {
      status = 'orphelin';
    }
    entries.push({ name: c.name, kind: c.kind, status });
  }

  const n = (s) => entries.filter((e) => e.status === s).length;
  const structural = n('orphelin-structurel');
  const counts = {
    delivered: n('consommee') + n('orphelin') + structural + n('accepte'),
    consumed: n('consommee'),
    orphans: n('orphelin') + structural,
    structural,
    accepted: n('accepte'),
    unmeasurable: n('non-mesurable'),
    undelivered: n('non-livree'),
  };
  return { entries, counts };
}

// --------------------------------------------------------------------------
// Sortie
// --------------------------------------------------------------------------

function formatReport({ entries, counts }, { srcDir, cssDir }) {
  const out = ['=== Passe orphelins (#938) ===', `Sources    : ${srcDir}`];
  for (const e of entries) {
    const label = STATUS_LABEL[e.status];
    if (!label) continue; // consommee / non-livree : non listees
    let line = label.padEnd(LABEL_WIDTH) + e.name;
    if (e.status === 'orphelin-structurel') line += ` [${e.kind}] — composant structurant livré, jamais monté`;
    else if (e.status === 'orphelin') line += ` [${e.kind}]`;
    else if (e.status === 'accepte') line += ' (.ds-allowlist)';
    out.push(line);
  }
  out.push('---');
  out.push(
    `Entrées livrées : ${counts.delivered} · consommées : ${counts.consumed} · ` +
    `orphelines : ${counts.orphans} (dont ${counts.structural} structurelles) · ` +
    `acceptées : ${counts.accepted} · non mesurables : ${counts.unmeasurable} · ` +
    `non livrées : ${counts.undelivered}`
  );
  out.push('');
  if (counts.structural > 0) {
    out.push(`FAIL — ${counts.structural} composant(s) structurant(s) livré(s) et jamais monté(s)`);
    out.push('Action : monter le composant, ou ajouter `orphelin:<nom>` dans');
    out.push(`         ${path.join(cssDir, '.ds-allowlist')} avec un commentaire \`#\` qui justifie l'écart`);
  } else {
    out.push('OK — aucun composant structurant livré et non monté');
  }
  return { text: out.join('\n') + '\n', structuralCount: counts.structural };
}

// --------------------------------------------------------------------------
// CLI : node check-orphans.js --css=<dir> --src=<dir> [--registry=<json>]
// Codes : 0 = propre, 1 = orphelin structurel, 2 = erreur d'usage / lecture.
// --------------------------------------------------------------------------

function main(argv) {
  const opt = {};
  for (const a of argv) {
    const m = /^--(css|src|registry)=(.*)$/.exec(a);
    if (m) opt[m[1]] = m[2];
    else {
      process.stderr.write(`ERREUR: argument inconnu : ${a}\n`);
      return 2;
    }
  }
  if (!opt.css || !opt.src) {
    process.stderr.write('Usage: check-orphans.js --css=<répertoire-css> --src=<répertoire-source> [--registry=<json>]\n');
    return 2;
  }
  try {
    const cssDir = path.resolve(opt.css);
    const srcDir = path.resolve(opt.src);
    const allowlist = readIfFile(path.join(cssDir, '.ds-allowlist'));
    const result = scanOrphans({ registry: opt.registry || DEFAULT_REGISTRY, cssDir, srcDir, allowlist });
    const { text, structuralCount } = formatReport(result, { srcDir: opt.src, cssDir: opt.css });
    process.stdout.write(text);
    return structuralCount > 0 ? 1 : 0;
  } catch (err) {
    process.stderr.write(`ERREUR: ${err.message}\n`);
    return 2;
  }
}

module.exports = { scanOrphans, formatReport, parseReactImports, compositionProp, parseAllowlist, collectCorpus, main };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
