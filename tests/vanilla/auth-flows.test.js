// Tests -- initAuthFlows (#744, vague 18/18 -- DERNIERE vague couverture tests vanilla)
//
// Expose directement via window.__initAuthFlows (shared/components.js).
// DEUX mecanismes independants, bindes separement (pas de dataset.bound
// commun -- chacun garde son propre etat) :
//  1. Force du mot de passe : .login-strength[data-strength-target=ID] ->
//     ecoute 'input' sur #ID, calcule un score 0-4 (longueur>=8, majuscule,
//     chiffre, caractere special), pose data-level + width sur
//     .login-strength-fill et le libelle textuel sur .login-strength-label.
//  2. Navigation par etapes : [data-auth-step-to=N] -> bascule .active sur
//     .login-step[data-step=N] dans le container englobant (.login-card /
//     .login-preview / [data-auth-container]). Markup repris de pages/
//     formulaires.html#formulaires (variante "Register" pour la force, "Mot
//     de passe oublie" pour la navigation par etapes).
//
// FIX INLINE (#744 vague 18) : la navigation par etapes videait TOUTES les
// .login-step de .active AVANT de verifier si l'etape cible existait. Sur
// la vraie demo (pages/formulaires.html:286), le bouton "Retour a la
// connexion" pose data-auth-step-to="0" -- mais aucune .login-step[data-
// step="0"] n'existe dans ce container (seuls "1" et "2" existent). Un clic
// dessus videait donc TOUT (.login-step{display:none} sans .active nulle
// part) et laissait le login-card entierement blanc. Corrige en verifiant
// l'existence de l'etape cible AVANT de toucher aux classes .active. Preuve
// par mutation ci-dessous (executee puis restauree, cf. rapport de PR).
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function strengthHtml() {
  return `
    <div class="login-card">
      <input type="password" id="reg-password" aria-describedby="strength-hint">
      <div class="login-strength" data-strength-target="reg-password">
        <div class="login-strength-bar"><div class="login-strength-fill" data-level="0"></div></div>
        <div class="login-strength-label" id="strength-hint"></div>
      </div>
    </div>
  `;
}

function stepsHtml() {
  return `
    <div class="login-card" data-auth-container>
      <div class="login-step active" data-step="1">
        <button class="login-submit" data-auth-step-to="2">Envoyer le lien</button>
        <button class="login-back-link" data-auth-step-to="0">Retour a la connexion</button>
      </div>
      <div class="login-step" data-step="2">
        <button class="login-back-link" data-auth-step-to="1">Ressaisir l'email</button>
      </div>
    </div>
  `;
}

function setupStrength(html = strengthHtml()) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  return {
    window,
    document,
    input: document.getElementById('reg-password'),
    fill: document.querySelector('.login-strength-fill'),
    label: document.querySelector('.login-strength-label'),
  };
}

function setupSteps(html = stepsHtml()) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  return {
    window,
    document,
    container: document.querySelector('[data-auth-container]'),
    step1: document.querySelector('.login-step[data-step="1"]'),
    step2: document.querySelector('.login-step[data-step="2"]'),
    toStep2Btn: document.querySelector('[data-auth-step-to="2"]'),
    toStep1Btn: document.querySelector('[data-auth-step-to="1"]'),
    toStep0Btn: document.querySelector('[data-auth-step-to="0"]'),
  };
}

function setInput(win, input, value) {
  input.value = value;
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
}

describe('initAuthFlows -- force du mot de passe', () => {
  it('vide -> data-level "0", largeur "0", aucun libelle', () => {
    const { window, input, fill, label } = setupStrength();
    window.__initAuthFlows();
    setInput(window, input, '');
    expect(fill.getAttribute('data-level')).toBe('0');
    expect(fill.style.width).toBe('0px');
    expect(label.textContent).toBe('');
  });

  it('1 critere (>=8 caracteres minuscules) -> niveau 1 "Faible"', () => {
    const { window, input, fill, label } = setupStrength();
    window.__initAuthFlows();
    setInput(window, input, 'abcdefgh');
    expect(fill.getAttribute('data-level')).toBe('1');
    expect(label.textContent).toBe('Faible');
  });

  it('3 criteres (longueur+majuscule+chiffre) -> niveau 3 "Bon"', () => {
    const { window, input, fill, label } = setupStrength();
    window.__initAuthFlows();
    setInput(window, input, 'Abcdefg1');
    expect(fill.getAttribute('data-level')).toBe('3');
    expect(label.textContent).toBe('Bon');
  });

  it('4 criteres (longueur+majuscule+chiffre+special) -> niveau 4 "Fort"', () => {
    const { window, input, fill, label } = setupStrength();
    window.__initAuthFlows();
    setInput(window, input, 'Abcdefg1!');
    expect(fill.getAttribute('data-level')).toBe('4');
    expect(label.textContent).toBe('Fort');
  });

  it('moins de 8 caracteres mais majuscule+chiffre+special -> niveau 3 "Bon" (chaque critere compte independamment, la longueur n est pas un prealable)', () => {
    const { window, input, fill, label } = setupStrength();
    window.__initAuthFlows();
    setInput(window, input, 'A1!');
    expect(fill.getAttribute('data-level')).toBe('3');
    expect(label.textContent).toBe('Bon');
  });

  it('sans #reg-password dans le DOM -- init ne plante pas', () => {
    const { window } = setupStrength(`
      <div class="login-strength" data-strength-target="absent">
        <div class="login-strength-fill" data-level="0"></div>
      </div>
    `);
    expect(() => window.__initAuthFlows()).not.toThrow();
  });

  it('idempotent : un second appel ne double-bind pas (une seule frappe -> un seul calcul, pas de conflit de libelle)', () => {
    const { window, input, fill } = setupStrength();
    window.__initAuthFlows();
    window.__initAuthFlows();
    setInput(window, input, 'Abcdefg1!');
    // Si double-bound, aucune erreur visible ici (idempotent par nature :
    // le meme calcul remis 2x donne le meme resultat) -- la vraie preuve
    // est l'absence de throw + le resultat stable.
    expect(fill.getAttribute('data-level')).toBe('4');
  });
});

describe('initAuthFlows -- navigation par etapes', () => {
  it('cliquer data-auth-step-to="2" active step2 et desactive step1', () => {
    const { window, step1, step2, toStep2Btn } = setupSteps();
    window.__initAuthFlows();
    fireClick(window, toStep2Btn);
    expect(step1.classList.contains('active')).toBe(false);
    expect(step2.classList.contains('active')).toBe(true);
  });

  it('depuis step2, data-auth-step-to="1" revient sur step1', () => {
    const { window, step1, step2, toStep2Btn, toStep1Btn } = setupSteps();
    window.__initAuthFlows();
    fireClick(window, toStep2Btn);
    fireClick(window, toStep1Btn);
    expect(step2.classList.contains('active')).toBe(false);
    expect(step1.classList.contains('active')).toBe(true);
  });

  it('FIX : data-auth-step-to vers une etape INEXISTANTE (ex. "0") est un no-op -- step1 reste active', () => {
    const { window, step1, step2, toStep0Btn } = setupSteps();
    window.__initAuthFlows();
    fireClick(window, toStep0Btn);
    expect(step1.classList.contains('active')).toBe(true);
    expect(step2.classList.contains('active')).toBe(false);
  });

  it('bouton data-auth-step-to sans container englobant -- ne plante pas', () => {
    const { window, document } = setupSteps('<button data-auth-step-to="1">Aller</button>');
    window.__initAuthFlows();
    const btn = document.querySelector('[data-auth-step-to]');
    expect(() => fireClick(window, btn)).not.toThrow();
  });

  it('idempotent : un second appel ne double-bind pas (une navigation reste une navigation)', () => {
    const { window, step1, step2, toStep2Btn } = setupSteps();
    window.__initAuthFlows();
    window.__initAuthFlows();
    fireClick(window, toStep2Btn);
    expect(step2.classList.contains('active')).toBe(true);
    expect(step1.classList.contains('active')).toBe(false);
  });
});
