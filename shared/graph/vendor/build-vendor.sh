#!/usr/bin/env bash
# build-vendor.sh — vendoring reproductible de dagre (Sugiyama) pour le moteur graph.
# 1re dependance tierce vendoree (#670, I3-2). Patron : shared/icons/build-sprite.sh.
# Reproductible : version PINNEE -> bundle ESM lisible -> hash d'integrite.
# AUCUN min.js. Sortie commitee (le DS n'a pas de build au deploiement).
#
# Usage : ./shared/graph/vendor/build-vendor.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

DAGRE_VER="3.0.0"        # <-- version PINNEE (source unique : VENDOR.md)
GRAPHLIB_VER="4.0.1"
OUT="$SCRIPT_DIR/graph-layered.js"

echo "-> Vendoring @dagrejs/dagre@$DAGRE_VER + @dagrejs/graphlib@$GRAPHLIB_VER..."

# Sandbox jetable (jamais de node_modules dans shared/graph/vendor/)
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"

npm pack "@dagrejs/dagre@$DAGRE_VER" "@dagrejs/graphlib@$GRAPHLIB_VER" >/dev/null
npm install --no-save --no-audit --no-fund "@dagrejs/dagre@$DAGRE_VER" "@dagrejs/graphlib@$GRAPHLIB_VER" >/dev/null

# Point d'entree : re-export ESM par defaut de dagre (graphlib est une dep interne).
printf "export { default } from '@dagrejs/dagre';\nexport * from '@dagrejs/dagre';\n" > entry.mjs

npx --yes esbuild entry.mjs \
  --bundle --format=esm --platform=neutral --target=es2019 \
  --legal-comments=inline \
  --banner:js="/* VENDORE — genere par shared/graph/vendor/build-vendor.sh, ne pas editer.
   @dagrejs/dagre@$DAGRE_VER + @dagrejs/graphlib@$GRAPHLIB_VER (MIT). Voir VENDOR.md (#670). */" \
  --outfile="$OUT"

# Licences upstream conservees
cp "node_modules/@dagrejs/dagre/LICENSE"    "$SCRIPT_DIR/LICENSE-dagre"
cp "node_modules/@dagrejs/graphlib/LICENSE" "$SCRIPT_DIR/LICENSE-graphlib"

cd "$ROOT"

# Hash d'integrite (reproductibilite du build)
if command -v sha256sum >/dev/null 2>&1; then
  HASH="$(sha256sum "$OUT" | awk '{print $1}')"
else
  HASH="$(shasum -a 256 "$OUT" | awk '{print $1}')"
fi
SIZE="$(wc -c < "$OUT" | tr -d ' ')"

echo "OK: $OUT ($SIZE octets) sha256=$HASH"
echo "-> Reporter DAGRE_VER/GRAPHLIB_VER + sha256 + taille dans shared/graph/vendor/VENDOR.md"
