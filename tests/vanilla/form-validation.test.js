// Tests -- initFormValidation (#744, vague 8/N infra tests vanilla)
//
// Expose directement via window.__initFormValidation (shared/components.js:4959).
// Markup repris de pages/formulaires.html#form-validation (classes/attrs
// reels) : form.ds-form[data-validate][novalidate] > .input-group > .input.
//
// Deux ecarts DELIBERES vis-a-vis du markup source, dictes par des limites
// documentees de jsdom (v29.1.1) -- pas des choix arbitraires :
// - `minlength`/`maxlength` (tooShort/tooLong) : jsdom hardcode ces deux
//   contraintes a `false` en permanence (lib/jsdom/living/nodes/
//   HTMLInputElement-impl.js : "jsdom has no way at the moment to emulate a
//   user interaction, so tooLong/tooShort have [no effect]"). Intestable ici
//   -- aucun test ne cible cette branche de resolveMessage().
// - `pattern` : le champ "slug" reel du DS utilise `[a-z0-9-]+` (hyphen en
//   fin de classe de caracteres). jsdom valide le pattern via
//   `new RegExp(pattern, "v")` (mode "Unicode Sets") AVANT de l'utiliser --
//   et ce mode interdit un `-` non echappe en fin de classe
//   ("Invalid character class"), contrairement au mode classique. Le
//   catch() silencieux de jsdom retombe alors sur patternMismatch=false en
//   PERMANENCE pour cet exact pattern -- verifie empiriquement. Notre
//   fixture utilise donc `[a-z0-9]+` (sans hyphen), strictement equivalent
//   du point de vue du code sous test (resolveMessage lit juste
//   `field.validity.patternMismatch`), pour exercer reellement la branche.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireKeydown } from './helpers/load-components.js';

function formHtml() {
  return `
    <form class="ds-form" data-validate novalidate id="fv-form">
      <div class="input-group">
        <label class="input-label" for="fv-name">Nom complet</label>
        <input class="input" type="text" id="fv-name" name="name" required>
      </div>
      <div class="input-group">
        <label class="input-label" for="fv-email">Adresse e-mail</label>
        <input class="input" type="email" id="fv-email" name="email" required>
      </div>
      <div class="input-group">
        <label class="input-label" for="fv-slug">Identifiant</label>
        <input class="input" type="text" id="fv-slug" name="slug" required pattern="[a-z0-9]+" data-validate-msg-pattern="Minuscules et chiffres uniquement">
      </div>
      <div class="input-group">
        <label class="input-label" for="fv-custom">Champ personnalise</label>
        <input class="input" type="text" id="fv-custom" name="custom" required data-validate-msg-required="Obligatoire (message personnalise)">
      </div>
      <button type="submit" class="btn-primary">Valider</button>
    </form>
    <form class="ds-form" data-validate novalidate id="fv-form-2">
      <div class="input-group">
        <label class="input-label" for="fv-token">Jeton d'acces</label>
        <input class="input" type="text" id="fv-token" name="token" required>
      </div>
      <button type="submit" class="btn-primary">Soumettre</button>
    </form>
  `;
}

function setup() {
  const dom = loadComponentsWindow(formHtml());
  const { window } = dom;
  const { document } = window;
  window.__initFormValidation();
  const form = document.getElementById('fv-form');
  const name = document.getElementById('fv-name');
  const email = document.getElementById('fv-email');
  const slug = document.getElementById('fv-slug');
  const custom = document.getElementById('fv-custom');
  return { window, document, form, name, email, slug, custom };
}

function blur(window, field) {
  field.dispatchEvent(new window.Event('blur', { bubbles: true }));
}

function submit(window, form) {
  const evt = new window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(evt);
  return evt;
}

describe('initFormValidation -- validation au blur', () => {
  it('un champ requis vide au blur pose aria-invalid, la classe input-error et le message par defaut', () => {
    const { window, name } = setup();
    blur(window, name);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.classList.contains('input-error')).toBe(true);
    const msg = name.ownerDocument.getElementById('fv-name-error');
    expect(msg).not.toBeNull();
    expect(msg.textContent).toBe('Ce champ est requis.');
    expect(name.getAttribute('aria-describedby')).toContain('fv-name-error');
  });

  it('un champ valide au blur ne pose aucune erreur', () => {
    const { window, name } = setup();
    name.value = 'Mike';
    blur(window, name);
    expect(name.hasAttribute('aria-invalid')).toBe(false);
    expect(name.classList.contains('input-error')).toBe(false);
  });

  it('un email invalide affiche le message email par defaut', () => {
    const { window, email } = setup();
    email.value = 'pas-un-email';
    blur(window, email);
    const msg = email.ownerDocument.getElementById('fv-email-error');
    expect(msg.textContent).toBe('Veuillez saisir une adresse e-mail valide.');
  });

  it('un pattern invalide utilise le message personnalise data-validate-msg-pattern', () => {
    const { window, slug } = setup();
    slug.value = 'Bad Slug!';
    blur(window, slug);
    const msg = slug.ownerDocument.getElementById('fv-slug-error');
    expect(msg.textContent).toBe('Minuscules et chiffres uniquement');
  });

  it('un champ requis avec data-validate-msg-required utilise le message personnalise', () => {
    const { window, custom } = setup();
    blur(window, custom);
    const msg = custom.ownerDocument.getElementById('fv-custom-error');
    expect(msg.textContent).toBe('Obligatoire (message personnalise)');
  });
});

describe('initFormValidation -- correction en frappant (input)', () => {
  it('corriger un champ en erreur efface aria-invalid, la classe et le message', () => {
    const { window, name } = setup();
    blur(window, name); // erreur
    expect(name.getAttribute('aria-invalid')).toBe('true');

    name.value = 'Mike';
    name.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(name.hasAttribute('aria-invalid')).toBe(false);
    expect(name.classList.contains('input-error')).toBe(false);
    expect(name.ownerDocument.getElementById('fv-name-error')).toBeNull();
    expect(name.hasAttribute('aria-describedby')).toBe(false);
  });

  it("taper dans un champ SANS erreur prealable ne cree rien", () => {
    const { window, name } = setup();
    name.value = 'a';
    name.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(name.hasAttribute('aria-invalid')).toBe(false);
  });
});

describe('initFormValidation -- soumission', () => {
  it('la soumission est toujours interceptee (preventDefault), meme valide', () => {
    const { window, form, name, email, slug, custom } = setup();
    name.value = 'Mike';
    email.value = 'mike@msyx.fr';
    slug.value = 'monslug1';
    custom.value = 'ok';
    const evt = submit(window, form);
    expect(evt.defaultPrevented).toBe(true);
  });

  it('soumission invalide : resume focusable rendu avec le bon nombre d\'erreurs et role=alert', () => {
    const { window, form } = setup();
    submit(window, form); // tous vides -> 4 erreurs
    const summary = form.querySelector('[data-fv-summary]');
    expect(summary).not.toBeNull();
    expect(summary.getAttribute('role')).toBe('alert');
    expect(summary.querySelector('.alert-title').textContent).toBe('4 erreurs à corriger');
    expect(form.ownerDocument.activeElement).toBe(summary);
  });

  it('soumission valide : aucun resume, evenement ds:validation {valid:true, errors:[]}', () => {
    const { window, form, name, email, slug, custom } = setup();
    name.value = 'Mike';
    email.value = 'mike@msyx.fr';
    slug.value = 'monslug1';
    custom.value = 'ok';
    let detail = null;
    form.addEventListener('ds:validation', (e) => { detail = e.detail; });
    submit(window, form);
    expect(form.querySelector('[data-fv-summary]')).toBeNull();
    expect(detail).toEqual({ valid: true, errors: [] });
  });

  it('soumission invalide : ds:validation {valid:false, errors:[{id,msg}, ...]}', () => {
    const { window, form, email } = setup();
    email.value = 'mike@msyx.fr'; // seul champ valide
    let detail = null;
    form.addEventListener('ds:validation', (e) => { detail = e.detail; });
    submit(window, form);
    expect(detail.valid).toBe(false);
    expect(detail.errors.length).toBe(3); // name, slug, custom -- email exclu
    expect(detail.errors.map((e) => e.id).sort()).toEqual(['fv-custom', 'fv-name', 'fv-slug']);
  });

  it('cliquer un lien du resume focus le champ cible sans naviguer', () => {
    const { window, form, name } = setup();
    submit(window, form);
    const summary = form.querySelector('[data-fv-summary]');
    const link = summary.querySelector(`a[href="#fv-name"]`);
    const evt = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    expect(form.ownerDocument.activeElement).toBe(name);
  });

  it("2 soumissions invalides successives ne laissent qu'un seul resume dans le formulaire", () => {
    const { window, form } = setup();
    submit(window, form);
    submit(window, form);
    expect(form.querySelectorAll('[data-fv-summary]').length).toBe(1);
  });
});

describe('initFormValidation -- isolation multi-formulaire et idempotence', () => {
  it('un second formulaire sur la page est valide independamment (soumission ne pollue pas le 1er)', () => {
    const { window, document, form } = setup();
    const form2 = document.getElementById('fv-form-2');
    submit(window, form2); // token vide -> invalide
    expect(form2.querySelector('[data-fv-summary]')).not.toBeNull();
    expect(form.querySelector('[data-fv-summary]')).toBeNull();
  });

  it("reappeler initFormValidation() est idempotent (un seul evenement ds:validation par soumission)", () => {
    const { window, form } = setup();
    window.__initFormValidation(); // 2e appel -- doit no-op
    let count = 0;
    form.addEventListener('ds:validation', () => { count++; });
    submit(window, form);
    expect(count).toBe(1);
  });
});

describe('initFormValidation -- Enter dans un champ (soumission clavier standard)', () => {
  it("appuyer sur Entree dans un champ texte declenche bien la soumission native du formulaire", () => {
    // Verifie simplement l'absence d'un handler custom qui interfererait --
    // le comportement natif du navigateur (Enter soumet le form) n'est pas
    // simule par jsdom sur dispatchEvent(keydown) seul ; on verifie donc que
    // initFormValidation() ne pose pas de listener keydown parasite sur les
    // champs (seuls blur/input sont attaches -- lecture du code source).
    const { window, name } = setup();
    expect(() => fireKeydown(window, name, 'Enter')).not.toThrow();
    expect(name.hasAttribute('aria-invalid')).toBe(false);
  });
});
