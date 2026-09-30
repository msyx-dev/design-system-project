#!/usr/bin/env bash
# test-sync-assets.sh — distribution des logos de marque par sync.sh --assets= (issue #954, T2)
#
# Le defaut : sync.sh ne distribuait aucun logo. Un consommateur qui veut le logo MSYX
# (ou ACSSI) devait le recopier a la main, et la copie derivait du DS sans que rien ne le
# dise (cf. #948, logo ACSSI). sync.sh copie maintenant assets/logo-<c>.svg + logo-<c>-*.svg
# vers <cible>/assets/. MSYX toujours ; les autres chartes en opt-in via --assets=<c>[,<c>].
#
# On verifie le DOSSIER PRODUIT (liste exacte + contenu octet pour octet), pas que le script
# ait tourne :
#   Test A : sync.sh (defaut)            -> assets/ = exactement les 4 logo-msyx*.svg, identiques aux sources
#   Test B : --assets=acssi              -> 4 MSYX + 4 ACSSI ; meme assets/ avec --components=core --no-showcase
#   Test C : --assets=msyx, --assets=, doublons -> meme assets/ que le defaut (ou que acssi) : sans effet
#   Test D : jamais distribues           -> ni tree-noel.svg, ni sources/, ni explorations/
#   Test E : charte inconnue             -> exit 1, stderr nomme la charte + les disponibles, cible VIDE
#            (inconnue, ACSSI, ../x, variante acssi-mark, melange valide+invalide)
#   Test F : recapitulatif stdout        -> une ligne `assets/` qui nomme chaque charte copiee
#   Test G : copie non destructive       -> un logo propre a l'app dans <cible>/assets/ survit
#   Test H : liste deduite des fichiers  -> ajouter assets/logo-nhood.svg rend --assets=nhood valide
#                                           sans toucher au script (DS temporaire, pas le vrai)
#
# Variable SYNC_SH (optionnelle) : chemin d'un autre sync.sh, pour rejouer ce test contre un
# sync.sh MUTE et prouver qu'il echoue (preuve par mutation, decision permanente du depot).
# Ce sync.sh doit vivre dans un dossier shared/ dont le parent contient assets/ (DS complet) ;
# le Test H recopie le DS puis y substitue ce sync.sh.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SYNC_SH="${SYNC_SH:-shared/sync.sh}"
case "$SYNC_SH" in /*) ;; *) SYNC_SH="$ROOT/$SYNC_SH" ;; esac

PASS=0
FAIL=0
TMPS=()
cleanup() { for d in "${TMPS[@]:-}"; do [ -n "$d" ] && rm -rf "$d"; done; }
trap cleanup EXIT

pass() { echo "  PASS"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

MSYX_FILES="logo-msyx-dark.svg logo-msyx-light.svg logo-msyx-mark.svg logo-msyx.svg"
ACSSI_FILES="logo-acssi-dark.svg logo-acssi-light.svg logo-acssi-mark.svg logo-acssi.svg"

mktarget() { local d; d="$(mktemp -d)"; TMPS+=("$d"); printf '%s' "$d"; }

# listing <dossier> : noms des entrees de premier niveau, tries, sur une ligne
listing() { ls -A "$1" 2>/dev/null | sort | tr '\n' ' ' | sed 's/ $//'; }

# expected <fichiers...> : liste triee sur une ligne
expected() { printf '%s\n' "$@" | sort | tr '\n' ' ' | sed 's/ $//'; }

# identical <cible> <fichiers...> : chaque fichier de <cible>/assets est identique a assets/<f> du DS
identical() {
  local t="$1" f; shift
  for f in "$@"; do cmp -s "$t/assets/$f" "assets/$f" || { echo "$f"; return 1; }; done
  return 0
}

# synced <options...> : synchronise dans une cible neuve, affiche son chemin
synced() {
  local d; d="$(mktarget)"
  bash "$SYNC_SH" "$@" "$d" > /dev/null 2>&1
  printf '%s' "$d"
}

# --- Test A : defaut = les 4 MSYX, identiques ---
echo "Test A: sync.sh (defaut) depose exactement les 4 logo-msyx*.svg, identiques aux sources..."
A="$(synced)"
GOT="$(listing "$A/assets")"; WANT="$(expected $MSYX_FILES)"
if [ "$GOT" != "$WANT" ]; then
  fail "assets/ attendu [$WANT], obtenu [${GOT:-vide}]"
elif BAD="$(identical "$A" $MSYX_FILES)"; [ -n "$BAD" ]; then
  fail "contenu different de la source : $BAD"
else
  pass
fi

# --- Test B : --assets=acssi ---
echo "Test B: --assets=acssi depose 4 MSYX + 4 ACSSI ; identique avec --components=core --no-showcase..."
B="$(synced --assets=acssi)"
B2="$(synced --assets=acssi --components=core --no-showcase)"
WANT="$(expected $MSYX_FILES $ACSSI_FILES)"
GOT="$(listing "$B/assets")"; GOT2="$(listing "$B2/assets")"
if [ "$GOT" != "$WANT" ]; then
  fail "assets/ attendu [$WANT], obtenu [${GOT:-vide}]"
elif BAD="$(identical "$B" $MSYX_FILES $ACSSI_FILES)"; [ -n "$BAD" ]; then
  fail "contenu different de la source : $BAD"
elif [ "$GOT2" != "$WANT" ] || ! diff -r "$B/assets" "$B2/assets" > /dev/null; then
  fail "--components=core --no-showcase change assets/ : [${GOT2:-vide}]"
else
  pass
fi

# --- Test C : cas sans effet ---
echo "Test C: --assets=msyx, --assets= vide et doublons n'ajoutent rien..."
BAD=""
for OPT in "--assets=msyx" "--assets=" "--assets=msyx,msyx" "--assets=,"; do
  D="$(synced "$OPT")"
  [ "$(listing "$D/assets")" = "$(expected $MSYX_FILES)" ] && diff -r "$A/assets" "$D/assets" > /dev/null || BAD="$BAD [$OPT]"
done
for OPT in "--assets=acssi,acssi" "--assets=msyx,acssi,msyx" "--assets=acssi,,msyx"; do
  D="$(synced "$OPT")"
  diff -r "$B/assets" "$D/assets" > /dev/null || BAD="$BAD [$OPT]"
done
# Deux options --assets= se cumulent (la seconde n'ecrase pas la premiere).
D="$(synced --assets=acssi --assets=msyx)"
diff -r "$B/assets" "$D/assets" > /dev/null || BAD="$BAD [--assets=acssi --assets=msyx]"
if [ -z "$BAD" ]; then pass; else fail "assets/ different du resultat attendu pour :$BAD"; fi

# --- Test D : jamais distribues ---
echo "Test D: tree-noel.svg, sources/ et explorations/ ne sont copies dans aucun mode..."
BAD=""
for OPT in "" "--assets=acssi" "--assets=acssi --components=core --no-showcase" "--assets=acssi --with-graph"; do
  # shellcheck disable=SC2086
  D="$(synced $OPT)"
  FOUND="$(find "$D" \( -name 'tree-noel*' -o -name 'sources' -o -name 'explorations' -o -name 'logoMSYX*' \) 2>/dev/null | sed "s#^$D/##" | tr '\n' ' ')"
  [ -z "$FOUND" ] || BAD="$BAD [${OPT:-defaut}: $FOUND]"
done
# Garde anti-test-vide : les sources a ne pas distribuer existent bien cote DS.
for SRC in assets/tree-noel.svg assets/sources assets/explorations; do
  [ -e "$SRC" ] || BAD="$BAD [source absente : $SRC, le test ne prouve rien]"
done
if [ -z "$BAD" ]; then pass; else fail "distribue a tort :$BAD"; fi

# --- Test E : charte inconnue -> erreur avant toute copie ---
echo "Test E: charte inconnue -> exit 1, stderr nomme la charte et les disponibles, cible intacte..."
BAD=""
# <valeur de --assets=>|<charte fautive attendue dans le message>
for CASE in "nhood|nhood" "ACSSI|ACSSI" "../x|../x" "acssi-mark|acssi-mark" "msyx-dark|msyx-dark" "acssi,nhood|nhood" "nhood,acssi|nhood"; do
  VAL="${CASE%%|*}"; BADC="${CASE##*|}"
  T="$(mktarget)"
  ERR="$(bash "$SYNC_SH" "--assets=$VAL" "$T" 2>&1 >/dev/null)"; RC=$?
  [ "$RC" = "1" ] || BAD="$BAD [$VAL: exit $RC au lieu de 1]"
  case "$ERR" in
    *"ERREUR: charte inconnue pour --assets : '$BADC' (disponibles : "*acssi*msyx*")"*) ;;
    *) BAD="$BAD [$VAL: stderr sans le message attendu : ${ERR:-vide}]" ;;
  esac
  [ -z "$(listing "$T")" ] || BAD="$BAD [$VAL: la cible a ete modifiee : $(listing "$T")]"
done
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test F : recapitulatif ---
echo "Test F: le recapitulatif stdout a une ligne assets/ qui nomme chaque charte copiee..."
OUT="$(bash "$SYNC_SH" "$(mktarget)" 2>/dev/null | grep -- '-> assets/')"
OUT2="$(bash "$SYNC_SH" --assets=acssi "$(mktarget)" 2>/dev/null | grep -- '-> assets/')"
BAD=""
case "$OUT" in *msyx*) ;; *) BAD="$BAD [defaut : ligne assets/ sans msyx : ${OUT:-absente}]" ;; esac
case "$OUT" in *acssi*) BAD="$BAD [defaut : annonce acssi a tort]" ;; esac
case "$OUT2" in *msyx*acssi*) ;; *) BAD="$BAD [--assets=acssi : ligne assets/ sans msyx et acssi : ${OUT2:-absente}]" ;; esac
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test G : copie non destructive ---
echo "Test G: un logo propre a l'app dans <cible>/assets/ survit a la synchro, un logo DS modifie est restaure..."
G="$(mktarget)"
mkdir -p "$G/assets"
echo '<svg id="monapp"/>' > "$G/assets/logo-monapp.svg"
echo '<svg id="ancien"/>' > "$G/assets/logo-msyx-legacy.svg"
echo '<svg id="derive"/>' > "$G/assets/logo-msyx.svg"
bash "$SYNC_SH" "$G" > /dev/null 2>&1
BAD=""
[ -f "$G/assets/logo-monapp.svg" ] && grep -q monapp "$G/assets/logo-monapp.svg" || BAD="$BAD [logo-monapp.svg supprime ou modifie]"
[ -f "$G/assets/logo-msyx-legacy.svg" ] || BAD="$BAD [logo-msyx-legacy.svg supprime]"
cmp -s "$G/assets/logo-msyx.svg" assets/logo-msyx.svg || BAD="$BAD [logo-msyx.svg derive non restaure]"
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

# --- Test H : liste des chartes deduite des fichiers (DS temporaire) ---
echo "Test H: ajouter assets/logo-nhood.svg rend --assets=nhood valide, sans toucher au script..."
DS="$(mktarget)"
cp -r shared "$DS/shared"
cp -r assets "$DS/assets"
cp "$SYNC_SH" "$DS/shared/sync.sh"
BAD=""
# Avant l'ajout : nhood est inconnue et la liste annoncee ne le contient pas.
ERR="$(bash "$DS/shared/sync.sh" --assets=nhood "$(mktarget)" 2>&1 >/dev/null)"; RC=$?
[ "$RC" = "1" ] || BAD="$BAD [avant ajout : exit $RC au lieu de 1]"
# Apres l'ajout d'une charte (+ une variante) : valide, copiee avec sa variante.
echo '<svg id="nhood"/>' > "$DS/assets/logo-nhood.svg"
echo '<svg id="nhood-dark"/>' > "$DS/assets/logo-nhood-dark.svg"
H="$(mktarget)"
bash "$DS/shared/sync.sh" --assets=nhood "$H" > /dev/null 2>&1; RC=$?
[ "$RC" = "0" ] || BAD="$BAD [apres ajout : exit $RC au lieu de 0]"
[ "$(listing "$H/assets")" = "$(expected $MSYX_FILES logo-nhood.svg logo-nhood-dark.svg)" ] \
  || BAD="$BAD [apres ajout : assets/ = $(listing "$H/assets")]"
# La liste des disponibles, elle aussi deduite, annonce desormais nhood.
ERR="$(bash "$DS/shared/sync.sh" --assets=inconnue "$(mktarget)" 2>&1 >/dev/null)"
case "$ERR" in *"disponibles : acssi,msyx,nhood)"*) ;; *) BAD="$BAD [liste des disponibles non deduite : ${ERR:-vide}]" ;; esac
if [ -z "$BAD" ]; then pass; else fail "$BAD"; fi

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
