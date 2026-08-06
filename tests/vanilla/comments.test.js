// Tests -- initComments (#744, vague 15/N couverture tests vanilla)
//
// Expose directement via window.__initComments (shared/components.js).
// Markup repris de pages/feedback.html#comments (structure .comment reelle).
//
// TROIS listeners distincts sont poses par initComments() :
//  1. [data-reply-trigger] -> toggle .comment-reply-form.open + focus du
//     textarea a l'ouverture.
//  2. [data-like-trigger]  -> toggle .active + incremente/decremente
//     .like-count (clampe a 0, Math.max(0, n-1)) -- TOUJOURS via
//     textContent, jamais innerHTML : aucun risque XSS sur ce chemin.
//  3. .comment-reply-form .btn-ghost ("Annuler") -> referme le formulaire.
//
// FIX INLINE (#744 vague 15) : [data-reply-trigger] n'exposait aucun
// aria-expanded (motif recurrent du chantier #744 : attribut ARIA jamais
// pose sur un widget de disclosure -- meme famille que le fix accordion
// existant, cf. shared/components.js l.~198). Repare en alignant sur le
// pattern accordion (aria-expanded="false" pose a l'init, resynchronise a
// chaque toggle). Teste ci-dessous.
//
// XSS (#758, DS-PRINCIPLES §11) : le brief de cette vague demandait de
// verifier qu'une saisie utilisateur porteuse de balisage est rendue comme
// TEXTE, jamais interpretee. Verification faite en lisant le code ET le
// markup (pages/feedback.html) : le bouton "Envoyer" du formulaire de
// reponse n'a AUCUN listener cable par initComments() (seul le bouton
// "Annuler" -- .btn-ghost -- l'est). Il n'existe donc, dans le vanilla
// actuel, AUCUN chemin qui prend le texte saisi dans .comment-reply-input
// et le rend quelque part (pas de nouveau commentaire ajoute au DOM). C'est
// une CAPACITE ABSENTE (pas un bug borne) -- signalee pour armer #836
// plutot qu'implementee ici. Le test ci-dessous documente cet etat : la
// saisie porteuse de balisage ne produit aucun rendu, PAR ABSENCE de tout
// sink, pas par echappement.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function commentHtml() {
  return `
    <div class="comment">
      <div class="comment-avatar">MS</div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">Mike</span>
        </div>
        <div class="comment-text">Super implementation !</div>
        <div class="comment-actions">
          <button class="comment-action-btn" data-reply-trigger aria-label="Repondre">&#8617; Repondre</button>
          <button class="comment-action-btn" data-like-trigger aria-label="J'aime">&#9825; <span class="like-count">3</span></button>
        </div>
        <div class="comment-reply-form" aria-label="Formulaire de reponse">
          <textarea class="comment-reply-input" placeholder="Votre reponse..." rows="2" aria-label="Votre reponse"></textarea>
          <div>
            <button class="btn-primary btn-xs" data-send-reply>Envoyer</button>
            <button class="btn-ghost btn-xs">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setup(bodyHtml = commentHtml()) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  return {
    window,
    document,
    comment: document.querySelector('.comment'),
    replyTrigger: document.querySelector('[data-reply-trigger]'),
    likeTrigger: document.querySelector('[data-like-trigger]'),
    likeCount: document.querySelector('.like-count'),
    form: document.querySelector('.comment-reply-form'),
    input: document.querySelector('.comment-reply-input'),
    cancelBtn: document.querySelector('.comment-reply-form .btn-ghost'),
    sendBtn: document.querySelector('[data-send-reply]'),
  };
}

describe('initComments -- reply toggle', () => {
  it('un clic ouvre le formulaire (classe open) et focus le textarea', () => {
    const { window, replyTrigger, form, input } = setup();
    window.__initComments();
    fireClick(window, replyTrigger);
    expect(form.classList.contains('open')).toBe(true);
    expect(input.ownerDocument.activeElement).toBe(input);
  });

  it('un second clic referme le formulaire (toggle)', () => {
    const { window, replyTrigger, form } = setup();
    window.__initComments();
    fireClick(window, replyTrigger);
    fireClick(window, replyTrigger);
    expect(form.classList.contains('open')).toBe(false);
  });

  it('FIX : aria-expanded suit l\'etat ouvert/ferme du formulaire (pose a false a l\'init)', () => {
    const { window, replyTrigger, form } = setup();
    window.__initComments();
    expect(replyTrigger.getAttribute('aria-expanded')).toBe('false');
    fireClick(window, replyTrigger);
    expect(form.classList.contains('open')).toBe(true);
    expect(replyTrigger.getAttribute('aria-expanded')).toBe('true');
    fireClick(window, replyTrigger);
    expect(form.classList.contains('open')).toBe(false);
    expect(replyTrigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('le bouton "Annuler" (.btn-ghost) referme le formulaire', () => {
    const { window, replyTrigger, cancelBtn, form } = setup();
    window.__initComments();
    fireClick(window, replyTrigger);
    expect(form.classList.contains('open')).toBe(true);
    fireClick(window, cancelBtn);
    expect(form.classList.contains('open')).toBe(false);
  });

  it('ne plante pas si le bouton data-reply-trigger n\'est pas dans un .comment', () => {
    const { window, document } = setup('<button data-reply-trigger class="comment-action-btn">Repondre</button>');
    window.__initComments();
    const btn = document.querySelector('[data-reply-trigger]');
    expect(() => fireClick(window, btn)).not.toThrow();
  });

  it('capacite absente (-> #836) : le bouton "Envoyer" n\'a aucun effet, meme avec une saisie porteuse de balisage', () => {
    const { window, replyTrigger, input, sendBtn, comment } = setup();
    window.__initComments();
    fireClick(window, replyTrigger);
    input.value = '<img src=x onerror="alert(1)">';
    const bodyHtmlBefore = comment.innerHTML;
    fireClick(window, sendBtn);
    // Aucun listener cable sur "Envoyer" par initComments() : le DOM du
    // commentaire est rigoureusement inchange (aucun nouveau .comment cree,
    // aucune interpretation du balisage saisi).
    expect(comment.innerHTML).toBe(bodyHtmlBefore);
    expect(comment.querySelectorAll('.comment').length).toBe(0);
  });
});

describe('initComments -- like toggle', () => {
  it('un clic active le like et incremente le compteur', () => {
    const { window, likeTrigger, likeCount } = setup();
    window.__initComments();
    fireClick(window, likeTrigger);
    expect(likeTrigger.classList.contains('active')).toBe(true);
    expect(likeCount.textContent).toBe('4');
  });

  it('un second clic desactive le like et decremente le compteur', () => {
    const { window, likeTrigger, likeCount } = setup();
    window.__initComments();
    fireClick(window, likeTrigger);
    fireClick(window, likeTrigger);
    expect(likeTrigger.classList.contains('active')).toBe(false);
    expect(likeCount.textContent).toBe('3');
  });

  it('le compteur est clampe a 0 (jamais negatif) via Math.max(0, n-1)', () => {
    const { window, document } = setup(`
      <div class="comment">
        <div class="comment-body">
          <div class="comment-actions">
            <button class="comment-action-btn active" data-like-trigger aria-label="J'aime">&#9825; <span class="like-count">0</span></button>
          </div>
        </div>
      </div>
    `);
    window.__initComments();
    const likeTrigger = document.querySelector('[data-like-trigger]');
    const likeCount = document.querySelector('.like-count');
    fireClick(window, likeTrigger); // active -> inactive, decrement depuis 0
    expect(likeCount.textContent).toBe('0');
    expect(likeTrigger.classList.contains('active')).toBe(false);
  });

  it('idempotent : un second appel initComments() ne double-bind pas le listener like (dataset.bound)', () => {
    const { window, likeTrigger, likeCount } = setup();
    window.__initComments();
    window.__initComments(); // 2e appel -- no-op sur ce bouton deja bound
    fireClick(window, likeTrigger);
    // Si double-bound, un seul clic incrementerait de 2 (3 -> 5). Un seul
    // bind => on avance a 4.
    expect(likeCount.textContent).toBe('4');
  });
});
