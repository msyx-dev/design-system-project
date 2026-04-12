#!/bin/bash
set -euo pipefail

# sync-all.sh — Synchronise le design system vers tous les projets consommateurs enregistrés
# Usage : ./sync-all.sh [--no-showcase] [--dry-run]
#
# --no-showcase : passe --no-showcase à sync.sh pour chaque consommateur
# --dry-run     : affiche ce qui serait fait sans rien modifier

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNC_SH="$SCRIPT_DIR/sync.sh"
CONSUMERS_JSON="$SCRIPT_DIR/consumers.json"
DS_TOKENS="$SCRIPT_DIR/css/tokens.css"

NO_SHOWCASE=false
DRY_RUN=false
for ARG in "$@"; do
    case "$ARG" in
        --no-showcase) NO_SHOWCASE=true ;;
        --dry-run)     DRY_RUN=true ;;
    esac
done

# ─── Vérifications préalables ──────────────────────────────────────────────
if [ ! -f "$SYNC_SH" ]; then
    echo "ERREUR: sync.sh introuvable : $SYNC_SH" >&2
    exit 1
fi

if [ ! -f "$CONSUMERS_JSON" ]; then
    echo "ERREUR: consumers.json introuvable : $CONSUMERS_JSON" >&2
    echo "       Créer $CONSUMERS_JSON avec la liste des consommateurs." >&2
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "ERREUR: jq est requis pour lire consumers.json" >&2
    echo "       sudo apt-get install jq" >&2
    exit 1
fi

DS_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_TOKENS" || echo "unknown")

echo "=== sync-all.sh — Design System v${DS_VERSION} ==="
$DRY_RUN && echo "(mode --dry-run : aucune modification)"
echo ""

TOTAL=0
SYNCED=0
SKIPPED=0
ERRORS=0

# ─── Lecture du registre consumers.json ────────────────────────────────────
CONSUMER_COUNT=$(jq '.consumers | length' "$CONSUMERS_JSON")

for i in $(seq 0 $((CONSUMER_COUNT - 1))); do
    NAME=$(jq -r ".consumers[$i].name" "$CONSUMERS_JSON")
    PROJECT_PATH=$(jq -r ".consumers[$i].path" "$CONSUMERS_JSON")
    CSS_DIR=$(jq -r ".consumers[$i].css_dir // \"src/styles\"" "$CONSUMERS_JSON")
    TARGET="$PROJECT_PATH/$CSS_DIR"

    TOTAL=$((TOTAL + 1))

    # Vérifier que le répertoire cible existe
    if [ ! -d "$TARGET" ]; then
        echo "  SKIP  [$NAME] — répertoire absent : $TARGET"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Lire la version locale avant sync
    LOCAL_TOKENS="$TARGET/ds-tokens.css"
    if [ -f "$LOCAL_TOKENS" ]; then
        LOCAL_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$LOCAL_TOKENS" 2>/dev/null || echo "?")
    else
        LOCAL_VERSION="absent"
    fi

    if $DRY_RUN; then
        echo "  DRY   [$NAME] : v${LOCAL_VERSION} → v${DS_VERSION}  ($TARGET)"
        SYNCED=$((SYNCED + 1))
        continue
    fi

    # Exécuter sync.sh
    SYNC_ARGS=""
    $NO_SHOWCASE && SYNC_ARGS="--no-showcase"

    if $NO_SHOWCASE; then
        OUTPUT=$("$SYNC_SH" --no-showcase "$TARGET" 2>&1) && STATUS=0 || STATUS=$?
    else
        OUTPUT=$("$SYNC_SH" "$TARGET" 2>&1) && STATUS=0 || STATUS=$?
    fi

    if [ $STATUS -eq 0 ]; then
        echo "  OK    [$NAME] : v${LOCAL_VERSION} → v${DS_VERSION}"
        SYNCED=$((SYNCED + 1))
    else
        echo "  FAIL  [$NAME] : erreur pendant la synchronisation"
        echo "$OUTPUT" | sed 's/^/         /'
        ERRORS=$((ERRORS + 1))
    fi
done

# ─── Récapitulatif ─────────────────────────────────────────────────────────
echo ""
echo "─── Récapitulatif ───────────────────────────────────────────"
echo "  Consommateurs enregistrés : $TOTAL"
$DRY_RUN || echo "  Synchronisés              : $SYNCED"
$DRY_RUN && echo "  Seraient synchronisés      : $SYNCED"
[ $SKIPPED -gt 0 ] && echo "  Ignorés (absent)           : $SKIPPED"
[ $ERRORS -gt 0 ]  && echo "  Erreurs                    : $ERRORS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "FAIL — $ERRORS consommateur(s) en erreur"
    exit 1
elif $DRY_RUN; then
    echo "OK (dry-run) — $SYNCED consommateur(s) prêts à être synchronisés"
    exit 0
else
    echo "OK — $SYNCED consommateur(s) synchronisé(s) vers v${DS_VERSION}"
    exit 0
fi
