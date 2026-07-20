// Test unitaire — shared/graph/lib/edit-focus.js (#673, I5-1)
// Pur DOM-free : nextFocusAfterRemoval() n'accede jamais a `document`. Jumeau de style
// tests/regression/graph-spanning-tree.test.js.
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
  const { nextFocusAfterRemoval } = await import('../../shared/graph/lib/edit-focus.js');

  // ---- 1. voisin direct (arbre simple, un seul voisin) ----
  {
    const model = new GraphModel({
      nodes: [node('root'), node('a'), node('b')],
      edges: [edge('e1', 'root', 'a'), edge('e2', 'root', 'b')],
    });
    const tree = buildSpanningTree(model);
    assertEqual(nextFocusAfterRemoval(model, tree, 'a'), 'root', '1. voisin direct = root (seul voisin de a)');
  }

  // ---- 2. graphe CYCLIQUE : le voisin (branche 1) est prioritaire sur le parent de l'arbre (branche 2) ----
  {
    const model = new GraphModel({
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a'), edge('e4', 'c', 'd')],
    });
    const tree = buildSpanningTree(model);
    // Trace : DFS part de 'a' (1er noeud du modele) -> parent('c') = 'b' (cf. graph-spanning-tree.test.js #16).
    assertEqual(tree.parent.get('c'), 'b', '2a. sanity : arbre couvrant -> parent(c) = b (lien retour c->a non retenu)');
    // model.neighbors('c') : out (e3 c->a) puis (e4 c->d) => ['a','d'] ; in (e2 b->c) => +'b' => ['a','d','b'].
    assertEqual(model.neighbors('c')[0], 'a', "2b. sanity : model.neighbors('c')[0] = 'a' (via l'arete de retour e3)");
    assertEqual(
      nextFocusAfterRemoval(model, tree, 'c'),
      'a',
      "2c. cycle : nextFocusAfterRemoval retourne le 1er VOISIN ('a'), pas le parent de l'arbre ('b')"
    );
  }

  // ---- 3. auto-boucle : le noeud ne doit jamais devenir sa propre destination ----
  {
    const model = new GraphModel({
      nodes: [node('solo'), node('other')],
      edges: [edge('e1', 'solo', 'solo')],
    });
    const tree = buildSpanningTree(model);
    assertArrayIncludes(model.neighbors('solo'), 'solo', '3a. sanity : neighbors() brut d une auto-boucle contient bien le noeud lui-meme');
    const dest = nextFocusAfterRemoval(model, tree, 'solo');
    assertTrue(dest !== 'solo', '3b. auto-boucle filtree : la destination n est jamais le noeud lui-meme');
    assertEqual(dest, 'other', '3c. auto-boucle : neighbors filtre -> vide -> parent (racine, null) -> fallback order -> other');
  }

  // ---- 4. fallback PARENT (arbre synthetique, neighbors() vide — isole la branche 2) ----
  {
    const model = new GraphModel({ nodes: [node('isolated')], edges: [] });
    const tree = { parent: new Map([['isolated', 'ghost-parent']]), order: ['isolated'] };
    assertEqual(
      nextFocusAfterRemoval(model, tree, 'isolated'),
      'ghost-parent',
      '4. fallback parent utilise quand model.neighbors() est vide'
    );
  }

  // ---- 5. fallback ORDER (graphe SANS aretes -> ni voisin ni parent pour aucun noeud) ----
  {
    const model = new GraphModel({ nodes: [node('x'), node('y'), node('z')], edges: [] });
    const tree = buildSpanningTree(model); // 3 composants isoles -> x,y,z tous racines, parent=null chacun
    assertEqual(tree.parent.get('x'), null, '5a. sanity : x racine de son propre composant -> parent null');
    assertEqual(nextFocusAfterRemoval(model, tree, 'x'), 'y', '5b. fallback order : 1er noeud de tree.order different de x');
  }

  // ---- 6. graphe DISJOINT (composants separes) : suppression du noeud isole -> fallback order (autre composant) ----
  {
    const model = new GraphModel({
      nodes: [node('a'), node('b'), node('iso')],
      edges: [edge('e1', 'a', 'b')],
    });
    const tree = buildSpanningTree(model);
    assertEqual(tree.parent.get('iso'), null, '6a. sanity : iso isole -> racine de son propre composant');
    assertEqual(nextFocusAfterRemoval(model, tree, 'iso'), 'a', '6b. disjoint : noeud isole sans voisin/parent -> 1er de order != iso');
  }

  // ---- 7. graphe reduit a UN SEUL noeud -> aucune autre destination (null) ----
  {
    const model = new GraphModel({ nodes: [node('only')], edges: [] });
    const tree = buildSpanningTree(model);
    assertEqual(nextFocusAfterRemoval(model, tree, 'only'), null, '7. graphe a 1 seul noeud -> aucune destination (null)');
  }

  // ---- 8. modele vide (defensif) ----
  {
    const model = new GraphModel({ nodes: [], edges: [] });
    const tree = buildSpanningTree(model);
    assertEqual(nextFocusAfterRemoval(model, tree, 'inexistant'), null, '8. modele vide -> null (aucune destination)');
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-edit-focus passes (voisin/parent/order/null, cyclique/disjoint/auto-boucle)');
}

function assertArrayIncludes(arr, value, msg) {
  if (!Array.isArray(arr) || !arr.includes(value)) {
    console.error(`FAIL: ${msg} — attendu que ${JSON.stringify(arr)} contienne ${JSON.stringify(value)}`);
    FAILED++;
  }
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
