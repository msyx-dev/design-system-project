// Test unitaire — shared/graph/io (#664, I6 export/import)
// Couvre les briques DOM-FREE (round-trip JSON versionne, adaptateur Cytoscape,
// parseur DOT sous-ensemble) + un smoke-test d'import des modules DOM-only
// (export-svg.js/export-png.js) prouvant qu'ils ne touchent AUCUNE API DOM au
// chargement (import() ne doit pas planter sous Node, meme si l'appel reel des
// fonctions exige un navigateur). Style calque sur graph-model.test.js (asserts
// maison, import() dynamique, `node tests/regression/graph-io.test.js`).
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

function assertThrows(fn, msg) {
  try {
    fn();
    console.error(`FAIL: ${msg} — aucune exception levee`);
    FAILED++;
  } catch (err) {
    if (!(err instanceof Error)) {
      console.error(`FAIL: ${msg} — exception levee mais pas une Error (${typeof err})`);
      FAILED++;
    }
  }
}

async function main() {
  assertTrue(typeof document === 'undefined', 'preuve DOM-free : aucun `document` global dans ce process de test');

  const { GraphModel } = await import('../../shared/graph/model/index.js');
  const { exportGraphJSON, importGraphJSON, migrateGraphData, CURRENT_SCHEMA_VERSION } = await import('../../shared/graph/io/json.js');
  const { fromCytoscape } = await import('../../shared/graph/io/cytoscape.js');
  const { parseDOT } = await import('../../shared/graph/io/dot.js');

  // ==== 1. Round-trip JSON versionne : import(export(model)) === model ====
  {
    const m = new GraphModel({
      nodes: [{ data: { id: 'a', label: 'A' }, position: { x: 1, y: 2 } }, { data: { id: 'b', label: 'B' } }],
      edges: [{ data: { id: 'e1', source: 'a', target: 'b', label: 'lien' } }],
    });
    const json1 = exportGraphJSON(m);
    assertEqual(json1.schemaVersion, CURRENT_SCHEMA_VERSION, '1. exportGraphJSON -> schemaVersion = CURRENT_SCHEMA_VERSION');
    const m2 = importGraphJSON(json1);
    assertTrue(m2 instanceof GraphModel, '1. importGraphJSON -> instance de GraphModel');
    const json2 = exportGraphJSON(m2);
    assertDeepEqual(json2, json1, '1. round-trip exportGraphJSON -> importGraphJSON -> exportGraphJSON exact (import(export(model)) === model)');
  }

  // ==== 2. exportGraphJSON garde-fou de type ====
  {
    assertThrows(() => exportGraphJSON({ nodes: [] }), '2. exportGraphJSON(non-GraphModel) -> TypeError');
  }

  // ==== 3. migrateGraphData — schemaVersion fige a 1, crochet forward-tolerant ====
  {
    const identity = migrateGraphData({ schemaVersion: 1, nodes: [], edges: [] });
    assertEqual(identity.schemaVersion, 1, '3a. migrateGraphData schemaVersion:1 -> inchange (V1 = CURRENT, aucune migration connue)');

    const noVersion = migrateGraphData({ nodes: [{ data: { id: 'x' } }], edges: [] });
    assertEqual(noVersion.schemaVersion, CURRENT_SCHEMA_VERSION, '3b. migrateGraphData sans schemaVersion -> defaut CURRENT_SCHEMA_VERSION');
    assertEqual(noVersion.nodes.length, 1, '3b. migrateGraphData sans schemaVersion -> nodes preserves');

    const future = migrateGraphData({ schemaVersion: 99, nodes: [], edges: [] });
    assertEqual(future.schemaVersion, 99, '3c. migrateGraphData schemaVersion futur (99) -> renvoye tel quel (forward-tolerant, pas de throw)');
  }

  // ==== 4. Adaptateur Cytoscape — "elements object form" ====
  {
    const cy = {
      elements: {
        nodes: [{ data: { id: 'n1', label: 'Un' } }, { data: { id: 'n2', label: 'Deux' } }],
        edges: [{ data: { id: 'e1', source: 'n1', target: 'n2' } }],
      },
    };
    const pivot = fromCytoscape(cy);
    const m = new GraphModel(pivot);
    assertEqual(m.nodeCount, 2, '4. Cytoscape elements object form -> 2 noeuds');
    assertEqual(m.edgeCount, 1, '4. Cytoscape elements object form -> 1 arete');
    assertEqual(m.getNode('n1').data.label, 'Un', '4. Cytoscape elements object form -> data.label conservee');
  }

  // ==== 5. Adaptateur Cytoscape — forme "flat" (elements[] + group) ====
  {
    const cy = {
      elements: [
        { group: 'nodes', data: { id: 'a' }, position: { x: 5, y: 10 }, selected: false, classes: 'foo' },
        { group: 'nodes', data: { id: 'b' } },
        { group: 'edges', data: { id: 'e1', source: 'a', target: 'b' } },
      ],
    };
    const pivot = fromCytoscape(cy);
    const m = new GraphModel(pivot);
    assertEqual(m.nodeCount, 2, '5. Cytoscape flat form -> 2 noeuds');
    assertEqual(m.edgeCount, 1, '5. Cytoscape flat form -> 1 arete');
    assertDeepEqual(m.getNode('a').position, { x: 5, y: 10 }, '5. Cytoscape flat form -> position portee');
  }

  // ==== 6. Adaptateur Cytoscape — flat form SANS `group` explicite (deduit de data.source) ====
  {
    const cy = { elements: [{ data: { id: 'a' } }, { data: { id: 'b' } }, { data: { id: 'e1', source: 'a', target: 'b' } }] };
    const m = new GraphModel(fromCytoscape(cy));
    assertEqual(m.nodeCount, 2, '6. group deduit -> 2 noeuds');
    assertEqual(m.edgeCount, 1, '6. group deduit -> 1 arete (source/target -> classee edges)');
  }

  // ==== 7. Adaptateur Cytoscape — pivot nu (sans cle "elements") ====
  {
    const m = new GraphModel(fromCytoscape({ nodes: [{ data: { id: 'x' } }], edges: [] }));
    assertEqual(m.nodeCount, 1, '7. pivot nu (sans elements) -> passe tel quel');
  }

  // ==== 8. parseDOT — cas nominal digraph + labels + implicit node creation ====
  {
    const dot = `
      digraph G {
        a [label="Alpha"];
        a -> b [label="vers B"];
        b -> c;
      }
    `;
    const { nodes, edges, warnings } = parseDOT(dot);
    assertEqual(nodes.length, 3, '8. digraph nominal -> 3 noeuds (a explicite, b/c implicites via aretes)');
    assertEqual(edges.length, 2, '8. digraph nominal -> 2 aretes');
    assertEqual(warnings.length, 0, '8. digraph nominal -> aucun warning');
    const m = new GraphModel({ nodes, edges });
    assertEqual(m.getNode('a').data.label, 'Alpha', '8. label noeud explicite conserve');
    assertEqual(m.hasNode('b'), true, '8. noeud "b" cree implicitement (endpoint d\'arete non declare)');
    assertEqual(m.hasNode('c'), true, '8. noeud "c" cree implicitement');
    const ab = m.outEdges('a')[0];
    assertEqual(ab.data.directed, true, '8. digraph -> directed:true');
    assertEqual(ab.data.label, 'vers B', '8. label d\'arete conserve');
  }

  // ==== 9. parseDOT — graphe non-oriente (`graph { a -- b }`) ====
  {
    const { nodes, edges } = parseDOT('graph G { a -- b; }');
    assertEqual(nodes.length, 2, '9. graph non-oriente -> 2 noeuds');
    assertEqual(edges[0].data.directed, false, '9. operateur "--" -> directed:false');
  }

  // ==== 10. parseDOT — identifiants entre guillemets + label avec espaces ====
  {
    const { nodes } = parseDOT('digraph { "mon noeud" [label="Un beau label"]; }');
    assertEqual(nodes.length, 1, '10. identifiant quote -> 1 noeud');
    assertEqual(nodes[0].data.id, 'mon noeud', '10. guillemets retires de l\'id');
    assertEqual(nodes[0].data.label, 'Un beau label', '10. label avec espaces conserve');
  }

  // ==== 11. parseDOT — entree invalide (pas d'en-tete) -> Error propre ====
  {
    assertThrows(() => parseDOT('ceci ne ressemble pas du tout a du DOT'), '11. entree sans en-tete digraph/graph -> throw');
    assertThrows(() => parseDOT(''), '11b. entree vide -> throw');
    assertThrows(() => parseDOT('digraph { a -> b;'), '11c. accolades non equilibrees -> throw');
  }

  // ==== 12. parseDOT — subgraph non supporte : ignore + warning, pas de contenu fantome ====
  {
    const { nodes, edges, warnings } = parseDOT(`
      digraph {
        a -> b;
        subgraph cluster_0 {
          x -> y;
        }
      }
    `);
    assertEqual(nodes.some((n) => n.data.id === 'x'), false, '12. subgraph ignore -> noeud interne "x" absent');
    assertEqual(nodes.some((n) => n.data.id === 'y'), false, '12. subgraph ignore -> noeud interne "y" absent');
    assertEqual(edges.length, 1, '12. subgraph ignore -> seule l\'arete top-level (a->b) est retenue');
    assertTrue(warnings.some((w) => w.includes('sous-graphe')), '12. subgraph ignore -> warning explicite emis');
  }

  // ==== 13. parseDOT — chaine d'aretes non supportee (a -> b -> c) : ignoree + warning ====
  {
    const { nodes, edges, warnings } = parseDOT('digraph { a -> b -> c; }');
    assertEqual(edges.length, 0, '13. chaine d\'aretes -> instruction entiere ignoree (0 arete)');
    assertEqual(nodes.length, 0, '13. chaine d\'aretes -> aucun noeud implicite cree (instruction rejetee avant registration)');
    assertTrue(warnings.some((w) => w.includes("chaine d'aretes")), '13. chaine d\'aretes -> warning explicite emis');
  }

  // ==== 14. parseDOT — attributs par defaut node[...]/edge[...] non supportes ====
  {
    const { nodes, edges, warnings } = parseDOT(`
      digraph {
        node [shape=box];
        edge [color=red];
        a -> b;
      }
    `);
    assertEqual(nodes.length, 2, '14. attributs par defaut ignores -> noeuds a/b crees normalement via l\'arete');
    assertEqual(edges.length, 1, '14. attributs par defaut ignores -> arete normale conservee');
    assertTrue(warnings.some((w) => w.includes('node [...]')), '14. warning "node [...]" emis');
    assertTrue(warnings.some((w) => w.includes('edge [...]')), '14. warning "edge [...]" emis');
  }

  // ==== 15. parseDOT — attribut de graphe global isole (rankdir=LR) non supporte ====
  {
    const { nodes, warnings } = parseDOT('digraph { rankdir=LR; a; b; }');
    assertEqual(nodes.length, 2, '15. attribut global ignore -> seuls a/b sont des noeuds');
    assertTrue(warnings.some((w) => w.includes('attribut de graphe global')), '15. warning attribut global emis');
  }

  // ==== 16. parseDOT — port non supporte (a:port), noeud conserve sans port ====
  {
    const { nodes, edges, warnings } = parseDOT('digraph { a:west -> b; }');
    assertDeepEqual(nodes.map((n) => n.data.id).sort(), ['a', 'b'], '16. port retire -> noeud "a" (sans ":west")');
    assertEqual(edges[0].data.source, 'a', '16. arete reliee au noeud sans port');
    assertTrue(warnings.some((w) => w.includes('port')), '16. warning port emis');
  }

  // ==== 17. parseDOT — attributs ignores hors "label" (color, shape) : warning recapitulatif ====
  {
    const { nodes, warnings } = parseDOT('digraph { a [label="A", color=red, shape=box]; }');
    assertEqual(nodes[0].data.label, 'A', '17. label conserve malgre les autres attributs');
    assertTrue(!('color' in nodes[0].data) && !('shape' in nodes[0].data), '17. color/shape non repris dans data');
    assertTrue(warnings.some((w) => w.includes('color') && w.includes('shape')), '17. warning recapitulatif attributs ignores');
  }

  // ==== 18. parseDOT -> feed direct dans GraphModel (bout en bout, invariants respectes) ====
  {
    const { nodes, edges } = parseDOT('digraph { a -> b; b -> c; c -> a; }');
    const m = new GraphModel({ nodes, edges });
    assertEqual(m.nodeCount, 3, '18. DOT bout-en-bout -> 3 noeuds');
    assertEqual(m.edgeCount, 3, '18. DOT bout-en-bout -> 3 aretes (cycle a->b->c->a)');
  }

  // ==== 19. smoke-test import DOM-only (export-svg/export-png) — 0 crash sous Node ====
  {
    const svgMod = await import('../../shared/graph/io/export-svg.js');
    const pngMod = await import('../../shared/graph/io/export-png.js');
    assertEqual(typeof svgMod.exportSVG, 'function', '19. export-svg.js importable sous Node (aucun acces DOM au chargement)');
    assertEqual(typeof pngMod.exportPNG, 'function', '19. export-png.js importable sous Node (aucun acces DOM au chargement)');
  }

  // ==== 20. barrel io/index.js — surface complete exposee ====
  {
    const io = await import('../../shared/graph/io/index.js');
    ['exportGraphJSON', 'importGraphJSON', 'CURRENT_SCHEMA_VERSION', 'migrateGraphData', 'fromCytoscape', 'parseDOT', 'exportSVG', 'exportPNG'].forEach(
      (name) => assertTrue(name in io, `20. shared/graph/io/index.js exporte "${name}"`)
    );
  }

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-io passes (round-trip JSON, adaptateur Cytoscape, parseur DOT, smoke-test export DOM)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
