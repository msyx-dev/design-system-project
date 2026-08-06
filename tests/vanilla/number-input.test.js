// Tests -- initNumberInputs (#744, vague 6/N infra tests vanilla)
//
// Expose directement via window.__initNumberInputs (shared/components.js:1722).
// Markup repris de pages/formulaires.html#number-input (classes/attrs reels).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function fireChange(win, el) {
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

function wrapHtml({ min = 1, max = 99, step = 1, value = 1 } = {}) {
  return `
    <div class="number-input-wrap" data-min="${min}" data-max="${max}" data-step="${step}">
      <button class="number-input-btn" data-action="dec" aria-label="Diminuer">&#8722;</button>
      <input class="number-input-field" type="number" value="${value}" min="${min}" max="${max}" aria-label="Quantite">
      <button class="number-input-btn" data-action="inc" aria-label="Augmenter">&#43;</button>
    </div>
  `;
}

function setup(opts) {
  const dom = loadComponentsWindow(wrapHtml(opts));
  const { window } = dom;
  const { document } = window;
  window.__initNumberInputs();
  const wrap = document.querySelector('.number-input-wrap');
  const field = wrap.querySelector('.number-input-field');
  const btnDec = wrap.querySelector('[data-action="dec"]');
  const btnInc = wrap.querySelector('[data-action="inc"]');
  return { window, document, wrap, field, btnDec, btnInc };
}

describe('initNumberInputs -- incrementation/decrementation', () => {
  it('le clic sur inc augmente la valeur du step et emet numberinput:change', () => {
    const { window, wrap, field, btnInc } = setup({ min: 1, max: 99, step: 1, value: 1 });
    let detail = null;
    wrap.addEventListener('numberinput:change', e => { detail = e.detail; });
    fireClick(window, btnInc);
    expect(field.value).toBe('2');
    expect(detail).toEqual({ value: 2 });
  });

  it('le clic sur dec diminue la valeur du step', () => {
    const { window, wrap, field, btnDec } = setup({ min: 1, max: 99, step: 1, value: 5 });
    fireClick(window, btnDec);
    expect(field.value).toBe('4');
  });

  it('respecte un step arbitraire (ex. 5)', () => {
    const { window, field, btnInc } = setup({ min: -20, max: 120, step: 5, value: 20 });
    fireClick(window, btnInc);
    expect(field.value).toBe('25');
  });

  it('ArrowUp/ArrowDown sur le champ incrementent/decrementent comme les boutons', () => {
    const { window, field } = setup({ min: 0, max: 10, step: 1, value: 3 });
    fireKeydown(window, field, 'ArrowUp');
    expect(field.value).toBe('4');
    fireKeydown(window, field, 'ArrowDown');
    fireKeydown(window, field, 'ArrowDown');
    expect(field.value).toBe('2');
  });
});

describe('initNumberInputs -- bornes min/max et etat des boutons', () => {
  it('a la valeur min au chargement, le bouton dec est disabled ; inc ne l\'est pas', () => {
    const { btnDec, btnInc } = setup({ min: 1, max: 99, step: 1, value: 1 });
    expect(btnDec.disabled).toBe(true);
    expect(btnInc.disabled).toBe(false);
  });

  it('a la valeur max au chargement, le bouton inc est disabled', () => {
    const { btnDec, btnInc } = setup({ min: 0, max: 13, step: 1, value: 13 });
    expect(btnInc.disabled).toBe(true);
    expect(btnDec.disabled).toBe(false);
  });

  it('atteindre max via clics successifs desactive inc et clampe la valeur (ne depasse jamais max)', () => {
    const { window, field, btnInc } = setup({ min: 0, max: 3, step: 1, value: 2 });
    fireClick(window, btnInc); // -> 3 (max)
    expect(field.value).toBe('3');
    expect(btnInc.disabled).toBe(true);
  });

  it('une valeur saisie manuellement au-dessus de max est clampee au blur (evenement change)', () => {
    const { window, field, btnInc } = setup({ min: 1, max: 99, step: 1, value: 1 });
    field.value = '500';
    fireChange(window, field);
    expect(field.value).toBe('99');
    expect(btnInc.disabled).toBe(true);
  });

  it('une valeur saisie manuellement en-dessous de min est clampee au blur', () => {
    const { window, field, btnDec } = setup({ min: 1, max: 99, step: 1, value: 50 });
    field.value = '-50';
    fireChange(window, field);
    expect(field.value).toBe('1');
    expect(btnDec.disabled).toBe(true);
  });

  it('une saisie invalide (non numerique) retombe a 0 puis est clampee au min si min > 0', () => {
    const { window, field } = setup({ min: 1, max: 99, step: 1, value: 50 });
    field.value = 'abc';
    fireChange(window, field);
    // parseFloat('abc') || 0 -> 0, clampe a min (1).
    expect(field.value).toBe('1');
  });
});

describe('initNumberInputs -- idempotence', () => {
  it('reappeler initNumberInputs() est idempotent (dataset.bound, numberinput:change emis 1 seule fois)', () => {
    const { window, wrap, field, btnInc } = setup({ min: 0, max: 10, step: 1, value: 5 });
    window.__initNumberInputs(); // 2e appel -- doit no-op
    let count = 0;
    wrap.addEventListener('numberinput:change', () => { count++; });
    fireClick(window, btnInc);
    expect(count).toBe(1);
    expect(field.value).toBe('6');
  });
});
