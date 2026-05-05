#!/usr/bin/env bash
# check-diacritics.sh — Lint des mots francais sans diacritiques (user-facing)
# Exit 1 si pattern detecte, 0 sinon.
# Scope : index.html, site.html, pages/*.html, RELEASES.md
# Exclusions : shared/**, docs/**, .github/**, tests/fixtures/**, *.md sauf RELEASES.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERNS='\bcoherente\b|\bthemes [a-z]|\bdeploye\b|\blivre\b|\brequete\b|\bparametre\b|\bdonnee\b|\bidentifie\b|\bcharge\b|\brecupere\b|\bentree\b'

# Files to scan (whitelist explicite)
FILES=(
  index.html
  site.html
  RELEASES.md
)
# Add pages/*.html if present
for f in pages/*.html; do
  [ -f "$f" ] && FILES+=("$f")
done

FOUND=0
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  if grep -nE "$PATTERNS" "$f"; then
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "ERREUR: mots francais sans diacritiques detectes (user-facing)."
  echo "Voir liste ci-dessus. Corriger en ajoutant les accents appropries."
  exit 1
fi

echo "OK: aucune occurrence de pattern non-accentue dans le contenu user-facing."
exit 0
