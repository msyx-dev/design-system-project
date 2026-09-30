#!/bin/bash
set -euo pipefail

# check-sync.sh — Vérifie si les fichiers DS sont à jour dans un projet consommateur
# Usage : ./check-sync.sh <répertoire-css-local>
#         ./check-sync.sh <fichier-local-ds-tokens.css>     (compatibilité legacy)
#         ./check-sync.sh --check-overrides <répertoire-css-projet>
# Exit 0 = OK, Exit 1 = désynchronisé ou overrides détectés
#
# Mode par défaut : vérifie les fichiers DS distribués par sync.sh
#   ds-tokens.css, ds-themes.css, ds-utilities.css, ds-base.css  -> version ET contenu (sha256)
#   ds-layout.css, ds-components.css                            -> version @ds-version seule
# Le POURQUOI de cette asymétrie est expliqué au-dessus du tableau FILE_PAIRS (#951).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DS_TOKENS="$SCRIPT_DIR/css/tokens.css"
# Dossier des modules CSS réels (source de vérité des sélecteurs DS).
# components.css est un barrel pur (@import only) → extraire les sélecteurs depuis
# le dossier components/ sinon --check-overrides est un no-op silencieux (#367-373).
DS_COMPONENTS_DIR="$SCRIPT_DIR/css/components"

MODE="${1:-}"

# ─── Mode --check-overrides ────────────────────────────────────────────────
if [ "$MODE" = "--check-overrides" ]; then
    CSS_DIR="${2:?Usage: $0 --check-overrides <répertoire-css-projet>}"

    if [ ! -d "$CSS_DIR" ]; then
        echo "ERREUR: répertoire inexistant : $CSS_DIR" >&2
        exit 1
    fi

    if [ ! -d "$DS_COMPONENTS_DIR" ]; then
        echo "ERREUR: dossier des modules DS introuvable : $DS_COMPONENTS_DIR" >&2
        exit 1
    fi

    echo "=== check-sync.sh --check-overrides ==="
    echo "Répertoire : $CSS_DIR"
    echo ""

    # Extraire les sélecteurs de classes définis dans les modules DS réels
    DS_SELECTORS=$(grep -rhoP '\.[a-zA-Z][a-zA-Z0-9_-]+(?=\s*[\{,])' "$DS_COMPONENTS_DIR" 2>/dev/null | sort -u || true)

    if [ -z "$DS_SELECTORS" ]; then
        echo "ERREUR: aucun sélecteur DS extrait depuis $DS_COMPONENTS_DIR" >&2
        exit 1
    fi

    # Scanner les fichiers CSS du projet (hors ds-*.css et hors components/ copié par
    # sync.sh — sinon les modules DS eux-memes seraient signales comme overrides, #367-373)
    CSS_FILES=$(find "$CSS_DIR" -name "*.css" ! -name "ds-*.css" -type f \
        ! -path "*/components/*" 2>/dev/null || true)

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

# ─── Mode par défaut : vérification de version sur les fichiers CSS ────────
ARG="${1:?Usage: $0 <répertoire-css-local|fichier-ds-tokens.css> | --check-overrides <répertoire>}"

# Compatibilité legacy : si l'argument est un fichier, déduire le répertoire
if [ -f "$ARG" ]; then
    CSS_LOCAL_DIR="$(dirname "$ARG")"
elif [ -d "$ARG" ]; then
    CSS_LOCAL_DIR="$ARG"
else
    echo "ERREUR: argument inexistant (fichier ou répertoire attendu) : $ARG" >&2
    exit 1
fi

if [ ! -f "$DS_TOKENS" ]; then
    echo "ERREUR: tokens.css DS introuvable : $DS_TOKENS" >&2
    exit 1
fi

DS_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_TOKENS" || echo "")
if [ -z "$DS_VERSION" ]; then
    echo "ERREUR: pas de @ds-version dans $DS_TOKENS" >&2
    exit 1
fi

echo "=== check-sync.sh — version DS source : v${DS_VERSION} ==="
echo "Répertoire local : $CSS_LOCAL_DIR"
echo ""

# ─── Comparaison par fichier : DEUX régimes (#951) ───────────────────────────
#
# Historique : ce script ne comparait que l'en-tête @ds-version. Un fichier dont le
# contenu change sans que son en-tête bouge passait donc pour « à jour ». C'est ce qui
# est arrivé à themes.css : autogénéré, son en-tête était figé à 2.67.0 par
# build-themes.js, donc source et copie consommateur affichaient la même version quel
# que soit leur contenu — la ligne ds-themes.css restait « OK » alors que les thèmes
# Auchan et Noël manquaient. Une comparaison d'en-têtes est muette dès que l'en-tête
# n'est plus bumpé avec le contenu ; seul le contenu est un signal fiable.
#
# Régime « content » — sha256 du fichier entier. RÉSERVÉ aux fichiers que sync.sh copie
#   À L'IDENTIQUE (`cp`) : tokens, themes, utilities, base. Copie fidèle => tout octet
#   qui diffère est une vraie désynchronisation ; aucun faux positif possible.
#
# Régime « header » — comparaison de @ds-version seule. Pour les fichiers que sync.sh
#   TRANSFORME selon les options du consommateur. Un hash brut y sortirait en faux
#   DRIFT PERMANENT chez tous ceux qui utilisent l'option (et le remède serait pire que
#   le mal : plus personne ne croirait le script) :
#     - ds-layout.css     : amputé de ses règles showcase (awk @strip:showcase-*)
#                           quand le consommateur a synchronisé avec --no-showcase ;
#     - ds-components.css : régénéré selon le mode — complet (copie), --components=core
#                           (components-core.css ré-estampillé par sed), --components=a,b
#                           (barrel généré à la volée) : il n'existe pas UN contenu source.
#   ds-fonts.css (url() réécrites, aucun en-tête) reste exclu, comme avant.
#
# Pourquoi PAS la voie « rejouer la transformation côté source avant de hasher » : ce
#   serait recopier ici la logique de sync.sh (awk showcase, trois modes de components,
#   sed de version). Deux copies d'une même transformation finissent par diverger, et
#   une divergence fabrique exactement le faux DRIFT permanent qu'on cherche à éviter.
#   Coût assumé : layout et components restent couverts par l'en-tête seul. C'est sûr tant
#   que leur en-tête est bumpé avec leur contenu, ce que garantit check-versions.sh
#   (tokens, utilities, components, layout, base et themes y figurent tous depuis #951).
#
# Si sync.sh se met à transformer un fichier « content » (ou cesse de transformer un
# fichier « header »), changer son régime ICI dans le même commit.
#
# Format : "<source-css>:<nom-local>:<régime>"
SOURCE_DIR="$SCRIPT_DIR/css"
FILE_PAIRS=(
    "tokens.css:ds-tokens.css:content"
    "themes.css:ds-themes.css:content"
    "utilities.css:ds-utilities.css:content"
    "base.css:ds-base.css:content"
    "layout.css:ds-layout.css:header"
    "components.css:ds-components.css:header"
)

DRIFT=0

# sha256 d'un fichier, tronqué à 12 caractères pour l'affichage.
short_sha() {
    sha256sum "$1" | cut -c1-12
}

for PAIR in "${FILE_PAIRS[@]}"; do
    IFS=: read -r SRC_NAME LOCAL_NAME REGIME <<< "$PAIR"
    SRC_PATH="$SOURCE_DIR/$SRC_NAME"
    LOCAL_PATH="$CSS_LOCAL_DIR/$LOCAL_NAME"

    if [ ! -f "$SRC_PATH" ]; then
        echo "ERREUR: fichier source DS introuvable : $SRC_PATH" >&2
        exit 1
    fi

    # Version source de CE fichier (fallback sur la version tokens si absente)
    SRC_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$SRC_PATH" 2>/dev/null | head -1 || echo "")
    [ -z "$SRC_VERSION" ] && SRC_VERSION="$DS_VERSION"

    if [ ! -f "$LOCAL_PATH" ]; then
        printf "  MISSING  %-22s — absent (jamais synchronisé ?)\n" "$LOCAL_NAME"
        DRIFT=$((DRIFT + 1))
        continue
    fi

    LOCAL_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$LOCAL_PATH" 2>/dev/null | head -1 || echo "")

    if [ -z "$LOCAL_VERSION" ]; then
        printf "  NO-TAG   %-22s — @ds-version absent dans le fichier local\n" "$LOCAL_NAME"
        DRIFT=$((DRIFT + 1))
    elif [ "$SRC_VERSION" != "$LOCAL_VERSION" ]; then
        printf "  DRIFT    %-22s — local v%s  (DS source : v%s)\n" "$LOCAL_NAME" "$LOCAL_VERSION" "$SRC_VERSION"
        DRIFT=$((DRIFT + 1))
    elif [ "$REGIME" = "content" ] && [ "$(short_sha "$SRC_PATH")" != "$(short_sha "$LOCAL_PATH")" ]; then
        # Même en-tête, contenu différent : le cas que la comparaison d'en-têtes ne voyait pas.
        printf "  DRIFT    %-22s — contenu différent à en-tête identique v%s  (sha256 local %s ≠ source %s)\n" \
            "$LOCAL_NAME" "$LOCAL_VERSION" "$(short_sha "$LOCAL_PATH")" "$(short_sha "$SRC_PATH")"
        DRIFT=$((DRIFT + 1))
    elif [ "$REGIME" = "content" ]; then
        printf "  OK       %-22s — v%s (contenu identique)\n" "$LOCAL_NAME" "$LOCAL_VERSION"
    else
        printf "  OK       %-22s — v%s (en-tête seul : fichier transformé par sync.sh)\n" "$LOCAL_NAME" "$LOCAL_VERSION"
    fi
done

echo ""
if [ $DRIFT -eq 0 ]; then
    echo "OK — tous les fichiers DS sont à jour"
    exit 0
else
    echo "WARN — $DRIFT fichier(s) désynchronisé(s)"
    echo "   → Exécuter sync.sh (ou sync-all.sh) pour mettre à jour"
    exit 1
fi
