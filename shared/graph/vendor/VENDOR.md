# Vendoring — dagre (layout Sugiyama, moteur graph #670)

> 1ʳᵉ dépendance tierce vendorée du DS (`shared/graph/`). Décision : ADR-0001
> (« Layout dagre vendoré » — cœur maison + dagre vendoré + rendu SVG).

| Paquet | Version pinnée | Licence |
|---|---|---|
| `@dagrejs/dagre` | `3.0.0` | MIT (`LICENSE-dagre`) |
| `@dagrejs/graphlib` | `4.0.1` | MIT (`LICENSE-graphlib`) |

Fork **maintenu** de l'organisation `dagrejs` — **PAS** le legacy `dagre@0.8.5`
(cpettitt, non maintenu depuis 2018).

## Artefact

- **Fichier** : `graph-layered.js` — bundle ESM esbuild (`--format=esm
  --platform=neutral --target=es2019`), **lisible, AUCUN `min.js`**,
  `--legal-comments=inline` (mentions de licence conservées dans la sortie).
- **Taille** : ~53.5 KB brut / ~15.2 KB gzip (mesuré au build, cf.
  `shared/perf-budget.json`).
- **Régénération** : `./shared/graph/vendor/build-vendor.sh` — reproductible,
  patron `shared/icons/build-sprite.sh` (sandbox `mktemp -d` jetable, jamais
  de `node_modules` committé dans `shared/graph/vendor/`).
- **Intégrité** : `sha256 = 29e50037ae8a00b7f10477a90468bef47f67f2c0c4e870b363d2da04fff64724`
  (recalculé par `build-vendor.sh` à chaque régénération — reporter la nouvelle
  valeur ici après tout bump de version).
- **Chargement** : `dynamic import()` par `shared/graph/layout/layered.js`
  (`loadDagre()`) — **HORS** du bundle de base. Ne charge que si
  `layout:'layered'` est effectivement utilisé. **Deux specifiers selon le
  contexte d'exécution** (cf. commentaire de tête de `loadDagre()`) :
  - **ESM brut** (Node/tests, futur bundler `@msyx-dev/react`) : chemin
    relatif classique `../vendor/graph-layered.js`, résolu contre l'URL de
    `layered.js` lui-même → `shared/graph/vendor/graph-layered.js`.
  - **Bundle IIFE navigateur** (`shared/dist/graph.global.js`) : chemin
    **absolu site-root** `/shared/graph/vendor/graph-layered.js` — un chemin
    relatif serait résolu contre l'URL du `<script>` (`shared/dist/`), pas
    contre l'URL d'origine de `layered.js` (profondeurs différentes après
    bundling). Même convention que le sprite d'icônes déjà en place
    (`render/svg-renderer.js`, `href="/shared/icons/sprite.svg"`).
  - Le specifier est calculé dans une **variable** (`spec`), qu'esbuild ne
    peut pas résoudre statiquement en sortie IIFE (pas de littéral analysable)
    → **jamais inliné**, garantie plus robuste que le seul `--external`
    (conservé dans `build.sh` en défense en profondeur).
  - **Implication consumers** (`sync.sh --with-graph`) : le fichier doit être
    servi à l'URL absolue `/shared/graph/vendor/graph-layered.js` sur le site
    du consommateur (même limitation déjà acceptée pour le sprite d'icônes).

## Surface CVE / veille

- **Surface** : très faible — dagre est du **calcul pur** (maths de layout de
  graphe, Sugiyama), **aucun I/O, réseau, filesystem, `eval`**. Aucune CVE
  connue à ce jour (2026-07-19) sur `@dagrejs/dagre` ni `@dagrejs/graphlib`.
- **Owner CVE / veille** : **mainteneur DS (parent)**.
- **Cadence** : veille **trimestrielle** + réaction immédiate sur alerte
  Dependabot du repo upstream (`github.com/dagrejs/dagre`,
  `github.com/dagrejs/graphlib`) ou avis GitHub Advisory.
- **Procédure de bump** : mettre à jour `DAGRE_VER`/`GRAPHLIB_VER` dans
  `build-vendor.sh`, relancer le script, reporter la nouvelle version + le
  nouveau hash sha256 dans ce fichier, régénérer `shared/dist/graph.global.js`
  (`npm run build:graph`) et vérifier `shared/perf-budget.sh`.

## Runtime vs build

- **`devDependencies` build-only** (racine `package.json`) : `@dagrejs/dagre`
  + `@dagrejs/graphlib` ne sont **jamais** des dépendances runtime — elles ne
  servent qu'à `build-vendor.sh` (installées dans un sandbox `mktemp`
  jetable). Le runtime consomme uniquement le fichier `graph-layered.js`
  **committé**. Le DS reste **zéro dépendance runtime**.
