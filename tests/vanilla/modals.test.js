// Tests -- initModals (#744, vague 3/N infra tests vanilla)
//
// Composant choisi pour sa restauration de focus WAI APG (v2.41.0) :
// le comportement le plus facile a regresser sans qu'aucun test ne le
// signale. initModals() n'est pas expose individuellement -- accessible
// uniquement via window.__initComponents() (alias reinitAll -> initComponents()
// -> initModals()). Markup repris de pages/overlays.html#modals (classes/attrs reels).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const BODY_HTML = `
  <button class="btn-primary" id="trigger-btn" data-modal-trigger="modal-confirm">Ouvrir</button>
  <input id="other-focusable" type="text">
  <dialog id="modal-confirm" class="modal-dialog" aria-labelledby="modal-confirm-title">
    <div class="modal-header">
      <h3 id="modal-confirm-title">Confirmer la suppression</h3>
      <button class="modal-close" data-modal-close aria-label="Fermer">&times;</button>
    </div>
    <div class="modal-body">
      <p>Etes-vous sur de vouloir supprimer cet element ? Cette action est irreversible.</p>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" data-modal-close>Annuler</button>
      <button class="btn-danger" id="confirm-delete" data-modal-close>Supprimer</button>
    </div>
  </dialog>
`;

function setup() {
  const dom = loadComponentsWindow(BODY_HTML);
  const { window } = dom;
  const { document } = window;
  window.__initComponents();
  const trigger = document.getElementById('trigger-btn');
  const dialog = document.getElementById('modal-confirm');
  const closeBtn = dialog.querySelector('.modal-close');
  const confirmBtn = document.getElementById('confirm-delete');
  return { window, document, trigger, dialog, closeBtn, confirmBtn };
}

// Un vrai clic navigateur sur un bouton le focus AVANT que le handler de
// click ne s'execute (attachFocusRestore capture document.activeElement au
// moment de showModal() -- c'est ce trigger focus qui sera restaure a la
// fermeture). jsdom ne simule pas ce focus-on-click implicite (limitation
// connue, cf. dispatchEvent/click() sans effet sur activeElement) : on le
// rend explicite ici, exactement comme le ferait un utilisateur clavier/souris
// reel, plutot que de le stuber globalement dans le helper (porterait sur
// TOUT clic de TOUT composant, bien au-dela de ce que ce test verifie).
function clickTrigger(win, el) {
  el.focus();
  fireClick(win, el);
}

describe('initModals', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("le clic sur le declencheur ouvre la dialog : attribut 'open' present (pas seulement l'ARIA)", () => {
    const { window, trigger, dialog } = ctx;
    expect(dialog.hasAttribute('open')).toBe(false);
    clickTrigger(window, trigger);
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('restaure le focus sur le declencheur a la fermeture via [data-modal-close] (WAI APG)', () => {
    const { window, document, trigger, dialog, closeBtn } = ctx;
    clickTrigger(window, trigger);
    expect(dialog.hasAttribute('open')).toBe(true);

    fireClick(window, closeBtn);

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('restaure le focus sur le declencheur meme quand la fermeture vient d un autre bouton data-modal-close', () => {
    const { window, document, trigger, dialog, confirmBtn } = ctx;
    clickTrigger(window, trigger);

    fireClick(window, confirmBtn);

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('un clic sur l overlay (la dialog elle-meme, hors contenu) ferme et restaure le focus', () => {
    const { window, document, trigger, dialog } = ctx;
    clickTrigger(window, trigger);
    expect(dialog.hasAttribute('open')).toBe(true);

    // Le handler ferme uniquement si e.target === dialog (clic sur le backdrop,
    // pas sur .modal-header/.modal-body/.modal-actions).
    fireClick(window, dialog);

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('Echap ferme la dialog et restaure le focus sur le declencheur (meme chemin attachFocusRestore que les autres fermetures)', () => {
    const { window, document, trigger, dialog } = ctx;
    clickTrigger(window, trigger);
    expect(dialog.hasAttribute('open')).toBe(true);

    fireKeydown(window, window.document, 'Escape');

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("un clic a l'interieur du contenu (pas sur la dialog elle-meme) ne ferme pas", () => {
    const { window, dialog } = ctx;
    dialog.showModal();
    const header = dialog.querySelector('.modal-header');

    fireClick(window, header);

    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('un declencheur different restaure le focus sur SON propre declencheur, pas le premier trouve', () => {
    const dom = loadComponentsWindow(`
      <button id="trigger-a" data-modal-trigger="shared-modal">A</button>
      <button id="trigger-b" data-modal-trigger="shared-modal">B</button>
      <dialog id="shared-modal" class="modal-dialog">
        <div class="modal-header">
          <button class="modal-close" data-modal-close aria-label="Fermer">&times;</button>
        </div>
      </dialog>
    `);
    const { window } = dom;
    const { document } = window;
    window.__initComponents();
    const triggerB = document.getElementById('trigger-b');
    const dialog = document.getElementById('shared-modal');
    const closeBtn = dialog.querySelector('.modal-close');

    clickTrigger(window, triggerB);
    fireClick(window, closeBtn);

    expect(document.activeElement).toBe(triggerB);
  });

  it('reste idempotent : un second appel de __initComponents() ne double-bind pas le declencheur (dataset.bound)', () => {
    const { window, document, trigger, dialog, closeBtn } = ctx;
    window.__initComponents(); // 2e appel (simule une re-init SPA)

    clickTrigger(window, trigger);
    // Si double-bind, showModal() serait appele 2x -- sans effet observable
    // ici (idempotent au niveau attribut), donc on verifie plutot qu'un
    // unique cycle open/close fonctionne toujours normalement.
    expect(dialog.hasAttribute('open')).toBe(true);
    fireClick(window, closeBtn);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
