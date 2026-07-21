// index.js — barrel ESM du modele graph (#665, I1b-1)
// Point d'entree pour les consumers ESM (renderer moteur I1b-2, @msyx-dev/react, tests).
// Aligne sur shared/graph/lib/index.js (meme convention de barrel).
export { GraphModel } from './graph-model.js';
export { toModel } from './to-model.js';
export { GraphHistory, buildRecord } from './history.js';
