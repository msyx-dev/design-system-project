// Test de non-regression — issue #645
// Verifie bin/generate-version-notes.js : idempotence, mode --check (OK / drift /
// bloc absent), ecriture strictement cantonnee aux marqueurs, et validation du
// schema shared/version-notes.json (enum type, dates ISO, versions sans "v",
// ordre recent-d'abord).
//
// Modele : tests/regression/nav-js-syntax.test.js (script Node autonome, exit 1
// si un cas echoue). Les cas generateur/schema operent sur des copies temporaires
// (fixture bin/ + shared/), jamais sur le repo reel (sauf le sanity check final
// qui reutilise shared/version-notes.json reel en lecture seule via --check).
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const GENERATOR_SRC = path.join(REPO_ROOT, 'bin', 'generate-version-notes.js');

const MARKER_START = '/* AUTO-GENERATED VERSION NOTES START — ne pas éditer à la main (bin/generate-version-notes.js) */';
const MARKER_END = '/* AUTO-GENERATED VERSION NOTES END */';

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

// ─── Fixture harness ────────────────────────────────────────────────────────

const NAV_JS_FIXTURE = [
  "// Fixture minimale — mime la forme reelle de shared/nav.js",
  "const VERSION = '9.9.9';",
  '',
  '// Current scroll spy observer (so we can disconnect on page swap)',
  'let scrollSpyObserver = null;',
  '',
  'function buildHeader() {',
  "    return 'ok';",
  '}',
  '',
].join('\n');

/**
 * Cree une copie temp isolee : bin/generate-version-notes.js (script reel copie)
 * + shared/nav.js (fixture) + shared/version-notes.json (donnees fournies).
 * @param {object} notesData
 * @returns {string} chemin racine du fixture
 */
function makeFixture(notesData) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-version-notes-test-'));
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(root, 'shared'), { recursive: true });
  fs.copyFileSync(GENERATOR_SRC, path.join(root, 'bin', 'generate-version-notes.js'));
  fs.writeFileSync(path.join(root, 'shared', 'nav.js'), NAV_JS_FIXTURE, 'utf8');
  fs.writeFileSync(path.join(root, 'shared', 'version-notes.json'), JSON.stringify(notesData, null, 2), 'utf8');
  return root;
}

/**
 * Lance le generateur (copie fixture) avec les args donnes.
 * @returns {{status: number, stdout: string, stderr: string}}
 */
function runGenerator(root, args) {
  const res = spawnSync(process.execPath, [path.join(root, 'bin', 'generate-version-notes.js')].concat(args || []), {
    encoding: 'utf8',
  });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function readNavJs(root) {
  return fs.readFileSync(path.join(root, 'shared', 'nav.js'), 'utf8');
}

function writeNotesJson(root, data) {
  fs.writeFileSync(path.join(root, 'shared', 'version-notes.json'), JSON.stringify(data, null, 2), 'utf8');
}

function extractBlock(navJs) {
  const s = navJs.indexOf(MARKER_START);
  const e = navJs.indexOf(MARKER_END);
  if (s === -1 || e === -1) return null;
  return navJs.slice(s, e + MARKER_END.length);
}

// Jeu de donnees valide minimal, reutilise pour les cas positifs.
function validSeed() {
  return {
    next: { highlights: [] },
    released: [
      {
        version: '1.2.0',
        date: '2026-01-02',
        titre: 'Titre A',
        highlights: [{ type: 'nouveaute', text: 'Un texte de bénéfice court.' }],
      },
      {
        version: '1.1.0',
        date: '2026-01-01',
        titre: 'Titre B',
        highlights: [{ type: 'correction', text: 'Un correctif utile.' }],
      },
    ],
  };
}

// ─── (a) Idempotence + --check ──────────────────────────────────────────────

(function testIdempotenceAndCheck() {
  console.log('Test A — idempotence + --check OK...');
  const root = makeFixture(validSeed());

  const run1 = runGenerator(root, []);
  if (run1.status !== 0) { ko('generation initiale doit reussir', run1.stderr); return; }
  const nav1 = readNavJs(root);
  const block1 = extractBlock(nav1);
  if (!block1) { ko('bloc AUTO-GENERATED absent apres 1re generation'); return; }

  const run2 = runGenerator(root, []);
  if (run2.status !== 0) { ko('2e generation doit reussir', run2.stderr); return; }
  const nav2 = readNavJs(root);
  const block2 = extractBlock(nav2);

  if (block1 === block2 && nav1 === nav2) {
    ok('idempotence — 2e run = 0 diff (byte-for-byte)');
  } else {
    ko('idempotence KO — le bloc ou le fichier diverge entre 2 runs');
  }

  const check1 = runGenerator(root, ['--check']);
  if (check1.status === 0) {
    ok('--check OK apres generation (exit 0)');
  } else {
    ko('--check aurait du reussir juste apres generation', check1.stderr);
  }
})();

// ─── (b) --check drift ──────────────────────────────────────────────────────

(function testCheckDrift() {
  console.log('Test B — --check detecte le drift...');
  const root = makeFixture(validSeed());
  runGenerator(root, []); // genere une 1re fois

  const mutated = validSeed();
  mutated.released[0].titre = 'Titre A modifie sans regeneration';
  writeNotesJson(root, mutated);

  const check = runGenerator(root, ['--check']);
  if (check.status !== 0) {
    ok('--check echoue (exit != 0) apres mutation du JSON sans regeneration');
  } else {
    ko('--check aurait du echouer sur un JSON muté sans régénération');
  }
})();

// ─── (c) --check bloc absent ────────────────────────────────────────────────

(function testCheckBlockAbsent() {
  console.log('Test C — --check sur nav.js sans marqueurs...');
  const root = makeFixture(validSeed());
  // Aucune generation prealable — nav.js fixture ne contient pas les marqueurs.
  const check = runGenerator(root, ['--check']);
  if (check.status !== 0 && /absent/i.test(check.stderr)) {
    ok('--check echoue avec message d\'initialisation quand le bloc est absent');
  } else {
    ko('--check aurait du echouer avec un message explicite (bloc absent)', check.stderr);
  }
})();

// ─── (d) Le generateur n'ecrit rien hors des marqueurs ──────────────────────

(function testWritesOnlyInsideMarkers() {
  console.log('Test D — ecriture cantonnee aux marqueurs...');
  const root = makeFixture(validSeed());
  const run1 = runGenerator(root, []);
  if (run1.status !== 0) { ko('generation initiale doit reussir', run1.stderr); return; }
  const nav1 = readNavJs(root);
  const s1 = nav1.indexOf(MARKER_START);
  const e1 = nav1.indexOf(MARKER_END) + MARKER_END.length;
  const before1 = nav1.slice(0, s1);
  const after1 = nav1.slice(e1);

  // Regenere avec des donnees differentes (titre + version + date changes).
  const mutated = validSeed();
  mutated.released.unshift({
    version: '1.3.0',
    date: '2026-01-03',
    titre: 'Titre C',
    highlights: [{ type: 'securite', text: 'Un correctif de securite.' }],
  });
  writeNotesJson(root, mutated);
  const run2 = runGenerator(root, []);
  if (run2.status !== 0) { ko('2e generation (donnees mutees) doit reussir', run2.stderr); return; }
  const nav2 = readNavJs(root);
  const s2 = nav2.indexOf(MARKER_START);
  const e2 = nav2.indexOf(MARKER_END) + MARKER_END.length;
  const before2 = nav2.slice(0, s2);
  const after2 = nav2.slice(e2);

  if (before1 === before2 && after1 === after2) {
    ok('le contenu hors marqueurs est strictement identique avant/apres regeneration');
  } else {
    ko('le generateur a modifie du contenu hors des marqueurs AUTO-GENERATED');
  }
})();

// ─── (e) Validation du schema — cas invalides (exit 1 attendu) ─────────────

(function testSchemaValidationInvalidCases() {
  console.log('Test E — validation du schema (cas invalides -> exit 1)...');

  const cases = [
    {
      label: 'type hors enum',
      mutate: (d) => { d.released[0].highlights[0].type = 'inconnu'; },
    },
    {
      label: 'date non ISO',
      mutate: (d) => { d.released[0].date = '02/01/2026'; },
    },
    {
      label: 'version avec prefixe v',
      mutate: (d) => { d.released[0].version = 'v1.2.0'; },
    },
    {
      label: 'version non X.Y.Z',
      mutate: (d) => { d.released[0].version = '1.2'; },
    },
    {
      label: 'released non ordonne (recent-d\'abord viole)',
      mutate: (d) => { d.released[0].date = '2020-01-01'; d.released[1].date = '2026-06-01'; },
    },
    {
      label: 'titre vide',
      mutate: (d) => { d.released[0].titre = '   '; },
    },
    {
      label: 'text de highlight vide',
      mutate: (d) => { d.released[0].highlights[0].text = ''; },
    },
    {
      label: 'highlights vide',
      mutate: (d) => { d.released[0].highlights = []; },
    },
    {
      label: 'next.highlights non-tableau',
      mutate: (d) => { d.next.highlights = 'oups'; },
    },
  ];

  cases.forEach(function (c) {
    const data = validSeed();
    c.mutate(data);
    const root = makeFixture(data);
    const run = runGenerator(root, []);
    if (run.status !== 0) {
      ok('rejet — ' + c.label);
    } else {
      ko('aurait du rejeter — ' + c.label);
    }
  });
})();

// ─── (f) Seed valide -> exit 0 ──────────────────────────────────────────────

(function testValidSeedExitsZero() {
  console.log('Test F — seed valide -> exit 0...');
  const root = makeFixture(validSeed());
  const run = runGenerator(root, []);
  if (run.status === 0) {
    ok('seed minimal valide -> generation exit 0');
  } else {
    ko('le seed minimal valide aurait du reussir', run.stderr);
  }
})();

// ─── (g) Sanity check repo reel : shared/version-notes.json + shared/nav.js ─

(function testRealRepoCheckPasses() {
  console.log('Test G — sanity repo reel (node bin/generate-version-notes.js --check)...');
  const res = spawnSync(process.execPath, [GENERATOR_SRC, '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (res.status === 0) {
    ok('repo reel — VERSION_NOTES a jour dans shared/nav.js (--check exit 0)');
  } else {
    ko('repo reel — --check devrait reussir (shared/version-notes.json inline et a jour)', res.stderr);
  }
})();

// ─── Bilan ───────────────────────────────────────────────────────────────────

console.log('\n' + pass + ' passed, ' + fail + ' failed.');
if (fail > 0) {
  console.error('FAIL: generate-version-notes.test.js — ' + fail + ' cas en echec.');
  process.exit(1);
}
console.log('OK: generate-version-notes.test.js — tous les cas passent (#645).');
process.exit(0);
