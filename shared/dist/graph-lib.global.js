/* GENERE — ne pas editer a la main. Source: shared/graph/lib/. Regenerer via ./shared/graph/build.sh (#657) */
(() => {
  // shared/graph/lib/pointer-drag.js
  function pointerDrag(handle, { onStart, onMove, onEnd, axis, cursor } = {}) {
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
      }
      if (cursor) handle.style.cursor = cursor;
      if (onStart) onStart(e, point(e));
      e.preventDefault();
    }
    function onPointerMove(e) {
      if (!dragging) return;
      if (onMove) onMove(e, point(e));
    }
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (cursor) handle.style.cursor = "";
      try {
        if (activePointerId != null) handle.releasePointerCapture(activePointerId);
      } catch (err) {
      }
      activePointerId = null;
      if (onEnd) onEnd(e, point(e));
    }
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    return function destroy() {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", endDrag);
      handle.removeEventListener("pointercancel", endDrag);
      if (dragging) {
        try {
          if (activePointerId != null) handle.releasePointerCapture(activePointerId);
        } catch (err) {
        }
        dragging = false;
      }
    };
  }

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

  // shared/graph/lib/global-entry.js
  window.__pointerDrag = pointerDrag;
  window.__svg = svg;
})();
