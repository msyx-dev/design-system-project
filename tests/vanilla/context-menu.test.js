// Tests -- initContextMenu (#744, amorce infra tests vanilla)
//
// Composant choisi car le plus complexe (roving tabindex, cascade Echap,
// sous-menus, #750) et modifie cette semaine -- forte valeur de regression.
// Markup repris de pages/divers.html#context-menu (classes/roles reels).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireKeydown, fireClick } from './helpers/load-components.js';

const BODY_HTML = `
  <div class="context-target" id="context-demo-target">Clic droit ici</div>
  <div class="context-menu" id="context-demo-menu" role="menu" aria-label="Menu contextuel">
    <div class="context-menu-item" role="menuitem">Copier</div>
    <div class="context-menu-item" role="menuitem">Coller</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" role="menuitem" aria-haspopup="menu" aria-expanded="false">
      Partager
      <div class="context-submenu" role="menu" aria-label="Partager via">
        <div class="context-menu-item" role="menuitem">Email</div>
        <div class="context-menu-item" role="menuitem">Slack</div>
      </div>
    </div>
  </div>
`;

function setup() {
  const dom = loadComponentsWindow(BODY_HTML);
  const { window } = dom;
  const { document } = window;
  window.__initContextMenu();
  const target = document.getElementById('context-demo-target');
  const menu = document.getElementById('context-demo-menu');
  // Items directs du menu racine (pas ceux du sous-menu) -- #750.
  const rootItems = Array.prototype.filter.call(menu.children, (el) =>
    el.classList.contains('context-menu-item')
  );
  const [itemCopier, itemColler, itemPartager] = rootItems;
  const submenu = itemPartager.querySelector('.context-submenu');
  return { window, document, target, menu, itemCopier, itemColler, itemPartager, submenu };
}

function openMenu(window, target, menu) {
  const evt = new window.MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 40,
    clientY: 60,
  });
  target.dispatchEvent(evt);
  return menu;
}

describe('initContextMenu', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("ouvre le menu au clic droit sur la cible : classe .show presente (pas seulement l'ARIA)", () => {
    const { window, target, menu } = ctx;
    expect(menu.classList.contains('show')).toBe(false);
    openMenu(window, target, menu);
    expect(menu.classList.contains('show')).toBe(true);
  });

  it('positionne le focus sur le premier item et applique le roving tabindex (0 sur le focuse, -1 ailleurs)', () => {
    const { window, target, menu, itemCopier, itemColler, itemPartager } = ctx;
    openMenu(window, target, menu);
    expect(window.document.activeElement).toBe(itemCopier);
    expect(itemCopier.getAttribute('tabindex')).toBe('0');
    expect(itemColler.getAttribute('tabindex')).toBe('-1');
    expect(itemPartager.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown deplace le roving tabindex vers item suivant (absence de tabindex=0 sur l ancien)', () => {
    const { window, target, menu, itemCopier, itemColler } = ctx;
    openMenu(window, target, menu);
    fireKeydown(window, itemCopier, 'ArrowDown');
    expect(window.document.activeElement).toBe(itemColler);
    expect(itemColler.getAttribute('tabindex')).toBe('0');
    expect(itemCopier.getAttribute('tabindex')).toBe('-1');
  });

  it('ouvre le sous-menu (ArrowRight sur un item porteur) : .show + aria-expanded=true, focus sur le 1er item du sous-menu', () => {
    const { window, target, menu, itemPartager, submenu } = ctx;
    openMenu(window, target, menu);
    // Focus direct sur l'item "Partager" (simule une navigation prealable).
    itemPartager.setAttribute('tabindex', '0');
    itemPartager.focus();

    expect(submenu.classList.contains('show')).toBe(false);
    fireKeydown(window, itemPartager, 'ArrowRight');

    expect(submenu.classList.contains('show')).toBe(true);
    expect(itemPartager.getAttribute('aria-expanded')).toBe('true');
    const submenuFirstItem = submenu.querySelector('.context-menu-item');
    expect(window.document.activeElement).toBe(submenuFirstItem);
    expect(submenuFirstItem.getAttribute('tabindex')).toBe('0');
  });

  it('Echap referme d abord le sous-menu ouvert (cascade) sans fermer le menu racine', () => {
    const { window, target, menu, itemPartager, submenu } = ctx;
    openMenu(window, target, menu);
    itemPartager.setAttribute('tabindex', '0');
    itemPartager.focus();
    fireKeydown(window, itemPartager, 'ArrowRight');
    expect(submenu.classList.contains('show')).toBe(true);

    fireKeydown(window, window.document, 'Escape');

    expect(submenu.classList.contains('show')).toBe(false);
    expect(itemPartager.getAttribute('aria-expanded')).toBe('false');
    expect(menu.classList.contains('show')).toBe(true); // le menu racine reste ouvert
    expect(window.document.activeElement).toBe(itemPartager); // focus restaure au parent
  });

  it('un 2e Echap referme ensuite le menu racine lui-meme', () => {
    const { window, target, menu, itemPartager, submenu } = ctx;
    openMenu(window, target, menu);
    itemPartager.setAttribute('tabindex', '0');
    itemPartager.focus();
    fireKeydown(window, itemPartager, 'ArrowRight');
    fireKeydown(window, window.document, 'Escape'); // ferme le sous-menu
    fireKeydown(window, window.document, 'Escape'); // ferme le menu racine

    expect(menu.classList.contains('show')).toBe(false);
  });

  it('un clic en dehors du menu le referme (.show retiree)', () => {
    const { window, document, target, menu } = ctx;
    openMenu(window, target, menu);
    expect(menu.classList.contains('show')).toBe(true);

    fireClick(window, document.body);

    expect(menu.classList.contains('show')).toBe(false);
  });
});
