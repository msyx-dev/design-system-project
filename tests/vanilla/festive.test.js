// Tests -- initFestiveDemo (#940, decor festif du theme Noel)
//
// Expose via window.__initFestiveDemo (shared/components.js). Markup repris
// de pages/fondation.html#festif (classes/ids reels) : #festif-snow (.snowfall,
// aria-hidden), #festif-toggle-demo (bouton de bascule), [data-festif-density]
// (boutons de variante). Persistance dans localStorage sous la cle
// `msyx-festive`, partagee avec le dogfood du header (shared/nav.js,
// ensureFestiveDecor()/updateFestiveDecor() -- hors scope de ce test, qui se
// limite a la mecanique testable en isolation via components.js).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function festifHtml() {
  return `
    <div class="snowfall" aria-hidden="true" id="festif-snow" hidden></div>
    <ul class="garland" aria-hidden="true">
      <li class="garland-bulb" style="--i:0"></li>
      <li class="garland-bulb" style="--i:1"></li>
    </ul>
    <button type="button" id="festif-toggle-demo" aria-pressed="false">Activer la neige</button>
    <button type="button" data-festif-density="">Defaut</button>
    <button type="button" data-festif-density="sparse">Clairsemee</button>
    <button type="button" data-festif-density="dense">Dense</button>
  `;
}

function setup() {
  const dom = loadComponentsWindow(festifHtml());
  const { window } = dom;
  const { document } = window;
  window.__initFestiveDemo();
  const snow = document.getElementById('festif-snow');
  const toggle = document.getElementById('festif-toggle-demo');
  return { window, document, snow, toggle };
}

describe('initFestiveDemo -- markup decoratif', () => {
  it('.snowfall et .garland portent aria-hidden="true"', () => {
    const { document } = setup();
    const snow = document.getElementById('festif-snow');
    const garland = document.querySelector('.garland');
    expect(snow.getAttribute('aria-hidden')).toBe('true');
    expect(garland.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('initFestiveDemo -- bascule neige (localStorage msyx-festive)', () => {
  it('defaut : la neige est masquee (hidden) et le bouton annonce aria-pressed=false', () => {
    const { snow, toggle } = setup();
    expect(snow.hidden).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('un clic active la neige : hidden retire, aria-pressed=true, persiste localStorage=on', () => {
    const { window, snow, toggle } = setup();
    fireClick(window, toggle);
    expect(snow.hidden).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(window.localStorage.getItem('msyx-festive')).toBe('on');
  });

  it('un second clic re-masque la neige : hidden repose, aria-pressed=false, persiste localStorage=off', () => {
    const { window, snow, toggle } = setup();
    fireClick(window, toggle);
    fireClick(window, toggle);
    expect(snow.hidden).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(window.localStorage.getItem('msyx-festive')).toBe('off');
  });

  it('un nouvel appel de initFestiveDemo() relit la preference persistee (msyx-festive=on)', () => {
    const dom = loadComponentsWindow(festifHtml());
    const { window } = dom;
    const { document } = window;
    window.localStorage.setItem('msyx-festive', 'on');
    window.__initFestiveDemo();
    const snow = document.getElementById('festif-snow');
    const toggle = document.getElementById('festif-toggle-demo');
    expect(snow.hidden).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it("reappeler initFestiveDemo() est idempotent (dataset.bound, un seul toggle par clic)", () => {
    const { window, snow, toggle } = setup();
    window.__initFestiveDemo(); // 2e appel -- doit no-op sur le bind
    fireClick(window, toggle);
    // Si le listener etait double-attache, un seul clic ferait 2 bascules
    // (masquee -> visible -> masquee), ce qui laisserait hidden=true.
    expect(snow.hidden).toBe(false);
  });
});

describe('initFestiveDemo -- densite', () => {
  it('le bouton "dense" ajoute .snowfall--dense et retire .snowfall--sparse', () => {
    const { window, document, snow } = setup();
    const sparseBtn = document.querySelector('[data-festif-density="sparse"]');
    const denseBtn = document.querySelector('[data-festif-density="dense"]');
    fireClick(window, sparseBtn);
    expect(snow.classList.contains('snowfall--sparse')).toBe(true);
    fireClick(window, denseBtn);
    expect(snow.classList.contains('snowfall--sparse')).toBe(false);
    expect(snow.classList.contains('snowfall--dense')).toBe(true);
  });

  it('le bouton "defaut" (density vide) retire les deux modificateurs', () => {
    const { window, document, snow } = setup();
    const denseBtn = document.querySelector('[data-festif-density="dense"]');
    const defaultBtn = document.querySelector('[data-festif-density=""]');
    fireClick(window, denseBtn);
    fireClick(window, defaultBtn);
    expect(snow.classList.contains('snowfall--dense')).toBe(false);
    expect(snow.classList.contains('snowfall--sparse')).toBe(false);
  });
});

describe('initFestiveDemo -- absence de markup', () => {
  it("ne fait rien et ne plante pas si aucun element festif n'est present", () => {
    const dom = loadComponentsWindow('<p>rien ici</p>');
    const { window } = dom;
    expect(() => window.__initFestiveDemo()).not.toThrow();
  });
});
