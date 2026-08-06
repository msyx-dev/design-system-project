// Tests -- initThemeSwitcher (#744, vague 13/N couverture tests vanilla)
//
// Expose directement via window.__initThemeSwitcher (shared/components.js).
// Markup repris du header reel genere par shared/nav.js (buildHeader) :
// <div class="theme-switcher"><select id="theme-select">...</select></div>
// + <button id="mode-switch" role="switch">...</button> (les deux vivent
// dans le meme header -- initThemeSwitcher() synchronise aussi le mode-switch
// via updateModeSwitch(), cf. commentaire FIX #251 en tete de la fonction).
//
// data-theme/data-mode sont poses sur <html> (document.documentElement),
// jamais sur un element du markup injecte -- coherent avec l'anti-FOUC
// (script inline <head> qui lit msyx-theme/msyx-mode depuis localStorage
// et pose ces attributs AVANT le premier paint).
//
// localStorage jsdom : REEL mais PARTAGE entre les tests d'un meme fichier
// (une seule instance de Storage par processus jsdom -- verifie empiriquement,
// cf. commentaire dans mode-switcher.test.js) -- purge systematique en
// beforeEach/afterEach pour eviter qu'un test hérite de l'ecriture du
// precedent et passe "par accident".
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

function headerHtml() {
  return `
    <div class="theme-switcher">
      <label class="theme-switcher-label" for="theme-select">Theme</label>
      <select id="theme-select" class="theme-switcher-select" aria-label="Choisir le theme">
        <option value="msyx">MSYX</option>
        <option value="acssi">ACSSI</option>
        <option value="nhood">Nhood</option>
      </select>
    </div>
    <button id="mode-switch" class="mode-switch" role="switch" aria-checked="false" aria-label="Basculer mode clair/sombre">
      <span class="mode-switch-track"><span class="mode-switch-thumb"></span></span>
    </button>
  `;
}

function setup(bodyHtml = headerHtml()) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  return { window, document, select: document.getElementById('theme-select'), modeSwitch: document.getElementById('mode-switch') };
}

describe('initThemeSwitcher -- rendu initial', () => {
  afterEach(() => {
    // localStorage jsdom persiste entre les JSDOM crees dans le meme process --
    // purge apres CHAQUE test (pas seulement beforeEach) pour ne pas fuiter
    // vers un test d'un AUTRE fichier execute dans le meme worker vitest.
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a en node env */ }
  });

  it('sans data-theme sur <html>, synchronise le select sur "msyx" (defaut)', () => {
    const { window, select } = setup();
    window.__initThemeSwitcher();
    expect(select.value).toBe('msyx');
  });

  it('reflete un data-theme deja pose sur <html> dans le select au montage', () => {
    const { window, document, select } = setup();
    document.documentElement.setAttribute('data-theme', 'acssi');
    window.__initThemeSwitcher();
    expect(select.value).toBe('acssi');
  });

  it('ne plante pas si #theme-select est absent du markup (consumer sans theme switcher)', () => {
    const { window } = setup('<button id="mode-switch" role="switch" aria-checked="false"></button>');
    expect(() => window.__initThemeSwitcher()).not.toThrow();
  });

  it('FIX #251 -- synchronise le mode-switch AVANT le guard !select, meme quand #theme-select est absent', () => {
    // Repro de la race anti-FOUC documentee en tete de initThemeSwitcher() :
    // le mode-switch doit refleter data-mode des le premier appel, y compris
    // sur un consumer qui n'a pas de selecteur de theme du tout.
    const { window, document, modeSwitch } = setup('<button id="mode-switch" role="switch" aria-checked="false"></button>');
    document.documentElement.setAttribute('data-mode', 'light');
    window.__initThemeSwitcher();
    expect(modeSwitch.getAttribute('aria-checked')).toBe('false'); // light = pas dark
  });
});

describe('initThemeSwitcher -- changement de theme', () => {
  afterEach(() => {
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a */ }
  });

  it('pose data-theme sur <html> et persiste dans localStorage["msyx-theme"] au changement', () => {
    const { window, document, select } = setup();
    window.__initThemeSwitcher();
    select.value = 'acssi';
    select.dispatchEvent(new window.Event('change'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('acssi');
    expect(window.localStorage.getItem('msyx-theme')).toBe('acssi');
  });

  it('retour vers "msyx" (theme par defaut) RETIRE l\'attribut data-theme, ne le pose pas a "msyx"', () => {
    const { window, document, select } = setup();
    window.__initThemeSwitcher();
    select.value = 'nhood';
    select.dispatchEvent(new window.Event('change'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(true);
    select.value = 'msyx';
    select.dispatchEvent(new window.Event('change'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('applique une classe theme-transitioning le temps de la transition puis la retire (setTimeout 300ms)', () => {
    vi.useFakeTimers();
    try {
      const { window, document, select } = setup();
      window.__initThemeSwitcher();
      select.value = 'acssi';
      select.dispatchEvent(new window.Event('change'));
      expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true);
      vi.advanceTimersByTime(300);
      expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('affiche un toast confirmant le theme choisi', () => {
    const { window, document, select } = setup();
    window.__initThemeSwitcher();
    select.value = 'acssi';
    select.dispatchEvent(new window.Event('change'));
    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('ACSSI');
  });

  it('idempotent : un second appel initThemeSwitcher() ne double-bind pas le listener (dataset.bound)', () => {
    const { window, document, select } = setup();
    window.__initThemeSwitcher();
    window.__initThemeSwitcher(); // 2e appel -- doit no-op sur ce select deja bound
    select.value = 'acssi';
    select.dispatchEvent(new window.Event('change'));
    // Si le listener etait double-bind, on aurait 2 toasts pour 1 seul changement.
    expect(document.querySelectorAll('.toast').length).toBe(1);
  });

  it('bascule automatiquement le mode si le mode courant est incompatible avec le nouveau theme', () => {
    // THEME_CONFIG (var top-level -> propriete de window sous jsdom, cf.
    // dom.window.eval indirect) est mute directement pour simuler un theme
    // sans mode sombre -- aucun des 3 themes reels du DS n'a ce cas
    // aujourd'hui (msyx/acssi/nhood ont tous dark+light), mais la branche
    // de compat existe bel et bien dans le code et doit rester exercee.
    const { window, document, select, modeSwitch } = setup();
    window.THEME_CONFIG.acssi = { modes: ['light'], defaultMode: 'light' };
    document.documentElement.setAttribute('data-mode', 'dark'); // incompatible avec acssi light-only
    window.__initThemeSwitcher();
    select.value = 'acssi';
    select.dispatchEvent(new window.Event('change'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    expect(window.localStorage.getItem('msyx-mode')).toBe('light');
    expect(modeSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('ne touche pas au mode si le mode courant reste compatible avec le nouveau theme', () => {
    const { window, document, select } = setup();
    document.documentElement.setAttribute('data-mode', 'light');
    window.__initThemeSwitcher();
    select.value = 'acssi'; // acssi supporte dark+light par defaut -- pas de switch force
    select.dispatchEvent(new window.Event('change'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });

  it('localStorage qui leve (mode prive strict, cf. #793 cote React) ne bloque pas le changement de theme', () => {
    // jsdom expose window.localStorage.setItem = fn comme un assignement
    // ineffectif (Storage est backed par un Proxy special-casant les noms
    // de methode connus -- verifie empiriquement) : le SEUL levier fiable
    // pour simuler un throw est vi.spyOn sur Storage.prototype.setItem.
    vi.useFakeTimers();
    try {
      const { window, document, select, modeSwitch } = setup();
      window.__initThemeSwitcher();
      const spy = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => {
        throw new window.DOMException('QuotaExceededError');
      });
      try {
        select.value = 'acssi';
        expect(() => select.dispatchEvent(new window.Event('change'))).not.toThrow();
        // L'attribut data-theme doit malgre tout etre applique (effet visuel
        // prioritaire sur la persistance, qui est un best-effort).
        expect(document.documentElement.getAttribute('data-theme')).toBe('acssi');
        // La classe de transition ne doit pas rester bloquee indefiniment --
        // le setTimeout(300) doit toujours avoir ete programme malgre le throw.
        vi.advanceTimersByTime(300);
        expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false);
        // Le mode-switch doit rester synchronise malgre l'echec de persistance.
        expect(modeSwitch.getAttribute('aria-checked')).toBe('true'); // dark par defaut, inchange
        // Le toast de confirmation doit toujours s'afficher.
        expect(document.querySelector('.toast')).not.toBeNull();
      } finally {
        spy.mockRestore();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
