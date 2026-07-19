// detect.js — heuristique de layout par defaut, PURE, DOM-free (#669, I3-1)
// N'IMPORTE PAS le registre (evite tout couplage) : retourne un NOM de layout (string).
// Consomme uniquement l'index d'adjacence du modele (aucun recalcul de graphe).

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @returns {'tree'|'layered'|'fixed'} nom du layout ideal (choix cible, avant degradation)
 */
export function detectLayout(model) {
  const nodes = model.nodes;
  if (nodes.length === 0) return 'fixed';

  const roots = nodes.filter((n) => model.inEdges(n.data.id).length === 0);

  // Acyclicite : DFS sur outEdges (detection back-edge). Depart = racines, filet = tous.
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map(nodes.map((n) => [n.data.id, WHITE]));
  let hasCycle = false;
  function dfs(id) {
    color.set(id, GRAY);
    for (const e of model.outEdges(id)) {
      const t = e.data.target;
      if (color.get(t) === GRAY) {
        hasCycle = true;
        return;
      }
      if (color.get(t) === WHITE) {
        dfs(t);
        if (hasCycle) return;
      }
    }
    color.set(id, BLACK);
  }
  roots.forEach((n) => {
    if (color.get(n.data.id) === WHITE) dfs(n.data.id);
  });
  nodes.forEach((n) => {
    if (color.get(n.data.id) === WHITE) dfs(n.data.id);
  });

  if (hasCycle) return 'layered'; // cyclique -> Sugiyama (gere les cycles)
  if (roots.length === 1) return 'tree'; // 1 racine acyclique -> arbre
  return 'layered'; // DAG multi-racines -> couches
}
