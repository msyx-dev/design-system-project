// pointer-drag.js — util de drag pointer unifié (#657, I1a)
// Source canonique ES module — cf. spec §1 (commentaire de groom/spec #657).
//
// Retourne une fonction destroy() qui retire TOUS les listeners (leak-safe).
// Listeners posés sur `handle` (pas sur document) → setPointerCapture, pas de fuite SPA.
// Le handle DOIT porter `touch-action: none` en CSS pour un drag tactile fluide
// (sinon le navigateur intercepte le geste comme un scroll).
//
// @param {Element} handle - élément qui capte le pointeur (setPointerCapture)
// @param {Object} [opts]
// @param {Function} [opts.onStart] - (e, {clientX, clientY}) appelé au pointerdown
// @param {Function} [opts.onMove] - (e, {clientX, clientY}) appelé pendant le drag
// @param {Function} [opts.onEnd] - (e, {clientX, clientY}) appelé au pointerup/pointercancel
// @param {'x'|'y'|undefined} [opts.axis] - informatif uniquement, le calcul reste au consumer
// @param {string} [opts.cursor] - curseur CSS appliqué au handle pendant le drag
// @returns {Function} destroy - retire les 4 listeners + relâche la capture pointeur si active
export function pointerDrag(handle, { onStart, onMove, onEnd, axis, cursor } = {}) {
  let dragging = false;
  let activePointerId = null;

  function point(e) {
    return { clientX: e.clientX, clientY: e.clientY };
  }

  function onPointerDown(e) {
    dragging = true;
    activePointerId = e.pointerId;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (err) {
      /* déjà capturé ou non supporté — best-effort */
    }
    if (cursor) handle.style.cursor = cursor;
    if (onStart) onStart(e, point(e));
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    if (onMove) onMove(e, point(e));
  }

  function endDrag(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    dragging = false;
    if (cursor) handle.style.cursor = '';
    try {
      if (activePointerId != null) handle.releasePointerCapture(activePointerId);
    } catch (err) {
      /* déjà relâché — best-effort */
    }
    activePointerId = null;
    if (onEnd) onEnd(e, point(e));
  }

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  return function destroy() {
    handle.removeEventListener('pointerdown', onPointerDown);
    handle.removeEventListener('pointermove', onPointerMove);
    handle.removeEventListener('pointerup', endDrag);
    handle.removeEventListener('pointercancel', endDrag);
    if (dragging) {
      try {
        if (activePointerId != null) handle.releasePointerCapture(activePointerId);
      } catch (err) {
        /* déjà relâché — best-effort */
      }
      dragging = false;
    }
  };
}
