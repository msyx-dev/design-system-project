// Tests -- initCommandPalette (#744, vague 3/N infra tests vanilla)
//
// Composant choisi car second point d'arret de la vague 2 : navigation
// clavier, filtrage, selection, Echap. initCommandPalette() n'est PAS
// expose directement dans reinitAll() -- il est appele depuis initComponents()
// (le meme chemin que initModals) -- on passe donc aussi par
// window.__initComponents(). Le composant s'auto-injecte entierement dans
// <body> (overlay #cmd-overlay), aucun markup prealable requis hormis les
// cibles des actions testees (#sidebar pour "Toggle sidebar").
//
// NAV_SECTIONS n'existe QUE dans le <head> inline de chaque page HTML (jamais
// dans shared/components.js lui-meme) -- absent ici (typeof guard), l'index
// des pages reste donc vide et seules les 3 ACTIONS statiques (Tout charger,
// Toggle sidebar, Toggle dark/light) alimentent les resultats. Comportement
// volontairement exploite : donne un jeu de resultats stable et deterministe
// pour tester filtrage/navigation/activation sans dependre d'un manifeste.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const BODY_HTML = `<div id="sidebar"></div>`;

function setup() {
  const dom = loadComponentsWindow(BODY_HTML);
  const { window } = dom;
  const { document } = window;
  window.__initComponents();
  const overlay = document.getElementById('cmd-overlay');
  const input = overlay.querySelector('.cmd-input');
  const results = overlay.querySelector('.cmd-results');
  return { window, document, overlay, input, results };
}

function openViaShortcut(window) {
  fireKeydown(window, window.document, 'k', { ctrlKey: true });
}

function items(results) {
  return Array.from(results.querySelectorAll('.cmd-item[data-idx]'));
}

describe('initCommandPalette', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("Ctrl+K ouvre l'overlay (.open) et focus l'input", () => {
    const { window, document, overlay, input } = ctx;
    expect(overlay.classList.contains('open')).toBe(false);
    openViaShortcut(window);
    expect(overlay.classList.contains('open')).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("Ctrl+K referme l'overlay quand il est deja ouvert (toggle)", () => {
    const { window, overlay } = ctx;
    openViaShortcut(window);
    expect(overlay.classList.contains('open')).toBe(true);
    openViaShortcut(window);
    expect(overlay.classList.contains('open')).toBe(false);
  });

  it("a l'ouverture, affiche les 3 actions statiques regroupees sous 'Actions'", () => {
    const { window, results } = ctx;
    openViaShortcut(window);
    const its = items(results);
    expect(its.length).toBe(3);
    expect(results.querySelector('.cmd-group-title').textContent).toBe('Actions');
  });

  it('filtre les resultats en tapant dans l input (2 items sur 3 matchent "toggle")', () => {
    const { window, input, results } = ctx;
    openViaShortcut(window);

    input.value = 'toggle';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    const its = items(results);
    expect(its.length).toBe(2);
    const labels = its.map((el) => el.querySelector('.cmd-item-text').textContent);
    expect(labels).toEqual(['Toggle sidebar', 'Toggle dark/light']);
  });

  it("affiche l'etat vide (.cmd-empty) quand aucun resultat ne matche", () => {
    const { window, input, results } = ctx;
    openViaShortcut(window);

    input.value = 'zzzzzznomatch';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(results.querySelector('.cmd-empty')).not.toBeNull();
    expect(items(results).length).toBe(0);
  });

  it('selectionne le 1er resultat par defaut (.active + aria-selected=true), les autres a false', () => {
    const { window, results } = ctx;
    openViaShortcut(window);
    const its = items(results);
    expect(its[0].classList.contains('active')).toBe(true);
    expect(its[0].getAttribute('aria-selected')).toBe('true');
    expect(its[1].classList.contains('active')).toBe(false);
    expect(its[1].getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowDown deplace la selection active vers l item suivant (classe .active, pas seulement aria)', () => {
    const { window, input, results } = ctx;
    openViaShortcut(window);
    const its = items(results);

    fireKeydown(window, input, 'ArrowDown');

    expect(its[0].classList.contains('active')).toBe(false);
    expect(its[1].classList.contains('active')).toBe(true);
    expect(its[1].getAttribute('aria-selected')).toBe('true');
  });

  it("ArrowDown au dernier item ne deborde pas (reste clampe sur le dernier)", () => {
    const { window, input, results } = ctx;
    openViaShortcut(window);
    const its = items(results);

    fireKeydown(window, input, 'ArrowDown');
    fireKeydown(window, input, 'ArrowDown');
    fireKeydown(window, input, 'ArrowDown'); // au-dela du dernier (idx 2)

    expect(its[its.length - 1].classList.contains('active')).toBe(true);
  });

  it('ArrowUp ramene la selection vers le premier item (clampe a 0, pas de underflow)', () => {
    const { window, input, results } = ctx;
    openViaShortcut(window);
    const its = items(results);
    fireKeydown(window, input, 'ArrowDown');

    fireKeydown(window, input, 'ArrowUp');
    fireKeydown(window, input, 'ArrowUp'); // au-dela du premier

    expect(its[0].classList.contains('active')).toBe(true);
  });

  it("Enter active l'item selectionne : ferme l'overlay ET execute l'action (toggle-sidebar bascule .open sur #sidebar)", () => {
    const { window, document, input, overlay } = ctx;
    const sidebar = document.getElementById('sidebar');
    openViaShortcut(window);
    fireKeydown(window, input, 'ArrowDown'); // selectionne "Toggle sidebar" (idx 1)
    expect(sidebar.classList.contains('open')).toBe(false);

    fireKeydown(window, input, 'Enter');

    expect(overlay.classList.contains('open')).toBe(false); // overlay ferme
    expect(sidebar.classList.contains('open')).toBe(true); // action reellement executee
  });

  it('Echap referme la palette', () => {
    const { window, input, overlay } = ctx;
    openViaShortcut(window);
    expect(overlay.classList.contains('open')).toBe(true);

    fireKeydown(window, input, 'Escape');

    expect(overlay.classList.contains('open')).toBe(false);
  });

  it("un clic sur le fond de l'overlay (hors .cmd-palette) referme", () => {
    const { window, overlay } = ctx;
    openViaShortcut(window);
    expect(overlay.classList.contains('open')).toBe(true);

    fireClick(window, overlay);

    expect(overlay.classList.contains('open')).toBe(false);
  });

  it("un clic a l'interieur de .cmd-palette ne referme pas", () => {
    const { window, overlay } = ctx;
    openViaShortcut(window);
    const palette = overlay.querySelector('.cmd-palette');

    fireClick(window, palette);

    expect(overlay.classList.contains('open')).toBe(true);
  });

  it("aria-expanded sur .cmd-palette suit l'etat reel (false au repos, true ouvert, false apres fermeture)", () => {
    const { window, overlay } = ctx;
    const palette = overlay.querySelector('.cmd-palette');
    expect(palette.getAttribute('aria-expanded')).toBe('false');

    openViaShortcut(window);
    expect(palette.getAttribute('aria-expanded')).toBe('true');

    openViaShortcut(window); // toggle -> ferme
    expect(palette.getAttribute('aria-expanded')).toBe('false');
  });

  it('reste un singleton : un 2e __initComponents() ne cree pas un second overlay et le toggle marche toujours', () => {
    const { window, document, overlay } = ctx;
    window.__initComponents(); // 2e appel (simule une re-init SPA)

    expect(document.querySelectorAll('#cmd-overlay').length).toBe(1);

    openViaShortcut(window);
    expect(overlay.classList.contains('open')).toBe(true);
    openViaShortcut(window);
    expect(overlay.classList.contains('open')).toBe(false);
  });
});
