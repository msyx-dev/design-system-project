// Test unitaire — shared/graph/layout/{radial,detect,auto} (#669, I3-1)
// Jumeau DOM-free de tests/regression/graph-layout.test.js. AUCUN stub `document` : si
// un document.* s'y glissait, ce fichier planterait (ReferenceError).
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

function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL: ${msg} — attendu ${e}, recu ${a}`);
    FAILED++;
  }
}

function assertClose(actual, expected, tolerance, msg) {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`FAIL: ${msg} — attendu ~${expected} (±${tolerance}), recu ${actual}`);
    FAILED++;
  }
}

function mapToObj(map) {
  const o = {};
  map.forEach((v, k) => {
    o[k] = v;
  });
  return o;
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { GraphModel } = await import('../../shared/graph/model/index.js');
  const { radialLayout } = await import('../../shared/graph/layout/radial.js');
  const { detectLayout } = await import('../../shared/graph/layout/detect.js');
  const { autoLayout } = await import('../../shared/graph/layout/auto.js');
  const { resolveLayout, hasLayout, treeLayout, registerLayout } = await import('../../shared/graph/layout/index.js');

  const mindmapSizes = () =>
    new Map([
      ['c', { w: 120, h: 44 }],
      ['a', { w: 110, h: 40 }],
      ['b', { w: 110, h: 40 }],
      ['a1', { w: 100, h: 36 }],
      ['a2', { w: 100, h: 36 }],
    ]);

  const buildMindmap = () =>
    new GraphModel({
      nodes: [
        { data: { id: 'c' } },
        { data: { id: 'a' } },
        { data: { id: 'b' } },
        { data: { id: 'a1' } },
        { data: { id: 'a2' } },
      ],
      edges: [
        { data: { id: 'r1', source: 'c', target: 'a', directed: true } },
        { data: { id: 'r2', source: 'c', target: 'b', directed: true } },
        { data: { id: 'r3', source: 'a', target: 'a1', directed: true } },
        { data: { id: 'r4', source: 'a', target: 'a2', directed: true } },
      ],
    });

  // ---- radial.js : determinisme ----
  {
    const sizes = mindmapSizes();
    const pos1 = radialLayout(buildMindmap(), { sizes });
    const pos2 = radialLayout(buildMindmap(), { sizes });
    assertDeepEqual(mapToObj(pos1), mapToObj(pos2), '1. radial deterministe : memes entrees+sizes -> meme Map');
  }

  // ---- radial.js : racine au centre ----
  {
    const sizes = mindmapSizes();
    const pos = radialLayout(buildMindmap(), { sizes });
    const root = pos.get('c');
    assertClose(root.x, 0, 0.001, '2. radial : racine centree sur x=0');
    assertClose(root.y, 0, 0.001, '3. radial : racine centree sur y=0');
  }

  // ---- radial.js : profondeur -> rayon croissant ----
  {
    const sizes = mindmapSizes();
    const pos = radialLayout(buildMindmap(), { sizes });
    const rRoot = Math.hypot(pos.get('c').x, pos.get('c').y);
    const rChild = Math.hypot(pos.get('a').x, pos.get('a').y);
    const rGrandchild = Math.hypot(pos.get('a1').x, pos.get('a1').y);
    assertTrue(rChild > rRoot, '4. radial : rayon enfant > rayon racine');
    assertTrue(rGrandchild > rChild, '5. radial : rayon petit-enfant > rayon enfant');
  }

  // ---- radial.js : 2 enfants -> angles/positions distincts, pas de superposition ----
  {
    const sizes = mindmapSizes();
    const pos = radialLayout(buildMindmap(), { sizes });
    const a = pos.get('a');
    const b = pos.get('b');
    assertTrue(a.x !== b.x || a.y !== b.y, '6. radial : deux enfants -> positions distinctes (pas de superposition)');
    const a1 = pos.get('a1');
    const a2 = pos.get('a2');
    assertTrue(a1.x !== a2.x || a1.y !== a2.y, '7. radial : deux petits-enfants -> positions distinctes');
  }

  // ---- radial.js : cycle pur -> termine, couverture totale (racine de secours) ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'x' } }, { data: { id: 'y' } }, { data: { id: 'z' } }],
      edges: [
        { data: { id: 'e1', source: 'x', target: 'y', directed: true } },
        { data: { id: 'e2', source: 'y', target: 'z', directed: true } },
        { data: { id: 'e3', source: 'z', target: 'x', directed: true } }, // cycle pur
      ],
    });
    const start = Date.now();
    const pos = radialLayout(m, {});
    const elapsed = Date.now() - start;
    assertTrue(elapsed < 1000, '8. radial cycle pur : termine rapidement (garde anti-cycle effective)');
    assertEqual(pos.size, 3, '9. radial cycle pur : les 3 noeuds recoivent quand meme une position');
  }

  // ---- radial.js : foret (multi-racines) -> toutes positionnees ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'r1' } }, { data: { id: 'r2' } }, { data: { id: 'leaf' } }],
      edges: [{ data: { id: 'e1', source: 'r2', target: 'leaf', directed: true } }],
    });
    const pos = radialLayout(m, {});
    assertTrue(pos.has('r1') && pos.has('r2') && pos.has('leaf'), '10. radial foret : toutes les racines + enfants positionnes');
  }

  // ---- detectLayout ----
  {
    // arbre 1-racine acyclique -> 'tree'
    const tree = new GraphModel({
      nodes: [{ data: { id: 'root' } }, { data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [
        { data: { id: 'e1', source: 'root', target: 'a', directed: true } },
        { data: { id: 'e2', source: 'root', target: 'b', directed: true } },
      ],
    });
    assertEqual(detectLayout(tree), 'tree', "11. detectLayout : arbre 1-racine acyclique -> 'tree'");

    // DAG 2-racines acyclique -> 'layered'
    const dag = new GraphModel({
      nodes: [{ data: { id: 'r1' } }, { data: { id: 'r2' } }, { data: { id: 'leaf' } }],
      edges: [
        { data: { id: 'e1', source: 'r1', target: 'leaf', directed: true } },
        { data: { id: 'e2', source: 'r2', target: 'leaf', directed: true } },
      ],
    });
    assertEqual(detectLayout(dag), 'layered', "12. detectLayout : DAG multi-racines -> 'layered'");

    // cycle -> 'layered'
    const cyclic = new GraphModel({
      nodes: [{ data: { id: 'x' } }, { data: { id: 'y' } }],
      edges: [
        { data: { id: 'e1', source: 'x', target: 'y', directed: true } },
        { data: { id: 'e2', source: 'y', target: 'x', directed: true } },
      ],
    });
    assertEqual(detectLayout(cyclic), 'layered', "13. detectLayout : cyclique -> 'layered'");

    // graphe vide -> 'fixed'
    const empty = new GraphModel({ nodes: [], edges: [] });
    assertEqual(detectLayout(empty), 'fixed', "14. detectLayout : graphe vide -> 'fixed'");
  }

  // ---- autoLayout : degradation coord-free-safe (layered absent) ----
  {
    // DAG multi-racines -> detectLayout cible 'layered', absent du registre dans ce
    // process de test -> autoLayout doit degrader vers 'tree' (jamais de Promise, aucune
    // coordonnee requise -> preuve d'independance vis-a-vis de #670).
    assertTrue(!hasLayout('layered'), "15. pre-requis test : 'layered' non enregistre (independance #670)");
    const dag = new GraphModel({
      nodes: [{ data: { id: 'r1' } }, { data: { id: 'r2' } }, { data: { id: 'leaf' } }],
      edges: [
        { data: { id: 'e1', source: 'r1', target: 'leaf', directed: true } },
        { data: { id: 'e2', source: 'r2', target: 'leaf', directed: true } },
      ],
    });
    const result = autoLayout(dag, {});
    assertTrue(!(result instanceof Promise), '16. autoLayout : ne renvoie jamais de Promise (sync tant que layered absent)');
    assertEqual(result.size, dag.nodeCount, '17. autoLayout : DAG multi-racines quand meme integralement positionne (degrade tree)');
  }

  // ---- autoLayout : arbre 1-racine -> route bien vers tree (positions identiques) ----
  {
    const build = () =>
      new GraphModel({
        nodes: [{ data: { id: 'root' } }, { data: { id: 'a' } }],
        edges: [{ data: { id: 'e1', source: 'root', target: 'a', directed: true } }],
      });
    const sizes = new Map([
      ['root', { w: 100, h: 40 }],
      ['a', { w: 100, h: 40 }],
    ]);
    const autoPos = autoLayout(build(), { sizes });
    const treePos = treeLayout(build(), { sizes });
    assertDeepEqual(mapToObj(autoPos), mapToObj(treePos), "18. autoLayout : arbre 1-racine -> memes positions que resolveLayout('tree') direct");
  }

  // ---- resolveLayout / hasLayout ----
  {
    assertTrue(resolveLayout('radial') === radialLayout, "19. resolveLayout('radial') retrouve radialLayout");
    assertTrue(resolveLayout('auto') !== undefined, "20. resolveLayout('auto') retrouve une fonction");
    assertTrue(hasLayout('radial') === true, "21. hasLayout('radial') === true");
    assertTrue(hasLayout('tree') === true, "22. hasLayout('tree') === true");
    assertTrue(hasLayout('inconnu') === false, "23. hasLayout('inconnu') === false");
  }

  // ---- autoLayout : une fois 'layered' enregistre (simulation post-#670), route dessus ----
  {
    let layeredCalled = false;
    registerLayout('layered', (model) => {
      layeredCalled = true;
      const pos = new Map();
      model.nodes.forEach((n, i) => pos.set(n.data.id, { x: i * 10, y: 0 }));
      return pos;
    });
    assertTrue(hasLayout('layered'), "24. hasLayout('layered') === true apres registerLayout simule");
    const dag = new GraphModel({
      nodes: [{ data: { id: 'r1' } }, { data: { id: 'r2' } }, { data: { id: 'leaf' } }],
      edges: [
        { data: { id: 'e1', source: 'r1', target: 'leaf', directed: true } },
        { data: { id: 'e2', source: 'r2', target: 'leaf', directed: true } },
      ],
    });
    autoLayout(dag, {});
    assertTrue(layeredCalled, "25. autoLayout : une fois 'layered' enregistre, DAG multi-racines route dessus (plus de degradation)");
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-layout-radial passes (radial/detect/auto/hasLayout)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
