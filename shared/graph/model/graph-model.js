// graph-model.js — GraphModel : structure node-link plate, data pure (#665, I1b-1)
// DOM-free (aucun `document`, aucun acces DOM), observable via
// `dispatchEvent(new CustomEvent('graph:model:change', { detail, bubbles:true }))`.
// Idiome DS deja utilise 18x dans components.js (canonique : split:resize).
// Testable sans DOM/jsdom : EventTarget/CustomEvent sont des globals Node 20.
//
// Shape Cytoscape-aligne ("elements object form") : la semantique (type, label,
// category, status, assignee...) vit dans `data{}` ; la geometrie (`position`,
// `size`) est un sibling optionnel de `data`. `size` est PORTE, jamais mesure
// (la mesure getBBox() est un concern du renderer I1b-2, pas du modele).
//
// schemaVersion PROVISOIRE — non fige avant round-trip nexus, cf. #658 / #665.
// Aucune logique version-gated : une entree schemaVersion:2 (ou plus) n'est ni
// rejetee ni migree (comportement forward-tolerant).
//
// Invariants imposes (lenient : console.warn + skip, JAMAIS de throw) :
//   1. Id unique sur nœuds ∪ arêtes (namespace partage, façon Cytoscape).
//   2. Id non vide — genere en entree (toModel), skip en mutation runtime.
//   3. Arete -> nœuds existants (sinon pendante -> skip).
//   4. Pas d'arete pendante persistante — removeNode cascade ses aretes incidentes.
//   5. Immuabilite — updateNode/updateEdge ne changent jamais id (ni source/target).
import { toModel, SCHEMA_VERSION } from './to-model.js';

function warn(msg) {
  console.warn(`[GraphModel] ${msg}`);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== '';
}

function cloneObj(obj) {
  return obj && typeof obj === 'object' ? structuredClone(obj) : {};
}

export class GraphModel extends EventTarget {
  /** @type {number} PROVISOIRE — voir reserve en tete de fichier. */
  static SCHEMA_VERSION = SCHEMA_VERSION;

  #schemaVersion;
  #meta;
  #nodes = new Map();
  #edges = new Map();
  #adjacency = new Map();

  /**
   * @param {Object} [input] GraphData | { nodes, edges } nu — passe a toModel() en interne.
   *   La construction n'emet AUCUN evenement (pas encore d'abonnes).
   */
  constructor(input) {
    super();
    const normalized = toModel(input);
    this.#schemaVersion = normalized.schemaVersion;
    this.#meta = normalized.meta;

    normalized.nodes.forEach((node) => {
      this.#nodes.set(node.data.id, node);
      this.#adjacency.set(node.data.id, { in: [], out: [] });
    });
    normalized.edges.forEach((edge) => {
      this.#edges.set(edge.data.id, edge);
      this.#link(edge);
    });
  }

  // ---- 3.1 Lecture (acces) ----

  get schemaVersion() {
    return this.#schemaVersion;
  }

  get meta() {
    return this.#meta;
  }

  /** GraphNode[] — read-only par contrat (muter via l'API, jamais en place). */
  get nodes() {
    return Array.from(this.#nodes.values());
  }

  /** GraphEdge[] — read-only par contrat (muter via l'API, jamais en place). */
  get edges() {
    return Array.from(this.#edges.values());
  }

  get nodeCount() {
    return this.#nodes.size;
  }

  get edgeCount() {
    return this.#edges.size;
  }

  getNode(id) {
    return this.#nodes.get(id);
  }

  getEdge(id) {
    return this.#edges.get(id);
  }

  hasNode(id) {
    return this.#nodes.has(id);
  }

  hasEdge(id) {
    return this.#edges.has(id);
  }

  // ---- 3.2 Index d'adjacence (maintenu incrementalement) ----

  /** Map<nodeId, { in: GraphEdge[], out: GraphEdge[] }> — LIVE. */
  get adjacency() {
    return this.#adjacency;
  }

  inEdges(nodeId) {
    const entry = this.#adjacency.get(nodeId);
    return entry ? entry.in : [];
  }

  outEdges(nodeId) {
    const entry = this.#adjacency.get(nodeId);
    return entry ? entry.out : [];
  }

  /** ids voisins = endpoints de (in ∪ out), deduplique — independant de `directed`. */
  neighbors(nodeId) {
    const entry = this.#adjacency.get(nodeId);
    if (!entry) return [];
    const ids = new Set();
    entry.out.forEach((e) => ids.add(e.data.target));
    entry.in.forEach((e) => ids.add(e.data.source));
    return Array.from(ids);
  }

  #link(edge) {
    const { source, target } = edge.data;
    const sourceAdj = this.#adjacency.get(source);
    if (sourceAdj) sourceAdj.out.push(edge);
    const targetAdj = this.#adjacency.get(target);
    if (targetAdj) targetAdj.in.push(edge);
  }

  #unlink(edge) {
    const { source, target } = edge.data;
    const sourceAdj = this.#adjacency.get(source);
    if (sourceAdj) {
      const i = sourceAdj.out.indexOf(edge);
      if (i >= 0) sourceAdj.out.splice(i, 1);
    }
    const targetAdj = this.#adjacency.get(target);
    if (targetAdj) {
      const i = targetAdj.in.indexOf(edge);
      if (i >= 0) targetAdj.in.splice(i, 1);
    }
  }

  #emit(detail) {
    this.dispatchEvent(new CustomEvent('graph:model:change', { detail, bubbles: true }));
  }

  // ---- 3.3 Mutations — atomiques, 1 op => 1 event (uniquement si effectif) ----

  addNode(node) {
    const data = node && typeof node === 'object' && node.data && typeof node.data === 'object' ? node.data : null;
    const id = data && isNonEmptyString(data.id) ? data.id.trim() : '';
    if (!id) {
      warn('addNode: id manquant ou vide -> ignore');
      return;
    }
    if (this.#nodes.has(id) || this.#edges.has(id)) {
      warn(`addNode: id "${id}" deja utilise (namespace noeuds/aretes partage) -> ignore`);
      return;
    }
    const normalized = { data: { ...cloneObj(data), id } };
    if (node.position && typeof node.position === 'object') normalized.position = cloneObj(node.position);
    if (node.size && typeof node.size === 'object') normalized.size = cloneObj(node.size);
    this.#nodes.set(id, normalized);
    this.#adjacency.set(id, { in: [], out: [] });
    this.#emit({ op: 'add-node', id, node: normalized });
  }

  updateNode(id, patch) {
    if (!this.#nodes.has(id)) {
      warn(`updateNode: id "${id}" introuvable -> ignore`);
      return;
    }
    const existing = this.#nodes.get(id);
    const p = patch && typeof patch === 'object' ? patch : {};

    if (p.data && typeof p.data === 'object') {
      if ('id' in p.data && p.data.id !== existing.data.id) {
        warn(`updateNode: id "${id}" immuable -> patch.data.id ignore`);
      }
      const nextData = { ...existing.data, ...p.data, id: existing.data.id };
      existing.data = nextData;
    }
    if (Object.prototype.hasOwnProperty.call(p, 'position')) {
      if (p.position && typeof p.position === 'object') {
        existing.position = cloneObj(p.position);
      } else {
        delete existing.position;
      }
    }
    if (Object.prototype.hasOwnProperty.call(p, 'size')) {
      if (p.size && typeof p.size === 'object') {
        existing.size = cloneObj(p.size);
      } else {
        delete existing.size;
      }
    }
    this.#emit({ op: 'update-node', id, node: existing, patch: p });
  }

  removeNode(id) {
    if (!this.#nodes.has(id)) {
      warn(`removeNode: id "${id}" introuvable -> ignore`);
      return;
    }
    const node = this.#nodes.get(id);
    const adj = this.#adjacency.get(id) || { in: [], out: [] };

    const removedEdgesById = new Map();
    [...adj.out, ...adj.in].forEach((e) => removedEdgesById.set(e.data.id, e));
    const removedEdges = Array.from(removedEdgesById.values());

    removedEdges.forEach((edge) => {
      this.#unlink(edge);
      this.#edges.delete(edge.data.id);
    });

    this.#nodes.delete(id);
    this.#adjacency.delete(id);
    this.#emit({ op: 'remove-node', id, node, removedEdges });
  }

  addEdge(edge) {
    const data = edge && typeof edge === 'object' && edge.data && typeof edge.data === 'object' ? edge.data : null;
    const id = data && isNonEmptyString(data.id) ? data.id.trim() : '';
    if (!id) {
      warn('addEdge: id manquant ou vide -> ignore');
      return;
    }
    if (this.#nodes.has(id) || this.#edges.has(id)) {
      warn(`addEdge: id "${id}" deja utilise (namespace noeuds/aretes partage) -> ignore`);
      return;
    }
    const source = isNonEmptyString(data.source) ? data.source.trim() : '';
    const target = isNonEmptyString(data.target) ? data.target.trim() : '';
    if (!this.#nodes.has(source) || !this.#nodes.has(target)) {
      const missing = !this.#nodes.has(source) ? source || '(vide)' : target || '(vide)';
      warn(`addEdge: arete "${id}" pendante -> extremite manquante "${missing}" -> ignoree`);
      return;
    }
    const normalized = { data: { ...cloneObj(data), id, source, target } };
    this.#edges.set(id, normalized);
    this.#link(normalized);
    this.#emit({ op: 'add-edge', id, edge: normalized });
  }

  updateEdge(id, patch) {
    if (!this.#edges.has(id)) {
      warn(`updateEdge: id "${id}" introuvable -> ignore`);
      return;
    }
    const existing = this.#edges.get(id);
    const p = patch && typeof patch === 'object' ? patch : {};

    if (p.data && typeof p.data === 'object') {
      const attemptedImmutable =
        ('id' in p.data && p.data.id !== existing.data.id) ||
        ('source' in p.data && p.data.source !== existing.data.source) ||
        ('target' in p.data && p.data.target !== existing.data.target);
      if (attemptedImmutable) {
        warn(`updateEdge: id/source/target de "${id}" immuables -> cles ignorees dans le patch`);
      }
      const nextData = {
        ...existing.data,
        ...p.data,
        id: existing.data.id,
        source: existing.data.source,
        target: existing.data.target,
      };
      existing.data = nextData;
    }
    this.#emit({ op: 'update-edge', id, edge: existing, patch: p });
  }

  removeEdge(id) {
    if (!this.#edges.has(id)) {
      warn(`removeEdge: id "${id}" introuvable -> ignore`);
      return;
    }
    const edge = this.#edges.get(id);
    this.#unlink(edge);
    this.#edges.delete(id);
    this.#emit({ op: 'remove-edge', id, edge });
  }

  /** GraphData — DEEP clone { schemaVersion, meta, nodes, edges }. Round-trip garanti. */
  toJSON() {
    return {
      schemaVersion: this.#schemaVersion,
      meta: structuredClone(this.#meta),
      nodes: structuredClone(this.nodes),
      edges: structuredClone(this.edges),
    };
  }
}
