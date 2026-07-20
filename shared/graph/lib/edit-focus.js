// edit-focus.js — contrat de focus apres suppression noeud/arete en mode edition (#673, I5-1)
// Pur DOM-free (aucun `document`), testable Node — meme idiome que lib/spanning-tree.js.
//
// Arbitrage E valide (#662) : apres removeNode(id), le focus clavier doit se deplacer vers
// un noeud encore PRESENT dans le modele (WCAG 2.4.3). La destination DOIT etre calculee
// AVANT la mutation (l'index d'adjacence de `model` et l'arbre couvrant `tree` changent une
// fois le noeud retire) -> nextFocusAfterRemoval() lit `model`/`tree` en lecture SEULE,
// jamais mute, et n'est jamais appelee APRES removeNode() (cf. svg-renderer.js _deleteSelection()).
//
// Cascade de fallback (E) : 1er voisin (model.neighbors(), ordre out puis in, dedupe)
// -> parent dans l'arbre couvrant (tree.parent, #671) -> 1er noeud de l'ordre DFS
// (tree.order) different de `id` -> null (aucune autre destination possible).

/**
 * @param {import('../model/graph-model.js').GraphModel} model - modele AVANT suppression (id encore present)
 * @param {{parent:Map<string,string|null>, order:string[]}} tree - arbre couvrant courant (buildSpanningTree())
 * @param {string} id - id du noeud sur le point d'etre supprime
 * @returns {string|null} id de la destination de focus, ou null si aucune autre destination
 */
export function nextFocusAfterRemoval(model, tree, id) {
  // 1. voisin direct — exclut `id` lui-meme (defensif : une auto-boucle source===target===id
  //    ferait sinon apparaitre `id` comme "voisin de lui-meme", destination invalide puisque
  //    ce noeud est justement celui sur le point d'etre retire).
  const neighbors = (model && typeof model.neighbors === 'function' ? model.neighbors(id) : []).filter((nid) => nid !== id);
  if (neighbors.length) return neighbors[0];

  // 2. parent dans l'arbre couvrant — racine (parent null) n'est PAS une destination valide,
  //    continue vers le fallback suivant.
  const parent = tree && tree.parent ? tree.parent.get(id) : null;
  if (parent != null) return parent;

  // 3. 1er noeud de l'ordre DFS different de `id` (couvre les composants disjoints/isoles).
  const order = (tree && tree.order) || [];
  const fallback = order.find((nid) => nid !== id);
  if (fallback != null) return fallback;

  // 4. aucune autre destination possible (le graphe est reduit a ce seul noeud).
  return null;
}
