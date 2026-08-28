#!/usr/bin/env bash
# test-extract-react-classes-varname.sh — verifie bin/lib/extract-react-classes.js (#889)
#
# Contexte : extractReactClasses() ne reconnaissait que 3 formes (litteral,
# template, tableau inline dans className={[...]}) -- aveugle au motif
# dominant du package (~40 composants, dont Timeline/Rail/ActionMenu/
# DataGrid/SortableList) :
#
#   const itemClasses = [base, isActive && "actif"].filter(Boolean).join(" ");
#   return <div className={itemClasses} />;
#
# Ces composants passaient le garde-fou anti-fantome au vert SANS AUCUNE
# verification (Set retourne vide ou incomplet, aucune erreur).
#
# Ce test appelle directement extractReactClasses() (module require()'e,
# zero effet de bord) et prouve :
#   Run A : classe emise via variable intermediaire (tableau + .join) EST
#           detectee.
#   Run B : forme multi-lignes (comme DataGrid thClasses) EST detectee.
#   Run C : anti faux-positif -- un tableau + .join NON consomme par un
#           className={ident} (nom different) N'est PAS scanne.
#   Run D : non-regression -- les 3 formes historiques (#747) restent actives
#           en presence du nouveau motif dans le meme fichier.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

run_case() {
  local desc="$1"
  local script="$2"
  local out
  out="$(node -e "$script" 2>&1)"
  if [ "$out" = "OK" ]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc"
    echo "    $out"
    FAIL=$((FAIL + 1))
  fi
}

echo "Test A: variable intermediaire (tableau + .filter().join()) detectee..."
run_case "itemClasses (base + variant conditionnel) detectee via className={itemClasses}" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const tsx = `
function C({ isActive, className }) {
  const itemClasses = ["timeline-item", isActive ? "timeline-item--active" : null, className]
    .filter(Boolean)
    .join(" ");
  return <li className={itemClasses}>x</li>;
}
`;
const set = extractReactClasses(tsx);
const ok = set.has(".timeline-item") && set.has(".timeline-item--active");
console.log(ok ? "OK" : "MANQUANTE : " + JSON.stringify([...set]));
'

echo "Test B: forme multi-lignes (declaration sur plusieurs lignes, calque DataGrid thClasses)..."
run_case "thClasses multi-lignes detectee" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const tsx = `
function C({ column }) {
  const thClasses =
    [
      column.sortable ? "data-grid-sortable" : null,
      column.stickyEnd ? "data-grid-col-sticky-end" : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return <th className={thClasses}>x</th>;
}
`;
const set = extractReactClasses(tsx);
const ok = set.has(".data-grid-sortable") && set.has(".data-grid-col-sticky-end");
console.log(ok ? "OK" : "MANQUANTE : " + JSON.stringify([...set]));
'

echo "Test C: anti faux-positif -- tableau non consomme par un className={ident} ignore..."
run_case "tableau assigne a une variable jamais utilisee en className n'est pas scanne" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const tsx = `
function C() {
  const queryParams = ["sort-desc", "filter-active"].filter(Boolean).join("&");
  return fetch("/api?" + queryParams);
}
`;
const set = extractReactClasses(tsx);
console.log(set.size === 0 ? "OK" : "FAUX POSITIF : " + JSON.stringify([...set]));
'

echo "Test D: non-regression -- formes historiques (#747) actives aux cotes du nouveau motif..."
run_case "className littéral + variable intermédiaire dans le même fichier, les deux détectées" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const tsx = `
function C({ className }) {
  const wrapClasses = ["action-menu-wrap", className].filter(Boolean).join(" ");
  return (
    <div className={wrapClasses}>
      <button className="action-menu-trigger">x</button>
    </div>
  );
}
`;
const set = extractReactClasses(tsx);
const ok = set.has(".action-menu-wrap") && set.has(".action-menu-trigger");
console.log(ok ? "OK" : "MANQUANTE : " + JSON.stringify([...set]));
'

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
