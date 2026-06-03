#!/bin/bash
set -euo pipefail

# sync.sh — Synchronise les fichiers CSS du design system vers un projet consommateur
# Usage : ./sync.sh [--no-showcase] [--components=<list|core>] <répertoire-cible>
# Exemple : ./sync.sh --no-showcase /home/deployer/projects/prod/acssi-core-project/src/styles/
#
# --no-showcase : supprime les règles showcase (.main section, .demo-*, .subsection, .subgroup-*)
#                 de ds-layout.css après copie (recommandé pour les projets consommateurs)
# --components=core  : copie uniquement components-core.css (5 modules essentiels ~42KB)
# --components=<list>: copie uniquement les modules listés (ex: buttons,cards,forms)
#                      Liste disponible : shared/CONSUMER_GUIDE.md#tree-shaking

NO_SHOWCASE=false
COMPONENTS_LIST=""

for ARG in "$@"; do
    case "$ARG" in
        --no-showcase)     NO_SHOWCASE=true ;;
        --components=*)    COMPONENTS_LIST="${ARG#--components=}" ;;
    esac
done

# Reconstruire les args positionnels sans les flags (ni chaînes vides issues des substitutions)
POSITIONAL=()
for ARG in "$@"; do
    case "$ARG" in
        --*) ;;          # ignorer les flags
        "") ;;           # ignorer les chaînes vides (résidu de substitution)
        *) POSITIONAL+=("$ARG") ;;
    esac
done

DS_DIR="$(cd "$(dirname "$0")/css" && pwd)"
TARGET="${POSITIONAL[0]:?Usage: $0 [--no-showcase] [--components=core|<list>] <target-css-dir>}"

if [ ! -d "$TARGET" ]; then
    echo "ERREUR: répertoire cible inexistant : $TARGET" >&2
    exit 1
fi

cp "$DS_DIR/tokens.css" "$TARGET/ds-tokens.css"
cp "$DS_DIR/utilities.css" "$TARGET/ds-utilities.css"
cp "$DS_DIR/layout.css" "$TARGET/ds-layout.css"
cp "$DS_DIR/base.css" "$TARGET/ds-base.css"

# Nouveau v2.36 : copier le dossier components/ pour que les @import du barrel résolvent
# Les @import url('./components/...') dans ds-components.css résolvent vers <TARGET>/components/
mkdir -p "$TARGET/components"

if [ -z "$COMPONENTS_LIST" ]; then
    # Mode par défaut : copie complète (barrel + tous les modules)
    cp "$DS_DIR/components.css" "$TARGET/ds-components.css"
    cp "$DS_DIR/components/"*.css "$TARGET/components/"
    COMPONENTS_MODE="complet (25 modules)"
elif [ "$COMPONENTS_LIST" = "core" ]; then
    # Mode core : barrel essentiel 5 modules
    cp "$DS_DIR/components-core.css" "$TARGET/ds-components.css"
    cp "$DS_DIR/components/_base.css" "$TARGET/components/"
    cp "$DS_DIR/components/buttons.css" "$TARGET/components/"
    cp "$DS_DIR/components/cards.css" "$TARGET/components/"
    cp "$DS_DIR/components/forms.css" "$TARGET/components/"
    cp "$DS_DIR/components/alerts.css" "$TARGET/components/"
    cp "$DS_DIR/components/badges.css" "$TARGET/components/"
    cp "$DS_DIR/components/_a11y.css" "$TARGET/components/"
    COMPONENTS_MODE="core (7 modules essentiels)"
else
    # Mode sélectif : modules listés + transverses obligatoires
    # Génère un barrel à la volée
    BARREL="$TARGET/ds-components.css"
    cat > "$BARREL" << 'BARRELEOF'
/* @ds-version: 2.36.0 */
/* ds-components.css — Barrel sélectif généré par sync.sh --components=... */
BARRELEOF
    # Transverses toujours inclus
    cp "$DS_DIR/components/_base.css" "$TARGET/components/"
    echo "@import url('./components/_base.css');" >> "$BARREL"
    # Modules sélectionnés (dans l'ordre de la liste fournie)
    IFS=',' read -ra MODULES <<< "$COMPONENTS_LIST"
    for MOD in "${MODULES[@]}"; do
        MOD_FILE="$DS_DIR/components/${MOD}.css"
        if [ -f "$MOD_FILE" ]; then
            cp "$MOD_FILE" "$TARGET/components/"
            echo "@import url('./components/${MOD}.css');" >> "$BARREL"
        else
            echo "AVERTISSEMENT: module '${MOD}' introuvable, ignoré" >&2
        fi
    done
    # _a11y toujours inclus en dernier
    cp "$DS_DIR/components/_a11y.css" "$TARGET/components/"
    echo "@import url('./components/_a11y.css');" >> "$BARREL"
    COMPONENTS_MODE="tree-shake: ${COMPONENTS_LIST}"
    echo "Mode tree-shake : modules ${COMPONENTS_LIST} copiés (+ _base + _a11y transverses)"
fi

# Strip showcase rules from ds-layout.css if --no-showcase
# Uses @strip:showcase-start / @strip:showcase-end markers in layout.css
if $NO_SHOWCASE; then
    awk '/@strip:showcase-start/{skip=1; next} /@strip:showcase-end/{skip=0; next} !skip' \
        "$TARGET/ds-layout.css" > "$TARGET/ds-layout.css.tmp" && \
        mv "$TARGET/ds-layout.css.tmp" "$TARGET/ds-layout.css"
fi

VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_DIR/tokens.css" || echo "unknown")
echo "Design System v${VERSION} synchronisé vers $TARGET"
echo "   -> ds-tokens.css       (variables CSS + thèmes)"
echo "   -> ds-base.css         (socle : reset, body, texture grain)"
echo "   -> ds-utilities.css    (classes utilitaires)"
echo "   -> ds-layout.css       (header, sidebar, main)$(${NO_SHOWCASE} && echo ' [showcase stripped]' || true)"
echo "   -> ds-components.css   (${COMPONENTS_MODE})"
echo "   -> components/         (modules CSS resolus par les @import)"
