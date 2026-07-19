// viewport.js — pan/zoom/pinch du moteur graph (#667, I2-1)
// Pipeline: transform sur <g class="graph-viewport"> ; mapping ecran<->monde via
// getScreenCTM (le viewBox rend le SVG non 1:1 px) puis inverse de la transform vp.
// Fonctions pures DOM-free (testables Node) + classe Viewport (cablage DOM).

/** clamp du facteur de zoom entre bornes (tokens --graph-zoom-min/-max). */
export function clampZoom(k, min, max) {
  return Math.min(max, Math.max(min, k));
}

/** point espace-utilisateur SVG -> monde (inverse de la transform vp). */
export function userToWorld({ x, y }, vp) {
  return { x: (x - vp.tx) / vp.k, y: (y - vp.ty) / vp.k };
}

/** point monde -> espace-utilisateur SVG (applique la transform vp). */
export function worldToUser({ x, y }, vp) {
  return { x: x * vp.k + vp.tx, y: y * vp.k + vp.ty };
}

/**
 * Zoom ancre : renvoie une nouvelle vp telle que le point (ux,uy) en espace
 * utilisateur reste FIXE a l'ecran. Garantit worldToUser(userToWorld(p)) invariant.
 */
export function zoomAt(vp, ux, uy, factor, min, max) {
  const k2 = clampZoom(vp.k * factor, min, max);
  // world sous le point = (u - t)/k ; on veut u = world*k2 + t2 => t2 = u - world*k2
  const tx = ux - ((ux - vp.tx) / vp.k) * k2;
  const ty = uy - ((uy - vp.ty) / vp.k) * k2;
  return { tx, ty, k: k2 };
}

const LOD_COMPACT_K = 0.5; // sous ce k : masquer les labels d'arete (.graph--lod-compact)

export class Viewport {
  /**
   * @param {SVGSVGElement} svgEl - le <svg class="graph-canvas">
   * @param {SVGGElement} groupEl - le <g class="graph-viewport">
   * @param {HTMLElement} host - le conteneur .graph (cible de graph:viewport:change)
   * @param {{min?:number,max?:number,initial?:{tx,ty,k}}} [opts]
   */
  constructor(svgEl, groupEl, host, opts = {}) {
    this.svgEl = svgEl;
    this.groupEl = groupEl;
    this.host = host;
    this.min = opts.min ?? 0.2;
    this.max = opts.max ?? 4;
    this.vp = opts.initial ? { ...opts.initial } : { tx: 0, ty: 0, k: 1 };

    this._pointers = new Map(); // pointerId -> {x,y} ecran, pour le pinch
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

    // Wheel-zoom ancre curseur (passive:false pour preventDefault).
    svgEl.addEventListener('wheel', this._onWheel, { passive: false });
    // Pinch : tracker 2-pointeurs dedie.
    svgEl.addEventListener('pointerdown', this._onPointerDown);
    svgEl.addEventListener('pointermove', this._onPointerMove);
    svgEl.addEventListener('pointerup', this._onPointerUp);
    svgEl.addEventListener('pointercancel', this._onPointerUp);
    // Pan : util partage #657 (single-pointer, capture, leak-safe). Deltas calcules ici.
    this._panDestroy = window.__pointerDrag
      ? window.__pointerDrag(svgEl, {
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
              k: this.vp.k,
            });
          },
          onEnd: () => {
            this._panStart = null;
          },
          cursor: 'grabbing',
        })
      : null;

    this.apply();
  }

  /** point ecran -> espace-utilisateur SVG (independant de la transform vp). */
  screenToUser(clientX, clientY) {
    const ctm = this.svgEl.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY }; // env sans layout (defensif)
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
      new CustomEvent('graph:viewport:change', {
        detail: { ...this.vp },
        bubbles: true,
      })
    );
  }

  apply() {
    const { tx, ty, k } = this.vp;
    this.groupEl.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
    this.groupEl.style.setProperty('--graph-inv-k', String(1 / k));
    this.host.classList.toggle('graph--lod-compact', k < LOD_COMPACT_K);
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
    this.svgEl.removeEventListener('wheel', this._onWheel);
    this.svgEl.removeEventListener('pointerdown', this._onPointerDown);
    this.svgEl.removeEventListener('pointermove', this._onPointerMove);
    this.svgEl.removeEventListener('pointerup', this._onPointerUp);
    this.svgEl.removeEventListener('pointercancel', this._onPointerUp);
    if (this._panDestroy) this._panDestroy();
    this._pointers.clear();
  }
}
