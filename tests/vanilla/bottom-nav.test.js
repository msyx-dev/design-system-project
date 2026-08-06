// Tests -- initBottomNav (#744, vague 7/N couverture tests vanilla)
//
// Expose individuellement : window.__initBottomNav(). Markup repris de
// pages/navigation.html#bottom-nav (classes/attrs reels -- boutons, pas de
// liens : la demo est SPA, pas de navigation reelle de page).
//
// Defaut trouve en chemin (corrige dans cette PR, cf. CHANGELOG.md) :
// l'item marque .active au chargement n'avait JAMAIS aria-selected="true"
// tant qu'aucun clic n'avait eu lieu -- incoherence entre l'etat visuel
// (classe .active) et l'etat annonce (aria-selected absent). Le meme motif
// existe deja pour Tabs (shared/components.js, bloc initComponents() :
// `t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false');`
// pose a l'init, pas seulement au clic) -- applique ici a l'identique.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function navHtml() {
  return `
    <nav class="bottom-nav bottom-nav--demo" aria-label="Navigation principale">
      <button class="bottom-nav-item active" data-label="Accueil">
        <span class="bottom-nav-label">Accueil</span>
      </button>
      <button class="bottom-nav-item" data-label="Recherche">
        <span class="bottom-nav-label">Recherche</span>
      </button>
      <button class="bottom-nav-item" data-label="Favoris">
        <span class="bottom-nav-label">Favoris</span>
      </button>
    </nav>
  `;
}

function setup() {
  const dom = loadComponentsWindow(navHtml());
  const { window } = dom;
  const { document } = window;
  window.__initBottomNav();
  const nav = document.querySelector('.bottom-nav');
  const items = Array.from(nav.querySelectorAll('.bottom-nav-item'));
  return { window, document, nav, items };
}

describe('initBottomNav', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("des l'init, aria-selected reflete la classe .active (pas seulement apres un clic -- defaut corrige)", () => {
    const { items } = ctx;
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[0].getAttribute('aria-selected')).toBe('true');
    expect(items[1].getAttribute('aria-selected')).toBe('false');
    expect(items[2].getAttribute('aria-selected')).toBe('false');
  });

  it('le clic sur un item active CET item et desactive les autres (classe + ARIA)', () => {
    const { window, items } = ctx;
    fireClick(window, items[1]);
    expect(items[1].classList.contains('active')).toBe(true);
    expect(items[1].getAttribute('aria-selected')).toBe('true');
    expect(items[0].classList.contains('active')).toBe(false);
    expect(items[0].getAttribute('aria-selected')).toBe('false');
    expect(items[2].getAttribute('aria-selected')).toBe('false');
  });

  it('un seul item est actif a la fois, meme apres plusieurs clics successifs', () => {
    const { window, items } = ctx;
    fireClick(window, items[1]);
    fireClick(window, items[2]);
    const activeItems = items.filter((i) => i.classList.contains('active'));
    expect(activeItems).toHaveLength(1);
    expect(activeItems[0]).toBe(items[2]);
  });

  it("le clic emet bottomnav:change avec le label de l'item clique, en bubbles", () => {
    const { window, nav, items } = ctx;
    const seen = [];
    nav.addEventListener('bottomnav:change', (e) => seen.push(e.detail.label));
    fireClick(window, items[1]);
    expect(seen).toEqual(['Recherche']);
  });

  it("reste idempotent : un second appel de __initBottomNav() ne double-bind pas (1 seul evenement par clic)", () => {
    const { window, nav, items } = ctx;
    window.__initBottomNav(); // 2e appel
    let count = 0;
    nav.addEventListener('bottomnav:change', () => { count += 1; });
    fireClick(window, items[1]);
    expect(count).toBe(1);
  });
});
