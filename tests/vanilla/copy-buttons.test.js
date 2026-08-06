// Tests -- initCopyButtons (#744, vague 15/N couverture tests vanilla)
//
// Expose directement via window.__initCopyButtons (shared/components.js).
// Deux chemins distincts dans initCopyButtons() :
//  1. Boutons explicites [data-copy] (markup statique, ex. pages/divers.html
//     "Copy Button" section) -- click -> doCopy(btn, btn.dataset.copy).
//  2. Injection automatique d'un bouton inline sur tout .code-block PAS
//     deja dans un .code-block-wrap -- extrait le texte via
//     block.innerText || block.textContent (jsdom n'implemente PAS
//     innerText -- verifie empiriquement, undefined -- donc c'est TOUJOURS
//     textContent qui est exerce ici, comme le reste du DS sous jsdom).
//
// jsdom n'implemente PAS navigator.clipboard (verifie empiriquement :
// `window.navigator.clipboard` est undefined par defaut, assignation directe
// possible ensuite -- pas de getter en lecture seule sur ce nom). On stube
// un navigator.clipboard.writeText espionnable et on verifie le TEXTE
// TRANSMIS, jamais un comportement presse-papiers reel (hors de portee
// jsdom/Node).
//
// doCopy() chaine un .then() sur la Promise de writeText() avant de poser la
// classe copy-btn--success + swap d'icone, puis un setTimeout(2000) pour
// revenir a l'etat repos. Les timers sont fake (vi.useFakeTimers) pour ne
// jamais attendre reellement -- seule la microtask de resolution de Promise
// est laissee s'ecouler nativement (fake timers ne fake QUE
// setTimeout/setInterval, pas la microtask queue des Promises).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function stubClipboard(window, impl) {
  window.navigator.clipboard = { writeText: vi.fn(impl || (() => Promise.resolve())) };
  return window.navigator.clipboard.writeText;
}

describe('initCopyButtons -- bouton explicite [data-copy]', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const dom = loadComponentsWindow(`
      <button class="copy-btn" data-copy="pnpm install @msyx/design-system" aria-label="Copier la commande">
        <span class="copy-icon"></span>
        <span class="copy-tooltip">Copie !</span>
      </button>
    `);
    const { window } = dom;
    const { document } = window;
    return { window, document, btn: document.querySelector('.copy-btn'), icon: document.querySelector('.copy-icon') };
  }

  it('un clic transmet exactement le texte de data-copy au presse-papiers', () => {
    const { window, btn } = setup();
    const writeText = stubClipboard(window);
    window.__initCopyButtons();
    fireClick(window, btn);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('pnpm install @msyx/design-system');
  });

  it('apres resolution de la copie : classe copy-btn--success + icone SVG_CHECK, puis retour a l\'etat repos apres 2000ms (SVG_CLIPBOARD)', async () => {
    const { window, btn, icon } = setup();
    stubClipboard(window);
    window.__initCopyButtons();
    vi.useFakeTimers();
    try {
      fireClick(window, btn);
      await Promise.resolve(); // laisse le .then() de writeText() s'executer
      await Promise.resolve();
      expect(btn.classList.contains('copy-btn--success')).toBe(true);
      expect(icon.innerHTML).toBe(window.SVG_CHECK);
      vi.advanceTimersByTime(2000);
      expect(btn.classList.contains('copy-btn--success')).toBe(false);
      expect(icon.innerHTML).toBe(window.SVG_CLIPBOARD);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sans navigator.clipboard (jsdom par defaut) : le clic ne plante pas et ne pose aucune classe de succes', () => {
    const { window, btn } = setup();
    expect(window.navigator.clipboard).toBeUndefined();
    window.__initCopyButtons();
    expect(() => fireClick(window, btn)).not.toThrow();
    expect(btn.classList.contains('copy-btn--success')).toBe(false);
  });

  it('idempotent : un second appel initCopyButtons() ne double-bind pas le listener (dataset.copyBound)', () => {
    const { window, btn } = setup();
    const writeText = stubClipboard(window);
    window.__initCopyButtons();
    window.__initCopyButtons(); // 2e appel -- no-op sur ce bouton deja bound
    fireClick(window, btn);
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});

describe('initCopyButtons -- injection automatique sur .code-block', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('wrappe le bloc dans .code-block-wrap et injecte un bouton inline qui transmet le textContent du bloc', () => {
    const dom = loadComponentsWindow(`
      <div id="host"><div class="code-block">const x = 1;<br>let y = 2;</div></div>
    `);
    const { window } = dom;
    const { document } = window;
    const writeText = stubClipboard(window);
    window.__initCopyButtons();

    const wrap = document.querySelector('.code-block-wrap');
    expect(wrap).not.toBeNull();
    const block = wrap.querySelector('.code-block');
    expect(block).not.toBeNull();
    expect(block.getAttribute('tabindex')).toBe('0');

    const inlineBtn = wrap.querySelector('.copy-btn--inline');
    expect(inlineBtn).not.toBeNull();
    expect(inlineBtn.getAttribute('aria-label')).toBe('Copier le code');

    fireClick(window, inlineBtn);
    expect(writeText).toHaveBeenCalledWith('const x = 1;let y = 2;');
  });

  it('un .code-block deja dans un .code-block-wrap (bouton statique HTML) n\'est PAS re-wrappe ni doublonne', () => {
    const dom = loadComponentsWindow(`
      <div class="code-block-wrap">
        <div class="code-block">git push origin main</div>
        <button class="copy-btn copy-btn--inline" aria-label="Copier le code" data-copy="git push origin main"></button>
      </div>
    `);
    const { window } = dom;
    const { document } = window;
    window.__initCopyButtons();

    expect(document.querySelectorAll('.code-block-wrap').length).toBe(1);
    expect(document.querySelectorAll('.copy-btn--inline').length).toBe(1);
    // Le bloc recoit quand meme le tabindex a11y meme sans re-wrap
    expect(document.querySelector('.code-block').getAttribute('tabindex')).toBe('0');
  });

  it('idempotent : un second appel initCopyButtons() ne cree pas un second wrap/bouton', () => {
    const dom = loadComponentsWindow(`
      <div id="host"><div class="code-block">echo hello</div></div>
    `);
    const { window } = dom;
    const { document } = window;
    window.__initCopyButtons();
    window.__initCopyButtons();
    expect(document.querySelectorAll('.code-block-wrap').length).toBe(1);
    expect(document.querySelectorAll('.copy-btn--inline').length).toBe(1);
  });
});
