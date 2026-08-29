// Tests -- Stepper (#900, CSS pur)
//
// `.stepper` n'a AUCUN JS (`jsInit: null` dans components-registry.json) :
// c'est un indicateur de progression purement declaratif. Ce fichier ne
// couvre donc que le contrat CSS, comme le bloc #866 de
// segmented-control.test.js.
//
// #900 -- `.stepper` partageait EXACTEMENT le pattern corrige sur
// `.segmented` par #866 : `overflow-x: auto` (#530) accompagne de
// `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`. La
// scrollbar etait supprimee INCONDITIONNELLEMENT, y compris quand le contenu
// deborde reellement.
//
// C'est le plus expose des trois composants concernes : `.step-line` porte
// `min-width: 30px` ET `flex: 1`, la largeur minimale d'un stepper grimpe donc
// vite avec le nombre d'etapes. Et contrairement a `.tabs`/`.segmented`, le
// stepper ne contient AUCUN element focalisable -- il n'existe strictement
// aucune porte de sortie clavier : sans scrollbar, les etapes hors champ sont
// tout simplement inatteignables a la souris comme au clavier.
//
// Methode identique au test #866 : jsdom ne calcule aucune mise en page
// (scrollWidth/clientWidth restent a 0) mais resout les VALEURS calculees
// depuis une feuille chargee en <style>. Le vrai navigation.css du repo est
// injecte (jamais duplique a la main).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NAVIGATION_CSS_SOURCE = readFileSync(
  path.resolve(__dirname, '../../shared/css/components/navigation.css'),
  'utf8',
);

// Markup repris de pages/navigation.html#stepper (classes reelles), porte a
// 5 etapes dans un conteneur etroit -- le cas ou le debordement est certain.
function stepperHtml() {
  return `
    <div style="width:320px">
      <div class="stepper">
        <div class="step"><div class="step-dot completed">1</div><span class="step-label">Projet</span></div>
        <div class="step-line completed"></div>
        <div class="step"><div class="step-dot completed">2</div><span class="step-label">Config</span></div>
        <div class="step-line completed"></div>
        <div class="step"><div class="step-dot active">3</div><span class="step-label">Deploy</span></div>
        <div class="step-line"></div>
        <div class="step"><div class="step-dot pending">4</div><span class="step-label">Recette</span></div>
        <div class="step-line"></div>
        <div class="step"><div class="step-dot pending">5</div><span class="step-label">Verif</span></div>
      </div>
    </div>
  `;
}

function loadStepperWithRealCss() {
  const dom = loadComponentsWindow(stepperHtml());
  const { window } = dom;
  const styleEl = window.document.createElement('style');
  styleEl.textContent = NAVIGATION_CSS_SOURCE;
  window.document.head.appendChild(styleEl);
  return { window, stepper: window.document.querySelector('.stepper') };
}

describe('.stepper -- CSS (#900, regression scrollbar entierement masquee)', () => {
  it("ne masque plus inconditionnellement la scrollbar (scrollbar-width != 'none')", () => {
    const { window, stepper } = loadStepperWithRealCss();
    expect(window.getComputedStyle(stepper).scrollbarWidth).not.toBe('none');
  });

  it('le mecanisme de scroll horizontal (#530) reste intact -- overflow-x:auto inchange', () => {
    const { window, stepper } = loadStepperWithRealCss();
    expect(window.getComputedStyle(stepper).overflowX).toBe('auto');
  });

  it('max-width:100% (#530) est conserve -- le stepper ne deborde jamais de son conteneur', () => {
    const { window, stepper } = loadStepperWithRealCss();
    expect(window.getComputedStyle(stepper).maxWidth).toBe('100%');
  });

  it('aucun element focalisable dans le stepper -- le scroll souris est la SEULE issue', () => {
    const { stepper } = loadStepperWithRealCss();
    const focusables = stepper.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]',
    );
    expect(focusables).toHaveLength(0);
  });
});
