// Tests -- initBottomSheet (#744 infra tests vanilla + #825 focus a11y)
//
// Markup repris de pages/overlays.html#bottom-sheet (classes/attrs reels).
// Expose individuellement : window.__initBottomSheet().
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown, fireTouch } from './helpers/load-components.js';

function sheetHtml() {
  return `
    <button class="bottom-sheet-trigger" data-target="bs-panel-1">Ouvrir le panneau</button>
    <div class="bottom-sheet-overlay" data-bs-overlay="bs-panel-1"></div>
    <div class="bottom-sheet" id="bs-panel-1" role="dialog" aria-modal="true" aria-label="Panneau d'information">
      <div class="bottom-sheet-handle-wrap" data-bs-handle="bs-panel-1">
        <div class="bottom-sheet-handle"></div>
      </div>
      <div class="bottom-sheet-header">
        <h3>Information</h3>
        <button class="bottom-sheet-close" data-bs-close="bs-panel-1" aria-label="Fermer">&times;</button>
      </div>
      <div class="bottom-sheet-content" tabindex="0"><p>Contenu</p></div>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(sheetHtml());
  const { window } = dom;
  const { document } = window;
  window.__initBottomSheet();
  const trigger = document.querySelector('.bottom-sheet-trigger');
  const overlay = document.querySelector('.bottom-sheet-overlay');
  const panel = document.getElementById('bs-panel-1');
  const closeBtn = document.querySelector('.bottom-sheet-close');
  const handleWrap = document.querySelector('.bottom-sheet-handle-wrap');
  return { window, document, trigger, overlay, panel, closeBtn, handleWrap };
}

// Un vrai clic navigateur sur un bouton le focus AVANT que le handler de
// click ne s'execute (openSheet capture document.activeElement en tout
// debut d'appel -- c'est ce focus du declencheur qui sera restaure a la
// fermeture, #825). jsdom ne simule pas ce focus-on-click implicite
// (limitation connue, cf. dispatchEvent/click() sans effet sur
// activeElement) : on le rend explicite ici, exactement comme le fait deja
// modals.test.js (clickTrigger), plutot que de le stuber globalement dans
// le helper partage.
function clickTrigger(win, el) {
  el.focus();
  fireClick(win, el);
}

describe('initBottomSheet', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("normalise l'etat ferme a l'init malgre role/aria-modal statiques dans le markup (inert pose, role/aria-modal retires)", () => {
    const { panel, overlay } = ctx;
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.hasAttribute('role')).toBe(false);
    expect(panel.hasAttribute('aria-modal')).toBe(false);
    expect(overlay.hasAttribute('inert')).toBe(true);
    expect(panel.classList.contains('open')).toBe(false);
  });

  it('le clic sur le declencheur ouvre le panneau : .open + role=dialog + aria-modal + inert retire', () => {
    const { window, panel, overlay, trigger } = ctx;
    clickTrigger(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    expect(overlay.classList.contains('open')).toBe(true);
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(overlay.hasAttribute('inert')).toBe(false);
  });

  it('le clic sur le bouton de fermeture referme le panneau et restaure inert', () => {
    const { window, panel, overlay, trigger, closeBtn } = ctx;
    clickTrigger(window, trigger);
    fireClick(window, closeBtn);
    expect(panel.classList.contains('open')).toBe(false);
    expect(overlay.classList.contains('open')).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.hasAttribute('role')).toBe(false);
    expect(overlay.hasAttribute('inert')).toBe(true);
  });

  it("le clic sur l'overlay referme le panneau", () => {
    const { window, panel, overlay, trigger } = ctx;
    clickTrigger(window, trigger);
    fireClick(window, overlay);
    expect(panel.classList.contains('open')).toBe(false);
    expect(overlay.classList.contains('open')).toBe(false);
  });

  it('Echap referme tous les panneaux ouverts', () => {
    const { window, document, panel, trigger } = ctx;
    clickTrigger(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    fireKeydown(window, document, 'Escape');
    expect(panel.classList.contains('open')).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(true);
  });

  it('swipe vers le bas au-dela de 100px sur le handle referme le panneau', () => {
    const { window, panel, trigger, handleWrap } = ctx;
    clickTrigger(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);

    fireTouch(window, handleWrap, 'touchstart', 100);
    fireTouch(window, handleWrap, 'touchmove', 260); // delta = 160 > 100
    fireTouch(window, handleWrap, 'touchend', 260);

    expect(panel.classList.contains('open')).toBe(false);
  });

  it('swipe vers le bas EN-DECA de 100px ne referme PAS le panneau', () => {
    const { window, panel, trigger, handleWrap } = ctx;
    clickTrigger(window, trigger);

    fireTouch(window, handleWrap, 'touchstart', 100);
    fireTouch(window, handleWrap, 'touchmove', 150); // delta = 50 < 100
    fireTouch(window, handleWrap, 'touchend', 150);

    expect(panel.classList.contains('open')).toBe(true);
  });

  it('reappeler initBottomSheet() est idempotent (dataset.bound, un seul cycle ouverture/fermeture)', () => {
    const { window, panel, trigger, closeBtn } = ctx;
    window.__initBottomSheet(); // 2e appel -- doit no-op
    clickTrigger(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    fireClick(window, closeBtn);
    expect(panel.classList.contains('open')).toBe(false);
  });

  // --- #825 : le panneau devient reellement focusable + focus trap + restore ---

  it('le panneau porte tabindex="-1" (focusable au script, hors sequence Tab) des l\'init', () => {
    const { panel } = ctx;
    expect(panel.getAttribute('tabindex')).toBe('-1');
  });

  it("l'ouverture deplace le focus sur le panneau (plus de no-op silencieux)", () => {
    const { window, document, panel, trigger } = ctx;
    clickTrigger(window, trigger);
    expect(document.activeElement).toBe(panel);
  });

  it('la fermeture par le bouton restaure le focus sur le declencheur', () => {
    const { window, document, trigger, closeBtn } = ctx;
    clickTrigger(window, trigger);
    fireClick(window, closeBtn);
    expect(document.activeElement).toBe(trigger);
  });

  it("la fermeture par clic sur l'overlay restaure le focus sur le declencheur", () => {
    const { window, document, trigger, overlay } = ctx;
    clickTrigger(window, trigger);
    fireClick(window, overlay);
    expect(document.activeElement).toBe(trigger);
  });

  it('la fermeture par Echap restaure le focus sur le declencheur', () => {
    const { window, document, trigger } = ctx;
    clickTrigger(window, trigger);
    fireKeydown(window, document, 'Escape');
    expect(document.activeElement).toBe(trigger);
  });

  it('la fermeture par swipe restaure le focus sur le declencheur', () => {
    const { window, document, trigger, handleWrap } = ctx;
    clickTrigger(window, trigger);
    fireTouch(window, handleWrap, 'touchstart', 100);
    fireTouch(window, handleWrap, 'touchmove', 260);
    fireTouch(window, handleWrap, 'touchend', 260);
    expect(document.activeElement).toBe(trigger);
  });

  it('Tab depuis le dernier element focusable (le contenu) boucle vers le premier (le bouton fermer)', () => {
    const { window, document, panel, trigger, closeBtn } = ctx;
    clickTrigger(window, trigger);
    const content = panel.querySelector('.bottom-sheet-content');
    content.focus();
    expect(document.activeElement).toBe(content);
    fireKeydown(window, content, 'Tab');
    expect(document.activeElement).toBe(closeBtn);
  });

  it('Shift+Tab depuis le premier element focusable (le bouton fermer) boucle vers le dernier (le contenu)', () => {
    const { window, document, panel, trigger, closeBtn } = ctx;
    clickTrigger(window, trigger);
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);
    fireKeydown(window, closeBtn, 'Tab', { shiftKey: true });
    const content = panel.querySelector('.bottom-sheet-content');
    expect(document.activeElement).toBe(content);
  });
});
