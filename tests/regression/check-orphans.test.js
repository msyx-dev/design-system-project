// Test de fumee — issue #938, tranche 2 (passe « orphelins »)
// Verifie bin/lib/check-orphans.js (scanOrphans + CLI) et son branchement dans
// shared/check-components.sh (drapeau opt-in --orphans=).
//
// Ce n'est PAS la batterie complete de la tranche 3 (tests/test-check-components.sh,
// cas A a I sur consommateurs synchronises par le vrai sync.sh) : c'est le minimum
// qui rend la tranche 2 verifiable seule, une assertion par regle du moteur, chacune
// rattachee a une mutation (cf. la colonne « mutation » de chaque cas).
//
// Deux niveaux :
//   A. moteur — scanOrphans() sur un registre SYNTHETIQUE (fixture minimale, aucune
//      dependance au contenu du registre reel ni a sync.sh) ;
//   B. bout en bout — le VRAI check-components.sh + le VRAI registre, sur un
//      consommateur reduit a deux fichiers CSS ; ne dépend que de `version-notes` et
//      `site-header` (les deux entrees structurelles, validees par --check).
//
// Lancer : npm run test:check-orphans

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const ENGINE = path.join(REPO_ROOT, 'bin', 'lib', 'check-orphans.js');
const SCRIPT = path.join(REPO_ROOT, 'shared', 'check-components.sh');
const { scanOrphans } = require(ENGINE);

let pass = 0;
let fail = 0;
const ok = (label) => { pass++; console.log('  PASS: ' + label); };
const ko = (label, detail) => { fail++; console.error('  FAIL: ' + label + (detail ? ' — ' + detail : '')); };
const check = (label, cond, detail) => (cond ? ok(label) : ko(label, detail));

const tmps = [];
function tmpdir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'check-orphans-'));
  tmps.push(d);
  return d;
}
function write(root, rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function cleanup() { for (const d of tmps) fs.rmSync(d, { recursive: true, force: true }); }

// ─── A. Moteur sur registre synthetique ──────────────────────────────────────

console.log('A. scanOrphans() — registre synthetique');

const registry = {
  components: [
    { name: 'alpha', kind: 'component', react: 'ported', reactExports: ['AlphaThing'], cssClasses: ['.alpha'] },
    { name: 'beta', kind: 'component', react: 'ported', reactExports: ['BetaCompo'], cssClasses: ['.beta'] },
    { name: 'gamma', kind: 'component', cssClasses: ['.gamma'] },
    { name: 'delta', kind: 'component', cssClasses: ['.delta'] },
    { name: 'eps', kind: 'component', cssClasses: [] },
    { name: 'mod', kind: 'module', cssClasses: ['.mod'] },
    { name: 'theta', kind: 'component', react: 'ported', reactExports: ['ThetaBox'], cssClasses: ['.theta'] },
    { name: 'iota', kind: 'component', cssClasses: ['.shared', '.iota'] },
    { name: 'kappa', kind: 'component', cssClasses: ['.shared', '.kappa'] },
    { name: 'lambda', kind: 'component', structural: true, cssClasses: ['.lambda'] },
    { name: 'zeta', kind: 'component', structural: true, cssClasses: ['.zeta'] },
    { name: 'nu', kind: 'component', cssClasses: ['.nu-shell'] },
  ],
};

function makeConsumer({ shellReferenced }) {
  const root = tmpdir();
  const css = path.join(root, 'src', 'styles');
  // .delta n'apparait que dans un commentaire CSS : jamais « livre ».
  write(css, 'ds-all.css',
    '.alpha{} .beta{} .gamma{} .theta{} .shared{} .iota{} .kappa{} .lambda{} .zeta{} .nu-shell{}\n' +
    '/* .delta{} */\n');
  write(css, 'ds-nav.js', 'el.className = "nu-shell";\n');
  write(root, 'src/a.tsx', 'import {\n  AlphaThing as A,\n  type Nope,\n} from "@msyx-dev/react";\n');
  write(root, 'src/b.tsx', 'export const B = () => <Host betaCompo={{ x: 1 }} />;\n');
  write(root, 'src/gamma.test.tsx', 'const c = "gamma";\n'); // tests exclus du corpus
  write(root, 'src/t.tsx', 'import type { ThetaBox } from "@msyx-dev/react";\n');
  write(root, 'src/shared.tsx', 'const s = "shared";\n'); // classe non discriminante
  write(root, 'index.html', shellReferenced ? '<script src="/styles/ds-nav.js"></script>\n' : '<p>rien</p>\n');
  return { css, src: root };
}

const allow = '# commentaire\norphelin:zeta   # justifie : header assume hors DS\n';
const withShell = makeConsumer({ shellReferenced: true });
const R1 = scanOrphans({ registry, cssDir: withShell.css, srcDir: withShell.src, allowlist: allow });
const st = (res, name) => (res.entries.find((e) => e.name === name) || {}).status;

check('A1 S2 : import { AlphaThing as A } multi-ligne → consommée', st(R1, 'alpha') === 'consommee', st(R1, 'alpha'));
check('A2 S3 : `betaCompo={` → consommée (prop de composition homonyme lowerCamel)', st(R1, 'beta') === 'consommee', st(R1, 'beta'));
check('A3 tests exclus : `gamma` cité seulement dans *.test.tsx → orphelin', st(R1, 'gamma') === 'orphelin', st(R1, 'gamma'));
check('A4 import type { ThetaBox } ne compte pas → orphelin', st(R1, 'theta') === 'orphelin', st(R1, 'theta'));
check('A5 classes discriminantes : `.shared` seule ne consomme ni iota ni kappa',
  st(R1, 'iota') === 'orphelin' && st(R1, 'kappa') === 'orphelin', st(R1, 'iota') + '/' + st(R1, 'kappa'));
check('A6 classe définie seulement en commentaire CSS → non-livree', st(R1, 'delta') === 'non-livree', st(R1, 'delta'));
check('A7 aucune classe simple ni export → non-mesurable', st(R1, 'eps') === 'non-mesurable', st(R1, 'eps'));
check('A8 entrée kind:"module" exclue du périmètre', st(R1, 'mod') === undefined);
check('A9 structural non monté, sans allowlist → orphelin-structurel', st(R1, 'lambda') === 'orphelin-structurel', st(R1, 'lambda'));
check('A10 `orphelin:zeta` (commentaire # toléré) → accepte', st(R1, 'zeta') === 'accepte', st(R1, 'zeta'));
check('A11 S4 : ds-nav.js référencé par le corpus → `nu-shell` consommée', st(R1, 'nu') === 'consommee', st(R1, 'nu'));
check('A12 compteurs cohérents (livrées = consommées + orphelines + acceptées)',
  R1.counts.delivered === R1.counts.consumed + R1.counts.orphans + R1.counts.accepted &&
  R1.counts.structural === 1 && R1.counts.accepted === 1 && R1.counts.unmeasurable === 1 && R1.counts.undelivered === 1,
  JSON.stringify(R1.counts));

const noShell = makeConsumer({ shellReferenced: false });
const R2 = scanOrphans({ registry, cssDir: noShell.css, srcDir: noShell.src, allowlist: allow });
check('A13 S4 : ds-nav.js présent sur disque mais non référencé → `nu` orphelin', st(R2, 'nu') === 'orphelin', st(R2, 'nu'));
check('A14 garde-fou : la seule différence entre A11 et A13 est la balise',
  fs.existsSync(path.join(noShell.css, 'ds-nav.js')) && st(R1, 'nu') !== st(R2, 'nu'));

// ─── B. Bout en bout : check-components.sh --orphans= + registre reel ────────

console.log('B. check-components.sh --orphans= (registre réel, consommateur minimal)');

function makeRealConsumer({ versionNotesProp, extraCss }) {
  const root = tmpdir();
  const css = path.join(root, 'src', 'styles');
  // Classes reelles du registre : .site-header (site-header), .version-badge (version-notes).
  write(css, 'ds-layout.css', '.site-header{} .version-badge{}\n' + (extraCss || ''));
  write(root, 'src/AppHeader.tsx',
    'import { SiteHeader } from "@msyx-dev/react";\n' +
    (versionNotesProp
      ? 'export const H = () => <SiteHeader versionNotes={{ current: "1" }} />;\n'
      : 'export const H = () => <SiteHeader />;\n'));
  return { css, src: path.join(root, 'src'), root };
}

function run(args) {
  const r = spawnSync('bash', [SCRIPT, ...args], { encoding: 'utf8' });
  return { rc: r.status, out: r.stdout || '', err: r.stderr || '' };
}

{
  const c = makeRealConsumer({ versionNotesProp: false });
  const r = run([`--orphans=${c.src}`, c.css]);
  check('B1 SiteHeader sans versionNotes → rc=1, ORPHELIN-STRUCTUREL version-notes',
    r.rc === 1 && /^ORPHELIN-STRUCTUREL +version-notes /m.test(r.out), 'rc=' + r.rc + '\n' + r.out.slice(-600));
  check('B2 en-tête de section + verdict FAIL nommant le nombre',
    /^=== Passe orphelins \(#938\) ===$/m.test(r.out) && /^FAIL — 1 composant\(s\) structurant\(s\)/m.test(r.out), r.out.slice(-400));
  check('B3 site-header reste consommé (S2) : absent des lignes ORPHELIN*',
    !/^ORPHELIN\S* +site-header\b/m.test(r.out), r.out.slice(-600));

  const plain = run([c.css]);
  check('B4 SANS le drapeau : aucune section orphelins, rc=0 (CSS sans classe hors DS)',
    plain.rc === 0 && !/Passe orphelins/.test(plain.out), 'rc=' + plain.rc + '\n' + plain.out);

  write(c.css, '.ds-allowlist', '# header sans badge assumé (app interne)\norphelin:version-notes\n');
  const acc = run([`--orphans=${c.src}`, c.css]);
  check('B5 `orphelin:version-notes` → ORPHELIN-ACCEPTÉ, rc=0',
    acc.rc === 0 && /^ORPHELIN-ACCEPTÉ +version-notes\b/m.test(acc.out), 'rc=' + acc.rc + '\n' + acc.out.slice(-500));
}

{
  const c = makeRealConsumer({ versionNotesProp: true, extraCss: '.carousel{}\n' });
  const r = run([`--orphans=${c.src}`, c.css]);
  check('B6 S3 sur le vrai composant : `versionNotes={` → aucun ORPHELIN-STRUCTUREL',
    !/^ORPHELIN-STRUCTUREL/m.test(r.out), r.out.slice(-500));
  check('B7 un ORPHELIN informatif (carousel) ne change PAS le code retour (rc=0)',
    /^ORPHELIN +carousel /m.test(r.out) && r.rc === 0, 'rc=' + r.rc + '\n' + r.out.slice(-500));
}

{
  const c = makeRealConsumer({ versionNotesProp: true });
  const bad = run([`--orphans=${path.join(c.root, 'absent')}`, c.css]);
  check('B8 --orphans= vers un dossier inexistant → rc=1 et ERREUR sur stderr',
    bad.rc === 1 && /ERREUR/.test(bad.err), 'rc=' + bad.rc + ' ' + bad.err);
  const empty = tmpdir();
  const noCss = run([`--orphans=${c.src}`, empty]);
  check('B9 --orphans sans CSS local : la passe hors DS est sautée, la passe orphelins tourne',
    /aucun fichier CSS/.test(noCss.out) && /Passe orphelins/.test(noCss.out), 'rc=' + noCss.rc + '\n' + noCss.out);
}

cleanup();

console.log('');
console.log(`${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
