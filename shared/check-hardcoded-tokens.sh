#!/usr/bin/env bash
# check-hardcoded-tokens.sh — detecte tokens hardcodes dans shared/css/components/
# Bloque le CI si findings actifs > 0 (commentaires + fallbacks var() exclus)
# Anti-regression #279 — v2.64.0
set -uo pipefail

SCOPE="${1:-shared/css/components}"
EXIT=0

echo "=== Check 1: font-family literals (Space Grotesk / Fira Code / Inter) ==="
# Exclut : lignes-commentaire pures (^\s*\*|^\s*/\*|^\s*//) et patterns var(--font-) avant le literal
FONT=$(grep -rEn "'(Space Grotesk|Fira Code|Inter)'" "$SCOPE" \
  | grep -vE '^\S+:[0-9]+:\s*/?\*' \
  | grep -vE '^\S+:[0-9]+:\s*//' \
  | grep -vE 'var\(--font-' \
  | wc -l)
if [ "$FONT" -gt 0 ]; then
  echo "ERREUR : $FONT font-family literal(s) detecte(s) — utiliser var(--font-display|--font-sans|--font-mono)"
  grep -rEn "'(Space Grotesk|Fira Code|Inter)'" "$SCOPE" \
    | grep -vE '^\S+:[0-9]+:\s*/?\*' \
    | grep -vE '^\S+:[0-9]+:\s*//' \
    | grep -vE 'var\(--font-'
  EXIT=1
else
  echo "OK : aucun font-family literal detecte"
fi

echo "=== Check 2: hex hardcodes (#xxx / #xxxxxx) hors fallback var() et hors commentaire ==="
# Whitelist : var(--token, #...) OU lignes-commentaire OU refs issues (#NNN)
# Exclut aussi les lignes de commentaire block (commencent par espaces+texte dans un /* */)
HEX=$(grep -rEn '#[0-9a-fA-F]{3,8}\b' "$SCOPE" \
  | grep -vE 'var\([^)]+,\s*#[0-9a-fA-F]{3,8}\)' \
  | grep -vE '^\S+:[0-9]+:\s*/?\*' \
  | grep -vE '^\S+:[0-9]+:\s*//' \
  | grep -vE '^\S+:[0-9]+:\s+[A-Za-z].*#[0-9]{1,4}\b' \
  | grep -vE '#[0-9]{1,4}[^0-9a-fA-F]' \
  | grep -vE '^\S+:[0-9]+:\s+(Probleme|Note|Solution|Warning|Info|TODO|FIXME|voir|Ref|ref|ratio|fond|couleur)\s' \
  | wc -l)
if [ "$HEX" -gt 0 ]; then
  echo "ERREUR : $HEX hex hardcode(s) detecte(s) — utiliser var(--token) ou ajouter dans tokens.css"
  grep -rEn '#[0-9a-fA-F]{3,8}\b' "$SCOPE" \
    | grep -vE 'var\([^)]+,\s*#[0-9a-fA-F]{3,8}\)' \
    | grep -vE '^\S+:[0-9]+:\s*/?\*' \
    | grep -vE '^\S+:[0-9]+:\s*//' \
    | grep -vE '^\S+:[0-9]+:\s+[A-Za-z].*#[0-9]{1,4}\b' \
    | grep -vE '#[0-9]{1,4}[^0-9a-fA-F]' \
    | grep -vE '^\S+:[0-9]+:\s+(Probleme|Note|Solution|Warning|Info|TODO|FIXME|voir|Ref|ref|ratio|fond|couleur)\s'
  EXIT=1
else
  echo "OK : aucun hex hardcode detecte"
fi

echo "=== Check 3: rgba/rgb numeriques (literals sans var(--xxx-rgb)) ==="
# Whitelist : rgba(var(--xxx-rgb), X) et lignes commentaires
RGBA=$(grep -rEn 'rgba?\(\s*[0-9]' "$SCOPE" \
  | grep -vE '^\S+:[0-9]+:\s*/?\*' \
  | grep -vE '^\S+:[0-9]+:\s*//' \
  | wc -l)
if [ "$RGBA" -gt 0 ]; then
  echo "ERREUR : $RGBA rgba/rgb literal(s) detecte(s) — utiliser rgba(var(--xxx-rgb), X) ou var(--overlay-*)"
  grep -rEn 'rgba?\(\s*[0-9]' "$SCOPE" \
    | grep -vE '^\S+:[0-9]+:\s*/?\*' \
    | grep -vE '^\S+:[0-9]+:\s*//'
  EXIT=1
else
  echo "OK : aucun rgba/rgb literal detecte"
fi

if [ "$EXIT" -eq 0 ]; then
  echo ""
  echo "OK : aucun token hardcode detecte dans $SCOPE/"
fi
exit $EXIT
