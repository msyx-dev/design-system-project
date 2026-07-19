// radial.js — layout radial 360° deterministe, DOM-free (#669, I3-1)
// Contrat : run(model, opts) -> Map<id,{x,y}> (centre pixel). Pur — aucun DOM, aucun alea.
// Racine au centre ; profondeur -> anneau (rayon ∝ profondeur) ; secteurs angulaires
// ∝ nombre de feuilles du sous-arbre. Convention polaire : theta mesure depuis -PI/2
// (haut), horaire (idiome initProgressTrackers components.js:2622). Garanties tree.js :
// racines = sans arete entrante (opts.root en tete), garde anti-cycle, couverture totale.

const DEFAULT_SIZE = { w: 120, h: 40 };

function sizeOf(sizes, id) {
  const s = sizes && sizes.get(id);
  return s && typeof s.w === 'number' && typeof s.h === 'number' ? s : DEFAULT_SIZE;
}

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @param {{root?:string, startAngle?:number, sweep?:number, ringGap?:number, sizes?:Map}} [opts]
 * @returns {Map<string,{x:number,y:number}>}
 */
export function radialLayout(model, opts) {
  const o = opts || {};
  const sizes = o.sizes || new Map();
  const startAngle = typeof o.startAngle === 'number' ? o.startAngle : -Math.PI / 2;
  const sweep = typeof o.sweep === 'number' ? o.sweep : Math.PI * 2;
  const ringGap = typeof o.ringGap === 'number' ? o.ringGap : 40;

  const nodeIds = model.nodes.map((n) => n.data.id);
  const visited = new Set();
  const children = new Map();
  const depth = new Map();

  // --- Racines : opts.root en tete, puis nœuds sans arete entrante (ordre insertion) ---
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
    kids.forEach((k) => visit(k, d + 1));
  }
  roots.forEach((id) => visit(id, 0));
  // Filet couverture totale (cycle pur / nœud isole) -> racine de secours, ordre insertion.
  nodeIds.forEach((id) => {
    if (!visited.has(id)) {
      roots.push(id);
      visit(id, 0);
    }
  });

  // --- Poids feuille (post-ordre) : 1 pour une feuille, somme des enfants sinon ---
  const leafWeight = new Map();
  function weigh(id) {
    const kids = children.get(id) || [];
    if (kids.length === 0) {
      leafWeight.set(id, 1);
      return 1;
    }
    const w = kids.reduce((a, k) => a + weigh(k), 0);
    leafWeight.set(id, w);
    return w;
  }
  const totalLeaves = roots.reduce((a, r) => a + weigh(r), 0) || 1;

  // --- Rayon par palier : cumul (extent max du palier + ringGap), racine au centre ---
  const maxByDepth = new Map();
  nodeIds.forEach((id) => {
    const { w, h } = sizeOf(sizes, id);
    const d = depth.get(id) || 0;
    maxByDepth.set(d, Math.max(maxByDepth.get(d) || 0, Math.hypot(w, h) / 2));
  });
  const maxDepth = Math.max(0, ...Array.from(maxByDepth.keys()));
  const radiusAt = new Map([[0, 0]]);
  let acc = 0;
  for (let d = 1; d <= maxDepth; d++) {
    acc += (maxByDepth.get(d - 1) || 0) + (maxByDepth.get(d) || 0) + ringGap;
    radiusAt.set(d, acc);
  }

  // --- Attribution angulaire (pre-ordre) : chaque nœud recoit un secteur [a0,a1)
  //     ∝ leafWeight ; angle du nœud = milieu de son secteur ---
  const angle = new Map();
  function assign(id, a0, a1) {
    angle.set(id, (a0 + a1) / 2);
    const kids = children.get(id) || [];
    let cursor = a0;
    kids.forEach((k) => {
      const span = ((a1 - a0) * leafWeight.get(k)) / (leafWeight.get(id) || 1);
      assign(k, cursor, cursor + span);
      cursor += span;
    });
  }
  // Repartir les racines (foret) sur le sweep global, ∝ leafWeight.
  let cursor = startAngle;
  roots.forEach((r) => {
    const span = (sweep * leafWeight.get(r)) / totalLeaves;
    assign(r, cursor, cursor + span);
    cursor += span;
  });

  const pos = new Map();
  nodeIds.forEach((id) => {
    const r = radiusAt.get(depth.get(id) || 0) || 0;
    const th = angle.get(id) || startAngle;
    pos.set(id, { x: r * Math.cos(th), y: r * Math.sin(th) });
  });
  return pos;
}
