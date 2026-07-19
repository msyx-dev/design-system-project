// index.js — registre des layouts DOM-free (#666, I1b-2 ; radial/auto #669, I3-1 ;
// layered/mindmap #670, I3-2)
// Contrat : run(model, opts) -> Map<nodeId, {x,y}> | Promise<Map<nodeId,{x,y}>> (centre
// du noeud, PIXELS). Ne touche JAMAIS le DOM. opts.sizes : Map<nodeId,{w,h}> (tailles
// effectives, fournies par le renderer — mesurees ou `size` explicite, cf.
// render/svg-renderer.js). `layered` (#670) est le SEUL layout async (dagre vendore en
// dynamic import) — tous les autres restent synchrones, `paint()` tolere les deux
// (cf. render/svg-renderer.js).
//
// NOTE (deviation mineure vs le sketch de spec #666) : fixed.js/tree.js/radial.js/
// mindmap.js exportent des fonctions pures SANS importer ce module (pas d'auto-
// enregistrement circulaire) — un import circulaire index.js <-> fixed.js/tree.js/
// radial.js/mindmap.js exposerait registerLayout() a un `const REGISTRY` encore en TDZ
// au moment de l'evaluation de la dependance (ordre d'evaluation ESM : les dependances
// s'executent avant le corps du module qui les importe). Meme contrat public
// (registerLayout/resolveLayout), meme testabilite Node. `auto.js` fait EXCEPTION
// (cycle index.js <-> auto.js) : sur car il ne reference resolveLayout/hasLayout qu'a
// l'execution (corps de autoLayout), jamais au top-level — cf. commentaire de tete de
// auto.js.
//
// `layered` (#670) N'EST PAS importe statiquement ici (contrairement aux autres) : un
// import statique de './layered.js' entrainerait esbuild (build.sh, sortie IIFE sans
// code-splitting) a suivre la chaine jusqu'au dynamic import() de layered.js et a
// INLINER dagre dans shared/dist/graph.global.js — ruinant l'objectif "dagre hors du
// bundle de base". On enregistre a la place un LOADER LAZY : le module './layered.js'
// (et donc shared/graph/vendor/graph-layered.js) ne charge qu'au premier appel du
// layout 'layered'.
import { fixedLayout } from './fixed.js';
import { treeLayout } from './tree.js';
import { radialLayout } from './radial.js';
import { mindmapLayout } from './mindmap.js';
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
registerLayout('mindmap', mindmapLayout);
registerLayout('auto', autoLayout);

// layered : loader LAZY -> './layered.js' (et donc le vendore dagre) charge SEULEMENT
// si le layout est effectivement utilise. Renvoie une Promise (contrat elargi #670).
registerLayout('layered', (model, opts) => import('./layered.js').then((m) => m.layeredLayout(model, opts)));

export { fixedLayout, treeLayout, radialLayout, mindmapLayout, autoLayout };
