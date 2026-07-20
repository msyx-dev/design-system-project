// spanning-tree.js — arbre couvrant deterministe pour la nav clavier du graphe (#671, I4-1)
// Pur DOM-free (aucun `document`), testable Node — meme idiome que layout/*.js
// (fonctions pures qui consomment un GraphModel en lecture seule, jamais mute).
//
// Mapping clavier WAI-ARIA APG tree (svg-renderer.js _handleNodeKey) : ↑=parent,
// ↓=1er enfant, ←/→=frere precedent/suivant, Home/End=order[0]/order[dernier].
// Les cross-edges (hors arbre couvrant) restent couvertes par la table a11y
// (alternative invariante) — annoncees dynamiquement en I4-2 (#672, live-region).

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @param {string} [rootId] - racine souhaitee (ex. layoutOptions.root) ; si absente du
 *   modele, fallback au premier noeud de `model.nodes` (ordre d'insertion, deterministe).
 * @returns {{parent:Map<string,string|null>, children:Map<string,string[]>, order:string[], roots:string[]}}
 */
export function buildSpanningTree(model, rootId) {
  const parent = new Map();
  const children = new Map();
  const order = [];
  const roots = [];
  const visited = new Set();

  const ids = model.nodes.map((n) => n.data.id);
  if (ids.length === 0) return { parent, children, order, roots };

  // DFS deterministe : `model.neighbors(id)` est deja ordonne (out puis in, insertion
  // order, deduplique) — cf. graph-model.js. Le 1er voisin non-visite gagne le lien
  // parent -> aucune reassignation ulterieure (garantit "1 seul parent par noeud").
  function dfs(id) {
    visited.add(id);
    order.push(id);
    if (!children.has(id)) children.set(id, []);
    model.neighbors(id).forEach((nb) => {
      if (visited.has(nb)) return; // deja rattache (1er parent gagne) OU cycle -> skip
      parent.set(nb, id);
      children.get(id).push(nb);
      dfs(nb);
    });
  }

  const firstRoot = rootId != null && model.hasNode(rootId) ? rootId : ids[0];
  parent.set(firstRoot, null);
  roots.push(firstRoot);
  dfs(firstRoot);

  // Composants disjoints -> racines successives dans l'ordre `model.nodes` (foret).
  ids.forEach((id) => {
    if (visited.has(id)) return;
    parent.set(id, null);
    roots.push(id);
    dfs(id);
  });

  return { parent, children, order, roots };
}
