#!/usr/bin/env bash
# test-sync-styles.sh — non-regression du ds-styles.css distribue par sync.sh (issue #951)
#
# Le defaut : sync.sh reecrivait `url('css/<mod>.css')` alors que shared/styles.css ecrit
# `@import 'css/<mod>.css';` (sans url()). Le sed ne transformait rien : ds-styles.css
# livre aux consommateurs contenait 7 @import vers un dossier css/ qui n'existe pas chez
# eux (les fichiers y sont a plat, en ds-*.css). Le chemin corrige doit en plus etre
# RELATIF EXPLICITE (`./ds-x.css`) : le bundler Next/webpack ne resout pas les
# specifiers nus (`'ds-x.css'`).
#
# On verifie le FICHIER PRODUIT, pas que le sed ait tourne :
#   Test A : sync.sh (defaut) -> aucun `css/` residuel dans ds-styles.css
#   Test B : sync.sh (defaut) -> exactement 7 `@import './ds-<mod>.css';`, aucun specifier nu
#   Test C : chaque @import de ds-styles.css resout vers un fichier present dans la cible
#   Test D : meme resultat en --no-showcase (les options ne doivent pas changer ds-styles.css)
#
# Variable SYNC_SH (optionnelle) : chemin d'un autre sync.sh, pour rejouer ce test contre
# l'ancien code et prouver qu'il echoue (le script doit vivre dans un dossier shared/ complet).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SYNC_SH="${SYNC_SH:-shared/sync.sh}"

PASS=0
FAIL=0
# Un seul dossier racine, nettoyé en sortie : synced est appelé dans des $(…), donc dans
# un sous-shell — une liste de dossiers tenue par le parent n'y serait jamais complétée.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass() { echo "  PASS"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

# synced <options...> : synchronise dans un dossier temporaire, affiche son chemin
synced() {
  local d
  d="$(mktemp -d "$WORK/cas.XXXXXX")"
  bash "$SYNC_SH" "$@" "$d" > /dev/null 2>&1
  printf '%s' "$d"
}

# Les 7 modules importes par shared/styles.css (source de verite du nombre attendu).
EXPECTED=7
SRC_IMPORTS="$(grep -c '^@import ' shared/styles.css)"
if [ "$SRC_IMPORTS" -ne "$EXPECTED" ]; then
  echo "ATTENTION: shared/styles.css contient $SRC_IMPORTS @import (le test en attend $EXPECTED) — mettre le test a jour"
fi

# --- Test A : plus aucun css/ residuel ---
echo "Test A: ds-styles.css ne contient plus aucun chemin css/ (0 occurrence attendue)..."
A="$(synced)"
if [ ! -f "$A/ds-styles.css" ]; then
  fail "ds-styles.css n'a pas ete produit"
elif grep -n "css/" "$A/ds-styles.css" > /dev/null; then
  fail "ds-styles.css pointe encore vers css/ (dossier inexistant chez le consommateur) :"
  grep -n "css/" "$A/ds-styles.css" | sed 's/^/    /'
else
  pass
fi

# --- Test B : 7 @import './ds-*.css', aucun specifier nu ---
echo "Test B: ds-styles.css contient $EXPECTED @import './ds-<mod>.css' (specifiers relatifs explicites)..."
GOOD="$(grep -cE "^@import '\./ds-[a-z0-9_-]+\.css';$" "$A/ds-styles.css" 2>/dev/null || true)"
TOTAL="$(grep -c '^@import ' "$A/ds-styles.css" 2>/dev/null || true)"
if [ "$GOOD" = "$EXPECTED" ] && [ "$TOTAL" = "$EXPECTED" ]; then
  pass
else
  fail "attendu $EXPECTED @import './ds-*.css' sur $EXPECTED @import, obtenu $GOOD sur $TOTAL"
  grep '^@import ' "$A/ds-styles.css" | sed 's/^/    /'
fi

# --- Test C : chaque import resout vers un fichier livre ---
echo "Test C: chaque @import de ds-styles.css pointe vers un fichier present dans la cible..."
MISSING=""
RESOLVED=0
while IFS= read -r REF; do
  if [ -f "$A/$REF" ]; then RESOLVED=$((RESOLVED+1)); else MISSING="$MISSING $REF"; fi
done < <(sed -nE "s#^@import '\./(ds-[a-z0-9_-]+\.css)';#\1#p" "$A/ds-styles.css")
# Garde anti-test-vide : 0 import reconnu ne doit pas passer pour "tout resout".
if [ -z "$MISSING" ] && [ "$RESOLVED" -eq "$EXPECTED" ]; then pass; else fail "$RESOLVED/$EXPECTED imports resolus vers un fichier livre ; manquants :${MISSING:- (aucun, mais imports non reconnus)}"; fi

# --- Test D : idem avec --no-showcase ---
echo "Test D: sync.sh --no-showcase produit le meme ds-styles.css..."
D="$(synced --no-showcase)"
if [ -f "$D/ds-styles.css" ] && cmp -s "$A/ds-styles.css" "$D/ds-styles.css"; then pass; else fail "ds-styles.css differe selon --no-showcase"; fi

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
