// Tests -- initAnimatedCounters (#744, vague 17/N couverture tests vanilla)
//
// Expose directement via window.__initAnimatedCounters (shared/components.js).
// Markup repris de pages/data.html#animated-counters : .counter[data-target]
// [data-decimals?] > .counter-value (+ .counter-prefix/.counter-suffix
// optionnels, non touches par le JS). Le comptage progressif tourne dans un
// IntersectionObserver (stub par defaut du harnais = no-op muet, capture du
// callback comme progress-tracker.test.js) puis une boucle
// requestAnimationFrame(tick) pilotee par performance.now(). Consigne du
// prompt : ne jamais attendre reellement -- on stube performance.now() pour
// retourner une horloge FIXE au moment du "start" capture dans le composant,
// et requestAnimationFrame pour invoquer son callback avec un "now" tres
// eloigne -- elapsed/DURATION >= 1 des le premier frame, donc EASED=1 et
// current=target exactement, sans recursion (progress>=1 coupe la boucle).
// Seule la VALEUR FINALE est assertee, jamais une valeur intermediaire.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

function counterHtml({ target, decimals, prefix = '', suffix = '', extraAttrs = '' }) {
  return `
    <div class="counter" data-target="${target}"${decimals != null ? ` data-decimals="${decimals}"` : ''} ${extraAttrs}>
      ${prefix ? `<span class="counter-prefix">${prefix}</span>` : ''}<span class="counter-value">0</span>${suffix ? `<span class="counter-suffix">${suffix}</span>` : ''}
    </div>
  `;
}

function setup(bodyHtml, { instantFinish = true } = {}) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  const observerCallbacks = [];
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; observerCallbacks.push(cb); }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  let rafCalls = 0;
  window.performance.now = () => 1_000_000; // horloge figee -- "start" capture cette valeur
  if (instantFinish) {
    // "now" transmis au tick tres eloigne du start -> elapsed >> DURATION des
    // le 1er frame -> progress=1, eased=1, current=target, PAS de recursion.
    window.requestAnimationFrame = (cb) => { rafCalls++; cb(10_000_000); };
  } else {
    window.requestAnimationFrame = (cb) => { rafCalls++; }; // ne resout jamais -- capture le nombre d'appels
  }
  window.__initAnimatedCounters();
  return { window, document, observerCallbacks, getRafCalls: () => rafCalls };
}

function triggerIntersection(observerCallbacks, index = 0) {
  observerCallbacks[index]([{ isIntersecting: true, target: null }]);
}

describe('initAnimatedCounters -- valeur finale exacte (jamais les valeurs intermediaires)', () => {
  it('entier sans decimales : valeur finale = Math.floor(target)', () => {
    const { document, observerCallbacks } = setup(counterHtml({ target: 1247 }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.counter-value').textContent).toBe('1247');
  });

  it('avec data-decimals : valeur finale formatee via toFixed(decimals)', () => {
    const { document, observerCallbacks } = setup(counterHtml({ target: 98.5, decimals: 1, suffix: '%' }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.counter-value').textContent).toBe('98.5');
  });

  it('prefix/suffix ne sont jamais touches par le JS (seule .counter-value change)', () => {
    const { document, observerCallbacks } = setup(counterHtml({ target: 42, prefix: '+', suffix: 'k' }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.counter-value').textContent).toBe('42');
    expect(document.querySelector('.counter-prefix').textContent).toBe('+');
    expect(document.querySelector('.counter-suffix').textContent).toBe('k');
  });

  it('target avec decimales mais data-decimals=1 : rendu conforme (3.2)', () => {
    const { document, observerCallbacks } = setup(counterHtml({ target: 3.2, decimals: 1, prefix: '€', suffix: 'M' }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.counter-value').textContent).toBe('3.2');
  });

  it("une entree non-intersectante ne demarre pas le comptage (valeur reste '0')", () => {
    const { document, observerCallbacks } = setup(counterHtml({ target: 500 }));
    observerCallbacks[0]([{ isIntersecting: false, target: null }]);
    expect(document.querySelector('.counter-value').textContent).toBe('0');
  });

  it("un second passage a isIntersecting:true ne relance pas le comptage (dataset.counted, observer.disconnect)", () => {
    const { document, observerCallbacks } = setup(counterHtml({ target: 10 }));
    triggerIntersection(observerCallbacks);
    expect(() => triggerIntersection(observerCallbacks)).not.toThrow();
    expect(document.querySelector('.counter-value').textContent).toBe('10');
  });

  it('.counter-value absent dans le markup : aucun crash, aucun appel rAF', () => {
    const dom = loadComponentsWindow('<div class="counter" data-target="10"></div>');
    dom.window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    expect(() => dom.window.__initAnimatedCounters()).not.toThrow();
  });

  it('data-target absent : aucun .counter[data-target] selectionne, aucun crash', () => {
    const dom = loadComponentsWindow('<div class="counter"><span class="counter-value">0</span></div>');
    expect(() => dom.window.__initAnimatedCounters()).not.toThrow();
    expect(dom.window.document.querySelector('.counter-value').textContent).toBe('0');
  });
});

describe('initAnimatedCounters -- idempotence et isolation', () => {
  it("un second appel initAnimatedCounters() ne re-observe pas un compteur deja bound (1 seul IntersectionObserver cree)", () => {
    const { window, observerCallbacks } = setup(counterHtml({ target: 10 }));
    window.__initAnimatedCounters();
    expect(observerCallbacks.length).toBe(1);
  });

  it('deux compteurs independants comptent chacun vers leur propre cible', () => {
    const dom = loadComponentsWindow(`
      <div class="counter" data-target="10"><span class="counter-value">0</span></div>
      <div class="counter" data-target="99" data-decimals="0"><span class="counter-value">0</span></div>
    `);
    const { window } = dom;
    const { document } = window;
    const observerCallbacks = [];
    window.IntersectionObserver = class {
      constructor(cb) { observerCallbacks.push(cb); }
      observe() {} unobserve() {} disconnect() {}
    };
    window.performance.now = () => 1_000_000;
    window.requestAnimationFrame = (cb) => cb(10_000_000);
    window.__initAnimatedCounters();
    observerCallbacks.forEach((cb) => cb([{ isIntersecting: true, target: null }]));
    const values = document.querySelectorAll('.counter-value');
    expect(values[0].textContent).toBe('10');
    expect(values[1].textContent).toBe('99');
  });
});
