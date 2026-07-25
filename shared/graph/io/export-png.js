// export-png.js — export PNG hi-DPI (#664, I6 export/import)
// DOM-ONLY : Image, canvas 2D, Blob, URL.createObjectURL. AUCUN acces DOM au
// CHARGEMENT du module (uniquement dans les corps de fonctions) -> import() ne plante
// PAS sous Node (cf. tests/regression/graph-io.test.js). Pipeline : exportSVG() (SVG
// autonome, styles/icones inlines) -> Image -> <canvas> (echelle hi-DPI) -> toBlob().
//
// ---- <foreignObject> (#664, "evite <foreignObject> : Safari le rend casse") ----
// Le moteur peint les noeuds riches (opts.renderNode / node.data.rich, cf.
// render/svg-renderer.js#_paintNode) via <foreignObject> (HTML dans le SVG). Rasteriser
// un SVG contenant du <foreignObject> via `new Image()` + `canvas.drawImage()` est un
// bug WebKit connu sur Safari (l'image reste vide/blanche ou echoue silencieusement) —
// Chrome/Firefox/Edge s'en sortent correctement. Deux strategies exposees via
// `opts.richNodes` :
//   - 'warn' (par defaut) : export tente quand meme (correct hors Safari) ; un SEUL
//     `console.warn` signale le risque si des <foreignObject> sont presents.
//   - 'strip' : chaque <foreignObject> est remplace par un rectangle + le label
//     `aria-label` du noeud parent AVANT rasterisation — perte de fidelite visuelle
//     (le noeud riche redevient une boite simple) mais rendu IDENTIQUE sur tous les
//     navigateurs, y compris Safari. Recommande pour un export PNG garanti
//     multi-navigateur.
import { exportSVG } from './export-svg.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function stripForeignObjects(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  Array.from(doc.querySelectorAll('foreignObject')).forEach((fo) => {
    const g = fo.closest('g');
    const label = g ? g.getAttribute('aria-label') || '' : '';
    const w = Number(fo.getAttribute('width')) || 120;
    const h = Number(fo.getAttribute('height')) || 40;
    const rect = doc.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'graph-node-bg');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '8');
    const text = doc.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(w / 2));
    text.setAttribute('y', String(h / 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = label;
    fo.replaceWith(rect, text);
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function readViewBox(svgEl) {
  const attr = (svgEl.getAttribute('viewBox') || '').trim();
  if (!attr) return null;
  const parts = attr.split(/\s+/).map(Number);
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  return { width: parts[2], height: parts[3] };
}

/**
 * @param {SVGSVGElement} svgEl - `.graph-canvas` attache au DOM
 * @param {{scale?:number, richNodes?:'warn'|'strip', mimeType?:string, quality?:number,
 *   inlineIcons?:boolean}} [opts] - `scale` : facteur d'echelle explicite (defaut
 *   `window.devicePixelRatio || 1`, hi-DPI). `mimeType`/`quality` passes tels quels a
 *   `canvas.toBlob()`.
 * @returns {Promise<Blob>} image rasterisee (PNG par defaut) via `canvas.toBlob()`
 */
export async function exportPNG(svgEl, opts = {}) {
  if (!svgEl || typeof svgEl.cloneNode !== 'function') {
    throw new TypeError('exportPNG(svgEl) attend un element <svg> attache au DOM');
  }
  let svgString = await exportSVG(svgEl, opts);
  const hasForeignObject = /<foreignObject[\s>]/.test(svgString);
  if (hasForeignObject) {
    if (opts.richNodes === 'strip') {
      svgString = stripForeignObjects(svgString);
    } else {
      console.warn(
        '[exportPNG] noeud(s) riche(s) (<foreignObject>) detecte(s) — rendu correct sur Chrome/Firefox/Edge, ' +
          'potentiellement casse sur Safari (bug WebKit connu, cf. #664). Utiliser { richNodes: "strip" } pour ' +
          'un export garanti multi-navigateur (perte de fidelite visuelle des noeuds riches).'
      );
    }
  }

  const viewBox = readViewBox(svgEl);
  const rect = typeof svgEl.getBoundingClientRect === 'function' ? svgEl.getBoundingClientRect() : null;
  const baseWidth = (viewBox && viewBox.width) || (rect && rect.width) || 300;
  const baseHeight = (viewBox && viewBox.height) || (rect && rect.height) || 150;
  const scale = opts.scale || (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const width = Math.max(1, Math.round(baseWidth * scale));
  const height = Math.max(1, Math.round(baseHeight * scale));

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('exportPNG: echec de chargement du SVG intermediaire'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('exportPNG: canvas.toBlob() a renvoye null'))),
        opts.mimeType || 'image/png',
        opts.quality
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
