// index.js — barrel ESM des utils partagés du moteur graph (#657, I1a)
// Point d'entrée pour les consumers ESM (moteur graph I1b+, @msyx-dev/react).
// Le monde monolithe (components.js, no-build) consomme window.__pointerDrag /
// window.__svg émis par global-entry.js (cf. build.sh) — pas ce barrel directement.
export { pointerDrag } from './pointer-drag.js';
export { svg } from './svg.js';
export { buildSpanningTree } from './spanning-tree.js'; // #671, I4-1 — nav clavier roving
export { nextFocusAfterRemoval } from './edit-focus.js'; // #673, I5-1 — contrat de focus apres delete
