#!/usr/bin/env bash
# build.sh — esbuild borné (#657, I1a)
# Compile shared/graph/lib/global-entry.js (ESM) -> shared/dist/graph-lib.global.js (IIFE).
# Scope volontairement minimal : n'emet QUE pointerDrag()/svg() pour le monde monolithe
# (components.js). Ne bundle PAS encore le moteur graph (model/layout/render = stubs I1b+).
#
# Le DS n'a pas de build a la deploiement (Caddy sert les fichiers statiques tels quels,
# cf. CLAUDE.md "Deploy") -> shared/dist/graph-lib.global.js est un artefact GENERE mais
# COMMITE (meme logique que shared/icons/sprite.svg via build-sprite.sh).
#
# Usage : ./shared/graph/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

mkdir -p shared/dist

npx --yes esbuild shared/graph/lib/global-entry.js \
  --bundle \
  --format=iife \
  --target=es2019 \
  --banner:js="/* GENERE — ne pas editer a la main. Source: shared/graph/lib/. Regenerer via ./shared/graph/build.sh (#657) */" \
  --outfile=shared/dist/graph-lib.global.js

echo "OK: shared/dist/graph-lib.global.js genere"

# Moteur complet (model+layout+render) -> window.MSYXGraph (#666, I1b-2)
# Bundle DISTINCT du lib mince ci-dessus : charge UNIQUEMENT la ou l'on rend un graphe.
#
# --external:*graph-layered.js (#670, I3-2 — esbuild n'autorise qu'UN seul wildcard "*"
# par pattern external, d'ou l'absence de "*" final vs le sketch de spec) : layout/
# layered.js fait un dynamic
# import('../vendor/graph-layered.js') pour charger dagre. esbuild en --format=iife NE
# fait PAS de code-splitting et SUIT les import() -> sans --external il inlinerait dagre
# (~54 KB brut / ~15 KB gzip) dans ce bundle, alourdissant TOUTES les pages qui rendent
# un graphe (meme celles n'utilisant jamais 'layered'). --external garde l'import()
# comme un vrai import runtime -> dagre ne charge que si layout:'layered' est utilise.
npx --yes esbuild shared/graph/global-entry-engine.js \
  --bundle \
  --format=iife \
  --target=es2019 \
  --external:*graph-layered.js \
  --banner:js="/* GENERE — ne pas editer a la main. Source: shared/graph/. Regenerer via ./shared/graph/build.sh (#666, --external dagre #670) */" \
  --outfile=shared/dist/graph.global.js

echo "OK: shared/dist/graph.global.js genere (dagre vendore HORS bundle, --external #670)"
