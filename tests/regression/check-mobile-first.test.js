// Test de régression — issue #1023, tranche 3 (garde bin/check-mobile-first.js)
//
// Le garde refuse tout `@media` à borne HAUTE de largeur (max-width, ou plage
// `width < N`) dont la ligne du `{` ne porte pas `exception §4 : <raison>`
// (DS-PRINCIPLES §4). Ce test verrouille ses deux erreurs possibles :
//   - faux négatif : un max-width non motivé passe (prélude coupé sur deux lignes,
//     syntaxe de plage, casse, marqueur sans raison ou sur une autre ligne) ;
//   - faux positif : une exception légitime échoue (@container, commentaire
//     multi-lignes qui cite la requête, propriété `max-width:`, chaîne, borne basse).
//
// Trois niveaux :
//   A. CLI sur fixtures écrites dans un dossier temporaire (une règle = un fichier,
//      exit code + `fichier:ligne` sur stderr) ;
//   B. moteur scanSource() — numéros de ligne exacts derrière un commentaire multi-lignes ;
//   C. bout en bout sur une COPIE du vrai shared/css : le dépôt réel est propre (exit 0),
//      puis la mutation du CA5 — un max-width sans marqueur ajouté à lists.css, le marqueur
//      retiré de utilities.css — fait échouer le garde en nommant le fichier et la ligne.
//      La mutation vit dans la copie : le dépôt n'est jamais modifié.
//
// Lancer : npm run test:mobile-first

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const GUARD = path.join(REPO_ROOT, 'bin', 'check-mobile-first.js');
const { scanSource } = require(GUARD);

let pass = 0;
let fail = 0;
const ok = (label) => { pass++; console.log('  PASS: ' + label); };
const ko = (label, detail) => { fail++; console.error('  FAIL: ' + label + (detail ? ' — ' + detail : '')); };
const check = (label, cond, detail) => (cond ? ok(label) : ko(label, detail));

const tmps = [];
function tmpdir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'check-mobile-first-'));
  tmps.push(d);
  return d;
}
function cleanup() { for (const d of tmps) fs.rmSync(d, { recursive: true, force: true }); }

function run(args) {
  const r = spawnSync(process.execPath, [GUARD, ...args], { cwd: REPO_ROOT, encoding: 'utf8' });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

// Écrit `css` dans un fichier neuf et lance le garde dessus.
const dir = tmpdir();
let seq = 0;
function guard(css) {
  const file = path.join(dir, 'fixture-' + (++seq) + '.css');
  fs.writeFileSync(file, css);
  return { ...run([file]), file };
}

const MARK = '/* exception §4 : masquage sur une plage */';

// ─── A. CLI sur fixtures ─────────────────────────────────────────────────────

console.log('A. CLI — fixtures');

// A1 — faux négatifs : DOIVENT échouer (exit 1), et nommer fichier:ligne.
const bad = {
  'max-width sans marqueur': '.a { color: red; }\n@media (max-width: 500px) {\n  .a { color: blue; }\n}\n',
  'plage « width < N »': '@media (width < 500px) {\n  .a { color: blue; }\n}\n',
  'plage « width <= N »': '@media (width <= 500px) {\n  .a { color: blue; }\n}\n',
  'plage inversée « N > width »': '@media (500px > width) {\n  .a { color: blue; }\n}\n',
  'plage inversée « N >= width »': '@media (500px >= width) {\n  .a { color: blue; }\n}\n',
  'plage à deux bornes': '@media (400px < width < 700px) {\n  .a { color: blue; }\n}\n',
  'max-width combiné à un type de média': '@media screen and (max-width: 500px), print {\n  .a { color: blue; }\n}\n',
  'casse majuscule': '@MEDIA (MAX-WIDTH: 500px) {\n  .a { color: blue; }\n}\n',
  'max-device-width': '@media (max-device-width: 500px) {\n  .a { color: blue; }\n}\n',
  'prélude coupé sur deux lignes, sans marqueur': '@media screen and\n  (max-width: 500px) {\n  .a { color: blue; }\n}\n',
  'prélude coupé, marqueur sur la 1re ligne seulement': '@media screen and ' + MARK + '\n  (max-width: 500px) {\n  .a { color: blue; }\n}\n',
  'marqueur sur la ligne précédente': MARK + '\n@media (max-width: 500px) {\n  .a { color: blue; }\n}\n',
  'marqueur sans raison': '@media (max-width: 500px) { /* exception §4 : */\n  .a { color: blue; }\n}\n',
  'marqueur sans « : »': '@media (max-width: 500px) { /* exception §4 */\n  .a { color: blue; }\n}\n',
  'marqueur approximatif': '@media (max-width: 500px) { /* exception 4 : raison */\n  .a { color: blue; }\n}\n',
  '@media max-width imbriqué dans un @supports': '@supports (display: grid) {\n  @media (max-width: 500px) {\n    .a { color: blue; }\n  }\n}\n',
  '@media max-width imbriqué dans un @container': '@container (min-width: 300px) {\n  @media (max-width: 500px) {\n    .a { color: blue; }\n  }\n}\n',
};
for (const [label, css] of Object.entries(bad)) {
  const r = guard(css);
  check('refuse : ' + label, r.code === 1 && r.err.includes(path.basename(r.file) + ':'), 'exit ' + r.code + ' — ' + r.err.split('\n')[0]);
}

// A2 — faux positifs : DOIVENT passer (exit 0).
const good = {
  'max-width marqué avec une raison': '@media (max-width: 500px) { ' + '/* exception §4 : masquage sur une plage */' + '\n  .a { display: none; }\n}\n',
  'prélude coupé, marqueur sur la ligne du « { »': '@media screen and\n  (max-width: 500px) { ' + MARK + '\n  .a { display: none; }\n}\n',
  'plage « width < N » marquée': '@media (width < 500px) { ' + MARK + '\n  .a { display: none; }\n}\n',
  '@container (max-width) anonyme': '@container (max-width: 280px) {\n  .a { color: blue; }\n}\n',
  '@container (max-width) nommé': '@container card (max-width: 280px) {\n  .a { color: blue; }\n}\n',
  '@container « width < N »': '@container (width < 280px) {\n  .a { color: blue; }\n}\n',
  'min-width': '@media (min-width: 768.02px) { /* bp-md */\n  .a { color: blue; }\n}\n',
  'plage à borne basse « width >= N »': '@media (width >= 600px) {\n  .a { color: blue; }\n}\n',
  'plage à borne basse « N <= width »': '@media (600px <= width) {\n  .a { color: blue; }\n}\n',
  'plage à borne basse « N < width »': '@media (600px < width) {\n  .a { color: blue; }\n}\n',
  'préférences utilisateur': '@media (prefers-reduced-motion: reduce) {\n  .a { animation: none; }\n}\n@media (forced-colors: active) {\n  .a { border: 1px solid; }\n}\n',
  'max-width en propriété': '.a { max-width: 600px; }\n.b {\n  max-width: min(100%, 40rem);\n}\n',
  'commentaire multi-lignes qui cite la requête':
    '.a { color: red; }\n' +
    '/* Avant #1023 : @media (max-width: 768px) {\n' +
    '   .a { color: blue; }\n' +
    '   } réécrit en mobile-first, cf. @media (max-width:640px) aussi. */\n' +
    '.b { color: green; }\n',
  'commentaire sur une ligne qui cite la requête': '/* ancien @media (max-width: 500px) { } */\n.a { color: red; }\n',
  'chaîne qui cite la requête': '.a::before { content: "@media (max-width: 500px) {"; }\n.b::after { content: \'(max-width: 1px)\'; }\n',
  'fichier sans @media': '.a { color: red; }\n',
  'fichier vide': '',
};
for (const [label, css] of Object.entries(good)) {
  const r = guard(css);
  check('accepte : ' + label, r.code === 0, 'exit ' + r.code + ' — ' + r.err.split('\n')[0]);
}

// A3 — sortie : fichier:ligne exacts, toutes les violations listées.
{
  const r = guard(
    '.a { color: red; }\n' +                          // 1
    '/* commentaire\n' +                               // 2
    '   sur trois\n' +                                 // 3
    '   lignes */\n' +                                 // 4
    '@media (max-width: 500px) {\n' +                  // 5  ← violation
    '  .a { color: blue; }\n' +                        // 6
    '}\n' +                                            // 7
    '@media (max-width: 600px) { ' + MARK + '\n' +     // 8  ← marqué
    '  .a { color: blue; }\n' +                        // 9
    '}\n' +                                            // 10
    '@media screen and\n' +                            // 11 ← violation, @media ligne 11
    '  (max-width: 700px) {\n' +                       // 12    `{` ligne 12
    '  .a { color: blue; }\n' +                        // 13
    '}\n'
  );
  const base = path.basename(r.file);
  check('2 violations nommées, ligne de @media', r.code === 1 && r.err.includes(base + ':5:') && r.err.includes(base + ':11:'), r.err);
  check('la ligne marquée (8) n\'est pas signalée', !r.err.includes(base + ':8:'), r.err);
  check('prélude coupé : la ligne du « { » est indiquée', /ligne 12/.test(r.err), r.err);
  check('le message nomme la chaîne « exception §4 : »', r.err.includes('exception §4 :'), r.err);
}

// A4 — fail-closed.
{
  const missing = run([path.join(dir, 'n-existe-pas.css')]);
  check('chemin introuvable -> exit 1 (fail-closed)', missing.code === 1 && /introuvable/.test(missing.err), 'exit ' + missing.code);

  const emptyDir = tmpdir();
  const empty = run([emptyDir]);
  check('dossier sans .css -> exit 1 (portée vide, jamais [OK])', empty.code === 1 && !/\[OK\]/.test(empty.out), 'exit ' + empty.code + ' ' + empty.out);

  const open = guard('.a { color: red; }\n/* jamais fermé\n@media (max-width: 500px) { .a { color: blue; } }\n');
  check('commentaire non fermé -> exit 1 (la fin du fichier échapperait au contrôle)', open.code === 1 && /non fermé/.test(open.err), 'exit ' + open.code);
}

// A5 — un dossier est parcouru en récursif, un fichier non-.css d'un dossier est ignoré.
{
  const root = tmpdir();
  fs.mkdirSync(path.join(root, 'sub', 'deep'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ok.css'), '.a { color: red; }\n');
  fs.writeFileSync(path.join(root, 'sub', 'deep', 'bad.css'), '@media (max-width: 500px) {\n  .a { color: blue; }\n}\n');
  fs.writeFileSync(path.join(root, 'sub', 'notes.txt'), '@media (max-width: 500px) {');
  const r = run([root]);
  check('dossier : sous-dossier parcouru, violation nommée', r.code === 1 && r.err.includes('bad.css:1:'), r.err);
  check('dossier : le .txt n\'est pas scanné', !r.err.includes('notes.txt'), r.err);
}

// ─── B. Moteur — numéros de ligne ────────────────────────────────────────────

console.log('B. scanSource() — numéros de ligne');

{
  const src = '/* a\n b\n c */ .x { color: red; }\n@media (max-width: 1px) {}\n';
  const { queries, violations } = scanSource(src);
  check('ligne exacte derrière un commentaire de 3 lignes', violations.length === 1 && violations[0].line === 4, JSON.stringify(violations));
  check('1 requête recensée, 1 violation', queries.length === 1, String(queries.length));
}
{
  const { queries, violations } = scanSource('@media (max-width: 1px) { ' + MARK + '\n}\n@media (min-width: 1px) {\n}\n');
  check('recensement : 1 requête max-width marquée, 0 violation (le min-width n\'est pas recensé)', queries.length === 1 && violations.length === 0, JSON.stringify({ queries, violations }));
}
{
  const { error } = scanSource('.a {}\n\n/* ouvert');
  check('commentaire non fermé : erreur à la bonne ligne', error && error.line === 3, JSON.stringify(error));
}

// ─── C. Bout en bout sur une copie du vrai shared/css ────────────────────────

console.log('C. dépôt réel et mutation (CA5) sur une copie de shared/css');

{
  const real = run([]);
  check('le dépôt réel est propre (exit 0, portée par défaut)', real.code === 0 && /\[OK\]/.test(real.out), real.err + real.out);

  const copyRoot = tmpdir();
  const copy = path.join(copyRoot, 'css');
  fs.cpSync(path.join(REPO_ROOT, 'shared', 'css'), copy, { recursive: true });
  const clean = run([copy]);
  check('la copie intacte est propre (exit 0)', clean.code === 0, clean.err);

  // Mutation 1 : un max-width sans marqueur ajouté à lists.css.
  const lists = path.join(copy, 'components', 'lists.css');
  const before = fs.readFileSync(lists, 'utf8');
  const added = before.replace(/\n*$/, '\n') + '@media (max-width: 500px) { .x { color: red; } }\n';
  fs.writeFileSync(lists, added);
  const line = added.split('\n').findIndex((l) => l.startsWith('@media (max-width: 500px)')) + 1;
  const m1 = run([copy]);
  check('mutation 1 : max-width sans marqueur dans lists.css -> exit 1', m1.code === 1, 'exit ' + m1.code);
  check('mutation 1 : le garde nomme lists.css:' + line, m1.err.includes('lists.css:' + line + ':'), m1.err);

  // Mutation 2 : le même, avec le marqueur sur la même ligne -> accepté.
  fs.writeFileSync(lists, added.replace('{ .x { color: red; } }', '{ /* exception §4 : test */ .x { color: red; } }'));
  const m2 = run([copy]);
  check('mutation 2 : avec « exception §4 : test » sur la ligne -> exit 0', m2.code === 0, m2.err);
  fs.writeFileSync(lists, before);

  // Mutation 3 : le marqueur retiré de utilities.css (.hidden-mobile) -> refusé.
  const utils = path.join(copy, 'utilities.css');
  const uSrc = fs.readFileSync(utils, 'utf8');
  const uLines = uSrc.split('\n');
  const idx = uLines.findIndex((l) => /@media \(max-width: 767\.98px\)/.test(l));
  check('mutation 3 : la ligne .hidden-mobile existe encore dans utilities.css', idx >= 0, 'introuvable');
  if (idx >= 0) {
    uLines[idx] = uLines[idx].replace(/\/\*.*\*\//, '');
    fs.writeFileSync(utils, uLines.join('\n'));
    const m3 = run([copy]);
    check('mutation 3 : marqueur retiré de utilities.css -> exit 1, nomme utilities.css:' + (idx + 1), m3.code === 1 && m3.err.includes('utilities.css:' + (idx + 1) + ':'), m3.err);
  }
}

// ─── Bilan ───────────────────────────────────────────────────────────────────

cleanup();
console.log('\nRésultats : ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail > 0) process.exit(1);
console.log('Tous les tests OK');
