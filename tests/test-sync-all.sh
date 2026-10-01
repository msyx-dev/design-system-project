#!/usr/bin/env bash
# test-sync-all.sh — sync-all.sh : parc de consommateurs et options par consommateur (issue #970)
#
# Le defaut : consumers.json pointait sur 4 dossiers absents (acssi-core, acssistender, aksyva,
# aksy), sync-all.sh les sautait tous (`SKIP`) et sortait `OK — 0 consommateur(s)` : l'outil ne
# faisait rien et rien ne le disait. Il ne relayait en plus aucune option par consommateur
# (`--assets=` et `--with-graph` etaient ignores en silence), si bien qu'un consommateur a charte
# cliente resynchronise en masse perdait son logo.
#
# Le DOSSIER PRODUIT fait foi (liste exacte + contenu octet pour octet), pas la sortie du script.
# Tout se joue sur des fixtures dans un repertoire temporaire : ce test n'ecrit JAMAIS dans
# ~/projects/prod (N1). Le parc reel ne se lit qu'avec --dry-run, hors de ce test.
#
#   Test A (CA1) : assets de l'entree relayes par consommateur (+ --assets= global, css_dir)
#   Test B (CA2) : no_showcase / with_graph / components relayes ; --components= global l'emporte
#   Test C (CA3) : --dry-run n'ecrit rien et affiche la commande sync.sh exacte
#   Test D (CA4) : racine obligatoire (exit 2), DS_CONSUMERS_ROOT, option inconnue (exit 2)
#   Test E (CA5) : entree INVALID (dont cle inconnue) -> exit 1 AVANT toute copie, dans tous les modes
#   Test F       : SKIP non bloquant, fichier introuvable / illisible
#   Test G (CA8) : le consumers.json versionne est valide et liste le parc attendu
#   Test H (CA6) : --check sur un parc juste -> OK par entree, exit 0, rien d'ecrit
#   Test I (CA7) : --check sur un parc derive -> ABSENT / UNLISTED, exit 1, faux positifs ecartes
#
# Variable SYNC_ALL (optionnelle) : chemin d'un autre sync-all.sh, pour rejouer ce test contre un
# sync-all.sh MUTE et prouver qu'il echoue (preuve par mutation, decision permanente du depot).
# Ce script doit vivre dans un dossier shared/ complet (sync.sh, css/, fonts/, ...) dont le parent
# contient assets/ : recopier shared/ et assets/ dans un dossier temporaire, y muter sync-all.sh,
# puis SYNC_ALL=<copie>/shared/sync-all.sh bash tests/test-sync-all.sh.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
SYNC_ALL="${SYNC_ALL:-shared/sync-all.sh}"
case "$SYNC_ALL" in /*) ;; *) SYNC_ALL="$REPO/$SYNC_ALL" ;; esac
SA_DIR="$(dirname "$SYNC_ALL")"
SYNC_SH="$SA_DIR/sync.sh"

# Un DS_CONSUMERS_ROOT herite de l'environnement fausserait le Test D.
unset DS_CONSUMERS_ROOT

PASS=0
FAIL=0
WORK="$(mktemp -d)"
cleanup() { [ -n "${WORK:-}" ] && rm -rf "$WORK"; }
trap cleanup EXIT

pass() { echo "  PASS"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

MSYX_FILES="logo-msyx-dark.svg logo-msyx-light.svg logo-msyx-mark.svg logo-msyx.svg"
ACSSI_FILES="logo-acssi-dark.svg logo-acssi-light.svg logo-acssi-mark.svg logo-acssi.svg"

# Les fixtures vivent toutes sous $WORK. mktemp -p plutot qu'un compteur : ces fonctions sont
# appelees dans des $(...), un compteur n'y survivrait pas.
mkroot() { mktemp -d -p "$WORK"; }
mkcf()   { local f; f="$(mktemp -p "$WORK")"; printf '%s\n' "$1" > "$f"; printf '%s' "$f"; }
# mkstyles <racine> <dossier>... : cree les dossiers cibles (vides) des faux consommateurs
mkstyles() { local r="$1" d; shift; for d in "$@"; do mkdir -p "$r/$d"; done; }

# listing <dossier> : noms des entrees de premier niveau, tries, sur une ligne
listing() { ls -A "$1" 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//'; }
expected() { printf '%s\n' "$@" | sort | tr '\n' ' ' | sed 's/ $//'; }
same_tree() { diff -r "$1" "$2" > /dev/null 2>&1; }
# snapshot <dossier> : arborescence complete (fichiers ET dossiers), triee
snapshot() { find "$1" | sort; }
# has <texte> <regex> : une ligne du texte correspond a l'expression reguliere etendue
has() { printf '%s\n' "$1" | grep -Eq -- "$2"; }
hasf() { printf '%s\n' "$1" | grep -Fq -- "$2"; }
# hasx <texte> <ligne> : une ligne du texte est EXACTEMENT la ligne donnee
hasx() { printf '%s\n' "$1" | grep -Fxq -- "$2"; }
# count <texte> <regex> : nombre de lignes du texte qui correspondent
count() { printf '%s\n' "$1" | grep -Ec -- "$2"; }

# run <args...> : lance sync-all.sh ; renseigne OUT (stdout), ERR (stderr), RC (exit)
run() {
  local of ef
  of="$(mktemp -p "$WORK")"; ef="$(mktemp -p "$WORK")"
  bash "$SYNC_ALL" "$@" > "$of" 2> "$ef"; RC=$?
  OUT="$(cat "$of")"; ERR="$(cat "$ef")"
}

# direct <cible> <options...> : le dossier que produirait sync.sh appele a la main avec ces options
direct() { local t="$1"; shift; bash "$SYNC_SH" "$@" "$t" > /dev/null 2>&1; }

# --- Test A (CA1) : --assets= relaye par consommateur ---
echo "Test A (CA1): les assets de l'entree sont relayes, 4 MSYX seuls sans assets, --assets= global s'ajoute..."
BAD=""
R="$(mkroot)"; mkstyles "$R" a/src/styles b/src/styles c/web/css
CF="$(mkcf '{"schema":2,"consumers":[
  {"name":"a","dir":"a","assets":["acssi"]},
  {"name":"b","dir":"b"},
  {"name":"c","dir":"c","css_dir":"web/css"}]}')"
run --root="$R" --consumers="$CF"
[ "$RC" = 0 ] || BAD="$BAD [exit $RC au lieu de 0 : $ERR $OUT]"
WANT="$(expected $MSYX_FILES $ACSSI_FILES)"; GOT="$(listing "$R/a/src/styles/assets")"
[ "$GOT" = "$WANT" ] || BAD="$BAD [a : assets/ attendu ($WANT), obtenu (${GOT:-vide})]"
for F in $MSYX_FILES $ACSSI_FILES; do
  cmp -s "$R/a/src/styles/assets/$F" "$REPO/assets/$F" || BAD="$BAD [a : $F absent ou different de la source]"
done
WANT="$(expected $MSYX_FILES)"; GOT="$(listing "$R/b/src/styles/assets")"
[ "$GOT" = "$WANT" ] || BAD="$BAD [b : sans assets, attendu les 4 MSYX seuls, obtenu (${GOT:-vide})]"
# css_dir de l'entree : la copie va dans <dir>/<css_dir>, pas dans <dir>/src/styles.
[ -f "$R/c/web/css/ds-tokens.css" ] || BAD="$BAD [c : css_dir web/css non respecte]"
[ ! -e "$R/c/src" ] || BAD="$BAD [c : src/ cree a tort]"
# Un --assets=acssi global s'ajoute a une entree sans assets.
R2="$(mkroot)"; mkstyles "$R2" b/src/styles
CF2="$(mkcf '{"schema":2,"consumers":[{"name":"b","dir":"b"}]}')"
run --root="$R2" --consumers="$CF2" --assets=acssi
WANT="$(expected $MSYX_FILES $ACSSI_FILES)"; GOT="$(listing "$R2/b/src/styles/assets")"
[ "$RC" = 0 ] && [ "$GOT" = "$WANT" ] || BAD="$BAD [--assets=acssi global : assets/ attendu ($WANT), obtenu (${GOT:-vide}), exit $RC]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test B (CA2) : les autres options relayees ---
echo "Test B: no_showcase, with_graph et components relayes ; les options globales se combinent, --components= global l'emporte..."
BAD=""
R="$(mkroot)"; mkstyles "$R" ns/src/styles plain/src/styles wg/src/styles core/src/styles all/src/styles
CF="$(mkcf '{"schema":2,"consumers":[
  {"name":"ns","dir":"ns","no_showcase":true},
  {"name":"plain","dir":"plain"},
  {"name":"wg","dir":"wg","with_graph":true},
  {"name":"core","dir":"core","components":"core"},
  {"name":"all","dir":"all","no_showcase":true,"with_graph":true,"components":"core","assets":["acssi"]}]}')"
run --root="$R" --consumers="$CF"
[ "$RC" = 0 ] || BAD="$BAD [exit $RC : $ERR $OUT]"
# no_showcase : plus aucun marqueur @strip:showcase dans ds-layout.css ; sans l'option, ils y sont
# (garde anti-test-vide : si layout.css n'avait plus de marqueur, le test ne prouverait rien).
grep -q '@strip:showcase' "$R/plain/src/styles/ds-layout.css" || BAD="$BAD [plain : marqueurs @strip:showcase absents, le test ne prouve rien]"
! grep -q '@strip:showcase' "$R/ns/src/styles/ds-layout.css" || BAD="$BAD [ns : marqueurs @strip:showcase encore presents]"
# with_graph : ds-graph.global.js present, et seulement la ou il est demande.
[ -f "$R/wg/src/styles/ds-graph.global.js" ] || BAD="$BAD [wg : ds-graph.global.js absent]"
[ ! -e "$R/plain/src/styles/ds-graph.global.js" ] || BAD="$BAD [plain : ds-graph.global.js present a tort]"
# components=core : le barrel core, pas le complet.
T="$(mkroot)"; direct "$T" --components=core
cmp -s "$R/core/src/styles/ds-components.css" "$T/ds-components.css" || BAD="$BAD [core : ds-components.css different du barrel core]"
cmp -s "$R/core/src/styles/ds-components.css" "$R/plain/src/styles/ds-components.css" && BAD="$BAD [core : barrel identique au complet]"
# Toutes les options a la fois : le meme dossier que sync.sh appele a la main.
T="$(mkroot)"; direct "$T" --no-showcase --with-graph --components=core --assets=acssi
same_tree "$R/all/src/styles" "$T" || BAD="$BAD [all : different de sync.sh --no-showcase --with-graph --components=core --assets=acssi]"
# Flags globaux : OU avec l'entree.
R2="$(mkroot)"; mkstyles "$R2" plain/src/styles
CF2="$(mkcf '{"schema":2,"consumers":[{"name":"plain","dir":"plain"}]}')"
run --root="$R2" --consumers="$CF2" --no-showcase --with-graph
T="$(mkroot)"; direct "$T" --no-showcase --with-graph
same_tree "$R2/plain/src/styles" "$T" || BAD="$BAD [--no-showcase --with-graph globaux : different de sync.sh --no-showcase --with-graph]"
# --components= global REMPLACE celui de l'entree (core -> buttons).
R3="$(mkroot)"; mkstyles "$R3" core/src/styles
CF3="$(mkcf '{"schema":2,"consumers":[{"name":"core","dir":"core","components":"core"}]}')"
run --root="$R3" --consumers="$CF3" --components=buttons
T="$(mkroot)"; direct "$T" --components=buttons
same_tree "$R3/core/src/styles" "$T" || BAD="$BAD [--components=buttons global : different de sync.sh --components=buttons]"
[ -f "$R3/core/src/styles/components/buttons.css" ] || BAD="$BAD [--components=buttons global : components/buttons.css absent]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test C (CA3) : --dry-run ---
echo "Test C: --dry-run n'ecrit rien et chaque ligne DRY porte la commande sync.sh exacte..."
BAD=""
R="$(mkroot)"; mkstyles "$R" full/src/styles min/src/styles asc/src/styles cmp/src/styles
CF="$(mkcf '{"schema":2,"consumers":[
  {"name":"full","dir":"full","no_showcase":true,"with_graph":true,"components":"core","assets":["acssi"]},
  {"name":"min","dir":"min"},
  {"name":"asc","dir":"asc","assets":["acssi"]},
  {"name":"cmp","dir":"cmp","components":"core"}]}')"
BEFORE="$(snapshot "$R")"
run --root="$R" --consumers="$CF" --dry-run
[ "$RC" = 0 ] || BAD="$BAD [exit $RC : $ERR]"
[ "$(snapshot "$R")" = "$BEFORE" ] || BAD="$BAD [--dry-run a modifie la racine]"
hasf "$OUT" "sync.sh --no-showcase --with-graph --components=core --assets=acssi $R/full/src/styles" || BAD="$BAD [full : commande sync.sh attendue absente]"
hasf "$OUT" "sync.sh $R/min/src/styles" || BAD="$BAD [min : commande sync.sh nue attendue absente]"
has "$OUT" "^DRY +\[min\] .*sync\.sh [^-]*$" || BAD="$BAD [min : la ligne DRY porte des options a tort]"
for N in full min asc cmp; do has "$OUT" "^DRY +\[$N\] : v" || BAD="$BAD [$N : ligne DRY absente]"; done
# Fusion des options visible dans la commande : union des chartes sans doublon, --components= global
# qui remplace, flags globaux en plus.
run --root="$R" --consumers="$CF" --dry-run --assets=msyx
hasf "$OUT" "sync.sh --assets=acssi,msyx $R/asc/src/styles" || BAD="$BAD [union acssi + msyx global non relayee]"
run --root="$R" --consumers="$CF" --dry-run --assets=acssi
hasf "$OUT" "sync.sh --assets=acssi $R/asc/src/styles" || BAD="$BAD [union acssi + acssi global : doublon ou charte perdue]"
run --root="$R" --consumers="$CF" --dry-run --components=buttons
hasf "$OUT" "sync.sh --components=buttons $R/cmp/src/styles" || BAD="$BAD [--components= global ne remplace pas celui de l'entree]"
run --root="$R" --consumers="$CF" --dry-run --no-showcase --with-graph
hasf "$OUT" "sync.sh --no-showcase --with-graph $R/min/src/styles" || BAD="$BAD [flags globaux --no-showcase --with-graph non relayes]"
[ "$(snapshot "$R")" = "$BEFORE" ] || BAD="$BAD [--dry-run a modifie la racine (apres les variantes)]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test D (CA4) : racine obligatoire ---
echo "Test D: sans racine -> exit 2 et stderr cite --root ; DS_CONSUMERS_ROOT suffit ; option inconnue -> exit 2..."
BAD=""
R="$(mkroot)"; mkstyles "$R" a/src/styles
CF="$(mkcf '{"schema":2,"consumers":[{"name":"a","dir":"a"}]}')"
run --consumers="$CF" --dry-run
[ "$RC" = 2 ] || BAD="$BAD [sans racine : exit $RC au lieu de 2]"
case "$ERR" in *--root*DS_CONSUMERS_ROOT*) ;; *) BAD="$BAD [sans racine : stderr ne cite pas --root ni DS_CONSUMERS_ROOT : ${ERR:-vide}]" ;; esac
case "$ERR" in *"--root=/home/deployer/projects/prod"*) ;; *) BAD="$BAD [sans racine : stderr sans l'exemple a copier]" ;; esac
# DS_CONSUMERS_ROOT suffit...
OUT="$(DS_CONSUMERS_ROOT="$R" bash "$SYNC_ALL" --consumers="$CF" --dry-run 2>&1)"; RC=$?
[ "$RC" = 0 ] && has "$OUT" "^DRY +\[a\] " || BAD="$BAD [DS_CONSUMERS_ROOT seul : exit $RC, ligne DRY absente]"
# ... et --root l'emporte sur la variable.
OUT="$(DS_CONSUMERS_ROOT="$WORK/inexistant" bash "$SYNC_ALL" --root="$R" --consumers="$CF" --dry-run 2>&1)"; RC=$?
[ "$RC" = 0 ] && has "$OUT" "^DRY +\[a\] " || BAD="$BAD [--root + DS_CONSUMERS_ROOT invalide : --root ne l'emporte pas, exit $RC]"
# Racine inexistante, option inconnue (y compris l'ancien --no-showcase mal ecrit), argument nu.
run --root="$WORK/inexistant" --consumers="$CF" --dry-run
[ "$RC" = 2 ] || BAD="$BAD [racine inexistante : exit $RC au lieu de 2]"
for OPT in --bogus --assetz=acssi --no-showcas "$R"; do
  run --root="$R" --consumers="$CF" --dry-run "$OPT"
  [ "$RC" = 2 ] || BAD="$BAD [$OPT : exit $RC au lieu de 2]"
done
# --check et --dry-run sont exclusifs.
run --root="$R" --consumers="$CF" --check --dry-run
[ "$RC" = 2 ] || BAD="$BAD [--check --dry-run : exit $RC au lieu de 2]"
case "$ERR" in *--check*--dry-run*) ;; *) BAD="$BAD [--check --dry-run : stderr ne cite pas les deux options : ${ERR:-vide}]" ;; esac
# Aucune de ces erreurs d'usage ne doit avoir copie quoi que ce soit.
[ -z "$(find "$R" -type f)" ] || BAD="$BAD [une erreur d'usage a laisse des fichiers dans la racine]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test E (CA5) : INVALID avant toute copie ---
echo "Test E: entree INVALID -> exit 1, ligne INVALID [name], AUCUN consommateur synchronise (ecriture, --dry-run et --check)..."
BAD=""
# check_invalid <libelle> <regex etiquette> <regex raison> <json du fichier>
# Fixtures : <base>/root contient les consommateurs ok, bad, dup2 ; <base>/x/src/styles est un dossier
# VOISIN de la racine (cible de `../x`) ; @R@ est remplace par la racine. Une seule entree fautive
# suffit : le consommateur valide `ok` ne doit pas etre synchronise, ni rien d'autre sous <base>.
check_invalid() {
  local label="$1" re_label="$2" re_reason="$3" json="$4" mode BASE R CF
  for mode in "" "--dry-run" "--check"; do
    BASE="$(mkroot)"; R="$BASE/root"
    mkstyles "$R" ok/src/styles bad/src/styles dup2/src/styles; mkstyles "$BASE" x/src/styles
    CF="$(mkcf "${json//@R@/$R}")"
    # shellcheck disable=SC2086
    run --root="$R" --consumers="$CF" $mode
    [ "$RC" = 1 ] || BAD="$BAD [$label${mode:+ $mode}: exit $RC au lieu de 1]"
    has "$OUT" "^INVALID +$re_label +.*$re_reason" || BAD="$BAD [$label${mode:+ $mode}: ligne INVALID attendue absente : ${OUT:-vide}]"
    [ -z "$(find "$BASE" -type f)" ] || BAD="$BAD [$label${mode:+ $mode}: des fichiers ont ete copies malgre l'entree INVALID]"
    # --check : une liste invalide n'est pas controlee (ni OK, ni ABSENT, ni UNLISTED).
    if [ "$mode" = "--check" ] && has "$OUT" '^(OK|ABSENT|UNLISTED) '; then
      BAD="$BAD [$label --check: statuts OK/ABSENT/UNLISTED emis malgre l'entree INVALID]"
    fi
  done
}
OKENTRY='{"name":"ok","dir":"ok"}'
check_invalid "path"        '\[bad\]' 'path.*obsol'        '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","path":"/home/deployer/projects/prod/bad","dir":"bad"}]}'
check_invalid "path seul"   '\[bad\]' 'path.*obsol'        '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","path":"/home/deployer/projects/prod/bad"}]}'
check_invalid "dir absolu"  '\[bad\]' 'dir absolu'         '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"@R@/bad"}]}'
check_invalid "dir .."      '\[bad\]' 'dir.*\.\.'          '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"../x"}]}'
check_invalid "dir a/../b"  '\[bad\]' 'dir.*\.\.'          '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad/../../x"}]}'
check_invalid "dir absent"  '\[bad\]' 'dir absent'         '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad"}]}'
check_invalid "dir vide"    '\[bad\]' 'dir'                '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":""}]}'
check_invalid "css_dir abs" '\[bad\]' 'css_dir absolu'     '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","css_dir":"/etc"}]}'
check_invalid "css_dir .."  '\[bad\]' 'css_dir.*\.\.'      '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","css_dir":"../../x/src/styles"}]}'
check_invalid "name double" '\[ok\]'  'en double'          '{"schema":2,"consumers":['"$OKENTRY"',{"name":"ok","dir":"dup2"}]}'
check_invalid "name hors regex" '\[#1\]' 'name'            '{"schema":2,"consumers":['"$OKENTRY"',{"name":"Bad_Name","dir":"bad"}]}'
check_invalid "name absent" '\[#1\]'  'name'               '{"schema":2,"consumers":['"$OKENTRY"',{"dir":"bad"}]}'
check_invalid "assets inconnue" '\[bad\]' 'charte inconnue.*inconnue' '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","assets":["inconnue"]}]}'
check_invalid "assets ACSSI" '\[bad\]' 'charte inconnue.*ACSSI' '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","assets":["ACSSI"]}]}'
check_invalid "assets variante" '\[bad\]' 'charte inconnue.*acssi-mark' '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","assets":["acssi","acssi-mark"]}]}'
check_invalid "assets non tableau" '\[bad\]' 'assets'       '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","assets":"acssi"}]}'
check_invalid "schema 1"    '\[schema\]' 'schema'          '{"schema":1,"consumers":['"$OKENTRY"']}'
check_invalid "schema absent" '\[schema\]' 'schema'        '{"consumers":['"$OKENTRY"']}'
check_invalid "no_showcase texte" '\[bad\]' 'no_showcase'  '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","no_showcase":"true"}]}'
check_invalid "with_graph texte" '\[bad\]' 'with_graph'    '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","with_graph":1}]}'
check_invalid "components .." '\[bad\]' 'components'       '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","components":"../x"}]}'
# Cle inconnue (decision du parent, #970 T1 : une faute de frappe comme `asset` etait ignoree en silence,
# le logo n'arrivait jamais). Meme traitement que `path` : INVALID, dans tous les modes.
check_invalid "cle inconnue asset" '\[bad\]' 'cl. inconnue "asset"' '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","asset":["acssi"]}]}'
check_invalid "cle inconnue Dir" '\[bad\]' 'cl. inconnue "Dir"' '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","Dir":"bad"}]}'
check_invalid "cle inconnue comment" '\[bad\]' 'cl. inconnue "comment"' '{"schema":2,"consumers":['"$OKENTRY"',{"name":"bad","dir":"bad","comment":"parc 2026"}]}'
check_invalid "cle inconnue, name illisible" '\[#1\]' 'cl. inconnue "note"' '{"schema":2,"consumers":['"$OKENTRY"',{"name":"Bad_Name","dir":"bad","note":"x"}]}'
# La seule entree fautive est la DERNIERE : les valides qui la precedent ne sont pas synchronisees pour autant
# (deja couvert ci-dessus par `ok` en tete). Cas inverse : la fautive en tete, la valide ensuite.
check_invalid "fautive en tete" '\[bad\]' 'path.*obsol'    '{"schema":2,"consumers":[{"name":"bad","path":"/x","dir":"bad"},'"$OKENTRY"']}'
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test F : SKIP non bloquant, fichier introuvable ou illisible ---
echo "Test F: dossier absent = SKIP non bloquant ; fichier introuvable ou JSON illisible -> exit 1, rien de copie..."
BAD=""
R="$(mkroot)"; mkstyles "$R" ok/src/styles
CF="$(mkcf '{"schema":2,"consumers":[{"name":"ok","dir":"ok"},{"name":"absent","dir":"absent"}]}')"
run --root="$R" --consumers="$CF"
[ "$RC" = 0 ] || BAD="$BAD [SKIP : exit $RC au lieu de 0]"
has "$OUT" "^OK +\[ok\] " || BAD="$BAD [ligne OK [ok] absente]"
has "$OUT" "^SKIP +\[absent\] " || BAD="$BAD [ligne SKIP [absent] absente]"
[ -f "$R/ok/src/styles/ds-tokens.css" ] || BAD="$BAD [ok : non synchronise]"
[ ! -e "$R/absent" ] || BAD="$BAD [absent : dossier cree a tort]"
R="$(mkroot)"; mkstyles "$R" ok/src/styles
run --root="$R" --consumers="$WORK/inexistant.json"
[ "$RC" = 1 ] || BAD="$BAD [--consumers introuvable : exit $RC au lieu de 1]"
CF="$(mkcf '{"schema":2,"consumers":[{"name":"ok","dir":"ok"},')"
run --root="$R" --consumers="$CF"
[ "$RC" = 1 ] || BAD="$BAD [JSON illisible : exit $RC au lieu de 1]"
[ -z "$(find "$R" -type f)" ] || BAD="$BAD [des fichiers ont ete copies malgre un fichier illisible]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test G (CA8) : le consumers.json versionne ---
echo "Test G: shared/consumers.json est valide (schema 2, aucun INVALID) et liste cap-transfo, feedbacks, keepthread, tirokado..."
BAD=""
F="$REPO/shared/consumers.json"
[ "$(jq -r '.schema' "$F")" = "2" ] || BAD="$BAD [schema != 2]"
[ "$(jq -r '[.consumers[].name] | sort | join(" ")' "$F")" = "cap-transfo feedbacks keepthread tirokado" ] \
  || BAD="$BAD [noms : $(jq -r '[.consumers[].name] | join(" ")' "$F")]"
[ "$(jq '[.consumers[] | has("path")] | any' "$F")" = "false" ] || BAD="$BAD [champ path encore present]"
[ "$(jq '[.consumers[].dir | startswith("/")] | any' "$F")" = "false" ] || BAD="$BAD [dir absolu]"
# Le fichier PAR DEFAUT du script (sans --consumers) passe la validation sur une racine temporaire
# qui contient les 4 consommateurs : 4 lignes DRY, aucun INVALID, exit 0.
R="$(mkroot)"; mkstyles "$R" cap-transfo/src/styles feedbacks/src/styles keepthread/src/styles tirokado/src/styles
run --root="$R" --dry-run
[ "$RC" = 0 ] || BAD="$BAD [exit $RC : $OUT $ERR]"
has "$OUT" '^INVALID' && BAD="$BAD [ligne INVALID sur le fichier versionne]"
for N in cap-transfo feedbacks keepthread tirokado; do
  has "$OUT" "^DRY +\[$N\] .*sync\.sh --no-showcase $R/$N/src/styles\$" || BAD="$BAD [$N : ligne DRY attendue absente]"
done
# Sur une racine vide, le fichier reste valide : les 4 sont SKIP, aucun INVALID.
run --root="$(mkroot)" --dry-run
has "$OUT" '^INVALID' && BAD="$BAD [racine vide : ligne INVALID]"
# Meme controle en --check : racine avec les 4 consommateurs = 4 OK, exit 0 ; racine vide = 4 ABSENT,
# exit 1, aucun INVALID (le fichier est valide, c'est le disque qui diverge).
run --root="$R" --check
[ "$RC" = 0 ] || BAD="$BAD [--check, parc complet : exit $RC au lieu de 0 : $OUT $ERR]"
[ "$(count "$OUT" '^OK +\[(cap-transfo|feedbacks|keepthread|tirokado)\] ')" = 4 ] || BAD="$BAD [--check, parc complet : 4 lignes OK attendues]"
has "$OUT" '^INVALID' && BAD="$BAD [--check : ligne INVALID sur le fichier versionne]"
run --root="$(mkroot)" --check
[ "$RC" = 1 ] || BAD="$BAD [--check, racine vide : exit $RC au lieu de 1]"
[ "$(count "$OUT" '^ABSENT +\[(cap-transfo|feedbacks|keepthread|tirokado)\] ')" = 4 ] || BAD="$BAD [--check, racine vide : 4 lignes ABSENT attendues]"
has "$OUT" '^INVALID' && BAD="$BAD [--check, racine vide : ligne INVALID]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test H (CA6) : --check sur un parc juste ---
echo "Test H (CA6): --check sur un parc juste -> une ligne OK par entree, exit 0, '(jamais synchronise)' si pas de ds-tokens.css, rien d'ecrit..."
BAD=""
R="$(mkroot)"; mkstyles "$R" a/src/styles web/b/css autre
direct "$R/a/src/styles" --no-showcase       # a : consommateur synchronise (ds-tokens.css present)
echo "notes" > "$R/notes.txt"                 # un fichier, un dossier sans ds-tokens.css : pas des consommateurs
CF="$(mkcf '{"schema":2,"consumers":[
  {"name":"a","dir":"a"},
  {"name":"b","dir":"web/b","css_dir":"css"}]}')"
BEFORE="$(snapshot "$R")"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 0 ] || BAD="$BAD [exit $RC au lieu de 0 : $OUT $ERR]"
hasx "$OUT" "OK       [a]  $R/a/src/styles" || BAD="$BAD [ligne OK de a absente ou sans le format exact : $OUT]"
hasx "$OUT" "OK       [b]  $R/web/b/css (jamais synchronisé)" || BAD="$BAD [ligne OK de b sans '(jamais synchronisé)' : $OUT]"
[ "$(count "$OUT" '^OK ')" = 2 ] || BAD="$BAD [2 lignes OK attendues, obtenu $(count "$OUT" '^OK ')]"
has "$OUT" '^(ABSENT|UNLISTED|INVALID) ' && BAD="$BAD [statut de derive sur un parc juste]"
# --check n'ecrit rien et n'appelle pas sync.sh : b (dossier vide) reste vide.
[ "$(snapshot "$R")" = "$BEFORE" ] || BAD="$BAD [--check a modifie la racine]"
# La fraicheur n'est PAS controlee (c'est le role de check-sync.sh) : une copie en retard reste OK.
printf '/* @ds-version: 1.0.0 */\n' > "$R/a/src/styles/ds-tokens.css"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 0 ] && hasx "$OUT" "OK       [a]  $R/a/src/styles" || BAD="$BAD [copie en retard (v1.0.0) : OK/exit 0 attendus, exit $RC]"
# Les options de synchro sont sans effet en --check.
run --root="$R" --consumers="$CF" --check --assets=acssi --no-showcase --with-graph --components=core
[ "$RC" = 0 ] && [ "$(snapshot "$R")" = "$BEFORE" ] || BAD="$BAD [options de synchro avec --check : exit $RC ou racine modifiee]"
# Un chemin ecrit autrement ("./a/", "src/styles/") designe la meme cible : pas de faux UNLISTED.
CF2="$(mkcf '{"schema":2,"consumers":[{"name":"a","dir":"./a/","css_dir":"src/styles/"},{"name":"b","dir":"web//b","css_dir":"./css"}]}')"
run --root="$R" --consumers="$CF2" --check
[ "$RC" = 0 ] || BAD="$BAD [chemins non normalises : exit $RC au lieu de 0 : $OUT]"
has "$OUT" '^UNLISTED ' && BAD="$BAD [chemins non normalises : faux UNLISTED]"
# DS_CONSUMERS_ROOT suffit aussi en --check.
OUT="$(DS_CONSUMERS_ROOT="$R" bash "$SYNC_ALL" --consumers="$CF" --check 2>&1)"; RC=$?
[ "$RC" = 0 ] && [ "$(count "$OUT" '^OK ')" = 2 ] || BAD="$BAD [DS_CONSUMERS_ROOT en --check : exit $RC]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test I (CA7) : --check sur un parc derive ---
echo "Test I (CA7): --check sur un parc derive -> ABSENT et UNLISTED chacun exit 1, node_modules/worktrees/dist ecartes, rien d'ecrit..."
BAD=""
# I1 : ABSENT seul (aucun UNLISTED) -> exit 1.
R="$(mkroot)"; mkstyles "$R" a/src/styles; direct "$R/a/src/styles"
CF="$(mkcf '{"schema":2,"consumers":[{"name":"a","dir":"a"},{"name":"gone","dir":"gone"}]}')"
BEFORE="$(snapshot "$R")"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 1 ] || BAD="$BAD [ABSENT seul : exit $RC au lieu de 1]"
hasx "$OUT" "ABSENT   [gone]  $R/gone/src/styles" || BAD="$BAD [ABSENT seul : ligne ABSENT [gone] absente ou format inexact : $OUT]"
hasx "$OUT" "OK       [a]  $R/a/src/styles" || BAD="$BAD [ABSENT seul : la ligne OK de a doit rester emise]"
has "$OUT" '^UNLISTED ' && BAD="$BAD [ABSENT seul : UNLISTED emis a tort]"
[ "$(snapshot "$R")" = "$BEFORE" ] || BAD="$BAD [ABSENT seul : --check a modifie la racine (dossier cree ?)]"
# I2 : UNLISTED seul (aucun ABSENT) -> exit 1 ; la ligne porte le dossier du ds-tokens.css.
R="$(mkroot)"; mkstyles "$R" a/src/styles autre/src/styles; direct "$R/a/src/styles"; direct "$R/autre/src/styles"
CF="$(mkcf '{"schema":2,"consumers":[{"name":"a","dir":"a"}]}')"
BEFORE="$(snapshot "$R")"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 1 ] || BAD="$BAD [UNLISTED seul : exit $RC au lieu de 1]"
hasx "$OUT" "UNLISTED $R/autre/src/styles" || BAD="$BAD [UNLISTED seul : ligne UNLISTED attendue absente ou format inexact : $OUT]"
has "$OUT" '^ABSENT ' && BAD="$BAD [UNLISTED seul : ABSENT emis a tort]"
[ "$(count "$OUT" '^UNLISTED ')" = 1 ] || BAD="$BAD [UNLISTED seul : 1 seule ligne UNLISTED attendue]"
[ "$(snapshot "$R")" = "$BEFORE" ] || BAD="$BAD [UNLISTED seul : --check a modifie la racine]"
# I3 : ABSENT + UNLISTED ensemble -> exit 1, les deux lignes et les comptes du recapitulatif.
CF="$(mkcf '{"schema":2,"consumers":[{"name":"a","dir":"a"},{"name":"gone","dir":"gone"}]}')"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 1 ] || BAD="$BAD [ABSENT + UNLISTED : exit $RC au lieu de 1]"
has "$OUT" '^ABSENT +\[gone\] ' && has "$OUT" '^UNLISTED ' || BAD="$BAD [ABSENT + UNLISTED : les deux statuts attendus]"
has "$OUT" '^ +ABSENT +: 1$' && has "$OUT" '^ +UNLISTED +: 1$' && has "$OUT" '^ +OK +: 1$' || BAD="$BAD [recapitulatif : comptes OK 1 / ABSENT 1 / UNLISTED 1 attendus : $OUT]"
# I4 : le dossier existe mais le ds-tokens.css est sous un AUTRE css_dir que celui declare -> UNLISTED.
R="$(mkroot)"; mkstyles "$R" a/src/styles a/web/css; direct "$R/a/web/css"
CF="$(mkcf '{"schema":2,"consumers":[{"name":"a","dir":"a"}]}')"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 1 ] && hasx "$OUT" "UNLISTED $R/a/web/css" || BAD="$BAD [css_dir different du declare : UNLISTED $R/a/web/css attendu, exit $RC : $OUT]"
# I5 : un ds-tokens.css sous node_modules/, .claude/worktrees/, .next/, dist/, .git/ n'est PAS signale
# (y compris quand le dossier exclu est directement sous la racine) ; ni un ds-tokens.css a la racine.
R="$(mkroot)"; mkstyles "$R" a/src/styles
direct "$R/a/src/styles"
for D in a/node_modules/pkg a/.claude/worktrees/wt/src/styles a/.next/static a/dist/css a/.git/x node_modules/pkg dist/x; do
  mkdir -p "$R/$D"; cp "$R/a/src/styles/ds-tokens.css" "$R/$D/ds-tokens.css"
done
cp "$R/a/src/styles/ds-tokens.css" "$R/ds-tokens.css"
CF="$(mkcf '{"schema":2,"consumers":[{"name":"a","dir":"a"}]}')"
BEFORE="$(snapshot "$R")"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 0 ] || BAD="$BAD [dossiers exclus : exit $RC au lieu de 0 (faux UNLISTED ?) : $OUT]"
has "$OUT" '^UNLISTED ' && BAD="$BAD [dossiers exclus : UNLISTED emis a tort : $OUT]"
[ "$(snapshot "$R")" = "$BEFORE" ] || BAD="$BAD [dossiers exclus : --check a modifie la racine]"
# Garde anti-test-vide : le meme ds-tokens.css, hors dossier exclu, EST signale.
mkdir -p "$R/vrai/src/styles"; cp "$R/a/src/styles/ds-tokens.css" "$R/vrai/src/styles/ds-tokens.css"
run --root="$R" --consumers="$CF" --check
[ "$RC" = 1 ] && hasx "$OUT" "UNLISTED $R/vrai/src/styles" || BAD="$BAD [garde anti-test-vide : UNLISTED $R/vrai/src/styles attendu, exit $RC]"
[ "$(count "$OUT" '^UNLISTED ')" = 1 ] || BAD="$BAD [garde anti-test-vide : exactement 1 UNLISTED attendu : $OUT]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
