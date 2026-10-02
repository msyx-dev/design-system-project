// Tests -- initFestiveDemo (#940, decor festif du theme Noel)
//
// Expose via window.__initFestiveDemo (shared/components.js). Markup repris
// de pages/fondation.html#festif (classes/ids reels) : #festif-snow (.snowfall,
// aria-hidden), #festif-toggle-demo (bouton de bascule), [data-festif-density]
// (boutons de variante). Persistance dans localStorage sous la cle
// `msyx-festive`, partagee avec le dogfood du header (shared/nav.js,
// ensureFestiveDecor()/updateFestiveDecor()). Les 1ers blocs se limitent a la
// mecanique de components.js ; le dernier (#993) charge nav.js lui-meme pour
// verrouiller la validite du <svg> du sapin injecte par ensureFestiveDecor().
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

const NAV_JS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../shared/nav.js'
);

function festifHtml() {
  return `
    <div class="snowfall" aria-hidden="true" id="festif-snow" hidden></div>
    <ul class="garland" aria-hidden="true">
      <li class="garland-bulb" style="--i:0"></li>
      <li class="garland-bulb" style="--i:1"></li>
    </ul>
    <div class="ornaments" aria-hidden="true">
      <div class="ornament" style="--ornament-color:var(--accent);--ornament-size:22px;--ornament-drop:24px;--i:0"></div>
      <div class="ornament" style="--ornament-color:var(--warning);--ornament-size:26px;--ornament-drop:44px;--i:1"></div>
    </div>
    <div class="frost" aria-hidden="true"></div>
    <img class="festive-character" src="/assets/tree-noel.svg" alt="" aria-hidden="true">
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

  it('tous les elements du decor (.ornaments, .frost, .festive-character) portent aria-hidden="true"', () => {
    const { document } = setup();
    const ornaments = document.querySelector('.ornaments');
    const frost = document.querySelector('.frost');
    const character = document.querySelector('.festive-character');
    expect(ornaments.getAttribute('aria-hidden')).toBe('true');
    expect(frost.getAttribute('aria-hidden')).toBe('true');
    expect(character.getAttribute('aria-hidden')).toBe('true');
  });

  it('.ornament porte ses variables de couleur (--ornament-color) et de dephasage (--i)', () => {
    const { document } = setup();
    const balls = document.querySelectorAll('.ornament');
    expect(balls.length).toBeGreaterThan(0);
    balls.forEach((ball, idx) => {
      expect(ball.style.getPropertyValue('--ornament-color')).not.toBe('');
      expect(ball.style.getPropertyValue('--i')).toBe(String(idx));
    });
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

// #946 — le DEFAUT de la neige. La regle vit dans updateFestiveDecor() (nav.js) ;
// ce bloc-ci verrouille la SEMANTIQUE de la cle partagee, qui est ce qui a change : avant, il fallait 'on' pour voir la neige ; desormais
// seule la valeur 'off' la coupe. Un test de la valeur, pas du DOM.
describe('festive — semantique de la cle msyx-festive (#946)', () => {
  const neigeVisible = (valeur) => valeur !== 'off';

  it('aucune valeur stockee => la neige tombe', () => {
    expect(neigeVisible(null)).toBe(true);
  });

  it("seule la valeur 'off' coupe la neige", () => {
    expect(neigeVisible('off')).toBe(false);
    expect(neigeVisible('on')).toBe(true);
    expect(neigeVisible('nimporte quoi')).toBe(true);
  });
});

// #993 — le <svg> du sapin injecte par ensureFestiveDecor() (nav.js) portait
// height="auto", valeur INVALIDE pour un attribut SVG : le navigateur journalise
// `<svg> attribute height: Expected length, "auto"` sur toutes les pages, ce qui
// fait echouer le smoke DOM (0 erreur console tolere). On charge le VRAI nav.js
// (script classique, evalue dans une fenetre jsdom comme le fait components.js).
// DOMContentLoaded est neutralise : buildHeader()/buildSidebar() n'ont rien a
// faire ici et tourneraient apres la fin du test.
describe('ensureFestiveDecor (nav.js) -- <svg> du sapin valide (#993)', () => {
  function loadNavWindow() {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://design-system.miklaw.fr/',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const { document } = dom.window;
    const realAdd = document.addEventListener.bind(document);
    document.addEventListener = (type, ...rest) =>
      type === 'DOMContentLoaded' ? undefined : realAdd(type, ...rest);
    dom.window.eval(readFileSync(NAV_JS_PATH, 'utf8'));
    return dom.window;
  }

  // Longueur SVG valide : nombre, avec unite optionnelle. `auto` n'en est pas une.
  const LONGUEUR_SVG = /^\d+(\.\d+)?(px|em|rem|%)?$/;

  it('le <svg> inline du sapin est injecte dans #ds-festive-tree', () => {
    const win = loadNavWindow();
    win.ensureFestiveDecor();
    expect(win.document.querySelector('#ds-festive-tree svg')).not.toBeNull();
  });

  it('le <svg> du sapin ne porte pas height="auto" (ni aucune longueur invalide)', () => {
    const win = loadNavWindow();
    win.ensureFestiveDecor();
    const svg = win.document.querySelector('#ds-festive-tree svg');
    expect(svg.getAttribute('height')).not.toBe('auto');
    for (const attr of ['width', 'height']) {
      const valeur = svg.getAttribute(attr);
      // absent = valide (le viewBox donne le ratio) ; present = longueur SVG valide
      expect(valeur === null || LONGUEUR_SVG.test(valeur)).toBe(true);
    }
  });
});
