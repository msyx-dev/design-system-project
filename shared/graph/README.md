# shared/graph/ — moteur graphique node-link (I1a fondations + I1b-1 modèle + I1b-2 rendu + I2-1 viewport + I2-2 fit/sélection/ResizeObserver + I3-1/I3-2 layouts riches)

> Issue #657 (I1a) : fondations — utils partagés, discipline de teardown, tokens,
> squelette de dossiers, anti-barrel CI, perf-budget. Issue #665 (I1b-1) : le
> **modèle** (`model/`) — data pure, DOM-free, aucun rendu. Issue #666 (I1b-2) : le
> **1er rendu** — `layout/` (fixed+tree, purs DOM-free) + `render/` (SvgRenderer,
> pipeline measure→layout→paint) + alternative a11y table + bundle global dédié.
> Issue #667 (I2-1) : le **viewport** pan/zoom/pinch (`render/viewport.js`) — transform
> sur un nouveau `<g class="graph-viewport">`, `screenToWorld` via `getScreenCTM`,
> `non-scaling-stroke`, bornes `--graph-zoom-min/-max`. Issue #669 (I3-1) : layout
> **`radial`** (mindmap 360°, purs DOM-free) + **auto-détection** de layout
> (`detect.js` + wrapper `'auto'`) — route `tree`/`layered` selon la topologie.
> Issue #670 (I3-2) : layout **`layered`** (Sugiyama via **dagre vendoré**,
> `shared/graph/vendor/` — 1ʳᵉ dépendance tierce vendorée du DS, dynamic import, seul
> layout **ASYNC**) + layout **`mindmap`** bilatéral maison (1er use case client NHOOD)
> + `paint()` async-tolérant (`_applyLayout` + token anti-course). L'auto-détection
> route désormais réellement vers `layered` (`hasLayout('layered')` est vrai).
> Issue #668 (I2-2) : **fit-to-content** (`fit()` = reset à l'identité — le `viewBox`
> posé par `paint()` cadre déjà le contenu, aucun calcul de bbox) + **`zoomToNode(id)`**
> (centre+zoome, s'appuie sur `this.positions` désormais stocké par `_applyLayout()`)
> + **sélection** nœud/arête portée par le **renderer** (`select()`/`getSelection()`,
> classes `.graph-node--selected`/`.graph-edge--selected`, événement
> `graph:selection:change`) — pré-requis de l'édition (I5), le `GraphModel` reste pur
> + **`ResizeObserver`** (1ʳᵉ primitive RO du DS, débounce rAF, re-fit conditionnel
> `opts.refitOnResize`, teardown dans `destroy()`) + clavier viewport (`Escape`/`f`/
> `+`/`-`/flèches, distinct de la nav nœud-à-nœud I4).

## Structure

```
shared/graph/
  vendor/         graph-layered.js — @dagrejs/dagre@3.0.0 + @dagrejs/graphlib@4.0.1
                  VENDORES (ESM esbuild lisible, AUCUN min.js), MIT. build-vendor.sh
                  (reproductible, patron icons/build-sprite.sh) + VENDOR.md (version
                  pinnee, hash sha256, owner CVE, veille) + LICENSE-dagre +
                  LICENSE-graphlib + NOTICE. Charge en dynamic import() par
                  layout/layered.js UNIQUEMENT si layout:'layered' — HORS du bundle
                  de base (specifier calcule dans une variable, esbuild ne peut pas
                  l'inliner en IIFE, cf. layout/layered.js). #670 (I3-2).
  lib/            pointer-drag.js, svg.js — utils canoniques ES (cf. D1 de la spec #657)
                  index.js   — barrel ESM (consumers ESM : moteur I1b+, @msyx-dev/react)
                  global-entry.js — entrée IIFE (monde monolithe, cf. build.sh)
  model/          graph-model.js — class GraphModel extends EventTarget (CRUD atomique,
                  index d'adjacence, invariants lenient console.warn, evenement
                  'graph:model:change'). to-model.js — toModel(input), normalisation
                  tolerante (jamais de throw). index.js — barrel ESM. DOM-free (aucun
                  document), testable sans jsdom (tests/regression/graph-model.test.js).
                  Shape Cytoscape-alignee : semantique dans data{}, geometrie
                  (position/size) en sibling — size PORTE, jamais mesure. #665 (I1b-1).
  layout/         fixed.js (lit node.position.{x,y}) + tree.js (Reingold-Tilford naif
                  deterministe, forêt + garde anti-cycle) + radial.js (mindmap radiale
                  360°, racine au centre, anneaux ∝ profondeur, secteurs ∝ charge feuille,
                  memes garanties que tree.js — #669, I3-1) + mindmap.js (mindmap
                  BILATERALE maison : racine centrale, branches N1 reparties gauche/
                  droite par glouton d'equilibrage (charge = hauteur cumulee ou nb de
                  feuilles), chaque cote = arbre horizontal RT tourne 90°, cote gauche
                  miroir en x, consomme node.size — 1er use case client NHOOD, toujours
                  EXPLICITE, jamais auto-choisi — #670, I3-2) + layered.js (Sugiyama via
                  dagre VENDORE — shared/graph/vendor/ — dynamic import, SEUL layout
                  ASYNC du moteur : run() renvoie une Promise<Map> ; gere nativement les
                  cycles (greedy FAS interne de dagre) — #670, I3-2) + detect.js
                  (heuristique topologique PURE : arbre 1-racine acyclique -> 'tree',
                  DAG/cyclique -> 'layered', graphe vide -> 'fixed' ; 'radial'/'mindmap'
                  jamais auto-choisis) + auto.js (wrapper layout 'auto' : detecte puis
                  delegue — route desormais reellement vers le vrai 'layered' depuis
                  #670, hasLayout('layered') est vrai) + index.js (registre
                  registerLayout/resolveLayout/hasLayout — 'layered' enregistre via un
                  LOADER LAZY, import('./layered.js') jamais statique, pour ne jamais
                  entrainer dagre dans le bundle de base). PURS — jamais de
                  document/window, testables Node (tests/regression/graph-layout.test.js,
                  graph-layout-radial.test.js, graph-layout-layered.test.js). #666
                  (I1b-2) + #669 (I3-1) + #670 (I3-2). Layout par defaut recommande pour
                  un graphe sans coordonnees : 'auto'.
  render/         svg-renderer.js — class SvgRenderer : pipeline measure (Map interne
                  de tailles, modèle jamais muté) → layout (délègue à layout/) → paint
                  (var(--graph-*) uniquement). paint() est ASYNC-TOLERANT (#670,
                  I3-2) : detecte un run() thenable (layout 'layered') → extraction
                  _applyLayout(positions) + token anti-course (_paintToken, incremente
                  a chaque paint et a destroy() — une resolution async tardive dont le
                  token ne correspond plus devient un no-op). Les layouts synchrones
                  (fixed/tree/radial/mindmap) restent inchanges, aucun frame
                  supplementaire. Cycle observe(graph:model:change) → repaint
                  (rAF-debounce) → destroy (__registerInstance, #657).
                  node-types.js — resolveNodeType() + graphCard() (nœud riche NHOOD :
                  .card/.badge/.chip dans un foreignObject).
                  a11y-table.js — graphToTableModel() PURE (dérivation tabulaire,
                  testable Node) + renderA11yTable() (couche DOM, aria-describedby,
                  contrat a11y PRIMAIRE). #666 (I1b-2).
                  viewport.js — fonctions PURES DOM-free (clampZoom/userToWorld/
                  worldToUser/zoomAt, testables Node) + classe Viewport (câblage DOM :
                  screenToWorld via getScreenCTM().inverse(), pan __pointerDrag deltas
                  maison, pinch tracker 2-pointeurs Map<pointerId>, wheel-zoom ancré
                  curseur rAF-throttle, événement graph:viewport:change sur .graph).
                  #667 (I2-1). SvgRenderer.fit()/.zoomToNode(id)/.select(id)/
                  .getSelection() délèguent le calcul pur à viewport.js (zoomAt/
                  clampZoom) tout en vivant dans le renderer (accès aux positions +
                  modèle + el) — #668 (I2-2).
  index.js        createGraph(el, opts) -> {model, destroy, svg, getViewport,
                  setViewport, screenToWorld, fit, zoomToNode, select, getSelection}
                  — API publique ESM. #667 (I2-1) + #668 (I2-2).
  global-entry-engine.js — entrée IIFE moteur complet -> window.MSYXGraph
                  {createGraph, GraphModel, toModel}. Bundle DISTINCT de
                  graph-lib.global.js (2e sortie esbuild, cf. build.sh).
  package.json    { "type": "module" } — scope ESM local, n'affecte pas le reste du repo
  build.sh        esbuild borné → shared/dist/graph-lib.global.js + shared/dist/graph.global.js
```

## `model/` — GraphModel (I1b-1, #665)

`GraphModel` n'est **pas** émis dans le global `shared/dist/graph-lib.global.js` :
c'est un module ESM pur, importé par le futur barrel moteur (`shared/graph/index.js`,
I1b-2) et par le test unitaire. `build.sh` reste **inchangé** par cette issue.

`GraphModel.SCHEMA_VERSION` (actuellement `1`) est **PROVISOIRE** — voir le
commentaire de tête de `model/graph-model.js`. Aucune logique version-gated tant
que le round-trip réel sur le consumer d'ancrage `nexus` (I1b-2) n'a pas eu lieu.

## Build

Le DS n'a **aucun build au déploiement** (Caddy sert les fichiers statiques tels quels).
`shared/dist/graph-lib.global.js` est un artefact **généré mais commité** (même logique
que `shared/icons/sprite.svg` via `build-sprite.sh`) :

```bash
./shared/graph/build.sh
```

Régénérer après toute modification de `shared/graph/lib/*.js` et commiter le résultat.

## Frontière de build (décision D1, spec #657)

`pointerDrag()` et `svg()` servent deux mondes :
- **(a) le monolithe `components.js`** (no-build, global) — consommé via
  `window.__pointerDrag` / `window.__svg`, injectés par `shared/dist/graph-lib.global.js`
  chargé **avant** `components.js` sur les pages HTML.
- **(b) le futur moteur `shared/graph/`** en ES modules (bundlé vers `shared/graph.js` +
  dist `@msyx-dev/react`, I1b+) — consommera `lib/index.js` directement.

Source unique, zéro duplication.

## `sync.sh --with-graph` — LIVRÉ (#666, I1b-2)

`shared/sync.sh` copie désormais `graph-lib.global.js` **par défaut** (corrige le gap
latent I1a : `ds-components.js` référence `window.__pointerDrag`/`__svg` depuis #657,
mais `sync.sh` ne le livrait jamais). Le flag `--with-graph` ajoute le moteur complet :
`shared/dist/graph.global.js` (`ds-graph.global.js`, `window.MSYXGraph`) +
`shared/css/components/graph.css` (`components/graph.css`, hors barrel généré — à
charger via `<link>` explicite côté consumer, même pattern que `data.html`). Ordre de
chargement : `ds-graph-lib.global.js` → `ds-graph.global.js` → `ds-components.js`.

## `shared/css/components/graph.css`

Module CSS dédié, **hors barrel** (`components.css`/`components-core.css` ne l'importent
jamais — vérifié par `shared/check-graph-isolation.sh` en CI). Opt-in explicite :
`data.html` le charge via `<link>` direct dans le `<head>` ; un consumer sync.sh passe
`--with-graph` (copié dans `components/graph.css`, jamais ajouté au barrel généré).

## Viewport pan/zoom/pinch (#667, I2-1)

Transform portée par un `<g class="graph-viewport">` qui enveloppe `.graph-edges` +
`.graph-nodes` (inséré dans `_build()`, survit au wipe `innerHTML` de `paint()` — le
`viewBox` calculé par `paint()` reste le cadre « monde/home », inchangé, la transform
vp est préservée entre repaints). `screenToWorld` passe par
`svg.getScreenCTM().inverse()` — le `<svg>` porte un `viewBox` + `preserveAspectRatio`
+ CSS `width:100%;height:auto`, donc **pas 1:1 px avec l'écran** — puis inverse la
transform vp. Pan via `window.__pointerDrag` (le contrat réel n'expose que
`{clientX,clientY}`, les deltas sont calculés depuis le dernier point client). Pinch
via un tracker 2-pointeurs dédié (`pointerDrag` est mono-pointeur). Wheel-zoom ancré
curseur, throttlé `requestAnimationFrame`, bornes `--graph-zoom-min/-max` (tokens I1a)
ou override `opts.zoomMin`/`zoomMax`. `opts.initialViewport` fige un état déterministe
(clé pour une démo/VR stable). Anti-distorsion : `vector-effect:non-scaling-stroke`
sur les arêtes (épaisseur constante au zoom), LOD `.graph--lod-compact` masque les
labels d'arête sous un seuil de `k`. Événement `graph:viewport:change`
(`CustomEvent`, `detail:{tx,ty,k}`, `bubbles:true`) émis sur le conteneur `.graph`
(`el`) — pas sur `GraphModel`, qui reste données pures.

**Contrainte d'intégration (critère d'acceptation #659)** : un ancêtre du conteneur
`.graph` portant un `transform: scale(...)` CSS casse `getScreenCTM()` — le mapping
écran↔monde devient faux (curseur désaligné après zoom/pan). **Interdit côté
consumer.**

Non testé unitairement : `getScreenCTM`/`DOMPoint`/`wheel`/pointer capture ne sont pas
disponibles en jsdom (pas de layout SVG) — le câblage DOM de `Viewport` est couvert
par la démo VR statique (`initialViewport` figé) + vérification manuelle. Les
fonctions pures (`clampZoom`/`userToWorld`/`worldToUser`/`zoomAt`) sont testées Node
(`tests/regression/graph-viewport.test.js`), même parti que le renderer #666 (`measure`
`getBBox` non testé en Node).

## Fit-to-content + `zoomToNode` (#668, I2-2)

`fit()` **ne calcule aucune bbox** : `paint()`/`_applyLayout()` (#666) posent déjà
`viewBox = bbox+marge` avec `preserveAspectRatio="xMidYMid meet"` — à la transform
**identité** (`{tx:0, ty:0, k:1}`), le contenu est *déjà* cadré/centré dans le
rectangle rendu. `fit()` délègue donc simplement à `viewport.setViewport({tx:0,
ty:0, k:1})`. `zoomToNode(id, k=1.5)` a besoin du centre-monde du nœud ciblé :
`_applyLayout(positions)` stocke désormais `this.positions` (le `Map<id,{x,y}>`
calculé par le layout, auparavant jeté après paint) ; `zoomToNode` calcule
`tx = mid.x - center.x*k` (et `ty` symétrique) via `screenToUser` (#667) pour que
`worldToUser(center, vp) === mid` (le nœud se retrouve au centre du `<svg>`).

## Sélection nœud/arête (#668, I2-2) — pré-requis de l'édition (I5)

**Concern de vue, porté par le renderer** — pas par `GraphModel`, qui reste données
pures (invariant #665/#666, jamais muté par le rendu). Contrat :

- API : `graph.select(id | null)` / `graph.getSelection() → {id, kind:'node'|'edge'} | null`.
- État visuel : classes **`.graph-node--selected`** (sur le `<g class="graph-node">`)
  / **`.graph-edge--selected`** (sur le `<path class="graph-edge">`) — modificateurs
  BEM cohérents avec `.graph-edge--strong` existant. Halo via `outline`/`stroke`
  tokens `var(--accent)` (theme-aware, 6 combos).
- Événement : **`graph:selection:change`** (`CustomEvent`, `detail:{id,kind}`,
  `bubbles:true`) sur le conteneur `.graph` (`el`) — même canal que
  `graph:viewport:change` (#667).
- Focus : le nœud sélectionné reçoit `tabindex="-1"` + `.focus()` (sauf sélection
  `silent`, cf. ci-dessous). La navigation roving nœud-à-nœud reste **I4** (hors #668).
- Détail au clic : `opts.onSelect(selection)` si fourni, sinon `window.__openModal`
  (label/type/voisins via `model.neighbors(id)`/`getNode`/`getEdge`, déjà dispo #665).
  `opts.selectionDetail:false` désactive tout détail. Interactif → hors VR.
- Clic sur le fond du SVG (hors nœud/arête) : **ne désélectionne PAS** (le pan tire
  dessus) — seuls `select(null)` et `Escape` désélectionnent.
- `opts.initialSelection` (id) : pose le halo dès l'init, **sans ouvrir le détail**
  (`select(id, {silent:true})` en interne) — état déterministe pour la VR. L'événement
  `graph:selection:change` reste émis normalement.
- **Tooltip hors scope** : le tooltip DS (`.tooltip-wrap .tooltip`, `overlays.css`) est
  CSS-hover en flux normal, inadapté à des nœuds SVG à coordonnées transformées. Le
  détail au clic (modal) couvre le besoin — divergence assumée vs DoD #659.

## Clavier viewport (#668, I2-2)

Distinct de la navigation nœud-à-nœud (I4). Listeners sur `.graph` (`el`,
`tabindex="0"`, posé par `_initKeyboard()`) : `Escape` désélectionne, `f`/`F` appelle
`fit()`, `+`/`-` zooment centrés sur le milieu du `<svg>` (délègue à `zoomAt` de
`viewport.js`), les flèches pannent (nice-to-have). Teardown dans `destroy()`.

## `ResizeObserver` (#668, I2-2) — 1ʳᵉ primitive RO du DS

Le responsive de base est **déjà** assuré par le `viewBox` (le SVG n'est pas 1:1 px
avec l'écran, `getScreenCTM()` s'adapte automatiquement à la taille rendue — centre-
monde et zoom sont préservés sans JS). Le `ResizeObserver` observe `.graph` et ajoute
uniquement un **re-fit optionnel** (`opts.refitOnResize`, défaut `false`) : au resize,
si le viewport n'est **pas** à l'identité (l'utilisateur a déjà navigué), le re-fit est
**skip** — ne jamais casser la vue d'un utilisateur. Débounce `requestAnimationFrame`
(évite toute boucle observer → relayout → observer). `disconnect()` dans `destroy()`.
Non testé unitairement (pas de layout réel en jsdom) — couvert par vérification
manuelle + `__sweepDetached` (non-fuite en nav SPA).

## Jalon nexus (post-merge, piloté par le parent)

`nexus` (`~/.claude/docs/diagrams/nexus.html`, hors du repo DS) alimentera
`window.MSYXGraph.createGraph` avec un arbre/organigramme réel (nœuds riches type
NHOOD) pour valider : (a) round-trip `toModel`/`toJSON` sans perte ; (b) rendu `tree`
correct avec mesure auto des nœuds riches ; (c) a11y table cohérente. **Seulement après
ce round-trip vert**, une micro-issue de suivi gravera `schemaVersion:1` (retire la
réserve « PROVISOIRE » de `to-model.js`/`graph-model.js`). Aucun freeze dans #666.
