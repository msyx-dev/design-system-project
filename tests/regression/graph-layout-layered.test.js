// Test unitaire — shared/graph/layout/{layered,mindmap} (#670, I3-2)
// Jumeau DOM-free de graph-layout-radial.test.js. AUCUN stub `document` : si un
// document.* s'y glissait, ce fichier planterait (ReferenceError). `layered` est ASYNC
// (dagre vendore en dynamic import) -> tous les asserts le concernant sont `await`es.
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

// ---- Golden fixture layered : DAG figé (dependances) + sizes explicites ----
// Capture initiale (dagre@3.0.0 + graphlib@4.0.1, direction:'TB', deterministe a
// version pinnee) — cf. shared/graph/vendor/VENDOR.md. Si ce test casse apres un bump
// de version dagre, RECALCULER et figer le nouveau golden (jamais de tolerance floue
// ici : c'est la preuve de reproductibilite du build vendore).
const GOLDEN_LAYERED_TB = {
  a: { x: 182, y: 20 },
  b: { x: 50, y: 20 },
  c: { x: 116, y: 108 },
  d: { x: 182, y: 196 },
  e: { x: 50, y: 196 },
  f: { x: 116, y: 284 },
};

function buildDagFixture() {
  return {
    model: {
      nodes: [
        { data: { id: 'a' } },
        { data: { id: 'b' } },
        { data: { id: 'c' } },
        { data: { id: 'd' } },
        { data: { id: 'e' } },
        { data: { id: 'f' } },
      ],
      edges: [
        { data: { id: 'e1', source: 'a', target: 'c', directed: true } },
        { data: { id: 'e2', source: 'b', target: 'c', directed: true } },
        { data: { id: 'e3', source: 'c', target: 'd', directed: true } },
        { data: { id: 'e4', source: 'c', target: 'e', directed: true } },
        { data: { id: 'e5', source: 'd', target: 'f', directed: true } },
        { data: { id: 'e6', source: 'e', target: 'f', directed: true } },
      ],
    },
    sizes: new Map([
      ['a', { w: 100, h: 40 }],
      ['b', { w: 100, h: 40 }],
      ['c', { w: 100, h: 40 }],
      ['d', { w: 100, h: 40 }],
      ['e', { w: 100, h: 40 }],
      ['f', { w: 100, h: 40 }],
    ]),
  };
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { GraphModel } = await import('../../shared/graph/model/index.js');
  const { layeredLayout } = await import('../../shared/graph/layout/layered.js');
  const { mindmapLayout } = await import('../../shared/graph/layout/mindmap.js');
  const { resolveLayout, hasLayout } = await import('../../shared/graph/layout/index.js');

  // ---- 1. layered golden-test : positions exactes, reproductibilite du build vendore ----
  {
    const { model, sizes } = buildDagFixture();
    const pos = await layeredLayout(new GraphModel(model), { sizes, direction: 'TB' });
    assertDeepEqual(mapToObj(pos), GOLDEN_LAYERED_TB, '1. layered golden-test : positions exactes (dagre@3.0.0 pinne)');
  }

  // ---- 2. layered gere les cycles (dagre casse les cycles en interne, greedy FAS) ----
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
    const pos = await layeredLayout(m, {});
    const elapsed = Date.now() - start;
    assertTrue(elapsed < 2000, '2. layered cycle pur : termine rapidement (dagre casse le cycle en interne)');
    assertEqual(pos.size, 3, '3. layered cycle pur : les 3 noeuds recoivent quand meme une position');
  }

  // ---- 4. layered rankdir : TB (y croit) vs LR (x croit) ----
  {
    const build = () =>
      new GraphModel({
        nodes: [{ data: { id: 'a' } }, { data: { id: 'b' } }],
        edges: [{ data: { id: 'e1', source: 'a', target: 'b', directed: true } }],
      });
    const sizes = new Map([
      ['a', { w: 100, h: 40 }],
      ['b', { w: 100, h: 40 }],
    ]);
    const posTB = await layeredLayout(build(), { sizes, direction: 'TB' });
    const posLR = await layeredLayout(build(), { sizes, direction: 'LR' });
    assertTrue(posTB.get('b').y > posTB.get('a').y, '4. layered TB : profondeur croit sur y');
    assertTrue(Math.abs(posTB.get('b').x - posTB.get('a').x) < 0.001, '5. layered TB : meme x pour a et b (1 seule colonne)');
    assertTrue(posLR.get('b').x > posLR.get('a').x, '6. layered LR : profondeur croit sur x');
    assertTrue(Math.abs(posLR.get('b').y - posLR.get('a').y) < 0.001, '7. layered LR : meme y pour a et b (1 seule rangee)');
  }

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

  // ---- 8. mindmap deterministe : memes entrees+sizes -> meme Map ----
  {
    const sizes = mindmapSizes();
    const pos1 = mindmapLayout(buildMindmap(), { sizes });
    const pos2 = mindmapLayout(buildMindmap(), { sizes });
    assertDeepEqual(mapToObj(pos1), mapToObj(pos2), '8. mindmap deterministe : memes entrees+sizes -> meme Map');
  }

  // ---- 9. mindmap bilateral : racine centree, >=1 branche N1 x>0 et >=1 x<0 ----
  {
    const sizes = mindmapSizes();
    const pos = mindmapLayout(buildMindmap(), { sizes });
    const root = pos.get('c');
    assertEqual(root.x, 0, '9. mindmap : racine centree x=0');
    assertEqual(root.y, 0, '10. mindmap : racine centree y=0');
    const a = pos.get('a');
    const b = pos.get('b');
    assertTrue(
      (a.x > 0 && b.x < 0) || (a.x < 0 && b.x > 0),
      '11. mindmap : les 2 branches N1 reparties de part et d\'autre (une x>0, une x<0)'
    );
  }

  // ---- 12. mindmap : equilibrage 'height' vs 'count' distinct sur cas asymetrique ----
  {
    // c -> a (1 feuille HAUTE, h=200) ; c -> b (sous-arbre de 3 feuilles BASSES,
    // h=10 chacune -> count=3, height=30) ; c -> d (1 feuille BASSE, h=10).
    // Par 'height' : a(200) domine -> right ; b(30) -> left ; d(10) : rLoad(200) >
    // lLoad(30+10=40) -> reste left. Par 'count' : a(1) -> right ; b(3) -> left
    // (rLoad1<=lLoad0 faux) ; d(1) : rLoad(1) <= lLoad(3) vrai -> right. Divergence
    // sur 'd' (left en height, right en count) — verifie au calcul (voir fixture).
    const m = new GraphModel({
      nodes: [
        { data: { id: 'c' } },
        { data: { id: 'a' } },
        { data: { id: 'b' } },
        { data: { id: 'd' } },
        { data: { id: 'b1' } },
        { data: { id: 'b2' } },
        { data: { id: 'b3' } },
      ],
      edges: [
        { data: { id: 'r1', source: 'c', target: 'a', directed: true } },
        { data: { id: 'r2', source: 'c', target: 'b', directed: true } },
        { data: { id: 'r3', source: 'c', target: 'd', directed: true } },
        { data: { id: 'r4', source: 'b', target: 'b1', directed: true } },
        { data: { id: 'r5', source: 'b', target: 'b2', directed: true } },
        { data: { id: 'r6', source: 'b', target: 'b3', directed: true } },
      ],
    });
    const sizes = new Map([
      ['c', { w: 100, h: 40 }],
      ['a', { w: 100, h: 200 }],
      ['b', { w: 100, h: 40 }],
      ['d', { w: 100, h: 10 }],
      ['b1', { w: 100, h: 10 }],
      ['b2', { w: 100, h: 10 }],
      ['b3', { w: 100, h: 10 }],
    ]);
    const byHeight = mindmapLayout(m, { sizes, balance: 'height' });
    const byCount = mindmapLayout(m, { sizes, balance: 'count' });
    const sideOf = (pos, id) => (pos.get(id).x > 0 ? 'right' : pos.get(id).x < 0 ? 'left' : 'root');
    const heightSides = ['a', 'b', 'd'].map((id) => sideOf(byHeight, id)).join(',');
    const countSides = ['a', 'b', 'd'].map((id) => sideOf(byCount, id)).join(',');
    assertTrue(heightSides !== countSides, `12. mindmap : balance 'height' (${heightSides}) != balance 'count' (${countSides}) sur cas asymetrique`);
  }

  // ---- 13. mindmap tailles variables : pas de chevauchement vertical ----
  {
    const m = new GraphModel({
      nodes: [
        { data: { id: 'c' } },
        { data: { id: 'x1' } },
        { data: { id: 'x2' } },
        { data: { id: 'x3' } },
      ],
      edges: [
        { data: { id: 'r1', source: 'c', target: 'x1', directed: true } },
        { data: { id: 'r2', source: 'c', target: 'x2', directed: true } },
        { data: { id: 'r3', source: 'c', target: 'x3', directed: true } },
      ],
    });
    const sizes = new Map([
      ['c', { w: 100, h: 40 }],
      ['x1', { w: 100, h: 30 }],
      ['x2', { w: 100, h: 90 }],
      ['x3', { w: 100, h: 50 }],
    ]);
    const pos = mindmapLayout(m, { sizes, gap: { x: 48, y: 16 } });
    // Feuilles du meme cote : verifier que les intervalles [y-h/2, y+h/2] ne se
    // chevauchent jamais (ecart >= somme des demi-hauteurs).
    const ids = ['x1', 'x2', 'x3'];
    const bySide = { right: [], left: [] };
    ids.forEach((id) => {
      const p = pos.get(id);
      const h = sizes.get(id).h;
      (p.x >= 0 ? bySide.right : bySide.left).push({ id, y: p.y, h });
    });
    let overlap = false;
    Object.values(bySide).forEach((side) => {
      const sorted = side.slice().sort((a, b) => a.y - b.y);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        if (cur.y - prev.y < prev.h / 2 + cur.h / 2 - 0.001) overlap = true;
      }
    });
    assertTrue(!overlap, '13. mindmap tailles variables : aucun chevauchement vertical (ecarts >= tailles)');
  }

  // ---- 14. mindmap foret/cycle : couverture totale, termine ----
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'x' } }, { data: { id: 'y' } }, { data: { id: 'z' } }, { data: { id: 'orphan' } }],
      edges: [
        { data: { id: 'e1', source: 'x', target: 'y', directed: true } },
        { data: { id: 'e2', source: 'y', target: 'z', directed: true } },
        { data: { id: 'e3', source: 'z', target: 'x', directed: true } }, // cycle pur
      ],
    });
    const start = Date.now();
    const pos = mindmapLayout(m, {});
    const elapsed = Date.now() - start;
    assertTrue(elapsed < 1000, '14. mindmap foret/cycle : termine rapidement');
    assertEqual(pos.size, 4, '15. mindmap foret/cycle : couverture totale (4 noeuds positionnes, y compris orphelin)');
  }

  // ---- 16-19. registre : hasLayout/resolveLayout pour mindmap + layered ----
  {
    assertTrue(hasLayout('mindmap'), "16. hasLayout('mindmap') === true");
    assertTrue(hasLayout('layered'), "17. hasLayout('layered') === true");
    assertTrue(typeof resolveLayout('mindmap') === 'function', "18. resolveLayout('mindmap') est une fonction");
    const dag = new GraphModel({
      nodes: [{ data: { id: 'p' } }, { data: { id: 'q' } }],
      edges: [{ data: { id: 'e1', source: 'p', target: 'q', directed: true } }],
    });
    const result = resolveLayout('layered')(dag, {});
    assertTrue(result && typeof result.then === 'function', "19. resolveLayout('layered')(...) renvoie un thenable (async, #670)");
    await result; // draine la promesse (evite un rejet non gere si jamais)
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-layout-layered passes (layered/dagre/mindmap)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
