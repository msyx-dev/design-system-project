// Tests -- initModeSwitcher (#744, vague 13/N couverture tests vanilla)
//
// Expose directement via window.__initModeSwitcher (shared/components.js).
// Markup repris du header reel (shared/nav.js buildHeader) :
// <button id="mode-switch" role="switch" aria-checked="..."> ... </button>.
// initModeSwitcher() appelle updateModeSwitch() de facon INCONDITIONNELLE
// (avant meme le guard dataset.bound) -- c'est ce qui garantit que l'etat
// visuel (aria-checked/is-dark/aria-disabled/title) est toujours synchronise
// avec data-theme/data-mode au (re)montage, meme si le bouton est deja bound.
//
// THEME_CONFIG est une var top-level de shared/components.js -> devient une
// propriete mutable de dom.window sous l'eval indirect (verifie empiriquement,
// cf. theme-switcher.test.js). On l'utilise pour simuler un theme SANS mode
// clair (aucun des 4 themes reels du DS -- msyx/acssi/nhood/auchan -- n'est
// dans ce cas aujourd'hui : tous ont dark+light) et prouver que le toggle est
// bien neutralise dans ce cas, comme le prevoit le code de updateModeSwitch()/toggle().
import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadComponentsWindow, fireClick, fireKeydown } from './helpers/load-components.js';

function switchHtml() {
  return `
    <button id="mode-switch" class="mode-switch" role="switch" aria-checked="false" aria-label="Basculer mode clair/sombre">
      <span class="mode-switch-track"><span class="mode-switch-thumb"></span></span>
    </button>
  `;
}

function setup(bodyHtml = switchHtml()) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  return { window, document, sw: document.getElementById('mode-switch') };
}

describe('initModeSwitcher -- rendu initial', () => {
  afterEach(() => {
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a */ }
  });

  it('sans data-mode sur <html>, synchronise aria-checked="true" (dark = mode par defaut)', () => {
    const { window, sw } = setup();
    window.__initModeSwitcher();
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(sw.classList.contains('is-dark')).toBe(true);
  });

  it('avec data-mode="light" pose, synchronise aria-checked="false"', () => {
    const { window, document, sw } = setup();
    document.documentElement.setAttribute('data-mode', 'light');
    window.__initModeSwitcher();
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.classList.contains('is-dark')).toBe(false);
  });

  it('ne plante pas si #mode-switch est absent du markup', () => {
    const { window } = setup('<div></div>');
    expect(() => window.__initModeSwitcher()).not.toThrow();
  });

  it('#849 -- theme "auchan" a bien 2 modes (dark+light), toggle non neutralise', () => {
    const { window, sw } = setup();
    window.THEME_CONFIG.auchan = { modes: ['dark', 'light'], defaultMode: 'dark' };
    window.__initModeSwitcher();
    expect(sw.hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('initModeSwitcher -- clic', () => {
  afterEach(() => {
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a */ }
  });

  it('un clic bascule dark -> light : pose data-mode, persiste localStorage, aria-checked=false', () => {
    const { window, document, sw } = setup();
    window.__initModeSwitcher();
    fireClick(window, sw);
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    expect(window.localStorage.getItem('msyx-mode')).toBe('light');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.classList.contains('is-dark')).toBe(false);
  });

  it('un second clic bascule light -> dark : RETIRE data-mode (ne pose pas "dark"), aria-checked=true', () => {
    const { window, document, sw } = setup();
    window.__initModeSwitcher();
    fireClick(window, sw);
    fireClick(window, sw);
    expect(document.documentElement.hasAttribute('data-mode')).toBe(false);
    expect(window.localStorage.getItem('msyx-mode')).toBe('dark');
    expect(sw.getAttribute('aria-checked')).toBe('true');
  });

  it('Espace bascule le mode comme un clic (role=switch, comportement clavier)', () => {
    const { window, document, sw } = setup();
    window.__initModeSwitcher();
    const evt = fireKeydown(window, sw, ' ');
    expect(evt.defaultPrevented).toBe(true);
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });

  it('Enter bascule le mode comme un clic', () => {
    const { window, document, sw } = setup();
    window.__initModeSwitcher();
    fireKeydown(window, sw, 'Enter');
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });

  it('une autre touche (Tab) ne bascule rien', () => {
    const { window, document, sw } = setup();
    window.__initModeSwitcher();
    fireKeydown(window, sw, 'Tab');
    expect(document.documentElement.hasAttribute('data-mode')).toBe(false);
  });

  it('idempotent : un second appel initModeSwitcher() ne double-bind pas le listener (dataset.bound)', () => {
    const { window, document, sw } = setup();
    window.__initModeSwitcher();
    window.__initModeSwitcher(); // 2e appel -- doit no-op sur ce switch deja bound
    fireClick(window, sw);
    // Si double-bound, le clic basculerait 2x (dark->light->dark) : on
    // resterait a dark. Un seul bind => on avance a light.
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });
});

describe('initModeSwitcher -- theme sans mode clair (toggle neutralise)', () => {
  afterEach(() => {
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a */ }
  });

  it('theme dark-only : pose aria-disabled=true + title "Dark only", et le clic ne bascule rien', () => {
    const { window, document, sw } = setup();
    window.THEME_CONFIG.msyx = { modes: ['dark'], defaultMode: 'dark' };
    window.__initModeSwitcher();
    expect(sw.getAttribute('aria-disabled')).toBe('true');
    expect(sw.title).toBe('Dark only');
    fireClick(window, sw);
    expect(document.documentElement.hasAttribute('data-mode')).toBe(false); // toujours dark, rien n'a bouge
    expect(window.localStorage.getItem('msyx-mode')).toBeNull();
  });

  it('theme light-only : pose aria-disabled=true + title "Light only"', () => {
    const { window, document, sw } = setup();
    window.THEME_CONFIG.msyx = { modes: ['light'], defaultMode: 'light' };
    document.documentElement.setAttribute('data-mode', 'light');
    window.__initModeSwitcher();
    expect(sw.getAttribute('aria-disabled')).toBe('true');
    expect(sw.title).toBe('Light only');
  });

  it('le clavier respecte aussi la neutralisation (Espace/Enter no-op quand aria-disabled)', () => {
    const { window, document, sw } = setup();
    window.THEME_CONFIG.msyx = { modes: ['dark'], defaultMode: 'dark' };
    window.__initModeSwitcher();
    fireKeydown(window, sw, ' ');
    fireKeydown(window, sw, 'Enter');
    expect(document.documentElement.hasAttribute('data-mode')).toBe(false);
  });

  it('repasser a un theme bi-mode retire aria-disabled/title au prochain updateModeSwitch()', () => {
    const { window, document, sw } = setup();
    window.THEME_CONFIG.msyx = { modes: ['dark'], defaultMode: 'dark' };
    window.__initModeSwitcher();
    expect(sw.getAttribute('aria-disabled')).toBe('true');
    window.THEME_CONFIG.msyx = { modes: ['dark', 'light'], defaultMode: 'dark' };
    window.updateModeSwitch(); // fonction top-level non prefixee __, exposee comme THEME_CONFIG
    expect(sw.hasAttribute('aria-disabled')).toBe(false);
    expect(sw.title).toBe('');
  });
});

describe('initModeSwitcher -- localStorage qui leve', () => {
  afterEach(() => {
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a */ }
  });

  it('mode prive strict (cf. #793 cote React) : le clic applique quand meme le mode visuellement', () => {
    const { window, document, sw } = setup();
    window.__initModeSwitcher();
    const spy = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new window.DOMException('QuotaExceededError');
    });
    try {
      expect(() => fireClick(window, sw)).not.toThrow();
      expect(document.documentElement.getAttribute('data-mode')).toBe('light');
      expect(sw.getAttribute('aria-checked')).toBe('false');
    } finally {
      spy.mockRestore();
    }
  });
});
