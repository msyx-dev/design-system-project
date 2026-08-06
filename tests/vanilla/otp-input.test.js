// Tests -- initOTPInputs (#744, vague 4/N infra tests vanilla)
//
// Note de nommage : le composant s'appelle initOTPInputs() (pluriel) dans
// shared/components.js, expose window.__initOTPInputs -- le catalogue en
// tete du fichier source l'appelle "OTP inputs" / selecteur .otp-group.
// Markup repris de pages/formulaires.html#otp-input (classes/attrs reels).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireKeydown, firePaste } from './helpers/load-components.js';

function otpHtml(length = 4) {
  const digits = Array.from({ length }, (_, i) =>
    `<input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" aria-label="Chiffre ${i + 1}">`
  ).join('');
  return `<div class="otp-group" data-length="${length}" aria-label="Code a ${length} chiffres">${digits}</div>`;
}

function fireInput(win, el) {
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

function setup(length = 4) {
  const dom = loadComponentsWindow(otpHtml(length));
  const { window } = dom;
  const { document } = window;
  window.__initOTPInputs();
  const group = document.querySelector('.otp-group');
  const digits = Array.from(group.querySelectorAll('.otp-digit'));
  return { window, document, group, digits };
}

describe('initOTPInputs', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup(4);
  });

  it("marque .filled sur les cases pre-remplies a l'init", () => {
    const dom = loadComponentsWindow(`
      <div class="otp-group" data-length="2" aria-label="Code">
        <input class="otp-digit" type="text" maxlength="1" value="4" aria-label="Chiffre 1">
        <input class="otp-digit" type="text" maxlength="1" aria-label="Chiffre 2">
      </div>
    `);
    const { window } = dom;
    window.__initOTPInputs();
    const digits = Array.from(window.document.querySelectorAll('.otp-digit'));
    expect(digits[0].classList.contains('filled')).toBe(true);
    expect(digits[1].classList.contains('filled')).toBe(false);
  });

  it('saisir un chiffre ajoute .filled et avance le focus sur la case suivante', () => {
    const { window, document, digits } = ctx;
    digits[0].value = '7';
    fireInput(window, digits[0]);
    expect(digits[0].classList.contains('filled')).toBe(true);
    expect(document.activeElement).toBe(digits[1]);
  });

  it('la derniere case ne tente pas d avancer (pas de case suivante, pas de crash)', () => {
    const { window, document, digits } = ctx;
    digits[3].focus();
    digits[3].value = '9';
    expect(() => fireInput(window, digits[3])).not.toThrow();
    expect(digits[3].classList.contains('filled')).toBe(true);
    expect(document.activeElement).toBe(digits[3]);
  });

  it('un caractere non-numerique est filtre : la case reste vide et .filled est retire', () => {
    const { window, digits } = ctx;
    digits[0].classList.add('filled'); // simulate previously filled
    digits[0].value = 'a';
    fireInput(window, digits[0]);
    expect(digits[0].value).toBe('');
    expect(digits[0].classList.contains('filled')).toBe(false);
  });

  it('si plusieurs caracteres se retrouvent dans la case, seul le DERNIER est garde', () => {
    const { window, digits } = ctx;
    digits[0].value = '42';
    fireInput(window, digits[0]);
    expect(digits[0].value).toBe('2');
    expect(digits[0].classList.contains('filled')).toBe(true);
  });

  it('emet otp:change avec la valeur jointe de toutes les cases a chaque saisie', () => {
    const { window, group, digits } = ctx;
    const values = [];
    group.addEventListener('otp:change', (e) => values.push(e.detail.value));
    digits[0].value = '1';
    fireInput(window, digits[0]);
    digits[1].value = '2';
    fireInput(window, digits[1]);
    expect(values).toEqual(['1', '12']);
  });

  it('Backspace sur une case remplie efface SEULEMENT cette case (pas de recul)', () => {
    const { window, document, digits } = ctx;
    digits[1].value = '5';
    digits[1].classList.add('filled');
    digits[1].focus();
    fireKeydown(window, digits[1], 'Backspace');
    expect(digits[1].value).toBe('');
    expect(digits[1].classList.contains('filled')).toBe(false);
    expect(document.activeElement).toBe(digits[1]);
  });

  it('Backspace sur une case VIDE efface la case precedente et y ramene le focus', () => {
    const { window, document, digits } = ctx;
    digits[0].value = '3';
    digits[0].classList.add('filled');
    digits[1].focus(); // digits[1] est vide
    fireKeydown(window, digits[1], 'Backspace');
    expect(digits[0].value).toBe('');
    expect(digits[0].classList.contains('filled')).toBe(false);
    expect(document.activeElement).toBe(digits[0]);
  });

  it('ArrowLeft / ArrowRight deplacent le focus sans modifier la valeur des cases', () => {
    const { window, document, digits } = ctx;
    digits[1].focus();
    fireKeydown(window, digits[1], 'ArrowLeft');
    expect(document.activeElement).toBe(digits[0]);
    fireKeydown(window, digits[0], 'ArrowRight');
    expect(document.activeElement).toBe(digits[1]);
    digits.forEach((d) => expect(d.value).toBe(''));
  });

  it('coller un code multi-chiffres distribue chaque caractere sur les cases suivantes et focus la 1ere case vide restante', () => {
    const { window, document, digits } = ctx;
    digits[0].focus();
    firePaste(window, digits[0], '123');
    expect(digits[0].value).toBe('1');
    expect(digits[1].value).toBe('2');
    expect(digits[2].value).toBe('3');
    expect(digits[0].classList.contains('filled')).toBe(true);
    expect(digits[2].classList.contains('filled')).toBe(true);
    expect(digits[3].value).toBe('');
    expect(document.activeElement).toBe(digits[3]);
  });

  it('coller un code qui remplit EXACTEMENT toutes les cases restantes focus la derniere case remplie', () => {
    const { window, document, digits } = ctx;
    digits[0].focus();
    firePaste(window, digits[0], '9876');
    expect(digits.map((d) => d.value)).toEqual(['9', '8', '7', '6']);
    expect(document.activeElement).toBe(digits[3]);
  });

  it('coller filtre les caracteres non-numeriques avant distribution', () => {
    const { digits, window } = ctx;
    digits[0].focus();
    firePaste(window, digits[0], '4a2b');
    expect(digits[0].value).toBe('4');
    expect(digits[1].value).toBe('2');
    expect(digits[2].value).toBe('');
  });

  it('reappeler initOTPInputs() est idempotent (dataset.bound, pas de double avance de focus)', () => {
    const { window, document, digits } = ctx;
    window.__initOTPInputs(); // 2e appel -- doit no-op
    digits[0].value = '5';
    fireInput(window, digits[0]);
    // Si double-bind, le handler 'input' tournerait 2x : la 2e execution
    // relirait digits[0].value (deja '5' apres la 1ere passe) -- meme
    // resultat, donc on verifie plutot que le focus n'a avance que d'UNE
    // seule case (pas saute digits[1] pour atterrir sur digits[2]).
    expect(document.activeElement).toBe(digits[1]);
  });
});
