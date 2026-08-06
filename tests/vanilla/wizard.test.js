// Tests -- initWizard (#744, vague 10/N couverture tests vanilla)
//
// Expose via window.__initWizard (shared/components.js:4207). Markup repris
// de pages/formulaires.html#wizard (classes/attrs reels), reduit a 3 etapes
// pour la lisibilite des fixtures (la logique de initWizard() est generique
// au nombre de `.wizard-panel`, verifie sur le fichier source -- aucune
// hypothese "4 etapes" en dur).
//
// initWizard() ne valide AUCUN champ avant d'avancer (lu dans le code
// source : le listener de .wizard-next ne consulte ni checkValidity() ni
// aucun attribut data-*) -- la seule "validation de passage" reellement
// implementee est la garde de bornes (impossible de reculer avant l'etape 0
// ou d'avancer au-dela de la derniere). C'est ce qui est couvert ici ; aucun
// test n'est ecrit pour une validation de formulaire par etape qui n'existe
// pas dans le code.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function wizardHtml() {
  return `
    <div class="wizard" id="demo-wizard">
      <div class="wizard-steps" role="list">
        <div class="wizard-step active" data-step="0" role="listitem" aria-current="step">
          <div class="wizard-step-dot">1</div>
          <span class="wizard-step-label">Profil</span>
        </div>
        <div class="wizard-step" data-step="1" role="listitem">
          <div class="wizard-step-dot">2</div>
          <span class="wizard-step-label">Projet</span>
        </div>
        <div class="wizard-step" data-step="2" role="listitem">
          <div class="wizard-step-dot">3</div>
          <span class="wizard-step-label">Confirmation</span>
        </div>
      </div>
      <div class="wizard-content">
        <div class="wizard-panel active" data-panel="0">Panel profil</div>
        <div class="wizard-panel" data-panel="1">Panel projet</div>
        <div class="wizard-panel" data-panel="2">Panel confirmation</div>
      </div>
      <div class="wizard-actions">
        <button class="btn-ghost wizard-prev" disabled>&#8592; Précédent</button>
        <span class="wizard-step-indicator">Étape 1 / 3</span>
        <button class="btn-primary wizard-next">Suivant &#8594;</button>
      </div>
    </div>
  `;
}

function setup() {
  const dom = loadComponentsWindow(wizardHtml());
  const { window } = dom;
  const { document } = window;
  window.__initWizard();
  const wiz = document.getElementById('demo-wizard');
  const steps = wiz.querySelectorAll('.wizard-step');
  const panels = wiz.querySelectorAll('.wizard-panel');
  const prevBtn = wiz.querySelector('.wizard-prev');
  const nextBtn = wiz.querySelector('.wizard-next');
  const indicator = wiz.querySelector('.wizard-step-indicator');
  return { window, document, wiz, steps, panels, prevBtn, nextBtn, indicator };
}

describe('initWizard -- etat initial', () => {
  it("l'etape 0 est active, seul son panneau est visible, Precedent est desactive", () => {
    const { steps, panels, prevBtn, indicator } = setup();
    expect(steps[0].classList.contains('active')).toBe(true);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(panels[0].classList.contains('active')).toBe(true);
    expect(panels[1].classList.contains('active')).toBe(false);
    expect(panels[2].classList.contains('active')).toBe(false);
    expect(prevBtn.disabled).toBe(true);
    expect(indicator.textContent).toBe('Étape 1 / 3');
  });

  it('aucune autre etape ne porte aria-current', () => {
    const { steps } = setup();
    expect(steps[1].hasAttribute('aria-current')).toBe(false);
    expect(steps[2].hasAttribute('aria-current')).toBe(false);
  });
});

describe('initWizard -- navigation Suivant', () => {
  it('Suivant avance a l-etape 1 : etape 0 devient completed, etape 1 devient active+aria-current', () => {
    const { window, steps, panels, prevBtn, indicator, nextBtn } = setup();
    fireClick(window, nextBtn);
    expect(steps[0].classList.contains('active')).toBe(false);
    expect(steps[0].classList.contains('completed')).toBe(true);
    expect(steps[1].classList.contains('active')).toBe(true);
    expect(steps[1].getAttribute('aria-current')).toBe('step');
    expect(steps[0].hasAttribute('aria-current')).toBe(false);
    expect(panels[0].classList.contains('active')).toBe(false);
    expect(panels[1].classList.contains('active')).toBe(true);
    expect(prevBtn.disabled).toBe(false);
    expect(indicator.textContent).toBe('Étape 2 / 3');
  });

  it('sur la derniere etape, le bouton Suivant devient "Terminer" et Precedent reste actif', () => {
    const { window, nextBtn, prevBtn, indicator, steps } = setup();
    fireClick(window, nextBtn); // -> 1
    fireClick(window, nextBtn); // -> 2 (derniere)
    expect(nextBtn.textContent).toBe('Terminer');
    expect(prevBtn.disabled).toBe(false);
    expect(indicator.textContent).toBe('Étape 3 / 3');
    expect(steps[2].classList.contains('active')).toBe(true);
    expect(steps[0].classList.contains('completed')).toBe(true);
    expect(steps[1].classList.contains('completed')).toBe(true);
  });

  it('cliquer "Terminer" sur la derniere etape reinitialise le wizard a l-etape 0', () => {
    const { window, nextBtn, prevBtn, indicator, steps, panels } = setup();
    fireClick(window, nextBtn); // -> 1
    fireClick(window, nextBtn); // -> 2
    fireClick(window, nextBtn); // Terminer -> reset

    expect(steps[0].classList.contains('active')).toBe(true);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    // Reset complet : plus aucune etape "completed" apres Terminer.
    expect(steps[1].classList.contains('completed')).toBe(false);
    expect(steps[2].classList.contains('completed')).toBe(false);
    expect(steps[1].hasAttribute('aria-current')).toBe(false);
    expect(steps[2].hasAttribute('aria-current')).toBe(false);
    expect(panels[0].classList.contains('active')).toBe(true);
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.textContent).toBe('Suivant →');
    expect(indicator.textContent).toBe('Étape 1 / 3');
  });
});

describe('initWizard -- navigation Precedent', () => {
  it('Precedent recule d-une etape et desactive de nouveau le bouton Precedent a l-etape 0', () => {
    const { window, prevBtn, nextBtn, steps, panels, indicator } = setup();
    fireClick(window, nextBtn); // -> 1
    fireClick(window, prevBtn); // -> 0
    expect(steps[0].classList.contains('active')).toBe(true);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(panels[0].classList.contains('active')).toBe(true);
    expect(panels[1].classList.contains('active')).toBe(false);
    expect(prevBtn.disabled).toBe(true);
    expect(indicator.textContent).toBe('Étape 1 / 3');
  });

  it("garde de borne : cliquer Precedent alors qu-on est deja a l-etape 0 ne fait rien (meme en forcant l-evenement)", () => {
    const { window, prevBtn, steps, indicator } = setup();
    fireClick(window, prevBtn); // deja a l'etape 0 -- garde JS `current > 0`
    expect(steps[0].classList.contains('active')).toBe(true);
    expect(indicator.textContent).toBe('Étape 1 / 3');
  });
});

describe('initWizard -- isolation multi-instance et idempotence', () => {
  it('deux wizards sur la meme page sont independants', () => {
    const dom = loadComponentsWindow(wizardHtml() + wizardHtml().replace('id="demo-wizard"', 'id="demo-wizard-2"'));
    const { window } = dom;
    const { document } = window;
    window.__initWizard();
    const nextBtn1 = document.getElementById('demo-wizard').querySelector('.wizard-next');
    const indicator2 = document.getElementById('demo-wizard-2').querySelector('.wizard-step-indicator');
    fireClick(window, nextBtn1);
    expect(indicator2.textContent).toBe('Étape 1 / 3');
  });

  it('reappeler initWizard() est idempotent (pas de double-avance sur un seul clic)', () => {
    const { window, nextBtn, indicator } = setup();
    window.__initWizard(); // 2e appel -- doit no-op (dataset.bound)
    fireClick(window, nextBtn);
    expect(indicator.textContent).toBe('Étape 2 / 3');
  });
});
