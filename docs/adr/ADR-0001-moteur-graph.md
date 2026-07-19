# ADR-0001 — Moteur graphique node-link du design system

- **Statut** : Accepté
- **Date** : 2026-07-19
- **Issue** : #657 (I1a — fondations + remboursement de dette)

## Contexte

Le DS n'a aujourd'hui aucun moteur de rendu graphique node-link (graphe de nœuds/arêtes).
Les besoins de ce type sont couverts par des fragments dispersés et non réutilisables :
`pie/donut chart` et `progress-tracker` créent des éléments SVG à la main
(`document.createElementNS` dupliqué sur 5 sites), et le drag pointer est réimplémenté
différemment selon les composants (`split-pane` en Pointer Events propres, `before-after`
en legacy mouse+touch dupliqué sur `document`, sans jamais être retiré — fuite mémoire en
navigation SPA). Un besoin métier de graphe (arborescence de décision, dépendances,
topologie) est anticipé sur plusieurs consumers msyx.fr.

## Décision

- **Cœur maison mince** : le moteur (`shared/graph/`) est développé en interne, pas une
  dépendance externe lourde. Découpage strict `model/` (données) ≠ `layout/` (positionnement)
  ≠ `render/` (rendu visuel) — chaque couche remplaçable indépendamment.
- **Layout `dagre` vendoré** : l'algorithme de layout hiérarchique (Sugiyama) est vendoré
  dans le repo plutôt que réimplémenté à la main ou tiré en dépendance runtime — évite le
  risque d'un hand-roll fragile tout en gardant zéro dépendance externe au runtime consumer.
- **Rendu SVG par défaut** : cohérent avec le reste du DS (pie/donut, progress-tracker
  utilisent déjà SVG), accessible (DOM inspectable, `aria-*` posables sur les nœuds/arêtes),
  themeable via tokens CSS (`--graph-*`).
- **Vanilla-first, une source, deux cibles** : les utils partagés (`pointerDrag()`, `svg()`)
  sont écrits en ES modules dans `shared/graph/lib/`, puis émis via une **esbuild bornée**
  (1ʳᵉ brique du DS avec un build, jusqu'ici 100 % statique) en IIFE global
  (`shared/dist/graph-lib.global.js`, `window.__pointerDrag`/`window.__svg`) pour le monde
  monolithe `components.js` (no-build). Source unique, zéro duplication (cf. décision D1,
  spec #657).
- **V1 = read-only + édition** : la première itération livrable rend un graphe et permet son
  édition basique (déplacement de nœuds, sélection) — pas de collaboration temps réel, pas
  d'auto-layout dynamique au premier jet.

## Alternatives rejetées

- **xyflow (React Flow)** — React-only. Le DS sert des consumers vanilla ET React ; adopter
  xyflow verrouillerait le moteur au monde React et romprait la promesse « DS = source unique
  CSS + tokens + composants » pour tout consumer non-React.
- **Cytoscape.js / G6** — moteurs de rendu complets avec leur propre système de style
  (souvent Canvas-based ou config JSON opaque). Anti-tokens : impossible de les themer
  proprement via les variables CSS `--graph-*`/cascade `data-theme`/`data-mode` du DS sans
  fork ou surcouche lourde. Rendu Canvas casse aussi l'accessibilité DOM attendue du DS.
- **Hand-roll Sugiyama complet** — réimplémenter un algorithme de layout hiérarchique à la
  main est un investissement disproportionné et source de bugs subtils (croisements d'arêtes,
  cycles) par rapport à vendorer une implémentation éprouvée (dagre).

## Conséquences

- **1ʳᵉ brique DS avec un build vanilla** : introduit `esbuild` comme devDependency et un
  script `shared/graph/build.sh` — scope volontairement borné (2 utils, pas le moteur
  complet) pour limiter le risque sur un repo jusqu'ici 100 % statique (Caddy `file_server`,
  aucun build au déploiement). L'artefact généré (`shared/dist/graph-lib.global.js`) est
  **commité**, pas construit en CI/déploiement.
- **Dette remboursée** : `pointerDrag()` unifie `split-pane` (déjà Pointer Events) et
  `before-after` (legacy mouse+touch avec fuite `document`, corrigée) ; `svg()` élimine 5
  duplications de `createElementNS` (pie/donut + progress-tracker). Kanban (HTML5 DnD natif)
  et sortable-list (reorder+clone 2D) restent hors-scope — patterns structurellement
  différents, aucun bénéfice à les faire rentrer de force dans `pointerDrag()`.
- **A11y clavier net-neuf** : le moteur V1 (I1b+) devra spécifier dès le départ la navigation
  clavier des nœuds/arêtes (pas de dette a11y héritée d'un renderer externe).
- **`sync.sh --with-graph` différé** : le moteur n'étant pas encore consommable (squelette
  seul en I1a), la distribution aux projets consommateurs attend I1b/I3 (documenté dans
  `shared/graph/README.md`, pas un oubli).
- **Discipline de teardown généralisée** : le registre `__registerInstance`/`__sweepDetached`
  introduit dans `components.js` pour sécuriser `pointerDrag()` bénéficie potentiellement à
  tout futur composant JS avec listeners destructibles, au-delà du seul scope graph.

## Référence

Architecture validée par Mike (2026-07-18) — artefact de conception détaillé conservé comme
référence de travail (cf. mémoire projet `project_graph_engine_architecture`). Epic #656 /
milestone #45 / issues #657-664 (V1 ≈58 SP, read-only + édition).
