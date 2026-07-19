#!/bin/bash
# perf-budget.sh — Mesure le poids gzippé des fichiers clés du DS et compare aux seuils.
#
# Usage:
#   ./shared/perf-budget.sh           # report only
#   ./shared/perf-budget.sh --json    # JSON output
#   ./shared/perf-budget.sh --check   # exit 1 si dépassement (block mode)
#
# Toujours warn-only par défaut (exit 0 même si dépassement).
# Source de vérité des seuils : shared/perf-budget.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUDGET_FILE="$SCRIPT_DIR/perf-budget.json"

MODE="report"
JSON_OUT=false
for arg in "$@"; do
    case "$arg" in
        --json) JSON_OUT=true ;;
        --check) MODE="check" ;;
        --help|-h)
            grep -E '^# ' "$0" | sed 's/^# \?//'
            exit 0
            ;;
    esac
done

if [ ! -f "$BUDGET_FILE" ]; then
    echo "ERROR: $BUDGET_FILE introuvable" >&2
    exit 2
fi

# Liste des fichiers (clé = chemin relatif depuis racine projet)
FILES=(
    "shared/css/tokens.css"
    "shared/css/utilities.css"
    "shared/css/components.css"
    "shared/css/components-core.css"
    "shared/components.js"
    "shared/dist/graph-lib.global.js"
    "shared/dist/graph.global.js"
)

# Mesure gzip d'un fichier (sortie : taille en octets)
measure_gzip() {
    local FILE="$1"
    if [ ! -f "$FILE" ]; then
        echo "0"
        return
    fi
    gzip -c -9 "$FILE" | wc -c | tr -d ' '
}

# Lit le seuil depuis perf-budget.json (clé = chemin relatif)
get_threshold() {
    local KEY="$1"
    # Parse JSON très basique avec node si dispo, sinon grep
    if command -v node &>/dev/null; then
        node -e "
            const data = require('$BUDGET_FILE');
            const f = data.files.find(x => x.path === '$KEY');
            console.log(f ? f.threshold_bytes : 0);
        "
    else
        # Fallback : grep simple (suppose format "path": "X", ... "threshold_bytes": N)
        grep -A 2 "\"$KEY\"" "$BUDGET_FILE" | grep threshold_bytes | grep -oE '[0-9]+' | head -1
    fi
}

format_bytes() {
    local B="$1"
    if [ "$B" -lt 1024 ]; then
        echo "${B} B"
    elif [ "$B" -lt 1048576 ]; then
        echo "$(awk "BEGIN { printf \"%.2f\", $B / 1024 }") KB"
    else
        echo "$(awk "BEGIN { printf \"%.2f\", $B / 1048576 }") MB"
    fi
}

cd "$ROOT_DIR"

if $JSON_OUT; then
    echo "{"
    echo "  \"measured_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"files\": ["
fi

EXCEEDED=0
TOTAL_BYTES=0
TOTAL_THRESHOLD=0
FIRST=true

for F in "${FILES[@]}"; do
    SIZE=$(measure_gzip "$F")
    THRESHOLD=$(get_threshold "$F")
    TOTAL_BYTES=$((TOTAL_BYTES + SIZE))
    TOTAL_THRESHOLD=$((TOTAL_THRESHOLD + THRESHOLD))

    if [ "$THRESHOLD" -gt 0 ] && [ "$SIZE" -gt "$THRESHOLD" ]; then
        STATUS="OVER"
        EXCEEDED=$((EXCEEDED + 1))
        DIFF=$((SIZE - THRESHOLD))
        DIFF_STR="+$(format_bytes $DIFF)"
    else
        STATUS="OK"
        DIFF=$((THRESHOLD - SIZE))
        DIFF_STR="-$(format_bytes $DIFF)"
    fi

    if $JSON_OUT; then
        $FIRST || echo ","
        FIRST=false
        printf '    {"path": "%s", "gzip_bytes": %d, "threshold_bytes": %d, "status": "%s"}' \
            "$F" "$SIZE" "$THRESHOLD" "$STATUS"
    else
        printf "  %-42s %10s  (seuil %10s, %s %s)\n" \
            "$F" "$(format_bytes $SIZE)" "$(format_bytes $THRESHOLD)" "$STATUS" "$DIFF_STR"
    fi
done

if $JSON_OUT; then
    echo ""
    echo "  ],"
    echo "  \"total_gzip_bytes\": $TOTAL_BYTES,"
    echo "  \"total_threshold_bytes\": $TOTAL_THRESHOLD,"
    echo "  \"exceeded\": $EXCEEDED"
    echo "}"
else
    echo ""
    printf "  %-42s %10s  (seuil %10s)\n" "TOTAL" "$(format_bytes $TOTAL_BYTES)" "$(format_bytes $TOTAL_THRESHOLD)"
    if [ $EXCEEDED -gt 0 ]; then
        echo ""
        echo "  WARN: $EXCEEDED fichier(s) au-dessus du seuil."
        echo "  Pour mettre à jour la baseline : ./shared/perf-budget.sh --update"
    fi
fi

# Mode --check : exit 1 si dépassement
if [ "$MODE" = "check" ] && [ $EXCEEDED -gt 0 ]; then
    exit 1
fi

exit 0
