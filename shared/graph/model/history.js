// history.js — GraphHistory : pile undo/redo de patches inverses (#675, I5-3)
// Observe `graph:model:change` du GraphModel et, pour CHAQUE mutation, construit un
// « record » = { forward(model), inverse(model) } appliqué via les mutations EXISTANTES
// du modèle (addNode/removeNode/updateNode/addEdge/removeEdge/updateEdge — arbitrage A
// #662/#675, PAS de nouvelle surface `restore()` façon snapshot). Observable via
// `graph:history:change {canUndo,canRedo}` (idiome EventTarget du DS, cf. GraphModel #665).
//
// DOM-free (aucun `document`) — dépend uniquement du GraphModel (EventTarget) → testable
// Node sans jsdom, comme model/*, layout/*, render/port-drop.js, render/viewport.js (fns pures).
//
// COALESCING (arbitrage D, validé Mike) — 1 patch par SESSION : `beginTransaction()` /
// `commit()` encadrent une session côté renderer (édition inline complète, drag complet).
// Les records émis pendant une transaction ouverte sont groupés en UNE seule entrée undo.
// Les mutations atomiques hors transaction (create/delete) = 1 entrée chacune.
//
// RE-ENTRANCE — `undo()`/`redo()` réappliquent des mutations sur le modèle, qui RÉ-ÉMET
// `graph:model:change`. Le flag `_applying` fait ignorer ces events auto-infligés : sans lui
// un undo s'enregistrerait lui-même et la pile ne convergerait jamais.
//
// LIMITATION assumée du merge — l'inverse d'un `update-*` passe par `updateNode`/`updateEdge`
// qui MERGE `data` : il restaure les clés modifiées/supprimées mais ne peut pas RETIRER une
// clé qu'un patch forward aurait AJOUTÉE. La surface d'édition runtime du DS ne mute que des
// clés existantes (`data.label` en inline) ou `position`/`size` (remplacement atomique,
// invertible) → round-trip `toJSON()` EXACT pour toutes les opérations réelles et la DoD.

/** Deep clone tolérant (null/undefined passe tel quel). structuredClone = global Node 20+/navigateurs. */
function clone(v) {
  return v == null ? v : structuredClone(v);
}

/** Projection invertible d'un nœud (data + position/size optionnels), clonée. */
function projNode(n) {
  if (!n || typeof n !== 'object') return { data: {} };
  return { data: clone(n.data) || {}, position: clone(n.position), size: clone(n.size) };
}

/** Patch qui RESTAURE une projection nœud : `??null` -> supprime position/size si absente à l'origine. */
function patchFromNode(p) {
  return { data: p.data, position: p.position == null ? null : p.position, size: p.size == null ? null : p.size };
}

/**
 * Construit un record { forward, inverse } depuis le detail d'un `graph:model:change`.
 * Tous les snapshots sont CLONÉS (les events du GraphModel portent des références LIVE).
 * @returns {{forward:(m:any)=>void, inverse:(m:any)=>void}|null}
 */
export function buildRecord(detail) {
  if (!detail || !detail.op) return null;
  const id = detail.id;
  switch (detail.op) {
    case 'add-node': {
      const snap = clone(detail.node);
      return { forward: (m) => m.addNode(clone(snap)), inverse: (m) => m.removeNode(id) };
    }
    case 'remove-node': {
      const node = clone(detail.node);
      const edges = (detail.removedEdges || []).map(clone);
      return {
        forward: (m) => m.removeNode(id),
        inverse: (m) => {
          m.addNode(clone(node));
          edges.forEach((edge) => m.addEdge(clone(edge)));
        },
      };
    }
    case 'add-edge': {
      const snap = clone(detail.edge);
      return { forward: (m) => m.addEdge(clone(snap)), inverse: (m) => m.removeEdge(id) };
    }
    case 'remove-edge': {
      const snap = clone(detail.edge);
      return { forward: (m) => m.removeEdge(id), inverse: (m) => m.addEdge(clone(snap)) };
    }
    case 'update-node': {
      const after = projNode(detail.node);
      const before = projNode(detail.prev);
      return {
        forward: (m) => m.updateNode(id, patchFromNode(after)),
        inverse: (m) => m.updateNode(id, patchFromNode(before)),
      };
    }
    case 'update-edge': {
      const afterData = clone(detail.edge && detail.edge.data) || {};
      const beforeData = clone(detail.prev && detail.prev.data) || {};
      return {
        forward: (m) => m.updateEdge(id, { data: afterData }),
        inverse: (m) => m.updateEdge(id, { data: beforeData }),
      };
    }
    default:
      return null;
  }
}

export class GraphHistory extends EventTarget {
  #model;
  #undo = []; // Array<Entry>  Entry = Array<Record> (une entrée = une session/mutation)
  #redo = [];
  #applying = false; // garde de re-entrance pendant undo()/redo()
  #txnDepth = 0;
  #txn = null; // Array<Record> de la transaction en cours

  /** @param {import('./graph-model.js').GraphModel} model */
  constructor(model) {
    super();
    this.#model = model;
    this._onChange = this._onChange.bind(this);
    model.addEventListener('graph:model:change', this._onChange);
  }

  get canUndo() {
    return this.#undo.length > 0;
  }

  get canRedo() {
    return this.#redo.length > 0;
  }

  /** Nombre d'entrées undo empilées (diagnostic/test). */
  get depth() {
    return this.#undo.length;
  }

  /** Ouvre (ou ré-entre dans) une transaction — les records suivants sont coalescés. */
  beginTransaction() {
    if (this.#txnDepth === 0) this.#txn = [];
    this.#txnDepth++;
  }

  /** Ferme la transaction racine : pousse les records groupés en UNE entrée (no-op si vide). */
  commit() {
    if (this.#txnDepth === 0) return; // commit défensif sans begin -> ignore
    this.#txnDepth--;
    if (this.#txnDepth > 0) return; // transaction imbriquée : attendre le commit racine
    const txn = this.#txn;
    this.#txn = null;
    if (txn && txn.length) {
      this.#undo.push(txn);
      this.#redo.length = 0;
      this._notify();
    }
  }

  undo() {
    if (!this.#undo.length) return false;
    const entry = this.#undo.pop();
    this._apply(() => {
      for (let i = entry.length - 1; i >= 0; i--) entry[i].inverse(this.#model);
    });
    this.#redo.push(entry);
    this._notify();
    return true;
  }

  redo() {
    if (!this.#redo.length) return false;
    const entry = this.#redo.pop();
    this._apply(() => {
      for (let i = 0; i < entry.length; i++) entry[i].forward(this.#model);
    });
    this.#undo.push(entry);
    this._notify();
    return true;
  }

  destroy() {
    this.#model.removeEventListener('graph:model:change', this._onChange);
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#txn = null;
    this.#txnDepth = 0;
  }

  _apply(fn) {
    this.#applying = true;
    try {
      fn();
    } finally {
      this.#applying = false;
    }
  }

  _onChange(e) {
    if (this.#applying) return; // mutation causée par notre propre undo/redo -> ne pas enregistrer
    const rec = buildRecord(e && e.detail);
    if (!rec) return;
    if (this.#txnDepth > 0) {
      this.#txn.push(rec);
      return;
    }
    this.#undo.push([rec]);
    this.#redo.length = 0;
    this._notify();
  }

  _notify() {
    this.dispatchEvent(
      new CustomEvent('graph:history:change', { detail: { canUndo: this.canUndo, canRedo: this.canRedo } }),
    );
  }
}
