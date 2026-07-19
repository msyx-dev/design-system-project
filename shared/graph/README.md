# shared/graph/ — moteur graphique node-link (I1a fondations + I1b-1 modèle)

> Issue #657 (I1a) : fondations — utils partagés, discipline de teardown, tokens,
> squelette de dossiers, anti-barrel CI, perf-budget. Issue #665 (I1b-1) : le
> **modèle** (`model/`) — data pure, DOM-free, aucun rendu. Le renderer SVG
> (`render/`) arrive en I1b-2 (#666).

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
  layout/         .gitkeep — dagre vendoré (I1b-2/I3)
  render/         .gitkeep — rendu SVG (I1b-2, #666)
  package.json    { "type": "module" } — scope ESM local, n'affecte pas le reste du repo
  build.sh        esbuild borné → shared/dist/graph-lib.global.js
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

## `sync.sh --with-graph` — DIFFÉRÉ à I1b/I3

`shared/sync.sh` ne distribue aujourd'hui que `nav.js`/`components.js` (référencés en dur).
`shared/graph/` n'est **pas encore** distribué aux projets consommateurs — décision de
groom actée : on attend que le moteur soit réellement consommable (nexus, I1b/I3) avant
d'ouvrir un flag `--with-graph` dans `sync.sh`. Ce n'est pas un oubli.

## `shared/css/components/graph.css`

Module CSS dédié, **hors barrel** (`components.css`/`components-core.css` ne l'importent
jamais — vérifié par `shared/check-graph-isolation.sh` en CI). Opt-in explicite : un
consumer qui veut le moteur graph devra un jour passer `--components=graph` (à câbler
en même temps que `sync.sh --with-graph`, I1b/I3).
