#!/bin/bash
set -euo pipefail

# build.sh — Minifie les assets CSS et JS du design system
# Usage : ./build.sh [--check-only]
#
# Prérequis :
#   npm install -g terser csso-cli
#
# --check-only : vérifie uniquement que les outils sont installés, sans minifier

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CSS_DIR="$SCRIPT_DIR/css"
DIST_DIR="$SCRIPT_DIR/dist"

CHECK_ONLY=false
[ "${1:-}" = "--check-only" ] && CHECK_ONLY=true

# ─── Vérification des outils ───────────────────────────────────────────────
MISSING=0

check_tool() {
    local TOOL="$1"
    local INSTALL="$2"
    if command -v "$TOOL" &>/dev/null; then
        echo "  OK    $TOOL ($(command -v "$TOOL"))"
    else
        echo "  MISS  $TOOL — installer avec : $INSTALL"
        MISSING=$((MISSING + 1))
    fi
}

echo "=== build.sh — Vérification des outils ==="
check_tool "terser"  "npm install -g terser"
check_tool "csso"    "npm install -g csso-cli"
echo ""

if [ $MISSING -gt 0 ]; then
    echo "FAIL — $MISSING outil(s) manquant(s). Installer avant de lancer build.sh."
    exit 1
fi

$CHECK_ONLY && { echo "OK — tous les outils sont disponibles"; exit 0; }

# ─── Préparation du répertoire dist ───────────────────────────────────────
mkdir -p "$DIST_DIR"
echo "=== build.sh — Minification vers $DIST_DIR ==="
echo ""

TOTAL_BEFORE=0
TOTAL_AFTER=0

minify_css() {
    local SRC="$1"
    local OUT="$2"
    local NAME
    NAME=$(basename "$SRC")
    local BEFORE AFTER
    BEFORE=$(wc -c < "$SRC")
    csso "$SRC" --output "$OUT"
    AFTER=$(wc -c < "$OUT")
    local RATIO
    RATIO=$(awk "BEGIN { printf \"%.0f\", (1 - $AFTER/$BEFORE) * 100 }")
    printf "  CSS  %-30s  %6d → %6d octets  (-%s%%)\n" "$NAME" "$BEFORE" "$AFTER" "$RATIO"
    TOTAL_BEFORE=$((TOTAL_BEFORE + BEFORE))
    TOTAL_AFTER=$((TOTAL_AFTER + AFTER))
}

minify_js() {
    local SRC="$1"
    local OUT="$2"
    local NAME
    NAME=$(basename "$SRC")
    local BEFORE AFTER
    BEFORE=$(wc -c < "$SRC")
    terser "$SRC" --compress --mangle --output "$OUT"
    AFTER=$(wc -c < "$OUT")
    local RATIO
    RATIO=$(awk "BEGIN { printf \"%.0f\", (1 - $AFTER/$BEFORE) * 100 }")
    printf "  JS   %-30s  %6d → %6d octets  (-%s%%)\n" "$NAME" "$BEFORE" "$AFTER" "$RATIO"
    TOTAL_BEFORE=$((TOTAL_BEFORE + BEFORE))
    TOTAL_AFTER=$((TOTAL_AFTER + AFTER))
}

# ─── CSS ──────────────────────────────────────────────────────────────────
minify_css "$CSS_DIR/tokens.css"      "$DIST_DIR/tokens.min.css"
minify_css "$CSS_DIR/utilities.css"   "$DIST_DIR/utilities.min.css"
minify_css "$CSS_DIR/layout.css"      "$DIST_DIR/layout.min.css"
minify_css "$CSS_DIR/components.css"  "$DIST_DIR/components.min.css"

# ─── JS ───────────────────────────────────────────────────────────────────
minify_js "$SCRIPT_DIR/components.js" "$DIST_DIR/components.min.js"
minify_js "$SCRIPT_DIR/nav.js"        "$DIST_DIR/nav.min.js"

# ─── Récapitulatif ─────────────────────────────────────────────────────────
echo ""
GLOBAL_RATIO=$(awk "BEGIN { printf \"%.0f\", (1 - $TOTAL_AFTER/$TOTAL_BEFORE) * 100 }")
echo "─── Total : $TOTAL_BEFORE → $TOTAL_AFTER octets (-${GLOBAL_RATIO}%) ──────────────────────────"
echo ""
echo "OK — assets minifiés dans $DIST_DIR"
