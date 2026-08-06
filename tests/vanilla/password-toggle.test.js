// Tests -- initPasswordToggle (#744, vague 8/N infra tests vanilla)
//
// Expose directement via window.__initPasswordToggle (shared/components.js:4902).
// Markup repris de pages/formulaires.html#password-toggle (classes/attrs reels) :
// wrapper .password-field > input[type=password][data-password-field] +
// bouton .password-toggle[data-password-toggle] resolu soit par aria-controls
// (prioritaire), soit par fallback closest('.password-field') input.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function fieldHtml(id, extra = '') {
  return `
    <div class="password-field">
      <input class="input" id="${id}" type="password" value="Sup3rSecret!" data-password-field ${extra}>
      <button type="button" class="password-toggle" data-password-toggle aria-pressed="false" aria-label="Afficher le mot de passe" aria-controls="${id}">
        <svg class="icon password-toggle-on" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-eye"/></svg>
        <svg class="icon password-toggle-off" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-eye-off"/></svg>
      </button>
    </div>
  `;
}

function setup(html = fieldHtml('pwd-1')) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initPasswordToggle();
  const input = document.getElementById('pwd-1');
  const btn = document.querySelector('.password-toggle');
  return { window, document, input, btn };
}

describe('initPasswordToggle -- bascule via aria-controls', () => {
  it("un clic revele le mot de passe : type=text, aria-pressed=true, aria-label 'Masquer'", () => {
    const { window, input, btn } = setup();
    fireClick(window, btn);
    expect(input.type).toBe('text');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('Masquer le mot de passe');
  });

  it("un second clic re-masque : type=password, aria-pressed=false, aria-label 'Afficher'", () => {
    const { window, input, btn } = setup();
    fireClick(window, btn);
    fireClick(window, btn);
    expect(input.type).toBe('password');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBe('Afficher le mot de passe');
  });

  it('la valeur du champ est preservee par la bascule', () => {
    const { window, input, btn } = setup();
    fireClick(window, btn);
    expect(input.value).toBe('Sup3rSecret!');
  });
});

describe('initPasswordToggle -- resolution de la cible', () => {
  it("aria-controls invalide (id inexistant) retombe sur l'input du .password-field parent", () => {
    const html = `
      <div class="password-field">
        <input class="input" id="pwd-2" type="password" value="x" data-password-field>
        <button type="button" class="password-toggle" data-password-toggle aria-pressed="false" aria-label="Afficher le mot de passe" aria-controls="does-not-exist">
        </button>
      </div>
    `;
    const dom = loadComponentsWindow(html);
    const { window } = dom;
    const { document } = window;
    window.__initPasswordToggle();
    const input = document.getElementById('pwd-2');
    const btn = document.querySelector('.password-toggle');
    fireClick(window, btn);
    expect(input.type).toBe('text');
  });

  it("sans aria-controls, resout via closest('.password-field') input", () => {
    const html = `
      <div class="password-field">
        <input class="input" id="pwd-3" type="password" value="x" data-password-field>
        <button type="button" class="password-toggle" data-password-toggle aria-pressed="false" aria-label="Afficher le mot de passe">
        </button>
      </div>
    `;
    const dom = loadComponentsWindow(html);
    const { window } = dom;
    const { document } = window;
    window.__initPasswordToggle();
    const input = document.getElementById('pwd-3');
    const btn = document.querySelector('.password-toggle');
    fireClick(window, btn);
    expect(input.type).toBe('text');
  });

  it("un bouton sans aria-controls ni wrapper .password-field ne fait rien (pas de crash)", () => {
    const html = `<button type="button" class="password-toggle" data-password-toggle aria-pressed="false" aria-label="Afficher le mot de passe"></button>`;
    const dom = loadComponentsWindow(html);
    const { window } = dom;
    const { document } = window;
    expect(() => window.__initPasswordToggle()).not.toThrow();
    const btn = document.querySelector('.password-toggle');
    expect(() => fireClick(window, btn)).not.toThrow();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('initPasswordToggle -- isolation multi-champs', () => {
  it('deux champs sur la meme page basculent independamment', () => {
    const dom = loadComponentsWindow(`
      ${fieldHtml('pwd-a')}
      ${fieldHtml('pwd-b')}
    `);
    const { window } = dom;
    const { document } = window;
    window.__initPasswordToggle();
    const inputA = document.getElementById('pwd-a');
    const inputB = document.getElementById('pwd-b');
    const btnA = document.querySelectorAll('.password-toggle')[0];
    fireClick(window, btnA);
    expect(inputA.type).toBe('text');
    expect(inputB.type).toBe('password');
  });
});

describe('initPasswordToggle -- divers', () => {
  it("reappeler initPasswordToggle() est idempotent (dataset.bound, un seul toggle par clic)", () => {
    const { window, input, btn } = setup();
    window.__initPasswordToggle(); // 2e appel -- doit no-op
    fireClick(window, btn);
    // Si le listener etait double-attache, un seul clic ferait 2 bascules
    // (texte -> password -> texte), ce qui laisserait type=password.
    expect(input.type).toBe('text');
  });
});
