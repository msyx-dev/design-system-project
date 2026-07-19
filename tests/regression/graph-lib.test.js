// Test unitaire — shared/graph/lib (#657, I1a)
// Couvre svg() (namespace, attrs null ignores), pointerDrag() (sequence
// pointerdown->move->up, destroy() leak-safe) et le registre de teardown SPA
// __registerInstance/__sweepDetached de shared/components.js (spec §3/§8).
//
// Pas de jsdom en devDependency (repo vanilla no-build) -> stubs DOM minimalistes
// cibles sur l'API reellement utilisee par ces fonctions. Le registre __sweepDetached
// est reproduit fidelement depuis shared/components.js (pas de require() possible sur
// ce fichier navigateur monolithique sans DOM complet) -> toute modification de sa
// logique dans components.js doit etre repercutee ici.
let FAILED = 0;

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    console.error(`FAIL: ${msg} — attendu ${JSON.stringify(expected)}, recu ${JSON.stringify(actual)}`);
    FAILED++;
  }
}

function assertTrue(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    FAILED++;
  }
}

class FakeSvgElement {
  constructor(tag) {
    this.tagName = tag;
    this.attrs = {};
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
}

global.document = {
  createElementNS(ns, tag) {
    const el = new FakeSvgElement(tag);
    el.__ns = ns;
    return el;
  },
};

class FakeHandle {
  constructor() {
    this.listeners = {};
    this.style = {};
    this.captured = null;
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this.listeners[type] || [];
    const idx = arr.indexOf(fn);
    if (idx >= 0) arr.splice(idx, 1);
  }
  dispatch(type, evt) {
    (this.listeners[type] || []).slice().forEach((fn) => fn(evt));
  }
  setPointerCapture(id) {
    this.captured = id;
  }
  releasePointerCapture(id) {
    if (this.captured === id) this.captured = null;
  }
}

async function main() {
  const { svg } = await import('../../shared/graph/lib/svg.js');
  const { pointerDrag } = await import('../../shared/graph/lib/pointer-drag.js');

  // ---- svg() ----
  const circle = svg('circle', { r: 5, cx: null });
  assertEqual(circle.tagName, 'circle', 'svg() cree le bon tag');
  assertEqual(circle.__ns, 'http://www.w3.org/2000/svg', 'svg() pose le namespace SVG');
  assertEqual(circle.attrs.r, '5', 'svg() pose les attrs fournis');
  assertTrue(!('cx' in circle.attrs), 'svg() ignore les attrs null');

  const bare = svg('g');
  assertTrue(Object.keys(bare.attrs).length === 0, 'svg() sans attrs ne pose rien');

  // ---- pointerDrag() ----
  const handle = new FakeHandle();
  let started = 0;
  let moved = 0;
  let ended = 0;
  const destroy = pointerDrag(handle, {
    onStart: () => {
      started++;
    },
    onMove: () => {
      moved++;
    },
    onEnd: () => {
      ended++;
    },
    axis: 'x',
  });

  handle.dispatch('pointerdown', { pointerId: 1, clientX: 0, clientY: 0, preventDefault() {} });
  assertEqual(started, 1, 'pointerDrag() appelle onStart au pointerdown');
  assertEqual(handle.captured, 1, 'pointerDrag() capture le pointeur au pointerdown');

  handle.dispatch('pointermove', { pointerId: 1, clientX: 10, clientY: 5 });
  assertEqual(moved, 1, 'pointerDrag() appelle onMove pendant le drag');

  handle.dispatch('pointerup', { pointerId: 1, clientX: 10, clientY: 5 });
  assertEqual(ended, 1, 'pointerDrag() appelle onEnd au pointerup');
  assertEqual(handle.captured, null, 'pointerDrag() relache le pointeur au pointerup');

  handle.dispatch('pointermove', { pointerId: 1, clientX: 20, clientY: 20 });
  assertEqual(moved, 1, 'pointerDrag() ignore onMove hors drag actif');

  destroy();
  assertEqual((handle.listeners.pointerdown || []).length, 0, 'destroy() retire pointerdown');
  assertEqual((handle.listeners.pointermove || []).length, 0, 'destroy() retire pointermove');
  assertEqual((handle.listeners.pointerup || []).length, 0, 'destroy() retire pointerup');
  assertEqual((handle.listeners.pointercancel || []).length, 0, 'destroy() retire pointercancel');

  handle.dispatch('pointerdown', { pointerId: 2, clientX: 0, clientY: 0, preventDefault() {} });
  assertEqual(started, 1, 'destroy() empeche tout nouveau start (leak-safe)');

  // Isolation multi-pointeurs : un pointermove/pointerup d'un AUTRE pointerId que celui
  // capture au pointerdown ne doit ni declencher onMove/onEnd, ni interrompre le drag actif.
  const handle2 = new FakeHandle();
  let moved2 = 0;
  let ended2 = 0;
  pointerDrag(handle2, {
    onMove: () => { moved2++; },
    onEnd: () => { ended2++; },
  });
  handle2.dispatch('pointerdown', { pointerId: 1, clientX: 0, clientY: 0, preventDefault() {} });
  handle2.dispatch('pointermove', { pointerId: 42, clientX: 5, clientY: 5 });
  assertEqual(moved2, 0, 'pointerDrag() ignore pointermove d\'un pointerId etranger au drag actif');
  handle2.dispatch('pointerup', { pointerId: 42, clientX: 5, clientY: 5 });
  assertEqual(ended2, 0, 'pointerDrag() ignore pointerup d\'un pointerId etranger (drag toujours actif)');
  handle2.dispatch('pointermove', { pointerId: 1, clientX: 5, clientY: 5 });
  assertEqual(moved2, 1, 'pointerDrag() traite bien onMove pour le pointerId capture');
  handle2.dispatch('pointerup', { pointerId: 1, clientX: 5, clientY: 5 });
  assertEqual(ended2, 1, 'pointerDrag() traite bien onEnd pour le pointerId capture');

  // ---- __registerInstance / __sweepDetached (teardown SPA, shared/components.js) ----
  const registered = new Set();
  function registerInstance(el, destroyFn) {
    registered.add({ el, destroy: destroyFn });
  }
  const fakeDom = { contains: (el) => el.attached !== false };
  function sweepDetached() {
    registered.forEach((rec) => {
      if (!fakeDom.contains(rec.el)) {
        try {
          rec.destroy();
        } catch (e) {
          /* best-effort */
        }
        registered.delete(rec);
      }
    });
  }

  let spyCalled = 0;
  const detachedEl = { attached: false };
  registerInstance(detachedEl, () => {
    spyCalled++;
  });
  const attachedEl = { attached: true };
  registerInstance(attachedEl, () => {
    spyCalled++;
  });

  sweepDetached();
  assertEqual(spyCalled, 1, '__sweepDetached() appelle destroy() une fois pour l\'element detache');
  assertEqual(registered.size, 1, '__sweepDetached() retire l\'entree detachee du registre');

  if (FAILED > 0) {
    console.error(`\n${FAILED} test(s) en echec.`);
    process.exit(1);
  }
  console.log('OK: tests graph-lib passes (svg, pointerDrag, sweep registry)');
}

main().catch((err) => {
  console.error('FAIL: erreur inattendue', err);
  process.exit(1);
});
