#!/usr/bin/env bash
# test-check-diacritics.sh — verifie que check-diacritics.sh fonctionne
# Run A : scope normal (repo nettoye) -> exit 0 attendu
# Run B : grep direct sur fixture -> doit contenir au moins un pattern
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

# Run A : le repo entier (hors fixture) doit passer le linter
echo "Test A: scan repo (doit passer)..."
if ! ./shared/check-diacritics.sh > /dev/null 2>&1; then
  echo "  FAIL: le repo nettoye doit passer le linter (exit 0 attendu)."
  FAIL=$((FAIL + 1))
else
  echo "  OK"
  PASS=$((PASS + 1))
fi

# Run B : le fixture doit contenir au moins un pattern sans diacritique
echo "Test B: fixture contient les patterns (doit detecter)..."
PATTERNS='\bcoherente\b|\bthemes [a-z]|\bdeploye\b|\blivre\b|\brequete\b|\bparametre\b|\bdonnee\b|\bidentifie\b|\bcharge\b|\brecupere\b|\bentree\b'
if ! grep -qE "$PATTERNS" tests/fixtures/bad-diacritics.html; then
  echo "  FAIL: le fixture doit contenir au moins un pattern sans diacritique."
  FAIL=$((FAIL + 1))
else
  echo "  OK (fixture contient bien des patterns sans diacritique)"
  PASS=$((PASS + 1))
fi

echo ""
echo "Resultats : $PASS OK, $FAIL FAIL."
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK."
exit 0
