// Tests -- initTimePicker (#744, vague 2 infra tests vanilla)
//
// Meme PR/meme logique de roving tabindex que initSegmentedControls (#613) :
// le segment AM/PM du time-picker 12h n'a PAS de .segmented-indicator ->
// initSegmentedControls le saute (return anticipe, cf. commentaire
// components.js ~L5658) -- initTimePicker gere donc lui-meme tout l'ARIA du
// groupe AM/PM (role/aria-checked/tabindex), sans filet du composant
// segmented. Markup repris de pages/formulaires.html#time-picker.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireKeydown, fireClick } from './helpers/load-components.js';

function numberPart(part, value, min, max, step) {
  return `
    <div class="number-input-wrap" data-time-part="${part}">
      <button type="button" class="number-dec" aria-label="Diminuer">&#8722;</button>
      <input type="number" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${part}">
      <button type="button" class="number-inc" aria-label="Augmenter">+</button>
    </div>
  `;
}

function html12h() {
  return `
    <div class="time-input-wrap" data-time data-format="12" data-target="#time-out">
      ${numberPart('hh', 9, 1, 12, 1)}
      <span class="time-sep">:</span>
      ${numberPart('mm', 30, 0, 59, 5)}
      <div class="segmented" role="radiogroup" aria-label="AM ou PM">
        <button type="button" class="segmented-item active" data-ampm="AM">AM</button>
        <button type="button" class="segmented-item" data-ampm="PM">PM</button>
      </div>
    </div>
    <input id="time-out" type="text" readonly>
  `;
}

function html24h() {
  return `
    <div class="time-input-wrap" data-time data-format="24" data-target="#time-out-24">
      ${numberPart('hh', 23, 0, 23, 1)}
      <span class="time-sep">:</span>
      ${numberPart('mm', 59, 0, 59, 5)}
    </div>
    <input id="time-out-24" type="text" readonly>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initTimePicker();
  const wrap = document.querySelector('.time-input-wrap');
  const hh = wrap.querySelector('[data-time-part="hh"] input');
  const mm = wrap.querySelector('[data-time-part="mm"] input');
  const ampmBtns = Array.from(wrap.querySelectorAll('[data-ampm]'));
  return { window, document, wrap, hh, mm, ampmBtns };
}

describe('initTimePicker -- format 12h (AM/PM sans .segmented-indicator, #613)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup(html12h());
  });

  it("gere lui-meme l'ARIA du groupe AM/PM (role=radio, aria-checked, roving tabindex) -- initSegmentedControls le saute (pas de .segmented-indicator)", () => {
    const [am, pm] = ctx.ampmBtns;
    expect(am.getAttribute('role')).toBe('radio');
    expect(am.getAttribute('aria-checked')).toBe('true');
    expect(am.getAttribute('tabindex')).toBe('0');
    expect(pm.getAttribute('role')).toBe('radio');
    expect(pm.getAttribute('aria-checked')).toBe('false');
    expect(pm.getAttribute('tabindex')).toBe('-1');
  });

  it('clic sur PM bascule le roving tabindex + aria-checked + classe active', () => {
    const { window, ampmBtns } = ctx;
    const [am, pm] = ampmBtns;
    fireClick(window, pm);
    expect(pm.classList.contains('active')).toBe(true);
    expect(pm.getAttribute('aria-checked')).toBe('true');
    expect(pm.getAttribute('tabindex')).toBe('0');
    expect(am.classList.contains('active')).toBe(false);
    expect(am.getAttribute('aria-checked')).toBe('false');
    expect(am.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowRight sur AM deplace le focus + le roving tabindex vers PM', () => {
    const { window, document, ampmBtns } = ctx;
    const [am, pm] = ampmBtns;
    fireKeydown(window, am, 'ArrowRight');
    expect(document.activeElement).toBe(pm);
    expect(pm.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowLeft depuis AM boucle vers PM (dernier item, groupe a 2 elements)', () => {
    const { window, document, ampmBtns } = ctx;
    const [am, pm] = ampmBtns;
    fireKeydown(window, am, 'ArrowLeft');
    expect(document.activeElement).toBe(pm);
  });

  it("l'entree HH est bornee 1-12 (format 12h) : le bouton + desactive une fois la borne haute atteinte", () => {
    const { hh } = ctx;
    const wrap = ctx.wrap;
    const btnInc = wrap.querySelector('[data-time-part="hh"] .number-inc');
    hh.value = '12';
    hh.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
    expect(btnInc.disabled).toBe(true);
  });

  it('sync() ecrit HH:MM PERIOD dans la cible data-target au format 12h', () => {
    const { window, ampmBtns } = ctx;
    fireClick(window, ampmBtns[1]); // PM
    const out = window.document.getElementById('time-out');
    expect(out.value).toBe('09:30 PM');
  });
});

describe('initTimePicker -- format 24h (pas de segment AM/PM)', () => {
  it('sync() ecrit HH:MM sans suffixe au format 24h', () => {
    const dom = loadComponentsWindow(html24h());
    const { window } = dom;
    window.__initTimePicker();
    const out = window.document.getElementById('time-out-24');
    expect(out.value).toBe('23:59');
  });

  it("le bouton - de l'heure est desactive a la borne basse (0) sans segment AM/PM present", () => {
    const dom = loadComponentsWindow(html24h());
    const { window } = dom;
    window.__initTimePicker();
    const wrap = window.document.querySelector('.time-input-wrap');
    const hh = wrap.querySelector('[data-time-part="hh"] input');
    const btnDec = wrap.querySelector('[data-time-part="hh"] .number-dec');
    hh.value = '0';
    hh.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(btnDec.disabled).toBe(true);
  });
});
