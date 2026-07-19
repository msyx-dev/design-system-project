// tree.js — layout Reingold-Tilford naif deterministe, DOM-free (#666, I1b-2)
// Contrat : run(model, opts) -> Map<nodeId, {x,y}> (centre du noeud, PIXELS). Pur —
// aucun acces document/window, aucun alea/simulation de force.
//
// Racines : noeuds sans arete entrante (ordre d'insertion du modele), ou opts.root
// en tete. Enfants : outEdges(id) -> targets, ordre d'insertion (determinisme).
// Garde anti-cycle : Set 'visited' (le modele #665 tolere les cycles) — tout noeud
// jamais atteint par une racine naturelle devient une racine de secours (meme ordre
// d'insertion), donc TOUJOURS termine et TOUS les noeuds recoivent une position.
// direction 'LR' : swap des axes (profondeur -> x, position logique -> y).

const DEFAULT_SIZE = { w: 120, h: 40 };

function sizeOf(sizes, id) {
  const s = sizes && sizes.get(id);
  return s && typeof s.w === 'number' && typeof s.h === 'number' ? s : DEFAULT_SIZE;
}

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @param {{direction?:'TB'|'LR', gap?:{x:number,y:number}, root?:string, sizes?:Map}} [opts]
 * @returns {Map<string, {x:number,y:number}>}
 */
export function treeLayout(model, opts) {
  const o = opts || {};
  const dir = o.direction === 'LR' ? 'LR' : 'TB';
  const gap = o.gap || { x: 32, y: 48 };
  const sizes = o.sizes || new Map();

  const nodeIds = model.nodes.map((n) => n.data.id);
  const visited = new Set();
  const children = new Map(); // id -> [childId,...] (1er parent rencontre gagne)
  const depth = new Map();

  const roots = [];
  const rootOk =
    o.root != null &&
    (typeof model.hasNode === 'function' ? model.hasNode(o.root) : nodeIds.includes(o.root));
  if (rootOk) roots.push(o.root);
  nodeIds.forEach((id) => {
    if (roots.includes(id)) return;
    const inCount = typeof model.inEdges === 'function' ? model.inEdges(id).length : 0;
    if (inCount === 0) roots.push(id);
  });

  function visit(id, d) {
    if (visited.has(id)) return;
    visited.add(id);
    depth.set(id, d);
    const kids = [];
    const outs = typeof model.outEdges === 'function' ? model.outEdges(id) : [];
    outs.forEach((e) => {
      const target = e.data.target;
      if (!visited.has(target)) kids.push(target);
    });
    children.set(id, kids);
    kids.forEach((childId) => visit(childId, d + 1));
  }

  roots.forEach((id) => visit(id, 0));
  // Filet : noeuds jamais atteints (cycle pur, sans racine detectable) -> racines
  // de secours, ordre d'insertion du modele -> deterministe, garantit couverture totale.
  nodeIds.forEach((id) => {
    if (!visited.has(id)) {
      roots.push(id);
      visit(id, 0);
    }
  });

  // Passe 1 : position logique (pixels, axe secondaire), post-ordre (enfants avant parent).
  const secondary = new Map();
  let cursor = 0;
  function place(id) {
    const kids = children.get(id) || [];
    const { w, h } = sizeOf(sizes, id);
    const extent = dir === 'LR' ? h : w;
    if (kids.length === 0) {
      const p = cursor + extent / 2;
      cursor += extent + gap.x;
      secondary.set(id, p);
      return p;
    }
    const childPositions = kids.map((k) => place(k));
    const p = childPositions.reduce((a, b) => a + b, 0) / childPositions.length;
    secondary.set(id, p);
    return p;
  }
  roots.forEach((id) => place(id));

  // Passe 2 : offset cumulatif sur l'axe primaire (profondeur), base sur la taille
  // max des noeuds a chaque palier + gap.y.
  const maxByDepth = new Map();
  nodeIds.forEach((id) => {
    const d = depth.get(id) || 0;
    const { w, h } = sizeOf(sizes, id);
    const extent = dir === 'LR' ? w : h;
    maxByDepth.set(d, Math.max(maxByDepth.get(d) || 0, extent));
  });
  const maxDepth = Math.max(0, ...Array.from(maxByDepth.keys()));
  const primaryOffset = new Map();
  let acc = 0;
  for (let d = 0; d <= maxDepth; d++) {
    const extent = maxByDepth.get(d) || 0;
    primaryOffset.set(d, acc + extent / 2);
    acc += extent + gap.y;
  }

  const pos = new Map();
  nodeIds.forEach((id) => {
    const d = depth.get(id) || 0;
    const s = secondary.get(id) || 0;
    const p = primaryOffset.get(d) || 0;
    pos.set(id, dir === 'LR' ? { x: p, y: s } : { x: s, y: p });
  });
  return pos;
}
