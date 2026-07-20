// svg-renderer.js — SvgRenderer : pipeline measure -> layout -> paint (#666, I1b-2)
// Decouplage layout/paint : le layout renvoie des {x,y} PURS (DOM-free) ; le renderer
// peint avec var(--graph-*), AUCUNE couleur en dur -> repaint gratuit sur les 6 combos
// theme/mode (la cascade CSS repeint, zero recalcul JS au toggle).
// measure != mutation modele : les tailles effectives vivent dans une Map INTERNE au
// renderer (`node.size` si fourni, sinon mesure) ; le modele n'est JAMAIS mute par le
// rendu (sinon boucle measure -> updateNode -> graph:model:change -> repaint -> measure).
import { svg } from '../lib/svg.js';
import { buildSpanningTree } from '../lib/spanning-tree.js';
import { nextFocusAfterRemoval } from '../lib/edit-focus.js';
import { GraphModel, GraphHistory } from '../model/index.js';
import { resolveLayout } from '../layout/index.js';
import { resolveNodeType, graphCard } from './node-types.js';
import { renderA11yTable } from './a11y-table.js';
import { Viewport, zoomAt, worldToUser } from './viewport.js';
import { nearestNodeAt } from './port-drop.js';

let uidCounter = 0;
const DEFAULT_SIZE = { w: 120, h: 40 };
const LABEL_PADDING = 12;
const KEY_PAN_STEP = 40; // #668 — pas de pan clavier (fleches), unite espace-utilisateur
const LIVE_ANNOUNCE_DEBOUNCE_MS = 300; // #672 — annonce des connexions au repos
const NEW_NODE_LABEL = 'Nœud'; // #673 — libelle par defaut d'un noeud cree en mode edition
const ROLE_DOCUMENT = 'graphics-document'; // #671 — role par defaut (nav SR/clavier I4)
const ROLE_APPLICATION = 'application'; // #674 — role LOCAL, pose uniquement pendant l'edition inline (arbitrage A, #662)

/** echappement minimal — le moteur graph est un module ESM isole (pas d'acces a
 * escapeHTML() de components.js, monde monolithe distinct, cf. README frontiere D1). */
function escHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

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
    this._initSelection();
    this._initNodeNav();
    this._initLive();
    this._initResize();
    this._initKeyboard();
    if (this.opts.mode === 'edit') this._initEdit(); // #673 — mode édition (toolbar + create/delete)
    // etat VR deterministe : pose le halo SANS ouvrir le modal (silent) — cf. #668 §5.2.
    if (this.opts.initialSelection) this.select(this.opts.initialSelection, { silent: true });
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

  // ---- Selection (#668) — concern de vue, GraphModel reste pur (invariant #665/#666) ----
  // Pre-requis de l'edition (I5) : API/classes/evenement fixes ici.
  _initSelection() {
    if (this.opts.selectable === false) return;
    this._selection = null;
    this._onCanvasClick = (e) => {
      // #673 — bug pre-existant (#668, I2-2) decouvert en ecrivant les tests d'edition :
      // Viewport (#667) pose setPointerCapture() sur svgEl a CHAQUE pointerdown (pan) ->
      // meme un clic SANS deplacement voit son evenement 'click' compat RETARGETE sur
      // svgEl (e.target === svgEl, jamais le noeud/arete sous le curseur). Un hit-test
      // frais via elementFromPoint(clientX,clientY) (memes coordonnees ecran, PAS affectees
      // par le retargeting) retrouve le vrai element -> necessaire ici ET pour le mode
      // "Relier" (#673) qui repose sur le meme clic noeud source/cible.
      const hit = this._hitTest(e);
      // mode "Relier" actif : le clic construit une arete (source puis cible), court-circuite
      // la selection normale. `this._connectMode` reste undefined (falsy) hors mode edit ->
      // AUCUN changement de comportement en mode view.
      if (this._connectMode) {
        this._handleConnectClick(hit);
        return;
      }
      const nodeG = hit && hit.closest('.graph-node');
      const edgeP = hit && hit.closest('.graph-edge');
      if (nodeG && nodeG.dataset.nodeId) this.select(nodeG.dataset.nodeId);
      else if (edgeP && edgeP.dataset.edgeId) this.select(edgeP.dataset.edgeId);
      // clic sur le fond : ne PAS deselectionner (le pan tire dessus) — Escape/select(null) deselectionne
    };
    this.svgEl.addEventListener('click', this._onCanvasClick);
  }

  /** hit-test frais aux coordonnees ecran de l'evenement — contourne le retargeting de
   * `e.target` par setPointerCapture() (#667, cf. commentaire _onCanvasClick ci-dessus). */
  _hitTest(e) {
    const doc = this.svgEl.ownerDocument;
    if (!doc || typeof doc.elementFromPoint !== 'function') return e.target;
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
    // 1. purge l'etat visuel precedent
    this.nodesG.querySelectorAll('.graph-node--selected').forEach((n) => n.classList.remove('graph-node--selected'));
    this.edgesG.querySelectorAll('.graph-edge--selected').forEach((p) => p.classList.remove('graph-edge--selected'));

    if (id == null) {
      this._selection = null;
      this._emitSelection();
      return;
    }

    const kind = this.model.hasNode(id) ? 'node' : this.model.hasEdge(id) ? 'edge' : null;
    if (!kind) {
      this._selection = null;
      this._emitSelection();
      return;
    }

    if (kind === 'node') {
      const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
      if (g) {
        g.classList.add('graph-node--selected');
        g.setAttribute('tabindex', '-1');
        // #671 — continuite souris<->clavier : la selection suit le roving. Gate a la
        // source (le caller) plutot que dans _setRoving() : en keyboardNav:false le
        // noeud reste focusable programmatiquement (tabindex="-1" ci-dessus) mais ne
        // doit JAMAIS devenir un tab-stop (sinon une fleche pressee dessus bubble au
        // conteneur et reintroduit le conflit pan/traversee que #671 resout).
        if (this.opts.keyboardNav !== false) this._setRoving(id);
        if (!silent) g.focus?.(); // pas de vol de focus au chargement (initialSelection)
        if (!silent) this._announce(id); // #672 — live-region SR : label immediat + connexions debounce/i
      }
    } else {
      const p = this.edgesG.querySelector(`[data-edge-id="${CSS.escape(id)}"]`);
      if (p) p.classList.add('graph-edge--selected');
    }
    this._selection = { id, kind };
    this._emitSelection();

    // 3. detail : callback consumer, sinon modal DS par defaut — jamais au chargement (silent)
    if (silent) return;
    if (typeof this.opts.onSelect === 'function') this.opts.onSelect(this._selection);
    else if (this.opts.selectionDetail !== false) this._openDetail(id, kind);
  }

  _emitSelection() {
    this.el.dispatchEvent(
      new CustomEvent('graph:selection:change', {
        detail: this._selection ? { ...this._selection } : { id: null, kind: null },
        bubbles: true,
      })
    );
  }

  _openDetail(id, kind) {
    if (typeof window === 'undefined' || typeof window.__openModal !== 'function') return;
    if (kind === 'node') {
      const node = this.model.getNode(id);
      const label = (node.data && node.data.label) || id;
      const neighbors = this.model.neighbors(id).map((nid) => {
        const n = this.model.getNode(nid);
        return (n && n.data && n.data.label) || nid;
      });
      window.__openModal({
        title: label,
        bodyHTML:
          `<p>Type : ${escHtml((node.data && node.data.type) || '—')}</p>` +
          `<p>Voisins : ${neighbors.length ? neighbors.map(escHtml).join(', ') : 'aucun'}</p>`,
      });
    } else {
      const edge = this.model.getEdge(id);
      const { source, target, label } = edge.data;
      window.__openModal({
        title: label || 'Arête',
        bodyHTML: `<p>${escHtml(source)} → ${escHtml(target)}</p>`,
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
    this.nodesG.addEventListener('keydown', this._onNodeKeydown);
    this._restoreNodeNav();
  }

  /** Mapping clavier WAI-ARIA APG tree. */
  _handleNodeKey(e) {
    const nodeG = e.target && typeof e.target.closest === 'function' ? e.target.closest('.graph-node') : null;
    if (!nodeG || !nodeG.dataset.nodeId || !this._tree) return; // focus hors noeud -> bubble (pan I2-2)
    const id = nodeG.dataset.nodeId;
    if (!this.model.hasNode(id)) return;
    const { parent, children, order } = this._tree;

    switch (e.key) {
      case 'ArrowUp': {
        const p = parent.get(id);
        if (p != null) this._focusNode(p);
        e.preventDefault();
        e.stopPropagation();
        break;
      }
      case 'ArrowDown': {
        const kids = children.get(id) || [];
        if (kids.length) this._focusNode(kids[0]);
        e.preventDefault();
        e.stopPropagation();
        break;
      }
      case 'ArrowLeft': {
        const prev = this._sibling(id, -1);
        if (prev) this._focusNode(prev);
        e.preventDefault();
        e.stopPropagation();
        break;
      }
      case 'ArrowRight': {
        const next = this._sibling(id, 1);
        if (next) this._focusNode(next);
        e.preventDefault();
        e.stopPropagation();
        break;
      }
      case 'Home':
        if (order[0]) this._focusNode(order[0]);
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'End':
        if (order[order.length - 1]) this._focusNode(order[order.length - 1]);
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'Enter':
      case ' ':
        this.select(id);
        e.preventDefault();
        e.stopPropagation();
        break;
      default:
        return; // Escape/f/+/- (et le reste) bubblent -> comportement I2-2 (#668) reutilise
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
    return next !== undefined ? next : null;
  }

  /** roving + focus DOM + recentrage conditionnel (nav clavier -> #671). */
  _focusNode(id) {
    if (this.opts.keyboardNav === false) return; // #671 — API publique focusNode() : meme garde que _initNodeNav()
    const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
    if (!g) return;
    this._setRoving(id);
    g.focus();
    this._ensureNodeVisible(id);
    this._announce(id); // #672 — live-region SR : label immediat + connexions debounce/i
  }

  /** exactement UN noeud tabindex=0 (le courant) — tous les autres -1. */
  _setRoving(id) {
    this._rovingId = id;
    this._syncRovingTabindex();
  }

  _syncRovingTabindex() {
    this.nodesG.querySelectorAll('.graph-node').forEach((g) => {
      g.setAttribute('tabindex', g.dataset.nodeId === this._rovingId ? '0' : '-1');
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
    const size = this.sizes.get(id) || DEFAULT_SIZE;
    const vp = this.viewport.getViewport();
    const left = center.x - size.w / 2;
    const top = center.y - size.h / 2;
    const p1 = worldToUser({ x: left, y: top }, vp);
    const p2 = worldToUser({ x: left + size.w, y: top + size.h }, vp);
    const box = this._currentViewBox();
    if (!box) return;
    const withinX = p1.x >= box.x && p2.x <= box.x + box.width;
    const withinY = p1.y >= box.y && p2.y <= box.y + box.height;
    if (withinX && withinY) return; // deja visible -> aucun mouvement de camera
    this.zoomToNode(id, vp.k); // recentre, garde le zoom courant
  }

  _currentViewBox() {
    const attr = this.svgEl.getAttribute('viewBox');
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
      if (e.key !== 'i' && e.key !== 'I') return;
      const nodeG = e.target && typeof e.target.closest === 'function' ? e.target.closest('.graph-node') : null;
      if (!nodeG || !nodeG.dataset.nodeId) return;
      if (this._liveTimer) {
        clearTimeout(this._liveTimer);
        this._liveTimer = null;
      }
      this._announceConnections(nodeG.dataset.nodeId);
    };
    this.nodesG.addEventListener('keydown', this._onLiveKeydown);
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
    const label = (node.data && node.data.label) || id;
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
    const label = (node.data && node.data.label) || id;
    const neighborLabels = this.model.neighbors(id).map((nid) => {
      const n = this.model.getNode(nid);
      return (n && n.data && n.data.label) || nid;
    });
    this.liveEl.textContent = neighborLabels.length
      ? `${label}. Connecté à ${neighborLabels.length} : ${neighborLabels.join(', ')}`
      : `${label}. Aucune connexion`;
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
    // on veut worldToUser(center, vp) === mid  =>  t = mid - center*k
    this.viewport.setViewport({ tx: mid.x - center.x * k, ty: mid.y - center.y * k, k });
  }

  // ---- ResizeObserver (#668) — 1re primitive RO du DS. Le responsive est DEJA assure
  // par le viewBox (centre-monde + zoom preserves) : le RO est un hook teardown-safe,
  // debounce rAF, avec re-fit CONDITIONNEL (ne casse jamais la vue d'un utilisateur qui
  // a navigue). ----
  _initResize() {
    if (typeof ResizeObserver === 'undefined') return; // env sans RO (defensif)
    let raf = null;
    this._resizeObs = new ResizeObserver(() => {
      if (raf) return; // debounce rAF — evite les boucles de relayout
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
    this.el.setAttribute('tabindex', '0'); // le conteneur capte le clavier viewport
    this._onKeydown = (e) => {
      const rect = this.svgEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const u = this.viewport ? this.viewport.screenToUser(cx, cy) : null;
      switch (e.key) {
        case 'Escape':
          if (this._connectMode) {
            this._toggleConnectMode(); // sortie clavier du mode « Relier » (clear source + aria-pressed) — #673 review
            break;
          }
          this.select(null);
          break;
        case 'f':
        case 'F':
          this.fit();
          break;
        case '+':
        case '=':
          if (u) this._zoomStep(u, 1.2);
          e.preventDefault();
          break;
        case '-':
        case '_':
          if (u) this._zoomStep(u, 1 / 1.2);
          e.preventDefault();
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          this._panStep(e.key);
          e.preventDefault();
          break;
        default:
          return;
      }
    };
    this.el.addEventListener('keydown', this._onKeydown);
  }

  _zoomStep(u, factor) {
    if (!this.viewport) return;
    this.viewport.setViewport(zoomAt(this.viewport.getViewport(), u.x, u.y, factor, this.viewport.min, this.viewport.max));
  }

  _panStep(key) {
    if (!this.viewport) return;
    const vp = this.viewport.getViewport();
    const delta = { ArrowUp: [0, KEY_PAN_STEP], ArrowDown: [0, -KEY_PAN_STEP], ArrowLeft: [KEY_PAN_STEP, 0], ArrowRight: [-KEY_PAN_STEP, 0] }[
      key
    ];
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

    // #675, I5-3 — historique undo/redo (pile de patches inverses). Observe le modele :
    // toute mutation d'edition (create/delete/inline/lien) est captee automatiquement.
    this.history = new GraphHistory(this.model);

    this._buildToolbar();

    // Double-clic sur un NOEUD -> edition inline du label (#674, I5-2) ; sur le FOND
    // (cible != .graph-node) -> creation au point (screenToWorld, inchange depuis #673).
    // _hitTest() (pas e.target, cf. _onCanvasClick) : le pan (#667) capture le pointeur sur
    // svgEl a chaque pointerdown -> 'dblclick' est retargete comme 'click', meme mecanique.
    this._onEditDblClick = (e) => {
      if (this._inlineEdit) return; // #674 — neutralise les gestes concurrents pendant l'edition
      const hit = this._hitTest(e);
      const nodeG = hit && hit.closest && hit.closest('.graph-node');
      if (nodeG && nodeG.dataset.nodeId) {
        this._startInlineEdit(nodeG.dataset.nodeId);
        return;
      }
      const world = this._clientToWorld(e.clientX, e.clientY);
      this._createNodeAt(world.x, world.y);
    };
    this.svgEl.addEventListener('dblclick', this._onEditDblClick);

    // Clavier edition (#673 : Suppr ; #675 : undo/redo). Listener sur `this.el` : les <g>
    // noeuds focuses sont des descendants -> leur keydown bubble ici (les listeners
    // nodesG #671/#672 ne consomment que fleches/Home/End/Enter/i, jamais Ctrl+Z). L'input
    // inline fait `e.stopPropagation()` inconditionnel -> Ctrl+Z DANS le champ = undo natif,
    // ne remonte jamais ici (aucun conflit avec l'undo du graphe).
    this._onEditKeydown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) this._redo();
        else this._undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this._redo();
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!this.getSelection()) return;
      e.preventDefault();
      this._deleteSelection();
    };
    this.el.addEventListener('keydown', this._onEditKeydown);
  }

  // ---- undo/redo (#675, I5-3) — Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z (ou Ctrl+Y) ----
  _undo() {
    if (!this.history) return;
    const roving = this._rovingId;
    if (this.history.undo()) this._afterHistoryNav(roving);
  }

  _redo() {
    if (!this.history) return;
    const roving = this._rovingId;
    if (this.history.redo()) this._afterHistoryNav(roving);
  }

  /**
   * Focus post-undo/redo. Les mutations d'undo/redo emettent `graph:model:change` ->
   * `_onChange` planifie UN repaint (rAF) qui wipe nodesG.innerHTML (perte du focus DOM) et
   * reconstruit `_tree`/roving via `_restoreNodeNav()` (mais NE repose PAS le focus). Ce rAF,
   * enregistre APRES celui du repaint (meme tick), s'execute juste apres lui -> on repose le
   * focus clavier sur le noeud roving s'il survit, sinon le 1er de l'ordre (meme mecanique
   * que _createNodeAt()/_deleteSelection(), #673). La selection perimee est deja purgee par
   * `_restoreSelectionVisual()` (#668) pendant le repaint.
   */
  _afterHistoryNav(prevRovingId) {
    requestAnimationFrame(() => {
      let target = prevRovingId && this.model.hasNode(prevRovingId) ? prevRovingId : null;
      if (!target) target = this._rovingId && this.model.hasNode(this._rovingId) ? this._rovingId : null;
      if (!target) {
        const first = this.model.nodes[0];
        target = first ? first.data.id : null;
      }
      if (target != null) this._focusNode(target);
    });
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
    const bar = document.createElement('div');
    bar.className = 'graph-toolbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Édition du graphe');

    const group = document.createElement('div');
    group.className = 'btn-group';

    const addBtn = this._toolbarButton('i-plus', 'Ajouter un nœud', () => this._createNodeCenter());
    const connectBtn = this._toolbarButton('i-link', 'Relier', () => this._toggleConnectMode());
    connectBtn.setAttribute('aria-pressed', 'false');
    const deleteBtn = this._toolbarButton('i-trash', 'Supprimer', () => this._deleteSelection());

    group.appendChild(addBtn);
    group.appendChild(connectBtn);
    group.appendChild(deleteBtn);
    bar.appendChild(group);

    this.el.appendChild(bar);
    this._toolbarEl = bar;
    this._connectBtn = connectBtn;
  }

  _toolbarButton(icon, label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon graph-toolbar__btn';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="/shared/icons/sprite.svg#${icon}"/></svg>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  _toggleConnectMode() {
    this._connectMode = !this._connectMode;
    if (this._connectBtn) {
      this._connectBtn.setAttribute('aria-pressed', String(this._connectMode));
    }
    if (!this._connectMode) this._clearConnectSource();
  }

  /**
   * clic nœud source puis clic nœud cible (mode "Relier") -> model.addEdge (#662, arbitrage B/C).
   * @param {Element} hit - element resolu par _hitTest() (PAS e.target, retargete par setPointerCapture)
   */
  _handleConnectClick(hit) {
    const nodeG = hit && hit.closest ? hit.closest('.graph-node') : null;
    if (!nodeG || !nodeG.dataset.nodeId) return; // clic hors noeud : ignore, ne consomme pas la source en cours
    const id = nodeG.dataset.nodeId;
    if (!this._connectSource) {
      this._connectSource = id;
      nodeG.classList.add('graph-node--connect-source');
      return;
    }
    const source = this._connectSource;
    this._clearConnectSource();
    if (source === id) return; // re-clic du meme noeud = annule la source, pas d'auto-boucle via ce mode
    this.model.addEdge({ data: { id: this._genEditId('e'), source, target: id, directed: true } });
  }

  _clearConnectSource() {
    if (this._connectSource) {
      const prev = this.nodesG.querySelector(`[data-node-id="${CSS.escape(this._connectSource)}"]`);
      if (prev) prev.classList.remove('graph-node--connect-source');
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
    const id = this._genEditId('n');
    this.model.addNode({ data: { id, label: NEW_NODE_LABEL }, position: { x, y } });
    requestAnimationFrame(() => this._focusCreatedNode(id));
  }

  /** contrat focus create (#662, arbitrage E) : select() (silent — pas de modal) puis focus DOM. */
  _focusCreatedNode(id) {
    if (!this.model.hasNode(id)) return; // instance detruite ou noeud deja retire entre-temps
    this.select(id, { silent: true }); // classList + tabindex + _setRoving, SANS modal ni focus
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
    if (sel.kind === 'node') {
      const dest = nextFocusAfterRemoval(this.model, this._tree, sel.id);
      this.model.removeNode(sel.id);
      requestAnimationFrame(() => {
        let target = dest;
        if (target == null || !this.model.hasNode(target)) {
          target = (this._tree && this._tree.order[0]) || null; // filet : order du modele post-repaint
        }
        if (target != null) this._focusNode(target);
      });
    } else if (sel.kind === 'edge') {
      this.model.removeEdge(sel.id);
      // Le repaint (rAF) recree les <g> noeuds (wipe innerHTML de _applyLayout) -> le noeud qui
      // portait le focus DOM est detruit ; _restoreNodeNav() ne remet que le tabindex, pas le
      // focus. Sans ca activeElement retombe sur <body> (perte de position clavier). L'arete
      // n'a pas de focus propre -> on restaure le focus sur le noeud roving courant (spec #673).
      requestAnimationFrame(() => {
        const rid = this._rovingId;
        if (rid && this.model.hasNode(rid)) {
          const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(rid)}"]`);
          if (g) g.focus();
        }
      });
    }
  }

  // ---- Edition inline du label (#674, I5-2) — declenchee par _onEditDblClick sur un noeud ----
  /**
   * Overlay HTML `<input class="graph-inline-edit">` positionne au-dessus du `<g>` noeud
   * (getBoundingClientRect, coordonnees CSS relatives au conteneur `.graph` — deja
   * position:relative pour la toolbar). Pre-rempli avec le label courant, focus pose (contrat
   * d'ouverture). Pose `role="application"` sur le `<svg>` (arbitrage A, #662) — LOCAL au
   * temps de l'edition, restaure a ROLE_DOCUMENT a la fermeture (`_closeInlineEdit`) : la nav
   * SR/clavier I4 (#671/#672) n'est JAMAIS degradee en dehors d'une session d'edition inline.
   */
  _startInlineEdit(id) {
    if (this._inlineEdit) return; // deja en edition -> neutralise un 2e dblclick concurrent
    const node = this.model.getNode(id);
    if (!node) return;
    const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
    if (!g) return;

    const hostRect = this.el.getBoundingClientRect();
    const nodeRect = g.getBoundingClientRect();

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input graph-inline-edit'; // reutilise .input (forms.css, tokens deja poses) + positionnement local
    input.setAttribute('aria-label', 'Libellé du nœud');
    const original = (node.data && node.data.label) || '';
    input.value = original;
    input.style.left = `${nodeRect.left - hostRect.left}px`;
    input.style.top = `${nodeRect.top - hostRect.top}px`;
    input.style.width = `${nodeRect.width}px`;
    input.style.height = `${nodeRect.height}px`;

    // stopPropagation INCONDITIONNEL : l'input est un DESCENDANT de `this.el`, qui porte les
    // listeners keydown de la nav clavier viewport (_onKeydown, #668) et de la suppression
    // (_onEditKeydown, #673) -> sans ce garde-fou, taper "f"/"+"/"-"/Suppr dans le label
    // declencherait fit/zoom/suppression PENDANT la frappe (#674, "neutraliser les gestes
    // concurrents").
    const onKeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        this._commitInlineEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this._cancelInlineEdit();
      }
    };
    const onBlur = () => this._commitInlineEdit();
    input.addEventListener('keydown', onKeydown);
    input.addEventListener('blur', onBlur);

    this._inlineEdit = { id, input, original, onKeydown, onBlur };
    if (this.history) this.history.beginTransaction(); // #675 — coalescing : 1 patch par session inline
    this.svgEl.setAttribute('role', ROLE_APPLICATION); // #662, arbitrage A — local, le temps de l'edition
    this.el.appendChild(input);
    input.focus();
    input.select();
  }

  /** Enter/blur : valide (skip si vide/inchange, #674) puis ferme. */
  _commitInlineEdit() {
    const state = this._inlineEdit;
    if (!state) return;
    const val = state.input.value.trim();
    const changed = val !== '' && val !== state.original;
    const { id } = state;
    this._closeInlineEdit();
    if (changed) this.model.updateNode(id, { data: { label: val } });
    // #675 — ferme la transaction inline APRES la mutation (record capte dans la session) ;
    // no-op si rien n'a change (transaction vide). Balance le beginTransaction de _startInlineEdit.
    if (this.history) this.history.commit();
    if (!changed) return;
    // Le repaint (rAF, cf. _scheduleRepaint) recree le <g> (wipe innerHTML de _applyLayout())
    // -> le focus synchrone pose par _closeInlineEdit() est perdu. Re-affirme APRES le repaint
    // reel (meme mecanique que _createNodeAt()/_deleteSelection(), #673).
    requestAnimationFrame(() => {
      if (!this.model.hasNode(id)) return;
      const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
      if (g) g.focus();
    });
  }

  /** Échap : annule sans mutation, ferme. */
  _cancelInlineEdit() {
    if (!this._inlineEdit) return;
    this._closeInlineEdit();
    if (this.history) this.history.commit(); // #675 — transaction vide (annulation) -> no-op
  }

  /**
   * Teardown partage commit/cancel/destroy() : retire l'overlay + listeners, restaure le role,
   * re-focus le `<g>` noeud (mecanique focus-restore, contrat WCAG 2.4.3). `this._inlineEdit`
   * est remis a `null` EN PREMIER (idempotence) : retirer un `<input>` focalise du DOM
   * declenche un `blur` SYNCHRONE -> sans cette garde, `onBlur` reinvoquerait
   * `_commitInlineEdit()` pendant sa propre fermeture (reentrance).
   */
  _closeInlineEdit() {
    const state = this._inlineEdit;
    if (!state) return;
    this._inlineEdit = null;
    state.input.removeEventListener('keydown', state.onKeydown);
    state.input.removeEventListener('blur', state.onBlur);
    state.input.remove();
    this.svgEl.setAttribute('role', ROLE_DOCUMENT);
    const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(state.id)}"]`);
    if (g) g.focus();
  }

  // ---- Ports/handles de connexion (#674, I5-2) — mode edit uniquement, drag-to-connect ----
  /**
   * Rayon SVG (unites "monde", COURANTES) du port, garantissant une hit-area
   * >=`--graph-port-size` CSS px (#662 arbitrage C) — QUEL QUE SOIT le niveau de zoom ou la
   * largeur du conteneur. Un rayon fige en unites monde se retrouve sous 44px des qu'un
   * conteneur etroit (mobile 375px) ou un zoom-out reduit l'echelle effective de rendu
   * (constat review #674 : echouait sur les projects Playwright `*-mobile`) -> recalcule a
   * CHAQUE repaint (appele par `_applyLayout()` juste avant de peindre, avec le `vw` FINAL
   * de ce repaint), jamais memoise. Echelle = largeur CSS RENDUE du `<svg>` / largeur du
   * viewBox : `.graph-canvas{width:100%;height:auto}` -> la largeur CSS ne depend QUE du
   * conteneur parent (jamais du viewBox, qui ne pilote que le ratio -> `height:auto`), donc
   * `getBoundingClientRect().width` reste valide meme lue AVANT que le NOUVEAU viewBox soit
   * pose sur le `<svg>` (contrairement a `getScreenCTM()`, dont le calcul aurait utilise le
   * viewBox encore PERIME du repaint precedent — piege initial de cette fonction).
   * `this.viewport.getViewport().k` (zoom courant du `<g class="graph-viewport">`, transform
   * DISTINCTE du viewBox, cf. viewport.js) complete l'echelle : world -> CSS px = svgScale * k.
   */
  _computePortRadius(vw) {
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(this.el) : null;
    const v = cs && parseFloat(cs.getPropertyValue('--graph-port-size'));
    const targetPx = Number.isFinite(v) ? v : 44;
    const rect = this.svgEl && typeof this.svgEl.getBoundingClientRect === 'function' ? this.svgEl.getBoundingClientRect() : null;
    const svgScale = rect && rect.width && vw ? rect.width / vw : 1; // CSS px par unite viewBox
    const k = this.viewport ? this.viewport.getViewport().k : (this.opts.initialViewport && this.opts.initialViewport.k) || 1;
    const scale = (svgScale || 1) * (k || 1);
    return targetPx / 2 / (scale || 1);
  }

  /** Peint le port d'un noeud (bord droit, milieu vertical) — appele par _paintNode() quand
   * opts.mode==='edit'. Recree a CHAQUE repaint (comme le reste de nodesG), meme convention
   * que le reste du renderer (aucun teardown explicite requis : l'element + ses listeners
   * sont garbage-collectes avec l'ancien <g> une fois nodesG.innerHTML wipe). */
  _paintPort(g, id, size) {
    const port = svg('circle', {
      class: 'graph-port',
      'data-port-for': id,
      cx: size.w,
      cy: size.h / 2,
      r: this._portRadius || 22,
    });
    g.appendChild(port);
    this._wirePortDrag(port, id);
  }

  /** Point d'ancrage MONDE du port (bord droit, meme espace que edgesG/positions). */
  _portAnchor(id) {
    if (!this.positions) return null;
    const center = this.positions.get(id);
    if (!center) return null;
    const size = this.sizes.get(id) || DEFAULT_SIZE;
    return { x: center.x + size.w / 2, y: center.y };
  }

  /**
   * Drag handle->cible (#662 arbitrage C) via `window.__pointerDrag` (#657, reutilise tel
   * quel — aucune duplication). Ligne fantome `.graph-port-link` (suit le pointeur via
   * `_clientToWorld`) ajoutee en enfant DIRECT de `viewportG` (PAS edgesG/nodesG : ces deux-la
   * sont wipes a chaque repaint par `_applyLayout()`, le fantome vivrait une existence
   * incertaine si un repaint survenait pendant le drag). Au drop : `nearestNodeAt()`
   * (`port-drop.js`, geometrique — cf. commentaire du fichier pour la divergence documentee
   * vs `_hitTest()`) desambiguise le chevauchement -> `model.addEdge` (validation lenient
   * existante, aucun doublon/auto-boucle EXTRA requis : `excludeId` exclut deja la source).
   */
  _wirePortDrag(port, sourceId) {
    if (typeof window === 'undefined' || !window.__pointerDrag) return;
    let ghost = null;
    const onEscape = (e) => {
      if (e.key !== 'Escape') return;
      this._portDragCancelled = true;
      if (this._activePortDragCleanup) this._activePortDragCleanup(); // retire le fantome tout de suite, pas d'attente du pointerup
    };
    window.__pointerDrag(port, {
      onStart: (e) => {
        e.stopPropagation(); // #674 — n'active PAS le pan/pinch du viewport (meme svgEl, cf. viewport.js)
        this._portDragCancelled = false;
        if (this.history) this.history.beginTransaction(); // #675 — 1 patch par session drag
        ghost = svg('path', { class: 'graph-port-link' });
        this.viewportG.appendChild(ghost);
        window.addEventListener('keydown', onEscape, true);
        this._activePortDragCleanup = () => {
          window.removeEventListener('keydown', onEscape, true);
          if (ghost) {
            ghost.remove();
            ghost = null;
          }
          this._activePortDragCleanup = null;
        };
      },
      onMove: (e, p) => {
        if (!ghost) return;
        const anchor = this._portAnchor(sourceId);
        if (!anchor) return;
        const world = this._clientToWorld(p.clientX, p.clientY);
        ghost.setAttribute('d', `M${anchor.x},${anchor.y} L${world.x},${world.y}`);
      },
      onEnd: (e, p) => {
        const cancelled = this._portDragCancelled;
        if (this._activePortDragCleanup) this._activePortDragCleanup();
        this._portDragCancelled = false;
        // #674 — arete uniquement si drop sur un noeud (hors source) et pas annule (Echap).
        if (!cancelled) {
          const world = this._clientToWorld(p.clientX, p.clientY);
          const targetId = nearestNodeAt(this.positions, this.sizes, world, sourceId);
          if (targetId) {
            this.model.addEdge({ data: { id: this._genEditId('e'), source: sourceId, target: targetId, directed: true } });
          }
        }
        // #675 — ferme la transaction drag sur TOUS les chemins (annule/sans cible = vide = no-op).
        if (this.history) this.history.commit();
      },
      cursor: 'crosshair',
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
      role: ROLE_DOCUMENT, // etait 'img' (#671) — expose les enfants focusables (noeuds)
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

    this.liveEl = document.createElement('div'); // #672 — annonces SR dynamiques
    this.liveEl.className = 'graph-live';
    this.liveEl.setAttribute('aria-live', 'polite');
    this.liveEl.setAttribute('aria-atomic', 'true');

    this.el.innerHTML = '';
    this.el.appendChild(this.svgEl);
    this.el.appendChild(this.a11yEl);
    this.el.appendChild(this.liveEl);
  }

  // ---- 2.3 Cycle de vie observe -> repaint(rAF) -> destroy ----
  _onChange(e) {
    this._scheduleRepaint();
    // #673, arbitrage F — alias semantique en mode edit, PAS un 2e canal de verite : porte
    // le meme detail que `graph:model:change` ({op,...}), simplement rebalance sur `.graph`
    // (le modele emet sur lui-meme, pas sur l'element hote) pour les consumers qui ecoutent
    // le conteneur plutot que `model`.
    if (this.opts.mode === 'edit') {
      this.el.dispatchEvent(new CustomEvent('graph:edit', { detail: e && e.detail, bubbles: true }));
    }
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
    // #674 review — un drag de port EN VOL a ses listeners poses sur le <circle> qui va etre
    // wipe par nodesG.innerHTML='' ci-dessous : une fois detache, plus AUCUN pointermove/up
    // reel ne peut plus l'atteindre (routage DOM standard) -> `onEnd` (pointer-drag.js) ne se
    // declenche JAMAIS -> fantome `.graph-port-link` bloque pour toujours + listener Echap
    // (window, ferme sur `this`) fuit definitivement (pire : ecrase par le PROCHAIN drag, donc
    // meme plus recuperable via destroy()). Repro confirmee : Suppr sur une selection tierce
    // PENDANT un drag de port declenche exactement ce repaint. Traite comme une annulation
    // propre (meme comportement qu'un Echap manuel) avant de wiper.
    if (this._activePortDragCleanup) {
      this._portDragCancelled = true;
      this._activePortDragCleanup();
    }
    this.positions = positions; // #668 — reutilise par zoomToNode()
    this.nodesG.innerHTML = '';
    this.edgesG.innerHTML = '';

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // #674 — pre-passe bbox PURE (positions+sizes deja en memoire, AUCUN DOM) : necessaire
    // pour connaitre `vw` AVANT de peindre les noeuds/ports. `_computePortRadius(vw)` a
    // besoin du viewBox FINAL (largeur CSS rendue / vw = echelle courante) -> sans cette
    // pre-passe, les ports du premier noeud peint seraient dimensionnes avec un `vw` perime
    // (celui du repaint precedent, ou aucun sur le tout premier paint) -> hit-area <44px sur
    // conteneurs etroits (constat review : echouait sur les projects Playwright `*-mobile`).
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
    });

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

    if (this.opts.mode === 'edit') this._portRadius = this._computePortRadius(vw);

    this.model.nodes.forEach((node) => {
      const id = node.data.id;
      const size = this.sizes.get(id) || DEFAULT_SIZE;
      const center = positions.get(id) || { x: 0, y: 0 };
      const left = center.x - size.w / 2;
      const top = center.y - size.h / 2;
      this._paintNode(node, left, top, size);
    });

    this.model.edges.forEach((edge) => this._paintEdge(edge, positions));

    this.svgEl.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);

    this._restoreSelectionVisual(); // #668 — nodesG/edgesG wipes ci-dessus perdent .graph-node--selected
    this._restoreNodeNav(); // #671 — idem pour le roving tabindex (nodesG.innerHTML='' ci-dessus)

    // #674 — la hit-area 44px ECRAN des ports depend du scale reel (rect.width/vw*k). Au paint
    // synchrone, svgEl.getBoundingClientRect() peut etre premature (largeur 0 ou desktop sur un
    // 1er rendu mobile) -> fallback svgScale=1 -> hit-area <44px sur conteneur etroit (echec
    // Playwright *-mobile). On recalcule en rAF (layout stabilise) et on met a jour les cercles
    // ports deja peints. Idempotent, mode edit uniquement.
    if (this.opts.mode === 'edit') {
      requestAnimationFrame(() => {
        const r = this._computePortRadius(vw);
        if (!(r > 0)) return;
        this._portRadius = r;
        this.nodesG.querySelectorAll('.graph-port').forEach((p) => p.setAttribute('r', String(r)));
      });
    }
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
    const stillExists = kind === 'node' ? this.model.hasNode(id) : this.model.hasEdge(id);
    if (!stillExists) {
      this._selection = null;
      this._emitSelection();
      return;
    }
    if (kind === 'node') {
      const g = this.nodesG.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
      if (g) {
        g.classList.add('graph-node--selected');
        g.setAttribute('tabindex', '-1');
      }
    } else {
      const p = this.edgesG.querySelector(`[data-edge-id="${CSS.escape(id)}"]`);
      if (p) p.classList.add('graph-edge--selected');
    }
  }

  _paintNode(node, left, top, size) {
    const id = node.data.id;
    const { className, icon } = resolveNodeType(node, this.opts.nodeTypes);
    const g = svg('g', {
      class: `graph-node${className ? ' ' + className : ''}`,
      transform: `translate(${left},${top})`,
      'data-node-id': id,
      role: 'graphics-symbol', // etait 'img' (#671) — noeud focusable expose
      tabindex: '-1', // roving : promu a '0' par _syncRovingTabindex()
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
    if (this.opts.mode === 'edit') this._paintPort(g, id, size); // #674 — handle de connexion (hit-area 44px)
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
    if (this._resizeObs) {
      this._resizeObs.disconnect();
      this._resizeObs = null;
    }
    if (this._onCanvasClick) this.svgEl.removeEventListener('click', this._onCanvasClick);
    if (this._onNodeKeydown) this.nodesG.removeEventListener('keydown', this._onNodeKeydown);
    if (this._onLiveKeydown) this.nodesG.removeEventListener('keydown', this._onLiveKeydown);
    // #673 — mode edition : listeners + toolbar overlay (no-op si mode !== 'edit')
    if (this._onEditDblClick) this.svgEl.removeEventListener('dblclick', this._onEditDblClick);
    if (this._onEditKeydown) this.el.removeEventListener('keydown', this._onEditKeydown);
    if (this._toolbarEl) {
      this._toolbarEl.remove();
      this._toolbarEl = null;
    }
    // #674 — edition inline ouverte : ferme sans mutation (force-close, pas de commit en teardown)
    if (this._inlineEdit) this._closeInlineEdit();
    // #674 — drag de port en vol : retire le fantome + le listener Echap (fuite sinon, window)
    if (this._activePortDragCleanup) this._activePortDragCleanup();
    // #675 — historique undo/redo : detache son listener graph:model:change + vide les piles
    if (this.history) {
      this.history.destroy();
      this.history = null;
    }
    if (this._liveTimer) {
      clearTimeout(this._liveTimer);
      this._liveTimer = null;
    }
    if (this._onKeydown) this.el.removeEventListener('keydown', this._onKeydown);
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
