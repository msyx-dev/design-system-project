// Tests -- Drawer, contrat CSS du pied (#912)
//
// Le drawer vanilla n'a aucun JS (les demos de `pages/overlays.html` sont
// pilotees par des `onclick` inline) : ce fichier ne couvre donc que le CSS.
//
// DEFAUT CORRIGE : `.drawer-footer` etait `display:flex` + `justify-content:
// flex-end` SANS `flex-wrap`. Des que les boutons ne tiennent pas sur une ligne,
// ils sortent du panneau — et comme `.drawer-panel` n'a pas d'`overflow`, ils
// sont peints A COTE du panneau, hors cadre et incliquables.
//
// Mesure Playwright sur la demo « Drawer large » (#912), AVANT correctif :
//   panneau 112px (--drawer-w-lg vaut 50% du CONTENEUR, pas de la fenetre —
//   la demo etait dans une colonne de grille a 3), bouton « Annuler »
//   entierement hors du panneau. APRES : plus aucun bouton hors cadre, y
//   compris en ajoutant une 3e action a un panneau de 320px.
//
// jsdom ne calcule aucune mise en page : on verifie donc la VALEUR calculee de
// `flex-wrap` depuis le vrai overlays.css (meme methode que les tests #866/#900).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow } from './helpers/load-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERLAYS_CSS_SOURCE = readFileSync(
  path.resolve(__dirname, '../../shared/css/components/overlays.css'),
  'utf8',
);

// Markup repris de pages/overlays.html#drawer (classes reelles).
function drawerHtml() {
  return `
    <div class="drawer-preview">
      <div class="drawer-overlay"></div>
      <div class="drawer-panel drawer-panel--lg open">
        <div class="drawer-header"><h3>Notes</h3><button class="drawer-close">&times;</button></div>
        <div class="drawer-body"><p>Contenu</p></div>
        <div class="drawer-footer">
          <button class="btn-ghost btn-sm">Annuler</button>
          <button class="btn-primary btn-sm">Sauvegarder</button>
        </div>
      </div>
    </div>
  `;
}

function loadDrawerWithRealCss() {
  const dom = loadComponentsWindow(drawerHtml());
  const { window } = dom;
  const styleEl = window.document.createElement('style');
  styleEl.textContent = OVERLAYS_CSS_SOURCE;
  window.document.head.appendChild(styleEl);
  return { window, footer: window.document.querySelector('.drawer-footer') };
}

describe('.drawer-footer -- CSS (#912, boutons hors du panneau)', () => {
  it("se replie au lieu de deborder (flex-wrap != 'nowrap')", () => {
    const { window, footer } = loadDrawerWithRealCss();
    expect(window.getComputedStyle(footer).flexWrap).not.toBe('nowrap');
  });

  it("garde l'alignement a droite des actions (justify-content inchange)", () => {
    const { window, footer } = loadDrawerWithRealCss();
    expect(window.getComputedStyle(footer).justifyContent).toBe('flex-end');
  });

  it('reste une rangee flex avec son gap (aucune autre propriete touchee)', () => {
    const { window, footer } = loadDrawerWithRealCss();
    const cs = window.getComputedStyle(footer);
    expect(cs.display).toBe('flex');
    expect(cs.gap).toBe('0.7rem');
  });
});
