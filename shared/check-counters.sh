#!/usr/bin/env bash
# check-counters.sh — Verifie la coherence du compteur de composants (issue #707).
#
# Source de verite (tranchee #707) :
#   Nombre de composants = entrees de shared/components-registry.json dont
#   "kind" === "component" (les kind:module/pattern/layout/utility ne sont PAS
#   des composants UI et ne comptent pas).
#
# Compare cette valeur aux 3 emplacements qui doivent la refleter :
#   - site.html hero-stat            (<div class="number">N</div> ... Composants)
#   - site.html meta description     ("N composants, ...")
#   - site.html footer               ("N composants")
#   - docs/ARCHITECTURE.md en-tete   ("**N composants UI**")
#
# Perimetre volontairement restreint au compteur de composants (titre de
# l'issue #707) — ne verifie PAS les sections/page des hub-cards ni la
# version affichee dans le footer de site.html (dette distincte, hors
# perimetre de cette issue).
#
# Sortie : liste les ecarts. Exit 0 si tout est coherent, 1 sinon.
# Usage  : bash shared/check-counters.sh   (depuis la racine du repo)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="$ROOT/shared/components-registry.json"
SITE="$ROOT/site.html"
ARCHITECTURE="$ROOT/docs/ARCHITECTURE.md"

fail=0
report() { echo "  MISMATCH: $1"; fail=1; }

# --- Source de verite : compte des composants (kind === "component") ---
component_count=$(node -e '
  const r = require(process.argv[1]);
  const list = Array.isArray(r) ? r : r.components;
  const n = list.filter(c => c && c.kind === "component").length;
  process.stdout.write(String(n));
' "$REGISTRY")

echo "Source de verite (registre, kind:component) : $component_count composants"
echo

# --- site.html : hero-stat ---
hero=$(grep -oE '<div class="number">[0-9]+</div><div class="label">Composants</div>' "$SITE" | grep -oE '[0-9]+' | head -1)
[ "$hero" = "$component_count" ] || report "site.html hero-stat = ${hero:-absent} (attendu $component_count)"

# --- site.html : meta description ---
meta=$(grep -oE '<meta name="description" content="[^"]*[0-9]+ composants' "$SITE" | grep -oE '[0-9]+ composants' | grep -oE '[0-9]+' | head -1)
[ "$meta" = "$component_count" ] || report "site.html meta description = ${meta:-absent} (attendu $component_count)"

# --- site.html : footer ---
footer=$(grep -E '<footer>' "$SITE" || true)
footer_n=$(echo "$footer" | grep -oE '[0-9]+ composants' | grep -oE '[0-9]+' | head -1)
[ "$footer_n" = "$component_count" ] || report "site.html footer = ${footer_n:-absent} (attendu $component_count)"

# --- docs/ARCHITECTURE.md : en-tete ---
arch=$(grep -oE '\*\*[0-9]+ composants UI\*\*' "$ARCHITECTURE" | grep -oE '[0-9]+' | head -1)
[ "$arch" = "$component_count" ] || report "docs/ARCHITECTURE.md en-tete = ${arch:-absent} (attendu $component_count)"

if [ "$fail" -eq 0 ]; then
  echo "OK -- compteur composants coherent (registre <-> site.html <-> ARCHITECTURE.md)."
else
  echo
  echo "Compteurs incoherents (voir ci-dessus). Lancer : node bin/generate-counters.js"
fi
exit "$fail"
