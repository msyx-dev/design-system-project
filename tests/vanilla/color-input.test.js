// Tests -- initColorInput (#744, vague 8/N infra tests vanilla)
//
// Expose directement via window.__initColorInput (shared/components.js:4929).
// Markup repris de pages/formulaires.html#color-picker (classes/attrs reels) :
// wrapper .color-input[data-color-input] > input[type=color] + label
// .color-input-value (hex courant) + presets optionnels .color-swatch[data-color].
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function basicHtml() {
  return `
    <div class="color-input" data-color-input>
      <input type="color" id="color-basic" value="#3b82f6">
      <span class="color-input-value">#3B82F6</span>
    </div>
  `;
}

function presetsHtml() {
  return `
    <div class="color-input" data-color-input>
      <input type="color" id="color-presets" value="#22c55e">
      <span class="color-input-value">#22C55E</span>
      <div class="flex gap-xs mt-sm">
        <button type="button" class="color-swatch" data-color="#22c55e" aria-pressed="true" aria-label="Vert" style="background:#22c55e;"></button>
        <button type="button" class="color-swatch" data-color="#3b82f6" aria-pressed="false" aria-label="Bleu" style="background:#3b82f6;"></button>
        <button type="button" class="color-swatch" data-color="#f59e0b" aria-pressed="false" aria-label="Orange" style="background:#f59e0b;"></button>
      </div>
    </div>
  `;
}

function disabledHtml() {
  return `
    <div class="color-input color-input--disabled" data-color-input>
      <input type="color" id="color-disabled" value="#8b5cf6" disabled>
      <span class="color-input-value">#8B5CF6</span>
    </div>
  `;
}

function setupBasic() {
  const dom = loadComponentsWindow(basicHtml());
  const { window } = dom;
  const { document } = window;
  window.__initColorInput();
  const input = document.getElementById('color-basic');
  const label = document.querySelector('.color-input-value');
  return { window, document, input, label };
}

function setupPresets() {
  const dom = loadComponentsWindow(presetsHtml());
  const { window } = dom;
  const { document } = window;
  window.__initColorInput();
  const input = document.getElementById('color-presets');
  const label = document.querySelector('.color-input-value');
  const swatches = Array.from(document.querySelectorAll('.color-swatch'));
  return { window, document, input, label, swatches };
}

describe('initColorInput -- synchronisation de base', () => {
  it("le label affiche le hex courant en MAJUSCULES des l'init", () => {
    const { label } = setupBasic();
    expect(label.textContent).toBe('#3B82F6');
  });

  it("l'evenement 'input' sur le picker met a jour le label", () => {
    const { window, input, label } = setupBasic();
    input.value = '#f59e0b';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(label.textContent).toBe('#F59E0B');
  });

  it("l'evenement 'change' sur le picker met aussi a jour le label", () => {
    const { window, input, label } = setupBasic();
    input.value = '#ef4444';
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(label.textContent).toBe('#EF4444');
  });
});

describe('initColorInput -- presets', () => {
  it("au chargement, seul le swatch correspondant a la valeur courante a aria-pressed=true", () => {
    const { swatches } = setupPresets();
    const pressed = swatches.filter((s) => s.getAttribute('aria-pressed') === 'true');
    expect(pressed.length).toBe(1);
    expect(pressed[0].dataset.color).toBe('#22c55e');
  });

  it('cliquer un preset met a jour input.value, le label et aria-pressed (un seul actif)', () => {
    const { window, input, label, swatches } = setupPresets();
    const blue = swatches.find((s) => s.dataset.color === '#3b82f6');
    fireClick(window, blue);

    expect(input.value).toBe('#3b82f6');
    expect(label.textContent).toBe('#3B82F6');
    expect(blue.getAttribute('aria-pressed')).toBe('true');
    const others = swatches.filter((s) => s !== blue);
    others.forEach((s) => expect(s.getAttribute('aria-pressed')).toBe('false'));
  });

  it("cliquer un preset emet un evenement 'input' natif sur le picker (bubbles)", () => {
    const { window, input, swatches } = setupPresets();
    let fired = false;
    input.addEventListener('input', () => { fired = true; });
    const orange = swatches.find((s) => s.dataset.color === '#f59e0b');
    fireClick(window, orange);
    expect(fired).toBe(true);
  });
});

describe('initColorInput -- desactive', () => {
  it("le wrapper desactive affiche quand meme le hex courant a l'init (aucun crash)", () => {
    const dom = loadComponentsWindow(disabledHtml());
    const { window } = dom;
    const { document } = window;
    expect(() => window.__initColorInput()).not.toThrow();
    const label = document.querySelector('.color-input-value');
    expect(label.textContent).toBe('#8B5CF6');
  });
});

describe('initColorInput -- divers', () => {
  it("reappeler initColorInput() est idempotent (dataset.bound, un seul 'input' par clic de preset)", () => {
    const { window, input, swatches } = setupPresets();
    window.__initColorInput(); // 2e appel -- doit no-op
    let count = 0;
    input.addEventListener('input', () => { count++; });
    const blue = swatches.find((s) => s.dataset.color === '#3b82f6');
    fireClick(window, blue);
    expect(count).toBe(1);
  });
});
