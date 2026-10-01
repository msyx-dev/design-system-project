#!/bin/bash
set -euo pipefail

# sync-all.sh — Synchronise le design system vers les consommateurs listés dans consumers.json (schéma 2)
# Usage : ./sync-all.sh --root=<dir> [--consumers=<fichier>] [--check | --dry-run]
#                       [--no-showcase] [--components=<core|liste>] [--assets=<c>[,<c>…]] [--with-graph]
# Exemples : ./sync-all.sh --check --root=/home/deployer/projects/prod
#            ./sync-all.sh --dry-run --root=/home/deployer/projects/prod
#
# Sur le VPS msyx, l'usage est --check / --dry-run : écrire dans ~/projects/prod/* depuis ce script
# serait un hotfix hors pipeline (N1). Le resync réel se rejoue dans le pipeline de chaque consommateur,
# avec la commande `sync.sh` exacte affichée par --dry-run.
#
# --root=<dir>        racine des `dir` de consumers.json. OBLIGATOIRE, sans défaut : à défaut de
#                     --root, la variable d'environnement DS_CONSUMERS_ROOT. Ni l'une ni l'autre :
#                     erreur, exit 2 (une racine déduite de l'emplacement du script tomberait sur
#                     .claude/worktrees/ quand on lance depuis un worktree).
# --consumers=<fichier> liste des consommateurs (défaut : consumers.json à côté de ce script). Un hôte
#                     hors msyx garde ainsi sa propre liste hors du dépôt DS.
# --check             lecture seule, sync.sh n'est PAS appelé : contrôle la LISTE, dans les deux sens.
#                     Une ligne par constat, libellé en début de ligne :
#                       OK       [<name>]  <cible>   le dossier existe (« (jamais synchronisé) » si la
#                                                    cible n'a pas de ds-tokens.css)
#                       ABSENT   [<name>]  <cible>   <root>/<dir>/<css_dir> n'existe pas
#                       UNLISTED <dossier>           un ds-tokens.css sous la racine (profondeur 2 à 6,
#                                                    hors node_modules, worktrees, .next, dist, .git)
#                                                    dont le dossier n'est la cible d'aucune entrée
#                       INVALID  [<name>]  <raison>  entrée invalide (cf. ci-dessous)
#                     Exit 1 dès qu'il y a au moins un ABSENT, UNLISTED ou INVALID, 0 sinon. Il ne
#                     vérifie PAS la fraîcheur des copies : c'est le rôle de check-sync.sh, et la
#                     version locale se lit dans --dry-run. Les options de synchro sont sans effet.
# --dry-run           n'écrit rien ; affiche, par consommateur, la commande `sync.sh` exacte à rejouer.
#                     Incompatible avec --check (exit 2).
#
# Options globales, combinées avec celles de l'entrée du consommateur :
# --no-showcase       OU avec `no_showcase` de l'entrée
# --with-graph        OU avec `with_graph` de l'entrée
# --components=<v>    REMPLACE le `components` de l'entrée
# --assets=<c>[,<c>…] UNION avec `assets` de l'entrée (cumulable, comme dans sync.sh)
#
# Le fichier consumers.json est validé EN ENTIER avant toute copie (même principe que sync.sh) :
# une seule entrée INVALID suffit à ne rien faire (exit 1), dans tous les modes. Est INVALID : un
# schema différent de 2, le champ `path` (obsolète), une clé inconnue (faute de frappe comme `asset`),
# un name absent / hors ^[a-z0-9-]+$ / en double, un dir ou css_dir absolu ou contenant `..`, une
# charte de `assets` sans assets/logo-<c>.svg.
#
# Codes de sortie : 0 OK · 1 échec, dérive (--check) ou entrée INVALID · 2 erreur d'usage (racine,
# option inconnue, --check avec --dry-run)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNC_SH="$SCRIPT_DIR/sync.sh"
CONSUMERS_JSON="$SCRIPT_DIR/consumers.json"
DS_TOKENS="$SCRIPT_DIR/css/tokens.css"
ASSETS_SRC="$(dirname "$SCRIPT_DIR")/assets"

ROOT=""
CHECK=false
DRY_RUN=false
NO_SHOWCASE=false
WITH_GRAPH=false
COMPONENTS_LIST=""    # Optionnel : "core" ou "buttons,cards,forms" pour copie sélective
ASSETS_GLOBAL=""      # Cumulatif : plusieurs --assets= s'ajoutent, comme dans sync.sh

usage_error() {
    echo "ERREUR: $1" >&2
    echo "Usage : $0 --root=<dir> [--consumers=<fichier>] [--check | --dry-run] [--no-showcase] [--components=<core|liste>] [--assets=<c>[,<c>…]] [--with-graph]" >&2
    exit 2
}

for ARG in "$@"; do
    case "$ARG" in
        --root=*)          ROOT="${ARG#--root=}" ;;
        --consumers=*)     CONSUMERS_JSON="${ARG#--consumers=}" ;;
        --check)           CHECK=true ;;
        --dry-run)         DRY_RUN=true ;;
        --no-showcase)     NO_SHOWCASE=true ;;
        --with-graph)      WITH_GRAPH=true ;;
        --components=*)    COMPONENTS_LIST="${ARG#--components=}" ;;
        --assets=*)        ASSETS_GLOBAL="${ASSETS_GLOBAL:+$ASSETS_GLOBAL,}${ARG#--assets=}" ;;
        *)                 usage_error "option ou argument inconnu : $ARG" ;;
    esac
done

if $CHECK && $DRY_RUN; then
    usage_error "--check et --dry-run sont exclusifs : --check contrôle la liste, --dry-run affiche les commandes sync.sh"
fi

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
| ["name", "dir", "css_dir", "no_showcase", "assets", "components", "with_graph"] as $allowed
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
               ($e | keys_unsorted[] | select(. != "path") | . as $k
                | select(any($allowed[]; . == $k) | not)
                | f($label; "clé inconnue \"\($k)\" (clés autorisées : \($allowed | join(", ")))")),
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
    if $CHECK; then
        echo "FAIL — $CONSUMERS_JSON invalide : contrôle impossible tant que la liste n'est pas corrigée"
    else
        echo "FAIL — $CONSUMERS_JSON invalide : aucun consommateur synchronisé"
    fi
    exit 1
fi

echo "=== sync-all.sh — Design System v${DS_VERSION} ==="
echo "Racine : $ROOT"
if $CHECK; then echo "(mode --check : lecture seule, contrôle de la liste)"; fi
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

# ─── --check : contrôle de la LISTE, dans les deux sens (lecture seule) ────
# sync.sh n'est PAS appelé et rien n'est écrit. La fraîcheur des copies n'est pas contrôlée ici :
# c'est le rôle de check-sync.sh (un consommateur en retard ne doit pas faire échouer le contrôle
# de la liste) ; la version locale se lit dans --dry-run.
if $CHECK; then
    # normpath <chemin> : écrase `//`, `/./` et le `/` ou `/.` final. La validation a déjà refusé les
    # `..` et les chemins absolus : une comparaison de chaînes suffit, sans realpath (GNU seulement).
    normpath() {
        local p="$1"
        while [[ "$p" == *"//"* ]]; do p="${p//\/\//\/}"; done
        while [[ "$p" == *"/./"* ]]; do p="${p//\/.\//\/}"; done
        p="${p%/.}"; p="${p%/}"
        printf '%s' "$p"
    }

    N_OK=0
    N_ABSENT=0
    N_UNLISTED=0
    LISTED=$'\n'    # cibles listées, normalisées, une par ligne

    for ((i = 0; i < CONSUMER_COUNT; i++)); do
        NAME="${FIELDS[$((i * 7))]}"
        TARGET="$ROOT/${FIELDS[$((i * 7 + 1))]}/${FIELDS[$((i * 7 + 2))]}"
        LISTED+="$(normpath "$TARGET")"$'\n'
        if [ -d "$TARGET" ]; then
            NOTE=""
            [ -f "$TARGET/ds-tokens.css" ] || NOTE=" (jamais synchronisé)"
            printf '%-8s [%s]  %s%s\n' "OK" "$NAME" "$TARGET" "$NOTE"
            N_OK=$((N_OK + 1))
        else
            printf '%-8s [%s]  %s\n' "ABSENT" "$NAME" "$TARGET"
            N_ABSENT=$((N_ABSENT + 1))
        fi
    done

    # Consommateurs présents mais non listés : un ds-tokens.css sous la racine (profondeur 2 à 6, hors
    # node_modules / worktrees / .next / dist / .git) dont le dossier n'est la cible d'aucune entrée.
    # -mindepth 1 et non 2 : avec -mindepth 2, find n'applique pas -prune au niveau 1 et descendrait
    # dans <racine>/node_modules ou <racine>/dist ; la profondeur 2 est donc filtrée ci-dessous.
    while IFS= read -r -d '' F; do
        D="$(dirname "$F")"
        [ "$D" != "$ROOT" ] || continue
        case "$LISTED" in *$'\n'"$D"$'\n'*) continue ;; esac
        printf '%-8s %s\n' "UNLISTED" "$D"
        N_UNLISTED=$((N_UNLISTED + 1))
    done < <(find "$ROOT" -mindepth 1 -maxdepth 6 \( -name node_modules -o -name worktrees -o -name .next -o -name dist -o -name .git \) -prune -o -name ds-tokens.css -type f -print0 | sort -z)

    echo ""
    echo "─── Récapitulatif (--check) ─────────────────────────────────"
    echo "  Consommateurs listés      : $CONSUMER_COUNT"
    echo "  OK                        : $N_OK"
    echo "  ABSENT                    : $N_ABSENT"
    echo "  UNLISTED                  : $N_UNLISTED"
    echo "  INVALID                   : 0"
    echo ""
    if [ $((N_ABSENT + N_UNLISTED)) -gt 0 ]; then
        echo "Dérive — $N_ABSENT ABSENT, $N_UNLISTED UNLISTED : corriger la liste (ou le dossier) dans $CONSUMERS_JSON"
        exit 1
    fi
    echo "Parc conforme — les $CONSUMER_COUNT consommateur(s) listés sont présents, aucun n'est hors liste"
    exit 0
fi

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
