// Tests -- initMentionInput (#744, vague 14/N couverture tests vanilla)
//
// Expose directement via window.__initMentionInput (shared/components.js).
// Markup repris de la demo reelle (pages/feedback.html#mention) :
// .mention-input-wrap > textarea[data-mention-source] (CSV ou JSON fourni
// par le consumer) + .mention-dropdown (role=listbox, rempli dynamiquement).
//
// Durci contre une XSS (#746, meme famille que highlightMatch() partagee
// avec initSearchInputs()) : le nom d'un mentionnable est toujours rendu
// via highlightMatch() -> createTextNode/appendChild, jamais via innerHTML
// concatene. Verifie ici avec un mentionnable dont le nom contient des
// caracteres de balisage.
import { describe, it, expect, vi } from 'vitest';
import { loadComponentsWindow, fireKeydown } from './helpers/load-components.js';

function wrapHtml(source) {
  return `
    <div class="mention-input-wrap">
      <textarea class="input" data-mention-source="${source}" placeholder="Tapez @ pour mentionner…" rows="3"></textarea>
    </div>
  `;
}

function setup(source = 'Alice Martin,Bob Durand,Carla Nguyen') {
  const dom = loadComponentsWindow(wrapHtml(source));
  const { window } = dom;
  const { document } = window;
  const textarea = document.querySelector('textarea');
  return { window, document, textarea, dropdown: () => document.querySelector('.mention-dropdown') };
}

// Simule la frappe : pose .value (le curseur va en fin de valeur sous jsdom,
// comme dans un vrai navigateur), puis dispatch 'input' (c'est cet
// evenement qui declenche detectToken() -> openDropdown()).
function typeValue(window, textarea, value) {
  textarea.value = value;
  textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
}

describe('initMentionInput -- declenchement au @', () => {
  it('taper "@" seul ouvre le dropdown avec tous les mentionnables (query vide = tout matche)', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, '@');
    const dd = dropdown();
    expect(dd.classList.contains('open')).toBe(true);
    expect(textarea.getAttribute('aria-expanded')).toBe('true');
    expect(dd.querySelectorAll('.search-item').length).toBe(3);
  });

  it('un dropdown est cree si absent du markup, avec role=listbox + aria-label', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    const dd = dropdown();
    expect(dd).not.toBeNull();
    expect(dd.getAttribute('role')).toBe('listbox');
    expect(dd.getAttribute('aria-label')).toBe('Suggestions de mention');
    expect(textarea.getAttribute('aria-controls')).toBe(dd.id);
  });

  it('taper du texte sans @ ne declenche rien (dropdown reste ferme)', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, 'Bonjour tout le monde');
    expect(dropdown().classList.contains('open')).toBe(false);
    expect(textarea.getAttribute('aria-expanded')).toBe('false');
  });

  it('un @ colle a un mot (pas precede d\'espace/debut) ne declenche rien (regex ^|\\s)', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, 'email@');
    expect(dropdown().classList.contains('open')).toBe(false);
  });

  it('aucun resultat affiche un message "Aucun resultat"', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, '@zzz');
    const dd = dropdown();
    expect(dd.querySelector('.search-no-result')).not.toBeNull();
    expect(dd.querySelector('.search-no-result').textContent).toBe('Aucun résultat pour "zzz"');
  });
});

describe('initMentionInput -- filtrage', () => {
  it('filtre les mentionnables par substring insensible a la casse', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, '@al');
    const items = dropdown().querySelectorAll('.search-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Alice Martin');
  });

  it('continuer a taper affine le filtre (dropdown deja ouvert)', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, '@a');
    expect(dropdown().querySelectorAll('.search-item').length).toBeGreaterThan(1);
    typeValue(window, textarea, '@al');
    expect(dropdown().querySelectorAll('.search-item').length).toBe(1);
  });
});

describe('initMentionInput -- insertion', () => {
  it('mousedown sur un item l\'insere dans le textarea (remplace le token @query par "@Nom ") et ferme le dropdown', () => {
    const { window, document, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, 'Salut @al');
    const item = dropdown().querySelector('.search-item');
    item.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(textarea.value).toBe('Salut @Alice Martin ');
    expect(dropdown().classList.contains('open')).toBe(false);
    expect(textarea.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(textarea);
  });

  it('Entree insere l\'item actif (apres ArrowDown) et ferme le dropdown', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, 'Salut @');
    fireKeydown(window, textarea, 'ArrowDown');
    const evt = fireKeydown(window, textarea, 'Enter');
    expect(evt.defaultPrevented).toBe(true);
    expect(textarea.value).toBe('Salut @Alice Martin ');
    expect(dropdown().classList.contains('open')).toBe(false);
  });

  it('Entree sans item actif (aucun ArrowDown prealable) n\'insere rien', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, 'Salut @');
    fireKeydown(window, textarea, 'Enter');
    expect(textarea.value).toBe('Salut @');
    expect(dropdown().classList.contains('open')).toBe(true);
  });

  it('ArrowDown/ArrowUp deplacent l\'item actif (.active + aria-selected + aria-activedescendant)', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, '@');
    fireKeydown(window, textarea, 'ArrowDown');
    let items = dropdown().querySelectorAll('.search-item');
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[0].getAttribute('aria-selected')).toBe('true');
    expect(textarea.getAttribute('aria-activedescendant')).toBe(items[0].id);

    fireKeydown(window, textarea, 'ArrowDown');
    items = dropdown().querySelectorAll('.search-item');
    expect(items[0].classList.contains('active')).toBe(false);
    expect(items[1].classList.contains('active')).toBe(true);

    fireKeydown(window, textarea, 'ArrowUp');
    items = dropdown().querySelectorAll('.search-item');
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[1].classList.contains('active')).toBe(false);
  });
});

describe('initMentionInput -- Echap', () => {
  it('Echap ferme le dropdown sans rien inserer', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    typeValue(window, textarea, 'Salut @al');
    const evt = fireKeydown(window, textarea, 'Escape');
    expect(evt.defaultPrevented).toBe(true);
    expect(dropdown().classList.contains('open')).toBe(false);
    expect(textarea.value).toBe('Salut @al');
    expect(textarea.hasAttribute('aria-activedescendant')).toBe(false);
  });
});

describe('initMentionInput -- fermeture au blur', () => {
  it('la perte de focus ferme le dropdown apres le delai (150ms)', () => {
    vi.useFakeTimers();
    try {
      const { window, textarea, dropdown } = setup();
      window.__initMentionInput();
      typeValue(window, textarea, '@');
      expect(dropdown().classList.contains('open')).toBe(true);
      textarea.dispatchEvent(new window.Event('blur', { bubbles: true }));
      expect(dropdown().classList.contains('open')).toBe(true); // pas immediat
      vi.advanceTimersByTime(150);
      expect(dropdown().classList.contains('open')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('initMentionInput -- XSS (#746, durcissement highlightMatch)', () => {
  it('un mentionnable contenant des caracteres de balisage est rendu comme TEXTE, jamais interprete', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const source = JSON.stringify([payload, 'Bruno']);
    const { window, textarea, dropdown } = setup(source.replace(/"/g, '&quot;'));
    window.__initMentionInput();
    typeValue(window, textarea, '@'); // query vide -> tous les mentionnables matchent
    const dd = dropdown();
    // Aucun element <img> reel ne doit avoir ete cree a partir du payload.
    expect(dd.querySelector('img')).toBeNull();
    // Le texte brut, lui, doit bien apparaitre tel quel (rendu comme donnee,
    // pas interprete comme markup).
    expect(dd.textContent).toContain(payload);
  });

  it('l\'insertion d\'un mentionnable a caracteres speciaux ne casse pas le textarea (valeur texte simple)', () => {
    const payload = '<b>Bold</b>';
    const source = JSON.stringify([payload]).replace(/"/g, '&quot;');
    const { window, textarea, dropdown } = setup(source);
    window.__initMentionInput();
    typeValue(window, textarea, '@');
    const item = dropdown().querySelector('.search-item');
    item.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(textarea.value).toBe('@' + payload + ' ');
  });
});

describe('initMentionInput -- idempotence', () => {
  it('un second appel initMentionInput() ne double-bind pas (dataset.bound)', () => {
    const { window, textarea, dropdown } = setup();
    window.__initMentionInput();
    window.__initMentionInput();
    typeValue(window, textarea, '@');
    // Si double-bind, openDropdown() serait appele 2x mais dropdown.innerHTML
    // est reinitialise a chaque appel -- le nombre d'items resterait correct
    // (3), donc on verifie plutot qu'un seul dropdown a ete cree (pas 2).
    expect(window.document.querySelectorAll('.mention-dropdown').length).toBe(1);
    expect(dropdown().querySelectorAll('.search-item').length).toBe(3);
  });
});
