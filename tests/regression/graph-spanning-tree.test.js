// Test unitaire — shared/graph/lib/spanning-tree.js (#671, I4-1)
// Pur DOM-free : GraphModel + buildSpanningTree n'accedent jamais a `document`. Jumeau de
// tests/regression/graph-viewport.test.js pour le style (assertions maison, pas de framework).
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

function assertArrayEqual(actual, expected, msg) {
  const ok = Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  if (!ok) {
    console.error(`FAIL: ${msg} — attendu ${JSON.stringify(expected)}, recu ${JSON.stringify(actual)}`);
    FAILED++;
  }
}

function node(id) {
  return { data: { id, label: id } };
}

function edge(id, source, target) {
  return { data: { id, source, target, directed: true } };
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { GraphModel } = await import('../../shared/graph/model/index.js');
  const { buildSpanningTree } = await import('../../shared/graph/lib/spanning-tree.js');

  // ---- 1. Graphe simple (arbre parfait, deja acyclique) ----
  {
    const model = new GraphModel({
      nodes: [node('root'), node('a'), node('b'), node('a1'), node('a2')],
      edges: [edge('e1', 'root', 'a'), edge('e2', 'root', 'b'), edge('e3', 'a', 'a1'), edge('e4', 'a', 'a2')],
    });
    const tree = buildSpanningTree(model);
    assertArrayEqual(tree.roots, ['root'], '1. racine = 1er noeud du modele (pas de rootId fourni)');
    assertArrayEqual(tree.order, ['root', 'a', 'a1', 'a2', 'b'], '2. order = preordre DFS deterministe (voisins out-puis-in)');
    assertEqual(tree.parent.get('root'), null, '3. racine -> parent null');
    assertEqual(tree.parent.get('a'), 'root', '4. parent(a) = root');
    assertEqual(tree.parent.get('a1'), 'a', '5. parent(a1) = a');
    assertArrayEqual(tree.children.get('root'), ['a', 'b'], '6. children(root) dans l ordre de decouverte');
    assertArrayEqual(tree.children.get('a'), ['a1', 'a2'], '7. children(a) dans l ordre de decouverte');
    assertArrayEqual(tree.children.get('a1'), [], '8. feuille -> children = []');
  }

  // ---- 2. rootId explicite ----
  {
    const model = new GraphModel({
      nodes: [node('root'), node('a'), node('b')],
      edges: [edge('e1', 'root', 'a'), edge('e2', 'a', 'b')],
    });
    const tree = buildSpanningTree(model, 'b');
    assertArrayEqual(tree.roots, ['b'], '9. rootId present dans le modele -> devient la racine');
    assertEqual(tree.parent.get('b'), null, '10. racine explicite -> parent null');
    assertArrayEqual(tree.order, ['b', 'a', 'root'], '11. DFS repart bien de la racine explicite');

    const treeFallback = buildSpanningTree(model, 'inexistant');
    assertArrayEqual(treeFallback.roots, ['root'], '12. rootId absent du modele -> fallback model.nodes[0]');
  }

  // ---- 3. graphe CYCLIQUE : couverture totale, aucun cycle dans l arbre resultant ----
  {
    const model = new GraphModel({
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a'), edge('e4', 'c', 'd')],
    });
    const tree = buildSpanningTree(model);
    assertEqual(tree.order.length, 4, '13. cycle a->b->c->a : order couvre les 4 noeuds (pas de boucle infinie)');
    assertArrayEqual([...tree.order].sort(), ['a', 'b', 'c', 'd'], '14. cycle : order = TOUS les noeuds, une seule fois chacun');
    assertEqual(tree.parent.get('a'), null, '15. cycle : a = racine (1er noeud du modele) -> parent null');
    assertEqual(tree.parent.get('c'), 'b', '16. cycle : lien retour c->a NON retenu (a deja visite) -> parent(c)=b');
    assertTrue(!(tree.children.get('c') || []).includes('a'), '17. cycle : aucun lien c->a dans l arbre (casserait l acyclicite)');
    // chaque noeud (hors racine) a EXACTEMENT 1 parent -> verifie via l unicite de children
    const allChildren = [...tree.children.values()].flat();
    const seen = new Set();
    let duplicated = false;
    allChildren.forEach((id) => {
      if (seen.has(id)) duplicated = true;
      seen.add(id);
    });
    assertTrue(!duplicated, '18. cycle : aucun noeud n apparait 2x dans les children (1 seul parent chacun)');
  }

  // ---- 4. graphe DISJOINT (composants separes) -> foret ----
  {
    const model = new GraphModel({
      nodes: [node('a'), node('b'), node('x'), node('y'), node('z')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'x', 'y'), edge('e3', 'y', 'z')],
    });
    const tree = buildSpanningTree(model);
    assertArrayEqual(tree.roots, ['a', 'x'], '19. disjoint : 2 composants -> 2 racines, ordre = model.nodes');
    assertEqual(tree.parent.get('a'), null, '20. disjoint : racine composant 1 -> parent null');
    assertEqual(tree.parent.get('x'), null, '21. disjoint : racine composant 2 -> parent null');
    assertArrayEqual(tree.order, ['a', 'b', 'x', 'y', 'z'], '22. disjoint : order couvre les 2 composants, dans l ordre des racines');
    assertEqual(tree.order.length, model.nodeCount, '23. disjoint : order couvre 100% des noeuds du modele');
  }

  // ---- 5. determinisme : meme modele -> meme sortie (2 appels independants) ----
  {
    const buildModel = () =>
      new GraphModel({
        nodes: [node('r'), node('a'), node('b'), node('c')],
        edges: [edge('e1', 'r', 'a'), edge('e2', 'r', 'b'), edge('e3', 'b', 'c'), edge('e4', 'c', 'a')],
      });
    const t1 = buildSpanningTree(buildModel());
    const t2 = buildSpanningTree(buildModel());
    assertArrayEqual(t1.order, t2.order, '24. determinisme : order identique sur 2 modeles equivalents');
    assertArrayEqual(t1.roots, t2.roots, '25. determinisme : roots identiques sur 2 modeles equivalents');
    assertEqual(t1.parent.get('c'), t2.parent.get('c'), '26. determinisme : meme parent assigne (cycle e4 c->a resolu pareil)');
  }

  // ---- 6. modele vide ----
  {
    const model = new GraphModel({ nodes: [], edges: [] });
    const tree = buildSpanningTree(model);
    assertArrayEqual(tree.order, [], '27. modele vide -> order vide');
    assertArrayEqual(tree.roots, [], '28. modele vide -> roots vide');
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-spanning-tree passes (determinisme/couverture/foret/cycles)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
