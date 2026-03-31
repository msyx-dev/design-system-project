#!/bin/bash
set -euo pipefail

# sync.sh — Synchronise les fichiers CSS du design system vers un projet consommateur
# Usage : ./sync.sh [--no-showcase] <répertoire-cible>
# Exemple : ./sync.sh --no-showcase /home/deployer/projects/prod/acssi-core-project/src/styles/
#
# --no-showcase : supprime les règles showcase (.main section, .demo-*, .subsection, .subgroup-*)
#                 de ds-layout.css après copie (recommandé pour les projets consommateurs)

NO_SHOWCASE=false
if [[ "${1:-}" == "--no-showcase" ]]; then
    NO_SHOWCASE=true
    shift
fi

DS_DIR="$(cd "$(dirname "$0")/css" && pwd)"
TARGET="${1:?Usage: $0 [--no-showcase] <target-css-dir>}"

if [ ! -d "$TARGET" ]; then
    echo "ERREUR: répertoire cible inexistant : $TARGET" >&2
    exit 1
fi

cp "$DS_DIR/tokens.css" "$TARGET/ds-tokens.css"
cp "$DS_DIR/utilities.css" "$TARGET/ds-utilities.css"
cp "$DS_DIR/layout.css" "$TARGET/ds-layout.css"
cp "$DS_DIR/components.css" "$TARGET/ds-components.css"

# Strip showcase rules from ds-layout.css if --no-showcase
if $NO_SHOWCASE; then
    sed -i '/^\/\* ===== SHOWCASE/,/^\.gradient-text/{ /^\.gradient-text/!d; }' "$TARGET/ds-layout.css"
    sed -i '/\.main \.demo-grid/d; /\.main section/d' "$TARGET/ds-layout.css"
    sed -i '/@media (max-width: 1024px)/,/^}/d' "$TARGET/ds-layout.css"
fi

VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_DIR/tokens.css" || echo "unknown")
echo "✅ Design System v${VERSION} synchronisé vers $TARGET"
echo "   → ds-tokens.css       (variables CSS + thèmes)"
echo "   → ds-utilities.css    (classes utilitaires)"
echo "   → ds-layout.css       (header, sidebar, main)$(${NO_SHOWCASE} && echo ' [showcase stripped]' || true)"
echo "   → ds-components.css   (boutons, cards, modals, etc.)"
