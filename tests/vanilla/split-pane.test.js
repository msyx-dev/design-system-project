// Tests -- initSplitPane (#744, vague 16/N couverture tests vanilla)
//
// Expose directement via window.__initSplitPane (shared/components.js).
// Markup repris de la demo reelle (pages/divers.html#splitter) :
// .split-pane[.split-pane--vertical]? > .split-panel(x2, 1er panneau
// redimensionne) + .split-gutter[data-split-min][data-split-max] au milieu
// (role="separator" pose par le composant lui-meme, pas dans le markup
// source). Persistance optionnelle via data-split-persist-key sur le pane.
//
// pointerDrag() partage (#657) : initSplitPane() appelle window.__pointerDrag()
// SANS le definir -- sur les vraies pages, shared/dist/graph-lib.global.js
// (compile depuis shared/graph/lib/global-entry.js) est charge AVANT
// components.js (pages/divers.html:775-776) et pose ce global. La vague
// precedente s'est arretee devant cette dependance : on la resout en
// evaluant le VRAI fichier distribue (installPointerDragLib(), cf.
// helpers/load-components.js) plutot que de reimplementer un stub maison --
// meme esprit que loadComponentsWindow() pour components.js lui-meme.
//
// jsdom expose PointerEvent nativement (firePointer(), meme constat que
// #744 vague 11 sortable-list) mais ne calcule AUCUNE geometrie reelle
// (getBoundingClientRect() -> {0,0,0,0} par defaut) : ratioFromPoint() lit
// pane.getBoundingClientRect() pour convertir un clientX/clientY en
// pourcentage -- on stube ce rect par test avec des valeurs deterministes
// (largeur/hauteur connues), meme pattern que sortable-list #744 vague 11.
// setPointerCapture/releasePointerCapture n'existent pas sur Element sous
// jsdom (verifie empiriquement) -- pointerDrag.js les appelle dans un
// try/catch "best-effort" donc aucun stub necessaire, le vrai code absorbe
// l'absence proprement.
import { describe, it, expect } from 'vitest';
import {
  loadComponentsWindow,
  installPointerDragLib,
  firePointer,
  fireKeydown,
} from './helpers/load-components.js';

function horizontalHtml({ persistKey } = {}) {
  const persistAttr = persistKey ? ` data-split-persist-key="${persistKey}"` : '';
  return `
    <div class="split-pane" style="height:240px;"${persistAttr}>
      <div class="split-panel" style="flex-basis:35%;">Liste</div>
      <div class="split-gutter" data-split-min="15" data-split-max="85"></div>
      <div class="split-panel split-panel--fluid">Detail</div>
    </div>
  `;
}

function verticalHtml() {
  return `
    <div class="split-pane split-pane--vertical" style="height:240px;">
      <div class="split-panel" style="flex-basis:40%;">Haut</div>
      <div class="split-gutter" data-split-min="20" data-split-max="80"></div>
      <div class="split-panel split-panel--fluid">Bas</div>
    </div>
  `;
}

const RECT_400x200 = { left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200 };

function setup(html, { rect } = {}) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  installPointerDragLib(window);
  const pane = document.querySelector('.split-pane');
  const gutter = pane.querySelector('.split-gutter');
  const panels = pane.querySelectorAll('.split-panel');
  const firstPanel = panels[0];
  if (rect) pane.getBoundingClientRect = () => rect;
  return { window, document, pane, gutter, firstPanel };
}

describe('initSplitPane -- ARIA + etat initial', () => {
  it('le gutter recoit role=separator, tabindex=0, aria-orientation=vertical (pane horizontal par defaut)', () => {
    const { gutter, window } = setup(horizontalHtml());
    window.__initSplitPane();
    expect(gutter.getAttribute('role')).toBe('separator');
    expect(gutter.getAttribute('tabindex')).toBe('0');
    expect(gutter.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('variante .split-pane--vertical -- aria-orientation=horizontal (le trait separateur est horizontal)', () => {
    const { gutter, window } = setup(verticalHtml());
    window.__initSplitPane();
    expect(gutter.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('aria-valuemin/aria-valuemax refletent data-split-min/max du gutter', () => {
    const { gutter, window } = setup(horizontalHtml());
    window.__initSplitPane();
    expect(gutter.getAttribute('aria-valuemin')).toBe('15');
    expect(gutter.getAttribute('aria-valuemax')).toBe('85');
  });

  it('ratio par defaut 50% -- flexBasis du 1er panneau + aria-valuenow', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml());
    window.__initSplitPane();
    expect(firstPanel.style.flexBasis).toBe('50%');
    expect(gutter.getAttribute('aria-valuenow')).toBe('50');
  });

  it('emet split:resize des l-init avec le ratio par defaut', () => {
    const { pane, window } = setup(horizontalHtml());
    let detail = null;
    pane.addEventListener('split:resize', (e) => { detail = e.detail; });
    window.__initSplitPane();
    expect(detail).toEqual({ ratio: 50 });
  });
});

describe('initSplitPane -- clavier (fleches + Home/End)', () => {
  it('ArrowRight augmente le ratio de 2 points (pane horizontal)', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml());
    window.__initSplitPane();
    fireKeydown(window, gutter, 'ArrowRight');
    expect(firstPanel.style.flexBasis).toBe('52%');
    expect(gutter.getAttribute('aria-valuenow')).toBe('52');
  });

  it('ArrowLeft diminue le ratio de 2 points (pane horizontal)', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml());
    window.__initSplitPane();
    fireKeydown(window, gutter, 'ArrowLeft');
    expect(firstPanel.style.flexBasis).toBe('48%');
  });

  it('Home descend a data-split-min, End monte a data-split-max', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml());
    window.__initSplitPane();
    fireKeydown(window, gutter, 'Home');
    expect(firstPanel.style.flexBasis).toBe('15%');
    fireKeydown(window, gutter, 'End');
    expect(firstPanel.style.flexBasis).toBe('85%');
  });

  it('variante verticale -- ArrowDown augmente, ArrowUp diminue (touches inversees, ratio par defaut 50%)', () => {
    const { gutter, firstPanel, window } = setup(verticalHtml());
    window.__initSplitPane();
    fireKeydown(window, gutter, 'ArrowDown');
    expect(firstPanel.style.flexBasis).toBe('52%');
    fireKeydown(window, gutter, 'ArrowUp');
    fireKeydown(window, gutter, 'ArrowUp');
    expect(firstPanel.style.flexBasis).toBe('48%');
  });

  it('le clavier ne depasse jamais data-split-max meme avec des ArrowRight repetes', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml());
    window.__initSplitPane();
    for (let i = 0; i < 30; i++) fireKeydown(window, gutter, 'ArrowRight');
    expect(firstPanel.style.flexBasis).toBe('85%');
  });

  it('le clavier ne descend jamais sous data-split-min meme avec des ArrowLeft repetes', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml());
    window.__initSplitPane();
    for (let i = 0; i < 30; i++) fireKeydown(window, gutter, 'ArrowLeft');
    expect(firstPanel.style.flexBasis).toBe('15%');
  });
});

describe('initSplitPane -- drag pointer (window.__pointerDrag reel)', () => {
  it('pointerdown sur le gutter pose .split-pane--dragging sur le pane', () => {
    const { pane, gutter, window } = setup(horizontalHtml(), { rect: RECT_400x200 });
    window.__initSplitPane();
    firePointer(window, gutter, 'pointerdown', { clientX: 200, clientY: 100 });
    expect(pane.classList.contains('split-pane--dragging')).toBe(true);
  });

  it('pointermove convertit clientX en ratio via getBoundingClientRect (400px de large)', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml(), { rect: RECT_400x200 });
    window.__initSplitPane();
    firePointer(window, gutter, 'pointerdown', { clientX: 200, clientY: 100 });
    firePointer(window, gutter, 'pointermove', { clientX: 100, clientY: 100 }); // 100/400 = 25%
    expect(firstPanel.style.flexBasis).toBe('25%');
  });

  it('le drag clampe au-dela de data-split-max (clientX hors cadre)', () => {
    const { gutter, firstPanel, window } = setup(horizontalHtml(), { rect: RECT_400x200 });
    window.__initSplitPane();
    firePointer(window, gutter, 'pointerdown', { clientX: 200, clientY: 100 });
    firePointer(window, gutter, 'pointermove', { clientX: 1000, clientY: 100 }); // 250% brut
    expect(firstPanel.style.flexBasis).toBe('85%');
  });

  it('pointerup retire .split-pane--dragging', () => {
    const { pane, gutter, window } = setup(horizontalHtml(), { rect: RECT_400x200 });
    window.__initSplitPane();
    firePointer(window, gutter, 'pointerdown', { clientX: 200, clientY: 100 });
    expect(pane.classList.contains('split-pane--dragging')).toBe(true);
    firePointer(window, gutter, 'pointerup', { clientX: 200, clientY: 100 });
    expect(pane.classList.contains('split-pane--dragging')).toBe(false);
  });

  it('variante verticale -- pointermove convertit clientY (200px de haut)', () => {
    const { gutter, firstPanel, window } = setup(verticalHtml(), { rect: RECT_400x200 });
    window.__initSplitPane();
    firePointer(window, gutter, 'pointerdown', { clientX: 200, clientY: 100 });
    firePointer(window, gutter, 'pointermove', { clientX: 200, clientY: 150 }); // 150/200 = 75%
    expect(firstPanel.style.flexBasis).toBe('75%');
  });
});

describe('initSplitPane -- persistance localStorage (data-split-persist-key)', () => {
  it('le ratio par defaut (50%) N-est PAS persiste a l-init', () => {
    const { window, pane } = setup(horizontalHtml({ persistKey: 'ds-test-splitter' }));
    window.__initSplitPane();
    expect(window.localStorage.getItem('ds-test-splitter')).toBeNull();
  });

  it('un ajustement clavier persiste le nouveau ratio', () => {
    const { window, gutter } = setup(horizontalHtml({ persistKey: 'ds-test-splitter' }));
    window.__initSplitPane();
    fireKeydown(window, gutter, 'ArrowRight');
    expect(window.localStorage.getItem('ds-test-splitter')).toBe('52');
  });

  it('un ratio deja present en localStorage est restaure a l-init (sans re-ecrire)', () => {
    const dom = loadComponentsWindow(horizontalHtml({ persistKey: 'ds-test-splitter' }));
    const { window } = dom;
    installPointerDragLib(window);
    window.localStorage.setItem('ds-test-splitter', '30');
    window.__initSplitPane();
    const firstPanel = window.document.querySelector('.split-panel');
    expect(firstPanel.style.flexBasis).toBe('30%');
  });

  it('sans data-split-persist-key -- aucune ecriture localStorage meme apres un ajustement', () => {
    const { window, gutter } = setup(horizontalHtml());
    window.__initSplitPane();
    fireKeydown(window, gutter, 'ArrowRight');
    expect(window.localStorage.length).toBe(0);
  });
});

describe('initSplitPane -- idempotence', () => {
  it('un second appel initSplitPane() ne double-bind pas le clavier (dataset.bound)', () => {
    const { window, gutter, firstPanel } = setup(horizontalHtml());
    window.__initSplitPane();
    window.__initSplitPane();
    fireKeydown(window, gutter, 'ArrowRight');
    // Si double-bind : 2 handlers -> +4 points (52 puis 54 dans le meme
    // dispatch synchrone). Un seul bind -> +2 exactement.
    expect(firstPanel.style.flexBasis).toBe('52%');
  });

  it('un second appel initSplitPane() garde role=separator et n-ajoute pas de second .split-gutter', () => {
    const { window, pane } = setup(horizontalHtml());
    window.__initSplitPane();
    window.__initSplitPane();
    expect(pane.querySelectorAll('.split-gutter').length).toBe(1);
  });
});
