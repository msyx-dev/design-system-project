// Test unitaire — GraphHistory (undo/redo, pile de patches inverses) (#675, I5-3)
// Couvre : round-trip toJSON (undo total ≡ initial, redo total ≡ final), coalescing par
// transaction (N updates = 1 undo), redo vide apres nouvelle mutation, canUndo/canRedo,
// event graph:history:change, re-entrance (undo ne s'auto-enregistre pas), cascade
// remove-node (re-ajout noeud + aretes incidentes), enrichissement `prev` des events update.
//
// Style aligne sur graph-model.test.js : asserts maison, import() dynamique, DOM-free
// (EventTarget/CustomEvent = globals Node 20, aucun jsdom). `node tests/regression/graph-history.test.js`.
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

/** Forme normalisee (noeuds/aretes tries par id) — le graphe est un ENSEMBLE, l'ordre
 * d'insertion Map n'est pas semantique (un undo de remove-node re-insere en fin de Map). */
function snap(model) {
  const j = model.toJSON();
  const byId = (a, b) => (a.data.id < b.data.id ? -1 : a.data.id > b.data.id ? 1 : 0);
  return JSON.stringify({
    schemaVersion: j.schemaVersion,
    meta: j.meta,
    nodes: [...j.nodes].sort(byId),
    edges: [...j.edges].sort(byId),
  });
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { GraphModel, GraphHistory, buildRecord } = await import('../../shared/graph/model/index.js');
  assertTrue(typeof GraphHistory === 'function', 'GraphHistory est exporte par le barrel');
  assertTrue(typeof buildRecord === 'function', 'buildRecord est exporte par le barrel');
  assertTrue(GraphHistory.prototype instanceof EventTarget, 'GraphHistory extends EventTarget');

  // ---- 1. Round-trip mixte : add/addEdge/update/remove -> undo total ≡ initial, redo ≡ final ----
  {
    const m = new GraphModel({
      nodes: [
        { data: { id: 'a', label: 'A' } },
        { data: { id: 'b', label: 'B' } },
      ],
      edges: [{ data: { id: 'e1', source: 'a', target: 'b' } }],
    });
    const h = new GraphHistory(m);
    const initial = snap(m);

    m.addNode({ data: { id: 'c', label: 'C' }, position: { x: 1, y: 2 } });
    m.addEdge({ data: { id: 'e2', source: 'b', target: 'c' } });
    m.updateNode('a', { data: { label: 'A modifie' } });
    m.removeNode('b'); // cascade e1 (a-b) + e2 (b-c)
    const afterOps = snap(m);

    assertEqual(h.depth, 4, '1. 4 mutations atomiques -> 4 entrees undo');
    assertTrue(h.canUndo && !h.canRedo, '1. canUndo=true, canRedo=false apres mutations');

    assertTrue(h.undo() && h.undo() && h.undo() && h.undo(), '1. 4 undo reussissent');
    assertEqual(snap(m), initial, '1. undo total -> toJSON ≡ initial (round-trip)');
    assertTrue(!h.canUndo && h.canRedo, '1. pile undo vide, redo pleine apres undo total');
    assertEqual(m.getNode('a').data.label, 'A', '1. label de a restaure (update annule)');
    assertEqual(m.edgeCount, 1, '1. arete e1 restauree (remove-node undo)');

    assertTrue(h.redo() && h.redo() && h.redo() && h.redo(), '1. 4 redo reussissent');
    assertEqual(snap(m), afterOps, '1. redo total -> toJSON ≡ etat post-mutations');
    assertTrue(!m.hasNode('b'), '1. b de nouveau supprime apres redo total');
    assertEqual(m.getNode('a').data.label, 'A modifie', '1. label de a de nouveau modifie apres redo');

    assertEqual(h.undo(), true, '1. un undo apres redo total');
    assertEqual(h.redo(), true, '1. un redo le refait');
    // aucun undo/redo au-dela des bornes
    while (h.undo()) {}
    assertEqual(h.undo(), false, '1. undo() = false quand pile vide');
    assertEqual(snap(m), initial, '1. re-undo total -> encore ≡ initial');
  }

  // ---- 2. update-node exact : round-trip label + position (remplacement invertible) ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'n', label: 'Origine' }, position: { x: 5, y: 5 } }] });
    const h = new GraphHistory(m);
    const before = JSON.stringify(m.toJSON()); // 1 seul noeud -> ordre Map stable, compare EXACT
    m.updateNode('n', { data: { label: 'Nouveau' }, position: { x: 99, y: 99 } });
    assertEqual(m.getNode('n').data.label, 'Nouveau', '2. update applique (label)');
    assertEqual(m.getNode('n').position.x, 99, '2. update applique (position)');
    h.undo();
    assertEqual(JSON.stringify(m.toJSON()), before, '2. undo update-node -> toJSON EXACT ≡ avant');
    h.redo();
    assertEqual(m.getNode('n').data.label, 'Nouveau', '2. redo update-node -> label re-modifie');
    assertEqual(m.getNode('n').position.y, 99, '2. redo update-node -> position re-modifiee');
  }

  // ---- 2b. update-node : suppression de position invertible (prev sans position -> re-supprimee) ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'n' } }] }); // aucune position au depart
    const h = new GraphHistory(m);
    m.updateNode('n', { position: { x: 3, y: 4 } }); // ajoute une position
    assertTrue(!!m.getNode('n').position, '2b. position ajoutee');
    h.undo();
    assertTrue(!m.getNode('n').position, '2b. undo -> position re-supprimee (prev sans position)');
  }

  // ---- 3. Coalescing : N updates dans une transaction = 1 seule entree undo ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'n', label: 'v0' } }] });
    const h = new GraphHistory(m);
    h.beginTransaction();
    m.updateNode('n', { data: { label: 'v1' } });
    m.updateNode('n', { data: { label: 'v2' } });
    m.updateNode('n', { data: { label: 'v3' } });
    h.commit();
    assertEqual(h.depth, 1, '3. 3 updates dans 1 transaction -> 1 seule entree undo (coalescing)');
    assertEqual(m.getNode('n').data.label, 'v3', '3. etat final = v3');
    h.undo();
    assertEqual(m.getNode('n').data.label, 'v0', '3. 1 undo restaure v0 (label complet, pas frappe par frappe)');
    assertTrue(!h.canUndo, '3. pile undo vide apres 1 undo');
    h.redo();
    assertEqual(m.getNode('n').data.label, 'v3', '3. 1 redo restaure v3');
  }

  // ---- 3b. Transaction vide -> commit no-op (aucune entree) ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'n' } }] });
    const h = new GraphHistory(m);
    h.beginTransaction();
    h.commit(); // aucune mutation
    assertEqual(h.depth, 0, '3b. transaction vide -> 0 entree undo');
    assertEqual(h.commit(), undefined, '3b. commit sans begin -> no-op (pas de throw)');
  }

  // ---- 4. Une nouvelle mutation vide la pile redo ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'a' } }] });
    const h = new GraphHistory(m);
    m.addNode({ data: { id: 'b' } });
    m.addNode({ data: { id: 'c' } });
    h.undo(); // annule add c
    assertTrue(h.canRedo, '4. redo dispo apres un undo');
    m.addNode({ data: { id: 'd' } }); // nouvelle mutation
    assertTrue(!h.canRedo, '4. nouvelle mutation -> pile redo videe');
    assertEqual(h.redo(), false, '4. redo() = false apres invalidation');
  }

  // ---- 5. Event graph:history:change (canUndo/canRedo) ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'a' } }] });
    const h = new GraphHistory(m);
    const events = [];
    h.addEventListener('graph:history:change', (e) => events.push(e.detail));
    m.addNode({ data: { id: 'b' } });
    assertTrue(events.length >= 1, '5. graph:history:change emis sur mutation');
    assertEqual(events[events.length - 1].canUndo, true, '5. detail.canUndo=true apres mutation');
    h.undo();
    assertEqual(events[events.length - 1].canRedo, true, '5. detail.canRedo=true apres undo');
  }

  // ---- 6. Re-entrance : undo/redo ne s'auto-enregistrent pas ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'a' } }] });
    const h = new GraphHistory(m);
    m.addNode({ data: { id: 'b' } });
    assertEqual(h.depth, 1, '6. 1 entree apres addNode');
    h.undo(); // applique removeNode(b) -> emet graph:model:change, MAIS ignore (applying)
    assertEqual(h.depth, 0, '6. undo ne cree PAS de nouvelle entree (re-entrance gardee)');
    assertTrue(h.canRedo, '6. redo dispo');
    h.redo(); // applique addNode(b) -> emet, ignore
    assertEqual(h.depth, 1, '6. redo ne cree PAS de nouvelle entree');
    assertTrue(!h.canRedo, '6. pile redo consommee, pas re-alimentee par l\'event de redo');
  }

  // ---- 7. remove-edge round-trip (arete seule, sans toucher aux noeuds) ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
      edges: [{ data: { id: 'e1', source: 'a', target: 'b', label: 'lien' } }],
    });
    const h = new GraphHistory(m);
    m.removeEdge('e1');
    assertEqual(m.edgeCount, 0, '7. arete supprimee');
    h.undo();
    assertEqual(m.edgeCount, 1, '7. undo -> arete restauree');
    assertEqual(m.getEdge('e1').data.label, 'lien', '7. data de l\'arete preservee (snapshot clone)');
  }

  // ---- 8. destroy() : detache le listener, plus de captation ----
  {
    const m = new GraphModel({ nodes: [{ data: { id: 'a' } }] });
    const h = new GraphHistory(m);
    h.destroy();
    m.addNode({ data: { id: 'b' } });
    assertEqual(h.depth, 0, '8. apres destroy(), les mutations ne sont plus captees');
  }

  if (FAILED > 0) {
    console.error(`\n❌ graph-history.test.js — ${FAILED} assertion(s) en echec`);
    process.exit(1);
  }
  console.log('✅ graph-history.test.js — toutes les assertions passent');
}

main().catch((err) => {
  console.error('ERREUR test graph-history:', err);
  process.exit(1);
});
