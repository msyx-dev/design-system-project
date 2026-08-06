// Tests -- initActionMenu (#744, vague 5/N infra tests vanilla)
//
// A ne pas confondre avec ContextMenu (classe .show) : ActionMenu utilise
// .open comme SegmentedControl/UserMenu/NotificationCenter/ConfirmPopover.
// initActionMenu() est expose directement via window.__initActionMenu
// (verifie shared/components.js:4243). Markup repris de
// pages/navigation.html#action-menu (classes/attrs reels).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function menuHtml(idSuffix) {
  return `
    <div class="action-menu-wrap" id="wrap-${idSuffix}">
      <button class="action-menu-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="Actions">&#8942;</button>
      <div class="action-menu" role="menu">
        <button class="action-menu-item" role="menuitem">Editer</button>
        <button class="action-menu-item" role="menuitem">Dupliquer</button>
        <button class="action-menu-item danger" role="menuitem">Supprimer</button>
      </div>
    </div>
  `;
}

function setup(bodyHtml) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  window.__initActionMenu();
  return { window, document };
}

describe('initActionMenu', () => {
  let ctx, wrap, trigger, menu, items;

  beforeEach(() => {
    ctx = setup(menuHtml('a'));
    wrap = ctx.document.getElementById('wrap-a');
    trigger = wrap.querySelector('.action-menu-trigger');
    menu = wrap.querySelector('.action-menu');
    items = Array.from(menu.querySelectorAll('.action-menu-item'));
  });

  it("ouvre le menu au clic sur le declencheur : classe .open presente + aria-expanded='true'", () => {
    expect(menu.classList.contains('open')).toBe(false);
    fireClick(ctx.window, trigger);
    expect(menu.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('un 2e clic sur le declencheur referme le menu (toggle)', () => {
    fireClick(ctx.window, trigger);
    expect(menu.classList.contains('open')).toBe(true);
    fireClick(ctx.window, trigger);
    expect(menu.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('cliquer sur un item ferme le menu ET restaure le focus sur le declencheur', () => {
    fireClick(ctx.window, trigger);
    fireClick(ctx.window, items[0]);
    expect(menu.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(ctx.document.activeElement).toBe(trigger);
  });

  it("un clic en dehors du menu le referme (.open retiree, aria-expanded='false')", () => {
    fireClick(ctx.window, trigger);
    expect(menu.classList.contains('open')).toBe(true);

    fireClick(ctx.window, ctx.document.body);

    expect(menu.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('Echap referme le menu ET restaure le focus sur le declencheur', () => {
    fireClick(ctx.window, trigger);
    expect(menu.classList.contains('open')).toBe(true);
    items[0].focus();

    fireKeydown(ctx.window, items[0], 'Escape');

    expect(menu.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(ctx.document.activeElement).toBe(trigger);
  });

  it("ouvrir un 2e action-menu referme le 1er (un seul .open a la fois)", () => {
    const dom2 = loadComponentsWindow(menuHtml('a') + menuHtml('b'));
    const { window } = dom2;
    const { document } = window;
    window.__initActionMenu();
    const triggerA = document.getElementById('wrap-a').querySelector('.action-menu-trigger');
    const menuA = document.getElementById('wrap-a').querySelector('.action-menu');
    const triggerB = document.getElementById('wrap-b').querySelector('.action-menu-trigger');
    const menuB = document.getElementById('wrap-b').querySelector('.action-menu');

    fireClick(window, triggerA);
    expect(menuA.classList.contains('open')).toBe(true);

    fireClick(window, triggerB);
    expect(menuB.classList.contains('open')).toBe(true);
    expect(menuA.classList.contains('open')).toBe(false);
    expect(triggerA.getAttribute('aria-expanded')).toBe('false');
  });

  it('reste idempotent : un second appel de __initActionMenu() ne double-bind pas le declencheur (dataset.bound)', () => {
    ctx.window.__initActionMenu(); // 2e appel (simule une re-init SPA)

    fireClick(ctx.window, trigger);
    // Si double-bind, le handler de clic s'executerait 2x sur le meme
    // evenement -- la logique "close all then open if !wasOpen" repartirait
    // d'un etat deja modifie par le 1er passage et le menu finirait FERME
    // au lieu d'ouvert.
    expect(menu.classList.contains('open')).toBe(true);
  });
});
