// Tests -- initUserMenu (#744, vague 5/N infra tests vanilla)
//
// Composant standalone M3 : construit tout son sous-arbre en DOM depuis
// des data-attributes (#758 -- jamais d'innerHTML avec donnee consumer,
// safeUrl() neutralise les schemas hostiles). Expose directement via
// window.__initUserMenu (shared/components.js:5369), signature
// initUserMenu(rootOrSelector, options) -- sans argument, matche
// '.user-menu[data-display-name]' (shared/components.js:5168). Markup
// repris de pages/navigation.html#header-user-zone (attrs reels).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const BODY_HTML = `
  <div class="user-menu"
    id="demo-user-menu"
    data-display-name="Mike"
    data-email="mike@msyx.fr"
    data-authentik-user-url="https://auth.msyx.fr/if/user/"
    data-logout-url="/auth/logout"></div>
`;

function setup() {
  const dom = loadComponentsWindow(BODY_HTML);
  const { window } = dom;
  const { document } = window;
  window.__initUserMenu();
  const root = document.getElementById('demo-user-menu');
  const trigger = root.querySelector('.user-menu-trigger');
  const dropdown = root.querySelector('.user-menu-dropdown');
  const items = Array.from(dropdown.querySelectorAll('[role="menuitem"]'));
  return { window, document, root, trigger, dropdown, items };
}

describe('initUserMenu', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("construit le trigger et le dropdown fermes : aria-expanded='false', pas de .open", () => {
    const { trigger, dropdown } = ctx;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(dropdown.classList.contains('open')).toBe(false);
  });

  it("expose un aria-label sur le trigger portant le nom affiche", () => {
    const { trigger } = ctx;
    expect(trigger.getAttribute('aria-label')).toBe('Menu utilisateur — Mike');
  });

  it("construit les 2 entrees attendues, dans l'ordre : Mon compte puis Deconnexion", () => {
    const { items } = ctx;
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Mon compte');
    expect(items[1].textContent).toContain('Déconnexion');
    // safeUrl() doit avoir preserve l'URL Authentik fournie (#758).
    expect(items[0].getAttribute('href')).toBe('https://auth.msyx.fr/if/user/');
  });

  it("le clic sur le declencheur ouvre le dropdown : .open presente + aria-expanded='true'", () => {
    const { window, trigger, dropdown } = ctx;
    fireClick(window, trigger);
    expect(dropdown.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('un 2e clic sur le declencheur referme le dropdown (toggle)', () => {
    const { window, trigger, dropdown } = ctx;
    fireClick(window, trigger);
    fireClick(window, trigger);
    expect(dropdown.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it("un clic en dehors du menu le referme", () => {
    const { window, document, trigger, dropdown } = ctx;
    fireClick(window, trigger);
    expect(dropdown.classList.contains('open')).toBe(true);

    fireClick(window, document.body);

    expect(dropdown.classList.contains('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('Echap (sur un item du dropdown) referme et restaure le focus sur le declencheur', () => {
    const { window, document, trigger, dropdown, items } = ctx;
    fireClick(window, trigger);
    items[0].focus();

    fireKeydown(window, items[0], 'Escape');

    expect(dropdown.classList.contains('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("ArrowDown sur le declencheur (menu ferme) l'ouvre et focus le 1er item", () => {
    const { window, document, trigger, dropdown, items } = ctx;
    expect(dropdown.classList.contains('open')).toBe(false);

    fireKeydown(window, trigger, 'ArrowDown');

    expect(dropdown.classList.contains('open')).toBe(true);
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowDown/ArrowUp navigue entre les items du dropdown ouvert (wrap)', () => {
    const { window, document, trigger, items } = ctx;
    fireClick(window, trigger);
    items[0].focus();

    fireKeydown(window, items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);

    fireKeydown(window, items[1], 'ArrowDown'); // wrap vers le 1er
    expect(document.activeElement).toBe(items[0]);

    fireKeydown(window, items[0], 'ArrowUp'); // wrap vers le dernier
    expect(document.activeElement).toBe(items[1]);
  });

  it('Home/End sautent au 1er / dernier item du dropdown ouvert', () => {
    const { window, items } = ctx;
    items[1].focus();

    fireKeydown(window, items[1], 'Home');
    expect(items[1].ownerDocument.activeElement).toBe(items[0]);

    fireKeydown(window, items[0], 'End');
    expect(items[0].ownerDocument.activeElement).toBe(items[1]);
  });

  it('reste idempotent : un second appel de __initUserMenu() ne reconstruit pas le sous-arbre (dataset.bound)', () => {
    const { window, document, root, trigger, dropdown } = ctx;
    window.__initUserMenu(); // 2e appel (simule une re-init SPA)

    // Si non-idempotent, root.innerHTML = '' aurait tout reconstruit :
    // les references trigger/dropdown captees avant seraient devenues des
    // noeuds detaches, plus dans le DOM courant.
    expect(root.querySelector('.user-menu-trigger')).toBe(trigger);
    expect(root.querySelector('.user-menu-dropdown')).toBe(dropdown);

    fireClick(window, trigger);
    expect(dropdown.classList.contains('open')).toBe(true);
  });
});
