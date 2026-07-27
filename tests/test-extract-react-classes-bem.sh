#!/usr/bin/env bash
# test-extract-react-classes-bem.sh — verifie bin/lib/extract-react-classes.js (#747)
#
# Contexte : extractReactClasses() ignorait silencieusement toute classe BEM en
# double underscore (`bloc__element`, `bloc__element--modificateur`) -- la
# classe de caracteres du token litteral n'acceptait pas `_`. Consequence : le
# filet anti-fantome de la parite React (#523) etait aveugle sur ces classes.
#
# Ce test appelle directement extractReactClasses() (module require()'e, zero
# effet de bord) et prouve :
#   Run A : une classe BEM avec tiret (`split-button__caret`) EST detectee.
#   Run B : une classe BEM SANS aucun tiret (`diff__line`) EST detectee --
#           cas le plus fragile, la seule condition de validite est le `__`.
#   Run C : les gardes existants restent actifs -- un token qui se termine par
#           `_` ou `-` (prefixe partiel avant un `${variant}`) N'est PAS retenu
#           tel quel, et un identifiant JS (contient un `.`) est ignore.
#   Run D : classe kebab classique (`btn-primary`, deja couverte avant #747)
#           -- non-regression.
#
# Note anti-regression : avant #747, la classe de caracteres etait
# `[a-z0-9-]` (sans `_`) -- en Run A ET B, le token entier echouait au test de
# regex et disparaissait du Set (aucune erreur, juste absent). Ce test aurait
# donc echoue sur l'ancienne implementation.

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

echo "Test A: classe BEM avec tiret (split-button__caret) detectee..."
run_case "split-button__caret detectee dans className littéral" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const set = extractReactClasses(`<button className="btn-primary split-button__caret">x</button>`);
console.log(set.has(".split-button__caret") ? "OK" : "MANQUANTE : " + JSON.stringify([...set]));
'

echo "Test B: classe BEM SANS aucun tiret (diff__line) detectee..."
run_case "diff__line detectee (aucun tiret, uniquement double underscore)" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const set = extractReactClasses(`<div className="diff__line">x</div>`);
console.log(set.has(".diff__line") ? "OK" : "MANQUANTE : " + JSON.stringify([...set]));
'

echo "Test B2: classe BEM avec modificateur (split-button__caret--active) detectee..."
run_case "split-button__caret--active detectee" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const set = extractReactClasses(`<button className="split-button__caret--active">x</button>`);
console.log(set.has(".split-button__caret--active") ? "OK" : "MANQUANTE : " + JSON.stringify([...set]));
'

echo "Test C: gardes existants toujours actifs (prefixe partiel, identifiant JS)..."
run_case "prefixe partiel avant \${variant} non retenu tel quel" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const set = extractReactClasses("<div className={`login-card--${variant}`}>x</div>", { variantExpansions: { "login-card--${variant}": ["internal-only"] } });
const bad = [...set].some(c => c === ".login-card--");
console.log(!bad && set.has(".login-card--internal-only") ? "OK" : "FAUX POSITIF/NEGATIF : " + JSON.stringify([...set]));
'
run_case "identifiant JS (contient un point) ignore" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const set = extractReactClasses(`className={props.foo_bar.baz}`);
console.log(set.size === 0 ? "OK" : "FAUX POSITIF : " + JSON.stringify([...set]));
'

echo "Test D: non-regression -- classe kebab classique (btn-primary)..."
run_case "btn-primary (deja couverte avant #747) toujours detectee" '
const { extractReactClasses } = require("./bin/lib/extract-react-classes.js");
const set = extractReactClasses(`<button className="btn-primary">x</button>`);
console.log(set.has(".btn-primary") ? "OK" : "MANQUANTE : " + JSON.stringify([...set]));
'

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
