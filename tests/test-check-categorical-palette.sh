#!/usr/bin/env bash
# test-check-categorical-palette.sh — verifie les codes de sortie de
# bin/check-categorical-palette.js (#800)
# Run A : le vrai shared/css du repo -> exit 0 attendu
# Run B : declaration manquante dans une couche (nhood-light) -> exit 2
# Run C : valeur non litterale (var()) -> exit 2
# Run D : deux teintes trop proches (C1 violee) -> exit 1
# Run E : contraste insuffisant vs surface (C3 violee) -> exit 1
# Run F : echelle inconnue (--scale=bogus) -> exit 2
#
# Les fixtures reprennent les 8 entrees de la palette de reference (deja
# verifiee verte, cf. spec #800 §4) pour ne pas confondre "completude KO"
# (nombre d'entrees insuffisant) et "contrat KO" (C1/C2/C3) — chaque test
# perturbe UNE seule dimension a la fois.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
TMPDIR_CP="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR_CP"; }
trap cleanup EXIT

check() {
  local desc="$1"
  local expected_exit="$2"
  shift 2
  if node bin/check-categorical-palette.js "$@" > /tmp/check-cat-palette-test-out.$$ 2>&1; then
    actual_exit=0
  else
    actual_exit=$?
  fi
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    echo "  PASS: $desc (exit $actual_exit attendu)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (exit $actual_exit obtenu, $expected_exit attendu)"
    cat /tmp/check-cat-palette-test-out.$$
    FAIL=$((FAIL + 1))
  fi
  rm -f /tmp/check-cat-palette-test-out.$$
}

FIXTURE_TOKENS_OK="$TMPDIR_CP/tokens-ok.css"
FIXTURE_THEMES_OK="$TMPDIR_CP/themes-ok.css"

# Palette de reference complete (8 entrees x 8 combos) — spec #800 §4 + #849.
write_fixture_ok() {
  cat > "$FIXTURE_TOKENS_OK" <<'EOF'
:root {
    --surface-solid: #1e293b;
    --cat-1: #2f7fff;
    --cat-2: #c599f8;
    --cat-3: #ff00aa;
    --cat-4: #ec3c00;
    --cat-5: #d7a447;
    --cat-6: #bdf600;
    --cat-7: #009d7a;
    --cat-8: #00dbfe;
}
[data-mode="light"] {
    --surface-solid: #ffffff;
    --cat-1: #056eff;
    --cat-2: #a200fe;
    --cat-3: #ff00aa;
    --cat-4: #ff4408;
    --cat-5: #704e00;
    --cat-6: #769c00;
    --cat-7: #007f62;
    --cat-8: #004e5c;
}
EOF
  cat > "$FIXTURE_THEMES_OK" <<'EOF'
[data-theme="acssi"] {
    --surface-solid: #00457a;
    --cat-1: #fee800;
    --cat-2: #00fe64;
    --cat-3: #8dfaf6;
    --cat-4: #74c1f1;
    --cat-5: #8b86ff;
    --cat-6: #fe61ff;
    --cat-7: #ffb8bf;
    --cat-8: #e17900;
}
[data-theme="acssi"][data-mode="light"] {
    --surface-solid: #ffffff;
    --cat-1: #0092fa;
    --cat-2: #8200fc;
    --cat-3: #f800c7;
    --cat-4: #ff002a;
    --cat-5: #c88000;
    --cat-6: #727c00;
    --cat-7: #166141;
    --cat-8: #008e9a;
}
[data-theme="nhood"] {
    --surface-solid: #0f2415;
    --cat-1: #00e05f;
    --cat-2: #00fdfb;
    --cat-3: #46b6f7;
    --cat-4: #7b6aff;
    --cat-5: #fe00fe;
    --cat-6: #ff9ea8;
    --cat-7: #ce7000;
    --cat-8: #f5e200;
}
[data-theme="nhood"][data-mode="light"] {
    --surface-solid: #ffffff;
    --cat-1: #004b1b;
    --cat-2: #2c7372;
    --cat-3: #0096d9;
    --cat-4: #6100ff;
    --cat-5: #ec00ea;
    --cat-6: #fc0059;
    --cat-7: #874800;
    --cat-8: #918600;
}
[data-theme="auchan"] {
    --surface-solid: #241416;
    --cat-1: #ee6d63;
    --cat-2: #b86614;
    --cat-3: #f1d17e;
    --cat-4: #23e7a7;
    --cat-5: #91e5f3;
    --cat-6: #1876dc;
    --cat-7: #9988f2;
    --cat-8: #ca16c7;
}
[data-theme="auchan"][data-mode="light"] {
    --surface-solid: #ffffff;
    --cat-1: #7e070d;
    --cat-2: #c2690a;
    --cat-3: #614b05;
    --cat-4: #078861;
    --cat-5: #054d57;
    --cat-6: #0a5fb8;
    --cat-7: #2c066b;
    --cat-8: #a509a3;
}
EOF
}

echo "Test A: le vrai shared/css/{tokens,themes}.css du repo (exit 0 attendu)..."
check "shared/css reel conforme" 0

echo "Test B: declaration --cat-8 manquante dans [data-theme=nhood][data-mode=light] (exit 2 attendu)..."
write_fixture_ok
sed -i '/\[data-theme="nhood"\]\[data-mode="light"\]/,/^}/{/--cat-8/d}' "$FIXTURE_THEMES_OK"
check "declaration manquante -> completude KO" 2 "--tokens=$FIXTURE_TOKENS_OK" "--themes=$FIXTURE_THEMES_OK"

echo "Test C: --cat-1 = var(--accent) au lieu d'un hex litteral (exit 2 attendu)..."
write_fixture_ok
sed -i '0,/--cat-1: #2f7fff;/s//--cat-1: var(--accent);/' "$FIXTURE_TOKENS_OK"
check "valeur non litterale -> forme KO" 2 "--tokens=$FIXTURE_TOKENS_OK" "--themes=$FIXTURE_THEMES_OK"

echo "Test D: --cat-2 rapproche de --cat-1 (msyx-dark) -> C1 violee (exit 1 attendu)..."
write_fixture_ok
sed -i '0,/--cat-2: #c599f8;/s//--cat-2: #2f80ff;/' "$FIXTURE_TOKENS_OK"
check "teintes trop proches -> C1 KO" 1 "--tokens=$FIXTURE_TOKENS_OK" "--themes=$FIXTURE_THEMES_OK"

echo "Test E: --cat-1 (msyx-dark) quasi identique a --surface-solid -> C3 violee (exit 1 attendu)..."
write_fixture_ok
sed -i '0,/--cat-1: #2f7fff;/s//--cat-1: #1e293c;/' "$FIXTURE_TOKENS_OK"
check "contraste insuffisant vs surface -> C3 KO" 1 "--tokens=$FIXTURE_TOKENS_OK" "--themes=$FIXTURE_THEMES_OK"

echo "Test F: echelle inconnue --scale=bogus (exit 2 attendu)..."
write_fixture_ok
check "echelle inconnue" 2 "--scale=bogus"

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
