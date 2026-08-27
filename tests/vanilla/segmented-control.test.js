// Tests -- initSegmentedControls (#744, vague 2 infra tests vanilla)
//
// Composant prioritaire : il a produit le defaut #613 -- le garde-fou posait
// tabindex="0" sur un <button disabled> quand aucun item n'etait .active au
// chargement, or un bouton disabled reste hors tab-order quel que soit son
// tabindex -> le groupe entier devenait inatteignable au clavier, CI verte.
// Markup repris de pages/composants.html#segmented (classes/roles reels).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { loadComponentsWindow, fireKeydown, fireClick } from './helpers/load-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NAVIGATION_CSS_PATH = path.resolve(
  __dirname,
  '../../shared/css/components/navigation.css',
);
const NAVIGATION_CSS_SOURCE = readFileSync(NAVIGATION_CSS_PATH, 'utf8');

// Instance "normale" : 1 item .active au chargement + 1 item disabled en fin
// de liste (sert aussi a verifier que la navigation clavier saute les
// disabled et boucle correctement autour d'eux).
function normalHtml() {
  return `
    <div class="segmented" aria-label="Vue">
      <div class="segmented-indicator" aria-hidden="true"></div>
      <button class="segmented-item active" type="button">Semaine</button>
      <button class="segmented-item" type="button">Mois</button>
      <button class="segmented-item" type="button" disabled>Annee</button>
    </div>
  `;
}

// Instance reproduisant EXACTEMENT le scenario #613 : aucun item .active au
// chargement, et le 1er item du DOM est disabled.
function regressionHtml() {
  return `
    <div class="segmented" aria-label="Filtre">
      <div class="segmented-indicator" aria-hidden="true"></div>
      <button class="segmented-item" type="button" disabled>Archives</button>
      <button class="segmented-item" type="button">Actifs</button>
      <button class="segmented-item" type="button">Pauses</button>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;
  window.__initSegmentedControls();
  const seg = document.querySelector('.segmented');
  const items = Array.from(seg.querySelectorAll('.segmented-item'));
  return { window, document, seg, items };
}

describe('initSegmentedControls -- instance normale (1 item actif)', () => {
  let ctx;

  beforeEach(() => {
    ctx = setup(normalHtml());
  });

  it('pose role="radiogroup" sur le conteneur (absent du markup source)', () => {
    expect(ctx.seg.getAttribute('role')).toBe('radiogroup');
  });

  it("l'item .active recoit tabindex=0/aria-checked=true, les autres -1/false", () => {
    const [semaine, mois, annee] = ctx.items;
    expect(semaine.getAttribute('tabindex')).toBe('0');
    expect(semaine.getAttribute('aria-checked')).toBe('true');
    expect(mois.getAttribute('tabindex')).toBe('-1');
    expect(mois.getAttribute('aria-checked')).toBe('false');
    expect(annee.getAttribute('tabindex')).toBe('-1');
    expect(annee.getAttribute('aria-checked')).toBe('false');
  });

  it('un clic sur un item deplace .active + aria-checked + le roving tabindex', () => {
    const { window } = ctx;
    const [semaine, mois] = ctx.items;
    fireClick(window, mois);
    expect(mois.classList.contains('active')).toBe(true);
    expect(mois.getAttribute('aria-checked')).toBe('true');
    expect(mois.getAttribute('tabindex')).toBe('0');
    expect(semaine.classList.contains('active')).toBe(false);
    expect(semaine.getAttribute('aria-checked')).toBe('false');
    expect(semaine.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowRight saute l item disabled et boucle vers le 1er item activable', () => {
    const { window, document } = ctx;
    const [semaine, mois] = ctx.items;
    fireKeydown(window, semaine, 'ArrowRight');
    expect(document.activeElement).toBe(mois);
    expect(mois.getAttribute('tabindex')).toBe('0');
    // 2e ArrowRight depuis Mois : l item disabled (Annee) est exclu de la
    // liste des items activables -> on boucle directement sur Semaine.
    fireKeydown(window, mois, 'ArrowRight');
    expect(document.activeElement).toBe(semaine);
  });

  it('ArrowLeft depuis le premier item activable boucle vers le dernier item activable (pas le disabled)', () => {
    const { window, document } = ctx;
    const [semaine, mois] = ctx.items;
    fireKeydown(window, semaine, 'ArrowLeft');
    expect(document.activeElement).toBe(mois);
    expect(mois.getAttribute('tabindex')).toBe('0');
  });

  it('End va au dernier item ACTIVABLE (Mois), jamais sur le disabled (Annee)', () => {
    const { window, document } = ctx;
    const [semaine, mois] = ctx.items;
    fireKeydown(window, semaine, 'End');
    expect(document.activeElement).toBe(mois);
    expect(mois.getAttribute('tabindex')).toBe('0');
  });

  it('Home depuis un item quelconque revient au premier item activable', () => {
    const { window, document } = ctx;
    const [semaine, mois] = ctx.items;
    fireKeydown(window, semaine, 'ArrowRight'); // focus -> Mois
    fireKeydown(window, mois, 'Home');
    expect(document.activeElement).toBe(semaine);
  });

  it('Enter et Espace selectionnent l item actuellement focalise', () => {
    const { window } = ctx;
    const [, mois] = ctx.items;
    mois.setAttribute('tabindex', '0');
    mois.focus();
    fireKeydown(window, mois, 'Enter');
    expect(mois.classList.contains('active')).toBe(true);
  });

  it('reappeler initSegmentedControls() est idempotent (dataset.bound, pas de double listener)', () => {
    const { window, seg, items } = ctx;
    let changeCount = 0;
    seg.addEventListener('segmented:change', () => { changeCount++; });
    window.__initSegmentedControls(); // 2e appel -- doit no-op (dataset.bound)
    fireClick(window, items[1]);
    expect(changeCount).toBe(1);
  });
});

describe('initSegmentedControls -- regression #613 (aucun .active, 1er item disabled)', () => {
  it("le tabindex=0 initial va sur le 1er item ACTIVABLE (Actifs), jamais sur le bouton disabled (Archives)", () => {
    const { items } = setup(regressionHtml());
    const [archives, actifs, pauses] = items;
    expect(archives.disabled).toBe(true);
    expect(archives.getAttribute('tabindex')).not.toBe('0');
    expect(actifs.getAttribute('tabindex')).toBe('0');
    expect(pauses.getAttribute('tabindex')).toBe('-1');
  });

  it("exactement un seul item porte tabindex=0 dans tout le groupe (tab-order a un point d'entree unique et valide)", () => {
    const { items } = setup(regressionHtml());
    const zeroTabindex = items.filter((i) => i.getAttribute('tabindex') === '0');
    expect(zeroTabindex).toHaveLength(1);
    expect(zeroTabindex[0].disabled).toBe(false);
  });
});

/**
 * #866 -- `.segmented` (navigation.css) gere le debordement horizontal par
 * `overflow-x: auto` (#530) mais posait aussi `scrollbar-width: none` +
 * `::-webkit-scrollbar { display: none }` : la scrollbar etait supprimee
 * INCONDITIONNELLEMENT, meme quand le contenu deborde reellement. Mesure en
 * recette `keepthread` (drawer ~269px, 5 Natures) : `scrollWidth` 423px
 * contre `clientWidth` 269px, 2 options sur 5 hors champ -- dont l'option
 * par defaut -- et strictement AUCUN indice visuel ni prise possible a la
 * souris (une souris standard sans molette horizontale ne peut pas faire
 * defiler un conteneur sans scrollbar). Seul le clavier (flechage
 * `radiogroup`) restait une porte de sortie, non decouvrable pour un
 * utilisateur qui n'a jamais eu besoin du clavier jusque-la.
 *
 * jsdom ne calcule aucune mise en page reelle (`scrollWidth`/`clientWidth`
 * restent a 0, comme deja constate par le test de regression #864 de ce
 * meme repo) -- mais resout correctement les VALEURS de propriete calculees
 * (`getComputedStyle`) depuis une feuille de style chargee en `<style>`. Le
 * vrai `navigation.css` du repo est injecte ici (jamais duplique a la
 * main), ce qui suffit a controler MECANIQUEMENT que la regle qui
 * supprimait l'affordance de scroll n'est plus posee -- sans dependre d'un
 * moteur de layout complet (Playwright).
 *
 * Le markup reprend exactement le scenario `keepthread` (5 Natures) pour
 * documenter le cas reel, meme si l'assertion elle-meme ne depend pas du
 * nombre d'items : la regle CSS corrigee est inconditionnelle (le
 * navigateur ne rend la scrollbar que si le contenu deborde REELLEMENT --
 * aucun changement visuel pour une instance qui tient deja, ex. l'AM/PM du
 * time-picker a 2 items).
 */
describe('.segmented -- CSS (#866, regression scrollbar entierement masquee)', () => {
  function loadSegmentedWithRealCss(html) {
    const dom = loadComponentsWindow(
      `<div style="width:269px">${html}</div>`,
    );
    const { window } = dom;
    const styleEl = window.document.createElement('style');
    styleEl.textContent = NAVIGATION_CSS_SOURCE;
    window.document.head.appendChild(styleEl);
    window.__initSegmentedControls();
    const seg = window.document.querySelector('.segmented');
    return { window, seg };
  }

  // Markup calque sur le drawer keepthread#118 (5 Natures, ~269px utiles).
  function naturesHtml() {
    return `
      <div class="segmented" role="radiogroup" aria-label="Nature">
        <div class="segmented-indicator" aria-hidden="true"></div>
        <button class="segmented-item" type="button">Decision</button>
        <button class="segmented-item" type="button">Risque</button>
        <button class="segmented-item" type="button">Action</button>
        <button class="segmented-item active" type="button">Information</button>
        <button class="segmented-item" type="button">Alerte</button>
      </div>
    `;
  }

  it("ne masque plus inconditionnellement la scrollbar (scrollbar-width != 'none')", () => {
    const { window, seg } = loadSegmentedWithRealCss(naturesHtml());
    // AVANT #866 : `scrollbar-width: none` -- ce test est rouge sans le
    // correctif (valeur resolue 'none'), vert une fois la regle passee a
    // 'thin' (scrollbar fine mais reellement rendue si ca deborde).
    expect(window.getComputedStyle(seg).scrollbarWidth).not.toBe('none');
  });

  it('le mecanisme de scroll horizontal (#530) reste intact -- overflow-x:auto inchange', () => {
    const { window, seg } = loadSegmentedWithRealCss(naturesHtml());
    expect(window.getComputedStyle(seg).overflowX).toBe('auto');
  });

  it("n'affecte aucun attribut/role du markup -- le correctif est purement CSS, le clavier n'est pas touche", () => {
    const { seg } = loadSegmentedWithRealCss(naturesHtml());
    expect(seg.getAttribute('role')).toBe('radiogroup');
    const active = seg.querySelector('.segmented-item.active');
    expect(active.textContent).toBe('Information');
    expect(active.getAttribute('tabindex')).toBe('0');
  });
});
