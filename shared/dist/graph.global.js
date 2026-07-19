/* GENERE — ne pas editer a la main. Source: shared/graph/. Regenerer via ./shared/graph/build.sh (#666) */
(() => {
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

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

  // shared/graph/layout/index.js
  var REGISTRY = /* @__PURE__ */ new Map();
  function registerLayout(name, run) {
    REGISTRY.set(name, run);
  }
  function resolveLayout(name) {
    return REGISTRY.get(name) || REGISTRY.get("fixed");
  }
  registerLayout("fixed", fixedLayout);
  registerLayout("tree", treeLayout);

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

  // shared/graph/render/svg-renderer.js
  var uidCounter = 0;
  var DEFAULT_SIZE2 = { w: 120, h: 40 };
  var LABEL_PADDING = 12;
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
      this._onChange = this._onChange.bind(this);
      this._build();
      this.model.addEventListener("graph:model:change", this._onChange);
      this.measure();
      this.paint();
      if (this.opts.a11yTable !== false) this._renderA11y();
    }
    // ---- 2.1 Structure SVG emise ----
    _build() {
      this.el.classList.add("graph");
      this.el.setAttribute("role", "group");
      this.el.setAttribute("aria-roledescription", "graphe");
      const descId = `graph-${this.uid}-desc`;
      this.svgEl = svg("svg", {
        class: "graph-canvas",
        role: "img",
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
      this.edgesG = svg("g", { class: "graph-edges", "aria-hidden": "true" });
      this.nodesG = svg("g", { class: "graph-nodes" });
      this.svgEl.appendChild(this.edgesG);
      this.svgEl.appendChild(this.nodesG);
      this.a11yEl = document.createElement("div");
      this.a11yEl.className = "graph-a11y";
      this.a11yEl.id = descId;
      this.el.innerHTML = "";
      this.el.appendChild(this.svgEl);
      this.el.appendChild(this.a11yEl);
    }
    // ---- 2.3 Cycle de vie observe -> repaint(rAF) -> destroy ----
    _onChange() {
      this._scheduleRepaint();
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
        w: Math.max(DEFAULT_SIZE2.w, Math.ceil(box.width) + LABEL_PADDING * 2),
        h: Math.max(DEFAULT_SIZE2.h, Math.ceil(box.height) + LABEL_PADDING * 2)
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
        w: Math.max(DEFAULT_SIZE2.w, Math.ceil(rect.width)),
        h: Math.max(DEFAULT_SIZE2.h, Math.ceil(rect.height))
      };
    }
    _buildRichContent(node) {
      return typeof this.opts.renderNode === "function" ? this.opts.renderNode(node) : graphCard(node);
    }
    // ---- 2.2.3 paint(positions, sizes) ----
    paint() {
      const run = resolveLayout(this.opts.layout || "fixed");
      const positions = run(this.model, { ...this.opts.layoutOptions || {}, sizes: this.sizes });
      this.nodesG.innerHTML = "";
      this.edgesG.innerHTML = "";
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      this.model.nodes.forEach((node) => {
        const id = node.data.id;
        const size = this.sizes.get(id) || DEFAULT_SIZE2;
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
    }
    _paintNode(node, left, top, size) {
      const id = node.data.id;
      const { className, icon } = resolveNodeType(node, this.opts.nodeTypes);
      const g = svg("g", {
        class: `graph-node${className ? " " + className : ""}`,
        transform: `translate(${left},${top})`,
        "data-node-id": id,
        role: "img",
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
      this.model.removeEventListener("graph:model:change", this._onChange);
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
    return { model: renderer.model, destroy, svg: renderer.svgEl };
  }

  // shared/graph/global-entry-engine.js
  window.MSYXGraph = { createGraph, GraphModel, toModel };
})();
