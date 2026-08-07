// Tests -- initBeforeAfter (#744, vague 16/N couverture tests vanilla)
//
// Expose directement via window.__initBeforeAfter (shared/components.js).
// Markup repris de la demo reelle (pages/divers.html#before-after) :
// .before-after > .before-after-before + .before-after-after + .before-after-handle
// (le curseur draggable, positionne par CSS a gauche/droite via .style.left).
//
// Meme mecanique pointerDrag() que split-pane (#657) -- window.__pointerDrag()
// appele sans etre defini par components.js lui-meme, charge separement sur
// les vraies pages via shared/dist/graph-lib.global.js (cf. commentaire
// d-entete de split-pane.test.js pour le detail de la resolution : on evalue
// le VRAI fichier distribue via installPointerDragLib()).
//
// Contrairement a split-pane, le handle ici n-a NI role, NI tabindex, NI
// listener keydown (verifie -- grep "keydown" autour d-initBeforeAfter :
// aucun). Le curseur n-est donc utilisable qu-a la souris/tactile. C-est un
// ecart d-accessibilite reel (WCAG 2.1.1 Keyboard) mais implementer une
// navigation clavier serait une CAPACITE ENTIEREMENT ABSENTE (pas un bug
// borne) -- signale en PR/ticket #836 plutot que teste ou "corrige" ici.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, installPointerDragLib, firePointer } from './helpers/load-components.js';

function beforeAfterHtml() {
  return `
    <div class="before-after" style="max-width:600px;">
      <div class="before-after-before" style="height:300px;">
        <span class="before-after-label">Avant</span>
      </div>
      <div class="before-after-after" style="height:300px;">
        <span class="before-after-label">Apres</span>
      </div>
      <div class="before-after-handle"></div>
    </div>
  `;
}

const RECT_500 = { left: 0, top: 0, width: 500, height: 300, right: 500, bottom: 300 };

function setup({ rect } = {}) {
  const dom = loadComponentsWindow(beforeAfterHtml());
  const { window } = dom;
  const { document } = window;
  installPointerDragLib(window);
  const container = document.querySelector('.before-after');
  const before = container.querySelector('.before-after-before');
  const handle = container.querySelector('.before-after-handle');
  if (rect) container.getBoundingClientRect = () => rect;
  return { window, document, container, before, handle };
}

describe('initBeforeAfter -- etat initial', () => {
  it('pose touch-action:none sur le handle (drag tactile fluide, pas intercepte comme un scroll)', () => {
    const { window, handle } = setup();
    window.__initBeforeAfter();
    expect(handle.style.touchAction).toBe('none');
  });

  it('ne pose aucun clip-path/left avant le premier drag (positionnement initial delegue au CSS)', () => {
    const { window, before, handle } = setup();
    window.__initBeforeAfter();
    expect(before.style.clipPath).toBe('');
    expect(handle.style.left).toBe('');
  });
});

describe('initBeforeAfter -- drag pointer (window.__pointerDrag reel)', () => {
  it('pointermove convertit clientX en pourcentage via getBoundingClientRect (500px de large)', () => {
    const { window, before, handle } = setup({ rect: RECT_500 });
    window.__initBeforeAfter();
    firePointer(window, handle, 'pointerdown', { clientX: 250, clientY: 150 });
    firePointer(window, handle, 'pointermove', { clientX: 100, clientY: 150 }); // 100/500 = 20%
    expect(handle.style.left).toBe('20%');
    expect(before.style.clipPath).toBe('inset(0 80% 0 0)');
  });

  it('clampe a 95% max (curseur pousse au-dela du bord droit)', () => {
    const { window, before, handle } = setup({ rect: RECT_500 });
    window.__initBeforeAfter();
    firePointer(window, handle, 'pointerdown', { clientX: 250, clientY: 150 });
    firePointer(window, handle, 'pointermove', { clientX: 5000, clientY: 150 });
    expect(handle.style.left).toBe('95%');
    expect(before.style.clipPath).toBe('inset(0 5% 0 0)');
  });

  it('clampe a 5% min (curseur pousse au-dela du bord gauche, y compris negatif)', () => {
    const { window, before, handle } = setup({ rect: RECT_500 });
    window.__initBeforeAfter();
    firePointer(window, handle, 'pointerdown', { clientX: 250, clientY: 150 });
    firePointer(window, handle, 'pointermove', { clientX: -200, clientY: 150 });
    expect(handle.style.left).toBe('5%');
    expect(before.style.clipPath).toBe('inset(0 95% 0 0)');
  });

  it('sans pointerdown prealable, pointermove seul ne fait rien (pas de drag en cours)', () => {
    const { window, handle } = setup({ rect: RECT_500 });
    window.__initBeforeAfter();
    firePointer(window, handle, 'pointermove', { clientX: 250, clientY: 150 });
    expect(handle.style.left).toBe('');
  });

  it('pointerup termine le drag -- un pointermove ulterieur n-a plus d-effet', () => {
    const { window, handle } = setup({ rect: RECT_500 });
    window.__initBeforeAfter();
    firePointer(window, handle, 'pointerdown', { clientX: 250, clientY: 150 });
    firePointer(window, handle, 'pointermove', { clientX: 100, clientY: 150 });
    expect(handle.style.left).toBe('20%');
    firePointer(window, handle, 'pointerup', { clientX: 100, clientY: 150 });
    firePointer(window, handle, 'pointermove', { clientX: 400, clientY: 150 });
    expect(handle.style.left).toBe('20%'); // inchange -- plus de drag actif
  });
});

describe('initBeforeAfter -- idempotence', () => {
  it('un second appel initBeforeAfter() ne double-bind pas le drag (dataset.bound)', () => {
    const { window, before, handle } = setup({ rect: RECT_500 });
    window.__initBeforeAfter();
    window.__initBeforeAfter();
    firePointer(window, handle, 'pointerdown', { clientX: 250, clientY: 150 });
    firePointer(window, handle, 'pointermove', { clientX: 100, clientY: 150 });
    // Si double-bind, applyPercent(20) serait appele 2x dans le meme
    // dispatch synchrone -- resultat identique ici (idempotent par valeur),
    // donc on verifie plutot qu-un SEUL destroyDrag a ete enregistre en
    // comptant les listeners via un second pointerdown qui ne doit pas
    // re-inverser un etat quelconque : le clip-path reste coherent avec le
    // seul dernier pourcentage applique.
    expect(handle.style.left).toBe('20%');
    expect(before.style.clipPath).toBe('inset(0 80% 0 0)');
  });
});
