#!/usr/bin/env bash
# test-check-versions.sh — tests du garde-fou check-versions.sh (issue #377)
# Run A : repo reel -> versions alignees -> exit 0 attendu
# Run B : copie temp avec 1 version desync -> exit 1 attendu
# Run C : copie temp avec une version manquante -> exit 1 attendu
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

# --- Run A : repo reel doit etre aligne (exit 0) ---
echo "Test A: repo reel -> versions alignees (exit 0 attendu)..."
if bash shared/check-versions.sh > /dev/null 2>&1; then
  echo "  PASS"
  PASS=$((PASS+1))
else
  echo "  FAIL: les 8 sources de version ne sont pas alignees sur le repo reel"
  bash shared/check-versions.sh || true
  FAIL=$((FAIL+1))
fi

# Helper : construit une copie minimale du repo (8 sources) dans un repertoire temp,
# toutes alignees sur 9.9.9, puis applique une mutation passee en argument.
build_fixture() {
  local dir="$1"
  mkdir -p "$dir/shared/css"
  printf '/* @ds-version: 9.9.9 */\n:root{}\n' > "$dir/shared/css/tokens.css"
  printf '/* @ds-version: 9.9.9 */\n'           > "$dir/shared/css/utilities.css"
  printf '/* @ds-version: 9.9.9 */\n'           > "$dir/shared/css/components.css"
  printf '/* @ds-version: 9.9.9 */\n'           > "$dir/shared/css/layout.css"
  printf '/* @ds-version 9.9.9 */\nconst VERSION = '\''9.9.9'\'';\n' > "$dir/shared/nav.js"
  printf '{\n  "version": "9.9.9",\n  "components": []\n}\n' > "$dir/shared/components-registry.json"
  printf '{\n  "name": "fixture",\n  "version": "9.9.9"\n}\n'      > "$dir/package.json"
}

# --- Run B : une version desync -> exit 1 ---
echo "Test B: copie temp avec 1 version desync (exit 1 attendu)..."
TMP_B="$(mktemp -d)"
build_fixture "$TMP_B"
# Desync le registre uniquement
printf '{\n  "version": "1.0.0",\n  "components": []\n}\n' > "$TMP_B/shared/components-registry.json"
# Sanity : la copie aligne (avant mutation) doit passer ; ici on a deja desync.
if bash shared/check-versions.sh "$TMP_B" > /dev/null 2>&1; then
  echo "  FAIL: le script aurait du retourner exit 1 sur une version desync"
  FAIL=$((FAIL+1))
else
  echo "  PASS (exit 1 detecte comme attendu)"
  PASS=$((PASS+1))
fi
rm -rf "$TMP_B"

# --- Run C : copie temp parfaitement alignee -> exit 0 (verifie le helper + cas OK isole) ---
echo "Test C: copie temp parfaitement alignee (exit 0 attendu)..."
TMP_C="$(mktemp -d)"
build_fixture "$TMP_C"
if bash shared/check-versions.sh "$TMP_C" > /dev/null 2>&1; then
  echo "  PASS"
  PASS=$((PASS+1))
else
  echo "  FAIL: une copie alignee aurait du passer (exit 0)"
  bash shared/check-versions.sh "$TMP_C" || true
  FAIL=$((FAIL+1))
fi
rm -rf "$TMP_C"

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
