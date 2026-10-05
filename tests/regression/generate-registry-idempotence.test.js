// Test de non-regression — issue #1053 (points 3) : idempotence du registre.
//
// Deux defauts verrouilles ici :
//   1. `--check` ne faisait qu'un warn (rc 0) quand la regeneration aurait modifie
//      shared/components-registry.json : le registre committe divergeait de sa
//      derivation sans que la CI le voie. Il rend desormais rc=1.
//   2. module[] dependait de l'ordre de readdir : `base.css` et `components/_base.css`
//      partagent le nom de groupe « base », et le groupe fusionne gardait le chemin du
//      premier fichier rencontre. Deux checkouts du meme commit derivaient deux
//      registres differents. module[] se calcule desormais fichier par fichier, sur
//      un parcours trie, hors commentaires.
//
// Bout en bout, sur le VRAI generate-registry.js, execute dans une arborescence
// temporaire (meme patron que generate-registry-react-exports.test.js) : bin/ copie,
// shared/css COPIE en vrais fichiers (dans un ordre de creation choisi : c'est ce qui
// fait varier l'ordre de readdir), le reste en liens symboliques. Le depot n'est
// jamais ecrit. Lancer : npm run test:registry-idempotence

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const GENERATOR_SRC = path.join(REPO_ROOT, 'bin', 'generate-registry.js');
const REGISTRY_SRC = path.join(REPO_ROOT, 'shared', 'components-registry.json');
const CSS_SRC = path.join(REPO_ROOT, 'shared', 'css');

let pass = 0;
let fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; console.log('  PASS: ' + label); }
  else { fail++; console.error('  FAIL: ' + label + (detail ? ' — ' + detail : '')); }
}

const trees = [];

/**
 * @param {object} registry  registre ecrit dans l'arborescence
 * @param {string[]} cssFirst  entrees de shared/css a creer EN PREMIER (le reste suit)
 */
function makeTree(registry, cssFirst) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-idempotence-'));
  const links = [];
  const link = (target, at) => { fs.symlinkSync(target, at); links.push(at); };
  trees.push({ root, links });

  fs.mkdirSync(path.join(root, 'bin'));
  fs.copyFileSync(GENERATOR_SRC, path.join(root, 'bin', 'generate-registry.js'));
  link(path.join(REPO_ROOT, 'bin', 'lib'), path.join(root, 'bin', 'lib'));

  fs.mkdirSync(path.join(root, 'shared'));
  for (const name of fs.readdirSync(path.join(REPO_ROOT, 'shared'))) {
    if (name === 'components-registry.json' || name === 'css') continue;
    link(path.join(REPO_ROOT, 'shared', name), path.join(root, 'shared', name));
  }
  fs.writeFileSync(path.join(root, 'shared', 'components-registry.json'), JSON.stringify(registry, null, 2) + '\n');

  // shared/css en vrais fichiers : le scan ignore les liens (Dirent.isFile() faux).
  const cssDst = path.join(root, 'shared', 'css');
  fs.mkdirSync(cssDst);
  const all = fs.readdirSync(CSS_SRC);
  const order = [...cssFirst, ...all.filter(n => !cssFirst.includes(n))];
  for (const name of order) {
    fs.cpSync(path.join(CSS_SRC, name), path.join(cssDst, name), { recursive: true });
  }

  link(path.join(REPO_ROOT, 'pages'), path.join(root, 'pages'));
  link(path.join(REPO_ROOT, 'packages'), path.join(root, 'packages'));
  return root;
}

function cleanup() {
  for (const { root, links } of trees) {
    for (const l of links) { try { fs.unlinkSync(l); } catch (_) { /* deja retire */ } }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function run(root, args) {
  const r = spawnSync(process.execPath, [path.join(root, 'bin', 'generate-registry.js'), ...args], { encoding: 'utf8' });
  return { rc: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const registryPath = root => path.join(root, 'shared', 'components-registry.json');
const strip = json => json.replace(/"at": "[^"]*"/, '"at": "__TS__"');
const committedJson = fs.readFileSync(REGISTRY_SRC, 'utf8');
const committed = JSON.parse(committedJson);

console.log('I. Idempotence du registre (#1053)');

// I0/I1 — ordre de readdir : base.css cree avant components/, puis l'inverse.
// Les deux regenerations doivent rendre le registre committe, octet pour octet
// hors horodatage. Avant #1053, l'un des deux ordres faisait basculer module[]
// de 13 entrees de components/_base.css vers base.css.
for (const [label, first] of [['I0 base.css avant components/', ['base.css', 'components']],
                              ['I1 components/ avant base.css', ['components', 'base.css']]]) {
  const root = makeTree(committed, first);
  const chk = run(root, ['--check']);
  check(`${label} → --check rc=0 sur le registre committé`, chk.rc === 0, chk.out.slice(-400));
  const gen = run(root, []);
  const after = fs.readFileSync(registryPath(root), 'utf8');
  check(`${label} → régénération = registre committé (hors generated.at)`,
    gen.rc === 0 && strip(after) === strip(committedJson), 'rc=' + gen.rc);
}

// I2 — registre derive : on inverse le module[] d'une entree. --check doit rendre
// rc=1, nommer l'entree, dire quoi faire, et NE PAS ecrire le registre.
const target = committed.components.find(c => Array.isArray(c.module) && c.module.length >= 2);
check('I2 garde-fou : une entrée a au moins 2 modules', !!target);
const drifted = JSON.parse(committedJson);
const d = drifted.components.find(c => c.name === target.name);
d.module = [...d.module].reverse();
const driftRoot = makeTree(drifted, []);
const before = fs.readFileSync(registryPath(driftRoot), 'utf8');
const driftCheck = run(driftRoot, ['--check']);
check('I2 registre dérivé → --check rc=1', driftCheck.rc === 1, 'rc=' + driftCheck.rc + ' ' + driftCheck.out.slice(-300));
check('I2 message : « Registre non à jour » + entrée nommée + commande de réparation',
  /Registre non à jour/.test(driftCheck.out) && driftCheck.out.includes(target.name) && /npm run generate-registry/.test(driftCheck.out),
  driftCheck.out.slice(-300));
check('I2 --check n\'écrit pas le registre', fs.readFileSync(registryPath(driftRoot), 'utf8') === before);

// I3 — le mode d'ecriture par defaut est inchange : il repare, puis --check passe.
const repair = run(driftRoot, []);
check('I3 mode par défaut → rc=0 et registre réécrit', repair.rc === 0
  && strip(fs.readFileSync(registryPath(driftRoot), 'utf8')) === strip(committedJson), 'rc=' + repair.rc);
check('I3 après réparation → --check rc=0', run(driftRoot, ['--check']).rc === 0);

// I4 — une classe citee en commentaire ne rattache pas un module : `.graph-toolbar`
// n'apparait dans layout.css que dans son commentaire d'en-tete.
const layoutCss = fs.readFileSync(path.join(CSS_SRC, 'layout.css'), 'utf8');
const layoutCode = layoutCss.replace(/\/\*[\s\S]*?\*\//g, ' ');
check('I4 garde-fou : .graph-toolbar cité dans un commentaire de layout.css, absent de son code',
  layoutCss.includes('.graph-toolbar') && !layoutCode.includes('.graph-toolbar'));
const graph = committed.components.find(c => c.name === 'graph');
check('I4 graph.module ne contient pas layout.css',
  !!graph && !(graph.module || []).includes('shared/css/layout.css'), JSON.stringify(graph && graph.module));

cleanup();

console.log('');
console.log(`${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
