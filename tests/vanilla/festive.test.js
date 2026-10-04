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

// #1042 — reserve haute du decor festif. La geometrie des boules a UNE source :
// les tokens --ornament-{drop,size}-N de tokens.css. nav.js les reference par
// var() (aucun px), festive.css en derive --festive-top-clearance par max(), et
// les gabarits l'ajoutent a --header-h. jsdom ne prouve AUCUN recouvrement
// (regle N1) : ces cas gardent la COHERENCE DES SOURCES ; la mesure est faite
// dans Chromium par visual-tests/festive-top-clearance-1042.spec.ts.
const CSS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../shared/css'
);
/** CSS sans commentaires : les en-tetes citent les formules qu'ils expliquent. */
const lireCss = (rel) =>
  readFileSync(path.join(CSS_DIR, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const parNombre = (a, b) => a - b;
/** Rangs declares dans tokens.css pour une dimension (`drop` ou `size`). */
const rangsDeclares = (dim) =>
  [...lireCss('tokens.css').matchAll(new RegExp(`--ornament-${dim}-(\\d+)\\s*:`, 'g'))]
    .map((m) => Number(m[1]))
    .sort(parNombre);

describe('reserve haute du decor festif (#1042) -- coherence des sources', () => {
  function chargerNav() {
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

  it('tokens.css declare une chute ET une taille pour chaque rang (1..N, sans trou)', () => {
    const drops = rangsDeclares('drop');
    expect(drops.length).toBeGreaterThan(0);
    expect(rangsDeclares('size')).toEqual(drops);
    expect(drops).toEqual(drops.map((_, i) => i + 1));
  });

  it('ensureFestiveDecor() : chaque boule reference les tokens de SON rang, sans px ni top en ligne', () => {
    const rangs = rangsDeclares('drop').length;
    const win = chargerNav();
    win.ensureFestiveDecor();
    const boules = [...win.document.querySelectorAll('#ds-festive-ornaments > .ornament')];
    expect(boules).toHaveLength(7);
    boules.forEach((boule, i) => {
      const rang = (i % rangs) + 1;
      expect(boule.style.getPropertyValue('--ornament-drop')).toBe(`var(--ornament-drop-${rang})`);
      expect(boule.style.getPropertyValue('--ornament-size')).toBe(`var(--ornament-size-${rang})`);
      expect(boule.style.top).toBe('');
      expect(boule.getAttribute('style')).not.toMatch(/\d\s*px/);
    });
    // tous les rangs declares servent : un token orphelin gonflerait la reserve pour rien
    const servis = new Set(boules.map((b) => b.style.getPropertyValue('--ornament-drop')));
    expect(servis.size).toBe(rangs);
  });

  it('--festive-top-clearance = max() de chute + taille de TOUS les rangs, garde Noel + guirlande', () => {
    const festive = lireCss('components/festive.css');
    const bloc = festive.match(/:root\[data-theme="noel"\]:has\(\.garland--header\)\s*\{([^}]*)\}/);
    expect(bloc).not.toBeNull();
    const reserve = bloc[1].match(/--festive-top-clearance\s*:\s*max\(([\s\S]*?)\);/);
    expect(reserve).not.toBeNull();
    const termes = [
      ...reserve[1].matchAll(/calc\(var\(--ornament-drop-(\d+)\) \+ var\(--ornament-size-(\d+)\)\)/g),
    ];
    termes.forEach((t) => expect(t[2]).toBe(t[1])); // chute et taille du MEME rang
    expect(termes.map((t) => Number(t[1])).sort(parNombre)).toEqual(rangsDeclares('drop'));
    // aucun chiffre pose a la main dans la reserve : elle ne derive que des tokens
    expect(reserve[1].replace(/--ornament-(drop|size)-\d+/g, '')).not.toMatch(/\d/);
    // une seule declaration : pas de seconde reserve sans garde ailleurs dans le module
    expect(festive.match(/--festive-top-clearance\s*:/g)).toHaveLength(1);
  });

  it('le top des boules vient de leur chute (CSS), plus du JS', () => {
    expect(lireCss('components/festive.css')).toMatch(
      /\.ornaments > \.ornament\s*\{\s*top:\s*var\(--ornament-drop, 40px\);\s*\}/
    );
  });

  it.each(['.main', '.page-content', '.content-grid'])(
    '%s ajoute la reserve a --header-h, avec repli 0px (rien hors Noel)',
    (gabarit) => {
      const regle = lireCss('layout.css').match(
        new RegExp(`(?:^|\\n)${gabarit.replace('.', '\\.')}\\s*\\{([^}]*)\\}`)
      );
      expect(regle).not.toBeNull();
      expect(regle[1]).toMatch(
        /padding-top:\s*calc\(var\(--header-h\) \+ var\(--festive-top-clearance, 0px\)\)/
      );
    }
  );

  it('scroll-padding-top ajoute la reserve entre --header-h et --space-md (#1039)', () => {
    expect(lireCss('base.css')).toMatch(
      /html:has\(\.site-header\)\s*\{\s*scroll-padding-top:\s*calc\(var\(--header-h\) \+ var\(--festive-top-clearance, 0px\) \+ var\(--space-md\)\);/
    );
  });
});
