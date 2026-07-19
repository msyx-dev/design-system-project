// index.js — barrel ESM des utils partagés du moteur graph (#657, I1a)
// Point d'entrée pour les consumers ESM (moteur graph I1b+, @msyx-dev/react).
// Le monde monolithe (components.js, no-build) consomme window.__pointerDrag /
// window.__svg émis par global-entry.js (cf. build.sh) — pas ce barrel directement.
export { pointerDrag } from './pointer-drag.js';
export { svg } from './svg.js';
