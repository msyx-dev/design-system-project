// Test unitaire — shared/graph/render/port-drop.js (#674, I5-2)
// Pur DOM-free : nearestNodeAt() n'accede jamais a `document`. Jumeau de style
// tests/regression/graph-edit-focus.test.js / tests/regression/graph-spanning-tree.test.js.
let FAILED = 0;

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    console.error(`FAIL: ${msg} — attendu ${JSON.stringify(expected)}, recu ${JSON.stringify(actual)}`);
    FAILED++;
  }
}

function assertTrue(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    FAILED++;
  }
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { nearestNodeAt } = await import('../../shared/graph/render/port-drop.js');

  // ---- 1. point dans l'AABB d'un seul noeud -> ce noeud ----
  {
    const positions = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 300, y: 0 }],
    ]);
    const sizes = new Map([
      ['a', { w: 100, h: 40 }],
      ['b', { w: 100, h: 40 }],
    ]);
    assertEqual(nearestNodeAt(positions, sizes, { x: 5, y: 5 }), 'a', '1a. point dans AABB(a) uniquement -> a');
    assertEqual(nearestNodeAt(positions, sizes, { x: 305, y: -5 }), 'b', '1b. point dans AABB(b) uniquement -> b');
  }

  // ---- 2. point hors de toute AABB -> null (drop hors noeud) ----
  {
    const positions = new Map([['a', { x: 0, y: 0 }]]);
    const sizes = new Map([['a', { w: 100, h: 40 }]]);
    assertEqual(nearestNodeAt(positions, sizes, { x: 1000, y: 1000 }), null, '2. point hors AABB -> null');
  }

  // ---- 3. chevauchement (2 AABB contiennent le point) -> centre le PLUS PROCHE gagne ----
  {
    const positions = new Map([
      ['near', { x: 0, y: 0 }],
      ['far', { x: 60, y: 0 }],
    ]);
    const sizes = new Map([
      ['near', { w: 200, h: 200 }], // AABB [-100,100]x[-100,100]
      ['far', { w: 200, h: 200 }], // AABB [-40,160]x[-100,100]
    ]);
    // point (10,0) : dans les DEUX AABB. dist(near)=10, dist(far)=50 -> near gagne.
    assertEqual(nearestNodeAt(positions, sizes, { x: 10, y: 0 }), 'near', '3a. chevauchement -> centre le plus proche (near)');
    // point (55,0) : dans les DEUX AABB. dist(near)=55, dist(far)=5 -> far gagne.
    assertEqual(nearestNodeAt(positions, sizes, { x: 55, y: 0 }), 'far', '3b. chevauchement -> centre le plus proche (far)');
  }

  // ---- 4. excludeId (le noeud source du drag) -> jamais retenu, meme si le point est dedans ----
  {
    const positions = new Map([['solo', { x: 0, y: 0 }]]);
    const sizes = new Map([['solo', { w: 100, h: 100 }]]);
    assertEqual(nearestNodeAt(positions, sizes, { x: 0, y: 0 }, 'solo'), null, '4. source exclue -> jamais sa propre cible (pas d\'auto-boucle)');
  }

  // ---- 5. excludeId avec un 2e noeud disponible -> retombe sur l'autre noeud ----
  {
    const positions = new Map([
      ['src', { x: 0, y: 0 }],
      ['dst', { x: 20, y: 0 }],
    ]);
    const sizes = new Map([
      ['src', { w: 200, h: 200 }],
      ['dst', { w: 200, h: 200 }],
    ]);
    assertEqual(nearestNodeAt(positions, sizes, { x: 5, y: 0 }, 'src'), 'dst', '5. source exclue -> retombe sur la seule autre cible valide');
  }

  // ---- 6. point exactement sur le bord de l'AABB (inclusif) ----
  {
    const positions = new Map([['a', { x: 0, y: 0 }]]);
    const sizes = new Map([['a', { w: 100, h: 40 }]]);
    assertEqual(nearestNodeAt(positions, sizes, { x: 50, y: 20 }), 'a', '6. point sur le bord exact de l\'AABB -> inclusif');
  }

  // ---- 7. tailles manquantes (defensif) -> pas de crash, node ignore si w/h absents (AABB nulle) ----
  {
    const positions = new Map([['a', { x: 0, y: 0 }]]);
    const sizes = new Map(); // pas d'entree pour 'a' -> fallback {w:0,h:0}
    assertEqual(nearestNodeAt(positions, sizes, { x: 0, y: 0 }), 'a', '7a. AABB nulle mais point exactement sur le centre -> match (bord inclusif)');
    assertEqual(nearestNodeAt(positions, sizes, { x: 1, y: 0 }), null, '7b. AABB nulle -> aucun point autour du centre ne matche');
  }

  // ---- 8. positions/point vides (defensif) ----
  {
    assertEqual(nearestNodeAt(new Map(), new Map(), { x: 0, y: 0 }), null, '8a. aucun noeud -> null');
    assertEqual(nearestNodeAt(null, null, { x: 0, y: 0 }), null, '8b. positions null -> null (pas de crash)');
    assertEqual(nearestNodeAt(new Map([['a', { x: 0, y: 0 }]]), new Map(), null), null, '8c. point null -> null (pas de crash)');
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-port-drop passes (AABB/chevauchement/exclusion source/defensif)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
