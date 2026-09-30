#!/usr/bin/env bash
# test-check-sync.sh — tests de non-regression de check-sync.sh (issue #951)
#
# Le defaut : check-sync.sh ne comparait que l'en-tete @ds-version. Un ds-*.css dont le
# contenu differe de la source a en-tete egal (themes.css, en-tete fige a 2.67.0)
# sortait "OK". Le script compare desormais le CONTENU des fichiers que sync.sh copie
# a l'identique (tokens, themes, utilities, base) et garde l'en-tete seul pour ceux que
# sync.sh transforme (layout --no-showcase, components selon --components=...).
#
# Test A : consommateur synchronise par le VRAI sync.sh (defaut)         -> exit 0, 0 DRIFT
# Test B : meme contenu, un theme retire de ds-themes.css, en-tete egal  -> exit 1, DRIFT themes
# Test C : idem sur ds-base.css (paire ajoutee par #951)                 -> exit 1, DRIFT base
# Test D : sync.sh --no-showcase (layout amputé) -> PAS de faux DRIFT    -> exit 0
# Test E : sync.sh --components=core (barrel regenere) -> PAS de faux DRIFT -> exit 0
# Test F : ds-base.css absent (consommateur ancien)                      -> exit 1, MISSING
# Test G : contenu modifie ET en-tete different                          -> exit 1, DRIFT (versions)
# Test H : ds-layout.css modifie a en-tete egal -> non detecte (regime "header" assume) -> exit 0
#
# Les fixtures sont produites par le vrai sync.sh (pas de copie a la main) : si sync.sh
# change ce qu'il transforme, ce test le voit.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
TMPS=()
cleanup() { for d in "${TMPS[@]:-}"; do [ -n "$d" ] && rm -rf "$d"; done; }
trap cleanup EXIT

new_tmp() {
  local d
  d="$(mktemp -d)"
  TMPS+=("$d")
  printf '%s' "$d"
}

# run_check <dir> : lance check-sync.sh, stocke la sortie dans $OUT et le code dans $RC.
# Les assertions utilisent `grep -q ... <<< "$OUT"`, jamais `echo "$OUT" | grep -q` : sous
# pipefail, grep -q quitte au 1er match, echo prend SIGPIPE et le pipeline vaut 141 (test flaky).
run_check() {
  OUT="$(bash shared/check-sync.sh "$1" 2>&1)"
  RC=$?
}

pass() { echo "  PASS"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; echo "$OUT" | sed 's/^/    /'; FAIL=$((FAIL+1)); }

# sync_into <dir> [options sync.sh...] : synchronise via le vrai sync.sh
sync_into() {
  local dir="$1"; shift
  bash shared/sync.sh "$@" "$dir" > /dev/null 2>&1
}

# --- Test A : fichiers identiques -> 0 DRIFT ---
echo "Test A: consommateur synchronise (defaut) -> 0 DRIFT (exit 0 attendu)..."
A="$(new_tmp)"
sync_into "$A"
run_check "$A"
if [ "$RC" -eq 0 ] && ! grep -qE '^ +(DRIFT|MISSING|NO-TAG)' <<< "$OUT"; then pass; else fail "un consommateur fraichement synchronise doit etre a jour (rc=$RC)"; fi

# --- Test B : themes.css amputé d'un theme, en-tete inchange -> DRIFT (le defaut #951) ---
echo "Test B: ds-themes.css sans un theme, en-tete egal (DRIFT attendu)..."
B="$(new_tmp)"
sync_into "$B"
# Retire tout le bloc Noel (dark + light) sans toucher a l'en-tete.
awk '/^\[data-theme="noel"\]/{skip=1} skip&&/^}/{skip=0; next} !skip' "$B/ds-themes.css" > "$B/ds-themes.css.tmp"
mv "$B/ds-themes.css.tmp" "$B/ds-themes.css"
# Garde-fou du test : la mutation a bien retire du contenu, et l'en-tete est identique a la source.
if cmp -s "$B/ds-themes.css" shared/css/themes.css; then
  echo "  FAIL: la mutation n'a rien change (fixture invalide)"; FAIL=$((FAIL+1))
elif [ "$(sed -n 2p "$B/ds-themes.css")" != "$(sed -n 2p shared/css/themes.css)" ]; then
  echo "  FAIL: l'en-tete a bouge (fixture invalide)"; FAIL=$((FAIL+1))
else
  run_check "$B"
  if [ "$RC" -eq 1 ] && grep -qE 'DRIFT +ds-themes\.css .*contenu différent' <<< "$OUT"; then pass; else fail "contenu modifie a en-tete egal doit sortir DRIFT sur ds-themes.css (rc=$RC)"; fi
fi

# --- Test C : ds-base.css modifie a en-tete egal -> DRIFT (paire base.css ajoutee) ---
echo "Test C: ds-base.css modifie, en-tete egal (DRIFT attendu)..."
C="$(new_tmp)"
sync_into "$C"
printf '\n/* divergence locale */\nbody { margin: 1px; }\n' >> "$C/ds-base.css"
run_check "$C"
if [ "$RC" -eq 1 ] && grep -qE 'DRIFT +ds-base\.css .*contenu différent' <<< "$OUT"; then pass; else fail "ds-base.css modifie doit sortir DRIFT (rc=$RC)"; fi

# --- Test D : --no-showcase -> layout amputé, PAS de faux DRIFT ---
echo "Test D: sync.sh --no-showcase (ds-layout.css amputé) -> pas de faux DRIFT (exit 0 attendu)..."
D="$(new_tmp)"
sync_into "$D" --no-showcase
# Garde-fou : le fichier local differe bien de la source (sinon le test ne prouve rien).
if cmp -s "$D/ds-layout.css" shared/css/layout.css; then
  echo "  FAIL: --no-showcase n'a rien retire de ds-layout.css (fixture invalide)"; FAIL=$((FAIL+1))
else
  run_check "$D"
  if [ "$RC" -eq 0 ]; then pass; else fail "--no-showcase ne doit pas produire de faux DRIFT (rc=$RC)"; fi
fi

# --- Test E : --components=core -> barrel regenere, PAS de faux DRIFT ---
echo "Test E: sync.sh --components=core (ds-components.css regenere) -> pas de faux DRIFT (exit 0 attendu)..."
E="$(new_tmp)"
sync_into "$E" --components=core
if cmp -s "$E/ds-components.css" shared/css/components.css; then
  echo "  FAIL: --components=core a produit le barrel complet (fixture invalide)"; FAIL=$((FAIL+1))
else
  run_check "$E"
  if [ "$RC" -eq 0 ]; then pass; else fail "--components=core ne doit pas produire de faux DRIFT (rc=$RC)"; fi
fi

# --- Test F : ds-base.css absent -> MISSING ---
echo "Test F: ds-base.css absent (MISSING attendu)..."
F="$(new_tmp)"
sync_into "$F"
rm -f "$F/ds-base.css"
run_check "$F"
if [ "$RC" -eq 1 ] && grep -qE 'MISSING +ds-base\.css' <<< "$OUT"; then pass; else fail "ds-base.css absent doit sortir MISSING (rc=$RC)"; fi

# --- Test G : contenu ET en-tete differents -> DRIFT de version ---
echo "Test G: ds-themes.css a un en-tete ancien (DRIFT de version attendu)..."
G="$(new_tmp)"
sync_into "$G"
sed -i '2s#@ds-version: [0-9.]*#@ds-version: 2.67.0#' "$G/ds-themes.css"
run_check "$G"
if [ "$RC" -eq 1 ] && grep -qE 'DRIFT +ds-themes\.css .*local v2\.67\.0' <<< "$OUT"; then pass; else fail "en-tete ancien doit sortir DRIFT avec les deux versions (rc=$RC)"; fi

# --- Test H : limite ASSUMEE du regime "header" (documentee dans check-sync.sh) ---
# ds-layout.css / ds-components.css sont transformes par sync.sh : seule leur version est
# comparee. Ce test fige ce compromis pour qu'un changement de regime soit un choix visible.
echo "Test H: ds-layout.css modifie a en-tete egal -> regime header, non detecte (exit 0 attendu)..."
H="$(new_tmp)"
sync_into "$H"
printf '\n/* divergence locale */\n' >> "$H/ds-layout.css"
run_check "$H"
if [ "$RC" -eq 0 ]; then pass; else fail "ds-layout.css est en regime header : le contenu n'est pas compare (rc=$RC)"; fi

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
