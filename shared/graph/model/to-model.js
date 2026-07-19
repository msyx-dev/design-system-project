// to-model.js — normalisation tolerante GraphData (#665, I1b-1)
// Pure, DOM-free, jamais de throw. Invariants "lenient" : console.warn + skip.
// Reference : spec issue #665 (section 5 "toModel(input) — normalisation tolerante").
//
// schemaVersion PROVISOIRE — non fige avant round-trip nexus, cf. #658 / #665.
export const SCHEMA_VERSION = 1;

function warn(msg) {
  console.warn(`[GraphModel] ${msg}`);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Normalise une entree GraphData (ou { nodes, edges } nu) en GraphData propre,
 * consommee par le constructeur GraphModel. Ne leve jamais d'exception :
 * toute anomalie est corrigee (id genere) ou l'element est ecarte (warn + drop).
 *
 * @param {Object} input
 * @returns {{ schemaVersion:number, meta:Object, nodes:Array, edges:Array }}
 */
export function toModel(input) {
  const src = input && typeof input === 'object' ? input : {};
  const meta = src.meta && typeof src.meta === 'object' ? { ...src.meta } : {};
  const schemaVersion = typeof src.schemaVersion === 'number' ? src.schemaVersion : SCHEMA_VERSION;

  const rawNodes = Array.isArray(src.nodes) ? src.nodes : [];
  const rawEdges = Array.isArray(src.edges) ? src.edges : [];

  // Namespace d'id partage noeuds ∪ aretes (invariant 1).
  const usedIds = new Set();
  const nodes = [];

  rawNodes.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      warn(`toModel: noeud #${index} ignore (entree invalide)`);
      return;
    }
    const data = raw.data && typeof raw.data === 'object' ? { ...raw.data } : {};
    let id = isNonEmptyString(data.id) ? data.id.trim() : '';
    if (!id) {
      id = `n${index}`;
      warn(`toModel: noeud #${index} sans id -> id genere "${id}" (invariant 2)`);
    }
    if (usedIds.has(id)) {
      warn(`toModel: noeud id "${id}" duplique -> occurrence ignoree (invariant 1)`);
      return;
    }
    usedIds.add(id);
    data.id = id;
    const node = { data };
    if (raw.position && typeof raw.position === 'object') {
      node.position = { ...raw.position };
    }
    if (raw.size && typeof raw.size === 'object') {
      node.size = { ...raw.size };
    }
    nodes.push(node);
  });

  const nodeIds = new Set(nodes.map((n) => n.data.id));
  const edges = [];

  rawEdges.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      warn(`toModel: arete #${index} ignoree (entree invalide)`);
      return;
    }
    const data = raw.data && typeof raw.data === 'object' ? { ...raw.data } : {};
    let id = isNonEmptyString(data.id) ? data.id.trim() : '';
    if (!id) {
      id = `e${index}`;
      warn(`toModel: arete #${index} sans id -> id genere "${id}" (invariant 2)`);
    }
    if (usedIds.has(id)) {
      warn(`toModel: arete id "${id}" en collision (namespace noeuds/aretes partage) -> ignoree (invariant 1)`);
      return;
    }
    const source = isNonEmptyString(data.source) ? data.source.trim() : '';
    const target = isNonEmptyString(data.target) ? data.target.trim() : '';
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      const missing = !nodeIds.has(source) ? source || '(vide)' : target || '(vide)';
      warn(`toModel: arete "${id}" pendante -> extremite manquante "${missing}" -> ignoree (invariant 3)`);
      return;
    }
    usedIds.add(id);
    data.id = id;
    data.source = source;
    data.target = target;
    edges.push({ data });
  });

  return { schemaVersion, meta, nodes, edges };
}
