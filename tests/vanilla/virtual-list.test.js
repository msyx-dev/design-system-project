// Tests -- initVirtualList (#744, vague 11/N couverture tests vanilla)
//
// Expose directement via window.__initVirtualList (shared/components.js:6929).
// Markup repris de pages/data.html#virtual-list (classes/attrs reels) :
// .virtual-list[data-vlist-count] > .virtual-list-viewport (hauteur/row-height
// pilotees par --vlist-height/--vlist-row-h, custom properties CSS).
//
// jsdom ne calcule AUCUNE geometrie reelle (clientHeight/getBoundingClientRect
// valent 0, aucune feuille de style externe n'est chargee dans ce harnais) --
// getComputedStyle(...).getPropertyValue('--vlist-height'/'--vlist-row-h')
// renvoie donc une chaine vide et le composant retombe sur ses fallbacks
// codes en dur (400 / 40, verifie empiriquement). C'est CE comportement (les
// fallbacks) qui est teste ici, pas un rendu pixel-perfect. `scrollTop` en
// revanche EST un stockage simple sous jsdom (pas une propriete calculee a
// partir du layout) : assignable/lisible fidelement -- on peut donc bel et
// bien piloter la fenetre visible en le fixant a la main puis en dispatchant
// un evenement 'scroll' (verifie empiriquement).
//
// Rendu differe par requestAnimationFrame : jsdom expose son propre rAF
// (pretendToBeVisual:true) qui, verifie empiriquement, est bien intercepte
// par vi.useFakeTimers()/vi.advanceTimersByTime() DES LORS QUE
// vi.useFakeTimers() est appele AVANT loadComponentsWindow() (meme motif que
// chips.test.js pour dom.window.setTimeout). On l'utilise pour distinguer
// "l'evenement scroll a ete dispatche" de "le re-render a reellement eu
// lieu" -- une assertion qui resterait vraie AVANT advanceTimersByTime()
// serait un test qui passe pour de mauvaises raisons.
//
// Bug corrige ici (#744 vague 11) : .virtual-list-viewport est
// overflow-y:auto (defile reellement au clavier via Page Up/Down/flèches
// UNE FOIS focus) mais n'avait aucun tabindex -- injoignable au clavier.
// Meme regle deja documentee/appliquee ailleurs dans le DS pour
// .detail-grid-aside (pages/fondation.html, a11y "scrollable-region-focusable").
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

function vlistHtml(count) {
  return `
    <div class="virtual-list" data-vlist-count="${count}">
      <div class="virtual-list-viewport"></div>
    </div>
  `;
}

function setup(count = 100) {
  const dom = loadComponentsWindow(vlistHtml(count));
  const { window } = dom;
  const { document } = window;
  window.__initVirtualList();
  const list = document.querySelector('.virtual-list');
  const viewport = document.querySelector('.virtual-list-viewport');
  return { window, document, list, viewport };
}

function rows(viewport) {
  return Array.from(viewport.querySelectorAll('.virtual-list-row'));
}

function firstIndex(viewport) {
  const r = rows(viewport)[0];
  return r ? parseInt(r.getAttribute('aria-rowindex'), 10) : null;
}

describe('initVirtualList -- rendu initial', () => {
  it('pose role="list" et aria-rowcount sur le viewport', () => {
    const { viewport } = setup(100);
    expect(viewport.getAttribute('role')).toBe('list');
    expect(viewport.getAttribute('aria-rowcount')).toBe('100');
  });

  it('pose tabindex="0" sur le viewport -- scrollable-region-focusable (bug corrige #744 vague 11)', () => {
    const { viewport } = setup(100);
    expect(viewport.getAttribute('tabindex')).toBe('0');
  });

  it('ne stomp pas un tabindex deja pose explicitement dans le markup consumer', () => {
    const dom = loadComponentsWindow(`
      <div class="virtual-list" data-vlist-count="10">
        <div class="virtual-list-viewport" tabindex="-1"></div>
      </div>
    `);
    dom.window.__initVirtualList();
    const viewport = dom.window.document.querySelector('.virtual-list-viewport');
    expect(viewport.getAttribute('tabindex')).toBe('-1');
  });

  it('rend un nombre de lignes borne par le fallback (viewportH=400/rowH=40, aucune CSS chargee) : 20 lignes visibles', () => {
    const { viewport } = setup(100);
    // ceil(400/40) + 2*OVERSCAN(5) = 10 + 10 = 20
    expect(rows(viewport).length).toBe(20);
  });

  it('chaque ligne rendue porte role="listitem" et un aria-rowindex 1-based sequentiel', () => {
    const { viewport } = setup(100);
    rows(viewport).forEach((r, i) => {
      expect(r.getAttribute('role')).toBe('listitem');
      expect(r.getAttribute('aria-rowindex')).toBe(String(i + 1));
    });
  });

  it('sans window.__vlistRenderRow, retombe sur le contenu fallback "Élément #N"', () => {
    const { viewport } = setup(5);
    const items = rows(viewport);
    expect(items[0].textContent).toBe('Élément #1');
    expect(items[4].textContent).toBe('Élément #5');
  });

  it('avec window.__vlistRenderRow defini, delegue le rendu de chaque ligne au consumer', () => {
    const dom = loadComponentsWindow(vlistHtml(5));
    dom.window.__vlistRenderRow = function (i) { return '<b>Row ' + i + '</b>'; };
    dom.window.__initVirtualList();
    const viewport = dom.window.document.querySelector('.virtual-list-viewport');
    const items = rows(viewport);
    expect(items[0].innerHTML).toBe('<b>Row 0</b>');
    expect(items[0].querySelector('b').textContent).toBe('Row 0');
  });

  it('le viewport contient exactement spacer-haut + conteneur de lignes + spacer-bas (3 enfants directs)', () => {
    const { viewport } = setup(100);
    expect(viewport.children.length).toBe(3);
    expect(viewport.children[0].classList.contains('virtual-spacer')).toBe(true);
    expect(viewport.children[2].classList.contains('virtual-spacer')).toBe(true);
  });

  it('les spacers sont aria-hidden (non annonces par un lecteur d ecran)', () => {
    const { viewport } = setup(100);
    expect(viewport.children[0].getAttribute('aria-hidden')).toBe('true');
    expect(viewport.children[2].getAttribute('aria-hidden')).toBe('true');
  });

  it('spacer haut a 0px et spacer bas dimensionne pour preserver la hauteur totale de scroll au premier rendu', () => {
    const { viewport } = setup(100);
    expect(viewport.children[0].style.height).toBe('0px');
    // (total - first - count) * rowH = (100 - 0 - 20) * 40
    expect(viewport.children[2].style.height).toBe((80 * 40) + 'px');
  });
});

describe('initVirtualList -- scroll (fenetre visible)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('le re-render est differe au prochain frame (requestAnimationFrame), pas synchrone au scroll', () => {
    const { window, viewport } = setup(100);
    viewport.scrollTop = 2000;
    viewport.dispatchEvent(new window.Event('scroll'));
    // Avant le tick rAF : la fenetre affichee n'a PAS encore bouge.
    expect(firstIndex(viewport)).toBe(1);
    vi.advanceTimersByTime(100);
    expect(firstIndex(viewport)).not.toBe(1);
  });

  it('scroller deplace reellement la fenetre de lignes rendues (pas cosmetique)', () => {
    const { window, viewport } = setup(100);
    viewport.scrollTop = 2000;
    viewport.dispatchEvent(new window.Event('scroll'));
    vi.advanceTimersByTime(100);
    // floor(2000/40) - OVERSCAN(5) = 50 - 5 = 45 -> aria-rowindex demarre a 46
    expect(firstIndex(viewport)).toBe(46);
    expect(rows(viewport).length).toBe(20);
  });

  it('scroller pres de la fin CLAMP la fenetre pour ne jamais depasser le total (derniere ligne = total)', () => {
    const { window, viewport } = setup(100);
    viewport.scrollTop = 100000; // tres au-dela de la fin
    viewport.dispatchEvent(new window.Event('scroll'));
    vi.advanceTimersByTime(100);
    const items = rows(viewport);
    expect(items.length).toBe(20);
    expect(parseInt(items[items.length - 1].getAttribute('aria-rowindex'), 10)).toBe(100);
    // spacer bas revient a 0 -- plus rien a defiler apres la derniere ligne
    expect(viewport.children[2].style.height).toBe('0px');
  });

  it('revenir en haut (scrollTop=0) restaure la fenetre initiale', () => {
    const { window, viewport } = setup(100);
    viewport.scrollTop = 2000;
    viewport.dispatchEvent(new window.Event('scroll'));
    vi.advanceTimersByTime(100);
    viewport.scrollTop = 0;
    viewport.dispatchEvent(new window.Event('scroll'));
    vi.advanceTimersByTime(100);
    expect(firstIndex(viewport)).toBe(1);
  });
});

describe('initVirtualList -- divers', () => {
  it('reappeler initVirtualList() est idempotent (dataset.bound, pas de reconstruction du viewport)', () => {
    const { window, viewport } = setup(100);
    const rowsContainerBefore = viewport.children[1];
    window.__initVirtualList(); // 2e appel -- doit no-op sur cette liste deja bound
    expect(viewport.children.length).toBe(3);
    expect(viewport.children[1]).toBe(rowsContainerBefore);
  });
});
