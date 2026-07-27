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
