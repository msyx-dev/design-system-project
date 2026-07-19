// Test unitaire — shared/graph/layout + a11y-table (#666, I1b-2)
// Layouts DOM-free (fixed/tree) + derivation table a11y : purs, testables sans DOM
// (jumeau de tests/regression/graph-model.test.js). AUCUN stub `document` : si un
// document.* s'y glissait, ce fichier planterait (ReferenceError).
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
  const { fixedLayout } = await import('../../shared/graph/layout/fixed.js');
  const { treeLayout } = await import('../../shared/graph/layout/tree.js');
  const { resolveLayout, registerLayout } = await import('../../shared/graph/layout/index.js');
  const { graphToTableModel } = await import('../../shared/graph/render/a11y-table.js');

  // ---- fixed.js ----
  {
    const m = new GraphModel({
      nodes: [
        { data: { id: 'a' }, position: { x: 10, y: 20 } },
        { data: { id: 'b' } }, // sans position -> (0,0) + warn
      ],
      edges: [],
    });
    const REAL_WARN = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };
    const pos = fixedLayout(m);
    console.warn = REAL_WARN;
    assertDeepEqual(pos.get('a'), { x: 10, y: 20 }, '1. fixed lit node.position.{x,y}');
    assertDeepEqual(pos.get('b'), { x: 0, y: 0 }, '2. fixed sans position -> fallback (0,0)');
    assertTrue(warned, '3. fixed sans position -> console.warn emis (lenient, jamais de throw)');
  }

  // ---- resolveLayout / registerLayout ----
  {
    assertTrue(resolveLayout('fixed') === fixedLayout, '4. resolveLayout("fixed") retourne fixedLayout');
    assertTrue(resolveLayout('tree') === treeLayout, '5. resolveLayout("tree") retourne treeLayout');
    assertTrue(resolveLayout('inconnu') === fixedLayout, '6. resolveLayout(inconnu) -> fallback fixed');
    let called = false;
    registerLayout('custom-test', () => {
      called = true;
      return new Map();
    });
    resolveLayout('custom-test')();
    assertTrue(called, '7. registerLayout() enregistre un layout custom, resolveLayout() le retrouve');
  }

  // ---- tree.js : determinisme ----
  {
    const build = () =>
      new GraphModel({
        nodes: [
          { data: { id: 'root' } },
          { data: { id: 'a' } },
          { data: { id: 'b' } },
          { data: { id: 'c' } },
        ],
        edges: [
          { data: { id: 'e1', source: 'root', target: 'a', directed: true } },
          { data: { id: 'e2', source: 'root', target: 'b', directed: true } },
          { data: { id: 'e3', source: 'a', target: 'c', directed: true } },
        ],
      });
    const sizes = new Map([
      ['root', { w: 100, h: 40 }],
      ['a', { w: 100, h: 40 }],
      ['b', { w: 100, h: 40 }],
      ['c', { w: 100, h: 40 }],
    ]);
    const pos1 = treeLayout(build(), { sizes });
    const pos2 = treeLayout(build(), { sizes });
    assertDeepEqual(mapToObj(pos1), mapToObj(pos2), '8. tree deterministe : memes entrees+sizes -> meme Map');
    assertEqual(pos1.get('root').y, 0 + 40 / 2, '9. tree TB : racine au sommet (y = h/2)');
    assertTrue(pos1.get('a').y < pos1.get('c').y, '10. tree TB : profondeur croissante -> y croissant');
    assertTrue(pos1.get('a').x !== pos1.get('b').x, '11. tree : deux enfants distincts -> x distincts');
  }

  // ---- tree.js : foret (multi-racines) ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'r1' } }, { data: { id: 'r2' } }, { data: { id: 'leaf' } }],
      edges: [{ data: { id: 'e1', source: 'r2', target: 'leaf', directed: true } }],
    });
    const pos = treeLayout(m, {});
    assertTrue(pos.has('r1') && pos.has('r2') && pos.has('leaf'), '12. tree foret : toutes les racines + enfants positionnes');
    assertTrue(pos.get('r1').x !== pos.get('r2').x, '13. tree foret : sous-arbres decales horizontalement (pas de chevauchement)');
  }

  // ---- tree.js : cycle -> pas d'infini, couverture totale ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'x' } }, { data: { id: 'y' } }, { data: { id: 'z' } }],
      edges: [
        { data: { id: 'e1', source: 'x', target: 'y', directed: true } },
        { data: { id: 'e2', source: 'y', target: 'z', directed: true } },
        { data: { id: 'e3', source: 'z', target: 'x', directed: true } }, // cycle pur, aucune racine naturelle
      ],
    });
    const start = Date.now();
    const pos = treeLayout(m, {});
    const elapsed = Date.now() - start;
    assertTrue(elapsed < 1000, '14. tree cycle pur : termine rapidement (garde anti-cycle effective)');
    assertEqual(pos.size, 3, '15. tree cycle pur : les 3 noeuds recoivent quand meme une position (racine de secours)');
  }

  // ---- tree.js : direction LR swap les axes ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'root' } }, { data: { id: 'child' } }],
      edges: [{ data: { id: 'e1', source: 'root', target: 'child', directed: true } }],
    });
    const sizes = new Map([
      ['root', { w: 100, h: 40 }],
      ['child', { w: 100, h: 40 }],
    ]);
    const tb = treeLayout(m, { direction: 'TB', sizes });
    const lr = treeLayout(m, { direction: 'LR', sizes });
    assertTrue(tb.get('root').y < tb.get('child').y, '16. TB : la profondeur croit sur y');
    assertTrue(lr.get('root').x < lr.get('child').x, '17. LR : la profondeur croit sur x (axes swappes)');
  }

  // ---- graphToTableModel (a11y) ----
  {
    const m = new GraphModel({
      nodes: [
        { data: { id: 'a', label: 'Alpha', type: 'root' } },
        { data: { id: 'b', label: 'Beta', type: 'leaf' } },
      ],
      edges: [{ data: { id: 'e1', source: 'a', target: 'b', directed: true } }],
    });
    const { caption, rows } = graphToTableModel(m);
    assertEqual(caption, '2 nœuds, 1 arête', '18. graphToTableModel : caption noeuds/aretes correcte');
    assertEqual(rows.length, 2, '19. graphToTableModel : 1 ligne par noeud');
    const rowA = rows.find((r) => r.id === 'a');
    const rowB = rows.find((r) => r.id === 'b');
    assertDeepEqual(rowA.out, ['Beta'], '20. graphToTableModel : sortantes de a = [Beta]');
    assertDeepEqual(rowB.in, ['Alpha'], '21. graphToTableModel : entrantes de b = [Alpha]');

    m.addNode({ data: { id: 'c', label: 'Gamma' } });
    const after = graphToTableModel(m);
    assertEqual(after.rows.length, 3, '22. graphToTableModel : synchrone au modele apres mutation');
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-layout passes (fixed/tree/registry/a11y-table)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
