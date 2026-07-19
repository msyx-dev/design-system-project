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
