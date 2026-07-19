// svg.js — helper de création SVG (#657, I1a)
// Source canonique ES module — cf. spec §2 (commentaire de groom/spec #657).
// Refactor pur : sortie identique à document.createElementNS(NS, tag) + boucle setAttribute.
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {string} tag - nom de la balise SVG (ex: 'path', 'circle', 'g')
 * @param {Object} [attrs] - attributs à poser ; les valeurs null/undefined sont ignorées
 * @returns {SVGElement}
 */
export function svg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const k in attrs) {
      if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
  }
  return el;
}
