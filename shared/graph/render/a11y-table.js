// a11y-table.js — alternative tabulaire, contrat a11y PRIMAIRE (#666, I1b-2, WCAG 1.1.1/1.3.1)
// graphToTableModel() est PURE/DOM-free (testable Node, tests/regression/graph-layout.test.js).
// renderA11yTable() est la couche DOM mince par-dessus, reconstruite a chaque repaint
// (synchrone au modele) — invariante : survivra a un futur renderer Canvas/LOD.

function labelOf(node) {
  return (node && node.data && (node.data.label || node.data.id)) || '';
}

/**
 * Derive une restitution tabulaire depuis {nodes,edges}. PURE — aucun acces DOM.
 * @param {import('../model/graph-model.js').GraphModel} model
 * @returns {{caption:string, rows:Array<{id:string,label:string,type:string,out:string[],in:string[]}>}}
 */
export function graphToTableModel(model) {
  const nodes = model.nodes;
  const edges = model.edges;
  const byId = new Map(nodes.map((n) => [n.data.id, n]));
  const rows = nodes.map((n) => {
    const outIds = (typeof model.outEdges === 'function' ? model.outEdges(n.data.id) : []).map(
      (e) => e.data.target
    );
    const inIds = (typeof model.inEdges === 'function' ? model.inEdges(n.data.id) : []).map(
      (e) => e.data.source
    );
    return {
      id: n.data.id,
      label: labelOf(n),
      type: (n.data && n.data.type) || '',
      out: outIds.map((id) => labelOf(byId.get(id)) || id),
      in: inIds.map((id) => labelOf(byId.get(id)) || id),
    };
  });
  return {
    caption: `${nodes.length} nœud${nodes.length > 1 ? 's' : ''}, ${edges.length} arête${edges.length > 1 ? 's' : ''}`,
    rows,
  };
}

/**
 * Construit/reconstruit le DOM `.graph-a11y` (details+table) dans `container`.
 * @param {import('../model/graph-model.js').GraphModel} model
 * @param {HTMLElement} container - le `.graph-a11y#graph-{uid}-desc`
 * @param {string} [title]
 */
export function renderA11yTable(model, container, title) {
  const { caption, rows } = graphToTableModel(model);
  const heading = title || 'Graphe';
  container.innerHTML = '';

  const details = document.createElement('details');
  details.className = 'graph-a11y-details';
  details.open = true;

  const summary = document.createElement('summary');
  summary.textContent = `${heading} (représentation tabulaire)`;
  details.appendChild(summary);

  const table = document.createElement('table');
  table.className = 'graph-table';

  const captionEl = document.createElement('caption');
  captionEl.textContent = `${heading} — ${caption}`;
  table.appendChild(captionEl);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Nœud', 'Type', 'Relations'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');

    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = row.label;
    tr.appendChild(th);

    const tdType = document.createElement('td');
    tdType.textContent = row.type;
    tr.appendChild(tdType);

    const tdRel = document.createElement('td');
    const parts = [];
    if (row.out.length) parts.push(`→ ${row.out.join(', ')}`);
    if (row.in.length) parts.push(`← ${row.in.join(', ')}`);
    tdRel.textContent = parts.join(' · ') || '—';
    tr.appendChild(tdRel);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  details.appendChild(table);
  container.appendChild(details);
}
