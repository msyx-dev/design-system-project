// index.js — API publique du moteur graph, barrel ESM (#666, I1b-2)
// Point d'entree consumers ESM (bundle global, @msyx-dev/react futur, tests).
import { SvgRenderer } from './render/svg-renderer.js';

export { GraphModel, toModel } from './model/index.js';
export { resolveLayout, registerLayout } from './layout/index.js';

/**
 * @param {HTMLElement} el - conteneur `.graph[data-graph]`
 * @param {Object} opts
 * @param {Object|Array|import('./model/graph-model.js').GraphModel} opts.data - GraphData
 *   | {nodes,edges} | GraphModel deja construit (reutilise tel quel).
 * @param {'fixed'|'tree'} [opts.layout='fixed']
 * @param {{direction?:'TB'|'LR', gap?:{x:number,y:number}, root?:string}} [opts.layoutOptions]
 * @param {'straight'|'curved'} [opts.edgeShape='straight']
 * @param {Object} [opts.nodeTypes] - {typeName: {className, icon}}
 * @param {(node:Object)=>(HTMLElement)} [opts.renderNode] - escape hatch noeud riche custom
 * @param {string} [opts.label] - aria-label du <svg>
 * @param {boolean} [opts.a11yTable=true] - construit l'alternative table
 * @returns {{model:import('./model/graph-model.js').GraphModel, destroy:Function, svg:SVGElement}}
 */
export function createGraph(el, opts) {
  const renderer = new SvgRenderer(el, opts || {});
  const destroy = () => renderer.destroy();
  if (typeof window !== 'undefined' && typeof window.__registerInstance === 'function') {
    window.__registerInstance(el, destroy); // teardown SPA (#657) — sweep si el detache
  }
  return { model: renderer.model, destroy, svg: renderer.svgEl };
}
