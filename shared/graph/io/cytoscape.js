// cytoscape.js — adaptateur import Cytoscape JSON (#664, I6 export/import)
// DOM-free, pur. Le modele natif du DS est deja "Cytoscape-aligne" ("elements object
// form", cf. en-tete de shared/graph/model/graph-model.js) : `{ data:{id,...},
// position?, size? }` pour un noeud, `{ data:{id,source,target,...} }` pour une
// arete. L'adaptateur se contente donc de DEPLIER les formes Cytoscape standard vers
// `{nodes,edges}` nu — c'est `toModel()`/`GraphModel` (deja lenient, invariants #665)
// qui font le reste, AUCUNE re-normalisation dupliquee ici (spec #664 : "l'adaptateur
// devrait etre mince").
//
// Formes acceptees (cf. https://js.cytoscape.org/#notation/elements-json) :
//   1. { elements: { nodes:[...], edges:[...] } }                      — "elements object form"
//   2. { elements: [ {group:'nodes',data:{...}}, {group:'edges',data:{...}} ] } — forme "flat"
//   3. { nodes:[...], edges:[...] }                                    — deja notre pivot nu
// Champs Cytoscape-only (group, classes, selected, selectable, locked, grabbable,
// pannable, scratch, style, renderedPosition...) ignores SILENCIEUSEMENT — aucun
// n'est lu par toModel() (qui ne prend que `.data`/`.position`/`.size`), rien a
// filtrer explicitement.

function looksLikeEdge(el) {
  return Boolean(el && el.data && typeof el.data === 'object' && ('source' in el.data || 'target' in el.data));
}

/**
 * @param {Object} input - document Cytoscape (elements object|flat, ou pivot nu)
 * @returns {{nodes:Array, edges:Array}} GraphData nu, pret pour `new GraphModel(...)`
 */
export function fromCytoscape(input) {
  const src = input && typeof input === 'object' ? input : {};
  const elements = src.elements;

  if (Array.isArray(elements)) {
    const nodes = [];
    const edges = [];
    elements.forEach((el) => {
      if (!el || typeof el !== 'object') return;
      const group = el.group === 'nodes' || el.group === 'edges' ? el.group : looksLikeEdge(el) ? 'edges' : 'nodes';
      (group === 'edges' ? edges : nodes).push(el);
    });
    return { nodes, edges };
  }

  if (elements && typeof elements === 'object') {
    return {
      nodes: Array.isArray(elements.nodes) ? elements.nodes : [],
      edges: Array.isArray(elements.edges) ? elements.edges : [],
    };
  }

  // Pas de cle "elements" — forme deja nue { nodes, edges } (ou document vide).
  return {
    nodes: Array.isArray(src.nodes) ? src.nodes : [],
    edges: Array.isArray(src.edges) ? src.edges : [],
  };
}
