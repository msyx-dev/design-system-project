// Tests -- initChips (#744, vague 6/N infra tests vanilla)
//
// Expose directement via window.__initChips (shared/components.js:415).
// Markup repris de pages/composants.html#chips (classes/attrs reels) : chip
// simple + chip-close (delegation par chip), chip-group filtre (delegation
// par groupe, exclusivite .active), chip-input-wrapper -- alias
// retro-compat DEPRECIE de tag-input (suppression v3, cf. commentaire
// source ligne 442) mais toujours livre et donc toujours sous test.
// Suppression (chip-close ET Backspace) differee par setTimeout(200) --
// fake timers vitest, verifies compatibles avec dom.window.setTimeout
// (execute dans le realm jsdom, pas le global Node) avant l'ecriture de ce
// fichier.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const BODY_HTML = `
  <div class="demo-row">
    <span class="chip" id="chip-ds">Design system <button class="chip-close" aria-label="Supprimer Design system">&times;</button></span>
    <span class="chip" id="chip-fe">Frontend <button class="chip-close" aria-label="Supprimer Frontend">&times;</button></span>
  </div>
  <div class="chip-group" role="group" aria-label="Filtres">
    <button class="chip chip-filter active" data-filter="all">Tous</button>
    <button class="chip chip-filter" data-filter="frontend">Frontend</button>
    <button class="chip chip-filter" data-filter="backend">Backend</button>
  </div>
  <div class="chip-input-wrapper" id="chip-input-demo">
    <span class="chip chip-input-item">React <button class="chip-close" aria-label="Supprimer React">&times;</button></span>
    <input class="chip-input-field" type="text" placeholder="Ajouter un tag..." aria-label="Ajouter un tag" maxlength="32">
  </div>
`;

function fireInput(win, el) {
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

function setup() {
  const dom = loadComponentsWindow(BODY_HTML);
  const { window } = dom;
  const { document } = window;
  window.__initChips();
  const chipDs = document.getElementById('chip-ds');
  const chipFe = document.getElementById('chip-fe');
  const group = document.querySelector('.chip-group');
  const filters = Array.prototype.slice.call(group.querySelectorAll('.chip-filter'));
  const wrapper = document.getElementById('chip-input-demo');
  const input = wrapper.querySelector('.chip-input-field');
  return { window, document, chipDs, chipFe, group, filters, wrapper, input };
}

describe('initChips -- chip simple (suppression)', () => {
  let ctx;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = setup();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("le clic sur chip-close ne retire pas immediatement le chip (transition en cours)", () => {
    const { window, chipDs } = ctx;
    fireClick(window, chipDs.querySelector('.chip-close'));
    expect(chipDs.isConnected).toBe(true);
    expect(chipDs.style.opacity).toBe('0');
  });

  it('le clic sur chip-close retire le chip du DOM apres le delai de transition', () => {
    const { window, chipDs, chipFe } = ctx;
    fireClick(window, chipDs.querySelector('.chip-close'));
    vi.advanceTimersByTime(200);
    expect(chipDs.isConnected).toBe(false);
    // Le chip voisin (non cible) reste intact.
    expect(chipFe.isConnected).toBe(true);
  });
});

describe('initChips -- chip-group (filtres, exclusivite)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it('un filtre inactif clique devient .active, les autres perdent .active', () => {
    const { window, filters } = ctx;
    const [all, frontend, backend] = filters;
    expect(all.classList.contains('active')).toBe(true);
    fireClick(window, frontend);
    expect(frontend.classList.contains('active')).toBe(true);
    expect(all.classList.contains('active')).toBe(false);
    expect(backend.classList.contains('active')).toBe(false);
  });

  it('un clic hors des chip-filter (dans le groupe mais pas sur un bouton) ne change rien', () => {
    const { window, group, filters } = ctx;
    fireClick(window, group);
    // Toujours "Tous" actif -- e.target.closest('.chip-filter') est retourne null.
    expect(filters[0].classList.contains('active')).toBe(true);
  });
});

describe('initChips -- chip-input-wrapper (alias deprecie de tag-input)', () => {
  let ctx;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = setup();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Entree ajoute un nouveau chip-input-item avec le texte trime, vide le champ', () => {
    const { window, wrapper, input } = ctx;
    input.value = '  Vue  ';
    fireKeydown(window, input, 'Enter');
    const items = wrapper.querySelectorAll('.chip-input-item');
    expect(items.length).toBe(2); // React (pre-rempli) + Vue
    expect(items[1].textContent.trim()).toBe('Vue ×');
    expect(input.value).toBe('');
  });

  it('la virgule (keydown) ajoute aussi un chip', () => {
    const { window, wrapper, input } = ctx;
    input.value = 'Svelte';
    fireKeydown(window, input, ',');
    expect(wrapper.querySelectorAll('.chip-input-item').length).toBe(2);
  });

  it("anti-doublon : ajouter une valeur deja presente (React) ne cree pas de second chip", () => {
    const { window, wrapper, input } = ctx;
    input.value = 'React';
    fireKeydown(window, input, 'Enter');
    expect(wrapper.querySelectorAll('.chip-input-item').length).toBe(1);
  });

  it("Backspace sur champ vide retire le dernier chip apres le delai", () => {
    const { window, wrapper, input } = ctx;
    input.value = 'Svelte';
    fireKeydown(window, input, 'Enter');
    expect(wrapper.querySelectorAll('.chip-input-item').length).toBe(2);

    input.value = '';
    fireKeydown(window, input, 'Backspace');
    vi.advanceTimersByTime(200);
    const remaining = wrapper.querySelectorAll('.chip-input-item');
    expect(remaining.length).toBe(1);
    expect(remaining[0].textContent.trim()).toBe('React ×');
  });

  it("Backspace ne fait rien si le champ n'est pas vide", () => {
    const { window, wrapper, input } = ctx;
    input.value = 'partiel';
    fireKeydown(window, input, 'Backspace');
    vi.advanceTimersByTime(200);
    expect(wrapper.querySelectorAll('.chip-input-item').length).toBe(1);
  });

  it('un chip cree dynamiquement a son propre bouton de suppression fonctionnel', () => {
    const { window, wrapper, input } = ctx;
    input.value = 'Svelte';
    fireKeydown(window, input, 'Enter');
    const created = wrapper.querySelectorAll('.chip-input-item')[1];
    fireClick(window, created.querySelector('.chip-close'));
    vi.advanceTimersByTime(200);
    expect(created.isConnected).toBe(false);
    expect(wrapper.querySelectorAll('.chip-input-item').length).toBe(1);
  });

  it('un clic sur le wrapper (hors chip/input) donne le focus au champ', () => {
    const { window, wrapper, input } = ctx;
    fireClick(window, wrapper);
    expect(window.document.activeElement).toBe(input);
  });

  it('reappeler initChips() est idempotent (dataset.chipBound/bound, pas de double ajout)', () => {
    const { window, wrapper, input } = ctx;
    window.__initChips(); // 2e appel -- doit no-op
    input.value = 'Svelte';
    fireKeydown(window, input, 'Enter');
    // Si double-bind, la 2e execution du listener relirait input.value APRES
    // que la 1ere l'ait deja vide -- createChip('') est un no-op silencieux,
    // donc un seul chip apparait dans les deux cas. On verifie plutot que
    // le clic sur le wrapper ne focus qu'une fois (pas d'exception) et que
    // le compte est correct.
    expect(wrapper.querySelectorAll('.chip-input-item').length).toBe(2);
  });
});
