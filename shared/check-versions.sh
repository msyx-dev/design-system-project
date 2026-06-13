#!/usr/bin/env bash
# check-versions.sh — garde-fou de coherence des versions DS (issue #377)
# Verifie que TOUTES les sources de version sont identiques :
#   - @ds-version dans shared/css/{tokens,utilities,components,layout}.css
#   - @ds-version dans shared/nav.js
#   - const VERSION dans shared/nav.js
#   - "version" (top-level) dans shared/components-registry.json
#   - "version" (top-level) dans package.json
# Si une seule diverge -> affiche le detail et exit 1, sinon exit 0.
#
# Usage : check-versions.sh [ROOT]
#   ROOT (optionnel) = racine du repo a verifier (defaut : racine deduite du script).
#   Permet aux tests de pointer sur un repertoire temporaire.
set -uo pipefail

# Racine : argument explicite, sinon parent de shared/
ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

EXIT=0
declare -a LABELS=()
declare -a VERSIONS=()

# Extrait le premier "X.Y.Z" d'une chaine. Vide si rien trouve.
extract_semver() {
  printf '%s' "$1" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1
}

record() {
  local label="$1" value="$2"
  LABELS+=("$label")
  VERSIONS+=("$value")
}

# --- @ds-version dans les 4 fichiers CSS (format "@ds-version: X.Y.Z") ---
for f in tokens utilities components layout; do
  path="$ROOT/shared/css/$f.css"
  if [ -f "$path" ]; then
    line=$(grep -m1 '@ds-version' "$path" || true)
    record "shared/css/$f.css (@ds-version)" "$(extract_semver "$line")"
  else
    record "shared/css/$f.css (@ds-version)" "MANQUANT"
    EXIT=1
  fi
done

# --- nav.js : @ds-version (commentaire, format "@ds-version X.Y.Z" sans colon) ---
NAVJS="$ROOT/shared/nav.js"
if [ -f "$NAVJS" ]; then
  ds_line=$(grep -m1 '@ds-version' "$NAVJS" || true)
  record "shared/nav.js (@ds-version)" "$(extract_semver "$ds_line")"
  # --- nav.js : const VERSION = 'X.Y.Z' ---
  const_line=$(grep -m1 -E "const[[:space:]]+VERSION[[:space:]]*=" "$NAVJS" || true)
  record "shared/nav.js (const VERSION)" "$(extract_semver "$const_line")"
else
  record "shared/nav.js (@ds-version)" "MANQUANT"
  record "shared/nav.js (const VERSION)" "MANQUANT"
  EXIT=1
fi

# --- components-registry.json : "version" top-level (1re occurrence) ---
REGISTRY="$ROOT/shared/components-registry.json"
if [ -f "$REGISTRY" ]; then
  reg_line=$(grep -m1 -E '"version"[[:space:]]*:' "$REGISTRY" || true)
  record "shared/components-registry.json (version)" "$(extract_semver "$reg_line")"
else
  record "shared/components-registry.json (version)" "MANQUANT"
  EXIT=1
fi

# --- package.json : "version" top-level (1re occurrence) ---
PKG="$ROOT/package.json"
if [ -f "$PKG" ]; then
  pkg_line=$(grep -m1 -E '"version"[[:space:]]*:' "$PKG" || true)
  record "package.json (version)" "$(extract_semver "$pkg_line")"
else
  record "package.json (version)" "MANQUANT"
  EXIT=1
fi

# --- Comparaison : toutes les versions doivent etre identiques et non vides ---
REF="${VERSIONS[0]}"
MISMATCH=0
for v in "${VERSIONS[@]}"; do
  if [ -z "$v" ] || [ "$v" != "$REF" ]; then
    MISMATCH=1
  fi
done

if [ "$MISMATCH" -eq 1 ] || [ "$EXIT" -ne 0 ]; then
  echo "ERREUR : versions DS desynchronisees (issue #377) — toutes doivent etre identiques."
  echo ""
  for i in "${!LABELS[@]}"; do
    v="${VERSIONS[$i]}"
    [ -z "$v" ] && v="(introuvable)"
    printf '  %-48s %s\n' "${LABELS[$i]}" "$v"
  done
  echo ""
  echo "Aligner les 8 sources sur une seule version (bump synchrone, cf. CLAUDE.md)."
  exit 1
fi

echo "OK : 8 sources de version alignees sur $REF"
exit 0
