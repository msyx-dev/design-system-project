// fixed.js — layout DOM-free, lit node.position.{x,y} (#666, I1b-2)
// Contrat : run(model, opts) -> Map<nodeId, {x,y}> (centre du noeud, PIXELS). Pur —
// aucun acces document/window. Cf. shared/graph/layout/index.js pour le registre.

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @returns {Map<string, {x:number,y:number}>}
 */
export function fixedLayout(model) {
  const pos = new Map();
  model.nodes.forEach((node) => {
    const id = node.data.id;
    if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
      pos.set(id, { x: node.position.x, y: node.position.y });
    } else {
      // lenient (idiome du modele #665) : warn + fallback (0,0), jamais de throw.
      console.warn(`[graph:fixed] noeud "${id}" sans position -> (0,0)`);
      pos.set(id, { x: 0, y: 0 });
    }
  });
  return pos;
}
