// Tests -- initInputCounters (#952, compteur de caracteres du Textarea)
//
// Expose via window.__initInputCounters (shared/components.js, apres
// __initPasswordToggle). Markup repris de pages/formulaires.html#textarea
// (classes/attrs reels) : .input-group > textarea.input[maxlength] +
// .input-footer > (.input-hint + .input-counter + .sr-only[aria-live]).
//
// Contrat verifie :
//  - texte initial "N / MAX" (unite = value.length, UTF-16, comme le maxlength natif)
//  - mise a jour a chaque evenement 'input'
//  - .input-counter--over quand count > max (valeur initiale/programmatique)
//  - region live : vide sous la limite, "Limite de caractères atteinte" a count >= max,
//    et reecrite UNIQUEMENT quand son texte change (pas d'annonce a chaque frappe)
//  - resynchronisation apres form.reset() (l'evenement 'reset' precede la remise a zero)
//  - idempotence : deux appels = un seul binding (dataset.bound)
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

const LIMIT_MESSAGE = 'Limite de caractères atteinte';

function groupHtml({ id = 'wish', max = 200, value = '', form = true, footer = true } = {}) {
  const field = `<textarea class="input" id="${id}" rows="4" maxlength="${max}" aria-describedby="${id}-hint ${id}-counter">${value}</textarea>`;
  const foot = footer
    ? `<div class="input-footer">
         <span class="input-hint" id="${id}-hint">Aide.</span>
         <span class="input-counter" id="${id}-counter">0 / ${max}</span>
         <span class="sr-only" aria-live="polite"></span>
       </div>`
    : '';
  const group = `<div class="input-group"><label class="input-label" for="${id}">Liste</label>${field}${foot}</div>`;
  return form ? `<form id="f-${id}">${group}</form>` : group;
}

function setup(html = groupHtml()) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initInputCounters();
  return {
    window,
    document,
    field: document.querySelector('textarea'),
    counter: document.querySelector('.input-counter'),
    live: document.querySelector('.sr-only[aria-live]'),
    form: document.querySelector('form'),
  };
}

function type(window, field, value) {
  field.value = value;
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
}

// Compte les ecritures DOM (childList) faites sur un noeud, en synchrone.
// Le callback accumule les enregistrements deja livres (microtask apres un
// await) ; takeRecords() recupere ceux encore en file (test synchrone).
function watchWrites(window, node) {
  let delivered = 0;
  const obs = new window.MutationObserver((records) => { delivered += records.length; });
  obs.observe(node, { childList: true, characterData: true, subtree: true });
  return () => delivered + obs.takeRecords().length;
}

const tick = (window) => new Promise((resolve) => window.setTimeout(resolve, 5));

describe('initInputCounters -- affichage', () => {
  it("texte initial '0 / 200' pour un champ vide, sans classe --over", () => {
    const { counter } = setup();
    expect(counter.textContent).toBe('0 / 200');
    expect(counter.classList.contains('input-counter--over')).toBe(false);
  });

  it("met a jour le compteur a chaque evenement 'input'", () => {
    const { window, field, counter } = setup();
    type(window, field, 'abc');
    expect(counter.textContent).toBe('3 / 200');
    type(window, field, 'abcdef');
    expect(counter.textContent).toBe('6 / 200');
    type(window, field, '');
    expect(counter.textContent).toBe('0 / 200');
  });

  it("lit la valeur initiale du champ au chargement ('11 / 200')", () => {
    const { counter } = setup(groupHtml({ value: 'Trop court.' }));
    expect(counter.textContent).toBe('11 / 200');
  });

  it('le maximum affiche suit le maxlength du champ (pas 200 en dur)', () => {
    const { window, field, counter } = setup(groupHtml({ max: 2000 }));
    expect(counter.textContent).toBe('0 / 2000');
    type(window, field, 'hello');
    expect(counter.textContent).toBe('5 / 2000');
  });

  it("l'unite est value.length (UTF-16) : un emoji compte pour 2", () => {
    const { window, field, counter } = setup();
    type(window, field, '😀');
    expect(counter.textContent).toBe('2 / 200');
  });

  it('deux groupes sont independants', () => {
    const html = groupHtml({ id: 'a', max: 10 }) + groupHtml({ id: 'b', max: 50 });
    const { window, document } = setup(html);
    const [fa, fb] = document.querySelectorAll('textarea');
    const [ca, cb] = document.querySelectorAll('.input-counter');
    type(window, fa, 'xxxx');
    expect(ca.textContent).toBe('4 / 10');
    expect(cb.textContent).toBe('0 / 50');
    type(window, fb, 'yy');
    expect(ca.textContent).toBe('4 / 10');
    expect(cb.textContent).toBe('2 / 50');
  });
});

describe('initInputCounters -- depassement (.input-counter--over)', () => {
  it('une valeur initiale plus longue que maxlength pose --over des le chargement', () => {
    const { counter } = setup(groupHtml({ value: 'x'.repeat(210) }));
    expect(counter.textContent).toBe('210 / 200');
    expect(counter.classList.contains('input-counter--over')).toBe(true);
  });

  it('--over bascule : absent a count == max, present a count > max, retire quand on repasse sous la limite', () => {
    const { window, field, counter } = setup(groupHtml({ max: 10 }));
    type(window, field, 'x'.repeat(10));
    expect(counter.classList.contains('input-counter--over')).toBe(false);
    type(window, field, 'x'.repeat(11));
    expect(counter.classList.contains('input-counter--over')).toBe(true);
    type(window, field, 'x'.repeat(9));
    expect(counter.classList.contains('input-counter--over')).toBe(false);
  });
});

describe('initInputCounters -- region live (.sr-only[aria-live])', () => {
  it('reste vide sous la limite (aucune annonce a la frappe)', () => {
    const { window, field, live } = setup(groupHtml({ max: 10 }));
    expect(live.textContent).toBe('');
    type(window, field, 'abcde');
    expect(live.textContent).toBe('');
    type(window, field, 'abcdefghi');
    expect(live.textContent).toBe('');
  });

  it(`annonce '${LIMIT_MESSAGE}' a count >= max, puis se vide quand on repasse sous la limite`, () => {
    const { window, field, live } = setup(groupHtml({ max: 10 }));
    type(window, field, 'x'.repeat(10));
    expect(live.textContent).toBe(LIMIT_MESSAGE);
    type(window, field, 'x'.repeat(11));
    expect(live.textContent).toBe(LIMIT_MESSAGE);
    type(window, field, 'x'.repeat(9));
    expect(live.textContent).toBe('');
  });

  it("ne reecrit PAS la region quand le message est deja affiche (une seule annonce)", () => {
    const { window, field, live } = setup(groupHtml({ max: 10 }));
    type(window, field, 'x'.repeat(10));
    const writes = watchWrites(window, live);
    type(window, field, 'y'.repeat(10));
    type(window, field, 'z'.repeat(10));
    expect(live.textContent).toBe(LIMIT_MESSAGE);
    expect(writes()).toBe(0);
  });

  it("la region live est preservee (meme noeud) : jamais remplacee ni demontee", () => {
    const { window, field, live, document } = setup(groupHtml({ max: 10 }));
    type(window, field, 'x'.repeat(10));
    type(window, field, '');
    expect(document.querySelector('.sr-only[aria-live]')).toBe(live);
    expect(live.isConnected).toBe(true);
  });

  it('un compteur sans region live fonctionne quand meme (la region est optionnelle)', () => {
    const html = `<div class="input-group"><textarea class="input" maxlength="10"></textarea><div class="input-footer"><span class="input-counter">0 / 10</span></div></div>`;
    const { window, field, counter } = setup(html);
    type(window, field, 'abc');
    expect(counter.textContent).toBe('3 / 10');
  });
});

describe('initInputCounters -- reset du formulaire', () => {
  it("apres form.reset(), le compteur revient a la longueur de la valeur par defaut", async () => {
    const { window, field, counter, form } = setup(groupHtml({ value: 'hello' }));
    type(window, field, 'hello world, plus long');
    expect(counter.textContent).toBe('22 / 200');
    form.reset();
    await tick(window);
    expect(field.value).toBe('hello');
    expect(counter.textContent).toBe('5 / 200');
  });

  it("apres form.reset() d'un champ sans valeur par defaut : '0 / 200'", async () => {
    const { window, field, counter, form } = setup();
    type(window, field, 'abc');
    form.reset();
    await tick(window);
    expect(counter.textContent).toBe('0 / 200');
  });

  it("form.reset() vide la region live et retire --over", async () => {
    const { window, field, counter, live, form } = setup(groupHtml({ max: 10 }));
    type(window, field, 'x'.repeat(12));
    expect(live.textContent).toBe(LIMIT_MESSAGE);
    expect(counter.classList.contains('input-counter--over')).toBe(true);
    form.reset();
    await tick(window);
    expect(live.textContent).toBe('');
    expect(counter.classList.contains('input-counter--over')).toBe(false);
    expect(counter.textContent).toBe('0 / 10');
  });

  it("un champ hors <form> fonctionne (pas de listener reset, pas d'erreur)", () => {
    const { window, field, counter } = setup(groupHtml({ form: false }));
    type(window, field, 'abcd');
    expect(counter.textContent).toBe('4 / 200');
  });
});

describe('initInputCounters -- idempotence (dataset.bound)', () => {
  it("pose dataset.bound='1' sur le compteur", () => {
    const { counter } = setup();
    expect(counter.dataset.bound).toBe('1');
  });

  it("deux appels a __initInputCounters() = un seul binding : une frappe ecrit le compteur une seule fois", () => {
    const { window, field, counter } = setup();
    window.__initInputCounters();
    const writes = watchWrites(window, counter);
    type(window, field, 'abc');
    expect(counter.textContent).toBe('3 / 200');
    expect(writes()).toBe(1);
  });

  it("deux appels = un seul listener 'reset' (un reset ecrit le compteur une seule fois)", async () => {
    const { window, field, counter, form } = setup();
    window.__initInputCounters();
    type(window, field, 'abc');
    const writes = watchWrites(window, counter);
    form.reset();
    await tick(window);
    expect(writes()).toBe(1);
  });

  it("reinitAll() (window.__initComponents) initialise aussi les compteurs", () => {
    const { window } = loadComponentsWindow(groupHtml({ value: 'hello' }));
    const { document } = window;
    window.__initComponents();
    const counter = document.querySelector('.input-counter');
    expect(counter.dataset.bound).toBe('1');
    expect(counter.textContent).toBe('5 / 200');
  });
});

describe('initInputCounters -- garde-fous', () => {
  it("un compteur sans champ [maxlength] dans son groupe est ignore (non lie, texte intact)", () => {
    const html = `<div class="input-group"><textarea class="input"></textarea><div class="input-footer"><span class="input-counter">texte initial</span></div></div>`;
    const { counter } = setup(html);
    expect(counter.textContent).toBe('texte initial');
    expect(counter.dataset.bound).toBeUndefined();
  });

  it("un maxlength non numerique est ignore (pas de 'NaN' affiche)", () => {
    const html = `<div class="input-group"><textarea class="input" maxlength="abc"></textarea><div class="input-footer"><span class="input-counter">0</span></div></div>`;
    const { counter } = setup(html);
    expect(counter.textContent).toBe('0');
    expect(counter.dataset.bound).toBeUndefined();
  });

  it("un .input-counter hors .input-group est ignore", () => {
    const { window, document } = setup(`<span class="input-counter">x</span>`);
    expect(document.querySelector('.input-counter').dataset.bound).toBeUndefined();
    expect(typeof window.__initInputCounters).toBe('function');
  });
});
