#!/bin/bash
set -euo pipefail

# check-sync.sh — Vérifie si les tokens DS sont à jour dans un projet consommateur
# Usage : ./check-sync.sh <fichier-local-ds-tokens.css>
# Exit 0 = à jour, Exit 1 = désynchronisé

DS_TOKENS="$(cd "$(dirname "$0")/css" && pwd)/tokens.css"
LOCAL_FILE="${1:?Usage: $0 <fichier-local-ds-tokens.css>}"

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
    echo "✅ Design System à jour (v${DS_VERSION})"
    exit 0
else
    echo "⚠️  Design System désynchronisé"
    echo "   DS source : v${DS_VERSION}"
    echo "   Local     : v${LOCAL_VERSION:-non trouvé}"
    echo "   → Exécuter sync.sh pour mettre à jour"
    exit 1
fi
