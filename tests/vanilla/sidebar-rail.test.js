// Tests -- initSidebarRail (#744, vague 14/N couverture tests vanilla)
//
// Expose directement via window.__initSidebarRail (shared/components.js).
// Markup repris de la demo reelle (pages/navigation.html#rail-demo-1) :
// .rail-demo > .rail-sidebar(.rail-toggle + .rail-nav > .rail-item*) +
// .rail-content. Seul comportement JS reel : le clic sur .rail-toggle
// bascule .rail-sidebar.collapsed + synchronise aria-expanded/aria-label
// sur le toggle. Verifie en lisant le code source : aucune persistance
// (pas de localStorage), aucune gestion JS de l'etat actif des .rail-item
// (onclick="return false;" statique dans la demo, aucun listener attache
// par initSidebarRail -- l'etat "active"/aria-current="page" est purement
// du markup HTML, non pilote par ce composant).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function railHtml() {
  return `
    <div class="rail-demo">
      <div class="rail-sidebar">
        <div class="rail-header">
          <button class="rail-toggle" aria-label="Réduire la sidebar" aria-expanded="true">T</button>
        </div>
        <nav class="rail-nav" aria-label="Navigation principale">
          <a class="rail-item active" href="#" aria-current="page">
            <span class="rail-item-icon">D</span>
            <span class="rail-item-label">Dashboard</span>
          </a>
          <a class="rail-item" href="#">
            <span class="rail-item-icon">A</span>
            <span class="rail-item-label">Analytics</span>
          </a>
        </nav>
      </div>
      <div class="rail-content">Contenu</div>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(railHtml());
  const { window } = dom;
  const { document } = window;
  return {
    window,
    document,
    demo: document.querySelector('.rail-demo'),
    sidebar: document.querySelector('.rail-sidebar'),
    toggle: document.querySelector('.rail-toggle'),
  };
}

describe('initSidebarRail -- repli/depli', () => {
  it('etat initial : pas de .collapsed, aria-expanded="true" (markup)', () => {
    const { sidebar, toggle } = setup();
    expect(sidebar.classList.contains('collapsed')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('un clic replie la sidebar : pose .collapsed, aria-expanded="false", aria-label adapte', () => {
    const { window, sidebar, toggle } = setup();
    window.__initSidebarRail();
    fireClick(window, toggle);
    expect(sidebar.classList.contains('collapsed')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Développer la sidebar');
  });

  it('un second clic redeplie : retire .collapsed, aria-expanded="true", aria-label restaure', () => {
    const { window, sidebar, toggle } = setup();
    window.__initSidebarRail();
    fireClick(window, toggle);
    fireClick(window, toggle);
    expect(sidebar.classList.contains('collapsed')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Réduire la sidebar');
  });

  it('ne plante pas si .rail-demo est absent du markup', () => {
    const { window } = (function () {
      const dom = loadComponentsWindow('<div></div>');
      return { window: dom.window };
    })();
    expect(() => window.__initSidebarRail()).not.toThrow();
  });

  it('ne plante pas si .rail-sidebar ou .rail-toggle manque a l\'interieur de .rail-demo', () => {
    const dom = loadComponentsWindow('<div class="rail-demo"></div>');
    expect(() => dom.window.__initSidebarRail()).not.toThrow();
  });
});

describe('initSidebarRail -- etat actif (statique, non pilote par le JS)', () => {
  it('l\'item actif porte .active + aria-current="page" avant ET apres init (aucun listener ne le modifie)', () => {
    const { window, document } = setup();
    window.__initSidebarRail();
    const active = document.querySelector('.rail-item.active');
    expect(active).not.toBeNull();
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.querySelector('.rail-item-label').textContent).toBe('Dashboard');
  });

  it('un clic sur un .rail-item non actif ne change pas la classe .active (aucun listener attache)', () => {
    const { window, document } = setup();
    window.__initSidebarRail();
    const items = document.querySelectorAll('.rail-item');
    fireClick(window, items[1]); // Analytics
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[1].classList.contains('active')).toBe(false);
  });
});

describe('initSidebarRail -- persistance', () => {
  it('AUCUNE ecriture localStorage au clic (comportement absent, verifie -- pas d\'invention)', () => {
    const { window, toggle } = setup();
    window.__initSidebarRail();
    const spy = [];
    const orig = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = (...args) => { spy.push(args); return orig(...args); };
    fireClick(window, toggle);
    expect(spy.length).toBe(0);
  });
});

describe('initSidebarRail -- idempotence', () => {
  it('un second appel initSidebarRail() ne double-bind pas le clic (dataset.bound)', () => {
    const { window, sidebar, toggle } = setup();
    window.__initSidebarRail();
    window.__initSidebarRail();
    fireClick(window, toggle);
    // Si double-bound, toggle('collapsed') basculerait 2x -> etat inchange.
    // Un seul bind => replie une fois.
    expect(sidebar.classList.contains('collapsed')).toBe(true);
  });

  it('isolation multi-demo : deux .rail-demo independants', () => {
    const dom = loadComponentsWindow(railHtml() + railHtml());
    const { window } = dom;
    const { document } = window;
    window.__initSidebarRail();
    const sidebars = document.querySelectorAll('.rail-sidebar');
    const toggles = document.querySelectorAll('.rail-toggle');
    fireClick(window, toggles[0]);
    expect(sidebars[0].classList.contains('collapsed')).toBe(true);
    expect(sidebars[1].classList.contains('collapsed')).toBe(false);
  });
});

// #906 -- .rail-section-title (titre de groupe) et .rail-sidebar--fixed +
// .rail-overlay (geometrie app-shell / hors-flux mobile) sont du markup/CSS
// pur : aucun comportement JS ne leur est attache (verifie en lisant le
// code source de initSidebarRail -- il ne cible que .rail-demo/.rail-sidebar/
// .rail-toggle). Ce que le JS DOIT garantir : leur presence ne casse pas le
// repli/depli existant.
describe('initSidebarRail -- coexistence avec .rail-section-title / .rail-sidebar--fixed / .rail-overlay (#906)', () => {
  function railHtmlWithSections() {
    return `
      <div class="rail-demo">
        <div class="rail-overlay"></div>
        <div class="rail-sidebar rail-sidebar--fixed">
          <div class="rail-header">
            <button class="rail-toggle" aria-label="Réduire la sidebar" aria-expanded="true">T</button>
          </div>
          <nav class="rail-nav" aria-label="Navigation principale">
            <div class="rail-section-title">Espace</div>
            <a class="rail-item active" href="#" aria-current="page">
              <span class="rail-item-label">Dashboard</span>
            </a>
            <div class="rail-section-title">Arborescence libre</div>
            <ul class="tree" role="tree"></ul>
          </nav>
        </div>
      </div>
    `;
  }

  it('le repli fonctionne toujours avec des .rail-section-title et du contenu libre dans .rail-nav', () => {
    const dom = loadComponentsWindow(railHtmlWithSections());
    const { window } = dom;
    const { document } = window;
    window.__initSidebarRail();
    const sidebar = document.querySelector('.rail-sidebar');
    const toggle = document.querySelector('.rail-toggle');
    fireClick(window, toggle);
    expect(sidebar.classList.contains('collapsed')).toBe(true);
    // Les titres de groupe restent du markup statique -- aucune classe/attribut ajoute dessus.
    document.querySelectorAll('.rail-section-title').forEach((el) => {
      expect(el.className).toBe('rail-section-title');
    });
  });

  it('.rail-overlay sibling n\'est jamais touche par initSidebarRail (pas de .active/.open poses par le JS)', () => {
    const dom = loadComponentsWindow(railHtmlWithSections());
    const { window } = dom;
    const { document } = window;
    window.__initSidebarRail();
    const toggle = document.querySelector('.rail-toggle');
    fireClick(window, toggle);
    const overlay = document.querySelector('.rail-overlay');
    expect(overlay.classList.contains('active')).toBe(false);
    expect(document.querySelector('.rail-sidebar').classList.contains('open')).toBe(false);
  });
});
