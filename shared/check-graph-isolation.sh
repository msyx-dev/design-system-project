#!/usr/bin/env bash
# check-graph-isolation.sh — anti-barrel pour graph.css (#657, I1a)
# graph.css est opt-in : il ne doit JAMAIS etre importe par un barrel par defaut
# (components.css / components-core.css). Echoue si un @import mentionnant
# 'graph' apparait dans ces fichiers. Patron : check-hardcoded-tokens.sh.
set -uo pipefail

if grep -REn "@import[^;]*graph" shared/css/components.css shared/css/components-core.css; then
  echo "ERREUR: graph.css ne doit JAMAIS etre dans un barrel (opt-in uniquement)"
  exit 1
fi

echo "OK: graph.css absent des barrels par defaut"
exit 0
