// Tests -- initTagInputs (#744, vague 6/N infra tests vanilla)
//
// Expose directement via window.__initTagInputs (shared/components.js:2046).
// Markup repris de pages/formulaires.html#tag-input (classes/attrs reels) :
// vide, pre-rempli, avec limite (data-max), limite atteinte. Composant
// "canonique" dont initChips#chip-input-wrapper n'est que l'alias deprecie
// (cf. chips.test.js) -- meme delai de suppression differee (150ms ici,
// 200ms pour les chips -- valeurs distinctes verifiees dans le code source,
// pas une coincidence a harmoniser dans ce ticket).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function fireInput(win, el) {
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

function prefilledHtml() {
  return `
    <label class="tag-input-label" for="tag-prefilled">Equipe</label>
    <div class="tag-input-wrap" id="tag-prefilled">
      <span class="tag-item">Design <button class="tag-close" aria-label="Supprimer Design">&times;</button></span>
      <span class="tag-item">Frontend <button class="tag-close" aria-label="Supprimer Frontend">&times;</button></span>
      <span class="tag-item">Backend <button class="tag-close" aria-label="Supprimer Backend">&times;</button></span>
      <input class="tag-input-field" type="text" placeholder="Ajouter un tag..." aria-label="Ajouter un tag" maxlength="32">
    </div>
  `;
}

function maxHtml() {
  return `
    <label class="tag-input-label" for="tag-max">Competences</label>
    <div class="tag-input-wrap" id="tag-max" data-max="3">
      <span class="tag-item">React <button class="tag-close" aria-label="Supprimer React">&times;</button></span>
      <span class="tag-item">TypeScript <button class="tag-close" aria-label="Supprimer TypeScript">&times;</button></span>
      <input class="tag-input-field" type="text" placeholder="Ajouter un tag..." aria-label="Ajouter un tag" maxlength="32">
      <span class="tag-input-limit">2/3</span>
    </div>
  `;
}

function setupPrefilled() {
  const dom = loadComponentsWindow(prefilledHtml());
  const { window } = dom;
  const { document } = window;
  window.__initTagInputs();
  const wrap = document.getElementById('tag-prefilled');
  const input = wrap.querySelector('.tag-input-field');
  return { window, document, wrap, input };
}

function setupMax() {
  const dom = loadComponentsWindow(maxHtml());
  const { window } = dom;
  const { document } = window;
  window.__initTagInputs();
  const wrap = document.getElementById('tag-max');
  const input = wrap.querySelector('.tag-input-field');
  const counter = wrap.querySelector('.tag-input-limit');
  return { window, document, wrap, input, counter };
}

describe('initTagInputs -- ajout', () => {
  let ctx;

  beforeEach(() => {
    ctx = setupPrefilled();
  });

  it('Entree ajoute un nouveau tag-item trime, vide le champ, emet tag:add', () => {
    const { window, wrap, input } = ctx;
    let detail = null;
    wrap.addEventListener('tag:add', e => { detail = e.detail; });

    input.value = '  DevOps  ';
    fireKeydown(window, input, 'Enter');

    const tags = wrap.querySelectorAll('.tag-item');
    expect(tags.length).toBe(4);
    expect(tags[3].childNodes[0].textContent.trim()).toBe('DevOps');
    expect(input.value).toBe('');
    expect(detail).not.toBeNull();
    expect(detail.value).toBe('DevOps');
    expect(detail.tags).toEqual(['Design', 'Frontend', 'Backend', 'DevOps']);
  });

  it('la virgule (keydown) ajoute aussi un tag', () => {
    const { window, wrap, input } = ctx;
    input.value = 'QA';
    fireKeydown(window, input, ',');
    expect(wrap.querySelectorAll('.tag-item').length).toBe(4);
  });

  it("la virgule tapee via l'evenement input (mobile/composition) ajoute un tag", () => {
    const { window, wrap, input } = ctx;
    input.value = 'Mobile,';
    fireInput(window, input);
    const tags = wrap.querySelectorAll('.tag-item');
    expect(tags.length).toBe(4);
    expect(tags[3].childNodes[0].textContent.trim()).toBe('Mobile');
    expect(input.value).toBe('');
  });

  it("anti-doublon : ajouter une valeur deja presente (Frontend) ne cree pas de second tag ni d'evenement", () => {
    const { window, wrap, input } = ctx;
    let addCount = 0;
    wrap.addEventListener('tag:add', () => { addCount++; });

    input.value = 'Frontend';
    fireKeydown(window, input, 'Enter');

    expect(wrap.querySelectorAll('.tag-item').length).toBe(3);
    expect(addCount).toBe(0);
  });

  it('une valeur vide ou seulement des espaces ne cree pas de tag', () => {
    const { window, wrap, input } = ctx;
    input.value = '   ';
    fireKeydown(window, input, 'Enter');
    expect(wrap.querySelectorAll('.tag-item').length).toBe(3);
  });
});

describe('initTagInputs -- suppression', () => {
  let ctx;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = setupPrefilled();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Backspace sur champ vide marque le DERNIER tag en suppression (pas de retrait immediat)", () => {
    const { window, wrap, input } = ctx;
    const tags = wrap.querySelectorAll('.tag-item');
    const last = tags[tags.length - 1];
    input.value = '';
    fireKeydown(window, input, 'Backspace');
    expect(last.classList.contains('tag-item--removing')).toBe(true);
    expect(last.isConnected).toBe(true);
  });

  it('Backspace sur champ vide retire le dernier tag apres le delai, emet tag:remove', () => {
    const { window, wrap, input } = ctx;
    let detail = null;
    wrap.addEventListener('tag:remove', e => { detail = e.detail; });

    input.value = '';
    fireKeydown(window, input, 'Backspace');
    vi.advanceTimersByTime(150);

    const tags = wrap.querySelectorAll('.tag-item');
    expect(tags.length).toBe(2);
    expect(Array.from(tags).map(t => t.childNodes[0].textContent.trim())).toEqual(['Design', 'Frontend']);
    expect(detail).not.toBeNull();
    expect(detail.value).toBe('Backend');
    expect(detail.tags).toEqual(['Design', 'Frontend']);
  });

  it("Backspace ne supprime rien si le champ n'est pas vide", () => {
    const { window, wrap, input } = ctx;
    input.value = 'en cours de saisie';
    fireKeydown(window, input, 'Backspace');
    vi.advanceTimersByTime(150);
    expect(wrap.querySelectorAll('.tag-item').length).toBe(3);
  });

  it('le bouton tag-close supprime le tag CIBLE (pas forcement le dernier)', () => {
    const { window, wrap } = ctx;
    const tags = wrap.querySelectorAll('.tag-item');
    const middle = tags[1]; // Frontend
    fireClick(window, middle.querySelector('.tag-close'));
    vi.advanceTimersByTime(150);
    const remaining = wrap.querySelectorAll('.tag-item');
    expect(remaining.length).toBe(2);
    expect(Array.from(remaining).map(t => t.childNodes[0].textContent.trim())).toEqual(['Design', 'Backend']);
  });
});

describe('initTagInputs -- limite (data-max)', () => {
  let ctx;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = setupMax();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('le compteur reflete count/max des le chargement', () => {
    const { counter } = ctx;
    expect(counter.textContent).toBe('2/3');
  });

  it('atteindre la limite desactive le champ, change le placeholder, met a jour le compteur', () => {
    const { window, wrap, input, counter } = ctx;
    input.value = 'Design';
    fireKeydown(window, input, 'Enter');

    expect(wrap.querySelectorAll('.tag-item').length).toBe(3);
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toBe('Limite atteinte');
    expect(counter.textContent).toBe('3/3');
  });

  it("une fois la limite atteinte, Enter sur le champ (desactive) n'ajoute rien de plus", () => {
    const { window, wrap, input } = ctx;
    input.value = 'Design';
    fireKeydown(window, input, 'Enter'); // atteint la limite (3/3)

    input.value = 'Encore';
    fireKeydown(window, input, 'Enter');
    expect(wrap.querySelectorAll('.tag-item').length).toBe(3);
  });

  it('supprimer un tag sous la limite reactive le champ et restaure le placeholder', () => {
    const { window, wrap, input, counter } = ctx;
    const first = wrap.querySelectorAll('.tag-item')[0];
    fireClick(window, first.querySelector('.tag-close'));
    vi.advanceTimersByTime(150);

    expect(input.disabled).toBe(false);
    expect(input.placeholder).toBe('Ajouter un tag...');
    expect(counter.textContent).toBe('1/3');
  });
});

describe('initTagInputs -- divers', () => {
  it('un clic sur le wrap (hors tag/tag-close) donne le focus au champ', () => {
    const { window, wrap, input } = setupPrefilled();
    fireClick(window, wrap);
    expect(window.document.activeElement).toBe(input);
  });

  it('un clic sur un tag-item existant ne focus PAS le champ (garde e.target)', () => {
    const { window, wrap, input } = setupPrefilled();
    const tag = wrap.querySelectorAll('.tag-item')[0];
    fireClick(window, tag);
    expect(window.document.activeElement).not.toBe(input);
  });

  it('reappeler initTagInputs() est idempotent (dataset.bound, un seul tag:add par Entree)', () => {
    const { window, wrap, input } = setupPrefilled();
    window.__initTagInputs(); // 2e appel -- doit no-op
    let addCount = 0;
    wrap.addEventListener('tag:add', () => { addCount++; });
    input.value = 'DevOps';
    fireKeydown(window, input, 'Enter');
    expect(addCount).toBe(1);
    expect(wrap.querySelectorAll('.tag-item').length).toBe(4);
  });
});
