// Tests -- initUsageMeter (#744, vague 16/N couverture tests vanilla ;
// #836 : ARIA + seuils derives)
//
// Expose directement via window.__initUsageMeter (shared/components.js).
// Markup repris de la demo reelle (pages/data.html#usage-meter) :
// .usage-meter[data-value] > .usage-meter-header + .usage-meter-track >
// .usage-fill[--ok|--warn|--danger].
//
// #836 : le composant pose desormais role="progressbar" + aria-valuemin/
// max/now sur .usage-meter-track (synchronement au bind, independamment de
// l'IntersectionObserver qui ne pilote que l'animation visuelle -- meme
// principe que le fix aria-label du gauge #842), aria-label/aria-valuetext
// depuis .usage-meter-label/.usage-meter-value, et derive la classe de
// seuil --ok/--warn/--danger de data-value (warnAt=50, dangerAt=90 --
// bornes retro-deduites des 7 instances de pages/data.html#usage-meter,
// alignees sur resolveVariant() de @msyx-dev/react UsageMeter) au lieu de
// la laisser statique dans le markup consumer.
//
// L-animation passe par IntersectionObserver (callback capture, meme
// pattern que #744 vague 10 progress-tracker) + un setTimeout(80) --
// vi.useFakeTimers()/advanceTimersByTime(80), meme pattern que #744
// vague 15 copy-buttons.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

function meterHtml(value = '72') {
  return `
    <div class="usage-meter" data-value="${value}">
      <div class="usage-meter-header">
        <span class="usage-meter-label">API calls</span>
        <span class="usage-meter-value">7 200 / 10 000</span>
      </div>
      <div class="usage-meter-track"><div class="usage-fill usage-fill--warn"></div></div>
    </div>
  `;
}

function noFillHtml() {
  return `<div class="usage-meter" data-value="50"><div class="usage-meter-track"></div></div>`;
}

function meterHtmlWithStaticClass(value, staticClass) {
  return `
    <div class="usage-meter" data-value="${value}">
      <div class="usage-meter-header">
        <span class="usage-meter-label">Stockage</span>
        <span class="usage-meter-value">300 Mo / 1 Go</span>
      </div>
      <div class="usage-meter-track"><div class="usage-fill ${staticClass}"></div></div>
    </div>
  `;
}

function noHeaderHtml(value = '72') {
  return `
    <div class="usage-meter" data-value="${value}">
      <div class="usage-meter-track"><div class="usage-fill usage-fill--warn"></div></div>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  const observerCallbacks = [];
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; observerCallbacks.push(cb); }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const meter = document.querySelector('.usage-meter');
  const fill = meter.querySelector('.usage-fill');
  const track = meter.querySelector('.usage-meter-track');
  return { window, document, meter, fill, track, observerCallbacks };
}

describe('initUsageMeter -- etat initial', () => {
  it("pose fill.style.width = '0' immediatement (avant toute intersection)", () => {
    const { window, fill } = setup(meterHtml('72'));
    window.__initUsageMeter();
    expect(fill.style.width).toBe('0px');
  });

  it('sans .usage-fill -- aucun crash, dataset.bound quand meme pose', () => {
    const { window, meter } = setup(noFillHtml());
    expect(() => window.__initUsageMeter()).not.toThrow();
    expect(meter.dataset.bound).toBe('1');
  });
});

describe('initUsageMeter -- animation via IntersectionObserver', () => {
  afterEach(() => { vi.useRealTimers(); });

  it("l'intersection (isIntersecting:true) applique data-value% apres 80ms", () => {
    const { window, meter, fill, observerCallbacks } = setup(meterHtml('72'));
    window.__initUsageMeter();
    expect(observerCallbacks.length).toBe(1);
    vi.useFakeTimers();
    observerCallbacks[0]([{ isIntersecting: true, target: meter }]);
    expect(fill.style.width).toBe('0px'); // pas encore -- le setTimeout(80) n'a pas couru
    vi.advanceTimersByTime(80);
    expect(fill.style.width).toBe('72%');
  });

  it('un entry non-intersecting ne modifie rien', () => {
    const { window, meter, fill, observerCallbacks } = setup(meterHtml('72'));
    window.__initUsageMeter();
    vi.useFakeTimers();
    observerCallbacks[0]([{ isIntersecting: false, target: meter }]);
    vi.advanceTimersByTime(200);
    expect(fill.style.width).toBe('0px');
  });

  it('data-value invalide (non numerique) retombe sur 0%', () => {
    const { window, meter, fill, observerCallbacks } = setup(meterHtml('abc'));
    window.__initUsageMeter();
    vi.useFakeTimers();
    observerCallbacks[0]([{ isIntersecting: true, target: meter }]);
    vi.advanceTimersByTime(80);
    expect(fill.style.width).toBe('0%');
  });
});

describe('initUsageMeter -- fallback deja visible (rect force)', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('un meter deja dans le viewport (rect visible) applique data-value% sans attendre le scroll', () => {
    const { window, meter, fill } = setup(meterHtml('45'));
    meter.getBoundingClientRect = () => ({ top: 10, bottom: 60, left: 0, right: 100, width: 100, height: 50 });
    vi.useFakeTimers();
    window.__initUsageMeter();
    vi.advanceTimersByTime(80);
    expect(fill.style.width).toBe('45%');
  });
});

describe('initUsageMeter -- idempotence', () => {
  afterEach(() => { vi.useRealTimers(); });

  it("un second appel initUsageMeter() ne reinitialise pas la largeur deja resolue a 0", () => {
    const { window, meter, fill, observerCallbacks } = setup(meterHtml('72'));
    window.__initUsageMeter();
    vi.useFakeTimers();
    observerCallbacks[0]([{ isIntersecting: true, target: meter }]);
    vi.advanceTimersByTime(80);
    expect(fill.style.width).toBe('72%');
    window.__initUsageMeter(); // dataset.bound -- no-op sur ce meter
    expect(fill.style.width).toBe('72%');
  });
});

describe('initUsageMeter -- ARIA sur .usage-meter-track (#836)', () => {
  it('pose role=progressbar + aria-valuemin/max/now, synchronement (avant toute intersection)', () => {
    const { window, track } = setup(meterHtml('72'));
    window.__initUsageMeter();
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuemin')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe('100');
    expect(track.getAttribute('aria-valuenow')).toBe('72');
  });

  it('aria-label derive de .usage-meter-label, aria-valuetext de .usage-meter-value', () => {
    const { window, track } = setup(meterHtml('72'));
    window.__initUsageMeter();
    expect(track.getAttribute('aria-label')).toBe('API calls');
    expect(track.getAttribute('aria-valuetext')).toBe('7 200 / 10 000');
  });

  it('sans header (ni .usage-meter-label ni .usage-meter-value) -- pas d-aria-label/valuetext, mais role+valuenow present', () => {
    const { window, track } = setup(noHeaderHtml('72'));
    window.__initUsageMeter();
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuenow')).toBe('72');
    expect(track.hasAttribute('aria-label')).toBe(false);
    expect(track.hasAttribute('aria-valuetext')).toBe(false);
  });

  it('sans .usage-fill -- le role/aria est quand meme pose sur .usage-meter-track (pas conditionne a la presence du fill)', () => {
    const { window, meter } = setup(noFillHtml());
    window.__initUsageMeter();
    const track = meter.querySelector('.usage-meter-track');
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuenow')).toBe('50');
  });

  it('data-value invalide (non numerique) -> aria-valuenow=0 (meme fallback que la largeur)', () => {
    const { window, track } = setup(meterHtml('abc'));
    window.__initUsageMeter();
    expect(track.getAttribute('aria-valuenow')).toBe('0');
  });

  it('data-value > 100 -- aria-valuenow clampe a 100 (jamais hors bornes ARIA)', () => {
    const { window, track } = setup(meterHtml('150'));
    window.__initUsageMeter();
    expect(track.getAttribute('aria-valuenow')).toBe('100');
  });

  it('un second appel initUsageMeter() ne double-pose pas / ne casse pas l-ARIA (dataset.bound)', () => {
    const { window, track } = setup(meterHtml('72'));
    window.__initUsageMeter();
    window.__initUsageMeter();
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuenow')).toBe('72');
  });
});

describe('initUsageMeter -- seuils derives de la valeur (#836, coeur du defaut)', () => {
  it('value=30 (ok) -- .usage-fill--ok pose, jamais warn/danger', () => {
    const { window, fill } = setup(meterHtml('30'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--ok')).toBe(true);
    expect(fill.classList.contains('usage-fill--warn')).toBe(false);
    expect(fill.classList.contains('usage-fill--danger')).toBe(false);
  });

  it('value=72 (warn) -- .usage-fill--warn pose', () => {
    const { window, fill } = setup(meterHtml('72'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--warn')).toBe(true);
  });

  it('value=95 (danger) -- .usage-fill--danger pose', () => {
    const { window, fill } = setup(meterHtml('95'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--danger')).toBe(true);
  });

  it('value=50 (borne warnAt, inclusive) -- .usage-fill--warn', () => {
    const { window, fill } = setup(meterHtml('50'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--warn')).toBe(true);
  });

  it('value=49 (juste sous warnAt) -- .usage-fill--ok', () => {
    const { window, fill } = setup(meterHtml('49'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--ok')).toBe(true);
  });

  it('value=90 (borne dangerAt, encore warn -- strictement superieur pour danger)', () => {
    const { window, fill } = setup(meterHtml('90'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--warn')).toBe(true);
    expect(fill.classList.contains('usage-fill--danger')).toBe(false);
  });

  it('value=91 (juste au-dessus de dangerAt) -- .usage-fill--danger', () => {
    const { window, fill } = setup(meterHtml('91'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--danger')).toBe(true);
  });

  it('la couleur ne ment plus : classe statique --ok en markup avec value=95 -- corrigee en --danger', () => {
    const { window, fill } = setup(meterHtmlWithStaticClass('95', 'usage-fill--ok'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--danger')).toBe(true);
    expect(fill.classList.contains('usage-fill--ok')).toBe(false);
  });

  it('la couleur ne ment plus : classe statique --danger en markup avec value=10 -- corrigee en --ok', () => {
    const { window, fill } = setup(meterHtmlWithStaticClass('10', 'usage-fill--danger'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--ok')).toBe(true);
    expect(fill.classList.contains('usage-fill--danger')).toBe(false);
  });

  it('data-value invalide (non numerique) -> traite comme 0, .usage-fill--ok', () => {
    const { window, fill } = setup(meterHtml('abc'));
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--ok')).toBe(true);
  });

  it('sans .usage-fill -- aucune classe a deriver, pas de crash (deja couvert cote bound, ici juste non-regression)', () => {
    const { window, meter } = setup(noFillHtml());
    expect(() => window.__initUsageMeter()).not.toThrow();
    expect(meter.querySelector('.usage-fill')).toBeNull();
  });

  it('un second appel initUsageMeter() garde la classe de seuil deja correcte (idempotent)', () => {
    const { window, fill } = setup(meterHtml('72'));
    window.__initUsageMeter();
    window.__initUsageMeter();
    expect(fill.classList.contains('usage-fill--warn')).toBe(true);
    expect(fill.className.split(' ').filter((c) => c.indexOf('usage-fill--') === 0).length).toBe(1);
  });
});
