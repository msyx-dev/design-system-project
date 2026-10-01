#!/bin/bash
set -euo pipefail

# sync-all.sh — Synchronise le design system vers les consommateurs listés dans consumers.json (schéma 2)
# Usage : ./sync-all.sh --root=<dir> [--consumers=<fichier>] [--dry-run]
#                       [--no-showcase] [--components=<core|liste>] [--assets=<c>[,<c>…]] [--with-graph]
# Exemple : ./sync-all.sh --dry-run --root=/home/deployer/projects/prod
#
# Sur le VPS msyx, l'usage est --dry-run : écrire dans ~/projects/prod/* depuis ce script serait un
# hotfix hors pipeline (N1). Le resync réel se rejoue dans le pipeline de chaque consommateur, avec la
# commande `sync.sh` exacte affichée par --dry-run.
#
# --root=<dir>        racine des `dir` de consumers.json. OBLIGATOIRE, sans défaut : à défaut de
#                     --root, la variable d'environnement DS_CONSUMERS_ROOT. Ni l'une ni l'autre :
#                     erreur, exit 2 (une racine déduite de l'emplacement du script tomberait sur
#                     .claude/worktrees/ quand on lance depuis un worktree).
# --consumers=<fichier> liste des consommateurs (défaut : consumers.json à côté de ce script). Un hôte
#                     hors msyx garde ainsi sa propre liste hors du dépôt DS.
# --dry-run           n'écrit rien ; affiche, par consommateur, la commande `sync.sh` exacte à rejouer.
#
# Options globales, combinées avec celles de l'entrée du consommateur :
# --no-showcase       OU avec `no_showcase` de l'entrée
# --with-graph        OU avec `with_graph` de l'entrée
# --components=<v>    REMPLACE le `components` de l'entrée
# --assets=<c>[,<c>…] UNION avec `assets` de l'entrée (cumulable, comme dans sync.sh)
#
# Le fichier consumers.json est validé EN ENTIER avant toute copie (même principe que sync.sh) :
# une seule entrée INVALID suffit à ne synchroniser aucun consommateur (exit 1).
#
# Codes de sortie : 0 OK · 1 échec ou entrée INVALID · 2 erreur d'usage (racine, option inconnue)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNC_SH="$SCRIPT_DIR/sync.sh"
CONSUMERS_JSON="$SCRIPT_DIR/consumers.json"
DS_TOKENS="$SCRIPT_DIR/css/tokens.css"
ASSETS_SRC="$(dirname "$SCRIPT_DIR")/assets"

ROOT=""
DRY_RUN=false
NO_SHOWCASE=false
WITH_GRAPH=false
COMPONENTS_LIST=""    # Optionnel : "core" ou "buttons,cards,forms" pour copie sélective
ASSETS_GLOBAL=""      # Cumulatif : plusieurs --assets= s'ajoutent, comme dans sync.sh

usage_error() {
    echo "ERREUR: $1" >&2
    echo "Usage : $0 --root=<dir> [--consumers=<fichier>] [--dry-run] [--no-showcase] [--components=<core|liste>] [--assets=<c>[,<c>…]] [--with-graph]" >&2
    exit 2
}

for ARG in "$@"; do
    case "$ARG" in
        --root=*)          ROOT="${ARG#--root=}" ;;
        --consumers=*)     CONSUMERS_JSON="${ARG#--consumers=}" ;;
        --dry-run)         DRY_RUN=true ;;
        --no-showcase)     NO_SHOWCASE=true ;;
        --with-graph)      WITH_GRAPH=true ;;
        --components=*)    COMPONENTS_LIST="${ARG#--components=}" ;;
        --assets=*)        ASSETS_GLOBAL="${ASSETS_GLOBAL:+$ASSETS_GLOBAL,}${ARG#--assets=}" ;;
        *)                 usage_error "option ou argument inconnu : $ARG" ;;
    esac
done

# ─── Racine : --root, puis DS_CONSUMERS_ROOT, sinon erreur (pas de défaut) ──
if [ -z "$ROOT" ]; then
    ROOT="${DS_CONSUMERS_ROOT:-}"
fi
if [ -z "$ROOT" ]; then
    usage_error "racine des consommateurs non précisée : passer --root=<dir> (ou DS_CONSUMERS_ROOT), par exemple --root=/home/deployer/projects/prod"
fi
if [ ! -d "$ROOT" ]; then
    usage_error "racine inexistante : $ROOT"
fi
ROOT="$(cd "$ROOT" && pwd)"

# ─── Vérifications préalables ──────────────────────────────────────────────
if [ ! -f "$SYNC_SH" ]; then
    echo "ERREUR: sync.sh introuvable : $SYNC_SH" >&2
    exit 1
fi

if [ ! -f "$CONSUMERS_JSON" ]; then
    echo "ERREUR: fichier des consommateurs introuvable : $CONSUMERS_JSON" >&2
    echo "       Créer ce fichier (schéma 2, cf. shared/CONSUMER_GUIDE.md) ou le désigner avec --consumers=<fichier>." >&2
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "ERREUR: jq est requis pour lire consumers.json" >&2
    echo "       sudo apt-get install jq" >&2
    exit 1
fi

DS_VERSION=$(grep -oP '@ds-version:\s*\K[\d.]+' "$DS_TOKENS" || echo "unknown")

# ─── Chartes disponibles : même règle que sync.sh (#954) ────────────────────
# `assets/logo-<c>.svg` à la racine du DS, avec <c> conforme à ^[a-z0-9]+$.
ASSETS_AVAILABLE=()
for F in "$ASSETS_SRC"/logo-*.svg; do
    [ -f "$F" ] || continue
    C="$(basename "$F" .svg)"; C="${C#logo-}"
    if [[ "$C" =~ ^[a-z0-9]+$ ]]; then ASSETS_AVAILABLE+=("$C"); fi
done
ASSETS_AVAILABLE_STR="$(IFS=','; echo "${ASSETS_AVAILABLE[*]:-}")"

# Un --assets= global fautif ferait échouer sync.sh pour chaque consommateur : on l'arrête ici,
# avant toute copie, comme une erreur d'usage.
if [ -n "$ASSETS_GLOBAL" ]; then
    IFS=',' read -ra GLOBAL_REQ <<< "$ASSETS_GLOBAL"
    for C in "${GLOBAL_REQ[@]}"; do
        [ -n "$C" ] || continue
        if ! { [[ "$C" =~ ^[a-z0-9]+$ ]] && [ -f "$ASSETS_SRC/logo-$C.svg" ]; }; then
            usage_error "charte inconnue pour --assets : '$C' (disponibles : $ASSETS_AVAILABLE_STR)"
        fi
    done
fi

# ─── Validation du fichier ENTIER, AVANT toute copie ────────────────────────
# Une ligne `<étiquette><TAB><raison>` par défaut constaté. Une entrée au `name` illisible est
# désignée par son rang, `[#<i>]`.
VALIDATION_JQ='
def f($label; $reason): "\($label)\t\($reason)";
def relcheck($key; $label):
    if type != "string" or . == "" then f($label; "\($key) : chaîne non vide attendue")
    elif test("[[:cntrl:]]") then f($label; "\($key) contient un caractère de contrôle")
    elif startswith("/") then f($label; "\($key) absolu (\(.)) : utiliser un chemin relatif à --root")
    elif test("(^|/)\\.\\.(/|$)") then f($label; "\($key) contient un segment `..` : \(.)")
    else empty end;
def boolcheck($e; $key; $label):
    if ($e | has($key)) and (($e[$key] | type) != "boolean")
    then f($label; "\($key) : booléen attendu (true ou false)") else empty end;
($avail | split(",")) as $chartes
| if type != "object" then f("[fichier]"; "objet JSON attendu à la racine")
  else
    . as $r
    | (if $r.schema == 2 then empty
       else f("[schema]"; "schema \($r.schema | tojson) : la valeur 2 est attendue") end),
      (if ($r.consumers | type) != "array" then f("[consumers]"; "tableau `consumers` attendu")
       else
         $r.consumers as $cs
         | range(0; $cs | length) as $i
         | $cs[$i] as $e
         | if ($e | type) != "object" then f("[#\($i)]"; "entrée : objet attendu")
           else
             (if ($e.name | type) == "string" and ($e.name | test("^[a-z0-9-]+$")) then $e.name else null end) as $name
             | (if $name == null then "[#\($i)]" else "[\($name)]" end) as $label
             | (if $name == null
                then f($label; "name absent ou hors ^[a-z0-9-]+$ : \($e.name | tojson)")
                elif any($cs[:$i][]; type == "object" and .name == $name)
                then f($label; "name en double : \($name)")
                else empty end),
               (if $e | has("path")
                then f($label; "champ `path` obsolète : utiliser `dir` relatif à --root") else empty end),
               (if $e | has("dir") | not
                then f($label; "dir absent : chemin relatif à --root attendu")
                else ($e.dir | relcheck("dir"; $label)) end),
               (if $e | has("css_dir") then ($e.css_dir | relcheck("css_dir"; $label)) else empty end),
               boolcheck($e; "no_showcase"; $label),
               boolcheck($e; "with_graph"; $label),
               (if $e | has("components")
                then ($e.components
                      | if type == "string" and test("^([a-z0-9_-]+(,[a-z0-9_-]+)*)?$") then empty
                        else f($label; "components : \"\", \"core\" ou liste \"mod1,mod2\" attendus (modules ^[a-z0-9_-]+$)") end)
                else empty end),
               (if $e | has("assets")
                then (if ($e.assets | type) != "array"
                      then f($label; "assets : tableau de chartes attendu")
                      else $e.assets[]
                           | . as $c
                           | if type == "string" and test("^[a-z0-9]+$") and any($chartes[]; . == $c) then empty
                             else f($label; "assets : charte inconnue \"\(if type == "string" then . else tojson end)\" (disponibles : \($avail))") end
                      end)
                else empty end)
           end
       end)
  end
'

# shquote <mot> : le mot tel quel s'il est sûr pour le shell, sinon échappé (le chemin d'une cible
# peut contenir un espace). `printf %q` seul échapperait aussi la virgule de --assets=a,b.
shquote() {
    if [[ "$1" =~ ^[A-Za-z0-9_=,./:@%+-]+$ ]]; then printf '%s' "$1"; else printf '%q' "$1"; fi
}

JQ_STATUS=0
INVALID_LINES="$(jq -r --arg avail "$ASSETS_AVAILABLE_STR" "$VALIDATION_JQ" "$CONSUMERS_JSON" 2>&1)" || JQ_STATUS=$?
if [ $JQ_STATUS -ne 0 ]; then
    echo "ERREUR: $CONSUMERS_JSON illisible (JSON invalide ?)" >&2
    echo "$INVALID_LINES" | sed 's/^/       /' >&2
    exit 1
fi
if [ -n "$INVALID_LINES" ]; then
    while IFS=$'\t' read -r LABEL REASON; do
        printf '%-8s %s  %s\n' "INVALID" "$LABEL" "$REASON"
    done <<< "$INVALID_LINES"
    echo ""
    echo "FAIL — $CONSUMERS_JSON invalide : aucun consommateur synchronisé"
    exit 1
fi

echo "=== sync-all.sh — Design System v${DS_VERSION} ==="
echo "Racine : $ROOT"
if $DRY_RUN; then echo "(mode --dry-run : aucune modification)"; fi
echo ""

TOTAL=0
SYNCED=0
SKIPPED=0
ERRORS=0

# ─── Lecture de la liste des consommateurs ─────────────────────────────────
# 7 valeurs par entrée, une par ligne, avec les défauts de sync.sh pour les champs omis.
mapfile -t FIELDS < <(jq -r '.consumers[] | [
    .name,
    .dir,
    (.css_dir // "src/styles"),
    ((.no_showcase // false) | tostring),
    ((.assets // []) | join(",")),
    (.components // ""),
    ((.with_graph // false) | tostring)
] | .[]' "$CONSUMERS_JSON")
CONSUMER_COUNT=$(( ${#FIELDS[@]} / 7 ))

for ((i = 0; i < CONSUMER_COUNT; i++)); do
    NAME="${FIELDS[$((i * 7))]}"
    ENTRY_DIR="${FIELDS[$((i * 7 + 1))]}"
    CSS_DIR="${FIELDS[$((i * 7 + 2))]}"
    ENTRY_NO_SHOWCASE="${FIELDS[$((i * 7 + 3))]}"
    ENTRY_ASSETS="${FIELDS[$((i * 7 + 4))]}"
    ENTRY_COMPONENTS="${FIELDS[$((i * 7 + 5))]}"
    ENTRY_WITH_GRAPH="${FIELDS[$((i * 7 + 6))]}"
    TARGET="$ROOT/$ENTRY_DIR/$CSS_DIR"

    TOTAL=$((TOTAL + 1))

    # Vérifier que le répertoire cible existe
    if [ ! -d "$TARGET" ]; then
        printf '%-5s [%s] — répertoire absent : %s\n' "SKIP" "$NAME" "$TARGET"
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

    # Arguments de sync.sh : options de l'entrée combinées avec les options globales
    SYNC_ARGS=()
    if [ "$ENTRY_NO_SHOWCASE" = "true" ] || $NO_SHOWCASE; then SYNC_ARGS+=("--no-showcase"); fi
    if [ "$ENTRY_WITH_GRAPH" = "true" ] || $WITH_GRAPH; then SYNC_ARGS+=("--with-graph"); fi
    # --components= global REMPLACE celui de l'entrée
    if [ -n "$COMPONENTS_LIST" ]; then
        SYNC_ARGS+=("--components=$COMPONENTS_LIST")
    elif [ -n "$ENTRY_COMPONENTS" ]; then
        SYNC_ARGS+=("--components=$ENTRY_COMPONENTS")
    fi
    # --assets= : UNION des chartes de l'entrée et des --assets= globaux, sans doublon
    ASSETS_UNION=""
    IFS=',' read -ra ASSETS_PARTS <<< "${ENTRY_ASSETS},${ASSETS_GLOBAL}"
    for C in "${ASSETS_PARTS[@]}"; do
        [ -n "$C" ] || continue
        case ",$ASSETS_UNION," in *",$C,"*) continue ;; esac
        ASSETS_UNION="${ASSETS_UNION:+$ASSETS_UNION,}$C"
    done
    if [ -n "$ASSETS_UNION" ]; then SYNC_ARGS+=("--assets=$ASSETS_UNION"); fi

    if $DRY_RUN; then
        printf '%-5s [%s] : v%s → v%s  (%s)  sync.sh' "DRY" "$NAME" "$LOCAL_VERSION" "$DS_VERSION" "$TARGET"
        for A in ${SYNC_ARGS[@]+"${SYNC_ARGS[@]}"}; do printf ' %s' "$(shquote "$A")"; done
        printf ' %s\n' "$(shquote "$TARGET")"
        SYNCED=$((SYNCED + 1))
        continue
    fi

    STATUS=0
    OUTPUT=$(bash "$SYNC_SH" ${SYNC_ARGS[@]+"${SYNC_ARGS[@]}"} "$TARGET" 2>&1) || STATUS=$?

    if [ $STATUS -eq 0 ]; then
        printf '%-5s [%s] : v%s → v%s\n' "OK" "$NAME" "$LOCAL_VERSION" "$DS_VERSION"
        SYNCED=$((SYNCED + 1))
    else
        printf '%-5s [%s] : erreur pendant la synchronisation\n' "FAIL" "$NAME"
        echo "$OUTPUT" | sed 's/^/         /'
        ERRORS=$((ERRORS + 1))
    fi
done

# ─── Récapitulatif ─────────────────────────────────────────────────────────
echo ""
echo "─── Récapitulatif ───────────────────────────────────────────"
echo "  Consommateurs enregistrés : $TOTAL"
if $DRY_RUN; then
    echo "  Seraient synchronisés      : $SYNCED"
else
    echo "  Synchronisés              : $SYNCED"
fi
if [ $SKIPPED -gt 0 ]; then echo "  Ignorés (absent)           : $SKIPPED"; fi
if [ $ERRORS -gt 0 ]; then echo "  Erreurs                    : $ERRORS"; fi
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
