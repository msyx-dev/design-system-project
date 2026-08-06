// Tests -- initProgressTrackers (#744, vague 10/N couverture tests vanilla)
//
// Expose via window.__initProgressTrackers (shared/components.js:3216).
// Markup repris de pages/data.html#progress-tracker (classes/attrs reels) :
// .progress-tracker[data-progress] (ring simple, +etapes optionnelles via
// data-steps/data-current) et .progress-tracker-multi[data-rings] (JSON
// d'anneaux concentriques).
//
// window.__svg (fabrique <circle>/<path> SVG) N'EST PAS defini par
// components.js -- c'est shared/dist/graph-lib.global.js (window.__svg =
// svg, cf. shared/graph/lib/global-entry.js) qui l'expose, charge AVANT
// components.js sur les vraies pages (pages/data.html:1581-1583 : nav.js,
// graph-lib.global.js, graph.global.js, PUIS components.js). Dependance
// reelle et deliberee, pas un defaut -- on la reproduit ici par un stub
// minimal fidele a l'implementation source (meme corps : createElementNS +
// setAttribute par cle), pose sur `window` AVANT d'appeler
// __initProgressTrackers(), exactement comme le fait le vrai chargement de
// page.
//
// jsdom ne calcule aucune geometrie (getBoundingClientRect vaut toujours 0)
// -- l'observable teste est donc le DOM construit (dasharray/dashoffset,
// nombre et classes des points d'etape, nombre d'anneaux) et le
// declenchement d'IntersectionObserver (stube par le harnais, observe()
// no-op) invoque a la main via le callback capture.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

function svgStub(win) {
  return function (tag, attrs) {
    const el = win.document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] != null) el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  };
}

function singleRingHtml() {
  return `
    <div class="progress-tracker" id="pt-single" data-progress="75" data-steps="4" data-current="3" aria-label="Progression : etape 3 sur 4 (75%)">
      <svg viewBox="0 0 160 160" role="img" aria-hidden="true">
        <title>Progress tracker — etape 3/4</title>
        <circle class="pt-track" cx="80" cy="80" r="62"/>
        <circle class="pt-fill" cx="80" cy="80" r="62"/>
      </svg>
      <div class="progress-tracker-center">
        <span class="progress-tracker-value">3/4</span>
      </div>
    </div>
  `;
}

function plainRingHtml() {
  return `
    <div class="progress-tracker" id="pt-plain" data-progress="40" aria-label="Progression 40%">
      <svg viewBox="0 0 160 160" role="img" aria-hidden="true">
        <circle class="pt-track" cx="80" cy="80" r="62"/>
        <circle class="pt-fill" cx="80" cy="80" r="62"/>
      </svg>
    </div>
  `;
}

function multiRingHtml() {
  return `
    <div class="progress-tracker-multi" id="pt-multi" data-rings='[{"label":"Frontend","pct":82,"color":"var(--accent)"},{"label":"Backend","pct":55,"color":"var(--deco-violet)"},{"label":"Tests","pct":34,"color":"var(--deco-cyan)"}]' aria-label="Progression multi-modules">
      <svg viewBox="0 0 200 200" role="img" aria-hidden="true">
        <title>Progress tracker multi-ring</title>
      </svg>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__svg = svgStub(window);
  // Capture le callback IntersectionObserver passe par initProgressTrackers()
  // (le stub par defaut du harnais est un no-op muet -- ici on a besoin de
  // declencher manuellement le "scroll dans le viewport" pour observer
  // l'effet reel : reveler stroke-dashoffset).
  const observerCallbacks = [];
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; observerCallbacks.push(cb); }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.__initProgressTrackers();
  return { window, document, observerCallbacks };
}

// Circonference d'un cercle r=62 (viewBox single-ring 160x160).
const CIRC_62 = 2 * Math.PI * 62;

describe('initProgressTrackers -- ring simple avec etapes', () => {
  it("construit le nombre exact de points d-etape avec l-etat pending/active/done selon data-current", () => {
    const { document } = setup(singleRingHtml());
    const tracker = document.getElementById('pt-single');
    const dots = tracker.querySelectorAll('.pt-step');
    expect(dots.length).toBe(4);
    // data-current="3" -> etapes 1 et 2 (index 0,1) done, etape 3 (index 2) active, etape 4 (index 3) pending.
    expect(dots[0].classList.contains('pt-step--done')).toBe(true);
    expect(dots[1].classList.contains('pt-step--done')).toBe(true);
    expect(dots[2].classList.contains('pt-step--active')).toBe(true);
    expect(dots[3].classList.contains('pt-step--pending')).toBe(true);
  });

  it('pose stroke-dasharray/dashoffset (cache initialement) sur .pt-fill selon la circonference r=62', () => {
    const { document } = setup(singleRingHtml());
    const fill = document.getElementById('pt-single').querySelector('.pt-fill');
    expect(fill.getAttribute('stroke-dasharray')).toBe(String(CIRC_62));
    expect(fill.getAttribute('stroke-dashoffset')).toBe(String(CIRC_62)); // masque avant intersection
    expect(fill.style.transform).toBe('rotate(-90deg)');
  });

  it("l'intersection (scroll) revele le pourcentage reel via stroke-dashoffset", () => {
    const { document, observerCallbacks } = setup(singleRingHtml());
    const tracker = document.getElementById('pt-single');
    const fill = tracker.querySelector('.pt-fill');
    expect(observerCallbacks.length).toBe(1);
    observerCallbacks[0]([{ isIntersecting: true, target: tracker }]);
    const expectedOffset = CIRC_62 * (1 - 75 / 100);
    expect(fill.style.strokeDashoffset).toBe(String(expectedOffset));
  });

  it("un entry non-intersecting ne revele rien", () => {
    const { document, observerCallbacks } = setup(singleRingHtml());
    const fill = document.getElementById('pt-single').querySelector('.pt-fill');
    observerCallbacks[0]([{ isIntersecting: false, target: document.getElementById('pt-single') }]);
    expect(fill.style.strokeDashoffset).toBe('');
  });
});

describe('initProgressTrackers -- ring simple sans etapes (pourcentage seul)', () => {
  it("data-steps absent -- aucun point d-etape construit, le ring pourcentage reste fonctionnel", () => {
    const { document } = setup(plainRingHtml());
    const tracker = document.getElementById('pt-plain');
    expect(tracker.querySelectorAll('.pt-step').length).toBe(0);
    const fill = tracker.querySelector('.pt-fill');
    expect(fill.getAttribute('stroke-dasharray')).toBe(String(CIRC_62));
  });
});

describe('initProgressTrackers -- multi-ring concentrique', () => {
  it('construit un anneau track+fill par entree de data-rings, avec la couleur et le rayon degressif attendus', () => {
    const { document } = setup(multiRingHtml());
    const svg = document.getElementById('pt-multi').querySelector('svg');
    const tracks = svg.querySelectorAll('.pt-track');
    const fills = svg.querySelectorAll('.pt-fill');
    expect(tracks.length).toBe(3);
    expect(fills.length).toBe(3);
    // Rayons attendus : 84, 68, 52 (RADII fixe dans le code source).
    expect(tracks[0].getAttribute('r')).toBe('84');
    expect(tracks[1].getAttribute('r')).toBe('68');
    expect(tracks[2].getAttribute('r')).toBe('52');
    expect(fills[0].style.stroke).toBe('var(--accent)');
    expect(fills[1].style.stroke).toBe('var(--deco-violet)');
    expect(fills[2].style.stroke).toBe('var(--deco-cyan)');
  });

  it('un data-rings JSON invalide ne casse pas initProgressTrackers (no-op silencieux)', () => {
    const html = `
      <div class="progress-tracker-multi" id="pt-bad" data-rings='not-json'>
        <svg viewBox="0 0 200 200" role="img" aria-hidden="true"></svg>
      </div>
    `;
    expect(() => setup(html)).not.toThrow();
  });

  it('data-rings vide ([]) ne construit aucun anneau', () => {
    const html = `
      <div class="progress-tracker-multi" id="pt-empty" data-rings='[]'>
        <svg viewBox="0 0 200 200" role="img" aria-hidden="true"></svg>
      </div>
    `;
    const { document } = setup(html);
    const svg = document.getElementById('pt-empty').querySelector('svg');
    expect(svg.querySelectorAll('.pt-track').length).toBe(0);
  });
});

describe('initProgressTrackers -- isolation multi-instance et idempotence', () => {
  it('deux trackers sur la meme page sont independants', () => {
    const { document } = setup(singleRingHtml() + plainRingHtml());
    expect(document.getElementById('pt-single').querySelectorAll('.pt-step').length).toBe(4);
    expect(document.getElementById('pt-plain').querySelectorAll('.pt-step').length).toBe(0);
  });

  it("reappeler initProgressTrackers() est idempotent (pas de doublon de points d-etape)", () => {
    const { window, document } = setup(singleRingHtml());
    window.__initProgressTrackers(); // 2e appel -- doit no-op (dataset.bound)
    expect(document.getElementById('pt-single').querySelectorAll('.pt-step').length).toBe(4);
  });
});
