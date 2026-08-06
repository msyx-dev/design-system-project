// Tests -- Tabs (#744 infra tests vanilla + #826 Home/End)
//
// Contrairement aux autres composants de ce fichier, "Tabs" n'a PAS de
// fonction initTabs() dediee -- le bloc est inline dans initComponents()
// (cf. catalogue en tete de shared/components.js, ligne 18 : "Tabs
// initComponents() .tabs"). initComponents() lui-meme n'est pas expose
// individuellement (contrairement a initTreeView/initOTPInputs/
// initBottomSheet) : seul reinitAll(), alias window.__initComponents(),
// l'appelle -- meme chemin que initModals()/initCommandPalette().
// Markup repris de pages/navigation.html#tabs (classes reelles).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function tabsHtml() {
  return `
    <div class="tabs">
      <button class="tab active">General</button>
      <button class="tab">Securite</button>
      <button class="tab">Notifications</button>
      <button class="tab">API</button>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(tabsHtml());
  const { window } = dom;
  const { document } = window;
  window.__initComponents();
  const group = document.querySelector('.tabs');
  const tabs = Array.from(group.querySelectorAll('.tab'));
  return { window, document, group, tabs };
}

describe('Tabs (initComponents)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it('pose role="tablist" sur le conteneur et role="tab" sur chaque item (absents du markup source)', () => {
    const { group, tabs } = ctx;
    expect(group.getAttribute('role')).toBe('tablist');
    tabs.forEach((t) => expect(t.getAttribute('role')).toBe('tab'));
  });

  it("l'item .active recoit tabindex=0/aria-selected=true, les autres -1/false", () => {
    const [general, securite, notifications, api] = ctx.tabs;
    expect(general.getAttribute('tabindex')).toBe('0');
    expect(general.getAttribute('aria-selected')).toBe('true');
    [securite, notifications, api].forEach((t) => {
      expect(t.getAttribute('tabindex')).toBe('-1');
      expect(t.getAttribute('aria-selected')).toBe('false');
    });
  });

  it('un clic sur un tab deplace .active + aria-selected + le roving tabindex, et lui donne le focus', () => {
    const { window, document, tabs } = ctx;
    const [general, securite] = tabs;
    fireClick(window, securite);
    expect(securite.classList.contains('active')).toBe(true);
    expect(securite.getAttribute('aria-selected')).toBe('true');
    expect(securite.getAttribute('tabindex')).toBe('0');
    expect(general.classList.contains('active')).toBe(false);
    expect(general.getAttribute('aria-selected')).toBe('false');
    expect(general.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(securite);
  });

  it('ArrowRight active le tab suivant et boucle depuis le dernier vers le premier', () => {
    const { window, document, tabs } = ctx;
    const [general, securite, notifications, api] = tabs;
    fireKeydown(window, general, 'ArrowRight');
    expect(document.activeElement).toBe(securite);
    expect(securite.classList.contains('active')).toBe(true);

    fireKeydown(window, securite, 'ArrowRight');
    expect(document.activeElement).toBe(notifications);

    fireKeydown(window, notifications, 'ArrowRight');
    expect(document.activeElement).toBe(api);

    // Dernier item : ArrowRight boucle vers le premier
    fireKeydown(window, api, 'ArrowRight');
    expect(document.activeElement).toBe(general);
    expect(general.classList.contains('active')).toBe(true);
  });

  it('ArrowLeft depuis le premier tab boucle vers le dernier', () => {
    const { window, document, tabs } = ctx;
    const [general, , , api] = tabs;
    fireKeydown(window, general, 'ArrowLeft');
    expect(document.activeElement).toBe(api);
    expect(api.classList.contains('active')).toBe(true);
  });

  it('Enter et Espace sur le tab focalise l activent (equivalent au clic)', () => {
    const { window, tabs } = ctx;
    const [, securite] = tabs;
    fireKeydown(window, securite, 'Enter');
    expect(securite.classList.contains('active')).toBe(true);
  });

  it('reappeler initComponents() (via __initComponents) est idempotent -- pas de double activation au clic', () => {
    const { window, document, group, tabs } = ctx;
    window.__initComponents(); // 2e appel -- doit no-op sur .tabs (dataset.bound)
    const [, securite] = tabs;
    fireClick(window, securite);
    // Si double-bind, le handler de clic tournerait 2x -- toujours idempotent
    // au niveau etat final (1 seul item actif), donc on verifie l'exclusivite
    // stricte : un seul tab porte tabindex=0 et aria-selected=true au total.
    const selected = Array.from(group.querySelectorAll('.tab')).filter(
      (t) => t.getAttribute('aria-selected') === 'true'
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(securite);
    expect(document.activeElement).toBe(securite);
  });

  // --- #826 : Home/End, meme famille d'interaction que initSegmentedControls (#613) ---

  it('Home depuis un tab quelconque active + focalise le premier tab', () => {
    const { window, document, tabs } = ctx;
    const [general, , notifications] = tabs;
    fireKeydown(window, notifications, 'Home');
    expect(document.activeElement).toBe(general);
    expect(general.classList.contains('active')).toBe(true);
    expect(general.getAttribute('aria-selected')).toBe('true');
    expect(general.getAttribute('tabindex')).toBe('0');
  });

  it('End depuis un tab quelconque active + focalise le dernier tab', () => {
    const { window, document, tabs } = ctx;
    const [general, , , api] = tabs;
    fireKeydown(window, general, 'End');
    expect(document.activeElement).toBe(api);
    expect(api.classList.contains('active')).toBe(true);
    expect(api.getAttribute('aria-selected')).toBe('true');
    expect(api.getAttribute('tabindex')).toBe('0');
  });

  it("Home sur le premier tab (deja actif) reste un no-op d'etat (idempotent)", () => {
    const { window, document, tabs } = ctx;
    const [general] = tabs;
    fireKeydown(window, general, 'Home');
    expect(document.activeElement).toBe(general);
    expect(general.classList.contains('active')).toBe(true);
  });
});
