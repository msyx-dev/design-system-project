#!/bin/bash
set -euo pipefail

# sync.sh — Synchronise les design tokens et utilitaires vers un projet consommateur
# Usage : ./sync.sh <répertoire-cible>
# Exemple : ./sync.sh /home/deployer/projects/prod/acssi-core-project/src/styles/

DS_DIR="$(cd "$(dirname "$0")/css" && pwd)"
TARGET="${1:?Usage: $0 <target-css-dir>}"

if [ ! -d "$TARGET" ]; then
    echo "ERREUR: répertoire cible inexistant : $TARGET" >&2
    exit 1
fi

cp "$DS_DIR/tokens.css" "$TARGET/ds-tokens.css"
cp "$DS_DIR/utilities.css" "$TARGET/ds-utilities.css"

VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_DIR/tokens.css" || echo "unknown")
echo "✅ Design System v${VERSION} synchronisé vers $TARGET"
echo "   → ds-tokens.css"
echo "   → ds-utilities.css"
