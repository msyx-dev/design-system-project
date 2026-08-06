// Tests -- initConfirmPopover (#744, vague 5/N infra tests vanilla)
//
// Expose directement via window.__initConfirmPopover
// (shared/components.js:5118). Markup repris de
// pages/overlays.html#confirm-popover (classes/attrs reels), 2 instances
// pour verifier "ouvrir l'un ferme l'autre".
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const BODY_HTML = `
  <div class="popover-confirm-wrap" id="wrap-delete" data-on-confirm="onConfirmDelete">
    <button class="btn-danger btn-sm" data-confirm-trigger>Supprimer</button>
    <div class="popover-confirm popover-confirm--top" role="dialog" aria-label="Confirmer la suppression">
      <div class="popover-confirm-title">Confirmer la suppression ?</div>
      <div class="popover-confirm-actions">
        <button class="btn-ghost btn-xs" data-confirm-cancel>Annuler</button>
        <button class="btn-danger btn-xs" data-confirm-ok>Supprimer</button>
      </div>
    </div>
  </div>
  <div class="popover-confirm-wrap" id="wrap-reset">
    <button class="btn-outline-danger btn-sm" data-confirm-trigger>Reinitialiser</button>
    <div class="popover-confirm popover-confirm--bottom" role="dialog" aria-label="Confirmer la reinitialisation">
      <div class="popover-confirm-title">Reinitialiser les parametres ?</div>
      <div class="popover-confirm-actions">
        <button class="btn-ghost btn-xs" data-confirm-cancel>Annuler</button>
        <button class="btn-warning btn-xs" data-confirm-ok>Reinitialiser</button>
      </div>
    </div>
  </div>
`;

function setup() {
  const dom = loadComponentsWindow(BODY_HTML);
  const { window } = dom;
  const { document } = window;
  window.__initConfirmPopover();
  const wrapDelete = document.getElementById('wrap-delete');
  const wrapReset = document.getElementById('wrap-reset');
  const triggerDelete = wrapDelete.querySelector('[data-confirm-trigger]');
  const popoverDelete = wrapDelete.querySelector('.popover-confirm');
  const cancelDelete = wrapDelete.querySelector('[data-confirm-cancel]');
  const okDelete = wrapDelete.querySelector('[data-confirm-ok]');
  const triggerReset = wrapReset.querySelector('[data-confirm-trigger]');
  const popoverReset = wrapReset.querySelector('.popover-confirm');
  return {
    window, document,
    triggerDelete, popoverDelete, cancelDelete, okDelete,
    triggerReset, popoverReset,
  };
}

describe('initConfirmPopover', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup();
  });

  it("le clic sur le declencheur ouvre le popover : classe .open presente", () => {
    const { window, triggerDelete, popoverDelete } = ctx;
    expect(popoverDelete.classList.contains('open')).toBe(false);
    fireClick(window, triggerDelete);
    expect(popoverDelete.classList.contains('open')).toBe(true);
  });

  it('un 2e clic sur le declencheur referme le popover (toggle)', () => {
    const { window, triggerDelete, popoverDelete } = ctx;
    fireClick(window, triggerDelete);
    fireClick(window, triggerDelete);
    expect(popoverDelete.classList.contains('open')).toBe(false);
  });

  it("le clic sur 'Annuler' referme le popover SANS invoquer le callback", () => {
    const { window, triggerDelete, popoverDelete, cancelDelete } = ctx;
    ctx.window.onConfirmDelete = () => { ctx.window.__confirmCalled = true; };
    fireClick(window, triggerDelete);

    fireClick(window, cancelDelete);

    expect(popoverDelete.classList.contains('open')).toBe(false);
    expect(window.__confirmCalled).toBeUndefined();
  });

  it("le clic sur le bouton OK referme le popover ET invoque data-on-confirm exactement 1 fois", () => {
    const { window, triggerDelete, popoverDelete, okDelete } = ctx;
    let calls = 0;
    window.onConfirmDelete = () => { calls += 1; };
    fireClick(window, triggerDelete);

    fireClick(window, okDelete);

    expect(popoverDelete.classList.contains('open')).toBe(false);
    expect(calls).toBe(1);
  });

  it("un wrap sans callback (data-on-confirm absent) ne plante pas au clic OK", () => {
    const { window, triggerReset, popoverReset } = ctx;
    const okReset = ctx.document.getElementById('wrap-reset').querySelector('[data-confirm-ok]');
    fireClick(window, triggerReset);
    expect(() => fireClick(window, okReset)).not.toThrow();
    expect(popoverReset.classList.contains('open')).toBe(false);
  });

  it("ouvrir un 2e popover ferme le 1er (un seul .open a la fois)", () => {
    const { window, triggerDelete, popoverDelete, triggerReset, popoverReset } = ctx;
    fireClick(window, triggerDelete);
    expect(popoverDelete.classList.contains('open')).toBe(true);

    fireClick(window, triggerReset);
    expect(popoverReset.classList.contains('open')).toBe(true);
    expect(popoverDelete.classList.contains('open')).toBe(false);
  });

  it('un clic en dehors de tout popover les referme', () => {
    const { window, document, triggerDelete, popoverDelete } = ctx;
    fireClick(window, triggerDelete);
    expect(popoverDelete.classList.contains('open')).toBe(true);

    fireClick(window, document.body);

    expect(popoverDelete.classList.contains('open')).toBe(false);
  });

  it('Echap referme le popover ouvert', () => {
    const { window, document, triggerDelete, popoverDelete } = ctx;
    fireClick(window, triggerDelete);
    expect(popoverDelete.classList.contains('open')).toBe(true);

    fireKeydown(window, document, 'Escape');

    expect(popoverDelete.classList.contains('open')).toBe(false);
  });

  it('reste idempotent : un second appel de __initConfirmPopover() ne double-bind pas le callback (dataset.bound)', () => {
    const { window, triggerDelete, okDelete } = ctx;
    let calls = 0;
    window.onConfirmDelete = () => { calls += 1; };
    window.__initConfirmPopover(); // 2e appel (simule une re-init SPA)

    fireClick(window, triggerDelete);
    fireClick(window, okDelete);

    expect(calls).toBe(1);
  });
});
