// global-entry-engine.js — entree IIFE du moteur complet (#666, I1b-2)
// Compile via shared/graph/build.sh -> shared/dist/graph.global.js (2e sortie esbuild,
// DISTINCTE de graph-lib.global.js qui reste le lib mince #657 charge sur toutes les
// pages split-pane/before-after). Ce bundle n'est charge QUE la ou l'on rend un graphe
// (data.html, consumers via sync.sh --with-graph).
import { createGraph } from './index.js';
import { GraphModel, toModel } from './model/index.js';

window.MSYXGraph = { createGraph, GraphModel, toModel };
