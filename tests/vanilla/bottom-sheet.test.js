// Tests -- initBottomSheet (#744, vague 4/N infra tests vanilla)
//
// Markup repris de pages/overlays.html#bottom-sheet (classes/attrs reels).
// Expose individuellement : window.__initBottomSheet().
//
// Repere AVANT d'ecrire les tests (probe jsdom direct) : `.bottom-sheet`
// n'a AUCUN tabindex dans le markup source ni pose par le JS -- l'appel
// `panel.focus && panel.focus()` dans openSheet() est donc un NO-OP reel
// (verifie empiriquement : document.activeElement reste le declencheur
// apres ouverture, exactement comme le ferait un vrai navigateur avec un
// <div> non focusable). Le composant ne deplace ni ne restaure JAMAIS le
// focus malgre role="dialog"/aria-modal="true" poses a l'ouverture -- pas
// de trap focus, pas de mouvement initial. Ecart reel documente dans la PR
// (#744 vague 4), pas teste comme s'il fonctionnait.
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
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    expect(overlay.classList.contains('open')).toBe(true);
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(overlay.hasAttribute('inert')).toBe(false);
  });

  it('le clic sur le bouton de fermeture referme le panneau et restaure inert', () => {
    const { window, panel, overlay, trigger, closeBtn } = ctx;
    fireClick(window, trigger);
    fireClick(window, closeBtn);
    expect(panel.classList.contains('open')).toBe(false);
    expect(overlay.classList.contains('open')).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.hasAttribute('role')).toBe(false);
    expect(overlay.hasAttribute('inert')).toBe(true);
  });

  it("le clic sur l'overlay referme le panneau", () => {
    const { window, panel, overlay, trigger } = ctx;
    fireClick(window, trigger);
    fireClick(window, overlay);
    expect(panel.classList.contains('open')).toBe(false);
    expect(overlay.classList.contains('open')).toBe(false);
  });

  it('Echap referme tous les panneaux ouverts', () => {
    const { window, document, panel, trigger } = ctx;
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    fireKeydown(window, document, 'Escape');
    expect(panel.classList.contains('open')).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(true);
  });

  it('swipe vers le bas au-dela de 100px sur le handle referme le panneau', () => {
    const { window, panel, trigger, handleWrap } = ctx;
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);

    fireTouch(window, handleWrap, 'touchstart', 100);
    fireTouch(window, handleWrap, 'touchmove', 260); // delta = 160 > 100
    fireTouch(window, handleWrap, 'touchend', 260);

    expect(panel.classList.contains('open')).toBe(false);
  });

  it('swipe vers le bas EN-DECA de 100px ne referme PAS le panneau', () => {
    const { window, panel, trigger, handleWrap } = ctx;
    fireClick(window, trigger);

    fireTouch(window, handleWrap, 'touchstart', 100);
    fireTouch(window, handleWrap, 'touchmove', 150); // delta = 50 < 100
    fireTouch(window, handleWrap, 'touchend', 150);

    expect(panel.classList.contains('open')).toBe(true);
  });

  it('reappeler initBottomSheet() est idempotent (dataset.bound, un seul cycle ouverture/fermeture)', () => {
    const { window, panel, trigger, closeBtn } = ctx;
    window.__initBottomSheet(); // 2e appel -- doit no-op
    fireClick(window, trigger);
    expect(panel.classList.contains('open')).toBe(true);
    fireClick(window, closeBtn);
    expect(panel.classList.contains('open')).toBe(false);
  });
});
