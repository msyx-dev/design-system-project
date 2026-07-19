#!/bin/bash
set -euo pipefail

# sync.sh — Synchronise les fichiers CSS du design system vers un projet consommateur
# Usage : ./sync.sh [--no-showcase] [--components=<list|core>] <répertoire-cible>
# Exemple : ./sync.sh --no-showcase /home/deployer/projects/prod/acssi-core-project/src/styles/
#
# --no-showcase : supprime les règles showcase (.main section, .demo-*, .subsection, .subgroup-*)
#                 de ds-layout.css après copie (recommandé pour les projets consommateurs)
# --components=core  : copie uniquement components-core.css (modules essentiels)
# --components=<list>: copie uniquement les modules listés (ex: buttons,cards,forms)
#                      Liste disponible : shared/CONSUMER_GUIDE.md#tree-shaking
#
# Le script distribue un DS COMPLET (#367-373) : tokens, themes, utilities, layout,
# base, components + fonts self-hosted (ds-fonts.css + fonts/*.woff2) + sprite SVG
# (icons/sprite.svg). Le header @ds-version des barrels générés reflète la version
# source réelle (lue dans tokens.css), jamais une valeur figée.
# Le Niveau C (#372) — shell JS + agrégateur CSS (ds-nav.js, ds-components.js,
# ds-styles.css) — est distribué par défaut comme les CSS.

NO_SHOWCASE=false
COMPONENTS_LIST=""
WITH_GRAPH=false

for ARG in "$@"; do
    case "$ARG" in
        --no-showcase)     NO_SHOWCASE=true ;;
        --components=*)    COMPONENTS_LIST="${ARG#--components=}" ;;
        --with-graph)      WITH_GRAPH=true ;;
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

SHARED_DIR="$(cd "$(dirname "$0")" && pwd)"
DS_DIR="$SHARED_DIR/css"
TARGET="${POSITIONAL[0]:?Usage: $0 [--no-showcase] [--components=core|<list>] <target-css-dir>}"

if [ ! -d "$TARGET" ]; then
    echo "ERREUR: répertoire cible inexistant : $TARGET" >&2
    exit 1
fi

# Version DS source — lue dynamiquement pour estampiller les barrels générés (#367-373)
DS_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_DIR/tokens.css" || echo "unknown")

# ─── Socle CSS : toujours distribué (mode défaut ET core/sélectif) ───────────
cp "$DS_DIR/tokens.css"    "$TARGET/ds-tokens.css"
cp "$DS_DIR/themes.css"    "$TARGET/ds-themes.css"
cp "$DS_DIR/utilities.css" "$TARGET/ds-utilities.css"
cp "$DS_DIR/layout.css"    "$TARGET/ds-layout.css"
cp "$DS_DIR/base.css"      "$TARGET/ds-base.css"

# ─── Fonts self-hosted (#367-373) : woff2 + ds-fonts.css ────────────────────
# fonts.css référence url('../fonts/...') (relatif à shared/css/). Côté consumer on
# place les woff2 dans <TARGET>/fonts/ et on réécrit ../fonts/ → ./fonts/ pour rester
# self-contained sous le dossier styles/ du consumer (sinon 404 sur les fontes).
mkdir -p "$TARGET/fonts"
cp "$SHARED_DIR/fonts/"*.woff2 "$TARGET/fonts/"
sed 's#\.\./fonts/#./fonts/#g' "$DS_DIR/fonts.css" > "$TARGET/ds-fonts.css"

# ─── Sprite SVG Lucide self-hosted (#367-373) ───────────────────────────────
# Copié dans <TARGET>/icons/sprite.svg. Les consumers référencent l'icône via
# <use href="icons/sprite.svg#i-{nom}"/> (relatif au dossier styles/).
mkdir -p "$TARGET/icons"
cp "$SHARED_DIR/icons/sprite.svg" "$TARGET/icons/sprite.svg"

# ─── Niveau C : shell JS + agrégateur CSS (#372) ────────────────────────────
# Distribue le shell complet (header, sidebar, scroll-spy, SPA, composants
# interactifs) pour que les consumers reproduisent le Niveau C sans dépendre
# de design-system.msyx.fr. Préfixe ds- cohérent avec les CSS.
#   - ds-nav.js        : header, sidebar, scroll-spy, navigation SPA, LazyLoader
#   - ds-components.js : composants interactifs (toasts, modals, sliders, ...)
#   - ds-styles.css    : agrégateur @import des modules CSS
# styles.css importe css/<mod>.css (relatif à shared/). Côté consumer les
# modules sont distribués en ds-<mod>.css à la racine de TARGET, donc on
# réécrit css/<mod>.css → ds-<mod>.css pour que les @import résolvent.
cp "$SHARED_DIR/nav.js"        "$TARGET/ds-nav.js"
cp "$SHARED_DIR/components.js" "$TARGET/ds-components.js"
sed "s#url('css/\([a-z0-9_-]*\)\.css')#url('ds-\1.css')#g" \
    "$SHARED_DIR/styles.css" > "$TARGET/ds-styles.css"

# graph-lib.global.js : window.__pointerDrag/__svg — REQUIS par ds-components.js
# depuis #657 (split-pane/before-after). Copié PAR DÉFAUT (corrige le gap latent I1a :
# ds-components.js le référence mais sync ne le livrait pas). Charger AVANT ds-components.js.
cp "$SHARED_DIR/dist/graph-lib.global.js" "$TARGET/ds-graph-lib.global.js"

# ─── Moteur graph complet (opt-in --with-graph) (#666 ; vendor dagre #670) ──
if $WITH_GRAPH; then
    cp "$SHARED_DIR/dist/graph.global.js" "$TARGET/ds-graph.global.js"   # window.MSYXGraph
    mkdir -p "$TARGET/components"
    cp "$DS_DIR/components/graph.css"     "$TARGET/components/graph.css"  # CSS moteur (hors barrel)
    echo "   -> ds-graph.global.js  (moteur graph : window.MSYXGraph.createGraph)"
    echo "   -> components/graph.css (module graph — charger via <link>, hors barrel)"

    # dagre vendoré (#670, I3-2) — layout 'layered'. layered.js (dans le bundle IIFE
    # ci-dessus) charge ce fichier via un chemin ABSOLU site-root
    # `/shared/graph/vendor/graph-layered.js` (cf. shared/graph/vendor/VENDOR.md) —
    # le CONSOMMATEUR DOIT servir sa copie a cette URL exacte (meme limitation deja
    # acceptee pour le sprite d'icones `/shared/icons/sprite.svg`). Copie ici dans
    # <TARGET>/graph/vendor/ pour rester correlee au chemin source ; a l'integrateur
    # de router/monter ce dossier sous /shared/graph/vendor/ sur son site.
    mkdir -p "$TARGET/graph/vendor"
    cp "$SHARED_DIR/graph/vendor/graph-layered.js"  "$TARGET/graph/vendor/graph-layered.js"
    cp "$SHARED_DIR/graph/vendor/LICENSE-dagre"     "$TARGET/graph/vendor/LICENSE-dagre"
    cp "$SHARED_DIR/graph/vendor/LICENSE-graphlib"  "$TARGET/graph/vendor/LICENSE-graphlib"
    cp "$SHARED_DIR/graph/vendor/NOTICE"            "$TARGET/graph/vendor/NOTICE"
    echo "   -> graph/vendor/graph-layered.js (dagre vendoré, layout 'layered' — à servir en /shared/graph/vendor/graph-layered.js, cf. VENDOR.md)"
    echo "   -> graph/vendor/{LICENSE-dagre,LICENSE-graphlib,NOTICE}"
fi

# Nouveau v2.36 : copier le dossier components/ pour que les @import du barrel résolvent
# Les @import url('./components/...') dans ds-components.css résolvent vers <TARGET>/components/
mkdir -p "$TARGET/components"

if [ -z "$COMPONENTS_LIST" ]; then
    # Mode par défaut : copie complète (barrel + tous les modules)
    cp "$DS_DIR/components.css" "$TARGET/ds-components.css"
    cp "$DS_DIR/components/"*.css "$TARGET/components/"
    COMPONENTS_MODE="complet (tous les modules)"
elif [ "$COMPONENTS_LIST" = "core" ]; then
    # Mode core : barrel essentiel. Le header @ds-version est réécrit à la version source.
    sed "s#@ds-version:[[:space:]]*[0-9.]\+#@ds-version: ${DS_VERSION}#" \
        "$DS_DIR/components-core.css" > "$TARGET/ds-components.css"
    # Modules importés par components-core.css (brand inclus : sinon @import 404)
    cp "$DS_DIR/components/_base.css"      "$TARGET/components/"
    cp "$DS_DIR/components/brand.css"      "$TARGET/components/"
    cp "$DS_DIR/components/buttons.css"    "$TARGET/components/"
    cp "$DS_DIR/components/cards.css"      "$TARGET/components/"
    cp "$DS_DIR/components/forms.css"      "$TARGET/components/"
    cp "$DS_DIR/components/alerts.css"     "$TARGET/components/"
    cp "$DS_DIR/components/badges.css"     "$TARGET/components/"
    cp "$DS_DIR/components/navigation.css" "$TARGET/components/"  # tabs/breadcrumb/stepper/bottom-nav (layout.css gère le header)
    cp "$DS_DIR/components/_a11y.css"      "$TARGET/components/"
    COMPONENTS_MODE="core (modules essentiels)"
else
    # Mode sélectif : modules listés + transverses obligatoires
    # Génère un barrel à la volée, estampillé à la version source réelle (#367-373)
    BARREL="$TARGET/ds-components.css"
    cat > "$BARREL" << BARRELEOF
/* @ds-version: ${DS_VERSION} */
/* ds-components.css — Barrel sélectif généré par sync.sh --components=... */
BARRELEOF
    # Transverses toujours inclus : _base + _responsive (overrides responsive partagés)
    cp "$DS_DIR/components/_base.css" "$TARGET/components/"
    echo "@import url('./components/_base.css');" >> "$BARREL"
    cp "$DS_DIR/components/_responsive.css" "$TARGET/components/"
    echo "@import url('./components/_responsive.css');" >> "$BARREL"
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
    echo "Mode tree-shake : modules ${COMPONENTS_LIST} copiés (+ _base + _responsive + _a11y transverses)"
fi

# Strip showcase rules from ds-layout.css if --no-showcase
# Uses @strip:showcase-start / @strip:showcase-end markers in layout.css
if $NO_SHOWCASE; then
    awk '/@strip:showcase-start/{skip=1; next} /@strip:showcase-end/{skip=0; next} !skip' \
        "$TARGET/ds-layout.css" > "$TARGET/ds-layout.css.tmp" && \
        mv "$TARGET/ds-layout.css.tmp" "$TARGET/ds-layout.css"
fi

echo "Design System v${DS_VERSION} synchronisé vers $TARGET"
echo "   -> ds-tokens.css       (variables CSS)"
echo "   -> ds-themes.css       (themes ACSSI / Nhood)"
echo "   -> ds-base.css         (socle : reset, body, texture grain)"
echo "   -> ds-utilities.css    (classes utilitaires)"
echo "   -> ds-layout.css       (header, sidebar, main)$(${NO_SHOWCASE} && echo ' [showcase stripped]' || true)"
echo "   -> ds-components.css   (${COMPONENTS_MODE})"
echo "   -> ds-fonts.css        (self-hosted woff2 + fonts/)"
echo "   -> fonts/              (woff2 Space Grotesk / Inter / Fira Code)"
echo "   -> icons/sprite.svg    (sprite Lucide self-hosted)"
echo "   -> components/         (modules CSS resolus par les @import)"
echo "   -> ds-nav.js           (Niveau C : header, sidebar, scroll-spy, SPA)"
echo "   -> ds-components.js    (Niveau C : composants interactifs JS)"
echo "   -> ds-styles.css       (Niveau C : agregateur @import des modules)"
echo "   -> ds-graph-lib.global.js (window.__pointerDrag/__svg — requis par ds-components.js)"
