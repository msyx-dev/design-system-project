// port-drop.js — désambiguïsation du nœud cible au drop d'un drag port->cible (#674, I5-2)
// Pur DOM-free (aucun `document`), testable Node — même idiome que lib/edit-focus.js /
// lib/spanning-tree.js (fonctions pures) et render/viewport.js (clampZoom/userToWorld/...).
//
// Contrat (#662 arbitrage C, spec #674) : au drop d'un drag démarré depuis un port, plusieurs
// nœuds peuvent chevaucher le point (AABB qui se recouvrent, ex. layouts denses/zoom-out).
// La cible = le nœud DONT LE CENTRE EST LE PLUS PROCHE du point de drop, parmi les nœuds dont
// la boîte englobante (AABB, centre ± taille/2) CONTIENT ce point. `excludeId` (le nœud
// source du drag) est TOUJOURS exclu -> un drop sur son propre port n'auto-boucle jamais
// (même filet que `_handleConnectClick` en I5-1, `svg-renderer.js`).
//
// Divergence documentée vs le texte spec (« au drop, `_hitTest` du point ») : `_hitTest()`
// (elementFromPoint) renvoie le nœud au-dessus en z-order, PAS le centre le plus proche —
// insuffisant pour la désambiguïsation demandée. Cette fonction géométrique la remplace pour
// les ports (immunisée aussi au retargeting `setPointerCapture`, cf. commentaire `_hitTest`).

/**
 * @param {Map<string,{x:number,y:number}>} positions - centres monde (Map, cf. _applyLayout)
 * @param {Map<string,{w:number,h:number}>} sizes - tailles effectives (Map, cf. measure())
 * @param {{x:number,y:number}} point - point monde du drop
 * @param {string} [excludeId] - id à exclure (le nœud source du drag, jamais sa propre cible)
 * @returns {string|null} id du nœud cible, ou null si aucun nœud ne contient le point
 */
export function nearestNodeAt(positions, sizes, point, excludeId) {
  if (!positions || !point) return null;
  let bestId = null;
  let bestDist = Infinity;
  positions.forEach((center, id) => {
    if (id === excludeId) return;
    const size = (sizes && sizes.get(id)) || { w: 0, h: 0 };
    const left = center.x - size.w / 2;
    const top = center.y - size.h / 2;
    const withinX = point.x >= left && point.x <= left + size.w;
    const withinY = point.y >= top && point.y <= top + size.h;
    if (!withinX || !withinY) return;
    const dist = Math.hypot(center.x - point.x, center.y - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  });
  return bestId;
}
