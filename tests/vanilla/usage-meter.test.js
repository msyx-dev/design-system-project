// Tests -- initUsageMeter (#744, vague 16/N couverture tests vanilla)
//
// Expose directement via window.__initUsageMeter (shared/components.js).
// Markup repris de la demo reelle (pages/data.html#usage-meter) :
// .usage-meter[data-value] > .usage-meter-header + .usage-meter-track >
// .usage-fill[--ok|--warn|--danger]. Les classes de seuil (--ok/--warn/
// --danger) sont posees STATIQUEMENT dans le markup consumer -- verifie
// (grep "usage-fill" sur components.js) : le JS ne les calcule JAMAIS a
// partir de data-value, il se contente d-animer la largeur.
//
// CONSTAT (a signaler pour #836, PAS implemente ici -- capacite entierement
// absente, pas un bug borne) : initUsageMeter() ne pose AUCUN attribut ARIA
// (ni role="meter"/"progressbar", ni aria-valuenow/valuemin/valuemax) sur
// .usage-meter ou .usage-fill -- verifie (grep "aria-value" autour de
// initUsageMeter : aucune occurrence). Un lecteur d-ecran ne peut donc pas
// connaitre la valeur affichee. Pas de test d-absence ci-dessous (on ne
// verrouille pas un manque, cf. #744 vague 11 meme posture pour le clavier
// de sortable-list) -- uniquement ce constat documente.
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
  return { window, document, meter, fill, observerCallbacks };
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
