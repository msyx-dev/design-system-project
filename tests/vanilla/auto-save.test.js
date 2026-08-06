// Tests -- initAutoSave (#744, vague 15/N couverture tests vanilla)
//
// Expose directement via window.__initAutoSave (shared/components.js).
// Markup repris de pages/feedback.html#auto-save (bloc [data-autosave-demo]).
//
// Comportement REEL (verifie en lisant shared/components.js) : PAS de
// minuteur -- applyState() est synchrone, appelee une fois immediatement a
// l'init (etat force a states[0] = 'saving', quel que soit l'etat rendu
// dans le HTML statique -- cf. commentaire du 1er test ci-dessous) puis a
// chaque clic sur [data-autosave-trigger], qui fait juste avancer un index
// cyclique 'saving' -> 'saved' -> 'unsaved' -> 'saving' ... Rien a stuber
// niveau timers ici.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function autosaveHtml(id = 'as1') {
  return `
    <div class="autosave autosave--saved" data-autosave-demo id="${id}">
      <span class="autosave-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span class="autosave-text">Enregistre</span>
      <button data-autosave-trigger class="btn-ghost btn-xs">Simuler</button>
    </div>
  `;
}

function setup(bodyHtml = autosaveHtml()) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  const el = document.querySelector('.autosave[data-autosave-demo]');
  return {
    window,
    document,
    el,
    btn: el && el.querySelector('[data-autosave-trigger]'),
    icon: el && el.querySelector('.autosave-icon'),
    text: el && el.querySelector('.autosave-text'),
  };
}

describe('initAutoSave -- init', () => {
  it('a l\'init, force l\'etat a "saving" (idx=0) meme si le HTML statique montre "saved"', () => {
    // Documente un comportement reel potentiellement surprenant : le markup
    // statique demarre en autosave--saved (etat "repos" affiche avant JS),
    // mais applyState(states[0]) est appelee INCONDITIONNELLEMENT a l'init
    // -- l'etat visuel bascule donc immediatement vers "saving" au montage.
    const { window, el, text } = setup();
    window.__initAutoSave();
    expect(el.className).toBe('autosave autosave--saving');
    expect(text.textContent).toBe('Enregistrement...');
  });

  it('ne plante pas si le bloc [data-autosave-demo] n\'a pas de [data-autosave-trigger]', () => {
    const { window } = setup('<div class="autosave autosave--saved" data-autosave-demo><span class="autosave-text">Enregistre</span></div>');
    expect(() => window.__initAutoSave()).not.toThrow();
  });

  it('ne plante pas si aucun .autosave[data-autosave-demo] n\'est present', () => {
    const { window } = setup('<div></div>');
    expect(() => window.__initAutoSave()).not.toThrow();
  });
});

describe('initAutoSave -- cycle au clic', () => {
  it('cycle saving -> saved -> unsaved -> saving au fil des clics (classe + texte + icone)', () => {
    const { window, el, btn, text, icon } = setup();
    window.__initAutoSave();
    expect(el.classList.contains('autosave--saving')).toBe(true);

    fireClick(window, btn);
    expect(el.className).toBe('autosave autosave--saved');
    expect(text.textContent).toBe('Enregistre');
    expect(icon.innerHTML).toContain('path'); // icone checkmark (path), pas le spinner (circle)

    fireClick(window, btn);
    expect(el.className).toBe('autosave autosave--unsaved');
    expect(text.textContent).toBe('Modifications non sauvegardees');
    expect(icon.innerHTML).toContain('autosave-dot');

    fireClick(window, btn);
    expect(el.className).toBe('autosave autosave--saving');
    expect(text.textContent).toBe('Enregistrement...');
    expect(icon.innerHTML).toContain('circle'); // spinner
  });

  it('idempotent : un second appel initAutoSave() ne double-bind pas le listener (dataset.bound)', () => {
    const { window, el, btn } = setup();
    window.__initAutoSave();
    window.__initAutoSave(); // 2e appel -- no-op sur ce bloc deja bound
    fireClick(window, btn);
    // Si double-bound, un seul clic ferait avancer l'index de 2 (saving -> unsaved
    // directement, en sautant saved). Un seul bind => on avance a "saved".
    expect(el.classList.contains('autosave--saved')).toBe(true);
  });

  it('deux blocs [data-autosave-demo] independants ne partagent pas leur index de cycle', () => {
    const { window, document } = setup(autosaveHtml('as1') + autosaveHtml('as2'));
    window.__initAutoSave();
    const [el1, el2] = document.querySelectorAll('.autosave[data-autosave-demo]');
    const btn1 = el1.querySelector('[data-autosave-trigger]');
    fireClick(window, btn1); // as1 : saving -> saved
    expect(el1.classList.contains('autosave--saved')).toBe(true);
    expect(el2.classList.contains('autosave--saving')).toBe(true); // as2 inchange
  });
});
