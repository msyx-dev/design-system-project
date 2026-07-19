// node-types.js — resolution du type de noeud (classe+icone) + graphCard() (#666, I1b-2)
// graphCard() est le support "noeud riche" (NHOOD) : compose des composants DS
// existants (.card/.badge/.chip) dans un HTMLElement destine a un <foreignObject>.

/**
 * @param {{data:Object}} node
 * @param {Object} [nodeTypes] - opts.nodeTypes de createGraph(), ex: {serveur:{className,icon}}
 * @returns {{className:string, icon:string|null}}
 */
export function resolveNodeType(node, nodeTypes) {
  const type = node && node.data ? node.data.type : undefined;
  const cfg = (nodeTypes && type && nodeTypes[type]) || {};
  return {
    className: cfg.className || '',
    icon: cfg.icon || null,
  };
}

/**
 * Noeud riche par defaut (label multi-ligne + badge statut + chip personne). Utilise
 * quand `node.data.rich` est vrai et qu'aucun `opts.renderNode` custom n'est fourni.
 * JAMAIS de statut porte par la seule couleur (libelle texte dans le badge).
 * @param {{data:Object}} node
 * @returns {HTMLElement}
 */
export function graphCard(node) {
  const data = (node && node.data) || {};
  const wrap = document.createElement('div');
  wrap.className = 'card graph-node-card';
  if (data.category) {
    wrap.dataset.category = data.category;
  }

  const title = document.createElement('div');
  title.className = 'graph-node-card-title';
  title.textContent = data.label || data.id || '';
  wrap.appendChild(title);

  if (data.status) {
    const badge = document.createElement('span');
    badge.className = 'badge graph-node-card-badge';
    badge.textContent = data.status;
    wrap.appendChild(badge);
  }

  if (data.assignee) {
    const chip = document.createElement('span');
    chip.className = 'chip graph-node-card-chip';
    chip.textContent = data.assignee;
    wrap.appendChild(chip);
  }

  return wrap;
}
