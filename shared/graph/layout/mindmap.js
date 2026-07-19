// mindmap.js — layout mindmap BILATERAL deterministe, DOM-free (#670, I3-2)
// Racine centrale (0,0) ; branches de 1er niveau reparties gauche/droite (glouton,
// equilibrage par charge de sous-arbre) ; chaque cote = arbre horizontal (Reingold-
// Tilford tourne 90°) ; cote gauche = miroir en x. Consomme node.size (feuilles riches
// NHOOD a largeur/hauteur variables — indispensable, sans mesure correcte : chevauchement).
// Pur — aucun DOM. Ne place que {x,y} : le contenu riche est rendu par le renderer via
// nodeTypes/renderNode/graphCard() (separation stricte layout/render respectee).

const DEFAULT_SIZE = { w: 120, h: 40 };

function sizeOf(sizes, id) {
  const s = sizes && sizes.get(id);
  return s && typeof s.w === 'number' && typeof s.h === 'number' ? s : DEFAULT_SIZE;
}

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @param {{root?:string, gap?:{x:number,y:number}, balance?:'height'|'count', sizes?:Map}} [opts]
 * @returns {Map<string,{x:number,y:number}>}
 */
export function mindmapLayout(model, opts) {
  const o = opts || {};
  const sizes = o.sizes || new Map();
  const gapX = (o.gap && o.gap.x) || 48;
  const gapY = (o.gap && o.gap.y) || 16;
  const byCount = o.balance === 'count';

  const nodeIds = model.nodes.map((n) => n.data.id);
  const visited = new Set();
  const children = new Map(); // id -> [childId,...] (1er parent rencontre gagne)
  const depth = new Map();

  // --- Racine : opts.root si valide, sinon 1re racine naturelle (sans arete
  //     entrante, ordre d'insertion), sinon 1er noeud (garantit toujours une racine
  //     sur un modele non vide). ---
  const rootOk =
    o.root != null &&
    (typeof model.hasNode === 'function' ? model.hasNode(o.root) : nodeIds.includes(o.root));
  let root = rootOk ? o.root : null;
  if (root == null) {
    root =
      nodeIds.find((id) => {
        const inCount = typeof model.inEdges === 'function' ? model.inEdges(id).length : 0;
        return inCount === 0;
      }) || nodeIds[0];
  }

  function build(id, d) {
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
    kids.forEach((childId) => build(childId, d + 1));
  }
  if (root != null) build(root, 0);
  // Filet couverture totale (foret/cycle) : composantes non atteintes depuis la
  // racine -> construites (visitees, children peuple) mais PAS rattachees comme
  // branche (pas de notion de gauche/droite pour un sous-arbre orphelin) -> elles
  // retombent sur le filet de position (0,0) plus bas. Garantit "jamais de trou".
  nodeIds.forEach((id) => {
    if (!visited.has(id)) build(id, 0);
  });

  // --- Charge d'un sous-arbre (hauteur cumulee des feuilles, ou nb de feuilles) ---
  const load = new Map();
  function weigh(id) {
    const kids = children.get(id) || [];
    if (kids.length === 0) {
      const w = byCount ? 1 : sizeOf(sizes, id).h;
      load.set(id, w);
      return w;
    }
    const w = kids.reduce((a, k) => a + weigh(k), 0);
    load.set(id, w);
    return w;
  }
  if (root != null) weigh(root);

  // --- Repartition gauche/droite des branches N1 (glouton : cote le moins charge ;
  //     egalite -> droite d'abord, deterministe, ordre d'insertion du modele) ---
  const topKids = children.get(root) || [];
  const right = [];
  const left = [];
  let rLoad = 0;
  let lLoad = 0;
  topKids.forEach((k) => {
    const w = load.get(k) || 0;
    if (rLoad <= lLoad) {
      right.push(k);
      rLoad += w;
    } else {
      left.push(k);
      lLoad += w;
    }
  });

  const pos = new Map();
  if (root != null) pos.set(root, { x: 0, y: 0 });

  // --- Largeur max par palier (depth >= 0, root inclus) : evite le chevauchement
  //     horizontal des noeuds larges — meme mecanique que tree.js maxByDepth. ---
  const maxWidthByDepth = new Map();
  nodeIds.forEach((id) => {
    const d = depth.get(id);
    if (d == null) return;
    const w = sizeOf(sizes, id).w;
    maxWidthByDepth.set(d, Math.max(maxWidthByDepth.get(d) || 0, w));
  });
  const maxDepth = Math.max(0, ...Array.from(maxWidthByDepth.keys()));
  // offsetAtDepth[0] = demi-largeur racine (edge droit/gauche de la racine, x=0).
  // offsetAtDepth[d] (d>=1) = cumul (extent palier precedent/2 + gap + extent
  // palier courant/2) -> distance signee depuis le centre, sans chevauchement.
  const offsetAtDepth = new Map();
  let acc = (maxWidthByDepth.get(0) || DEFAULT_SIZE.w) / 2;
  offsetAtDepth.set(0, 0); // la racine elle-meme reste toujours en x=0 (imposee)
  for (let d = 1; d <= maxDepth; d++) {
    const extent = maxWidthByDepth.get(d) || DEFAULT_SIZE.w;
    acc += gapX + extent / 2;
    offsetAtDepth.set(d, acc);
    acc += extent / 2;
  }

  // --- Un cote = arbre horizontal RT (profondeur -> x via offsetAtDepth ; feuilles
  //     empilees -> y, curseur global au cote -> pas de chevauchement vertical) ---
  function layoutSide(branchRoots, sign) {
    let cursorY = 0; // curseur d'empilement vertical (post-ordre), partage entre branches
    function place(id) {
      const kids = children.get(id) || [];
      const d = depth.get(id) || 0;
      const x = sign * (offsetAtDepth.get(d) || 0);
      let y;
      if (kids.length === 0) {
        const h = sizeOf(sizes, id).h;
        y = cursorY + h / 2;
        cursorY += h + gapY;
      } else {
        const ys = kids.map((k) => place(k));
        y = ys.reduce((a, b) => a + b, 0) / ys.length; // parent centre sur ses enfants
      }
      pos.set(id, { x, y });
      return y;
    }
    branchRoots.forEach((b) => place(b));
  }
  layoutSide(right, +1);
  layoutSide(left, -1);

  // Filet : tout noeud non place (defensif — composante orpheline non rattachee
  // comme branche) -> (0,0). Garantit une couverture totale, jamais de trou.
  nodeIds.forEach((id) => {
    if (!pos.has(id)) pos.set(id, { x: 0, y: 0 });
  });
  return pos;
}
