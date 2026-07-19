// auto.js — layout 'auto' : detecte la topologie puis delegue (#669, I3-1)
// Cycle ESM avec index.js : SUR ici car resolveLayout/hasLayout ne sont referencees
// qu'a l'EXECUTION (corps de autoLayout), jamais au top-level du module (contrairement
// a un registerLayout() top-level qui serait en TDZ, cf. deviation documentee dans
// layout/index.js pour fixed.js/tree.js).
import { detectLayout } from './detect.js';
import { resolveLayout, hasLayout } from './index.js';

/**
 * @param {import('../model/graph-model.js').GraphModel} model
 * @param {Object} [opts] - transmis tel quel au layout resolu (sizes, direction, gap...)
 * @returns {Map<string,{x:number,y:number}>}
 */
export function autoLayout(model, opts) {
  let name = detectLayout(model);
  // Degradation coord-free-safe : si la cible (ex. 'layered', #670) n'est pas encore
  // enregistree, retomber sur 'tree' (rend sans coordonnees) plutot que sur le fallback
  // 'fixed' de resolveLayout (qui exigerait node.position). Garantit "out-of-the-box".
  if (name !== 'fixed' && !hasLayout(name)) name = 'tree';
  return resolveLayout(name)(model, opts); // sync tant que 'layered' absent -> pas de Promise
}
