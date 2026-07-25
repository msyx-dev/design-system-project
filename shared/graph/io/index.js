// index.js — barrel IO du moteur graph (#664, I6 export/import)
// Separe clairement DOM-free (json/cytoscape/dot — testables Node, cf.
// tests/regression/graph-io.test.js) de DOM-only (export-svg/export-png — necessitent
// XMLSerializer/getComputedStyle/canvas, cf. commentaire de tete de chaque fichier).
export { exportGraphJSON, importGraphJSON, CURRENT_SCHEMA_VERSION } from './json.js';
export { migrateGraphData } from './schema.js';
export { fromCytoscape } from './cytoscape.js';
export { parseDOT } from './dot.js';
export { exportSVG } from './export-svg.js';
export { exportPNG } from './export-png.js';
