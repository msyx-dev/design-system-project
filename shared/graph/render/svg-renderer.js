// svg-renderer.js — SvgRenderer : pipeline measure -> layout -> paint (#666, I1b-2)
// Decouplage layout/paint : le layout renvoie des {x,y} PURS (DOM-free) ; le renderer
// peint avec var(--graph-*), AUCUNE couleur en dur -> repaint gratuit sur les 6 combos
// theme/mode (la cascade CSS repeint, zero recalcul JS au toggle).
// measure != mutation modele : les tailles effectives vivent dans une Map INTERNE au
// renderer (`node.size` si fourni, sinon mesure) ; le modele n'est JAMAIS mute par le
// rendu (sinon boucle measure -> updateNode -> graph:model:change -> repaint -> measure).
import { svg } from '../lib/svg.js';
import { GraphModel } from '../model/index.js';
import { resolveLayout } from '../layout/index.js';
import { resolveNodeType, graphCard } from './node-types.js';
import { renderA11yTable } from './a11y-table.js';
import { Viewport } from './viewport.js';

let uidCounter = 0;
const DEFAULT_SIZE = { w: 120, h: 40 };
const LABEL_PADDING = 12;

export class SvgRenderer {
  /**
   * @param {HTMLElement} el - conteneur `.graph[data-graph]`
   * @param {Object} opts - cf. contrat createGraph() (shared/graph/index.js)
   */
  constructor(el, opts) {
    this.el = el;
    this.opts = opts || {};
    this.uid = ++uidCounter;
    this.model = this.opts.data instanceof GraphModel ? this.opts.data : new GraphModel(this.opts.data);
    this.sizes = new Map(); // Map<nodeId,{w,h}> — interne au renderer, jamais ecrite au modele
    this.raf = null;
    this.measureHost = null;
    this._paintToken = 0; // anti-course paint async (#670, I3-2) — cf. paint()/_applyLayout()
    this._onChange = this._onChange.bind(this);

    this._build();
    this.model.addEventListener('graph:model:change', this._onChange);
    this.measure();
    this.paint();
    if (this.opts.a11yTable !== false) this._renderA11y();
    this._initViewport();
  }

  // ---- Viewport pan/zoom/pinch (#667, I2-1) — opt-in par defaut ----
  _initViewport() {
    if (this.opts.viewport === false) return;
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(this.el) : null;
    const readNum = (name, fb) => {
      const v = cs && parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    this.viewport = new Viewport(this.svgEl, this.viewportG, this.el, {
      min: this.opts.zoomMin ?? readNum('--graph-zoom-min', 0.2),
      max: this.opts.zoomMax ?? readNum('--graph-zoom-max', 4),
      initial: this.opts.initialViewport || undefined,
    });
  }

  // ---- 2.1 Structure SVG emise ----
  _build() {
    this.el.classList.add('graph');
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-roledescription', 'graphe');
    const descId = `graph-${this.uid}-desc`;

    this.svgEl = svg('svg', {
      class: 'graph-canvas',
      role: 'img',
      'aria-label': this.opts.label || 'Graphe',
      'aria-describedby': descId,
      preserveAspectRatio: 'xMidYMid meet',
    });

    const defs = svg('defs');
    const marker = svg('marker', {
      id: `graph-arrow-${this.uid}`,
      class: 'graph-arrow',
      markerWidth: 8,
      markerHeight: 8,
      refX: 7,
      refY: 4,
      orient: 'auto-start-reverse',
    });
    marker.appendChild(svg('path', { d: 'M0,0 L8,4 L0,8 Z' }));
    defs.appendChild(marker);
    this.svgEl.appendChild(defs);

    this.viewportG = svg('g', { class: 'graph-viewport' });
    this.edgesG = svg('g', { class: 'graph-edges', 'aria-hidden': 'true' });
    this.nodesG = svg('g', { class: 'graph-nodes' });
    this.viewportG.appendChild(this.edgesG);
    this.viewportG.appendChild(this.nodesG);
    this.svgEl.appendChild(this.viewportG);

    this.a11yEl = document.createElement('div');
    this.a11yEl.className = 'graph-a11y';
    this.a11yEl.id = descId;

    this.el.innerHTML = '';
    this.el.appendChild(this.svgEl);
    this.el.appendChild(this.a11yEl);
  }

  // ---- 2.3 Cycle de vie observe -> repaint(rAF) -> destroy ----
  _onChange() {
    this._scheduleRepaint();
  }

  _scheduleRepaint() {
    if (this.raf) return; // N mutations groupees => 1 repaint
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
      if (node.size && typeof node.size.w === 'number' && typeof node.size.h === 'number') {
        this.sizes.set(id, { w: node.size.w, h: node.size.h });
        return;
      }
      this.sizes.set(id, this._isRich(node) ? this._measureRich(node) : this._measureSimple(node));
    });
  }

  _isRich(node) {
    return typeof this.opts.renderNode === 'function' || Boolean(node.data && node.data.rich);
  }

  _measureSimple(node) {
    const label = (node.data && node.data.label) || node.data.id || '';
    const probe = svg('g', { visibility: 'hidden' });
    const text = svg('text', { class: 'graph-node-label' });
    text.textContent = label;
    probe.appendChild(text);
    this.nodesG.appendChild(probe);
    let box = { width: 0, height: 0 };
    try {
      box = text.getBBox();
    } catch (e) {
      // Environnement sans layout SVG (ex. jsdom) -> fallback taille par defaut.
    }
    this.nodesG.removeChild(probe);
    return {
      w: Math.max(DEFAULT_SIZE.w, Math.ceil(box.width) + LABEL_PADDING * 2),
      h: Math.max(DEFAULT_SIZE.h, Math.ceil(box.height) + LABEL_PADDING * 2),
    };
  }

  _measureRich(node) {
    if (!this.measureHost) {
      this.measureHost = document.createElement('div');
      this.measureHost.className = 'graph-measure';
      this.measureHost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.measureHost);
    }
    const content = this._buildRichContent(node);
    this.measureHost.innerHTML = '';
    this.measureHost.appendChild(content);
    const rect = content.getBoundingClientRect();
    return {
      w: Math.max(DEFAULT_SIZE.w, Math.ceil(rect.width)),
      h: Math.max(DEFAULT_SIZE.h, Math.ceil(rect.height)),
    };
  }

  _buildRichContent(node) {
    return typeof this.opts.renderNode === 'function' ? this.opts.renderNode(node) : graphCard(node);
  }

  // ---- 2.2.3 paint(positions, sizes) — async-tolerant (#670, I3-2) ----
  // `run()` reste SYNCHRONE pour fixed/tree/radial/mindmap (aucun frame supplementaire,
  // 100% retro-compatible). Seul `layered` (dagre, dynamic import) renvoie une Promise.
  // Un thenable declenche l'extraction _applyLayout() + un token anti-course : si un
  // repaint plus recent demarre avant la resolution d'un paint async en vol, la
  // resolution tardive devient un no-op (jamais de flicker/ordre inverse).
  paint() {
    const run = resolveLayout(this.opts.layout || 'fixed');
    const result = run(this.model, { ...(this.opts.layoutOptions || {}), sizes: this.sizes });
    if (result && typeof result.then === 'function') {
      const token = ++this._paintToken;
      result.then((positions) => {
        if (token === this._paintToken) this._applyLayout(positions);
      });
      return;
    }
    this._applyLayout(result);
  }

  _applyLayout(positions) {
    this.nodesG.innerHTML = '';
    this.edgesG.innerHTML = '';

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.model.nodes.forEach((node) => {
      const id = node.data.id;
      const size = this.sizes.get(id) || DEFAULT_SIZE;
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
    this.svgEl.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  }

  _paintNode(node, left, top, size) {
    const id = node.data.id;
    const { className, icon } = resolveNodeType(node, this.opts.nodeTypes);
    const g = svg('g', {
      class: `graph-node${className ? ' ' + className : ''}`,
      transform: `translate(${left},${top})`,
      'data-node-id': id,
      role: 'img',
      'aria-label': (node.data && node.data.label) || id,
    });

    if (this._isRich(node)) {
      const fo = svg('foreignObject', { width: size.w, height: size.h });
      fo.appendChild(this._buildRichContent(node));
      g.appendChild(fo);
    } else {
      g.appendChild(svg('rect', { class: 'graph-node-bg', x: 0, y: 0, width: size.w, height: size.h, rx: 8 }));
      if (icon) {
        g.appendChild(
          svg('use', {
            class: 'graph-node-icon',
            href: `/shared/icons/sprite.svg#${icon}`,
            x: 8,
            y: size.h / 2 - 8,
            width: 16,
            height: 16,
          })
        );
      }
      const text = svg('text', {
        class: 'graph-node-label',
        x: size.w / 2,
        y: size.h / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      text.textContent = (node.data && node.data.label) || id;
      g.appendChild(text);
    }
    this.nodesG.appendChild(g);
  }

  _paintEdge(edge, positions) {
    const { source, target, directed, label } = edge.data;
    const p1 = positions.get(source);
    const p2 = positions.get(target);
    if (!p1 || !p2) return; // extremite non positionnee (defensif)

    const shape = this.opts.edgeShape === 'curved' ? 'curved' : 'straight';
    let d;
    if (shape === 'curved') {
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

    const path = svg('path', {
      class: 'graph-edge',
      d,
      'marker-end': directed === true ? `url(#graph-arrow-${this.uid})` : null,
      'data-edge-id': edge.data.id,
    });
    this.edgesG.appendChild(path);

    if (label) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const text = svg('text', {
        class: 'graph-edge-label',
        x: mx,
        y: my - 4,
        'text-anchor': 'middle',
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
    this.model.removeEventListener('graph:model:change', this._onChange);
    this._paintToken++; // invalide tout paint async en vol (#670) -> resolution tardive = no-op
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    if (this.measureHost) {
      this.measureHost.remove();
      this.measureHost = null;
    }
    this.el.innerHTML = '';
    delete this.el.dataset.bound;
  }
}
