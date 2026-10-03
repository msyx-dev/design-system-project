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

/**
 * #1016 -- la TOUTE PREMIERE mesure de l'indicateur se fait SANS transition. Avant elle, l'item actif
 * porte l'aplat de l'indicateur (navigation.css, marqueur `.segmented-indicator:not([style*="width"])`) ;
 * une transition ferait glisser/grandir l'indicateur depuis 0 au lieu d'un passage de relais sans saut.
 * jsdom n'applique aucune mise en page ni transition : on observe donc l'ORDRE des ecritures de style
 * (MutationObserver + oldValue) ; la coincidence geometrique reelle est prouvee en navigateur par
 * `visual-tests/segmented-indicator-sync.spec.ts` (cas 4).
 */
describe('initSegmentedControls -- 1re mesure sans transition (#1016)', () => {
  function setupObserved() {
    const dom = loadComponentsWindow(normalHtml());
    const { window } = dom;
    // rAF synchrone : la mesure initiale a lieu pendant l'appel a __initSegmentedControls().
    window.requestAnimationFrame = (cb) => { cb(0); return 0; };
    const indicator = window.document.querySelector('.segmented-indicator');
    const observer = new window.MutationObserver(() => {});
    observer.observe(indicator, { attributes: true, attributeOldValue: true });
    window.__initSegmentedControls();
    return { window, indicator, observer, records: observer.takeRecords() };
  }

  it("ecrit `transition: none` AVANT la largeur, puis restaure la transition du CSS", () => {
    const { indicator, records } = setupObserved();
    const avantEcritures = records.map((r) => r.oldValue);
    // Etat du style juste avant l'ecriture de la largeur : transition deja coupee, rien d'autre.
    expect(avantEcritures).toContain('transition: none;');
    // Apres l'init : plus de `transition` inline (la regle CSS reprend), mais une largeur est posee.
    expect(indicator.style.transition).toBe('');
    expect(indicator.style.width).not.toBe('');
    expect(indicator.style.transform).not.toBe('');
  });

  it("les mesures SUIVANTES (clic) ne coupent pas la transition : l'indicateur glisse", () => {
    const { window, indicator, observer } = setupObserved();
    observer.takeRecords();
    const mois = window.document.querySelectorAll('.segmented-item')[1];
    // jsdom : offsetWidth vaut 0 partout, l'ecriture serait identique et ne produirait aucun enregistrement.
    Object.defineProperty(mois, 'offsetWidth', { value: 80, configurable: true });
    fireClick(window, mois);
    const records = observer.takeRecords();
    expect(records.length).toBeGreaterThan(0); // le clic a bien deplace l'indicateur
    for (const r of records) {
      expect(r.oldValue ?? '').not.toContain('transition');
    }
    expect(indicator.style.transition).toBe('');
  });
});

/**
 * #1016 -- mode « liens » : `<nav class="segmented">` + `<a class="segmented-item" href>`. Un filtre de
 * page, pas un radiogroup (exception ecrite a DS-PRINCIPLES.md §3.2) : la navigation reste NATIVE, le JS
 * ne place que l'indicateur. jsdom n'applique aucune mise en page (offsetWidth = 0) : on verifie le
 * BALISAGE et l'absence d'interception ; la geometrie, le clavier reel et le rendu sans JS sont prouves en
 * navigateur par `visual-tests/segmented-indicator-sync.spec.ts` (cas 5 a 9).
 */
describe('initSegmentedControls -- mode liens (#1016)', () => {
  function linksHtml({ avecCourant = true } = {}) {
    return `
      <nav class="segmented" aria-label="Filtrer par etat">
        <span class="segmented-indicator" aria-hidden="true"></span>
        <a class="segmented-item${avecCourant ? ' active' : ''}" href="?filtre=tous#f"${avecCourant ? ' aria-current="page"' : ''}>Tous</a>
        <a class="segmented-item" href="?filtre=actifs#f">Actifs</a>
        <a class="segmented-item" aria-disabled="true">Archives</a>
      </nav>
    `;
  }

  // rAF synchrone : la mesure initiale a lieu pendant l'appel a __initSegmentedControls().
  function setupLinks(html) {
    const dom = loadComponentsWindow(html);
    const { window } = dom;
    window.requestAnimationFrame = (cb) => { cb(0); return 0; };
    window.__initSegmentedControls();
    const seg = window.document.querySelector('.segmented');
    return {
      window,
      seg,
      indicator: seg.querySelector('.segmented-indicator'),
      items: Array.from(seg.querySelectorAll('.segmented-item')),
    };
  }

  it("ne pose AUCUN role (nav ni items), ni tabindex, ni aria-checked", () => {
    const { seg, items } = setupLinks(linksHtml());
    expect(seg.hasAttribute('role')).toBe(false);
    expect(seg.tagName).toBe('NAV');
    for (const item of items) {
      expect(item.hasAttribute('role')).toBe(false);
      expect(item.hasAttribute('tabindex')).toBe(false);
      expect(item.hasAttribute('aria-checked')).toBe(false);
    }
    expect(seg.querySelectorAll('[role], [aria-checked], [tabindex]').length).toBe(0);
  });

  it("conserve .active ET aria-current sur le meme lien, sans les deplacer", () => {
    const { seg, items } = setupLinks(linksHtml());
    expect(seg.querySelectorAll('.segmented-item.active').length).toBe(1);
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[0].getAttribute('aria-current')).toBe('page');
    expect(items[1].hasAttribute('aria-current')).toBe(false);
  });

  it("cache l'indicateur aux lecteurs d'ecran (aria-hidden)", () => {
    const { indicator } = setupLinks(linksHtml());
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
  });

  it("ne touche ni href ni l'option desactivee (pas de href, pas de tabindex)", () => {
    const { items } = setupLinks(linksHtml());
    expect(items[0].getAttribute('href')).toBe('?filtre=tous#f');
    expect(items[1].getAttribute('href')).toBe('?filtre=actifs#f');
    expect(items[2].hasAttribute('href')).toBe(false);
    expect(items[2].getAttribute('aria-disabled')).toBe('true');
    expect(items[2].hasAttribute('tabindex')).toBe(false);
  });

  it("un clic, Entree et Espace ne sont JAMAIS interceptes (pas de preventDefault) et ne deplacent pas .active", () => {
    const { window, items } = setupLinks(linksHtml());
    const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    items[1].dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    const enter = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    items[1].dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    const espace = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    items[1].dispatchEvent(espace);
    expect(espace.defaultPrevented).toBe(false);
    // Le navigateur (ou le serveur) decide du lien courant : le JS ne le change pas.
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[1].classList.contains('active')).toBe(false);
  });

  it("n'emet segmented:change sur aucun clic (aucun etat n'est gere cote JS)", () => {
    const { window, seg, items } = setupLinks(linksHtml());
    let recu = 0;
    seg.addEventListener('segmented:change', () => { recu++; });
    fireClick(window, items[1]);
    expect(recu).toBe(0);
  });

  it("pose la largeur de l'indicateur et laisse `style.transition` vide apres l'init", () => {
    const { indicator } = setupLinks(linksHtml());
    expect(indicator.style.width).not.toBe('');
    expect(indicator.style.transform).not.toBe('');
    // La 1re mesure coupe la transition le temps d'une frame puis la restaure (#1016 T1).
    expect(indicator.style.transition).toBe('');
  });

  it("sans lien courant (URL hors options) : aucune largeur, l'indicateur reste masque par le CSS", () => {
    const { indicator } = setupLinks(linksHtml({ avecCourant: false }));
    expect(indicator.style.width).toBe('');
    expect(indicator.hasAttribute('style')).toBe(false);
  });

  it("est idempotent : un 2e appel ne relie rien (dataset.bound) et ne pose aucun role", () => {
    const { window, seg, indicator } = setupLinks(linksHtml());
    expect(seg.dataset.bound).toBe('1');
    const avant = indicator.getAttribute('style');
    window.__initSegmentedControls();
    expect(indicator.getAttribute('style')).toBe(avant);
    expect(seg.querySelectorAll('[role], [aria-checked], [tabindex]').length).toBe(0);
  });

  it("ne change pas le mode bouton : un groupe de <button> garde radiogroup / radio / tabindex itinerant", () => {
    const { seg, items } = setup(normalHtml());
    expect(seg.getAttribute('role')).toBe('radiogroup');
    expect(items[0].getAttribute('role')).toBe('radio');
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');
  });
});
