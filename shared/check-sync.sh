#!/bin/bash
set -euo pipefail

# check-sync.sh — Vérifie si les tokens DS sont à jour dans un projet consommateur
# Usage : ./check-sync.sh <fichier-local-ds-tokens.css>
#         ./check-sync.sh --check-overrides <répertoire-css-projet>
# Exit 0 = OK, Exit 1 = désynchronisé ou overrides détectés

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DS_TOKENS="$SCRIPT_DIR/css/tokens.css"
DS_COMPONENTS="$SCRIPT_DIR/css/components.css"

MODE="${1:-}"

# ─── Mode --check-overrides ────────────────────────────────────────────────
if [ "$MODE" = "--check-overrides" ]; then
    CSS_DIR="${2:?Usage: $0 --check-overrides <répertoire-css-projet>}"

    if [ ! -d "$CSS_DIR" ]; then
        echo "ERREUR: répertoire inexistant : $CSS_DIR" >&2
        exit 1
    fi

    if [ ! -f "$DS_COMPONENTS" ]; then
        echo "ERREUR: ds-components.css introuvable : $DS_COMPONENTS" >&2
        exit 1
    fi

    echo "=== check-sync.sh --check-overrides ==="
    echo "Répertoire : $CSS_DIR"
    echo ""

    # Extraire les sélecteurs de classes définis dans ds-components.css
    DS_SELECTORS=$(grep -oP '\.[a-zA-Z][a-zA-Z0-9_-]+(?=\s*[\{,])' "$DS_COMPONENTS" 2>/dev/null | sort -u || true)

    # Scanner les fichiers CSS du projet (hors ds-*.css)
    CSS_FILES=$(find "$CSS_DIR" -name "*.css" ! -name "ds-*.css" -type f 2>/dev/null || true)

    if [ -z "$CSS_FILES" ]; then
        echo "INFO: aucun fichier CSS trouvé dans $CSS_DIR (hors ds-*.css)"
        exit 0
    fi

    WARNINGS=0

    for CSS_FILE in $CSS_FILES; do
        # Extraire les sélecteurs CSS définis dans ce fichier
        PROJECT_SELECTORS=$(grep -oP '\.[a-zA-Z][a-zA-Z0-9_-]+(?=\s*[\{,])' "$CSS_FILE" 2>/dev/null | sort -u || true)

        if [ -z "$PROJECT_SELECTORS" ]; then
            continue
        fi

        while IFS= read -r SEL; do
            # Vérifier si ce sélecteur est dans le DS
            if echo "$DS_SELECTORS" | grep -qxF "$SEL"; then
                LINE_NUM=$(grep -n "${SEL}[[:space:]]*[{,]" "$CSS_FILE" | head -1 | cut -d: -f1)
                REL_FILE="${CSS_FILE#$CSS_DIR/}"
                echo "WARNING : override de sélecteur DS détecté"
                echo "  Fichier    : $REL_FILE:${LINE_NUM:-?}"
                echo "  Sélecteur  : $SEL"
                echo "  Action     : utiliser les variables CSS (var(--token)) plutôt que redéfinir la classe"
                echo ""
                WARNINGS=$((WARNINGS + 1))
            fi
        done <<< "$PROJECT_SELECTORS"
    done

    echo "---"
    echo "Avertissements overrides : $WARNINGS"

    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo "FAIL — $WARNINGS override(s) de classe DS détecté(s)"
        echo "Les classes DS ne doivent pas être redéfinies — customiser via variables CSS."
        exit 1
    else
        echo ""
        echo "OK — aucun override de classe DS détecté"
        exit 0
    fi
fi

# ─── Mode par défaut : vérification de version ─────────────────────────────
LOCAL_FILE="${1:?Usage: $0 <fichier-local-ds-tokens.css> | --check-overrides <répertoire>}"

if [ ! -f "$LOCAL_FILE" ]; then
    echo "ERREUR: fichier inexistant : $LOCAL_FILE" >&2
    exit 1
fi

if [ ! -f "$DS_TOKENS" ]; then
    echo "ERREUR: tokens.css DS introuvable : $DS_TOKENS" >&2
    exit 1
fi

DS_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_TOKENS" || echo "")
LOCAL_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$LOCAL_FILE" || echo "")

if [ -z "$DS_VERSION" ]; then
    echo "ERREUR: pas de @ds-version dans $DS_TOKENS" >&2
    exit 1
fi

if [ "$DS_VERSION" = "$LOCAL_VERSION" ]; then
    echo "OK — Design System à jour (v${DS_VERSION})"
    exit 0
else
    echo "WARN — Design System désynchronisé"
    echo "   DS source : v${DS_VERSION}"
    echo "   Local     : v${LOCAL_VERSION:-non trouvé}"
    echo "   → Exécuter sync.sh pour mettre à jour"
    exit 1
fi
