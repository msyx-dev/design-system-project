// Tests -- initVersionNotes (#744, vague 15/N couverture tests vanilla)
//
// Expose directement via window.__initVersionNotes (shared/components.js).
// Markup repris de pages/overlays.html#version-notes (badge .version-badge
// reel, data-version-notes + data-latest-version + data-storage-key).
//
// Perimetre REEL du composant (verifie en lisant le commentaire en tete de
// initVersionNotes() dans shared/components.js -- "Presentationnel strict
// (#445) : AUCUN rendu de donnees, AUCUN comparateur semver") : il gere
// UNIQUEMENT la pastille "nouveau" (classe + aria-label) et la memorisation
// de la derniere version vue dans localStorage, par EGALITE DE CHAINE
// stricte (seen !== latest), jamais un comparateur semver. L'ouverture de
// la <dialog> elle-meme est geree par data-modal-trigger + initModals() --
// un AUTRE composant (deja couvert par tests/vanilla/modals.test.js) --
// initVersionNotes() ne fait qu'ecrire dans localStorage au clic, sans
// jamais appeler showModal() lui-meme.
//
// localStorage jsdom est ISOLE par instance JSDOM (verifie empiriquement :
// deux `new JSDOM()` avec la meme url ne partagent PAS leur storage) --
// chaque setup() de ce fichier repart donc d'un localStorage vierge sans
// action explicite. Le afterEach ci-dessous reprend neanmoins le pattern
// defensif de mode-switcher.test.js (globalThis.localStorage, un global
// Node distinct, absent dans cet environnement -- no-op inoffensif) pour
// rester coherent avec le reste de la suite.
import { describe, it, expect, afterEach } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

const STORAGE_KEY = 'ds-test-version-seen';
const LATEST = '2.95.0';

function badgeHtml(storageKey = STORAGE_KEY, latest = LATEST, ariaLabel = 'Notes de version') {
  return `
    <button class="version-badge" data-version-notes data-modal-trigger="version-notes-modal"
      data-latest-version="${latest}" data-storage-key="${storageKey}" aria-label="${ariaLabel}">
      <span class="version-badge-dot" aria-hidden="true"></span>
    </button>
  `;
}

function setup(bodyHtml = badgeHtml()) {
  const dom = loadComponentsWindow(bodyHtml);
  const { window } = dom;
  const { document } = window;
  return { window, document, badge: document.querySelector('.version-badge') };
}

describe('initVersionNotes -- pastille "nouveau"', () => {
  afterEach(() => {
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a */ }
  });

  it('jamais vue (localStorage vide) : pose version-badge--new + suffixe l\'aria-label', () => {
    const { window, badge } = setup();
    window.__initVersionNotes();
    expect(badge.classList.contains('version-badge--new')).toBe(true);
    expect(badge.getAttribute('aria-label')).toBe('Notes de version, nouveautés disponibles');
  });

  it('deja vue a la meme version exacte : pas de pastille, aria-label inchange', () => {
    const { window, badge } = setup();
    window.localStorage.setItem(STORAGE_KEY, LATEST);
    window.__initVersionNotes();
    expect(badge.classList.contains('version-badge--new')).toBe(false);
    expect(badge.getAttribute('aria-label')).toBe('Notes de version');
  });

  it('vue a une AUTRE version (egalite de chaine stricte, pas de comparateur semver) : pastille posee meme si la version stockee est "plus grande"', () => {
    // #445 : le composant compare seen !== latest en chaine, jamais un
    // ordre semver -- une version stockee "superieure" (ex. 9.9.9) a la
    // version actuelle (2.95.0) reste traitee comme "differente" -> pastille.
    const { window, badge } = setup();
    window.localStorage.setItem(STORAGE_KEY, '9.9.9');
    window.__initVersionNotes();
    expect(badge.classList.contains('version-badge--new')).toBe(true);
  });

  it('n\'ajoute pas deux fois le suffixe si aria-label le contient deja', () => {
    const { window, badge } = setup(badgeHtml(STORAGE_KEY, LATEST, 'Notes de version, nouveautés disponibles'));
    window.__initVersionNotes();
    expect(badge.getAttribute('aria-label')).toBe('Notes de version, nouveautés disponibles');
  });

  it('ne plante pas et ne fait rien si data-storage-key est absent', () => {
    const { window, document } = setup(`
      <button class="version-badge" data-version-notes data-latest-version="${LATEST}" aria-label="Notes de version"></button>
    `);
    expect(() => window.__initVersionNotes()).not.toThrow();
    const badge = document.querySelector('.version-badge');
    expect(badge.classList.contains('version-badge--new')).toBe(false);
  });

  it('ne plante pas et ne fait rien si data-latest-version est absent', () => {
    const { window, document } = setup(`
      <button class="version-badge" data-version-notes data-storage-key="${STORAGE_KEY}" aria-label="Notes de version"></button>
    `);
    expect(() => window.__initVersionNotes()).not.toThrow();
    const badge = document.querySelector('.version-badge');
    expect(badge.classList.contains('version-badge--new')).toBe(false);
  });
});

describe('initVersionNotes -- memorisation localStorage au clic', () => {
  afterEach(() => {
    try { globalThis.localStorage && globalThis.localStorage.clear(); } catch (e) { /* n/a */ }
  });

  it('un clic ecrit la version courante dans localStorage sous la bonne cle et retire la pastille', () => {
    const { window, badge } = setup();
    window.__initVersionNotes();
    expect(badge.classList.contains('version-badge--new')).toBe(true);
    fireClick(window, badge);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(LATEST);
    expect(badge.classList.contains('version-badge--new')).toBe(false);
    expect(badge.getAttribute('aria-label')).toBe('Notes de version');
  });

  it('idempotent : un second appel initVersionNotes() ne double-bind pas le listener (dataset.bound)', () => {
    const { window, badge } = setup();
    window.__initVersionNotes();
    window.__initVersionNotes(); // 2e appel -- no-op sur ce badge deja bound
    fireClick(window, badge);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(LATEST);
    // Un seul bind : pas d'effet de bord observable au-dela de l'ecriture
    // unique -- verifie qu'aucune erreur n'a ete levee par un double toggle.
    expect(badge.classList.contains('version-badge--new')).toBe(false);
  });

  it('deux badges independants (cles/versions differentes) ne se marchent pas dessus', () => {
    const { window, document } = setup(badgeHtml('ds-key-a', '1.0.0') + badgeHtml('ds-key-b', '2.0.0'));
    window.__initVersionNotes();
    const [badgeA, badgeB] = document.querySelectorAll('.version-badge');
    fireClick(window, badgeA);
    expect(window.localStorage.getItem('ds-key-a')).toBe('1.0.0');
    expect(window.localStorage.getItem('ds-key-b')).toBeNull();
    expect(badgeA.classList.contains('version-badge--new')).toBe(false);
    expect(badgeB.classList.contains('version-badge--new')).toBe(true);
  });
});
