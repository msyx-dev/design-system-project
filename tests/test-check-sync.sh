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
# --- logos de marque (#954, T3) ---
# Test I : apres sync.sh, 4 lignes OK assets/logo-msyx*.svg, aucune ligne acssi    -> exit 0
# Test J : logo-msyx.svg modifie -> DRIFT ; logo-msyx-dark.svg supprime -> MISSING -> exit 1
# Test K : sync --assets=acssi puis logo-acssi-light.svg modifie -> DRIFT sur ce fichier -> exit 1
# Test L : fichier local etranger (assets/logo-monapp.svg) -> aucune ligne, exit 0
# Test M : consommateur sans assets/ (synchro anterieure a #954) -> 4 MISSING msyx -> exit 1
#
# Les fixtures sont produites par le vrai sync.sh (pas de copie a la main) : si sync.sh
# change ce qu'il transforme, ce test le voit.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Variable CHECK_SH (optionnelle) : chemin d'un autre check-sync.sh (dans un shared/ dont le
# parent contient assets/), pour le rejouer MUTE et prouver que ce test echoue.
CHECK_SH="${CHECK_SH:-shared/check-sync.sh}"

PASS=0
FAIL=0
# Un seul dossier racine, nettoyé en sortie : new_tmp est appelé dans des $(…), donc dans
# un sous-shell — une liste de dossiers tenue par le parent n'y serait jamais complétée.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

new_tmp() { mktemp -d "$WORK/cas.XXXXXX"; }

# run_check <dir> : lance check-sync.sh, stocke la sortie dans $OUT et le code dans $RC.
# Les assertions utilisent `grep -q ... <<< "$OUT"`, jamais `echo "$OUT" | grep -q` : sous
# pipefail, grep -q quitte au 1er match, echo prend SIGPIPE et le pipeline vaut 141 (test flaky).
run_check() {
  OUT="$(bash "$CHECK_SH" "$1" 2>&1)"
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

# --- Test I : logos MSYX a jour -> 4 OK, aucune ligne acssi ---
echo "Test I: apres sync.sh, 4 lignes OK assets/logo-msyx*.svg et aucune ligne acssi (exit 0 attendu)..."
run_check "$A"
NOK="$(grep -cE '^ +OK +assets/logo-msyx(-mark|-dark|-light)?\.svg ' <<< "$OUT" || true)"
if [ "$RC" -eq 0 ] && [ "$NOK" = "4" ] && ! grep -q 'logo-acssi' <<< "$OUT"; then pass; else fail "attendu 4 OK logo-msyx et 0 acssi, obtenu $NOK OK (rc=$RC)"; fi

# --- Test J : logo modifie -> DRIFT, logo supprime -> MISSING ---
echo "Test J: logo-msyx.svg modifie (DRIFT) et logo-msyx-dark.svg supprime (MISSING) -> exit 1..."
J="$(new_tmp)"
sync_into "$J"
printf '\n<!-- divergence locale -->\n' >> "$J/assets/logo-msyx.svg"
rm -f "$J/assets/logo-msyx-dark.svg"
run_check "$J"
if [ "$RC" -eq 1 ] && grep -qE '^ +DRIFT +assets/logo-msyx\.svg ' <<< "$OUT" \
   && grep -qE '^ +MISSING +assets/logo-msyx-dark\.svg ' <<< "$OUT" \
   && grep -qE '^ +OK +assets/logo-msyx-mark\.svg ' <<< "$OUT"; then pass; else fail "DRIFT sur logo-msyx.svg + MISSING sur logo-msyx-dark.svg + OK sur mark attendus (rc=$RC)"; fi

# --- Test K : charte cliente opt-in verifiee, a son tour ---
echo "Test K: sync --assets=acssi puis logo-acssi-light.svg modifie -> DRIFT sur ce fichier (exit 1)..."
K="$(new_tmp)"
sync_into "$K" --assets=acssi
run_check "$K"
KOK="$(grep -cE '^ +OK +assets/logo-acssi(-mark|-dark|-light)?\.svg ' <<< "$OUT" || true)"
if [ "$RC" -ne 0 ] || [ "$KOK" != "4" ]; then
  fail "apres --assets=acssi, 4 OK logo-acssi et exit 0 attendus (obtenu $KOK OK, rc=$RC)"
else
  printf '\n<!-- divergence locale -->\n' >> "$K/assets/logo-acssi-light.svg"
  run_check "$K"
  if [ "$RC" -eq 1 ] && grep -qE '^ +DRIFT +assets/logo-acssi-light\.svg ' <<< "$OUT" \
     && ! grep -qE '^ +DRIFT +assets/logo-(msyx|acssi-(dark|mark))' <<< "$OUT"; then pass; else fail "DRIFT sur logo-acssi-light.svg seul attendu (rc=$RC)"; fi
fi

# --- Test L : fichier local etranger ignore ---
echo "Test L: assets/logo-monapp.svg (sans equivalent source) -> aucune ligne, exit 0..."
L="$(new_tmp)"
sync_into "$L"
echo '<svg id="monapp"/>' > "$L/assets/logo-monapp.svg"
echo '<svg id="monapp-dark"/>' > "$L/assets/logo-monapp-dark.svg"
run_check "$L"
if [ "$RC" -eq 0 ] && ! grep -q 'monapp' <<< "$OUT"; then pass; else fail "un logo propre a l'app ne doit produire ni ligne ni exit 1 (rc=$RC)"; fi

# --- Test M : consommateur synchronise avant #954 (aucun assets/) ---
echo "Test M: consommateur sans assets/ -> 4 MISSING logo-msyx, exit 1, rien d'acssi..."
M="$(new_tmp)"
sync_into "$M"
rm -rf "$M/assets"
run_check "$M"
NMISS="$(grep -cE '^ +MISSING +assets/logo-msyx(-mark|-dark|-light)?\.svg ' <<< "$OUT" || true)"
if [ "$RC" -eq 1 ] && [ "$NMISS" = "4" ] && ! grep -q 'acssi' <<< "$OUT"; then pass; else fail "attendu 4 MISSING logo-msyx et exit 1 (obtenu $NMISS, rc=$RC)"; fi

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
