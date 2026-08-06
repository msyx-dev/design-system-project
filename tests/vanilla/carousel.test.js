// Tests -- initCarousel (#744, vague 7/N couverture tests vanilla)
//
// Expose individuellement : window.__initCarousel(). Markup repris de
// pages/divers.html#carousel (classes/attrs reels).
//
// jsdom ne calcule aucune geometrie (getBoundingClientRect etc. valent 0) --
// on ne teste donc QUE ce qui est observable dans le DOM : l'index courant
// (classe .active des points de navigation), la propriete CSS inline
// `transform` (calculee depuis l'index, pas une mesure reelle) et les
// attributs ARIA. Le defilement visuel pixel-perfect n'est PAS testable
// sous jsdom et n'est PAS teste ici.
//
// Timers d'autoplay : jsdom expose son PROPRE window.setInterval, distinct
// de l'horloge globale node (verifie empiriquement : dom.window.setInterval
// !== globalThis.setInterval) -- vi.useFakeTimers() ne l'intercepterait
// donc pas de facon fiable. On stube directement window.setInterval /
// window.clearInterval AVANT d'appeler __initCarousel() pour capturer le
// callback et le delai, et on simule un "tick" en l'invoquant a la main --
// deterministe, sans dependre d'un quelconque scheduler reel.
//
// Swipe tactile : le helper partage fireTouch() ne porte que `clientY` (seul
// besoin de initBottomSheet, seul consommateur existant a ce jour).
// initCarousel lit AUSSI `clientX` (swipe horizontal) -- fireTouchXY local
// fournit les deux coordonnees, sur `touches` ET `changedTouches`
// (touchstart/touchmove lisent `touches`, touchend lit `changedTouches`).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function fireTouchXY(win, el, type, clientX, clientY) {
  const point = { clientX, clientY };
  const evt = new win.TouchEvent(type, {
    touches: [point],
    changedTouches: [point],
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(evt);
  return evt;
}

function carouselHtml({ autoplay } = {}) {
  return `
    <div class="carousel"${autoplay ? ' data-autoplay="4000"' : ''} data-label="Carousel images">
      <div class="carousel-track" role="list">
        <div class="carousel-slide" role="listitem">Slide 1</div>
        <div class="carousel-slide" role="listitem">Slide 2</div>
        <div class="carousel-slide" role="listitem">Slide 3</div>
      </div>
      <button class="carousel-btn carousel-btn-prev" aria-label="Slide precedent">&lsaquo;</button>
      <button class="carousel-btn carousel-btn-next" aria-label="Slide suivant">&rsaquo;</button>
      <div class="carousel-dots" role="tablist"></div>
    </div>
  `;
}

function stubTimers(win) {
  const state = { fn: null, ms: null, startCount: 0, clearCount: 0 };
  win.setInterval = function (fn, ms) {
    state.fn = fn;
    state.ms = ms;
    state.startCount += 1;
    return state.startCount;
  };
  win.clearInterval = function () {
    state.fn = null;
    state.clearCount += 1;
  };
  return state;
}

function setup({ autoplay } = {}) {
  const dom = loadComponentsWindow(carouselHtml({ autoplay }));
  const { window } = dom;
  const { document } = window;
  const timers = autoplay ? stubTimers(window) : null;
  window.__initCarousel();
  const carousel = document.querySelector('.carousel');
  const track = carousel.querySelector('.carousel-track');
  const btnPrev = carousel.querySelector('.carousel-btn-prev');
  const btnNext = carousel.querySelector('.carousel-btn-next');
  const dotsContainer = carousel.querySelector('.carousel-dots');
  const dots = () => Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
  return { window, document, carousel, track, btnPrev, btnNext, dotsContainer, dots, timers };
}

describe('initCarousel', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it('construit un point de navigation par slide, le premier actif', () => {
    const list = ctx.dots();
    expect(list).toHaveLength(3);
    expect(list[0].classList.contains('active')).toBe(true);
    expect(list[1].classList.contains('active')).toBe(false);
    expect(list[2].classList.contains('active')).toBe(false);
  });

  it("l'init pose role=region, aria-label (data-label) et tabindex=0 sur le carrousel", () => {
    const { carousel } = ctx;
    expect(carousel.getAttribute('role')).toBe('region');
    expect(carousel.getAttribute('aria-label')).toBe('Carousel images');
    expect(carousel.getAttribute('tabindex')).toBe('0');
  });

  it("le bouton suivant avance d'un slide : transform + point actif suivant", () => {
    const { window, track, btnNext, dots } = ctx;
    fireClick(window, btnNext);
    expect(track.style.transform).toBe('translateX(-100%)');
    expect(dots()[1].classList.contains('active')).toBe(true);
    expect(dots()[0].classList.contains('active')).toBe(false);
  });

  it('le bouton precedent depuis le premier slide boucle sur le dernier', () => {
    const { window, track, btnPrev, dots } = ctx;
    fireClick(window, btnPrev);
    expect(track.style.transform).toBe('translateX(-200%)');
    expect(dots()[2].classList.contains('active')).toBe(true);
  });

  it('le bouton suivant depuis le dernier slide boucle sur le premier', () => {
    const { window, btnNext, track } = ctx;
    fireClick(window, btnNext); // -> 1
    fireClick(window, btnNext); // -> 2
    fireClick(window, btnNext); // -> 0 (boucle)
    expect(track.style.transform).toBe('translateX(-0%)');
  });

  it('un clic sur un point de navigation va directement au slide correspondant', () => {
    const { window, track, dots } = ctx;
    fireClick(window, dots()[2]);
    expect(track.style.transform).toBe('translateX(-200%)');
    expect(dots()[2].classList.contains('active')).toBe(true);
  });

  it('ArrowRight avance et empeche le defilement de page (preventDefault)', () => {
    const { window, carousel, track } = ctx;
    const evt = fireKeydown(window, carousel, 'ArrowRight');
    expect(track.style.transform).toBe('translateX(-100%)');
    expect(evt.defaultPrevented).toBe(true);
  });

  it('ArrowLeft recule (boucle) et empeche le defilement de page', () => {
    const { window, carousel, track } = ctx;
    const evt = fireKeydown(window, carousel, 'ArrowLeft');
    expect(track.style.transform).toBe('translateX(-200%)');
    expect(evt.defaultPrevented).toBe(true);
  });

  it('un swipe horizontal vers la gauche (plus de 50px) avance au slide suivant', () => {
    const { window, carousel, track } = ctx;
    fireTouchXY(window, carousel, 'touchstart', 300, 100);
    fireTouchXY(window, carousel, 'touchmove', 220, 100);
    fireTouchXY(window, carousel, 'touchend', 220, 100); // dx = -80
    expect(track.style.transform).toBe('translateX(-100%)');
  });

  it('un swipe horizontal vers la droite (plus de 50px) recule au slide precedent (boucle)', () => {
    const { window, carousel, track } = ctx;
    fireTouchXY(window, carousel, 'touchstart', 100, 100);
    fireTouchXY(window, carousel, 'touchmove', 220, 100);
    fireTouchXY(window, carousel, 'touchend', 220, 100); // dx = +120
    expect(track.style.transform).toBe('translateX(-200%)');
  });

  it("un swipe horizontal en-deca de 50px ne change pas de slide", () => {
    const { window, carousel, track } = ctx;
    fireTouchXY(window, carousel, 'touchstart', 300, 100);
    fireTouchXY(window, carousel, 'touchmove', 270, 100);
    fireTouchXY(window, carousel, 'touchend', 270, 100); // dx = -30
    expect(track.style.transform).toBe(''); // goTo() jamais appele => jamais ecrit
  });

  it('reste idempotent : un second appel de __initCarousel() ne double-bind pas (pas de points dupliques)', () => {
    const { window, dots } = ctx;
    window.__initCarousel();
    expect(dots()).toHaveLength(3);
  });
});

describe('initCarousel — autoplay', () => {
  it("avance automatiquement d'un slide a chaque intervalle", () => {
    const { track, timers } = setup({ autoplay: true });
    expect(timers.ms).toBe(4000);
    expect(typeof timers.fn).toBe('function');
    timers.fn(); // simule 1 tick
    expect(track.style.transform).toBe('translateX(-100%)');
  });

  it("survoler le carrousel (mouseenter) coupe l'autoplay", () => {
    const { window, carousel, timers } = setup({ autoplay: true });
    expect(timers.clearCount).toBe(0);
    carousel.dispatchEvent(new window.Event('mouseenter', { bubbles: true }));
    expect(timers.clearCount).toBe(1);
  });

  it("quitter le carrousel (mouseleave) relance l'autoplay", () => {
    const { window, carousel, timers } = setup({ autoplay: true });
    carousel.dispatchEvent(new window.Event('mouseenter', { bubbles: true }));
    expect(timers.clearCount).toBe(1);
    carousel.dispatchEvent(new window.Event('mouseleave', { bubbles: true }));
    expect(timers.startCount).toBe(2); // 1 au demarrage initial + 1 au redemarrage
  });
});
