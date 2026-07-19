// global-entry.js — point d'entrée IIFE pour le monde monolithe (#657, I1a)
// Décision transverse D1 (spec #657) : source canonique ES module, émission bornée
// esbuild vers un IIFE global assignant window.__pointerDrag / window.__svg.
// Compilé via shared/graph/build.sh → shared/dist/graph-lib.global.js
// Chargé AVANT shared/components.js (cf. <script> dans chaque page HTML).
import { pointerDrag } from './pointer-drag.js';
import { svg } from './svg.js';

window.__pointerDrag = pointerDrag;
window.__svg = svg;
