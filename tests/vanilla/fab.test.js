// Tests -- initFAB (#744, vague 7/N couverture tests vanilla)
//
// Expose individuellement : window.__initFAB(). Markup repris de
// pages/overlays.html#fab (classes/attrs reels : .fab-menu/.fab-trigger/
// .fab-actions/.fab-action-btn).
//
// Defaut trouve en chemin (corrige dans cette PR, cf. CHANGELOG.md) : quand
// un 2e menu FAB s'ouvre, le code fermait les AUTRES menus deja ouverts a la
// main (classe + aria-expanded) SANS repasser par closeMenu() -- l'attribut
// `inert` de leur .fab-actions (pose par closeMenu() pour neutraliser le
// focus/l'annonce AT des boutons d'action masques, cf. commentaire en tete
// de initFAB dans shared/components.js) restait absent. Un Tab pouvait donc
// re-atterrir sur un bouton d'action visuellement invisible d'un menu deja
// referme -- exactement le bug que `inert` avait ete introduit pour
// eliminer. Corrige en reappliquant `inert` dans cette branche, comme
// closeMenu() le fait deja pour le menu courant.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function fabHtml(id) {
  return `
    <div class="fab-menu" id="${id}" aria-label="Menu actions">
      <div class="fab-actions" aria-live="polite">
        <div class="fab-action">
          <button class="fab-action-btn" aria-label="Partager">Partager</button>
        </div>
        <div class="fab-action">
          <button class="fab-action-btn" aria-label="Supprimer">Supprimer</button>
        </div>
      </div>
      <button class="fab fab-trigger" aria-haspopup="true" aria-expanded="false" aria-label="Ouvrir les actions">
        <span class="fab-icon-main">+</span>
      </button>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(fabHtml('fab-menu-demo'));
  const { window } = dom;
  const { document } = window;
  window.__initFAB();
  const menu = document.getElementById('fab-menu-demo');
  const trigger = menu.querySelector('.fab-trigger');
  const actions = menu.querySelector('.fab-actions');
  const actionBtn = menu.querySelector('.fab-action-btn');
  return { window, document, menu, trigger, actions, actionBtn };
}

describe('initFAB', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("des l'init, le menu est ferme : pas de .open, aria-expanded=false, inert pose sur .fab-actions", () => {
    const { menu, trigger, actions } = ctx;
    expect(menu.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(actions.hasAttribute('inert')).toBe(true);
  });

  it('le clic sur le declencheur ouvre le menu : .open, aria-expanded=true, inert retire', () => {
    const { window, menu, trigger, actions } = ctx;
    fireClick(window, trigger);
    expect(menu.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(actions.hasAttribute('inert')).toBe(false);
  });

  it('un second clic sur le declencheur referme le menu (toggle) et repose inert', () => {
    const { window, menu, trigger, actions } = ctx;
    fireClick(window, trigger);
    fireClick(window, trigger);
    expect(menu.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(actions.hasAttribute('inert')).toBe(true);
  });

  it("un clic a l'exterieur du menu le referme", () => {
    const { window, document, menu, trigger, actions } = ctx;
    fireClick(window, trigger);
    expect(menu.classList.contains('open')).toBe(true);
    fireClick(window, document.body);
    expect(menu.classList.contains('open')).toBe(false);
    expect(actions.hasAttribute('inert')).toBe(true);
  });

  it("un clic A L'INTERIEUR du menu (sur une action) ne le referme pas", () => {
    const { window, menu, trigger, actionBtn } = ctx;
    fireClick(window, trigger);
    fireClick(window, actionBtn);
    expect(menu.classList.contains('open')).toBe(true);
  });

  it('Echap referme le menu ouvert et restaure le focus sur le declencheur', () => {
    const { window, document, menu, trigger } = ctx;
    fireClick(window, trigger);
    fireKeydown(window, document, 'Escape');
    expect(menu.classList.contains('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("reste idempotent : un second appel de __initFAB() ne double-bind pas le declencheur", () => {
    const { window, menu, trigger } = ctx;
    window.__initFAB(); // 2e appel
    fireClick(window, trigger);
    expect(menu.classList.contains('open')).toBe(true);
    fireClick(window, trigger);
    expect(menu.classList.contains('open')).toBe(false);
  });
});

describe('initFAB — plusieurs menus', () => {
  function setupTwo() {
    const dom = loadComponentsWindow(fabHtml('fab-menu-a') + fabHtml('fab-menu-b'));
    const { window } = dom;
    const { document } = window;
    window.__initFAB();
    const menuA = document.getElementById('fab-menu-a');
    const menuB = document.getElementById('fab-menu-b');
    return {
      window,
      document,
      menuA,
      triggerA: menuA.querySelector('.fab-trigger'),
      actionsA: menuA.querySelector('.fab-actions'),
      menuB,
      triggerB: menuB.querySelector('.fab-trigger'),
      actionsB: menuB.querySelector('.fab-actions'),
    };
  }

  it("ouvrir un 2e menu FAB referme le 1er, y compris l'attribut inert de ses actions (defaut corrige)", () => {
    const { window, menuA, triggerA, actionsA, menuB, triggerB, actionsB } = setupTwo();
    fireClick(window, triggerA);
    expect(menuA.classList.contains('open')).toBe(true);
    expect(actionsA.hasAttribute('inert')).toBe(false);

    fireClick(window, triggerB);

    expect(menuA.classList.contains('open')).toBe(false);
    expect(triggerA.getAttribute('aria-expanded')).toBe('false');
    expect(actionsA.hasAttribute('inert')).toBe(true);

    expect(menuB.classList.contains('open')).toBe(true);
    expect(actionsB.hasAttribute('inert')).toBe(false);
  });
});
