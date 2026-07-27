#!/usr/bin/env bash
# test-validate-example.sh — verifie bin/lib/validate-example.js (#748)
#
# Contexte : le champ `example` de shared/components-registry.json n'etait
# valide par rien. 2 composants audites (#613 segmented-control, #468
# context-menu) avaient un attribut data-* fantome (jamais lu par le JS du
# DS). Ce test prouve les 2 regles retenues :
#   Run A : hasMainClassCitation() -- l'example doit citer au moins une
#           classe du composant (sauf si l'example ne cite AUCUNE classe --
#           cas legitime des composants 100% pilotes par JS, ex. toast).
#   Run B : findPhantomDataAttrs() -- un data-* cite dans l'example et
#           absent du JS (ni litteral, ni dataset.xCamel) est signale ; un
#           data-* reellement lu (litteral OU dataset.xCamel) ne l'est pas.
#   Run C : reproduction du cas reel #468 (context-menu) -- data-context-menu
#           fantome, confirmee par une fixture JS isolee qui n'y fait AUCUNE
#           reference (le vrai shared/components.js n'a jamais lu
#           data-context-menu non plus -- son vrai selecteur d'accroche est
#           .context-target, cf. #789 qui a corrige la mention perimee
#           .context-menu-trigger portee par ce meme commentaire jusque-la).

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

echo "Test A: hasMainClassCitation() -- classe principale absente detectee..."
run_case "aucune classe du composant citee -> defaut detecte (false)" '
const { hasMainClassCitation } = require("./bin/lib/validate-example.js");
const compClasses = new Set([".zone-banner", ".zone-loss"]);
const citedClasses = new Set([".alert", ".alert--kpi", ".alert-title"]);
const ok = hasMainClassCitation(compClasses, citedClasses) === false;
console.log(ok ? "OK" : "ECHEC");
'
run_case "au moins une classe du composant citee -> pas de defaut (true)" '
const { hasMainClassCitation } = require("./bin/lib/validate-example.js");
const compClasses = new Set([".card", ".card-icon"]);
const citedClasses = new Set([".card", ".card-icon", ".label"]);
console.log(hasMainClassCitation(compClasses, citedClasses) === true ? "OK" : "ECHEC");
'
run_case "example sans AUCUNE classe citee (ex. toast, 100% JS) -> exempte (true)" '
const { hasMainClassCitation } = require("./bin/lib/validate-example.js");
const compClasses = new Set([".toast", ".toast-message"]);
const citedClasses = new Set(); // <script>showToast(...)</script>, aucun markup statique
console.log(hasMainClassCitation(compClasses, citedClasses) === true ? "OK" : "ECHEC");
'

echo "Test B: findPhantomDataAttrs() -- attribut data-* fantome vs reellement lu..."
run_case "data-* jamais lu (ni litteral ni dataset.xCamel) -> signale" '
const { findPhantomDataAttrs } = require("./bin/lib/validate-example.js");
const cited = new Set(["data-rating"]);
const jsBlob = "widget.dataset.value; document.querySelectorAll(\".rating\");";
const phantoms = findPhantomDataAttrs(cited, jsBlob);
console.log(phantoms.length === 1 && phantoms[0] === "data-rating" ? "OK" : "ECHEC : " + JSON.stringify(phantoms));
'
run_case "data-* lu via dataset.xCamel -> non signale" '
const { findPhantomDataAttrs } = require("./bin/lib/validate-example.js");
const cited = new Set(["data-mention-source"]);
const jsBlob = "var raw = textarea.dataset.mentionSource || \"\";";
const phantoms = findPhantomDataAttrs(cited, jsBlob);
console.log(phantoms.length === 0 ? "OK" : "ECHEC : " + JSON.stringify(phantoms));
'
run_case "data-* lu via chaine litterale (querySelectorAll) -> non signale" '
const { findPhantomDataAttrs } = require("./bin/lib/validate-example.js");
const cited = new Set(["data-mention-source"]);
const jsBlob = "document.querySelectorAll(\"[data-mention-source]\").forEach(fn);";
const phantoms = findPhantomDataAttrs(cited, jsBlob);
console.log(phantoms.length === 0 ? "OK" : "ECHEC : " + JSON.stringify(phantoms));
'

echo "Test C: reproduction du cas reel #468 (context-menu, data-context-menu fantome)..."
run_case "data-context-menu absent d une fixture JS qui ne le lit jamais -> signale" '
const { extractDataAttrsFromHtml, findPhantomDataAttrs } = require("./bin/lib/validate-example.js");
const example = "<div data-context-menu=\"ctx-exemple\">Clic droit</div>";
const jsFixture = "document.querySelectorAll(\".context-target\").forEach(function(el){});";
const cited = extractDataAttrsFromHtml(example);
const phantoms = findPhantomDataAttrs(cited, jsFixture);
console.log(phantoms.length === 1 && phantoms[0] === "data-context-menu" ? "OK" : "ECHEC : " + JSON.stringify(phantoms));
'

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
