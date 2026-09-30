#!/bin/bash
set -euo pipefail

# sync.sh — Synchronise les fichiers CSS du design system vers un projet consommateur
# Usage : ./sync.sh [--no-showcase] [--components=<list|core>] [--assets=<charte>[,<charte>…]] <répertoire-cible>
# Exemple : ./sync.sh --no-showcase /home/deployer/projects/prod/acssi-core-project/src/styles/
#
# --no-showcase : supprime les règles showcase (.main section, .demo-*, .subsection, .subgroup-*)
#                 de ds-layout.css après copie (recommandé pour les projets consommateurs)
# --components=core  : copie uniquement components-core.css (modules essentiels)
# --components=<list>: copie uniquement les modules listés (ex: buttons,cards,forms)
#                      Liste disponible : shared/CONSUMER_GUIDE.md#tree-shaking
# --assets=<charte>[,<charte>…] : logos de marque en plus de MSYX, toujours copiée (#954).
#                      Virgules, sans espaces. Une charte <c> est valide si `assets/logo-<c>.svg`
#                      existe à la racine du DS (liste déduite des fichiers) et si <c> respecte
#                      ^[a-z0-9]+$. Charte inconnue : erreur, exit 1, AVANT toute copie.
#                      Fichiers copiés : logo-<c>.svg + logo-<c>-*.svg vers <cible>/assets/.
#                      tree-noel.svg, sources/ et explorations/ ne sont jamais distribués.
#                      sync.sh ne supprime jamais rien dans <cible>/assets/.
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
ASSETS_LIST=""

for ARG in "$@"; do
    case "$ARG" in
        --no-showcase)     NO_SHOWCASE=true ;;
        --components=*)    COMPONENTS_LIST="${ARG#--components=}" ;;
        --with-graph)      WITH_GRAPH=true ;;
        # Plusieurs --assets= se cumulent (le dernier n'écrase pas les précédents).
        --assets=*)        ASSETS_LIST="${ASSETS_LIST:+$ASSETS_LIST,}${ARG#--assets=}" ;;
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
TARGET="${POSITIONAL[0]:?Usage: $0 [--no-showcase] [--components=core|<list>] [--assets=<charte>[,<charte>...]] <target-css-dir>}"

if [ ! -d "$TARGET" ]; then
    echo "ERREUR: répertoire cible inexistant : $TARGET" >&2
    exit 1
fi

# ─── Assets de marque : validation de --assets AVANT toute copie (#954) ─────
# Les chartes se déduisent des fichiers : `assets/logo-<c>.svg` à la racine du DS.
# logo-msyx-dark.svg (variante) n'est pas une charte : son nom contient un `-`, donc
# il ne passe pas ^[a-z0-9]+$. Ce même motif ferme `--assets=../x` et `--assets=ACSSI`.
# Charte inconnue = erreur explicite, exit 1, cible intacte (la validation précède le
# premier cp ; ne pas la déplacer après le socle CSS).
ASSETS_SRC="$(dirname "$SHARED_DIR")/assets"
ASSETS_AVAILABLE=()
for F in "$ASSETS_SRC"/logo-*.svg; do
    [ -f "$F" ] || continue
    C="$(basename "$F" .svg)"; C="${C#logo-}"
    [[ "$C" =~ ^[a-z0-9]+$ ]] && ASSETS_AVAILABLE+=("$C")
done
ASSETS_AVAILABLE_STR="$(IFS=','; echo "${ASSETS_AVAILABLE[*]:-}")"

# MSYX est toujours copiée ; les doublons (et `msyx` redemandée) sont sans effet.
ASSETS_CHARTES=(msyx)
ASSETS_BAD=false
if [ -n "$ASSETS_LIST" ]; then
    IFS=',' read -ra ASSETS_REQ <<< "$ASSETS_LIST"
    for C in "${ASSETS_REQ[@]}"; do
        [ -n "$C" ] || continue          # `--assets=a,,b` : élément vide ignoré, comme les chaînes vides plus haut
        if [[ " ${ASSETS_CHARTES[*]} " == *" $C "* ]]; then continue; fi
        if [[ "$C" =~ ^[a-z0-9]+$ ]] && [ -f "$ASSETS_SRC/logo-$C.svg" ]; then
            ASSETS_CHARTES+=("$C")
        else
            echo "ERREUR: charte inconnue pour --assets : '$C' (disponibles : $ASSETS_AVAILABLE_STR)" >&2
            ASSETS_BAD=true
        fi
    done
fi
if [ ! -f "$ASSETS_SRC/logo-msyx.svg" ]; then
    echo "ERREUR: charte msyx introuvable dans le DS source : $ASSETS_SRC/logo-msyx.svg" >&2
    ASSETS_BAD=true
fi
if $ASSETS_BAD; then
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
# ATTENTION — le ds-nav.js / ds-components.js livrés ci-dessous (Niveau C) référencent
# eux le sprite par un chemin ABSOLU site-root `/shared/icons/sprite.svg` (cloche du
# header, chevron du json-viewer…). Le CONSOMMATEUR qui utilise ce JS DOIT donc servir
# sa copie à cette URL exacte — même contrainte que pour graph/vendor/graph-layered.js
# (--with-graph, plus bas). Copie ici dans <TARGET>/icons/ pour rester corrélée au
# chemin source ; à l'intégrateur de router/monter ce dossier sous /shared/icons/ sur
# son site. Chemin non configurable : contrainte assumée du DS, pas un oubli (#951).
mkdir -p "$TARGET/icons"
cp "$SHARED_DIR/icons/sprite.svg" "$TARGET/icons/sprite.svg"

# ─── Assets de marque : logos (#954) ────────────────────────────────────────
# <TARGET>/assets/<fichier>. Par charte <c> : logo-<c>.svg + logo-<c>-*.svg, niveau
# racine seulement — tree-noel.svg (inliné par FestiveDecor), sources/ et explorations/
# ne correspondent à aucun de ces motifs et ne sont donc jamais distribués. Copie non
# destructive : rien n'est supprimé dans <TARGET>/assets/ (un logo propre à l'app y
# survit). Le DS ne référence ces fichiers depuis aucun CSS : c'est le HTML/JSX du
# consommateur qui les pointe (cf. CONSUMER_GUIDE.md).
mkdir -p "$TARGET/assets"
ASSETS_COPIED=0
for C in "${ASSETS_CHARTES[@]}"; do
    for SRC in "$ASSETS_SRC/logo-$C.svg" "$ASSETS_SRC"/logo-"$C"-*.svg; do
        [ -f "$SRC" ] || continue
        cp "$SRC" "$TARGET/assets/"
        ASSETS_COPIED=$((ASSETS_COPIED+1))
    done
done
ASSETS_CHARTES_STR="$(IFS=','; echo "${ASSETS_CHARTES[*]}")"

# ─── Niveau C : shell JS + agrégateur CSS (#372) ────────────────────────────
# Distribue le shell complet (header, sidebar, scroll-spy, SPA, composants
# interactifs) pour que les consumers reproduisent le Niveau C sans dépendre
# de design-system.msyx.fr. Préfixe ds- cohérent avec les CSS.
#   - ds-nav.js        : header, sidebar, scroll-spy, navigation SPA, LazyLoader
#   - ds-components.js : composants interactifs (toasts, modals, sliders, ...)
#   - ds-styles.css    : agrégateur @import des modules CSS
# styles.css importe css/<mod>.css (relatif à shared/) sous la forme
# `@import 'css/<mod>.css';` — SANS url(). Côté consumer les modules sont
# distribués en ds-<mod>.css à la racine de TARGET, donc on réécrit en
# `@import './ds-<mod>.css';` (#951).
# Deux pièges, tous deux déjà rencontrés :
#   - la substitution ciblait `url('css/…')` : styles.css n'utilise pas url(), le
#     sed ne transformait RIEN et ds-styles.css livrait 7 @import vers un dossier
#     css/ inexistant chez le consumer. On vise donc `@import '…'` (et on garde la
#     forme url('…') au cas où styles.css l'adopterait un jour).
#   - le chemin doit être RELATIF EXPLICITE (`./ds-x.css`) : un specifier nu
#     (`'ds-x.css'`) n'est pas résolu par le bundler Next/webpack des consumers.
# Garde-fou : tests/test-sync-styles.sh (aucun `css/` résiduel, 7 `./ds-*.css`).
cp "$SHARED_DIR/nav.js"        "$TARGET/ds-nav.js"
cp "$SHARED_DIR/components.js" "$TARGET/ds-components.js"
sed -e "s#@import 'css/\([a-z0-9_-]*\)\.css'#@import './ds-\1.css'#g" \
    -e "s#url('css/\([a-z0-9_-]*\)\.css')#url('./ds-\1.css')#g" \
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
echo "   -> ds-themes.css       (themes MSYX / ACSSI / Nhood / Auchan / Noël)"
echo "   -> ds-base.css         (socle : reset, body, texture grain)"
echo "   -> ds-utilities.css    (classes utilitaires)"
echo "   -> ds-layout.css       (header, sidebar, main)$(${NO_SHOWCASE} && echo ' [showcase stripped]' || true)"
echo "   -> ds-components.css   (${COMPONENTS_MODE})"
echo "   -> ds-fonts.css        (self-hosted woff2 + fonts/)"
echo "   -> fonts/              (woff2 Space Grotesk / Inter / Fira Code)"
echo "   -> assets/             (logos de marque : ${ASSETS_CHARTES_STR} — ${ASSETS_COPIED} fichiers ; le DS ne les référence pas, à servir ou importer côté consommateur)"
echo "   -> icons/sprite.svg    (sprite Lucide self-hosted — ds-nav.js/ds-components.js le référencent en /shared/icons/sprite.svg : à monter ou router sous cette URL exacte)"
echo "   -> components/         (modules CSS resolus par les @import)"
echo "   -> ds-nav.js           (Niveau C : header, sidebar, scroll-spy, SPA)"
echo "   -> ds-components.js    (Niveau C : composants interactifs JS)"
echo "   -> ds-styles.css       (Niveau C : agregateur @import des modules)"
echo "   -> ds-graph-lib.global.js (window.__pointerDrag/__svg — requis par ds-components.js)"
