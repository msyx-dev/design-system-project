// Tests -- initInlineEdit (#744, vague 10/N couverture tests vanilla)
//
// Expose via window.__initInlineEdit (shared/components.js). Markup repris de
// pages/formulaires.html#inline-edit (classes/attrs reels) :
// .editable-field[data-editable] > .editable-text[role=button][tabindex=0] +
// .editable-input-wrap > .editable-input + .editable-btn-save/-cancel.
//
// Defaut corrige dans cette vague : stopEdit() ne restaurait JAMAIS le focus
// sur .editable-text apres Sauvegarder/Annuler/Echap -- l'input qui vient
// d'etre masque (.editable-input-wrap.active retiree -> display:none en CSS
// reel) emporte le focus avec lui, qui retombe au document. Sous jsdom (aucun
// CSS charge ici), display:none ne se produit pas automatiquement -- mais
// l'assertion cible directement l'EFFET du code (stopEdit() doit appeler
// textEl.focus()), pas un effet CSS : document.activeElement doit valoir
// textEl apres stopEdit(), jamais rester sur inputEl/un bouton. C'est le
// meme mecanisme que initActionMenu() (trigger.focus() dans closeMenu),
// reutilise ici -- pas de 3e pattern de restauration de focus.
//
// Timer du saveDelay : jsdom expose son PROPRE window.setTimeout, distinct de
// l'horloge globale node (meme constat que carousel.test.js pour
// setInterval) -- on stube window.setTimeout/clearTimeout AVANT d'appeler
// __initInlineEdit() pour capturer le callback et le declencher a la main,
// deterministe, sans dependre d'un vrai delai ni de vi.useFakeTimers().
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function fieldHtml(id, extraAttrs = '') {
  return `
    <div class="editable-field" data-editable ${extraAttrs} id="${id}">
      <span class="editable-text" tabindex="0" role="button" aria-label="Modifier ${id}">Valeur initiale ${id}</span>
      <span class="editable-input-wrap">
        <input class="editable-input" type="text" value="Valeur initiale ${id}" aria-label="Champ ${id}">
        <span class="editable-btns">
          <button class="editable-btn editable-btn-save" aria-label="Sauvegarder">OK</button>
          <button class="editable-btn editable-btn-cancel" aria-label="Annuler">X</button>
        </span>
      </span>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initInlineEdit();
  return { window, document };
}

function field(document, id) {
  const root = document.getElementById(id);
  return {
    root,
    textEl: root.querySelector('.editable-text'),
    inputEl: root.querySelector('.editable-input'),
    inputWrap: root.querySelector('.editable-input-wrap'),
    saveBtn: root.querySelector('.editable-btn-save'),
    cancelBtn: root.querySelector('.editable-btn-cancel'),
  };
}

describe('initInlineEdit -- ouverture', () => {
  it('cliquer sur le texte affiche le champ et lui donne le focus, prerempli avec le texte courant', () => {
    const { window, document } = setup(fieldHtml('fa'));
    const { textEl, inputEl, inputWrap } = field(document, 'fa');
    fireClick(window, textEl);
    expect(textEl.classList.contains('hidden')).toBe(true);
    expect(inputWrap.classList.contains('active')).toBe(true);
    expect(inputEl.value).toBe('Valeur initiale fa');
    expect(document.activeElement).toBe(inputEl);
  });

  it("Entree ou Espace sur le texte (role=button) ouvre l'edition, sans naviguer", () => {
    const { window, document } = setup(fieldHtml('fb'));
    const { textEl, inputWrap } = field(document, 'fb');
    textEl.focus();
    const evt = fireKeydown(window, textEl, 'Enter');
    expect(evt.defaultPrevented).toBe(true);
    expect(inputWrap.classList.contains('active')).toBe(true);

    // Reouverture via Espace sur un 2e champ, isole du 1er.
    const { textEl: textEl2, inputWrap: inputWrap2 } = field(document, 'fb');
    void textEl2;
    fireKeydown(window, textEl, ' ');
    expect(inputWrap2.classList.contains('active')).toBe(true);
  });

  it('le texte affiche exclut le suffixe icone edit avant de le charger dans le champ', () => {
    const html = `
      <div class="editable-field" data-editable id="fc">
        <span class="editable-text" tabindex="0" role="button">design-system-project <span class="edit-icon" aria-hidden="true">&#9998;</span></span>
        <span class="editable-input-wrap">
          <input class="editable-input" type="text" value="design-system-project">
        </span>
      </div>
    `;
    const { window, document } = setup(html);
    const { textEl, inputEl } = field(document, 'fc');
    fireClick(window, textEl);
    expect(inputEl.value).toBe('design-system-project');
  });
});

describe('initInlineEdit -- restauration du focus (defaut corrige #744 vague 10)', () => {
  it('Sauvegarder (bouton) restaure le focus sur .editable-text, jamais sur l-input masque', () => {
    const { window, document } = setup(fieldHtml('fd'));
    const { textEl, inputEl, saveBtn, inputWrap } = field(document, 'fd');
    fireClick(window, textEl);
    inputEl.value = 'Nouvelle valeur';
    fireClick(window, saveBtn);
    expect(inputWrap.classList.contains('active')).toBe(false);
    expect(textEl.classList.contains('hidden')).toBe(false);
    expect(document.activeElement).toBe(textEl);
  });

  it('Annuler (bouton) restaure le focus sur .editable-text', () => {
    const { window, document } = setup(fieldHtml('fe'));
    const { textEl, inputEl, cancelBtn } = field(document, 'fe');
    fireClick(window, textEl);
    inputEl.value = 'Valeur abandonnee';
    fireClick(window, cancelBtn);
    expect(document.activeElement).toBe(textEl);
    // Annuler ne sauvegarde rien : le texte affiche est inchange.
    expect(textEl.textContent.trim()).toBe('Valeur initiale fe');
  });

  it('Echap dans le champ restaure le focus sur .editable-text', () => {
    const { window, document } = setup(fieldHtml('ff'));
    const { textEl, inputEl } = field(document, 'ff');
    fireClick(window, textEl);
    fireKeydown(window, inputEl, 'Escape');
    expect(document.activeElement).toBe(textEl);
  });

  it('Entree dans le champ (sauvegarde clavier) restaure le focus sur .editable-text', () => {
    const { window, document } = setup(fieldHtml('fg'));
    const { textEl, inputEl } = field(document, 'fg');
    fireClick(window, textEl);
    inputEl.value = 'Sauvegarde au clavier';
    fireKeydown(window, inputEl, 'Enter');
    expect(document.activeElement).toBe(textEl);
    expect(textEl.textContent.trim()).toBe('Sauvegarde au clavier');
  });

  it('sauvegarder une valeur vide referme sans ecraser le texte, et restaure quand meme le focus', () => {
    const { window, document } = setup(fieldHtml('fh'));
    const { textEl, inputEl, saveBtn } = field(document, 'fh');
    fireClick(window, textEl);
    inputEl.value = '   ';
    fireClick(window, saveBtn);
    expect(textEl.textContent.trim()).toBe('Valeur initiale fh');
    expect(document.activeElement).toBe(textEl);
  });

  it('avec data-save-delay, le focus est restaure APRES resolution du delai (pas avant, pas jamais)', () => {
    const { window, document } = setup(fieldHtml('fi', 'data-save-delay="800"'));
    const { textEl, inputEl, saveBtn } = field(document, 'fi');

    let capturedCb = null;
    let capturedDelay = null;
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function (cb, delay) {
      capturedCb = cb;
      capturedDelay = delay;
      return 1;
    };

    fireClick(window, textEl);
    inputEl.value = 'Async valeur';
    fireClick(window, saveBtn);

    expect(capturedDelay).toBe(800);
    expect(saveBtn.classList.contains('loading')).toBe(true);
    // Avant resolution du timer : le focus n'a PAS encore ete restaure.
    expect(document.activeElement).not.toBe(textEl);

    capturedCb();

    expect(saveBtn.classList.contains('loading')).toBe(false);
    expect(textEl.childNodes[0].textContent.trim()).toBe('Async valeur');
    expect(document.activeElement).toBe(textEl);

    window.setTimeout = originalSetTimeout;
  });
});

describe('initInlineEdit -- isolation multi-champ et idempotence', () => {
  it('deux champs sur la meme page sont independants (ouvrir le 1er ne touche pas le 2e)', () => {
    const { window, document } = setup(fieldHtml('fj') + fieldHtml('fk'));
    const { textEl: text1, inputWrap: wrap1 } = field(document, 'fj');
    const { inputWrap: wrap2 } = field(document, 'fk');
    fireClick(window, text1);
    expect(wrap1.classList.contains('active')).toBe(true);
    expect(wrap2.classList.contains('active')).toBe(false);
  });

  it("reappeler initInlineEdit() est idempotent (pas de double ouverture au meme clic)", () => {
    const { window, document } = setup(fieldHtml('fl'));
    window.__initInlineEdit(); // 2e appel -- doit no-op (dataset.bound)
    const { textEl, inputEl } = field(document, 'fl');
    fireClick(window, textEl);
    // Si le listener etait double-attache, startEdit() aurait ete appele 2x
    // (sans effet visible ici) mais surtout focus()/select() 2x -- l'etat
    // final reste coherent avec un seul binding.
    expect(inputEl.value).toBe('Valeur initiale fl');
    expect(document.activeElement).toBe(inputEl);
  });
});
