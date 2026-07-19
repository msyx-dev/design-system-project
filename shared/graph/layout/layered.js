// layered.js — layout hierarchique Sugiyama via dagre VENDORE, DOM-free (#670, I3-2)
// ASYNC : dagre charge en dynamic import() -> hors bundle de base. Contrat elargi :
// run(model,opts) -> Promise<Map<id,{x,y}>>. dagre gere les cycles (greedy FAS interne)
// -> jamais d'infini, meme sur un graphe cyclique (cf. detect.js -> 'layered').
//
// Le vendore (shared/graph/vendor/graph-layered.js) est marque EXTERNAL au build
// IIFE (shared/graph/build.sh, --external:*graph-layered.js*) -> reste un import()
// runtime, jamais inline dans shared/dist/graph.global.js. Voir VENDOR.md pour la
// version pinnee/hash/owner CVE.

const DEFAULT_SIZE = { w: 120, h: 40 };

function sizeOf(sizes, id) {
  const s = sizes && sizes.get(id);
  return s && typeof s.w === 'number' && typeof s.h === 'number' ? s : DEFAULT_SIZE;
}

let _dagrePromise = null;
function loadDagre() {
  if (!_dagrePromise) {
    // Deux contextes de resolution pour ce dynamic import (cf. VENDOR.md) :
    //  - ESM brut (Node/tests, futur bundler consumer type @msyx-dev/react) : chemin
    //    RELATIF classique, resolu contre l'URL de CE module (shared/graph/layout/)
    //    -> shared/graph/vendor/graph-layered.js.
    //  - Bundle IIFE navigateur (shared/dist/graph.global.js, --external:*graph-
    //    layered.js dans build.sh) : esbuild NE RESOUT PAS un module externe, il
    //    preserve le specifier VERBATIM -> un chemin relatif serait resolu contre
    //    l'URL du <script> (shared/dist/), PAS contre l'URL d'origine de layered.js
    //    (profondeurs differentes -> chemin errone). Chemin ABSOLU site-root requis,
    //    meme convention deja en place pour le sprite d'icones (cf.
    //    render/svg-renderer.js, href `/shared/icons/sprite.svg`).
    const spec = typeof window !== 'undefined' ? '/shared/graph/vendor/graph-layered.js' : '../vendor/graph-layered.js';
    _dagrePromise = import(spec);
  }
  return _dagrePromise;
}

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @param {{direction?:'TB'|'LR', gap?:{x:number,y:number}, sizes?:Map}} [opts]
 * @returns {Promise<Map<string,{x:number,y:number}>>}
 */
export async function layeredLayout(model, opts) {
  const o = opts || {};
  const sizes = o.sizes || new Map();
  const mod = await loadDagre();
  const dagre = mod.default || mod;

  const g = new dagre.graphlib.Graph({ directed: true, multigraph: true, compound: false });
  g.setGraph({
    rankdir: o.direction === 'LR' ? 'LR' : 'TB',
    nodesep: (o.gap && o.gap.x) || 32,
    ranksep: (o.gap && o.gap.y) || 48,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  model.nodes.forEach((n) => {
    const s = sizeOf(sizes, n.data.id);
    g.setNode(n.data.id, { width: s.w, height: s.h });
  });
  model.edges.forEach((e) => g.setEdge(e.data.source, e.data.target, {}, e.data.id));

  dagre.layout(g); // dagre casse les cycles en interne (greedy FAS) -> jamais d'infini

  const pos = new Map();
  g.nodes().forEach((id) => {
    const nd = g.node(id);
    if (nd) pos.set(id, { x: nd.x, y: nd.y }); // dagre = centre du noeud (aligne notre contrat)
  });
  // Filet : noeud absent du graphe dagre (defensif) -> (0,0), jamais de trou.
  model.nodes.forEach((n) => {
    if (!pos.has(n.data.id)) pos.set(n.data.id, { x: 0, y: 0 });
  });
  return pos;
}
