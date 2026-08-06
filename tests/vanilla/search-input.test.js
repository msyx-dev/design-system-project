// Tests -- initSearchInputs (#744, vague 6/N infra tests vanilla)
//
// Expose directement via window.__initSearchInputs (shared/components.js:504).
// Markup repris de pages/formulaires.html#search-input (classes/attrs reels) :
// variante simple (bouton clear) + variante search-with-suggestions
// (data-suggestions, liste role=listbox). highlightMatch() (composants.js:96)
// a ete durcie contre une XSS en #746 -- construit des noeuds DOM
// (createTextNode/createElement), jamais d'innerHTML : un des tests ci-dessous
// prouve par mutation que si highlightMatch() etait un jour remplacee par une
// affectation innerHTML, la suite le detecterait (element injecte reellement
// cree dans le DOM, pas seulement du texte affiche).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function fireInput(win, el) {
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

function fireFocus(win, el) {
  el.dispatchEvent(new win.FocusEvent('focus', { bubbles: false }));
}

function fireBlur(win, el) {
  el.dispatchEvent(new win.FocusEvent('blur', { bubbles: false }));
}

function fireMousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

function simpleHtml() {
  return `
    <div class="search-input-wrap" role="search">
      <input class="search-input" type="search" placeholder="Rechercher..." aria-label="Rechercher">
      <button class="search-clear hidden" aria-label="Effacer la recherche" tabindex="-1">x</button>
    </div>
  `;
}

function suggestionsHtml(suggestions) {
  return `
    <div class="search-input-wrap search-with-suggestions" data-suggestions="${suggestions}" role="combobox" aria-haspopup="listbox" aria-expanded="false">
      <input class="search-input" type="search" placeholder="Chercher..." aria-label="Chercher un composant" aria-autocomplete="list" aria-controls="suggestions-1">
      <button class="search-clear hidden" aria-label="Effacer la recherche" tabindex="-1">x</button>
      <ul id="suggestions-1" class="search-suggestions hidden" role="listbox" aria-label="Suggestions"></ul>
    </div>
  `;
}

function setupSimple() {
  const dom = loadComponentsWindow(simpleHtml());
  const { window } = dom;
  const { document } = window;
  window.__initSearchInputs();
  const wrap = document.querySelector('.search-input-wrap');
  const input = wrap.querySelector('.search-input');
  const clearBtn = wrap.querySelector('.search-clear');
  return { window, document, wrap, input, clearBtn };
}

function setupSuggestions(suggestions = 'Button,Card,Badge,Chip') {
  const dom = loadComponentsWindow(suggestionsHtml(suggestions));
  const { window } = dom;
  const { document } = window;
  window.__initSearchInputs();
  const wrap = document.querySelector('.search-input-wrap');
  const input = wrap.querySelector('.search-input');
  const clearBtn = wrap.querySelector('.search-clear');
  const list = wrap.querySelector('.search-suggestions');
  return { window, document, wrap, input, clearBtn, list };
}

describe('initSearchInputs -- champ simple (bouton clear)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setupSimple();
  });

  it('taper du texte fait apparaitre le bouton clear (.hidden retire)', () => {
    const { window, input, clearBtn } = ctx;
    expect(clearBtn.classList.contains('hidden')).toBe(true);
    input.value = 'a';
    fireInput(window, input);
    expect(clearBtn.classList.contains('hidden')).toBe(false);
  });

  it('vider le champ recache le bouton clear', () => {
    const { window, input, clearBtn } = ctx;
    input.value = 'a';
    fireInput(window, input);
    input.value = '';
    fireInput(window, input);
    expect(clearBtn.classList.contains('hidden')).toBe(true);
  });

  it('le clic sur clear vide le champ, cache le bouton, redonne le focus', () => {
    const { window, input, clearBtn } = ctx;
    input.value = 'recherche';
    fireInput(window, input);
    fireClick(window, clearBtn);
    expect(input.value).toBe('');
    expect(clearBtn.classList.contains('hidden')).toBe(true);
    expect(window.document.activeElement).toBe(input);
  });
});

describe('initSearchInputs -- suggestions (filtrage)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setupSuggestions();
  });

  it('taper une correspondance ouvre la liste avec les items filtres (insensible a la casse)', () => {
    const { window, input, list, wrap } = ctx;
    input.value = 'ba';
    fireInput(window, input);
    expect(list.classList.contains('hidden')).toBe(false);
    expect(wrap.getAttribute('aria-expanded')).toBe('true');
    const items = list.querySelectorAll('.search-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Badge');
  });

  it('aucune correspondance affiche le message "Aucun resultat"', () => {
    const { window, input, list } = ctx;
    input.value = 'zzz';
    fireInput(window, input);
    const noResult = list.querySelector('.search-no-result');
    expect(noResult).not.toBeNull();
    expect(noResult.textContent).toBe('Aucun résultat pour "zzz"');
    expect(list.querySelectorAll('.search-item').length).toBe(0);
  });

  it('vider le champ referme les suggestions', () => {
    const { window, input, list, wrap } = ctx;
    input.value = 'ba';
    fireInput(window, input);
    input.value = '';
    fireInput(window, input);
    expect(list.classList.contains('hidden')).toBe(true);
    expect(wrap.getAttribute('aria-expanded')).toBe('false');
  });

  it('le surlignage entoure la sous-chaine correspondante dans une balise <mark>', () => {
    const { window, input, list } = ctx;
    input.value = 'ad';
    fireInput(window, input);
    const item = list.querySelector('.search-item');
    const mark = item.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark.textContent).toBe('ad');
    expect(item.textContent).toBe('Badge');
  });

  it("une requete contenant des caracteres de balisage est rendue comme TEXTE, jamais interpretee", () => {
    const { window, input, list } = ctx;
    // La liste de suggestions elle-meme porte un item "hostile" -- simule une
    // donnee consumer arbitraire dans data-suggestions (#746 : jamais de
    // confiance dans le texte affiche).
    const hostileCtx = setupSuggestions('Button,<img src=x onerror=alert(1)>,Card');
    hostileCtx.input.value = 'img';
    fireInput(hostileCtx.window, hostileCtx.input);
    const item = hostileCtx.list.querySelector('.search-item');
    expect(item).not.toBeNull();
    // Aucun element <img> reellement injecte dans le DOM.
    expect(item.querySelector('img')).toBeNull();
    // Le texte brut, avec ses chevrons, est present tel quel en tant que texte.
    expect(item.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('mousedown sur un item selectionne, remplit le champ, referme, refocus (preventDefault du mousedown evite le blur)', () => {
    const { window, input, list, wrap } = ctx;
    // Le champ est deja focus avant la saisie -- reproduit l'usage reel
    // (l'utilisateur clique/tape dans le champ AVANT que les suggestions
    // n'apparaissent). Sans ce focus prealable, l'appel input.focus() en
    // fin de handler mousedown constituerait un VRAI changement de focus et
    // re-declencherait le listener 'focus' (qui rouvre les suggestions),
    // ce qui ne reflete pas l'usage reel (focus() sur un element deja
    // focus est un no-op cote evenements, HTML Standard, focusing steps).
    input.focus();
    input.value = 'ba';
    fireInput(window, input);
    const item = list.querySelector('.search-item');
    fireMousedown(window, item);
    expect(input.value).toBe('Badge');
    expect(list.classList.contains('hidden')).toBe(true);
    expect(wrap.getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowDown/ArrowUp deplacent .active + aria-selected avec clamp aux bornes', () => {
    const { window, input, list } = ctx;
    input.value = 'a'; // matche Card, Badge, Chip (en ignorant la casse)
    fireInput(window, input);
    const items = list.querySelectorAll('.search-item');
    expect(items.length).toBeGreaterThan(1);

    fireKeydown(window, input, 'ArrowDown');
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[0].getAttribute('aria-selected')).toBe('true');

    fireKeydown(window, input, 'ArrowUp');
    expect(items[0].classList.contains('active')).toBe(false);
    // Clamp a -1 : ArrowUp au-dela du debut ne fait rien de plus (aucune item active).
    Array.from(items).forEach(it => expect(it.classList.contains('active')).toBe(false));
  });

  it("Enter sur l'item actif le selectionne et remplit le champ", () => {
    const { window, input, list } = ctx;
    input.value = 'a';
    fireInput(window, input);
    fireKeydown(window, input, 'ArrowDown');
    const activeText = list.querySelector('.search-item.active').textContent;
    fireKeydown(window, input, 'Enter');
    expect(input.value).toBe(activeText);
    expect(list.classList.contains('hidden')).toBe(true);
  });

  it('Escape referme les suggestions et retire le focus du champ', () => {
    const { window, input, list } = ctx;
    input.value = 'ba';
    fireInput(window, input);
    fireKeydown(window, input, 'Escape');
    expect(list.classList.contains('hidden')).toBe(true);
  });

  it('le focus avec une valeur existante rouvre les suggestions filtrees', () => {
    const { window, input, list } = ctx;
    input.value = 'ba';
    fireFocus(window, input);
    expect(list.classList.contains('hidden')).toBe(false);
    expect(list.querySelectorAll('.search-item').length).toBe(1);
  });
});

describe('initSearchInputs -- blur differe (fake timers)', () => {
  let ctx;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = setupSuggestions();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('le blur referme les suggestions apres un delai de 150ms (pas immediatement)', () => {
    const { window, input, list } = ctx;
    input.value = 'ba';
    fireInput(window, input);
    expect(list.classList.contains('hidden')).toBe(false);

    fireBlur(window, input);
    expect(list.classList.contains('hidden')).toBe(false); // pas encore
    vi.advanceTimersByTime(150);
    expect(list.classList.contains('hidden')).toBe(true);
  });
});

describe('initSearchInputs -- idempotence', () => {
  it('reappeler initSearchInputs() est idempotent (dataset.bound, pas de double toggle)', () => {
    const { window, input, clearBtn } = setupSimple();
    window.__initSearchInputs(); // 2e appel -- doit no-op
    input.value = 'a';
    fireInput(window, input);
    expect(clearBtn.classList.contains('hidden')).toBe(false);
    expect(clearBtn.classList.length).toBe(1); // "hidden" seule classe, jamais retire 2x sans erreur
  });
});
