#!/usr/bin/env bash
# test-check-hardcoded-tokens.sh — tests du script check-hardcoded-tokens.sh
# Anti-regression #279 — v2.64.0
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

# Run A : shared/css/components/ propre (post-refactor #279) → exit 0
echo "Test A: shared/css/components/ propre (exit 0 attendu)..."
if bash shared/check-hardcoded-tokens.sh > /dev/null 2>&1; then
  echo "  PASS"
  PASS=$((PASS+1))
else
  echo "  FAIL: shared/css/components/ contient encore des tokens hardcodes"
  bash shared/check-hardcoded-tokens.sh || true
  FAIL=$((FAIL+1))
fi

# Run B : fixture sale contient bien les patterns interdits
echo "Test B: fixture bad-hardcoded-tokens.css contient les patterns interdits..."
FIXTURE="tests/fixtures/bad-hardcoded-tokens.css"
FONT_OK=0
HEX_OK=0

if grep -qE "'Space Grotesk'" "$FIXTURE"; then
  FONT_OK=1
fi
if grep -qE '#[0-9a-fA-F]{6}' "$FIXTURE"; then
  HEX_OK=1
fi

if [ "$FONT_OK" -eq 1 ] && [ "$HEX_OK" -eq 1 ]; then
  echo "  PASS (fixture contient font literal + hex actif)"
  PASS=$((PASS+1))
else
  echo "  FAIL: fixture doit contenir au moins 1 font literal + 1 hex actif"
  FAIL=$((FAIL+1))
fi

# Run C : script detecte bien la fixture sale (exit 1 attendu)
echo "Test C: check-hardcoded-tokens.sh detecte la fixture sale (exit 1 attendu)..."
if bash shared/check-hardcoded-tokens.sh tests/fixtures > /dev/null 2>&1; then
  echo "  FAIL: le script aurait du retourner exit 1 sur la fixture sale"
  FAIL=$((FAIL+1))
else
  echo "  PASS (exit 1 detecte comme attendu)"
  PASS=$((PASS+1))
fi

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
