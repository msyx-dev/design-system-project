// Tests -- initModals (#744, vague 3/N infra tests vanilla)
//
// Composant choisi pour sa restauration de focus WAI APG (v2.41.0) :
// le comportement le plus facile a regresser sans qu'aucun test ne le
// signale. initModals() n'est pas expose individuellement -- accessible
// uniquement via window.__initComponents() (alias reinitAll -> initComponents()
// -> initModals()). Markup repris de pages/overlays.html#modals (classes/attrs reels).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readCss = (rel) => readFileSync(path.resolve(__dirname, '../../shared/css', rel), 'utf8');
const OVERLAYS_CSS_SOURCE = readCss('components/overlays.css');
const VERSION_NOTES_CSS_SOURCE = readCss('components/version-notes.css');
const TOKENS_CSS_SOURCE = readCss('tokens.css');

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

// --- Contrat CSS de largeur (#917) -------------------------------------------
//
// DEFAUT CORRIGE : `dialog.modal-dialog` imposait `max-width: 480px` en dur.
// Une palette montee en modale (`<dialog class="modal-dialog cmd-palette">`)
// retombait donc a 480px : `dialog.modal-dialog` (0,1,1) l'emporte sur
// `.cmd-palette` (0,1,0), et la combinaison des deux n'existait pas. Cote
// consommateur, la seule issue etait d'ecrire une largeur en dur ou d'editer le
// CSS synchronise -- les deux interdits par la convention (anti-pattern A3).
//
// Ces assertions portent sur la SOURCE CSS et non sur `getComputedStyle` :
// jsdom resout bien les valeurs calculees (cf. tests #866/#900), mais PAS les
// custom properties -- `var(--modal-w)` n'y est jamais substitue, donc une
// assertion de largeur resolue y serait vide de sens. La mesure reelle des 3
// largeurs (480 / 640 / 560px) est faite par le rendu navigateur, pas ici.
const ruleBodies = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // `\s*\{` juste apres le selecteur : garantit qu'on ne capture QUE la regle
  // exacte, jamais un descendant (`… .modal-header`) ni une combinaison
  // (`….cmd-palette`), qui ont d'autres caracteres avant leur accolade.
  const re = new RegExp(`(?:^|[{}\\n])\\s*${escaped}\\s*\\{([^{}]*)\\}`, 'g');
  const bodies = [];
  let match;
  while ((match = re.exec(css)) !== null) bodies.push(match[1]);
  return bodies;
};

describe('dialog.modal-dialog -- largeur par token (#917)', () => {
  it('declare les 3 tokens de largeur, aux valeurs actuelles (aucune rupture)', () => {
    expect(TOKENS_CSS_SOURCE).toMatch(/--modal-w:\s*480px/);
    expect(TOKENS_CSS_SOURCE).toMatch(/--modal-w-lg:\s*640px/);
    expect(TOKENS_CSS_SOURCE).toMatch(/--cmd-palette-w:\s*560px/);
  });

  it("ne fixe plus de largeur en dur : la regle de base passe par var(--modal-w)", () => {
    const [body] = ruleBodies(OVERLAYS_CSS_SOURCE, 'dialog.modal-dialog');
    expect(body).toBeDefined();
    expect(body).toMatch(/max-width:\s*var\(--modal-w\)/);
    expect(body).not.toMatch(/max-width:\s*\d/);
    // `width: 90%` inchange : en mobile c'est lui qui prime, pas le token.
    expect(body).toMatch(/width:\s*90%/);
  });

  it('expose une variante large qui remappe le token (pas une 2e max-width)', () => {
    const [body] = ruleBodies(OVERLAYS_CSS_SOURCE, 'dialog.modal-dialog.modal-dialog--lg');
    expect(body).toBeDefined();
    expect(body).toMatch(/--modal-w:\s*var\(--modal-w-lg\)/);
    expect(body).not.toMatch(/max-width/);
  });

  it('rend sa largeur a la palette montee en modale, et leve son transform de repos', () => {
    const [body] = ruleBodies(OVERLAYS_CSS_SOURCE, 'dialog.modal-dialog.cmd-palette');
    expect(body).toBeDefined();
    expect(body).toMatch(/--modal-w:\s*var\(--cmd-palette-w\)/);
    // Hors `.cmd-overlay.open`, rien ne leve `translateY(-10px) scale(0.98)` :
    // sans ce reset la palette resterait decalee et reduite dans la <dialog>.
    expect(body).toMatch(/transform:\s*none/);
  });

  it('la palette autonome garde sa largeur, elle aussi tokenisee', () => {
    const [body] = ruleBodies(OVERLAYS_CSS_SOURCE, '.cmd-palette');
    expect(body).toBeDefined();
    expect(body).toMatch(/max-width:\s*var\(--cmd-palette-w\)/);
  });

  it('la variante notes de version utilise le meme mecanisme (plus de max-width qui court-circuite)', () => {
    const bodies = ruleBodies(VERSION_NOTES_CSS_SOURCE, 'dialog.modal-dialog.version-notes-dialog');
    expect(bodies).toHaveLength(2); // base 440px + >=768px 480px
    expect(bodies[0]).toMatch(/--modal-w:\s*440px/);
    expect(bodies[1]).toMatch(/--modal-w:\s*480px/);
    for (const body of bodies) expect(body).not.toMatch(/max-width/);
  });
});
