// Tests -- initSplitButton (#744, vague 12/N couverture tests vanilla)
//
// Expose via window.__initSplitButton (shared/components.js:4389). Markup
// repris de pages/composants.html#split-button (classes/attrs reels) :
// .split-button > .btn-primary (action principale, non geree par ce JS) +
// .split-button__caret[aria-haspopup=menu][aria-expanded] + .split-button__
// menu.menu[role=menu] > .menu-item[role=menuitem].
//
// pages/composants.html annonce "Navigation clavier complete (fleches,
// Home/End, Echap)" pour ce composant -- verifie ici (roving focus dans le
// menu, pas de listener keydown sur les .menu-item individuels : la
// resolution se fait via document.activeElement, cf. shared/components.js
// :4441-4476).
//
// Reference DS du focus-restore (#744) : fermer le menu (item/Echap) doit
// TOUJOURS redonner le focus au caret -- c'est le contrat que ce composant
// est cense tenir de bout en bout (closeMenu(true)).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function splitButtonHtml(id, { disabled = false } = {}) {
  return `
    <div class="split-button" id="${id}">
      <button class="btn-primary" type="button">Enregistrer</button>
      <button class="btn-primary split-button__caret" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Plus d'actions"${disabled ? ' disabled' : ''}>
        <svg class="icon" aria-hidden="true"></svg>
      </button>
      <div class="menu split-button__menu" role="menu">
        <button class="menu-item" role="menuitem" type="button">Enregistrer et fermer</button>
        <button class="menu-item" role="menuitem" type="button">Enregistrer comme brouillon</button>
        <div class="menu-divider" role="separator"></div>
        <button class="menu-item menu-item--danger" role="menuitem" type="button">Annuler les modifications</button>
      </div>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initSplitButton();
  return { window, document };
}

function parts(document, id) {
  const root = document.getElementById(id);
  return {
    root,
    primary: root.querySelector('.btn-primary:not(.split-button__caret)'),
    caret: root.querySelector('.split-button__caret'),
    menu: root.querySelector('.split-button__menu'),
    items: Array.from(root.querySelectorAll('.menu-item[role="menuitem"]')),
  };
}

describe('initSplitButton -- ouverture/fermeture au clic', () => {
  it('cliquer le caret ouvre le menu, aria-expanded=true, focus le 1er item', () => {
    const { window, document } = setup(splitButtonHtml('sa'));
    const { caret, menu, items } = parts(document, 'sa');

    fireClick(window, caret);

    expect(menu.classList.contains('open')).toBe(true);
    expect(caret.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(items[0]);
  });

  it('un 2e clic sur le caret referme le menu (toggle), sans forcer le focus', () => {
    const { window, document } = setup(splitButtonHtml('sb'));
    const { caret, menu } = parts(document, 'sb');

    fireClick(window, caret);
    expect(menu.classList.contains('open')).toBe(true);
    fireClick(window, caret);
    expect(menu.classList.contains('open')).toBe(false);
    expect(caret.getAttribute('aria-expanded')).toBe('false');
  });

  it("cliquer un item ferme le menu ET restaure le focus sur le caret (reference DS du focus-restore)", () => {
    const { window, document } = setup(splitButtonHtml('sc'));
    const { caret, menu, items } = parts(document, 'sc');

    fireClick(window, caret);
    fireClick(window, items[1]);

    expect(menu.classList.contains('open')).toBe(false);
    expect(caret.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(caret);
  });

  it("le bouton d'action principale n'a aucun listener attache par ce composant (aucun effet sur le menu)", () => {
    const { window, document } = setup(splitButtonHtml('sd'));
    const { primary, menu } = parts(document, 'sd');
    fireClick(window, primary);
    expect(menu.classList.contains('open')).toBe(false);
  });
});

describe('initSplitButton -- navigation clavier dans le menu (fleches, Home/End)', () => {
  it('ArrowDown/ArrowUp deplacent le focus en boucle (roving) parmi les items', () => {
    const { window, document } = setup(splitButtonHtml('se'));
    const { caret, menu, items } = parts(document, 'se');
    fireClick(window, caret);
    expect(document.activeElement).toBe(items[0]);

    fireKeydown(window, menu, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);

    fireKeydown(window, menu, 'ArrowDown');
    expect(document.activeElement).toBe(items[2]);

    // Boucle : ArrowDown sur le dernier item revient au 1er.
    fireKeydown(window, menu, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);

    // Boucle inverse : ArrowUp sur le 1er item va au dernier.
    fireKeydown(window, menu, 'ArrowUp');
    expect(document.activeElement).toBe(items[2]);
  });

  it('Home/End sautent au 1er/dernier item', () => {
    const { window, document } = setup(splitButtonHtml('sf'));
    const { caret, menu, items } = parts(document, 'sf');
    fireClick(window, caret);

    fireKeydown(window, menu, 'End');
    expect(document.activeElement).toBe(items[2]);

    fireKeydown(window, menu, 'Home');
    expect(document.activeElement).toBe(items[0]);
  });

  it('Entree/Espace sur un item focus declenchent son clic (donc closeMenu + focus-restore caret)', () => {
    const { window, document } = setup(splitButtonHtml('sg'));
    const { caret, menu, items } = parts(document, 'sg');
    fireClick(window, caret);
    fireKeydown(window, menu, 'ArrowDown'); // items[1] focus

    fireKeydown(window, menu, 'Enter');

    expect(menu.classList.contains('open')).toBe(false);
    expect(document.activeElement).toBe(caret);
  });
});

describe('initSplitButton -- Echap', () => {
  it('Echap dans le menu ouvert referme ET restaure le focus sur le caret', () => {
    const { window, document } = setup(splitButtonHtml('sh'));
    const { caret, menu, items } = parts(document, 'sh');
    fireClick(window, caret);
    expect(document.activeElement).toBe(items[0]);

    fireKeydown(window, menu, 'Escape');

    expect(menu.classList.contains('open')).toBe(false);
    expect(caret.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(caret);
  });

  it('ArrowDown sur le caret (menu ferme) ouvre le menu', () => {
    const { window, document } = setup(splitButtonHtml('si'));
    const { caret, menu, items } = parts(document, 'si');
    caret.focus();

    fireKeydown(window, caret, 'ArrowDown');

    expect(menu.classList.contains('open')).toBe(true);
    expect(document.activeElement).toBe(items[0]);
  });
});

describe('initSplitButton -- un seul menu ouvert a la fois', () => {
  it("ouvrir un 2e split-button referme le 1er (classe .open + aria-expanded)", () => {
    const dom = loadComponentsWindow(splitButtonHtml('sj-a') + splitButtonHtml('sj-b'));
    const { window } = dom;
    const { document } = window;
    window.__initSplitButton();

    const a = parts(document, 'sj-a');
    const b = parts(document, 'sj-b');

    fireClick(window, a.caret);
    expect(a.menu.classList.contains('open')).toBe(true);

    fireClick(window, b.caret);
    expect(b.menu.classList.contains('open')).toBe(true);
    expect(a.menu.classList.contains('open')).toBe(false);
    expect(a.caret.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('initSplitButton -- isolation et idempotence', () => {
  it('deux split-buttons sur la meme page sont independants (ouvrir le 1er ne touche pas le 2e)', () => {
    const dom = loadComponentsWindow(splitButtonHtml('sk-a') + splitButtonHtml('sk-b'));
    const { window } = dom;
    const { document } = window;
    window.__initSplitButton();

    const a = parts(document, 'sk-a');
    const b = parts(document, 'sk-b');

    fireClick(window, a.caret);

    expect(a.menu.classList.contains('open')).toBe(true);
    expect(b.menu.classList.contains('open')).toBe(false);
  });

  it("reappeler initSplitButton() est idempotent (pas de double-bind du caret)", () => {
    const { window, document } = setup(splitButtonHtml('sl'));
    window.__initSplitButton(); // 2e appel -- doit no-op (dataset.bound)
    const { caret, menu } = parts(document, 'sl');

    fireClick(window, caret);
    // Si le listener 'click' etait double-attache, le 2e passage repartirait
    // d'un etat deja ouvert et le menu finirait FERME (toggle x2) au lieu
    // d'ouvert.
    expect(menu.classList.contains('open')).toBe(true);
  });
});
