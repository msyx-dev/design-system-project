// Helper de chargement — shared/components.js (#744, amorce infra tests vanilla)
//
// shared/components.js n'est PAS un module ES : c'est un script classique qui
// declare des fonctions globales (function initX() {...}) et les expose via
// window.__initX = initX. Il n'y a donc rien a require()/import() -- le vrai
// point technique est de l'executer dans le CONTEXTE REEL d'une fenetre DOM,
// comme le ferait un <script src="components.js"> charge par un navigateur.
//
// Solution retenue : jsdom (deja devDependency de packages/react, reutilisee
// ici -- voir tests/vanilla/vitest.config.js) + JSDOM({ runScripts:
// 'outside-only' }) qui rend dom.window.eval() disponible et execute le code
// DANS le realm de dom.window (les `function`/`var` de haut niveau du script
// deviennent des proprietes de dom.window, exactement comme un <script>
// classique non-module). C'est un eval INDIRECT (appele via la propriete
// `dom.window.eval`, jamais `eval(...)` nu) : la spec JS impose alors une
// portee GLOBALE, pas une portee locale -- condition necessaire pour que les
// `function initX(){}` du fichier deviennent bien des globales de la fenetre.
//
// Alternative ecartee : dupliquer la logique dans le test (pattern deja
// utilise par tests/regression/graph-lib.test.js faute de jsdom disponible a
// l'epoque, cf. commentaire en tete de ce fichier) -- ca fait dériver le test
// du vrai code au premier refactor. Ici jsdom est disponible (hoiste depuis
// packages/react), donc on charge et on execute le VRAI fichier distribue.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_JS_PATH = path.resolve(__dirname, '../../../shared/components.js');
const COMPONENTS_SOURCE = readFileSync(COMPONENTS_JS_PATH, 'utf8');

// shared/dist/graph-lib.global.js — IIFE COMPILE (esbuild) qui assigne
// window.__pointerDrag / window.__svg (#657, I1a -- cf. shared/graph/lib/
// global-entry.js). Sur les vraies pages, ce <script> est charge AVANT
// components.js (cf. pages/divers.html:775-776, pages/fondation.html:1336-
// 1337) : initSplitPane()/initBeforeAfter() appellent window.__pointerDrag()
// sans le definir eux-memes -- une dependance reelle et deliberee, pas un
// defaut. loadComponentsWindow() seule NE charge PAS ce fichier (les 44
// composants precedents n'en ont pas besoin) : installPointerDragLib() est
// un opt-in explicite, appele par les tests de initSplitPane/initBeforeAfter
// APRES loadComponentsWindow() et AVANT window.__initX() -- le VRAI fichier
// distribue est evalue (pas une reimplementation maison), meme esprit que
// COMPONENTS_SOURCE ci-dessus.
const GRAPH_LIB_JS_PATH = path.resolve(__dirname, '../../../shared/dist/graph-lib.global.js');
const GRAPH_LIB_SOURCE = readFileSync(GRAPH_LIB_JS_PATH, 'utf8');

/**
 * Evalue le vrai shared/dist/graph-lib.global.js dans le realm de `win`,
 * ce qui pose window.__pointerDrag (+ window.__svg, inutilise ici). A
 * appeler apres loadComponentsWindow() et avant window.__initSplitPane()/
 * window.__initBeforeAfter().
 */
export function installPointerDragLib(win) {
  win.eval(GRAPH_LIB_SOURCE);
}

/**
 * Dispatch un PointerEvent (pointerdown/pointermove/pointerup/pointercancel)
 * dans le realm de la fenetre fournie. jsdom EXPOSE PointerEvent nativement
 * (verifie empiriquement, contrairement a DragEvent/Touch -- meme constat
 * que tests/vanilla/sortable-list.test.js #744 vague 11) : pas besoin de
 * fabriquer un Event generique + propriete posee a la main comme
 * fireDrag/firePaste. pointerId par defaut a 1 (constant, suffisant : un
 * seul point de contact simule par test).
 */
export function firePointer(win, el, type, extra = {}) {
  const evt = new win.PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    ...extra,
  });
  el.dispatchEvent(evt);
  return evt;
}

/**
 * Cree une fenetre jsdom fraiche, y injecte `bodyHtml`, puis EXECUTE le vrai
 * shared/components.js dans le contexte de cette fenetre (dom.window.eval).
 * Chaque appel cree une nouvelle JSDOM -> aucune fuite d'etat/listener entre
 * tests (chaque test a son propre `document`/`window`).
 *
 * @param {string} bodyHtml - markup injecte dans <body> AVANT l'exec du script
 *   (le script ne fait qu'attacher des listeners / lire le DOM existant --
 *   il ne s'auto-initialise pas tout seul: DOMContentLoaded a deja fini de se
 *   propager au moment ou dom.window.eval() tourne, donc reinitAll() n'est
 *   PAS appele automatiquement ; chaque test appelle explicitement
 *   window.__initX() pour un controle deterministe).
 * @returns {import('jsdom').JSDOM}
 */
export function loadComponentsWindow(bodyHtml = '') {
  const dom = new JSDOM(
    `<!doctype html><html><body>${bodyHtml}</body></html>`,
    {
      url: 'https://design-system.miklaw.fr/',
      runScripts: 'outside-only',
      pretendToBeVisual: true, // requestAnimationFrame + window.innerWidth/Height fiables
    }
  );
  // jsdom ne fournit pas IntersectionObserver (pretendToBeVisual ne couvre que
  // rAF/dimensions). components.js l'utilise sans garde en tete de
  // initComponents() (animations de charts). Le fichier attache aussi
  // `document.addEventListener('DOMContentLoaded', reinitAll)` en derniere
  // ligne -- cet evenement se produit de facon asynchrone une fois le
  // document jsdom "charge", potentiellement APRES la fin (synchrone) d'un
  // test, et fait alors planter reinitAll() en arriere-plan (ReferenceError
  // non liee au composant sous test, juste du bruit stderr / risque de
  // flake inter-tests). Stub minimal, suffisant pour que reinitAll() ne
  // crashe jamais silencieusement en tache de fond.
  dom.window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // jsdom n'implemente pas Element.scrollIntoView (#744 vague 3). Utilise
  // sans garde par initCommandPalette.setActive() pour amener l'item actif
  // dans le viewport -- un pur effet de scroll, jamais une donnee sous
  // assertion. No-op volontaire : aucun test ne doit dependre de son effet.
  dom.window.Element.prototype.scrollIntoView = function () {};
  // jsdom n'implemente ni HTMLDialogElement.showModal() ni close() (#744
  // vague 3). Polyfill minimal qui reflete fidelement l'attribut/propriete
  // `open` (deja gere nativement par jsdom en reflection IDL <-> attribut) :
  // c'est CET etat que le CSS du DS utilise (dialog:not([open]) { display:
  // none }) et que les tests d'initModals/initCommandPalette assertent.
  // close() emet un vrai evenement 'close' (non-bubbling, comme le natif)
  // pour que attachFocusRestore() -- qui ecoute 'close' sur la dialog --
  // se declenche exactement comme dans un navigateur, quel que soit le
  // declencheur de la fermeture (bouton, backdrop, ou Echap ci-dessous).
  //
  // Echap ferme nativement la dialog modale la plus recemment ouverte --
  // c'est un comportement du navigateur, PAS du JS de initModals() (aucun
  // listener Escape n'existe dans shared/components.js pour les modals :
  // verifie, grep "Escape" autour de initModals/attachFocusRestore). On le
  // reproduit ici pour que le chemin de fermeture "Echap" exerce le VRAI
  // listener 'close' de attachFocusRestore(), au meme titre que les autres
  // chemins de fermeture.
  // Le natif deplace aussi le focus A L'INTERIEUR de la dialog a l'ouverture
  // ("dialog focusing steps" du HTML Living Standard : 1er descendant
  // focusable, sinon la dialog elle-meme). Sans ce deplacement, le
  // declencheur resterait actif tout du long dans jsdom (voir plus haut :
  // dispatchEvent('click') ne focus rien) et une restauration de focus
  // cassee dans attachFocusRestore() serait indetectable -- l'assertion
  // resterait vraie par accident. On reproduit donc ce comportement pour
  // que la restauration de focus soit une garantie testee, pas un hasard.
  const openModalDialogs = [];
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
    if (openModalDialogs.indexOf(this) === -1) openModalDialogs.push(this);
    const focusable = this.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && typeof focusable.focus === 'function') {
      focusable.focus();
    } else {
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
      this.focus();
    }
  };
  dom.window.HTMLDialogElement.prototype.close = function (returnValue) {
    if (!this.hasAttribute('open')) return;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.removeAttribute('open');
    const idx = openModalDialogs.indexOf(this);
    if (idx !== -1) openModalDialogs.splice(idx, 1);
    this.dispatchEvent(new dom.window.Event('close'));
  };
  dom.window.document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !openModalDialogs.length) return;
    openModalDialogs[openModalDialogs.length - 1].close();
  });
  dom.window.eval(COMPONENTS_SOURCE);
  return dom;
}

/**
 * Dispatch un KeyboardEvent avec bubbles:true (comportement navigateur reel)
 * sur l'element donne, dans le realm de la fenetre fournie (necessaire car
 * KeyboardEvent doit venir du MEME window que l'element cible sous jsdom).
 */
export function fireKeydown(win, el, key, extra = {}) {
  const evt = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
  el.dispatchEvent(evt);
  return evt;
}

export function fireClick(win, el, extra = {}) {
  const evt = new win.MouseEvent('click', { bubbles: true, cancelable: true, ...extra });
  el.dispatchEvent(evt);
  return evt;
}

/**
 * Dispatch un evenement 'paste' porteur d'un `clipboardData` minimal
 * ({ getData(type) }), dans le realm de la fenetre fournie.
 *
 * jsdom n'implemente NI `ClipboardEvent` NI `DataTransfer` (verifie #744
 * vague 4 : `'ClipboardEvent' in window` et `'DataTransfer' in window`
 * renvoient tous deux `false`) -- `new win.ClipboardEvent(...)` leve donc
 * une TypeError. Le code sous test (`initOTPInputs`, digit.addEventListener
 * ('paste', ...)) ne lit que `(e.clipboardData || window.clipboardData)
 * .getData('text')` : on construit un Event generique et on POSE la
 * propriete `clipboardData` dessus a la main (assignation directe -- un
 * Event brut n'a pas de getter existant sur ce nom, contrairement a
 * `HTMLDialogElement.open` par exemple, donc aucun defineProperty requis).
 * Ce n'est pas un stub global (rien n'est touche sur les prototypes window) :
 * comme fireClick/fireKeydown, c'est un dispatch cible sur UN evenement,
 * scope au test qui l'appelle.
 */
/**
 * Dispatch un evenement HTML5 Drag & Drop (dragstart/dragover/drop/dragend/
 * dragleave) porteur d'un `dataTransfer` minimal ({ effectAllowed,
 * dropEffect }), dans le realm de la fenetre fournie.
 *
 * jsdom n'implemente NI `DragEvent` NI `DataTransfer` (verifie #744 vague 9 :
 * `'DragEvent' in window` et `'DataTransfer' in window` renvoient tous deux
 * `false`, et `new win.DragEvent(...)` leve une TypeError -- meme motif que
 * `firePaste`/ClipboardEvent ci-dessus). Le code sous test (`initSortableLists`)
 * ne fait que LIRE/ECRIRE `e.dataTransfer.effectAllowed` et
 * `e.dataTransfer.dropEffect` : un Event generique + une propriete posee a la
 * main suffit.
 */
export function fireDrag(win, el, type, extra = {}) {
  const evt = new win.Event(type, { bubbles: true, cancelable: true, ...extra });
  evt.dataTransfer = { effectAllowed: null, dropEffect: null };
  el.dispatchEvent(evt);
  return evt;
}

export function firePaste(win, el, text, extra = {}) {
  const evt = new win.Event('paste', { bubbles: true, cancelable: true, ...extra });
  evt.clipboardData = { getData: () => text };
  el.dispatchEvent(evt);
  return evt;
}

/**
 * Dispatch un evenement tactile (touchstart/touchmove/touchend) avec un seul
 * point de contact `{ clientY }`, dans le realm de la fenetre fournie.
 *
 * jsdom expose `TouchEvent` mais PAS `Touch` (`'Touch' in window` est
 * `false`, verifie #744 vague 4) -- `new win.Touch(...)` leve. Le
 * constructeur `TouchEvent` accepte neanmoins `touches` comme un tableau
 * quelconque sans validation de type : un objet litteral `{ clientY }`
 * suffit, car `initBottomSheet` (seul consommateur) ne lit que
 * `e.touches[0].clientY`.
 */
export function fireTouch(win, el, type, clientY, extra = {}) {
  const evt = new win.TouchEvent(type, {
    touches: [{ clientY }],
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  el.dispatchEvent(evt);
  return evt;
}
