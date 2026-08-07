// Tests -- initGauges (#744, vague 17/N couverture tests vanilla)
//
// Expose directement via window.__initGauges (shared/components.js).
// Markup repris de la demo reelle (pages/data.html#gauge) : .gauge[data-value]
// [data-max][data-thresholds?] > svg > path.gauge-track + path.gauge-fill +
// text.gauge-value, + span.gauge-label. L'arc semi-circulaire dessine via
// stroke-dasharray/dashoffset n'est REVELE (animateGauge()) qu'au passage de
// l'IntersectionObserver -- meme motif que tests/vanilla/progress-tracker.test.js :
// stub qui capture le callback pour le declencher a la main.
//
// Defaut trouve + corrige a la volee (#744 vague 17) : le calcul du
// pourcentage (value/max) pilote deja le dessin visuel (stroke-dashoffset)
// ET le choix de couleur de seuil, mais l'aria-label du gauge n'etait JAMAIS
// touche par le JS -- il restait fige a la valeur tapee une fois par
// l'auteur HTML. Verifie sur les 5 instances de la demo (pages/data.html) :
// les 3 mini-gauges suivent deja la convention "Label — pct%" (ecrites a la
// main, donc fragiles), mais les 2 gauges pleines utilisaient un texte de
// VARIANTE ("Gauge simple — 72%", "Gauge avec seuils — 45%") qui n'a plus
// aucun rapport avec la donnee des qu'on change data-value sans repasser sur
// le HTML. Corrige en calculant l'aria-label depuis .gauge-label + le pct
// reel, pose synchronement a l'init (PAS dans animateGauge() : l'exactitude
// de l'annonce a11y ne doit pas dependre du defilement/IntersectionObserver).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

function gaugeHtml({ value, max = 100, thresholds, label = 'Performance', extraClass = '', ariaLabel = 'valeur perimee' }) {
  return `
    <div class="gauge ${extraClass}" data-value="${value}" data-max="${max}"${thresholds ? ` data-thresholds="${thresholds}"` : ''} role="img" aria-label="${ariaLabel}">
      <svg viewBox="0 0 100 60" aria-hidden="true">
        <title>${label} — ${value}%</title>
        <path class="gauge-track" d="M 10 55 A 40 40 0 0 1 90 55"/>
        <path class="gauge-fill" d="M 10 55 A 40 40 0 0 1 90 55"/>
        <text class="gauge-value" x="50" y="52">${value}%</text>
      </svg>
      <span class="gauge-label">${label}</span>
    </div>
  `;
}

function setup(bodyHtml) {
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
  window.__initGauges();
  return { window, document, observerCallbacks };
}

function triggerIntersection(observerCallbacks, index = 0) {
  observerCallbacks[index]([{ isIntersecting: true, target: null }]);
}

const ARC_LENGTH = Math.PI * 40;

describe('initGauges -- a11y : aria-label suit la donnee reelle (defaut corrige #744 vague 17)', () => {
  it("l'aria-label est recalcule depuis .gauge-label + le pourcentage reel, meme si le HTML en portait un perime", () => {
    const { document } = setup(gaugeHtml({ value: 72, label: 'Performance', ariaLabel: 'texte perime sans rapport' }));
    const gauge = document.querySelector('.gauge');
    expect(gauge.getAttribute('aria-label')).toBe('Performance — 72%');
  });

  it('le pourcentage annonce est arrondi et calcule sur value/max (pas juste value)', () => {
    const { document } = setup(gaugeHtml({ value: 45, max: 200, label: 'Charge CPU' }));
    const gauge = document.querySelector('.gauge');
    // 45/200 = 22.5% -> arrondi a 23 (Math.round)
    expect(gauge.getAttribute('aria-label')).toBe('Charge CPU — 23%');
  });

  it('value > max : pct clampe a 100%', () => {
    const { document } = setup(gaugeHtml({ value: 150, max: 100, label: 'Uptime' }));
    expect(document.querySelector('.gauge').getAttribute('aria-label')).toBe('Uptime — 100%');
  });

  it('value negative : pct clampe a 0%', () => {
    const { document } = setup(gaugeHtml({ value: -10, max: 100, label: 'Erreurs' }));
    expect(document.querySelector('.gauge').getAttribute('aria-label')).toBe('Erreurs — 0%');
  });

  it("l'aria-label est pose synchronement a l'init, AVANT tout passage de l'IntersectionObserver (a11y independante du scroll)", () => {
    const { document } = setup(gaugeHtml({ value: 65, label: 'RAM' }));
    // Aucun trigger d'intersection ici -- l'annonce doit deja etre correcte.
    expect(document.querySelector('.gauge').getAttribute('aria-label')).toBe('RAM — 65%');
  });

  it('.gauge-label absent : aria-label degrade proprement au pourcentage seul (pas de "undefined —")', () => {
    const dom = loadComponentsWindow(`
      <div class="gauge" data-value="50" data-max="100" role="img" aria-label="x">
        <svg><path class="gauge-fill" d="M 10 55 A 40 40 0 0 1 90 55"/></svg>
      </div>
    `);
    dom.window.__initGauges();
    expect(dom.window.document.querySelector('.gauge').getAttribute('aria-label')).toBe('50%');
  });
});

describe('initGauges -- couleur de seuil', () => {
  it('pct <= low : couleur danger', () => {
    const { window, document, observerCallbacks } = setup(gaugeHtml({ value: 20, thresholds: '30,70' }));
    triggerIntersection(observerCallbacks);
    const fill = document.querySelector('.gauge-fill');
    expect(fill.style.stroke).toBe('var(--danger)');
  });

  it('pct == low (borne incluse) : couleur danger', () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 30, thresholds: '30,70' }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.gauge-fill').style.stroke).toBe('var(--danger)');
  });

  it('low < pct <= high : couleur warning', () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 45, thresholds: '30,70' }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.gauge-fill').style.stroke).toBe('var(--warning)');
  });

  it('pct == high (borne incluse) : couleur warning', () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 70, thresholds: '30,70' }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.gauge-fill').style.stroke).toBe('var(--warning)');
  });

  it('pct > high : couleur success', () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 92, thresholds: '30,70' }));
    triggerIntersection(observerCallbacks);
    expect(document.querySelector('.gauge-fill').style.stroke).toBe('var(--success)');
  });

  it('sans data-thresholds : aucune couleur de seuil appliquee (stroke non touche par animateGauge)', () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 72 }));
    const fill = document.querySelector('.gauge-fill');
    fill.style.stroke = 'orange'; // valeur CSS valide arbitraire, non produite par le composant
    triggerIntersection(observerCallbacks);
    expect(fill.style.stroke).toBe('orange');
  });
});

describe('initGauges -- arc dessine (stroke-dasharray/dashoffset)', () => {
  it('etat initial (avant intersection) : arc totalement masque (dashoffset == dasharray == ARC_LENGTH)', () => {
    const { document } = setup(gaugeHtml({ value: 72 }));
    const fill = document.querySelector('.gauge-fill');
    expect(fill.style.strokeDasharray).toBe(String(ARC_LENGTH));
    expect(fill.style.strokeDashoffset).toBe(String(ARC_LENGTH));
  });

  it("l'intersection revele l'arc : dashoffset = ARC_LENGTH * (1 - pct/100)", () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 72, max: 100 }));
    triggerIntersection(observerCallbacks);
    const fill = document.querySelector('.gauge-fill');
    const expectedOffset = ARC_LENGTH * (1 - 0.72);
    expect(parseFloat(fill.style.strokeDashoffset)).toBeCloseTo(expectedOffset, 6);
  });

  it('value == max : dashoffset == 0 (arc complet)', () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 100, max: 100 }));
    triggerIntersection(observerCallbacks);
    expect(parseFloat(document.querySelector('.gauge-fill').style.strokeDashoffset)).toBeCloseTo(0, 6);
  });

  it('value == 0 : dashoffset == ARC_LENGTH (arc invisible)', () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 0, max: 100 }));
    triggerIntersection(observerCallbacks);
    expect(parseFloat(document.querySelector('.gauge-fill').style.strokeDashoffset)).toBeCloseTo(ARC_LENGTH, 6);
  });

  it("une entree non-intersectante n'anime rien", () => {
    const { document, observerCallbacks } = setup(gaugeHtml({ value: 72 }));
    observerCallbacks[0]([{ isIntersecting: false, target: null }]);
    const fill = document.querySelector('.gauge-fill');
    expect(fill.style.strokeDashoffset).toBe(String(ARC_LENGTH));
  });

  it('.gauge-fill absent dans le markup : aucun crash', () => {
    const dom = loadComponentsWindow('<div class="gauge" data-value="50" data-max="100" role="img" aria-label="x"><svg><span class="gauge-label">X</span></svg></div>');
    expect(() => dom.window.__initGauges()).not.toThrow();
  });
});

describe('initGauges -- idempotence', () => {
  it("un second appel initGauges() ne re-cree pas d'observer (dataset.bound sur .gauge)", () => {
    const { window, observerCallbacks } = setup(gaugeHtml({ value: 72 }));
    window.__initGauges();
    expect(observerCallbacks.length).toBe(1);
  });

  it("un second appel ne re-derive pas l'aria-label differemment (pas d'ecrasement inattendu)", () => {
    const { window, document } = setup(gaugeHtml({ value: 72, label: 'Performance' }));
    window.__initGauges();
    expect(document.querySelector('.gauge').getAttribute('aria-label')).toBe('Performance — 72%');
  });
});
