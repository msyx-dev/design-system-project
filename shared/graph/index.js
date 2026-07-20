// index.js — API publique du moteur graph, barrel ESM (#666, I1b-2 ; #669, I3-1 ; #667, I2-1)
// Point d'entree consumers ESM (bundle global, @msyx-dev/react futur, tests).
import { SvgRenderer } from './render/svg-renderer.js';

export { GraphModel, toModel } from './model/index.js';
export { resolveLayout, registerLayout, hasLayout } from './layout/index.js';

/**
 * @param {HTMLElement} el - conteneur `.graph[data-graph]`
 * @param {Object} opts
 * @param {Object|Array|import('./model/graph-model.js').GraphModel} opts.data - GraphData
 *   | {nodes,edges} | GraphModel deja construit (reutilise tel quel).
 * @param {'fixed'|'tree'|'radial'|'mindmap'|'layered'|'auto'} [opts.layout='fixed'] - `'auto'` :
 *   detecte le layout via l'index d'adjacence (arbre 1-racine acyclique -> `tree`,
 *   DAG/cyclique -> `layered`, cf. layout/detect.js #669). `radial`/`mindmap` restent
 *   explicites (jamais auto-choisis). `layered` (#670, dagre vendore, dynamic import)
 *   est le SEUL layout ASYNC — `createGraph()` reste synchrone (le renderer tolere un
 *   layout qui renvoie une Promise, cf. render/svg-renderer.js `paint()`/`_applyLayout()`).
 * @param {{direction?:'TB'|'LR', gap?:{x:number,y:number}, root?:string, startAngle?:number, sweep?:number, ringGap?:number, balance?:'height'|'count'}} [opts.layoutOptions]
 * @param {'straight'|'curved'} [opts.edgeShape='straight']
 * @param {Object} [opts.nodeTypes] - {typeName: {className, icon}}
 * @param {(node:Object)=>(HTMLElement)} [opts.renderNode] - escape hatch noeud riche custom
 * @param {string} [opts.label] - aria-label du <svg>
 * @param {boolean} [opts.a11yTable=true] - construit l'alternative table
 * @param {boolean} [opts.viewport=true] - pan/zoom/pinch interactif (#667, I2-1). `false`
 *   desactive entierement le viewport (pas de listeners poses, transform identite figee).
 * @param {number} [opts.zoomMin] - override du token `--graph-zoom-min` (defaut 0.2).
 * @param {number} [opts.zoomMax] - override du token `--graph-zoom-max` (defaut 4).
 * @param {{tx:number,ty:number,k:number}} [opts.initialViewport] - etat initial
 *   deterministe du viewport (cle pour une demo/VR figee, plutot que l'identite tx:0,ty:0,k:1).
 * @param {boolean} [opts.selectable=true] - active la selection clic noeud/arete (#668, I2-2).
 *   `false` desactive entierement (pas de listener clic pose).
 * @param {string} [opts.initialSelection] - id noeud/arete selectionne des l'init — pose le
 *   halo visuel SANS ouvrir le detail (etat deterministe pour la VR, cf. render/svg-renderer.js).
 * @param {(selection:{id:string,kind:'node'|'edge'})=>void} [opts.onSelect] - callback invoque
 *   a la place du modal DS par defaut lors d'une selection interactive (pas sur initialSelection).
 * @param {boolean} [opts.selectionDetail=true] - si `false`, aucun detail (ni callback ni modal)
 *   n'est ouvert au clic — seul l'etat visuel + l'evenement graph:selection:change sont poses.
 * @param {boolean} [opts.refitOnResize=false] - re-fit automatique (retour a l'identite) quand le
 *   conteneur est redimensionne, UNIQUEMENT si l'utilisateur n'a pas deja navigue (#668, I2-2).
 * @param {boolean} [opts.keyboardNav=true] - nav clavier noeud-a-noeud (#671, I4-1) : roving
 *   tabindex (1 seul noeud tab-stop a la fois) + traversee via arbre couvrant deterministe
 *   (WAI-ARIA APG tree : fleches/Home/End/Enter). `false` desactive entierement (aucun
 *   listener pose sur `nodesG`, symetrique de `viewport`/`selectable`).
 * @param {'view'|'edit'} [opts.mode='view'] - `'view'` = read-only, INCHANGE (comportement
 *   I1-I4). `'edit'` (#673, I5-1) active `_initEdit()` : barre d'outils `.graph-toolbar`
 *   (Ajouter/Relier/Supprimer, `.btn-group`/`.btn-icon` DS), creation de noeuds (bouton
 *   toolbar au centre du viewport OU double-clic sur le fond -> `screenToWorld` ->
 *   `model.addNode`), creation d'aretes (mode "Relier" : clic noeud source puis clic noeud
 *   cible -> `model.addEdge`), suppression (Suppr/Backspace sur la selection ->
 *   `model.removeNode`/`removeEdge`, cascade des aretes incidentes via l'index). Contrat de
 *   focus (arbitrage E, #662) : creation -> focus le nouveau noeud (reutilise `select()`
 *   silencieux + roving + focus DOM) ; suppression de noeud -> focus le **voisin** (util pur
 *   `nextFocusAfterRemoval()`, `shared/graph/lib/edit-focus.js` : 1er voisin -> parent de
 *   l'arbre couvrant -> 1er noeud de l'ordre DFS -> null), calcule AVANT la mutation puis
 *   applique APRES le repaint reel (rAF) — jamais synchroniquement (le DOM est recree par
 *   `_applyLayout()`). Suppression d'arete : aucun deplacement de focus. Le `<svg>` GARDE
 *   `role="graphics-document"` en mode edit (arbitrage A opt1, #662) — la nav SR/clavier I4
 *   n'est jamais degradee. Chaque mutation ré-émet un `CustomEvent('graph:edit', {detail})`
 *   sur `.graph` en écho de `graph:model:change` (alias semantique, arbitrage F — pas un 2e
 *   canal de verite). `destroy()` retire les listeners d'edition + la `.graph-toolbar` du DOM.
 *   I5-2 (#674) — édition inline : double-clic sur un noeud -> `<input
 *   class="graph-inline-edit">` overlay HTML positionne au-dessus du `<g>` noeud
 *   (`getBoundingClientRect`), pre-rempli, focus pose (contrat d'ouverture). `Enter`/blur ->
 *   `model.updateNode(id,{data:{label}})` (skip si vide/inchange) ; `Échap` -> annule. Pendant
 *   l'edition, et UNIQUEMENT pendant l'edition, `role="application"` remplace localement
 *   `role="graphics-document"` sur le `<svg>` (arbitrage A, #662) — restaure a la fermeture
 *   (re-focus le `<g>` noeud, mecanique focus-restore WCAG 2.4.3). Double-clic sur le fond
 *   reste create-node (I5-1, non affecte).
 *   I5-2 (#674) — ports/handles : chaque noeud peint un `.graph-port` (cercle SVG, bord
 *   droit) — hit-area >=44px (token `--graph-port-size`), revele au survol/focus du noeud
 *   parent (CSS `:hover`/`:focus-within`, zero JS de toggle). Drag (`window.__pointerDrag`,
 *   #657) depuis un port -> ligne fantome `.graph-port-link` qui suit le pointeur
 *   (`screenToWorld`) -> au drop, `nearestNodeAt()` (`render/port-drop.js`, fonction pure
 *   testable Node) desambiguise un chevauchement de noeuds (cible = centre le plus proche du
 *   point, source toujours exclue -> jamais d'auto-boucle) -> `model.addEdge`. Drop hors
 *   noeud ou `Échap` en cours de drag -> annule (aucune arete, fantome retire).
 * @returns {{model:import('./model/graph-model.js').GraphModel, destroy:Function, svg:SVGElement,
 *   getViewport:Function, setViewport:Function, screenToWorld:Function, fit:Function,
 *   zoomToNode:Function, select:Function, getSelection:Function, focusNode:Function}}
 */
export function createGraph(el, opts) {
  const renderer = new SvgRenderer(el, opts || {});
  const destroy = () => renderer.destroy();
  if (typeof window !== 'undefined' && typeof window.__registerInstance === 'function') {
    window.__registerInstance(el, destroy); // teardown SPA (#657) — sweep si el detache
  }
  return {
    model: renderer.model,
    destroy,
    svg: renderer.svgEl,
    // --- viewport (#667) — no-op si opts.viewport===false ---
    getViewport: () => (renderer.viewport ? renderer.viewport.getViewport() : null),
    setViewport: (v) => renderer.viewport && renderer.viewport.setViewport(v),
    screenToWorld: (cx, cy) => (renderer.viewport ? renderer.viewport.screenToWorld(cx, cy) : null),
    // --- fit + selection + resize (#668, I2-2) ---
    fit: () => renderer.fit(),
    zoomToNode: (id, k) => renderer.zoomToNode(id, k),
    select: (id) => renderer.select(id),
    getSelection: () => renderer.getSelection(),
    // --- nav clavier (#671, I4-1) — no-op si opts.keyboardNav===false (noeud introuvable) ---
    focusNode: (id) => renderer._focusNode(id),
  };
}
