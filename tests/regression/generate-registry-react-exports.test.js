// Test de non-regression — issue #938, tranche 1 (registre)
// Verifie les deux cles du registre ajoutees par #938 :
//   - `reactExports` : DERIVEE de packages/react/src/index.ts par
//     bin/lib/react-exports.js, appelee par bin/generate-registry.js
//     (presente ssi react:"ported", triee, sans doublon, jamais saisie) ;
//   - `structural` : saisie manuelle, validee par `--check`
//     (kind != module ET au moins une classe simple).
//
// Deux niveaux, parce que le generateur est un script a effets de bord :
//   A. unitaire — bin/lib/react-exports.js require()'e, fonctions pures ;
//   B. bout en bout — le VRAI generate-registry.js, execute dans une arborescence
//      temporaire (bin/ copie, le reste en liens symboliques vers le depot ; seuls
//      le registre et packages/react/src/index.ts sont des fichiers reels et
//      modifiables). Le depot n'est jamais ecrit.
//
// Modele : tests/regression/generate-version-notes.test.js (script Node autonome,
// exit 1 si un cas echoue). Lancer : npm run test:registry-react-exports

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const {
  parseIndexExports,
  reactKeyForPath,
  deriveReactExports,
  validateReactFields,
} = require(path.join(REPO_ROOT, 'bin', 'lib', 'react-exports.js'));

let pass = 0;
let fail = 0;

function ok(label) {
  pass++;
  console.log('  PASS: ' + label);
}

function ko(label, detail) {
  fail++;
  console.error('  FAIL: ' + label + (detail ? ' — ' + detail : ''));
}

function check(label, cond, detail) {
  if (cond) ok(label); else ko(label, detail);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ─── A. Unitaire : bin/lib/react-exports.js ──────────────────────────────────

console.log('A. Fonctions pures (bin/lib/react-exports.js)');

// A1 — parsing de index.ts
{
  const src = [
    '// commentaire de tete avec export { Faux } from "./components/Faux/Faux";',
    'export { Icon } from "./icons/Icon";',
    'export type { IconProps } from "./icons/Icon";',
    'export {',
    '  ToastProvider, // commentaire de ligne dans la liste',
    '  /* bloc */ useToast,',
    '  type ToastType,',
    '  Internal as Public,',
    '} from "./components/Toast/Toast";',
    'export { useChartReveal } from "./hooks/useChartReveal";',
    "export { Single } from './components/Single/Single';",
    'export type {',
    '  Autre,',
    '} from "./components/Autre/Autre";',
  ].join('\n');
  const parsed = parseIndexExports(src);
  check('A1 ignore les commentaires (un export cité en commentaire n\'existe pas)',
    !parsed.some(p => p.names.includes('Faux')), JSON.stringify(parsed));
  check('A1 ignore `export type { … }` (une ligne et multi-ligne)',
    !parsed.some(p => p.names.includes('IconProps') || p.names.includes('Autre')), JSON.stringify(parsed));
  const toast = parsed.find(p => p.path === './components/Toast/Toast');
  check('A1 membre `type X` ignoré, `A as B` retient B, commentaires dans la liste ignorés',
    toast && same(toast.names, ['ToastProvider', 'useToast', 'Public']), JSON.stringify(toast));
  check('A1 guillemets simples acceptés',
    parsed.some(p => p.path === './components/Single/Single' && same(p.names, ['Single'])), JSON.stringify(parsed));
  check('A1 ordre du fichier conservé', same(parsed.map(p => p.path), [
    './icons/Icon', './components/Toast/Toast', './hooks/useChartReveal', './components/Single/Single',
  ]), JSON.stringify(parsed.map(p => p.path)));
}

// A2 — clé REACT_TO_REGISTRY d'un chemin
{
  const map = { Code: 'code', 'icons/Icon': 'icon', useChartReveal: 'charts' };
  check('A2 components/<Dir>/… → <Dir>', reactKeyForPath('./components/Code/Code', map) === 'Code');
  check('A2 sous-fichier d\'un dossier → <Dir>', reactKeyForPath('./components/Code/CopyButton', map) === 'Code');
  check('A2 chemin complet s\'il est une clé (icons/Icon)', reactKeyForPath('./icons/Icon', map) === 'icons/Icon');
  check('A2 dernier segment hors components/ (hooks/useChartReveal → useChartReveal)',
    reactKeyForPath('./hooks/useChartReveal', map) === 'useChartReveal',
    String(reactKeyForPath('./hooks/useChartReveal', map)));
  check('A2 clé absente de la table → ignorée (null)',
    reactKeyForPath('./components/Inconnu/Inconnu', map) === null
      && reactKeyForPath('./hooks/useFocusTrap', map) === null);
}

// A3 — dérivation
{
  const indexSrc = [
    'export { VersionBadge } from "./components/VersionBadge/VersionBadge";',
    'export type { VersionBadgeProps } from "./components/VersionBadge/VersionBadge";',
    'export { VersionNotes, VersionNotes as Notes } from "./components/VersionNotes/VersionNotes";',
    'export { useChartReveal, useChart } from "./hooks/useChartReveal";',
    'export { Code, CodeBlock } from "./components/Code/Code";',
    'export { Orphan } from "./components/Orphan/Orphan";',
  ].join('\n');
  const reactToRegistry = {
    VersionBadge: 'version-notes',
    VersionNotes: 'version-notes',
    useChartReveal: 'charts',
    Code: 'code',
  };
  const reactCoveredBy = { 'copy-button': 'CodeBlock' };
  const d = deriveReactExports({ indexSrc, reactToRegistry, reactCoveredBy });
  check('A3 union de deux dossiers sur une même entrée, triée, sans doublon',
    same(d.get('version-notes'), ['Notes', 'VersionBadge', 'VersionNotes']), JSON.stringify(d.get('version-notes')));
  check('A3 hook hors components/ résolu par son dernier segment (charts ∋ useChartReveal)',
    d.get('charts') && d.get('charts').includes('useChartReveal') && d.get('charts').includes('useChart'),
    JSON.stringify(d.get('charts')));
  check('A3 entrée REACT_COVERED_BY → [wrapper]', same(d.get('copy-button'), ['CodeBlock']), JSON.stringify(d.get('copy-button')));
  check('A3 dossier hors table ignoré, aucune entrée fantôme',
    ![...d.keys()].some(k => k === 'Orphan' || k === 'orphan'), JSON.stringify([...d.keys()]));
  check('A3 ordre par unités de code, indépendant de la locale',
    same(d.get('code'), ['Code', 'CodeBlock']));
}

// A4 — validation
{
  const base = { name: 'x', kind: 'component', cssClasses: ['.x', '.x-y'], react: 'pending' };
  check('A4 entrée saine → aucune erreur', validateReactFields([base]).length === 0);
  check('A4 ported sans reactExports → erreur',
    validateReactFields([{ ...base, react: 'ported' }]).length === 1);
  check('A4 ported avec reactExports vide → erreur',
    validateReactFields([{ ...base, react: 'ported', reactExports: [] }]).length === 1);
  check('A4 ported avec reactExports → OK',
    validateReactFields([{ ...base, react: 'ported', reactExports: ['X'] }]).length === 0);
  check('A4 structural:true sur kind:"module" → erreur',
    validateReactFields([{ ...base, kind: 'module', structural: true }]).length === 1);
  check('A4 structural:true sans classe simple (composée/pseudo/null) → erreur',
    validateReactFields([{ ...base, cssClasses: ['.a .b', '.c:hover', '.d.e'], structural: true }]).length === 1
      && validateReactFields([{ ...base, cssClasses: null, structural: true }]).length === 1);
  check('A4 structural:true avec une classe simple parmi d\'autres → OK',
    validateReactFields([{ ...base, cssClasses: ['.a .b', '.simple'], structural: true }]).length === 0);
  check('A4 structural autre que true (false, "true") → erreur',
    validateReactFields([{ ...base, structural: false }]).length === 1
      && validateReactFields([{ ...base, structural: 'true' }]).length === 1);
}

// ─── B. Bout en bout : le vrai generate-registry.js ──────────────────────────

console.log('B. generate-registry.js réel (arborescence temporaire, dépôt en lecture seule)');

const GENERATOR_SRC = path.join(REPO_ROOT, 'bin', 'generate-registry.js');
const REGISTRY_SRC = path.join(REPO_ROOT, 'shared', 'components-registry.json');
const INDEX_SRC = path.join(REPO_ROOT, 'packages', 'react', 'src', 'index.ts');

const trees = [];

/**
 * Arborescence temporaire : le generateur calcule ROOT depuis son propre
 * emplacement (bin/..), donc la copie lit ce qu'on lui montre. Tout est lien
 * symbolique vers le depot SAUF le registre et index.ts.
 */
function makeTree({ registry, indexTs }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-react-exports-'));
  const links = [];
  const link = (target, at) => { fs.symlinkSync(target, at); links.push(at); };
  trees.push({ root, links });

  fs.mkdirSync(path.join(root, 'bin'));
  fs.copyFileSync(GENERATOR_SRC, path.join(root, 'bin', 'generate-registry.js'));
  link(path.join(REPO_ROOT, 'bin', 'lib'), path.join(root, 'bin', 'lib'));

  fs.mkdirSync(path.join(root, 'shared'));
  for (const name of fs.readdirSync(path.join(REPO_ROOT, 'shared'))) {
    if (name === 'components-registry.json') continue;
    link(path.join(REPO_ROOT, 'shared', name), path.join(root, 'shared', name));
  }
  fs.writeFileSync(path.join(root, 'shared', 'components-registry.json'), JSON.stringify(registry, null, 2) + '\n');

  link(path.join(REPO_ROOT, 'pages'), path.join(root, 'pages'));

  const srcDir = path.join(root, 'packages', 'react', 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  for (const name of fs.readdirSync(path.join(REPO_ROOT, 'packages', 'react', 'src'))) {
    if (name === 'index.ts') continue;
    link(path.join(REPO_ROOT, 'packages', 'react', 'src', name), path.join(srcDir, name));
  }
  fs.writeFileSync(path.join(srcDir, 'index.ts'), indexTs);
  return root;
}

function cleanup() {
  for (const { root, links } of trees) {
    // On retire les liens nous-memes avant rmSync : jamais de suivi de lien vers le depot.
    for (const l of links) { try { fs.unlinkSync(l); } catch (_) { /* deja retire */ } }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runGenerator(root, args) {
  const r = spawnSync(process.execPath, [path.join(root, 'bin', 'generate-registry.js'), ...args], { encoding: 'utf8' });
  return { rc: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const readRegistry = root => JSON.parse(fs.readFileSync(path.join(root, 'shared', 'components-registry.json'), 'utf8'));
const committed = JSON.parse(fs.readFileSync(REGISTRY_SRC, 'utf8'));
const realIndexTs = fs.readFileSync(INDEX_SRC, 'utf8');
const byName = (reg, n) => reg.components.find(c => c.name === n);

// Garde-fou : la fixture de départ (registre réel, index.ts réel) est saine. Sans
// lui, tous les « rc=1 » plus bas pourraient venir d'un autre défaut que celui posé.
const baselineRoot = makeTree({ registry: committed, indexTs: realIndexTs });
const baseline = runGenerator(baselineRoot, ['--check']);
check('B0 garde-fou : registre réel + index.ts réel → --check rc=0', baseline.rc === 0, baseline.out.slice(-400));

// B1 — dérivation réelle : on SUPPRIME tout reactExports du registre de départ, le
// générateur doit le reconstruire (et non le conserver tel quel).
{
  const stripped = JSON.parse(JSON.stringify(committed));
  for (const c of stripped.components) delete c.reactExports;
  const root = makeTree({ registry: stripped, indexTs: realIndexTs });
  const run1 = runGenerator(root, []);
  check('B1 régénération depuis un registre sans reactExports → rc=0', run1.rc === 0, run1.out.slice(-400));
  const reg = readRegistry(root);

  check('B1 version-notes.reactExports = ["VersionBadge","VersionNotes"]',
    same((byName(reg, 'version-notes') || {}).reactExports, ['VersionBadge', 'VersionNotes']),
    JSON.stringify((byName(reg, 'version-notes') || {}).reactExports));
  check('B1 site-header.reactExports = ["SiteHeader"]',
    same((byName(reg, 'site-header') || {}).reactExports, ['SiteHeader']),
    JSON.stringify((byName(reg, 'site-header') || {}).reactExports));
  check('B1 copy-button.reactExports = ["CodeBlock"] (REACT_COVERED_BY)',
    same((byName(reg, 'copy-button') || {}).reactExports, ['CodeBlock']),
    JSON.stringify((byName(reg, 'copy-button') || {}).reactExports));
  check('B1 charts.reactExports contient useChartReveal (chemin hors components/)',
    ((byName(reg, 'charts') || {}).reactExports || []).includes('useChartReveal'),
    JSON.stringify((byName(reg, 'charts') || {}).reactExports));

  const ported = reg.components.filter(c => c.react === 'ported');
  check('B1 toute entrée ported a un reactExports non vide',
    ported.length > 0 && ported.every(c => Array.isArray(c.reactExports) && c.reactExports.length > 0),
    ported.filter(c => !(c.reactExports && c.reactExports.length)).map(c => c.name).join(','));
  check('B1 aucune entrée non ported n\'a de reactExports',
    reg.components.filter(c => c.react !== 'ported').every(c => !('reactExports' in c)));
  check('B1 chaque reactExports est trié et sans doublon',
    ported.every(c => same(c.reactExports, [...new Set(c.reactExports)].sort())));

  // Idempotence : un 2e passage ne change rien, hors horodatage.
  const strip = r => JSON.stringify(r, (k, v) => (k === 'at' ? undefined : v));
  runGenerator(root, []);
  check('B1 idempotence : 2e régénération sans diff (hors generated.at)', strip(readRegistry(root)) === strip(reg));

  // Le registre COMMITTÉ doit contenir exactement ce que le générateur dérive : un
  // reactExports périmé ferait ignorer un composant par la passe orphelins (#938).
  const stale = committed.components.filter(c => !same(c.reactExports, byName(reg, c.name).reactExports)).map(c => c.name);
  check('B1 registre committé = dérivation fraîche (lancer `npm run generate-registry` sinon)',
    stale.length === 0, stale.join(','));
}

// B2 — structural : acceptation et refus par --check
{
  const structuralNames = committed.components.filter(c => c.structural).map(c => c.name).sort();
  check('B2 `structural: true` sur exactement version-notes et site-header',
    same(structuralNames, ['site-header', 'version-notes']), structuralNames.join(','));

  const withStructural = (name, extra) => {
    const reg = JSON.parse(JSON.stringify(committed));
    Object.assign(byName(reg, name), extra || {}, { structural: true });
    return reg;
  };

  // Témoin : `structural: true` posé sur une entrée légitime est accepté.
  const okRoot = makeTree({ registry: withStructural('carousel'), indexTs: realIndexTs });
  const okRun = runGenerator(okRoot, ['--check']);
  check('B2 témoin : structural:true sur une entrée component avec classes simples → rc=0', okRun.rc === 0, okRun.out.slice(-300));

  const moduleEntry = committed.components.find(c => c.kind === 'module');
  const modRoot = makeTree({ registry: withStructural(moduleEntry.name), indexTs: realIndexTs });
  const modRun = runGenerator(modRoot, ['--check']);
  check('B2 structural:true sur une entrée kind:"module" → --check rc=1, motif nommé',
    modRun.rc === 1 && /structural:true interdit sur kind:"module"/.test(modRun.out), 'rc=' + modRun.rc + ' ' + modRun.out.slice(-300));

  // reset-natif : kind component, exemptée de module[] — seule la règle « classe simple » peut l'arrêter.
  const target = byName(committed, 'reset-natif');
  const noSimple = !(target.cssClasses || []).some(c => /^\.[A-Za-z][A-Za-z0-9_-]*$/.test(c));
  check('B2 garde-fou : reset-natif n\'a bien aucune classe simple', noSimple, JSON.stringify(target.cssClasses));
  const simpleRoot = makeTree({ registry: withStructural('reset-natif'), indexTs: realIndexTs });
  const simpleRun = runGenerator(simpleRoot, ['--check']);
  check('B2 structural:true sur une entrée sans classe simple → --check rc=1, motif nommé',
    simpleRun.rc === 1 && /exige au moins une classe simple/.test(simpleRun.out), 'rc=' + simpleRun.rc + ' ' + simpleRun.out.slice(-300));
}

// B3 — ported sans export : --check échoue
{
  // On retire l'export de SiteHeader : site-header reste react:"ported" mais plus rien ne le mappe.
  const cut = realIndexTs.replace(/export \{ SiteHeader \} from "\.\/components\/SiteHeader\/SiteHeader";\n/, '');
  check('B3 garde-fou : la coupe a bien retiré l\'export de SiteHeader', cut !== realIndexTs && !/export \{[^}]*\bSiteHeader\b[^}]*\} from/.test(cut));
  const root = makeTree({ registry: committed, indexTs: cut });
  const run = runGenerator(root, ['--check']);
  check('B3 entrée ported sans export dans index.ts → --check rc=1, entrée nommée',
    run.rc === 1 && /site-header → react:"ported" sans reactExports/.test(run.out), 'rc=' + run.rc + ' ' + run.out.slice(-300));
}

cleanup();

console.log('');
console.log(`${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
