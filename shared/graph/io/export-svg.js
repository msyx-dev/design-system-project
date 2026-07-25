// export-svg.js — export SVG autonome ("fidele") du graphe rendu (#664, I6 export/import)
// DOM-ONLY : XMLSerializer, getComputedStyle, fetch/DOMParser (resolution des <use> du
// sprite). AUCUN acces DOM au CHARGEMENT du module (uniquement dans les corps de
// fonctions ci-dessous) -> import() ne plante PAS sous Node (verifie par
// tests/regression/graph-io.test.js, "smoke test" d'import) meme si l'appel reel des
// fonctions exige un environnement navigateur.
//
// ---- Strategie fonts (#664, "documente ton choix") ----
// AUCUN embarquement data-URI des binaires .woff2 (Inter/Space Grotesk/Fira Code) dans
// le SVG exporte : plusieurs centaines de Ko par graisse/format, + question de licence
// de redistribution embarquee hors de ce depot (fonts Google, cf. discussion #664 sur
// jsPDF/svg2pdf ecartes pour la meme raison de licence). On inline uniquement la
// declaration `font-family` RESOLUE (via getComputedStyle, cascade var(--font-*) deja
// appliquee) — le rendu hors DS retombe sur les polices systeme du lecteur
// (`ui-sans-serif, system-ui, -apple-system, sans-serif`, fallback deja present dans
// tokens.css) si Inter/Space Grotesk ne sont pas installees localement. Compromis
// assume : rendu lisible partout, typographie non-identique sans les fonts DS
// installees — coherent avec le perimetre "0 dependance lourde" de #664.
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const SPRITE_CACHE = new Map();

/** Proprietes de presentation SVG figees en style inline = "theme fige au moment de
 * l'export" (#664) — le SVG exporte redevient independant de la cascade CSS du DS
 * (tokens.css/graph.css) une fois ouvert hors du DS (autre onglet, autre machine). */
const INLINE_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'opacity',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
];

function resolveHrefFragment(href) {
  const hashIdx = href.indexOf('#');
  if (hashIdx === -1) return null;
  return { file: href.slice(0, hashIdx) || null, id: href.slice(hashIdx + 1) };
}

async function fetchSpriteDoc(file) {
  if (SPRITE_CACHE.has(file)) return SPRITE_CACHE.get(file);
  const promise = (async () => {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`sprite "${file}" introuvable (HTTP ${res.status})`);
    const text = await res.text();
    return new DOMParser().parseFromString(text, 'image/svg+xml');
  })();
  SPRITE_CACHE.set(file, promise);
  return promise;
}

/**
 * Inline les `<symbol>` references par les `<use href="fichier.svg#id">` du clone dans
 * un `<defs>` local, puis reecrit `href` en fragment LOCAL (`#id`) — sortie 100%
 * autonome (n'a plus besoin du fichier sprite a cote). Les icones dont le sprite n'a
 * pas pu etre resolu (offline, id introuvable) sont laissees telles quelles + un
 * `console.warn` documente (jamais de throw : l'export reste utilisable sans icones).
 * @param {SVGSVGElement} clone
 */
async function inlineSpriteUses(clone) {
  const uses = Array.from(clone.querySelectorAll('use'));
  if (!uses.length) return;

  const needed = new Map(); // file -> Set<id>
  uses.forEach((use) => {
    const href = use.getAttribute('href') || use.getAttributeNS(XLINK_NS, 'href');
    if (!href) return;
    const ref = resolveHrefFragment(href);
    if (!ref || !ref.file) return; // deja un fragment local -> rien a faire
    if (!needed.has(ref.file)) needed.set(ref.file, new Set());
    needed.get(ref.file).add(ref.id);
  });
  if (!needed.size) return;

  let defs = clone.querySelector('defs');
  if (!defs) {
    defs = clone.ownerDocument.createElementNS(SVG_NS, 'defs');
    clone.insertBefore(defs, clone.firstChild);
  }

  const inlinedIds = new Set();
  for (const [file, ids] of needed) {
    let spriteDoc;
    try {
      spriteDoc = await fetchSpriteDoc(file);
    } catch (err) {
      console.warn(`[exportSVG] sprite "${file}" injoignable (${err.message}) — icone(s) ignoree(s) : ${Array.from(ids).join(', ')}`);
      continue;
    }
    ids.forEach((id) => {
      if (inlinedIds.has(id)) return;
      const symbol = spriteDoc.getElementById(id);
      if (!symbol) {
        console.warn(`[exportSVG] symbole "#${id}" introuvable dans ${file} — icone ignoree`);
        return;
      }
      defs.appendChild(clone.ownerDocument.importNode(symbol, true));
      inlinedIds.add(id);
    });
  }

  uses.forEach((use) => {
    const href = use.getAttribute('href') || use.getAttributeNS(XLINK_NS, 'href');
    if (!href) return;
    const ref = resolveHrefFragment(href);
    if (!ref || !ref.file || !inlinedIds.has(ref.id)) return;
    use.setAttribute('href', `#${ref.id}`);
    use.removeAttribute('xlink:href');
  });
}

/**
 * Inline en `style=""` les proprietes RESOLUES (getComputedStyle) de chaque element
 * source vers son homologue clone (meme position dans l'arbre — deep clone strict,
 * meme nombre de noeuds). Source = arbre ATTACHE (le clone, detache, ne resoudrait
 * aucun style utile). Defensif : arbre inattendu (nombre d'elements different) -> pas
 * d'inline, le SVG retombe sur la cascade CSS (perte de fidelite hors DS, jamais de
 * crash).
 * @param {SVGSVGElement} sourceRoot - element ATTACHE au document (rendu reel)
 * @param {SVGSVGElement} cloneRoot - clone (detache) a annoter
 */
function inlineComputedStyles(sourceRoot, cloneRoot) {
  const doc = sourceRoot.ownerDocument;
  const win = doc && doc.defaultView;
  if (!win || typeof win.getComputedStyle !== 'function') return;
  const sourceEls = [sourceRoot, ...sourceRoot.querySelectorAll('*')];
  const cloneEls = [cloneRoot, ...cloneRoot.querySelectorAll('*')];
  if (sourceEls.length !== cloneEls.length) return;
  sourceEls.forEach((srcEl, i) => {
    const cs = win.getComputedStyle(srcEl);
    const decl = INLINE_PROPS.map((prop) => {
      const v = cs.getPropertyValue(prop);
      return v ? `${prop}:${v}` : '';
    })
      .filter(Boolean)
      .join(';');
    if (!decl) return;
    const cloneEl = cloneEls[i];
    const existing = cloneEl.getAttribute('style');
    cloneEl.setAttribute('style', existing ? `${existing};${decl}` : decl);
  });
}

/**
 * @param {SVGSVGElement} svgEl - `.graph-canvas` ATTACHE au DOM (getComputedStyle exige
 *   un element rendu — cf. `createGraph()`/instance retournee, propriete `svg`).
 * @param {{inlineIcons?:boolean}} [opts] - `inlineIcons:false` saute la resolution des
 *   `<use>` (utile hors-ligne / sprite non servi) — les icones seront alors absentes
 *   du SVG exporte (comportement documente, pas un echec).
 * @returns {Promise<string>} SVG serialise, autonome (styles + icones inlines,
 *   thème fige a l'instant de l'appel).
 */
export async function exportSVG(svgEl, opts = {}) {
  if (!svgEl || typeof svgEl.cloneNode !== 'function') {
    throw new TypeError('exportSVG(svgEl) attend un element <svg> attache au DOM');
  }
  const clone = svgEl.cloneNode(true);
  inlineComputedStyles(svgEl, clone);
  if (opts.inlineIcons !== false) await inlineSpriteUses(clone);
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('xmlns:xlink', XLINK_NS);
  const serialized = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
}
