# shared/graph/ — moteur graphique node-link (I1a fondations + I1b-1 modèle + I1b-2 rendu)

> Issue #657 (I1a) : fondations — utils partagés, discipline de teardown, tokens,
> squelette de dossiers, anti-barrel CI, perf-budget. Issue #665 (I1b-1) : le
> **modèle** (`model/`) — data pure, DOM-free, aucun rendu. Issue #666 (I1b-2) : le
> **1er rendu** — `layout/` (fixed+tree, purs DOM-free) + `render/` (SvgRenderer,
> pipeline measure→layout→paint) + alternative a11y table + bundle global dédié.

## Structure

```
shared/graph/
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
                  deterministe, forêt + garde anti-cycle) + index.js (registre
                  registerLayout/resolveLayout). PURS — jamais de document/window,
                  testables Node (tests/regression/graph-layout.test.js). #666 (I1b-2).
  render/         svg-renderer.js — class SvgRenderer : pipeline measure (Map interne
                  de tailles, modèle jamais muté) → layout (délègue à layout/) → paint
                  (var(--graph-*) uniquement). Cycle observe(graph:model:change) →
                  repaint (rAF-debounce) → destroy (__registerInstance, #657).
                  node-types.js — resolveNodeType() + graphCard() (nœud riche NHOOD :
                  .card/.badge/.chip dans un foreignObject).
                  a11y-table.js — graphToTableModel() PURE (dérivation tabulaire,
                  testable Node) + renderA11yTable() (couche DOM, aria-describedby,
                  contrat a11y PRIMAIRE). #666 (I1b-2).
  index.js        createGraph(el, opts) -> {model, destroy, svg} — API publique ESM.
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

## Jalon nexus (post-merge, piloté par le parent)

`nexus` (`~/.claude/docs/diagrams/nexus.html`, hors du repo DS) alimentera
`window.MSYXGraph.createGraph` avec un arbre/organigramme réel (nœuds riches type
NHOOD) pour valider : (a) round-trip `toModel`/`toJSON` sans perte ; (b) rendu `tree`
correct avec mesure auto des nœuds riches ; (c) a11y table cohérente. **Seulement après
ce round-trip vert**, une micro-issue de suivi gravera `schemaVersion:1` (retire la
réserve « PROVISOIRE » de `to-model.js`/`graph-model.js`). Aucun freeze dans #666.
