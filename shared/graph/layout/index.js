// index.js — registre des layouts DOM-free (#666, I1b-2 ; radial/auto #669, I3-1)
// Contrat : run(model, opts) -> Map<nodeId, {x,y}> (centre du noeud, PIXELS). Ne
// touche JAMAIS le DOM. opts.sizes : Map<nodeId,{w,h}> (tailles effectives, fournies
// par le renderer — mesurees ou `size` explicite, cf. render/svg-renderer.js).
//
// NOTE (deviation mineure vs le sketch de spec #666) : fixed.js/tree.js/radial.js
// exportent des fonctions pures SANS importer ce module (pas d'auto-enregistrement
// circulaire) — un import circulaire index.js <-> fixed.js/tree.js/radial.js exposerait
// registerLayout() a un `const REGISTRY` encore en TDZ au moment de l'evaluation de la
// dependance (ordre d'evaluation ESM : les dependances s'executent avant le corps du
// module qui les importe). Meme contrat public (registerLayout/resolveLayout), meme
// testabilite Node. `auto.js` fait EXCEPTION (cycle index.js <-> auto.js) : sur car il
// ne reference resolveLayout/hasLayout qu'a l'execution (corps de autoLayout), jamais
// au top-level — cf. commentaire de tete de auto.js.
import { fixedLayout } from './fixed.js';
import { treeLayout } from './tree.js';
import { radialLayout } from './radial.js';
import { autoLayout } from './auto.js';

const REGISTRY = new Map();

export function registerLayout(name, run) {
  REGISTRY.set(name, run);
}

export function resolveLayout(name) {
  return REGISTRY.get(name) || REGISTRY.get('fixed');
}

/** @param {string} name @returns {boolean} vrai si un layout est enregistre sous ce nom. */
export function hasLayout(name) {
  return REGISTRY.has(name);
}

registerLayout('fixed', fixedLayout);
registerLayout('tree', treeLayout);
registerLayout('radial', radialLayout);
registerLayout('auto', autoLayout);

export { fixedLayout, treeLayout, radialLayout, autoLayout };
