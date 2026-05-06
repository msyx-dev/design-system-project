#!/usr/bin/env bash
# build-sprite.sh — Construit shared/icons/sprite.svg depuis lucide-static
# Usage : ./shared/icons/build-sprite.sh
# Prerequis : node + npm disponibles (node_modules/lucide-static installé via npm install lucide-static)
# Reproductible : meme output pour meme version de lucide-static

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ICONS_SRC="$PROJECT_ROOT/node_modules/lucide-static/icons"
OUTPUT="$SCRIPT_DIR/sprite.svg"

# Installer lucide-static si absent
if [ ! -d "$PROJECT_ROOT/node_modules/lucide-static" ]; then
  echo "→ Installation lucide-static + svgo..."
  npm install --prefix "$PROJECT_ROOT" lucide-static svgo 2>&1
fi

# Liste des 50 glyphes cibles (groupés par usage)
ICONS=(
  # Navigation (8)
  home menu chevron-left chevron-right chevron-up chevron-down arrow-left arrow-right
  # Action (10)
  plus minus edit trash copy link external-link download upload refresh-cw
  # Status (8)
  check x info alert-circle alert-triangle check-circle x-circle loader
  # Content (8)
  file folder image code terminal layout layers package
  # User/Communication (6)
  user users mail phone calendar clock
  # System (6)
  settings bell search eye lock palette
  # Brand/Misc (7)
  git-branch message-circle sun moon zap sparkles rocket
)

echo "→ Extraction et nettoyage de ${#ICONS[@]} icones Lucide via Python..."

# Utiliser Python pour un parsing SVG propre
python3 - "$ICONS_SRC" "${ICONS[@]}" <<'PYEOF'
import sys
import os
import re

icons_src = sys.argv[1]
icons = sys.argv[2:]

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:none">']

missing = []
for icon in icons:
    src = os.path.join(icons_src, f"{icon}.svg")
    if not os.path.exists(src):
        missing.append(icon)
        continue
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extraire viewBox
    vb_match = re.search(r'viewBox="([^"]+)"', content)
    viewbox = vb_match.group(0) if vb_match else 'viewBox="0 0 24 24"'

    # Extraire le contenu interne (entre <svg...> et </svg>)
    # Supprimer commentaires, puis extraire entre les balises svg
    content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    inner_match = re.search(r'<svg[^>]*>(.*?)</svg>', content, re.DOTALL)
    if not inner_match:
        missing.append(icon)
        continue
    inner = inner_match.group(1).strip()

    # Nettoyer les attributs fill/stroke hardcodés qui bloqueraient l'héritage CSS
    # On veut que le CSS (.icon) contrôle stroke/fill
    inner = re.sub(r'\s*stroke="[^"]*"', '', inner)
    inner = re.sub(r'\s*fill="[^"]*"', '', inner)
    inner = re.sub(r'\s*stroke-width="[^"]*"', '', inner)
    inner = re.sub(r'\s*stroke-linecap="[^"]*"', '', inner)
    inner = re.sub(r'\s*stroke-linejoin="[^"]*"', '', inner)
    inner = re.sub(r'\s*class="[^"]*"', '', inner)
    # Normaliser whitespace
    inner = re.sub(r'\s+', ' ', inner).strip()

    lines.append(f'  <symbol id="i-{icon}" {viewbox}>{inner}</symbol>')

lines.append('</svg>')

with open('/tmp/sprite-raw.svg', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

if missing:
    print(f"⚠ Icones manquantes (ignorees) : {', '.join(missing)}", file=sys.stderr)
print(f"✓ {len(lines) - 3} symboles extraits", file=sys.stdout)
PYEOF

echo "→ Optimisation svgo --multipass..."
SVGO_BIN="$PROJECT_ROOT/node_modules/.bin/svgo"
if [ -f "$SVGO_BIN" ]; then
  "$SVGO_BIN" --multipass \
    --config '{"plugins":[{"name":"preset-default","params":{"overrides":{"removeViewBox":false,"removeHiddenElems":false,"collapseGroups":false,"cleanupIds":false}}}]}' \
    --input /tmp/sprite-raw.svg --output "$OUTPUT" 2>&1 && SVGO_OK=true || SVGO_OK=false
  if [ "$SVGO_OK" = "false" ]; then
    echo "⚠ svgo a rencontre une erreur, utilisation du sprite non-optimise" >&2
    cp /tmp/sprite-raw.svg "$OUTPUT"
  fi
else
  echo "⚠ svgo non disponible dans node_modules, sprite non-optimise" >&2
  cp /tmp/sprite-raw.svg "$OUTPUT"
fi

# Nettoyage
rm -f /tmp/sprite-raw.svg

# Vérification taille
SIZE=$(wc -c < "$OUTPUT")
SIZE_KB=$((SIZE / 1024))
echo "→ Sprite genere : $OUTPUT (${SIZE_KB} KB, ${SIZE} bytes)"

if [ "$SIZE" -gt 51200 ]; then
  echo "⚠ Attention : sprite > 50 KB ($SIZE bytes). Verifier les icones incluses." >&2
else
  echo "✓ Sprite < 50 KB — OK"
fi

# Compter les symboles
SYMBOL_COUNT=$(grep -c '<symbol\|<symbol ' "$OUTPUT" 2>/dev/null || echo "?")
echo "✓ ${SYMBOL_COUNT} symboles dans le sprite"
echo "✓ Sprite disponible : $OUTPUT"
