#!/usr/bin/env bash
# check-counters.sh — Verifie la coherence des compteurs de site.html (issue #380).
#
# Source de verite :
#   - Nombre de composants    = entrees de shared/components-registry.json avec "page" non nul
#   - Nombre de sections/page = nombre de <section id="..."> dans pages/<page>.html
#   - Version                 = const VERSION de shared/nav.js (== @ds-version)
#
# Verifie : hero "Composants", meta description, footer (version + composants + pages),
#           et chaque hub-card-count vs le nombre reel de sections de la page ciblee.
#
# Sortie : liste les ecarts. Exit 0 si tout est coherent, 1 sinon.
# Usage  : bash shared/check-counters.sh   (depuis la racine du repo)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="$ROOT/shared/components-registry.json"
SITE="$ROOT/site.html"
NAVJS="$ROOT/shared/nav.js"
PAGES_DIR="$ROOT/pages"

fail=0
report() { echo "  MISMATCH: $1"; fail=1; }

# --- Source de verite : compte des composants (page non nul) ---
component_count=$(node -e '
  const r = require(process.argv[1]);
  const n = r.components.filter(c => c.page !== undefined && c.page !== null).length;
  process.stdout.write(String(n));
' "$REGISTRY")

# --- Version reelle ---
version=$(grep -oE "const VERSION = '[^']+'" "$NAVJS" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")

# --- Nombre de pages = nombre de hub-cards dans site.html ---
page_count=$(grep -cE 'class="hub-card"' "$SITE")

echo "Source de verite : $component_count composants - $page_count pages - v$version"
echo

# --- Hero "Composants" ---
hero=$(grep -oE '<div class="number">[0-9]+</div><div class="label">Composants</div>' "$SITE" | grep -oE '[0-9]+' | head -1)
[ "$hero" = "$component_count" ] || report "hero Composants = $hero (attendu $component_count)"

# --- Meta description ---
grep -qE "content=\"[^\"]*$component_count composants" "$SITE" || report "meta description : '$component_count composants' absent"

# --- Footer : version + composants + pages ---
footer=$(grep -E '<footer>' "$SITE" || true)
echo "$footer" | grep -qE "v$version" || report "footer : version v$version absente"
echo "$footer" | grep -qE "$component_count composants" || report "footer : '$component_count composants' absent"
echo "$footer" | grep -qE "$page_count pages" || report "footer : '$page_count pages' absent"

# --- Hub-card counts vs sections reelles ---
mapfile -t hrefs < <(grep -oE '/pages/[a-z-]+\.html" class="hub-card"' "$SITE" | grep -oE 'pages/[a-z-]+\.html' | sed 's#pages/##;s#\.html##')
mapfile -t counts < <(grep -oE '<span class="hub-card-count">[0-9]+ sections</span>' "$SITE" | grep -oE '[0-9]+')

if [ "${#hrefs[@]}" -ne "${#counts[@]}" ]; then
  report "hub-cards: ${#hrefs[@]} liens mais ${#counts[@]} compteurs"
else
  for i in "${!hrefs[@]}"; do
    slug="${hrefs[$i]}"
    declared="${counts[$i]}"
    real=$(grep -cE '<section[^>]*\bid="[^"]+"' "$PAGES_DIR/$slug.html")
    [ "$declared" = "$real" ] || report "hub-card $slug = $declared sections (reel $real)"
  done
fi

if [ "$fail" -eq 0 ]; then
  echo "OK -- compteurs coherents."
else
  echo
  echo "Compteurs incoherents (voir ci-dessus)."
fi
exit "$fail"
