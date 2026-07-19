// Test unitaire — shared/graph/model (#665, I1b-1)
// Couvre GraphModel (CRUD atomique, index d'adjacence, invariants lenient
// console.warn, evenement 'graph:model:change') et toModel() (normalisation
// tolerante, jamais de throw). Refletele style de tests/regression/graph-lib.test.js
// (asserts maison, import() dynamique, node tests/regression/graph-model.test.js).
//
// AUCUN stub `document` : prouve l'absence d'acces DOM du modele — si un
// `document.*` s'y glissait, ce fichier planterait (ReferenceError). EventTarget
// et CustomEvent sont des globals Node 20, aucun jsdom requis.
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

const REAL_WARN = console.warn;
let warnCount = 0;

function captureWarnings() {
  warnCount = 0;
  console.warn = (...args) => {
    warnCount++;
  };
}

function restoreWarnings() {
  console.warn = REAL_WARN;
}

function listen(model) {
  const events = [];
  model.addEventListener('graph:model:change', (e) => events.push(e.detail));
  return events;
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { GraphModel, toModel } = await import('../../shared/graph/model/index.js');
  assertTrue(typeof toModel === 'function', 'toModel() est exporte par le barrel');
  assertTrue(GraphModel.prototype instanceof EventTarget, 'GraphModel extends EventTarget');

  // ---- 1. Round-trip idempotent ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [{ data: { id: 'e1', source: 'a', target: 'b' } }],
    });
    const json1 = m.toJSON();
    const m2 = new GraphModel(json1);
    const json2 = m2.toJSON();
    assertDeepEqual(json2, json1, '1. round-trip toJSON -> constructeur -> toJSON idempotent');
  }

  // ---- 2. Shape nu accepte ----
  {
    const m = new GraphModel({ nodes: [], edges: [] });
    assertEqual(m.schemaVersion, GraphModel.SCHEMA_VERSION, '2. shape nu -> schemaVersion = SCHEMA_VERSION');
    assertDeepEqual(m.meta, {}, '2. shape nu -> meta = {}');
  }

  // ---- 3. Id manquant en entree -> genere + warn ----
  {
    captureWarnings();
    const m = new GraphModel({ nodes: [{ data: {} }], edges: [] });
    restoreWarnings();
    assertEqual(m.nodeCount, 1, '3. id manquant -> noeud conserve avec id genere');
    assertTrue(warnCount >= 1, '3. id manquant -> console.warn appele');
    assertEqual(m.nodes[0].data.id, 'n0', '3. id manquant -> id genere "n0"');
  }

  // ---- 4. Arete pendante a la construction -> droppee + warn ----
  {
    captureWarnings();
    const m = new GraphModel({
      nodes: [{ data: { id: 'a' } }],
      edges: [{ data: { id: 'e1', source: 'a', target: 'zzz' } }],
    });
    restoreWarnings();
    assertEqual(m.edgeCount, 0, '4. arete pendante a la construction -> droppee');
    assertTrue(warnCount >= 1, '4. arete pendante -> console.warn appele');
  }

  // ---- 5. Id duplique a la construction (2 noeuds meme id) -> 2e droppe + warn ----
  {
    captureWarnings();
    const m = new GraphModel({
      nodes: [{ data: { id: 'a', label: 'first' } }, { data: { id: 'a', label: 'second' } }],
      edges: [],
    });
    restoreWarnings();
    assertEqual(m.nodeCount, 1, '5. id duplique -> 2e occurrence droppee');
    assertEqual(m.getNode('a').data.label, 'first', '5. id duplique -> 1re occurrence conservee');
    assertTrue(warnCount >= 1, '5. id duplique -> console.warn appele');
  }

  // ---- 6. addNode insere ; 1 event ; adjacency initialisee vide ----
  {
    const m = new GraphModel({ nodes: [], edges: [] });
    const events = listen(m);
    m.addNode({ data: { id: 'x' } });
    assertEqual(events.length, 1, '6. addNode -> 1 event');
    assertEqual(events[0].op, 'add-node', '6. addNode -> op add-node');
    assertEqual(events[0].node.data.id, 'x', '6. addNode -> detail.node correct');
    assertDeepEqual(m.adjacency.get('x'), { in: [], out: [] }, '6. addNode -> adjacency.get(id) = {in:[],out:[]}');
  }

  // ---- 7. addNode id dup -> no-op + warn + 0 event ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'x' } }], edges: [] });
    const events = listen(m);
    captureWarnings();
    m.addNode({ data: { id: 'x' } });
    restoreWarnings();
    assertEqual(events.length, 0, '7. addNode id dup -> 0 event');
    assertTrue(warnCount >= 1, '7. addNode id dup -> console.warn appele');
  }

  // ---- 8. addEdge valide -> outEdges/inEdges + event ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }], edges: [] });
    const events = listen(m);
    m.addEdge({ data: { id: 'e1', source: 'a', target: 'b' } });
    assertEqual(events.length, 1, '8. addEdge valide -> 1 event');
    assertEqual(events[0].op, 'add-edge', '8. addEdge valide -> op add-edge');
    assertEqual(m.outEdges('a').length, 1, '8. addEdge -> outEdges(source) contient l\'arete');
    assertEqual(m.inEdges('b').length, 1, '8. addEdge -> inEdges(target) contient l\'arete');
  }

  // ---- 9. addEdge pendante -> no-op + warn + 0 event ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'a' } }], edges: [] });
    const events = listen(m);
    captureWarnings();
    m.addEdge({ data: { id: 'e1', source: 'a', target: 'zzz' } });
    restoreWarnings();
    assertEqual(events.length, 0, '9. addEdge pendante -> 0 event');
    assertTrue(warnCount >= 1, '9. addEdge pendante -> console.warn appele');
    assertEqual(m.edgeCount, 0, '9. addEdge pendante -> pas ajoutee');
  }

  // ---- 10. addEdge id = id d'un noeud (namespace partage) -> no-op + warn ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }], edges: [] });
    const events = listen(m);
    captureWarnings();
    m.addEdge({ data: { id: 'a', source: 'a', target: 'b' } });
    restoreWarnings();
    assertEqual(events.length, 0, '10. addEdge id=id noeud -> 0 event (invariant 1)');
    assertTrue(warnCount >= 1, '10. addEdge id=id noeud -> console.warn appele');
    assertEqual(m.edgeCount, 0, '10. addEdge id=id noeud -> pas ajoutee');
  }

  // ---- 11. updateNode : merge shallow + position remplacee + event + id immuable ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'a', label: 'A', color: 'blue' }, position: { x: 0, y: 0 } }],
      edges: [],
    });
    const events = listen(m);
    captureWarnings();
    m.updateNode('a', { data: { label: 'A2', id: 'evil' }, position: { x: 10, y: 20 } });
    restoreWarnings();
    assertEqual(events.length, 1, '11. updateNode -> 1 event');
    assertEqual(events[0].op, 'update-node', '11. updateNode -> op update-node');
    assertEqual(m.getNode('a').data.id, 'a', '11. updateNode -> id inchange (invariant 5)');
    assertEqual(m.getNode('a').data.label, 'A2', '11. updateNode -> data mergee (label)');
    assertEqual(m.getNode('a').data.color, 'blue', '11. updateNode -> cle non touchee conservee (merge shallow)');
    assertDeepEqual(m.getNode('a').position, { x: 10, y: 20 }, '11. updateNode -> position remplacee');
    assertTrue(warnCount >= 1, '11. updateNode patch.data.id -> console.warn appele (invariant 5)');
  }

  // ---- 12. updateNode id absent -> no-op + warn + 0 event ----
  {
    const m = new GraphModel({ nodes: [], edges: [] });
    const events = listen(m);
    captureWarnings();
    m.updateNode('zzz', { data: { label: 'x' } });
    restoreWarnings();
    assertEqual(events.length, 0, '12. updateNode id absent -> 0 event');
    assertTrue(warnCount >= 1, '12. updateNode id absent -> console.warn appele');
  }

  // ---- 13. removeNode cascade -> 1 SEUL event, removedEdges, adjacency purgee ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }, { data: { id: 'c' } }],
      edges: [
        { data: { id: 'e1', source: 'a', target: 'b' } },
        { data: { id: 'e2', source: 'c', target: 'a' } },
      ],
    });
    const events = listen(m);
    m.removeNode('a');
    assertEqual(events.length, 1, '13. removeNode cascade -> 1 seul event');
    assertEqual(events[0].op, 'remove-node', '13. removeNode -> op remove-node');
    assertEqual(events[0].removedEdges.length, 2, '13. removeNode cascade -> removedEdges = 2 aretes incidentes');
    assertEqual(m.adjacency.get('a'), undefined, '13. removeNode -> adjacency.get(id) purgee');
    assertEqual(m.hasEdge('e1'), false, '13. removeNode cascade -> e1 retiree');
    assertEqual(m.hasEdge('e2'), false, '13. removeNode cascade -> e2 retiree');
    assertEqual(m.outEdges('c').length, 0, '13. removeNode cascade -> plus d\'arete residuelle (invariant 4)');
  }

  // ---- 14. removeEdge -> in/out purgees + event ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [{ data: { id: 'e1', source: 'a', target: 'b' } }],
    });
    const events = listen(m);
    m.removeEdge('e1');
    assertEqual(events.length, 1, '14. removeEdge -> 1 event');
    assertEqual(events[0].op, 'remove-edge', '14. removeEdge -> op remove-edge');
    assertEqual(m.outEdges('a').length, 0, '14. removeEdge -> outEdges(source) purgee');
    assertEqual(m.inEdges('b').length, 0, '14. removeEdge -> inEdges(target) purgee');
  }

  // ---- 15. Compte d'events = 1 par mutation effective ; 0 pour les no-op ----
  {
    const m = new GraphModel({ nodes: [], edges: [] });
    const events = listen(m);
    m.addNode({ data: { id: 'a' } }); // effective #1
    m.addNode({ data: { id: 'b' } }); // effective #2
    m.addEdge({ data: { id: 'e1', source: 'a', target: 'b' } }); // effective #3
    m.updateNode('a', { data: { label: 'x' } }); // effective #4
    m.removeEdge('e1'); // effective #5
    m.removeNode('b'); // effective #6
    captureWarnings();
    m.addNode({ data: { id: 'a' } }); // no-op (a existe deja)
    m.updateNode('zzz', { data: {} }); // no-op (id inconnu)
    m.removeEdge('e1'); // no-op (deja retiree)
    restoreWarnings();
    assertEqual(events.length, 6, '15. sequence add/update/remove -> 1 event par mutation effective');
    assertTrue(warnCount >= 3, '15. 3 no-op -> chacun son console.warn');
  }

  // ---- 16. schemaVersion forward-tolerant ----
  {
    const m = new GraphModel({ schemaVersion: 2, nodes: [], edges: [] });
    assertEqual(m.schemaVersion, 2, '16. schemaVersion:2 en entree -> conserve tel quel (ni rejet)');
    assertEqual(m.toJSON().schemaVersion, 2, '16. schemaVersion:2 -> toJSON conserve (ni migration)');
  }

  // ---- 17. neighbors/inEdges/outEdges coherents apres sequence (losange) ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }, { data: { id: 'c' } }, { data: { id: 'd' } }],
      edges: [
        { data: { id: 'ab', source: 'a', target: 'b' } },
        { data: { id: 'ac', source: 'a', target: 'c' } },
        { data: { id: 'bd', source: 'b', target: 'd' } },
        { data: { id: 'cd', source: 'c', target: 'd' } },
      ],
    });
    assertDeepEqual(m.neighbors('a').sort(), ['b', 'c'], '17. losange -> neighbors(a) = [b,c]');
    assertDeepEqual(m.neighbors('d').sort(), ['b', 'c'], '17. losange -> neighbors(d) = [b,c]');

    m.removeEdge('ab');
    assertDeepEqual(m.neighbors('a').sort(), ['c'], '17. apres removeEdge(ab) -> neighbors(a) = [c]');
    assertEqual(m.inEdges('b').length, 0, '17. apres removeEdge(ab) -> inEdges(b) vide');

    m.removeNode('c');
    assertDeepEqual(m.neighbors('a').sort(), [], '17. apres removeNode(c) -> neighbors(a) = []');
    assertEqual(m.hasEdge('cd'), false, '17. removeNode(c) cascade -> cd retiree');
    // 'bd' (b->d) est independante de c : d garde une seule arete entrante (plus cd).
    assertDeepEqual(m.inEdges('d').map((e) => e.data.id), ['bd'], '17. apres removeNode(c) -> inEdges(d) = [bd] uniquement');
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-model passes (GraphModel CRUD, adjacency, events, toModel)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
