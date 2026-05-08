#!/bin/bash
set -euo pipefail

# check-components.sh — Lint des projets consommateurs
# Détecte les classes CSS composant-like définies en dehors du Design System
#
# Usage : ./check-components.sh <répertoire-css-projet>
# Exit  : 0 = propre, 1 = avertissements détectés

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REGISTRY="$SCRIPT_DIR/components-registry.json"
CSS_DIR="${1:?Usage: $0 <répertoire-css-projet>}"

if [ ! -d "$CSS_DIR" ]; then
    echo "ERREUR: répertoire inexistant : $CSS_DIR" >&2
    exit 1
fi

if [ ! -f "$REGISTRY" ]; then
    echo "ERREUR: components-registry.json introuvable : $REGISTRY" >&2
    exit 1
fi

# Fichier allowlist optionnel dans le projet
ALLOWLIST="$CSS_DIR/.ds-allowlist"

# Préfixes composant-like à surveiller
COMPONENT_PREFIXES=(
    ".btn-"
    ".card-"
    ".modal-"
    ".toast-"
    ".badge-"
    ".chip-"
    ".tab-"
    ".alert-"
    ".table-"
    ".form-"
    ".input-"
    ".dropdown-"
    ".carousel-"
    ".accordion-"
    ".stepper-"
    ".drawer-"
    ".spinner-"
    ".tooltip-"
    ".pagination-"
    ".breadcrumb-"
    ".avatar-"
    ".fab-"
    ".lightbox-"
    ".bottom-sheet-"
    ".bottom-nav-"
    ".segmented-"
    ".otp-"
    ".tag-input-"
    ".search-input-"
    ".number-input-"
    ".slider-"
    ".tree-"
    ".data-grid-"
    ".command-palette-"
    ".context-menu-"
    ".quiz-"
    ".before-after-"
    ".achievement-"
    ".dtree-"
    ".sortable-"
    ".video-"
    ".counter-"
    ".progress-tracker-"
)

# Extraire les classes DS depuis le registre (liste brute)
DS_CLASSES=""
if command -v python3 &>/dev/null; then
    DS_CLASSES=$(python3 -c "
import json, sys
with open('$REGISTRY') as f:
    data = json.load(f)
classes = []
for c in data.get('components', []):
    css_classes = c.get('cssClasses') or []
    if not isinstance(css_classes, list):
        continue
    classes.extend(css_classes)
print('\n'.join(classes))
")
elif command -v node &>/dev/null; then
    DS_CLASSES=$(node -e "
const data = require('$REGISTRY');
const classes = [];
for (const c of data.components || []) {
    for (const cls of (c.cssClasses || [])) classes.push(cls);
}
console.log(classes.join('\n'));
")
else
    echo "ERREUR: python3 ou node requis pour lire le registre JSON" >&2
    exit 1
fi

# Charger l'allowlist si elle existe
ALLOWED_CLASSES=""
if [ -f "$ALLOWLIST" ]; then
    ALLOWED_CLASSES=$(grep -v '^#' "$ALLOWLIST" | grep -v '^$' || true)
fi

# Scanner les fichiers CSS du projet (hors ds-*.css)
CSS_FILES=$(find "$CSS_DIR" -name "*.css" ! -name "ds-*.css" -type f 2>/dev/null || true)

if [ -z "$CSS_FILES" ]; then
    echo "INFO: aucun fichier CSS trouvé dans $CSS_DIR (hors ds-*.css)"
    exit 0
fi

WARNINGS=0
CHECKED=0

echo "=== check-components.sh — Design System msyx.design ==="
echo "Répertoire : $CSS_DIR"
echo "Registre   : v$(python3 -c "import json; d=json.load(open('$REGISTRY')); print(d['version'])" 2>/dev/null || echo '?')"
echo ""

for CSS_FILE in $CSS_FILES; do
    # Extraire les classes définies dans ce fichier
    DEFINED_CLASSES=$(grep -oP '\.[a-zA-Z][a-zA-Z0-9_-]+' "$CSS_FILE" 2>/dev/null || true)

    for CLASS in $DEFINED_CLASSES; do
        # Vérifier si la classe correspond à un préfixe composant-like
        IS_COMPONENT_LIKE=false
        for PREFIX in "${COMPONENT_PREFIXES[@]}"; do
            if [[ "$CLASS" == ${PREFIX}* ]]; then
                IS_COMPONENT_LIKE=true
                break
            fi
        done

        if ! $IS_COMPONENT_LIKE; then
            continue
        fi

        CHECKED=$((CHECKED + 1))

        # Vérifier si c'est dans le DS
        IS_IN_DS=false
        while IFS= read -r DS_CLASS; do
            if [ "$CLASS" = "$DS_CLASS" ]; then
                IS_IN_DS=true
                break
            fi
        done <<< "$DS_CLASSES"

        if $IS_IN_DS; then
            continue
        fi

        # Vérifier si c'est dans l'allowlist
        IS_ALLOWED=false
        if [ -n "$ALLOWED_CLASSES" ]; then
            while IFS= read -r ALLOWED; do
                if [ "$CLASS" = "$ALLOWED" ]; then
                    IS_ALLOWED=true
                    break
                fi
            done <<< "$ALLOWED_CLASSES"
        fi

        if $IS_ALLOWED; then
            continue
        fi

        # C'est un composant custom hors DS — WARNING
        LINE_NUM=$(grep -n "$CLASS" "$CSS_FILE" | head -1 | cut -d: -f1)
        REL_FILE="${CSS_FILE#$CSS_DIR/}"
        echo "WARNING : classe hors DS détectée"
        echo "  Fichier : $REL_FILE:${LINE_NUM:-?}"
        echo "  Classe  : $CLASS"
        echo "  Action  : créer ce composant dans le DS d'abord, ou ajouter à .ds-allowlist"
        echo ""
        WARNINGS=$((WARNINGS + 1))
    done
done

echo "---"
echo "Classes composant-like vérifiées : $CHECKED"
echo "Avertissements : $WARNINGS"

if [ $WARNINGS -gt 0 ]; then
    echo ""
    echo "FAIL — $WARNINGS composant(s) custom détecté(s) hors Design System"
    echo "Workflow : créer le composant dans le DS → sync.sh → consommer les classes DS"
    echo ""
    echo "Pour les cas légitimes, ajouter les classes dans $CSS_DIR/.ds-allowlist"
    exit 1
else
    echo ""
    echo "OK — aucun composant custom hors DS détecté"
    exit 0
fi
