/* GENERE — ne pas editer a la main. Source: shared/graph/. Regenerer via ./shared/graph/build.sh (#666, --external dagre #670) */
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // shared/graph/layout/layered.js
  var layered_exports = {};
  __export(layered_exports, {
    layeredLayout: () => layeredLayout
  });
  function sizeOf4(sizes, id) {
    const s = sizes && sizes.get(id);
    return s && typeof s.w === "number" && typeof s.h === "number" ? s : DEFAULT_SIZE4;
  }
  function loadDagre() {
    if (!_dagrePromise) {
      const spec = typeof window !== "undefined" ? "/shared/graph/vendor/graph-layered.js" : "../vendor/graph-layered.js";
      _dagrePromise = import(spec);
    }
    return _dagrePromise;
  }
  async function layeredLayout(model, opts) {
    const o = opts || {};
    const sizes = o.sizes || /* @__PURE__ */ new Map();
    const mod = await loadDagre();
    const dagre = mod.default || mod;
    const g = new dagre.graphlib.Graph({ directed: true, multigraph: true, compound: false });
    g.setGraph({
      rankdir: o.direction === "LR" ? "LR" : "TB",
      nodesep: o.gap && o.gap.x || 32,
      ranksep: o.gap && o.gap.y || 48,
      marginx: 0,
      marginy: 0
    });
    g.setDefaultEdgeLabel(() => ({}));
    model.nodes.forEach((n) => {
      const s = sizeOf4(sizes, n.data.id);
      g.setNode(n.data.id, { width: s.w, height: s.h });
    });
    model.edges.forEach((e) => g.setEdge(e.data.source, e.data.target, {}, e.data.id));
    dagre.layout(g);
    const pos = /* @__PURE__ */ new Map();
    g.nodes().forEach((id) => {
      const nd = g.node(id);
      if (nd) pos.set(id, { x: nd.x, y: nd.y });
    });
    model.nodes.forEach((n) => {
      if (!pos.has(n.data.id)) pos.set(n.data.id, { x: 0, y: 0 });
    });
    return pos;
  }
  var DEFAULT_SIZE4, _dagrePromise;
  var init_layered = __esm({
    "shared/graph/layout/layered.js"() {
      DEFAULT_SIZE4 = { w: 120, h: 40 };
      _dagrePromise = null;
    }
  });

  // shared/graph/lib/svg.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] != null) el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  }

  // shared/graph/lib/spanning-tree.js
  function buildSpanningTree(model, rootId) {
    const parent = /* @__PURE__ */ new Map();
    const children = /* @__PURE__ */ new Map();
    const order = [];
    const roots = [];
    const visited = /* @__PURE__ */ new Set();
    const ids = model.nodes.map((n) => n.data.id);
    if (ids.length === 0) return { parent, children, order, roots };
    function dfs(id) {
      visited.add(id);
      order.push(id);
      if (!children.has(id)) children.set(id, []);
      model.neighbors(id).forEach((nb) => {
        if (visited.has(nb)) return;
        parent.set(nb, id);
        children.get(id).push(nb);
        dfs(nb);
      });
    }
    const firstRoot = rootId != null && model.hasNode(rootId) ? rootId : ids[0];
    parent.set(firstRoot, null);
    roots.push(firstRoot);
    dfs(firstRoot);
    ids.forEach((id) => {
      if (visited.has(id)) return;
      parent.set(id, null);
      roots.push(id);
      dfs(id);
    });
    return { parent, children, order, roots };
  }

  // shared/graph/lib/edit-focus.js
  function nextFocusAfterRemoval(model, tree, id) {
    const neighbors = (model && typeof model.neighbors === "function" ? model.neighbors(id) : []).filter((nid) => nid !== id);
    if (neighbors.length) return neighbors[0];
    const parent = tree && tree.parent ? tree.parent.get(id) : null;
    if (parent != null) return parent;
    const order = tree && tree.order || [];
    const fallback = order.find((nid) => nid !== id);
    if (fallback != null) return fallback;
    return null;
  }

  // shared/graph/model/to-model.js
  var SCHEMA_VERSION = 1;
  function warn(msg) {
    console.warn(`[GraphModel] ${msg}`);
  }
  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim() !== "";
  }
  function toModel(input) {
    const src = input && typeof input === "object" ? input : {};
    const meta = src.meta && typeof src.meta === "object" ? { ...src.meta } : {};
    const schemaVersion = typeof src.schemaVersion === "number" ? src.schemaVersion : SCHEMA_VERSION;
    const rawNodes = Array.isArray(src.nodes) ? src.nodes : [];
    const rawEdges = Array.isArray(src.edges) ? src.edges : [];
    const usedIds = /* @__PURE__ */ new Set();
    const nodes = [];
    rawNodes.forEach((raw, index) => {
      if (!raw || typeof raw !== "object") {
        warn(`toModel: noeud #${index} ignore (entree invalide)`);
        return;
      }
      const data = raw.data && typeof raw.data === "object" ? { ...raw.data } : {};
      let id = isNonEmptyString(data.id) ? data.id.trim() : "";
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
      if (raw.position && typeof raw.position === "object") {
        node.position = { ...raw.position };
      }
      if (raw.size && typeof raw.size === "object") {
        node.size = { ...raw.size };
      }
      nodes.push(node);
    });
    const nodeIds = new Set(nodes.map((n) => n.data.id));
    const edges = [];
    rawEdges.forEach((raw, index) => {
      if (!raw || typeof raw !== "object") {
        warn(`toModel: arete #${index} ignoree (entree invalide)`);
        return;
      }
      const data = raw.data && typeof raw.data === "object" ? { ...raw.data } : {};
      let id = isNonEmptyString(data.id) ? data.id.trim() : "";
      if (!id) {
        id = `e${index}`;
        warn(`toModel: arete #${index} sans id -> id genere "${id}" (invariant 2)`);
      }
      if (usedIds.has(id)) {
        warn(`toModel: arete id "${id}" en collision (namespace noeuds/aretes partage) -> ignoree (invariant 1)`);
        return;
      }
      const source = isNonEmptyString(data.source) ? data.source.trim() : "";
      const target = isNonEmptyString(data.target) ? data.target.trim() : "";
      if (!nodeIds.has(source) || !nodeIds.has(target)) {
        const missing = !nodeIds.has(source) ? source || "(vide)" : target || "(vide)";
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

  // shared/graph/model/graph-model.js
  function warn2(msg) {
    console.warn(`[GraphModel] ${msg}`);
  }
  function isNonEmptyString2(v) {
    return typeof v === "string" && v.trim() !== "";
  }
  function cloneObj(obj) {
    return obj && typeof obj === "object" ? structuredClone(obj) : {};
  }
  var _schemaVersion, _meta, _nodes, _edges, _adjacency, _GraphModel_instances, link_fn, unlink_fn, emit_fn;
  var GraphModel = class extends EventTarget {
    /**
     * @param {Object} [input] GraphData | { nodes, edges } nu — passe a toModel() en interne.
     *   La construction n'emet AUCUN evenement (pas encore d'abonnes).
     */
    constructor(input) {
      super();
      __privateAdd(this, _GraphModel_instances);
      __privateAdd(this, _schemaVersion);
      __privateAdd(this, _meta);
      __privateAdd(this, _nodes, /* @__PURE__ */ new Map());
      __privateAdd(this, _edges, /* @__PURE__ */ new Map());
      __privateAdd(this, _adjacency, /* @__PURE__ */ new Map());
      const normalized = toModel(input);
      __privateSet(this, _schemaVersion, normalized.schemaVersion);
      __privateSet(this, _meta, normalized.meta);
      normalized.nodes.forEach((node) => {
        __privateGet(this, _nodes).set(node.data.id, node);
        __privateGet(this, _adjacency).set(node.data.id, { in: [], out: [] });
      });
      normalized.edges.forEach((edge) => {
        __privateGet(this, _edges).set(edge.data.id, edge);
        __privateMethod(this, _GraphModel_instances, link_fn).call(this, edge);
      });
    }
    // ---- 3.1 Lecture (acces) ----
    get schemaVersion() {
      return __privateGet(this, _schemaVersion);
    }
    get meta() {
      return __privateGet(this, _meta);
    }
    /** GraphNode[] — read-only par contrat (muter via l'API, jamais en place). */
    get nodes() {
      return Array.from(__privateGet(this, _nodes).values());
    }
    /** GraphEdge[] — read-only par contrat (muter via l'API, jamais en place). */
    get edges() {
      return Array.from(__privateGet(this, _edges).values());
    }
    get nodeCount() {
      return __privateGet(this, _nodes).size;
    }
    get edgeCount() {
      return __privateGet(this, _edges).size;
    }
    getNode(id) {
      return __privateGet(this, _nodes).get(id);
    }
    getEdge(id) {
      return __privateGet(this, _edges).get(id);
    }
    hasNode(id) {
      return __privateGet(this, _nodes).has(id);
    }
    hasEdge(id) {
      return __privateGet(this, _edges).has(id);
    }
    // ---- 3.2 Index d'adjacence (maintenu incrementalement) ----
    /** Map<nodeId, { in: GraphEdge[], out: GraphEdge[] }> — LIVE. */
    get adjacency() {
      return __privateGet(this, _adjacency);
    }
    inEdges(nodeId) {
      const entry = __privateGet(this, _adjacency).get(nodeId);
      return entry ? entry.in : [];
    }
    outEdges(nodeId) {
      const entry = __privateGet(this, _adjacency).get(nodeId);
      return entry ? entry.out : [];
    }
    /** ids voisins = endpoints de (in ∪ out), deduplique — independant de `directed`. */
    neighbors(nodeId) {
      const entry = __privateGet(this, _adjacency).get(nodeId);
      if (!entry) return [];
      const ids = /* @__PURE__ */ new Set();
      entry.out.forEach((e) => ids.add(e.data.target));
      entry.in.forEach((e) => ids.add(e.data.source));
      return Array.from(ids);
    }
    // ---- 3.3 Mutations — atomiques, 1 op => 1 event (uniquement si effectif) ----
    addNode(node) {
      const data = node && typeof node === "object" && node.data && typeof node.data === "object" ? node.data : null;
      const id = data && isNonEmptyString2(data.id) ? data.id.trim() : "";
      if (!id) {
        warn2("addNode: id manquant ou vide -> ignore");
        return;
      }
      if (__privateGet(this, _nodes).has(id) || __privateGet(this, _edges).has(id)) {
        warn2(`addNode: id "${id}" deja utilise (namespace noeuds/aretes partage) -> ignore`);
        return;
      }
      const normalized = { data: { ...cloneObj(data), id } };
      if (node.position && typeof node.position === "object") normalized.position = cloneObj(node.position);
      if (node.size && typeof node.size === "object") normalized.size = cloneObj(node.size);
      __privateGet(this, _nodes).set(id, normalized);
      __privateGet(this, _adjacency).set(id, { in: [], out: [] });
      __privateMethod(this, _GraphModel_instances, emit_fn).call(this, { op: "add-node", id, node: normalized });
    }
    updateNode(id, patch) {
      if (!__privateGet(this, _nodes).has(id)) {
        warn2(`updateNode: id "${id}" introuvable -> ignore`);
        return;
      }
      const existing = __privateGet(this, _nodes).get(id);
      const p = patch && typeof patch === "object" ? patch : {};
      if (p.data && typeof p.data === "object") {
        if ("id" in p.data && p.data.id !== existing.data.id) {
          warn2(`updateNode: id "${id}" immuable -> patch.data.id ignore`);
        }
        const nextData = { ...existing.data, ...p.data, id: existing.data.id };
        existing.data = nextData;
      }
      if (Object.prototype.hasOwnProperty.call(p, "position")) {
        if (p.position && typeof p.position === "object") {
          existing.position = cloneObj(p.position);
        } else {
          delete existing.position;
        }
      }
      if (Object.prototype.hasOwnProperty.call(p, "size")) {
        if (p.size && typeof p.size === "object") {
          existing.size = cloneObj(p.size);
        } else {
          delete existing.size;
        }
      }
      __privateMethod(this, _GraphModel_instances, emit_fn).call(this, { op: "update-node", id, node: existing, patch: p });
    }
    removeNode(id) {
      if (!__privateGet(this, _nodes).has(id)) {
        warn2(`removeNode: id "${id}" introuvable -> ignore`);
        return;
      }
      const node = __privateGet(this, _nodes).get(id);
      const adj = __privateGet(this, _adjacency).get(id) || { in: [], out: [] };
      const removedEdgesById = /* @__PURE__ */ new Map();
      [...adj.out, ...adj.in].forEach((e) => removedEdgesById.set(e.data.id, e));
      const removedEdges = Array.from(removedEdgesById.values());
      removedEdges.forEach((edge) => {
        __privateMethod(this, _GraphModel_instances, unlink_fn).call(this, edge);
        __privateGet(this, _edges).delete(edge.data.id);
      });
      __privateGet(this, _nodes).delete(id);
      __privateGet(this, _adjacency).delete(id);
      __privateMethod(this, _GraphModel_instances, emit_fn).call(this, { op: "remove-node", id, node, removedEdges });
    }
    addEdge(edge) {
      const data = edge && typeof edge === "object" && edge.data && typeof edge.data === "object" ? edge.data : null;
      const id = data && isNonEmptyString2(data.id) ? data.id.trim() : "";
      if (!id) {
        warn2("addEdge: id manquant ou vide -> ignore");
        return;
      }
      if (__privateGet(this, _nodes).has(id) || __privateGet(this, _edges).has(id)) {
        warn2(`addEdge: id "${id}" deja utilise (namespace noeuds/aretes partage) -> ignore`);
        return;
      }
      const source = isNonEmptyString2(data.source) ? data.source.trim() : "";
      const target = isNonEmptyString2(data.target) ? data.target.trim() : "";
      if (!__privateGet(this, _nodes).has(source) || !__privateGet(this, _nodes).has(target)) {
        const missing = !__privateGet(this, _nodes).has(source) ? source || "(vide)" : target || "(vide)";
        warn2(`addEdge: arete "${id}" pendante -> extremite manquante "${missing}" -> ignoree`);
        return;
      }
      const normalized = { data: { ...cloneObj(data), id, source, target } };
      __privateGet(this, _edges).set(id, normalized);
      __privateMethod(this, _GraphModel_instances, link_fn).call(this, normalized);
      __privateMethod(this, _GraphModel_instances, emit_fn).call(this, { op: "add-edge", id, edge: normalized });
    }
    updateEdge(id, patch) {
      if (!__privateGet(this, _edges).has(id)) {
        warn2(`updateEdge: id "${id}" introuvable -> ignore`);
        return;
      }
      const existing = __privateGet(this, _edges).get(id);
      const p = patch && typeof patch === "object" ? patch : {};
      if (p.data && typeof p.data === "object") {
        const attemptedImmutable = "id" in p.data && p.data.id !== existing.data.id || "source" in p.data && p.data.source !== existing.data.source || "target" in p.data && p.data.target !== existing.data.target;
        if (attemptedImmutable) {
          warn2(`updateEdge: id/source/target de "${id}" immuables -> cles ignorees dans le patch`);
        }
        const nextData = {
          ...existing.data,
          ...p.data,
          id: existing.data.id,
          source: existing.data.source,
          target: existing.data.target
        };
        existing.data = nextData;
      }
      __privateMethod(this, _GraphModel_instances, emit_fn).call(this, { op: "update-edge", id, edge: existing, patch: p });
    }
    removeEdge(id) {
      if (!__privateGet(this, _edges).has(id)) {
        warn2(`removeEdge: id "${id}" introuvable -> ignore`);
        return;
      }
      const edge = __privateGet(this, _edges).get(id);
      __privateMethod(this, _GraphModel_instances, unlink_fn).call(this, edge);
      __privateGet(this, _edges).delete(id);
      __privateMethod(this, _GraphModel_instances, emit_fn).call(this, { op: "remove-edge", id, edge });
    }
    /** GraphData — DEEP clone { schemaVersion, meta, nodes, edges }. Round-trip garanti. */
    toJSON() {
      return {
        schemaVersion: __privateGet(this, _schemaVersion),
        meta: structuredClone(__privateGet(this, _meta)),
        nodes: structuredClone(this.nodes),
        edges: structuredClone(this.edges)
      };
    }
  };
  _schemaVersion = new WeakMap();
  _meta = new WeakMap();
  _nodes = new WeakMap();
  _edges = new WeakMap();
  _adjacency = new WeakMap();
  _GraphModel_instances = new WeakSet();
  link_fn = function(edge) {
    const { source, target } = edge.data;
    const sourceAdj = __privateGet(this, _adjacency).get(source);
    if (sourceAdj) sourceAdj.out.push(edge);
    const targetAdj = __privateGet(this, _adjacency).get(target);
    if (targetAdj) targetAdj.in.push(edge);
  };
  unlink_fn = function(edge) {
    const { source, target } = edge.data;
    const sourceAdj = __privateGet(this, _adjacency).get(source);
    if (sourceAdj) {
      const i = sourceAdj.out.indexOf(edge);
      if (i >= 0) sourceAdj.out.splice(i, 1);
    }
    const targetAdj = __privateGet(this, _adjacency).get(target);
    if (targetAdj) {
      const i = targetAdj.in.indexOf(edge);
      if (i >= 0) targetAdj.in.splice(i, 1);
    }
  };
  emit_fn = function(detail) {
    this.dispatchEvent(new CustomEvent("graph:model:change", { detail, bubbles: true }));
  };
  /** @type {number} PROVISOIRE — voir reserve en tete de fichier. */
  __publicField(GraphModel, "SCHEMA_VERSION", SCHEMA_VERSION);

  // shared/graph/layout/fixed.js
  function fixedLayout(model) {
    const pos = /* @__PURE__ */ new Map();
    model.nodes.forEach((node) => {
      const id = node.data.id;
      if (node.position && typeof node.position.x === "number" && typeof node.position.y === "number") {
        pos.set(id, { x: node.position.x, y: node.position.y });
      } else {
        console.warn(`[graph:fixed] noeud "${id}" sans position -> (0,0)`);
        pos.set(id, { x: 0, y: 0 });
      }
    });
    return pos;
  }

  // shared/graph/layout/tree.js
  var DEFAULT_SIZE = { w: 120, h: 40 };
  function sizeOf(sizes, id) {
    const s = sizes && sizes.get(id);
    return s && typeof s.w === "number" && typeof s.h === "number" ? s : DEFAULT_SIZE;
  }
  function treeLayout(model, opts) {
    const o = opts || {};
    const dir = o.direction === "LR" ? "LR" : "TB";
    const gap = o.gap || { x: 32, y: 48 };
    const sizes = o.sizes || /* @__PURE__ */ new Map();
    const nodeIds = model.nodes.map((n) => n.data.id);
    const visited = /* @__PURE__ */ new Set();
    const children = /* @__PURE__ */ new Map();
    const depth = /* @__PURE__ */ new Map();
    const roots = [];
    const rootOk = o.root != null && (typeof model.hasNode === "function" ? model.hasNode(o.root) : nodeIds.includes(o.root));
    if (rootOk) roots.push(o.root);
    nodeIds.forEach((id) => {
      if (roots.includes(id)) return;
      const inCount = typeof model.inEdges === "function" ? model.inEdges(id).length : 0;
      if (inCount === 0) roots.push(id);
    });
    function visit(id, d) {
      if (visited.has(id)) return;
      visited.add(id);
      depth.set(id, d);
      const kids = [];
      const outs = typeof model.outEdges === "function" ? model.outEdges(id) : [];
      outs.forEach((e) => {
        const target = e.data.target;
        if (!visited.has(target)) kids.push(target);
      });
      children.set(id, kids);
      kids.forEach((childId) => visit(childId, d + 1));
    }
    roots.forEach((id) => visit(id, 0));
    nodeIds.forEach((id) => {
      if (!visited.has(id)) {
        roots.push(id);
        visit(id, 0);
      }
    });
    const secondary = /* @__PURE__ */ new Map();
    let cursor = 0;
    function place(id) {
      const kids = children.get(id) || [];
      const { w, h } = sizeOf(sizes, id);
      const extent = dir === "LR" ? h : w;
      if (kids.length === 0) {
        const p2 = cursor + extent / 2;
        cursor += extent + gap.x;
        secondary.set(id, p2);
        return p2;
      }
      const childPositions = kids.map((k) => place(k));
      const p = childPositions.reduce((a, b) => a + b, 0) / childPositions.length;
      secondary.set(id, p);
      return p;
    }
    roots.forEach((id) => place(id));
    const maxByDepth = /* @__PURE__ */ new Map();
    nodeIds.forEach((id) => {
      const d = depth.get(id) || 0;
      const { w, h } = sizeOf(sizes, id);
      const extent = dir === "LR" ? w : h;
      maxByDepth.set(d, Math.max(maxByDepth.get(d) || 0, extent));
    });
    const maxDepth = Math.max(0, ...Array.from(maxByDepth.keys()));
    const primaryOffset = /* @__PURE__ */ new Map();
    let acc = 0;
    for (let d = 0; d <= maxDepth; d++) {
      const extent = maxByDepth.get(d) || 0;
      primaryOffset.set(d, acc + extent / 2);
      acc += extent + gap.y;
    }
    const pos = /* @__PURE__ */ new Map();
    nodeIds.forEach((id) => {
      const d = depth.get(id) || 0;
      const s = secondary.get(id) || 0;
      const p = primaryOffset.get(d) || 0;
      pos.set(id, dir === "LR" ? { x: p, y: s } : { x: s, y: p });
    });
    return pos;
  }

  // shared/graph/layout/radial.js
  var DEFAULT_SIZE2 = { w: 120, h: 40 };
  function sizeOf2(sizes, id) {
    const s = sizes && sizes.get(id);
    return s && typeof s.w === "number" && typeof s.h === "number" ? s : DEFAULT_SIZE2;
  }
  function radialLayout(model, opts) {
    const o = opts || {};
    const sizes = o.sizes || /* @__PURE__ */ new Map();
    const startAngle = typeof o.startAngle === "number" ? o.startAngle : -Math.PI / 2;
    const sweep = typeof o.sweep === "number" ? o.sweep : Math.PI * 2;
    const ringGap = typeof o.ringGap === "number" ? o.ringGap : 40;
    const nodeIds = model.nodes.map((n) => n.data.id);
    const visited = /* @__PURE__ */ new Set();
    const children = /* @__PURE__ */ new Map();
    const depth = /* @__PURE__ */ new Map();
    const roots = [];
    const rootOk = o.root != null && (typeof model.hasNode === "function" ? model.hasNode(o.root) : nodeIds.includes(o.root));
    if (rootOk) roots.push(o.root);
    nodeIds.forEach((id) => {
      if (roots.includes(id)) return;
      const inCount = typeof model.inEdges === "function" ? model.inEdges(id).length : 0;
      if (inCount === 0) roots.push(id);
    });
    function visit(id, d) {
      if (visited.has(id)) return;
      visited.add(id);
      depth.set(id, d);
      const kids = [];
      const outs = typeof model.outEdges === "function" ? model.outEdges(id) : [];
      outs.forEach((e) => {
        const target = e.data.target;
        if (!visited.has(target)) kids.push(target);
      });
      children.set(id, kids);
      kids.forEach((k) => visit(k, d + 1));
    }
    roots.forEach((id) => visit(id, 0));
    nodeIds.forEach((id) => {
      if (!visited.has(id)) {
        roots.push(id);
        visit(id, 0);
      }
    });
    const leafWeight = /* @__PURE__ */ new Map();
    function weigh(id) {
      const kids = children.get(id) || [];
      if (kids.length === 0) {
        leafWeight.set(id, 1);
        return 1;
      }
      const w = kids.reduce((a, k) => a + weigh(k), 0);
      leafWeight.set(id, w);
      return w;
    }
    const totalLeaves = roots.reduce((a, r) => a + weigh(r), 0) || 1;
    const maxByDepth = /* @__PURE__ */ new Map();
    nodeIds.forEach((id) => {
      const { w, h } = sizeOf2(sizes, id);
      const d = depth.get(id) || 0;
      maxByDepth.set(d, Math.max(maxByDepth.get(d) || 0, Math.hypot(w, h) / 2));
    });
    const maxDepth = Math.max(0, ...Array.from(maxByDepth.keys()));
    const radiusAt = /* @__PURE__ */ new Map([[0, 0]]);
    let acc = 0;
    for (let d = 1; d <= maxDepth; d++) {
      acc += (maxByDepth.get(d - 1) || 0) + (maxByDepth.get(d) || 0) + ringGap;
      radiusAt.set(d, acc);
    }
    const angle = /* @__PURE__ */ new Map();
    function assign(id, a0, a1) {
      angle.set(id, (a0 + a1) / 2);
      const kids = children.get(id) || [];
      let cursor2 = a0;
      kids.forEach((k) => {
        const span = (a1 - a0) * leafWeight.get(k) / (leafWeight.get(id) || 1);
        assign(k, cursor2, cursor2 + span);
        cursor2 += span;
      });
    }
    let cursor = startAngle;
    roots.forEach((r) => {
      const span = sweep * leafWeight.get(r) / totalLeaves;
      assign(r, cursor, cursor + span);
      cursor += span;
    });
    const pos = /* @__PURE__ */ new Map();
    nodeIds.forEach((id) => {
      const r = radiusAt.get(depth.get(id) || 0) || 0;
      const th = angle.get(id) || startAngle;
      pos.set(id, { x: r * Math.cos(th), y: r * Math.sin(th) });
    });
    return pos;
  }

  // shared/graph/layout/mindmap.js
  var DEFAULT_SIZE3 = { w: 120, h: 40 };
  function sizeOf3(sizes, id) {
    const s = sizes && sizes.get(id);
    return s && typeof s.w === "number" && typeof s.h === "number" ? s : DEFAULT_SIZE3;
  }
  function mindmapLayout(model, opts) {
    const o = opts || {};
    const sizes = o.sizes || /* @__PURE__ */ new Map();
    const gapX = o.gap && o.gap.x || 48;
    const gapY = o.gap && o.gap.y || 16;
    const byCount = o.balance === "count";
    const nodeIds = model.nodes.map((n) => n.data.id);
    const visited = /* @__PURE__ */ new Set();
    const children = /* @__PURE__ */ new Map();
    const depth = /* @__PURE__ */ new Map();
    const rootOk = o.root != null && (typeof model.hasNode === "function" ? model.hasNode(o.root) : nodeIds.includes(o.root));
    let root = rootOk ? o.root : null;
    if (root == null) {
      root = nodeIds.find((id) => {
        const inCount = typeof model.inEdges === "function" ? model.inEdges(id).length : 0;
        return inCount === 0;
      }) || nodeIds[0];
    }
    function build(id, d) {
      if (visited.has(id)) return;
      visited.add(id);
      depth.set(id, d);
      const kids = [];
      const outs = typeof model.outEdges === "function" ? model.outEdges(id) : [];
      outs.forEach((e) => {
        const target = e.data.target;
        if (!visited.has(target)) kids.push(target);
      });
      children.set(id, kids);
      kids.forEach((childId) => build(childId, d + 1));
    }
    if (root != null) build(root, 0);
    nodeIds.forEach((id) => {
      if (!visited.has(id)) build(id, 0);
    });
    const load = /* @__PURE__ */ new Map();
    function weigh(id) {
      const kids = children.get(id) || [];
      if (kids.length === 0) {
        const w2 = byCount ? 1 : sizeOf3(sizes, id).h;
        load.set(id, w2);
        return w2;
      }
      const w = kids.reduce((a, k) => a + weigh(k), 0);
      load.set(id, w);
      return w;
    }
    if (root != null) weigh(root);
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
    const pos = /* @__PURE__ */ new Map();
    if (root != null) pos.set(root, { x: 0, y: 0 });
    const maxWidthByDepth = /* @__PURE__ */ new Map();
    nodeIds.forEach((id) => {
      const d = depth.get(id);
      if (d == null) return;
      const w = sizeOf3(sizes, id).w;
      maxWidthByDepth.set(d, Math.max(maxWidthByDepth.get(d) || 0, w));
    });
    const maxDepth = Math.max(0, ...Array.from(maxWidthByDepth.keys()));
    const offsetAtDepth = /* @__PURE__ */ new Map();
    let acc = (maxWidthByDepth.get(0) || DEFAULT_SIZE3.w) / 2;
    offsetAtDepth.set(0, 0);
    for (let d = 1; d <= maxDepth; d++) {
      const extent = maxWidthByDepth.get(d) || DEFAULT_SIZE3.w;
      acc += gapX + extent / 2;
      offsetAtDepth.set(d, acc);
      acc += extent / 2;
    }
    function layoutSide(branchRoots, sign) {
      let cursorY = 0;
      function place(id) {
        const kids = children.get(id) || [];
        const d = depth.get(id) || 0;
        const x = sign * (offsetAtDepth.get(d) || 0);
        let y;
        if (kids.length === 0) {
          const h = sizeOf3(sizes, id).h;
          y = cursorY + h / 2;
          cursorY += h + gapY;
        } else {
          const ys = kids.map((k) => place(k));
          y = ys.reduce((a, b) => a + b, 0) / ys.length;
        }
        pos.set(id, { x, y });
        return y;
      }
      branchRoots.forEach((b) => place(b));
    }
    layoutSide(right, 1);
    layoutSide(left, -1);
    nodeIds.forEach((id) => {
      if (!pos.has(id)) pos.set(id, { x: 0, y: 0 });
    });
    return pos;
  }

  // shared/graph/layout/detect.js
  function detectLayout(model) {
    const nodes = model.nodes;
    if (nodes.length === 0) return "fixed";
    const roots = nodes.filter((n) => model.inEdges(n.data.id).length === 0);
    const WHITE = 0, GRAY = 1, BLACK = 2;
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
    if (hasCycle) return "layered";
    if (roots.length === 1) return "tree";
    return "layered";
  }

  // shared/graph/layout/auto.js
  function autoLayout(model, opts) {
    let name = detectLayout(model);
    if (name !== "fixed" && !hasLayout(name)) name = "tree";
    return resolveLayout(name)(model, opts);
  }

  // shared/graph/layout/index.js
  var REGISTRY = /* @__PURE__ */ new Map();
  function registerLayout(name, run) {
    REGISTRY.set(name, run);
  }
  function resolveLayout(name) {
    return REGISTRY.get(name) || REGISTRY.get("fixed");
  }
  function hasLayout(name) {
    return REGISTRY.has(name);
  }
  registerLayout("fixed", fixedLayout);
  registerLayout("tree", treeLayout);
  registerLayout("radial", radialLayout);
  registerLayout("mindmap", mindmapLayout);
  registerLayout("auto", autoLayout);
  registerLayout("layered", (model, opts) => Promise.resolve().then(() => (init_layered(), layered_exports)).then((m) => m.layeredLayout(model, opts)));

  // shared/graph/render/node-types.js
  function resolveNodeType(node, nodeTypes) {
    const type = node && node.data ? node.data.type : void 0;
    const cfg = nodeTypes && type && nodeTypes[type] || {};
    return {
      className: cfg.className || "",
      icon: cfg.icon || null
    };
  }
  function graphCard(node) {
    const data = node && node.data || {};
    const wrap = document.createElement("div");
    wrap.className = "card graph-node-card";
    if (data.category) {
      wrap.dataset.category = data.category;
    }
    const title = document.createElement("div");
    title.className = "graph-node-card-title";
    title.textContent = data.label || data.id || "";
    wrap.appendChild(title);
    if (data.status) {
      const badge = document.createElement("span");
      badge.className = "badge graph-node-card-badge";
      badge.textContent = data.status;
      wrap.appendChild(badge);
    }
    if (data.assignee) {
      const chip = document.createElement("span");
      chip.className = "chip graph-node-card-chip";
      chip.textContent = data.assignee;
      wrap.appendChild(chip);
    }
    return wrap;
  }

  // shared/graph/render/a11y-table.js
  function labelOf(node) {
    return node && node.data && (node.data.label || node.data.id) || "";
  }
  function graphToTableModel(model) {
    const nodes = model.nodes;
    const edges = model.edges;
    const byId = new Map(nodes.map((n) => [n.data.id, n]));
    const rows = nodes.map((n) => {
      const outIds = (typeof model.outEdges === "function" ? model.outEdges(n.data.id) : []).map(
        (e) => e.data.target
      );
      const inIds = (typeof model.inEdges === "function" ? model.inEdges(n.data.id) : []).map(
        (e) => e.data.source
      );
      return {
        id: n.data.id,
        label: labelOf(n),
        type: n.data && n.data.type || "",
        out: outIds.map((id) => labelOf(byId.get(id)) || id),
        in: inIds.map((id) => labelOf(byId.get(id)) || id)
      };
    });
    return {
      caption: `${nodes.length} n\u0153ud${nodes.length > 1 ? "s" : ""}, ${edges.length} ar\xEAte${edges.length > 1 ? "s" : ""}`,
      rows
    };
  }
  function renderA11yTable(model, container, title) {
    const { caption, rows } = graphToTableModel(model);
    const heading = title || "Graphe";
    container.innerHTML = "";
    const details = document.createElement("details");
    details.className = "graph-a11y-details";
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = `${heading} (repr\xE9sentation tabulaire)`;
    details.appendChild(summary);
    const table = document.createElement("table");
    table.className = "graph-table";
    const captionEl = document.createElement("caption");
    captionEl.textContent = `${heading} \u2014 ${caption}`;
    table.appendChild(captionEl);
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["N\u0153ud", "Type", "Relations"].forEach((label) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = row.label;
      tr.appendChild(th);
      const tdType = document.createElement("td");
      tdType.textContent = row.type;
      tr.appendChild(tdType);
      const tdRel = document.createElement("td");
      const parts = [];
      if (row.out.length) parts.push(`\u2192 ${row.out.join(", ")}`);
      if (row.in.length) parts.push(`\u2190 ${row.in.join(", ")}`);
      tdRel.textContent = parts.join(" \xB7 ") || "\u2014";
      tr.appendChild(tdRel);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    details.appendChild(table);
    container.appendChild(details);
  }

  // shared/graph/render/viewport.js
  function clampZoom(k, min, max) {
    return Math.min(max, Math.max(min, k));
  }
  function userToWorld({ x, y }, vp) {
    return { x: (x - vp.tx) / vp.k, y: (y - vp.ty) / vp.k };
  }
  function worldToUser({ x, y }, vp) {
    return { x: x * vp.k + vp.tx, y: y * vp.k + vp.ty };
  }
  function zoomAt(vp, ux, uy, factor, min, max) {
    const k2 = clampZoom(vp.k * factor, min, max);
    const tx = ux - (ux - vp.tx) / vp.k * k2;
    const ty = uy - (uy - vp.ty) / vp.k * k2;
    return { tx, ty, k: k2 };
  }
  var LOD_COMPACT_K = 0.5;
  var Viewport = class {
    /**
     * @param {SVGSVGElement} svgEl - le <svg class="graph-canvas">
     * @param {SVGGElement} groupEl - le <g class="graph-viewport">
     * @param {HTMLElement} host - le conteneur .graph (cible de graph:viewport:change)
     * @param {{min?:number,max?:number,initial?:{tx,ty,k}}} [opts]
     */
    constructor(svgEl, groupEl, host, opts = {}) {
      var _a, _b;
      this.svgEl = svgEl;
      this.groupEl = groupEl;
      this.host = host;
      this.min = (_a = opts.min) != null ? _a : 0.2;
      this.max = (_b = opts.max) != null ? _b : 4;
      this.vp = opts.initial ? { ...opts.initial } : { tx: 0, ty: 0, k: 1 };
      this._pointers = /* @__PURE__ */ new Map();
      this._pinchActive = false;
      this._pinchStartDist = 0;
      this._pinchStartK = 1;
      this._ticking = false;
      this._pendingFactor = 1;
      this._pendingUser = null;
      this._onWheel = this._onWheel.bind(this);
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerMove = this._onPointerMove.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      svgEl.addEventListener("wheel", this._onWheel, { passive: false });
      svgEl.addEventListener("pointerdown", this._onPointerDown);
      svgEl.addEventListener("pointermove", this._onPointerMove);
      svgEl.addEventListener("pointerup", this._onPointerUp);
      svgEl.addEventListener("pointercancel", this._onPointerUp);
      this._panDestroy = window.__pointerDrag ? window.__pointerDrag(svgEl, {
        onStart: (e, p) => {
          if (this._pinchActive) return;
          this._panStart = this.screenToUser(p.clientX, p.clientY);
          this._panOrig = { tx: this.vp.tx, ty: this.vp.ty };
        },
        onMove: (e, p) => {
          if (this._pinchActive || !this._panStart) return;
          const u = this.screenToUser(p.clientX, p.clientY);
          this.setViewport({
            tx: this._panOrig.tx + (u.x - this._panStart.x),
            ty: this._panOrig.ty + (u.y - this._panStart.y),
            k: this.vp.k
          });
        },
        onEnd: () => {
          this._panStart = null;
        },
        cursor: "grabbing"
      }) : null;
      this.apply();
    }
    /** point ecran -> espace-utilisateur SVG (independant de la transform vp). */
    screenToUser(clientX, clientY) {
      const ctm = this.svgEl.getScreenCTM();
      if (!ctm) return { x: clientX, y: clientY };
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    }
    /** point ecran -> monde (API publique, ex: placer/selectionner sous zoom). */
    screenToWorld(clientX, clientY) {
      return userToWorld(this.screenToUser(clientX, clientY), this.vp);
    }
    getViewport() {
      return { ...this.vp };
    }
    setViewport({ tx, ty, k }) {
      this.vp = { tx, ty, k: clampZoom(k, this.min, this.max) };
      this.apply();
      this.host.dispatchEvent(
        new CustomEvent("graph:viewport:change", {
          detail: { ...this.vp },
          bubbles: true
        })
      );
    }
    apply() {
      const { tx, ty, k } = this.vp;
      this.groupEl.setAttribute("transform", `translate(${tx} ${ty}) scale(${k})`);
      this.groupEl.style.setProperty("--graph-inv-k", String(1 / k));
      this.host.classList.toggle("graph--lod-compact", k < LOD_COMPACT_K);
    }
    _onWheel(e) {
      e.preventDefault();
      this._pendingFactor *= e.deltaY < 0 ? 1.1 : 1 / 1.1;
      this._pendingUser = this.screenToUser(e.clientX, e.clientY);
      if (this._ticking) return;
      this._ticking = true;
      requestAnimationFrame(() => {
        const u = this._pendingUser;
        this.setViewport(zoomAt(this.vp, u.x, u.y, this._pendingFactor, this.min, this.max));
        this._pendingFactor = 1;
        this._ticking = false;
      });
    }
    _onPointerDown(e) {
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._pointers.size === 2) {
        this._pinchActive = true;
        const [a, b] = [...this._pointers.values()];
        this._pinchStartDist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        this._pinchStartK = this.vp.k;
      }
    }
    _onPointerMove(e) {
      if (!this._pointers.has(e.pointerId)) return;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!this._pinchActive || this._pointers.size < 2) return;
      const [a, b] = [...this._pointers.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const midUser = this.screenToUser((a.x + b.x) / 2, (a.y + b.y) / 2);
      const targetK = this._pinchStartK * (dist / this._pinchStartDist);
      this.setViewport(zoomAt(this.vp, midUser.x, midUser.y, targetK / this.vp.k, this.min, this.max));
    }
    _onPointerUp(e) {
      this._pointers.delete(e.pointerId);
      if (this._pointers.size < 2) this._pinchActive = false;
    }
    destroy() {
      this.svgEl.removeEventListener("wheel", this._onWheel);
      this.svgEl.removeEventListener("pointerdown", this._onPointerDown);
      this.svgEl.removeEventListener("pointermove", this._onPointerMove);
      this.svgEl.removeEventListener("pointerup", this._onPointerUp);
      this.svgEl.removeEventListener("pointercancel", this._onPointerUp);
      if (this._panDestroy) this._panDestroy();
      this._pointers.clear();
    }
  };

  // shared/graph/render/svg-renderer.js
  var uidCounter = 0;
  var DEFAULT_SIZE5 = { w: 120, h: 40 };
  var LABEL_PADDING = 12;
  var KEY_PAN_STEP = 40;
  var LIVE_ANNOUNCE_DEBOUNCE_MS = 300;
  var NEW_NODE_LABEL = "N\u0153ud";
  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }
  var SvgRenderer = class {
    /**
     * @param {HTMLElement} el - conteneur `.graph[data-graph]`
     * @param {Object} opts - cf. contrat createGraph() (shared/graph/index.js)
     */
    constructor(el, opts) {
      this.el = el;
      this.opts = opts || {};
      this.uid = ++uidCounter;
      this.model = this.opts.data instanceof GraphModel ? this.opts.data : new GraphModel(this.opts.data);
      this.sizes = /* @__PURE__ */ new Map();
      this.raf = null;
      this.measureHost = null;
      this._paintToken = 0;
      this._onChange = this._onChange.bind(this);
      this._build();
      this.model.addEventListener("graph:model:change", this._onChange);
      this.measure();
      this.paint();
      if (this.opts.a11yTable !== false) this._renderA11y();
      this._initViewport();
      this._initSelection();
      this._initNodeNav();
      this._initLive();
      this._initResize();
      this._initKeyboard();
      if (this.opts.mode === "edit") this._initEdit();
      if (this.opts.initialSelection) this.select(this.opts.initialSelection, { silent: true });
    }
    // ---- Viewport pan/zoom/pinch (#667, I2-1) — opt-in par defaut ----
    _initViewport() {
      var _a, _b;
      if (this.opts.viewport === false) return;
      const cs = typeof getComputedStyle === "function" ? getComputedStyle(this.el) : null;
      const readNum = (name, fb) => {
        const v = cs && parseFloat(cs.getPropertyValue(name));
        return Number.isFinite(v) ? v : fb;
      };
      this.viewport = new Viewport(this.svgEl, this.viewportG, this.el, {
        min: (_a = this.opts.zoomMin) != null ? _a : readNum("--graph-zoom-min", 0.2),
        max: (_b = this.opts.zoomMax) != null ? _b : readNum("--graph-zoom-max", 4),
        initial: this.opts.initialViewport || void 0
      });
    }
    // ---- Selection (#668) — concern de vue, GraphModel reste pur (invariant #665/#666) ----
    // Pre-requis de l'edition (I5) : API/classes/evenement fixes ici.
    _initSelection() {
      if (this.opts.selectable === false) return;
      this._selection = null;
      this._onCanvasClick = (e) => {
        const hit = this._hitTest(e);
        if (this._connectMode) {
          this._handleConnectClick(hit);
          return;
        }
        const nodeG = hit && hit.closest(".graph-node");
        const edgeP = hit && hit.closest(".graph-edge");
        if (nodeG && nodeG.dataset.nodeId) this.select(nodeG.dataset.nodeId);
        else if (edgeP && edgeP.dataset.edgeId) this.select(edgeP.dataset.edgeId);
      };
      this.svgEl.addEventListener("click", this._onCanvasClick);
    }
    /** hit-test frais aux coordonnees ecran de l'evenement — contourne le retargeting de
     * `e.target` par setPointerCapture() (#667, cf. commentaire _onCanvasClick ci-dessus). */
    _hitTest(e) {
      const doc = this.svgEl.ownerDocument;
      if (!doc || typeof doc.elementFromPoint !== "function") return e.target;
      return doc.elementFromPoint(e.clientX, e.clientY) || e.target;
    }
    getSelection() {
      return this._selection ? { ...this._selection } : null;
    }
    /**
     * @param {string|null} id - id noeud OU arete (namespace partage #665) ; null = deselection
     * @param {{silent?:boolean}} [options] - silent:true = pose l'etat visuel SANS emettre le
     *   detail (callback onSelect / modal DS) — utilise par initialSelection (VR deterministe).
     *   L'evenement graph:selection:change reste emis (contrat public inchange).
     */
    select(id, { silent = false } = {}) {
      var _a;
      this.nodesG.querySelectorAll(".graph-node--selected").forEach((n) => n.classList.remove("graph-node--selected"));
      this.edgesG.querySelectorAll(".graph-edge--selected").forEach((p) => p.classList.remove("graph-edge--selected"));
      if (id == null) {
        this._selection = null;
        this._emitSelection();
        return;
      }
      const kind = this.model.hasNode(id) ? "node" : this.model.hasEdge(id) ? "edge" : null;
      if (!kind) {
        this._selection = null;
        this._emitSelection();
        return;
      }
      if (kind === "node") {
        const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
        if (g) {
          g.classList.add("graph-node--selected");
          g.setAttribute("tabindex", "-1");
          if (this.opts.keyboardNav !== false) this._setRoving(id);
          if (!silent) (_a = g.focus) == null ? void 0 : _a.call(g);
          if (!silent) this._announce(id);
        }
      } else {
        const p = this.edgesG.querySelector(`[data-edge-id="${CSS.escape(id)}"]`);
        if (p) p.classList.add("graph-edge--selected");
      }
      this._selection = { id, kind };
      this._emitSelection();
      if (silent) return;
      if (typeof this.opts.onSelect === "function") this.opts.onSelect(this._selection);
      else if (this.opts.selectionDetail !== false) this._openDetail(id, kind);
    }
    _emitSelection() {
      this.el.dispatchEvent(
        new CustomEvent("graph:selection:change", {
          detail: this._selection ? { ...this._selection } : { id: null, kind: null },
          bubbles: true
        })
      );
    }
    _openDetail(id, kind) {
      if (typeof window === "undefined" || typeof window.__openModal !== "function") return;
      if (kind === "node") {
        const node = this.model.getNode(id);
        const label = node.data && node.data.label || id;
        const neighbors = this.model.neighbors(id).map((nid) => {
          const n = this.model.getNode(nid);
          return n && n.data && n.data.label || nid;
        });
        window.__openModal({
          title: label,
          bodyHTML: `<p>Type : ${escHtml(node.data && node.data.type || "\u2014")}</p><p>Voisins : ${neighbors.length ? neighbors.map(escHtml).join(", ") : "aucun"}</p>`
        });
      } else {
        const edge = this.model.getEdge(id);
        const { source, target, label } = edge.data;
        window.__openModal({
          title: label || "Ar\xEAte",
          bodyHTML: `<p>${escHtml(source)} \u2192 ${escHtml(target)}</p>`
        });
      }
    }
    // ---- Nav clavier noeud-a-noeud (#671, I4-1) — roving tabindex + arbre couvrant ----
    // Conflit fleches resolu ici : listener DELEGUE sur `nodesG` (survit aux repaints, seul
    // innerHTML est wipe par _applyLayout()) — distinct du listener flechesv=pan pose par
    // _initKeyboard() (#668) sur `this.el`. Quand un noeud a le focus, les 4 fleches sont
    // preventDefault()+stopPropagation() -> le pan conteneur (I2-2) ne se declenche jamais.
    // Focus hors noeud (conteneur) -> rien n'est stoppe -> le pan I2-2 reste intact.
    // Escape/+/-/f ne sont JAMAIS stoppes ici (bubblent au conteneur, reutilise I2-2).
    _initNodeNav() {
      if (this.opts.keyboardNav === false) return;
      this._rovingId = null;
      this._onNodeKeydown = (e) => this._handleNodeKey(e);
      this.nodesG.addEventListener("keydown", this._onNodeKeydown);
      this._restoreNodeNav();
    }
    /** Mapping clavier WAI-ARIA APG tree. */
    _handleNodeKey(e) {
      const nodeG = e.target && typeof e.target.closest === "function" ? e.target.closest(".graph-node") : null;
      if (!nodeG || !nodeG.dataset.nodeId || !this._tree) return;
      const id = nodeG.dataset.nodeId;
      if (!this.model.hasNode(id)) return;
      const { parent, children, order } = this._tree;
      switch (e.key) {
        case "ArrowUp": {
          const p = parent.get(id);
          if (p != null) this._focusNode(p);
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowDown": {
          const kids = children.get(id) || [];
          if (kids.length) this._focusNode(kids[0]);
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowLeft": {
          const prev = this._sibling(id, -1);
          if (prev) this._focusNode(prev);
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "ArrowRight": {
          const next = this._sibling(id, 1);
          if (next) this._focusNode(next);
          e.preventDefault();
          e.stopPropagation();
          break;
        }
        case "Home":
          if (order[0]) this._focusNode(order[0]);
          e.preventDefault();
          e.stopPropagation();
          break;
        case "End":
          if (order[order.length - 1]) this._focusNode(order[order.length - 1]);
          e.preventDefault();
          e.stopPropagation();
          break;
        case "Enter":
        case " ":
          this.select(id);
          e.preventDefault();
          e.stopPropagation();
          break;
        default:
          return;
      }
    }
    /** frere precedent (dir=-1) ou suivant (dir=1), PAS de wrap. Racine -> siblings = this._tree.roots. */
    _sibling(id, dir) {
      const { parent, children, roots } = this._tree;
      const p = parent.get(id);
      const siblings = p == null ? roots : children.get(p) || [];
      const idx = siblings.indexOf(id);
      if (idx === -1) return null;
      const next = siblings[idx + dir];
      return next !== void 0 ? next : null;
    }
    /** roving + focus DOM + recentrage conditionnel (nav clavier -> #671). */
    _focusNode(id) {
      if (this.opts.keyboardNav === false) return;
      const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
      if (!g) return;
      this._setRoving(id);
      g.focus();
      this._ensureNodeVisible(id);
      this._announce(id);
    }
    /** exactement UN noeud tabindex=0 (le courant) — tous les autres -1. */
    _setRoving(id) {
      this._rovingId = id;
      this._syncRovingTabindex();
    }
    _syncRovingTabindex() {
      this.nodesG.querySelectorAll(".graph-node").forEach((g) => {
        g.setAttribute("tabindex", g.dataset.nodeId === this._rovingId ? "0" : "-1");
      });
    }
    /**
     * Recentre le viewport (zoom courant garde) UNIQUEMENT si le noeud cible est hors du
     * cadre visible (viewBox). Un noeud deja visible ne declenche AUCUN mouvement de camera
     * (moins jarring qu'un zoomToNode systematique) — raffine l'"auto zoomToNode" de #661.
     */
    _ensureNodeVisible(id) {
      if (!this.viewport || !this.positions) return;
      const center = this.positions.get(id);
      if (!center) return;
      const size = this.sizes.get(id) || DEFAULT_SIZE5;
      const vp = this.viewport.getViewport();
      const left = center.x - size.w / 2;
      const top = center.y - size.h / 2;
      const p1 = worldToUser({ x: left, y: top }, vp);
      const p2 = worldToUser({ x: left + size.w, y: top + size.h }, vp);
      const box = this._currentViewBox();
      if (!box) return;
      const withinX = p1.x >= box.x && p2.x <= box.x + box.width;
      const withinY = p1.y >= box.y && p2.y <= box.y + box.height;
      if (withinX && withinY) return;
      this.zoomToNode(id, vp.k);
    }
    _currentViewBox() {
      const attr = this.svgEl.getAttribute("viewBox");
      if (!attr) return null;
      const parts = attr.trim().split(/\s+/).map(Number);
      if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
      const [x, y, width, height] = parts;
      return { x, y, width, height };
    }
    /**
     * Reconstruit l'arbre couvrant + resynchronise le roving apres un repaint (#671).
     * Meme emplacement/raison que _restoreSelectionVisual() : _applyLayout() wipe
     * nodesG.innerHTML et repeint des <g> frais (tabindex=-1 par defaut) -> sans ce
     * rattachement, plus AUCUN noeud ne serait un tab-stop apres la 1re mutation modele.
     */
    _restoreNodeNav() {
      if (this.opts.keyboardNav === false) return;
      const rootId = this.opts.layoutOptions && this.opts.layoutOptions.root;
      this._tree = buildSpanningTree(this.model, rootId);
      if (!this._rovingId || !this.model.hasNode(this._rovingId)) {
        this._rovingId = this._tree.order[0] || null;
      }
      this._syncRovingTabindex();
    }
    // ---- Live-region SR (#672, I4-2) — verbalise dynamiquement le noeud actif +
    // ses connexions. `.graph-a11y` (table) reste le contrat PRIMAIRE (WCAG 1.1.1/1.3.1) ;
    // cette live-region complete la nav clavier (#671) qui ne verbalise QUE l'aria-label
    // du noeud focuse, jamais ses aretes. Independante de opts.keyboardNav : le focus
    // peut aussi survenir via select() (clic + focus programmatique), cf. select(). ----
    _initLive() {
      this._liveTimer = null;
      this._onLiveKeydown = (e) => {
        if (e.key !== "i" && e.key !== "I") return;
        const nodeG = e.target && typeof e.target.closest === "function" ? e.target.closest(".graph-node") : null;
        if (!nodeG || !nodeG.dataset.nodeId) return;
        if (this._liveTimer) {
          clearTimeout(this._liveTimer);
          this._liveTimer = null;
        }
        this._announceConnections(nodeG.dataset.nodeId);
      };
      this.nodesG.addEventListener("keydown", this._onLiveKeydown);
    }
    /**
     * Ecrit le label IMMEDIATEMENT dans `.graph-live`, puis programme (ou reprogramme)
     * l'annonce des connexions apres LIVE_ANNOUNCE_DEBOUNCE_MS au repos. Appele a
     * chaque deplacement (_focusNode) ou selection (select(), branche noeud) — le
     * timer precedent est TOUJOURS annule avant d'en reprogrammer un nouveau : une
     * traversee rapide (fleches en rafale) n'empile jamais d'annonces successives
     * dans la file `polite`, seul l'etat FINAL (noeud sur lequel l'utilisateur
     * s'arrete) declenche l'annonce des connexions.
     */
    _announce(id) {
      if (!this.liveEl || !this.model.hasNode(id)) return;
      const node = this.model.getNode(id);
      const label = node.data && node.data.label || id;
      this.liveEl.textContent = label;
      if (this._liveTimer) clearTimeout(this._liveTimer);
      this._liveTimer = setTimeout(() => {
        this._liveTimer = null;
        this._announceConnections(id);
      }, LIVE_ANNOUNCE_DEBOUNCE_MS);
    }
    /** Format : « {label}. Connecté à {N} : {labels…} » — voisins via model.neighbors()
     * (in ∪ out, y compris cross-edges hors arbre couvrant — complete la nav I4-1). */
    _announceConnections(id) {
      if (!this.liveEl || !this.model.hasNode(id)) return;
      const node = this.model.getNode(id);
      const label = node.data && node.data.label || id;
      const neighborLabels = this.model.neighbors(id).map((nid) => {
        const n = this.model.getNode(nid);
        return n && n.data && n.data.label || nid;
      });
      this.liveEl.textContent = neighborLabels.length ? `${label}. Connect\xE9 \xE0 ${neighborLabels.length} : ${neighborLabels.join(", ")}` : `${label}. Aucune connexion`;
    }
    // ---- fit-to-content = reset a l'identite (#668) ----
    // paint()/_applyLayout() posent deja viewBox=bbox+marge + preserveAspectRatio=
    // "xMidYMid meet" (#666) -> a la transform identite, le contenu est DEJA cadre.
    // Pas de calcul de bbox ici (le sketch #659 supposait un viewBox=px, faux).
    fit() {
      if (this.viewport) this.viewport.setViewport({ tx: 0, ty: 0, k: 1 });
    }
    /** Centre + zoome sur un noeud. Necessite this.positions (stocke par _applyLayout). */
    zoomToNode(id, k = 1.5) {
      if (!this.viewport || !this.positions) return;
      const center = this.positions.get(id);
      if (!center) return;
      const rect = this.svgEl.getBoundingClientRect();
      const mid = this.viewport.screenToUser(rect.left + rect.width / 2, rect.top + rect.height / 2);
      this.viewport.setViewport({ tx: mid.x - center.x * k, ty: mid.y - center.y * k, k });
    }
    // ---- ResizeObserver (#668) — 1re primitive RO du DS. Le responsive est DEJA assure
    // par le viewBox (centre-monde + zoom preserves) : le RO est un hook teardown-safe,
    // debounce rAF, avec re-fit CONDITIONNEL (ne casse jamais la vue d'un utilisateur qui
    // a navigue). ----
    _initResize() {
      if (typeof ResizeObserver === "undefined") return;
      let raf = null;
      this._resizeObs = new ResizeObserver(() => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          const vp = this.viewport && this.viewport.getViewport();
          const atHome = vp && vp.tx === 0 && vp.ty === 0 && vp.k === 1;
          if (this.opts.refitOnResize && !atHome) this.fit();
        });
      });
      this._resizeObs.observe(this.el);
    }
    // ---- Clavier viewport (#668) — distinct de la nav noeud-a-noeud (I4).
    // Escape/f/+/- = must. Fleches (pan) = nice-to-have. ----
    _initKeyboard() {
      if (this.opts.viewport === false) return;
      this.el.setAttribute("tabindex", "0");
      this._onKeydown = (e) => {
        const rect = this.svgEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const u = this.viewport ? this.viewport.screenToUser(cx, cy) : null;
        switch (e.key) {
          case "Escape":
            this.select(null);
            break;
          case "f":
          case "F":
            this.fit();
            break;
          case "+":
          case "=":
            if (u) this._zoomStep(u, 1.2);
            e.preventDefault();
            break;
          case "-":
          case "_":
            if (u) this._zoomStep(u, 1 / 1.2);
            e.preventDefault();
            break;
          case "ArrowUp":
          case "ArrowDown":
          case "ArrowLeft":
          case "ArrowRight":
            this._panStep(e.key);
            e.preventDefault();
            break;
          default:
            return;
        }
      };
      this.el.addEventListener("keydown", this._onKeydown);
    }
    _zoomStep(u, factor) {
      if (!this.viewport) return;
      this.viewport.setViewport(zoomAt(this.viewport.getViewport(), u.x, u.y, factor, this.viewport.min, this.viewport.max));
    }
    _panStep(key) {
      if (!this.viewport) return;
      const vp = this.viewport.getViewport();
      const delta = { ArrowUp: [0, KEY_PAN_STEP], ArrowDown: [0, -KEY_PAN_STEP], ArrowLeft: [KEY_PAN_STEP, 0], ArrowRight: [-KEY_PAN_STEP, 0] }[key];
      if (!delta) return;
      this.viewport.setViewport({ tx: vp.tx + delta[0], ty: vp.ty + delta[1], k: vp.k });
    }
    // ---- Mode edition (#673, I5-1) — opt-in `opts.mode:'edit'` (defaut 'view', inchange) ----
    // Garde role="graphics-document" sur le <svg> (arbitrage A opt1, #662) : la nav SR/clavier
    // I4 reste intacte, `role="application"` est reserve a I5-2 (input inline actif uniquement).
    // Toolbar overlay HTML (`.graph-toolbar`, hors SVG) + gestes create/delete/relier branches
    // sur les elements existants (svgEl/el) — aucune primitive I2/I4 dupliquee.
    _initEdit() {
      this._connectMode = false;
      this._connectSource = null;
      this._editSeq = 0;
      this._buildToolbar();
      this._onEditDblClick = (e) => {
        const hit = this._hitTest(e);
        if (hit && hit.closest && hit.closest(".graph-node")) return;
        const world = this._clientToWorld(e.clientX, e.clientY);
        this._createNodeAt(world.x, world.y);
      };
      this.svgEl.addEventListener("dblclick", this._onEditDblClick);
      this._onEditKeydown = (e) => {
        if (e.key !== "Delete" && e.key !== "Backspace") return;
        if (!this.getSelection()) return;
        e.preventDefault();
        this._deleteSelection();
      };
      this.el.addEventListener("keydown", this._onEditKeydown);
    }
    /** point ecran -> monde, avec/sans viewport actif (opts.viewport===false -> transform identite). */
    _clientToWorld(clientX, clientY) {
      if (this.viewport) return this.viewport.screenToWorld(clientX, clientY);
      const ctm = this.svgEl.getScreenCTM();
      if (!ctm) return { x: clientX, y: clientY };
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    }
    /** id unique dans le namespace partage noeuds/aretes (#665) — prefixe + compteur d'instance. */
    _genEditId(kind) {
      return `edit-${this.uid}-${kind}${++this._editSeq}`;
    }
    _buildToolbar() {
      const bar = document.createElement("div");
      bar.className = "graph-toolbar";
      bar.setAttribute("role", "toolbar");
      bar.setAttribute("aria-label", "\xC9dition du graphe");
      const group = document.createElement("div");
      group.className = "btn-group";
      const addBtn = this._toolbarButton("i-plus", "Ajouter un n\u0153ud", () => this._createNodeCenter());
      const connectBtn = this._toolbarButton("i-link", "Relier", () => this._toggleConnectMode());
      connectBtn.setAttribute("aria-pressed", "false");
      const deleteBtn = this._toolbarButton("i-trash", "Supprimer", () => this._deleteSelection());
      group.appendChild(addBtn);
      group.appendChild(connectBtn);
      group.appendChild(deleteBtn);
      bar.appendChild(group);
      this.el.appendChild(bar);
      this._toolbarEl = bar;
      this._connectBtn = connectBtn;
    }
    _toolbarButton(icon, label, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-icon graph-toolbar__btn";
      btn.setAttribute("aria-label", label);
      btn.title = label;
      btn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="/shared/icons/sprite.svg#${icon}"/></svg>`;
      btn.addEventListener("click", onClick);
      return btn;
    }
    _toggleConnectMode() {
      this._connectMode = !this._connectMode;
      if (this._connectBtn) {
        this._connectBtn.setAttribute("aria-pressed", String(this._connectMode));
      }
      if (!this._connectMode) this._clearConnectSource();
    }
    /**
     * clic nœud source puis clic nœud cible (mode "Relier") -> model.addEdge (#662, arbitrage B/C).
     * @param {Element} hit - element resolu par _hitTest() (PAS e.target, retargete par setPointerCapture)
     */
    _handleConnectClick(hit) {
      const nodeG = hit && hit.closest ? hit.closest(".graph-node") : null;
      if (!nodeG || !nodeG.dataset.nodeId) return;
      const id = nodeG.dataset.nodeId;
      if (!this._connectSource) {
        this._connectSource = id;
        nodeG.classList.add("graph-node--connect-source");
        return;
      }
      const source = this._connectSource;
      this._clearConnectSource();
      if (source === id) return;
      this.model.addEdge({ data: { id: this._genEditId("e"), source, target: id, directed: true } });
    }
    _clearConnectSource() {
      if (this._connectSource) {
        const prev = this.nodesG.querySelector(`[data-node-id="${CSS.escape(this._connectSource)}"]`);
        if (prev) prev.classList.remove("graph-node--connect-source");
      }
      this._connectSource = null;
    }
    /** creation au centre du viewport courant (action toolbar, #662 arbitrage B). */
    _createNodeCenter() {
      const rect = this.svgEl.getBoundingClientRect();
      const { x, y } = this._clientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
      this._createNodeAt(x, y);
    }
    /**
     * Cree un noeud au point (x,y) MONDE puis pose le contrat de focus create (#662, arbitrage E
     * — pendant symetrique) : le repaint est asynchrone (rAF, cf. _scheduleRepaint()) -> le focus
     * ne peut etre pose qu'APRES que le <g> frais existe dans le DOM. `requestAnimationFrame`
     * enregistre ICI est mis en file APRES celui deja programme par `graph:model:change` (meme
     * tick synchrone) -> s'execute dans le MEME frame, juste apres le repaint reel.
     */
    _createNodeAt(x, y) {
      const id = this._genEditId("n");
      this.model.addNode({ data: { id, label: NEW_NODE_LABEL }, position: { x, y } });
      requestAnimationFrame(() => this._focusCreatedNode(id));
    }
    /** contrat focus create (#662, arbitrage E) : select() (silent — pas de modal) puis focus DOM. */
    _focusCreatedNode(id) {
      if (!this.model.hasNode(id)) return;
      this.select(id, { silent: true });
      const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
      if (g) g.focus();
      this._ensureNodeVisible(id);
      this._announce(id);
    }
    /**
     * Suppression (Suppr/Backspace ou bouton toolbar) — contrat de focus delete (#662, arbitrage E) :
     * la destination (voisin -> parent -> order -> null) est calculee AVANT removeNode() (l'index
     * d'adjacence change une fois le noeud retire), puis le focus est pose APRES le repaint reel
     * (rAF) — jamais synchroniquement (on focuserait un noeud sur le point d'etre detruit par le
     * wipe innerHTML de _applyLayout()). Arete : aucun deplacement de focus (reste au noeud roving
     * courant, cf. spec #673).
     */
    _deleteSelection() {
      const sel = this.getSelection();
      if (!sel) return;
      if (sel.kind === "node") {
        const dest = nextFocusAfterRemoval(this.model, this._tree, sel.id);
        this.model.removeNode(sel.id);
        requestAnimationFrame(() => {
          let target = dest;
          if (target == null || !this.model.hasNode(target)) {
            target = this._tree && this._tree.order[0] || null;
          }
          if (target != null) this._focusNode(target);
        });
      } else if (sel.kind === "edge") {
        this.model.removeEdge(sel.id);
      }
    }
    // ---- 2.1 Structure SVG emise ----
    _build() {
      this.el.classList.add("graph");
      this.el.setAttribute("role", "group");
      this.el.setAttribute("aria-roledescription", "graphe");
      const descId = `graph-${this.uid}-desc`;
      this.svgEl = svg("svg", {
        class: "graph-canvas",
        role: "graphics-document",
        // etait 'img' (#671) — expose les enfants focusables (noeuds)
        "aria-label": this.opts.label || "Graphe",
        "aria-describedby": descId,
        preserveAspectRatio: "xMidYMid meet"
      });
      const defs = svg("defs");
      const marker = svg("marker", {
        id: `graph-arrow-${this.uid}`,
        class: "graph-arrow",
        markerWidth: 8,
        markerHeight: 8,
        refX: 7,
        refY: 4,
        orient: "auto-start-reverse"
      });
      marker.appendChild(svg("path", { d: "M0,0 L8,4 L0,8 Z" }));
      defs.appendChild(marker);
      this.svgEl.appendChild(defs);
      this.viewportG = svg("g", { class: "graph-viewport" });
      this.edgesG = svg("g", { class: "graph-edges", "aria-hidden": "true" });
      this.nodesG = svg("g", { class: "graph-nodes" });
      this.viewportG.appendChild(this.edgesG);
      this.viewportG.appendChild(this.nodesG);
      this.svgEl.appendChild(this.viewportG);
      this.a11yEl = document.createElement("div");
      this.a11yEl.className = "graph-a11y";
      this.a11yEl.id = descId;
      this.liveEl = document.createElement("div");
      this.liveEl.className = "graph-live";
      this.liveEl.setAttribute("aria-live", "polite");
      this.liveEl.setAttribute("aria-atomic", "true");
      this.el.innerHTML = "";
      this.el.appendChild(this.svgEl);
      this.el.appendChild(this.a11yEl);
      this.el.appendChild(this.liveEl);
    }
    // ---- 2.3 Cycle de vie observe -> repaint(rAF) -> destroy ----
    _onChange(e) {
      this._scheduleRepaint();
      if (this.opts.mode === "edit") {
        this.el.dispatchEvent(new CustomEvent("graph:edit", { detail: e && e.detail, bubbles: true }));
      }
    }
    _scheduleRepaint() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = null;
        this.measure();
        this.paint();
        if (this.opts.a11yTable !== false) this._renderA11y();
      });
    }
    // ---- 2.2.1 measure() : Map<nodeId,{w,h}> interne, modele JAMAIS mute ----
    measure() {
      this.model.nodes.forEach((node) => {
        const id = node.data.id;
        if (node.size && typeof node.size.w === "number" && typeof node.size.h === "number") {
          this.sizes.set(id, { w: node.size.w, h: node.size.h });
          return;
        }
        this.sizes.set(id, this._isRich(node) ? this._measureRich(node) : this._measureSimple(node));
      });
    }
    _isRich(node) {
      return typeof this.opts.renderNode === "function" || Boolean(node.data && node.data.rich);
    }
    _measureSimple(node) {
      const label = node.data && node.data.label || node.data.id || "";
      const probe = svg("g", { visibility: "hidden" });
      const text = svg("text", { class: "graph-node-label" });
      text.textContent = label;
      probe.appendChild(text);
      this.nodesG.appendChild(probe);
      let box = { width: 0, height: 0 };
      try {
        box = text.getBBox();
      } catch (e) {
      }
      this.nodesG.removeChild(probe);
      return {
        w: Math.max(DEFAULT_SIZE5.w, Math.ceil(box.width) + LABEL_PADDING * 2),
        h: Math.max(DEFAULT_SIZE5.h, Math.ceil(box.height) + LABEL_PADDING * 2)
      };
    }
    _measureRich(node) {
      if (!this.measureHost) {
        this.measureHost = document.createElement("div");
        this.measureHost.className = "graph-measure";
        this.measureHost.setAttribute("aria-hidden", "true");
        document.body.appendChild(this.measureHost);
      }
      const content = this._buildRichContent(node);
      this.measureHost.innerHTML = "";
      this.measureHost.appendChild(content);
      const rect = content.getBoundingClientRect();
      return {
        w: Math.max(DEFAULT_SIZE5.w, Math.ceil(rect.width)),
        h: Math.max(DEFAULT_SIZE5.h, Math.ceil(rect.height))
      };
    }
    _buildRichContent(node) {
      return typeof this.opts.renderNode === "function" ? this.opts.renderNode(node) : graphCard(node);
    }
    // ---- 2.2.3 paint(positions, sizes) — async-tolerant (#670, I3-2) ----
    // `run()` reste SYNCHRONE pour fixed/tree/radial/mindmap (aucun frame supplementaire,
    // 100% retro-compatible). Seul `layered` (dagre, dynamic import) renvoie une Promise.
    // Un thenable declenche l'extraction _applyLayout() + un token anti-course : si un
    // repaint plus recent demarre avant la resolution d'un paint async en vol, la
    // resolution tardive devient un no-op (jamais de flicker/ordre inverse).
    paint() {
      const run = resolveLayout(this.opts.layout || "fixed");
      const result = run(this.model, { ...this.opts.layoutOptions || {}, sizes: this.sizes });
      if (result && typeof result.then === "function") {
        const token = ++this._paintToken;
        result.then((positions) => {
          if (token === this._paintToken) this._applyLayout(positions);
        });
        return;
      }
      this._applyLayout(result);
    }
    _applyLayout(positions) {
      this.positions = positions;
      this.nodesG.innerHTML = "";
      this.edgesG.innerHTML = "";
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      this.model.nodes.forEach((node) => {
        const id = node.data.id;
        const size = this.sizes.get(id) || DEFAULT_SIZE5;
        const center = positions.get(id) || { x: 0, y: 0 };
        const left = center.x - size.w / 2;
        const top = center.y - size.h / 2;
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, left + size.w);
        maxY = Math.max(maxY, top + size.h);
        this._paintNode(node, left, top, size);
      });
      this.model.edges.forEach((edge) => this._paintEdge(edge, positions));
      if (!isFinite(minX)) {
        minX = 0;
        minY = 0;
        maxX = 100;
        maxY = 100;
      }
      const margin = 24;
      const vx = minX - margin;
      const vy = minY - margin;
      const vw = Math.max(maxX - minX + margin * 2, 1);
      const vh = Math.max(maxY - minY + margin * 2, 1);
      this.svgEl.setAttribute("viewBox", `${vx} ${vy} ${vw} ${vh}`);
      this._restoreSelectionVisual();
      this._restoreNodeNav();
    }
    // ---- #668 — reapplique le halo de selection apres un repaint (measure->paint) ----
    // _applyLayout() wipe nodesG/edgesG.innerHTML et repeint des elements FRAIS : sans ce
    // rattachement, une mutation du modele (graph:model:change -> repaint) pendant qu'un
    // noeud/arete est selectionne ferait disparaitre le halo visuel tout en laissant
    // getSelection()/this._selection pointer sur un id toujours "selectionne" -> desync
    // entre etat public et rendu. Pre-requis de l'edition (I5, cf. README) : l'edition va
    // muter le modele en continu pendant qu'une selection est active, ce chemin DOIT rester
    // coherent. Si l'id selectionne a disparu du modele (ex. suppression), deselectionne
    // proprement (evenement re-emis) plutot que de laisser un etat fantome.
    _restoreSelectionVisual() {
      if (!this._selection) return;
      const { id, kind } = this._selection;
      const stillExists = kind === "node" ? this.model.hasNode(id) : this.model.hasEdge(id);
      if (!stillExists) {
        this._selection = null;
        this._emitSelection();
        return;
      }
      if (kind === "node") {
        const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
        if (g) {
          g.classList.add("graph-node--selected");
          g.setAttribute("tabindex", "-1");
        }
      } else {
        const p = this.edgesG.querySelector(`[data-edge-id="${CSS.escape(id)}"]`);
        if (p) p.classList.add("graph-edge--selected");
      }
    }
    _paintNode(node, left, top, size) {
      const id = node.data.id;
      const { className, icon } = resolveNodeType(node, this.opts.nodeTypes);
      const g = svg("g", {
        class: `graph-node${className ? " " + className : ""}`,
        transform: `translate(${left},${top})`,
        "data-node-id": id,
        role: "graphics-symbol",
        // etait 'img' (#671) — noeud focusable expose
        tabindex: "-1",
        // roving : promu a '0' par _syncRovingTabindex()
        "aria-label": node.data && node.data.label || id
      });
      if (this._isRich(node)) {
        const fo = svg("foreignObject", { width: size.w, height: size.h });
        fo.appendChild(this._buildRichContent(node));
        g.appendChild(fo);
      } else {
        g.appendChild(svg("rect", { class: "graph-node-bg", x: 0, y: 0, width: size.w, height: size.h, rx: 8 }));
        if (icon) {
          g.appendChild(
            svg("use", {
              class: "graph-node-icon",
              href: `/shared/icons/sprite.svg#${icon}`,
              x: 8,
              y: size.h / 2 - 8,
              width: 16,
              height: 16
            })
          );
        }
        const text = svg("text", {
          class: "graph-node-label",
          x: size.w / 2,
          y: size.h / 2,
          "text-anchor": "middle",
          "dominant-baseline": "middle"
        });
        text.textContent = node.data && node.data.label || id;
        g.appendChild(text);
      }
      this.nodesG.appendChild(g);
    }
    _paintEdge(edge, positions) {
      const { source, target, directed, label } = edge.data;
      const p1 = positions.get(source);
      const p2 = positions.get(target);
      if (!p1 || !p2) return;
      const shape = this.opts.edgeShape === "curved" ? "curved" : "straight";
      let d;
      if (shape === "curved") {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const perpX = (p2.y - p1.y) / dist;
        const perpY = (p1.x - p2.x) / dist;
        const bow = dist * 0.15;
        const cx = mx + perpX * bow;
        const cy = my + perpY * bow;
        d = `M${p1.x},${p1.y} Q${cx},${cy} ${p2.x},${p2.y}`;
      } else {
        d = `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
      }
      const path = svg("path", {
        class: "graph-edge",
        d,
        "marker-end": directed === true ? `url(#graph-arrow-${this.uid})` : null,
        "data-edge-id": edge.data.id
      });
      this.edgesG.appendChild(path);
      if (label) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const text = svg("text", {
          class: "graph-edge-label",
          x: mx,
          y: my - 4,
          "text-anchor": "middle"
        });
        text.textContent = label;
        this.edgesG.appendChild(text);
      }
    }
    _renderA11y() {
      renderA11yTable(this.model, this.a11yEl, this.opts.label);
    }
    // ---- 2.3 destroy() — teardown SPA (#657 __registerInstance) ----
    destroy() {
      if (this.viewport) {
        this.viewport.destroy();
        this.viewport = null;
      }
      if (this._resizeObs) {
        this._resizeObs.disconnect();
        this._resizeObs = null;
      }
      if (this._onCanvasClick) this.svgEl.removeEventListener("click", this._onCanvasClick);
      if (this._onNodeKeydown) this.nodesG.removeEventListener("keydown", this._onNodeKeydown);
      if (this._onLiveKeydown) this.nodesG.removeEventListener("keydown", this._onLiveKeydown);
      if (this._onEditDblClick) this.svgEl.removeEventListener("dblclick", this._onEditDblClick);
      if (this._onEditKeydown) this.el.removeEventListener("keydown", this._onEditKeydown);
      if (this._toolbarEl) {
        this._toolbarEl.remove();
        this._toolbarEl = null;
      }
      if (this._liveTimer) {
        clearTimeout(this._liveTimer);
        this._liveTimer = null;
      }
      if (this._onKeydown) this.el.removeEventListener("keydown", this._onKeydown);
      this.model.removeEventListener("graph:model:change", this._onChange);
      this._paintToken++;
      if (this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = null;
      }
      if (this.measureHost) {
        this.measureHost.remove();
        this.measureHost = null;
      }
      this.el.innerHTML = "";
      delete this.el.dataset.bound;
    }
  };

  // shared/graph/index.js
  function createGraph(el, opts) {
    const renderer = new SvgRenderer(el, opts || {});
    const destroy = () => renderer.destroy();
    if (typeof window !== "undefined" && typeof window.__registerInstance === "function") {
      window.__registerInstance(el, destroy);
    }
    return {
      model: renderer.model,
      destroy,
      svg: renderer.svgEl,
      // --- viewport (#667) — no-op si opts.viewport===false ---
      getViewport: () => renderer.viewport ? renderer.viewport.getViewport() : null,
      setViewport: (v) => renderer.viewport && renderer.viewport.setViewport(v),
      screenToWorld: (cx, cy) => renderer.viewport ? renderer.viewport.screenToWorld(cx, cy) : null,
      // --- fit + selection + resize (#668, I2-2) ---
      fit: () => renderer.fit(),
      zoomToNode: (id, k) => renderer.zoomToNode(id, k),
      select: (id) => renderer.select(id),
      getSelection: () => renderer.getSelection(),
      // --- nav clavier (#671, I4-1) — no-op si opts.keyboardNav===false (noeud introuvable) ---
      focusNode: (id) => renderer._focusNode(id)
    };
  }

  // shared/graph/global-entry-engine.js
  window.MSYXGraph = { createGraph, GraphModel, toModel };
})();
