#!/usr/bin/env bash
# check-hardcoded-tokens.sh — detecte tokens hardcodes dans le CSS du DS
# Perimetre par defaut (v2.66.x, #379) : shared/css/components/ + utilities.css + layout.css
# Bloque le CI si findings actifs > 0 (commentaires + fallbacks var() + allow-hardcoded exclus)
# Anti-regression #279 — v2.64.0
#
# Allowlist : suffixe une ligne d'un commentaire « allow-hardcoded: <raison> » pour
# exclure une valeur legitimement non-tokenisable (ex : slate-08 sans token noir dedie).
set -uo pipefail

# Scope par defaut = modules components/ + 2 fichiers shell de layout/utilities (#379).
# Override possible : passer un chemin explicite en $1.
if [ $# -ge 1 ]; then
  SCOPE=("$@")
else
  SCOPE=(shared/css/components shared/css/utilities.css shared/css/layout.css)
fi
EXIT=0

# Filtre commun : retire commentaires de ligne et lignes taguees allow-hardcoded.
strip_excluded() {
  grep -vE '^\S+:[0-9]+:\s*/?\*' \
    | grep -vE '^\S+:[0-9]+:\s*//' \
    | grep -vE 'allow-hardcoded'
}

echo "=== Check 1: font-family literals (Space Grotesk / Fira Code / Inter) ==="
FONT=$(grep -rEn "'(Space Grotesk|Fira Code|Inter)'" "${SCOPE[@]}" \
  | strip_excluded \
  | grep -vE 'var\(--font-' \
  | wc -l)
if [ "$FONT" -gt 0 ]; then
  echo "ERREUR : $FONT font-family literal(s) detecte(s) — utiliser var(--font-display|--font-sans|--font-mono)"
  grep -rEn "'(Space Grotesk|Fira Code|Inter)'" "${SCOPE[@]}" \
    | strip_excluded \
    | grep -vE 'var\(--font-'
  EXIT=1
else
  echo "OK : aucun font-family literal detecte"
fi

echo "=== Check 2: hex hardcodes (#xxx / #xxxxxx) hors fallback var() et hors commentaire ==="
# Whitelist : var(--token, #...) OU lignes-commentaire OU refs issues (#NNN)
HEX=$(grep -rEn '#[0-9a-fA-F]{3,8}\b' "${SCOPE[@]}" \
  | grep -vE 'var\([^)]+,\s*#[0-9a-fA-F]{3,8}\)' \
  | strip_excluded \
  | grep -vE '^\S+:[0-9]+:\s+[A-Za-z].*#[0-9]{1,4}\b' \
  | grep -vE '#[0-9]{1,4}[^0-9a-fA-F]' \
  | grep -vE '^\S+:[0-9]+:\s+(Probleme|Note|Solution|Warning|Info|TODO|FIXME|voir|Ref|ref|ratio|fond|couleur)\s' \
  | wc -l)
if [ "$HEX" -gt 0 ]; then
  echo "ERREUR : $HEX hex hardcode(s) detecte(s) — utiliser var(--token) ou ajouter dans tokens.css"
  grep -rEn '#[0-9a-fA-F]{3,8}\b' "${SCOPE[@]}" \
    | grep -vE 'var\([^)]+,\s*#[0-9a-fA-F]{3,8}\)' \
    | strip_excluded \
    | grep -vE '^\S+:[0-9]+:\s+[A-Za-z].*#[0-9]{1,4}\b' \
    | grep -vE '#[0-9]{1,4}[^0-9a-fA-F]' \
    | grep -vE '^\S+:[0-9]+:\s+(Probleme|Note|Solution|Warning|Info|TODO|FIXME|voir|Ref|ref|ratio|fond|couleur)\s'
  EXIT=1
else
  echo "OK : aucun hex hardcode detecte"
fi

echo "=== Check 3: rgba/rgb numeriques (literals sans var(--xxx-rgb)) ==="
# Whitelist : rgba(var(--xxx-rgb), X), lignes commentaires, allow-hardcoded
RGBA=$(grep -rEn 'rgba?\(\s*[0-9]' "${SCOPE[@]}" \
  | strip_excluded \
  | wc -l)
if [ "$RGBA" -gt 0 ]; then
  echo "ERREUR : $RGBA rgba/rgb literal(s) detecte(s) — utiliser rgba(var(--xxx-rgb), X) ou var(--overlay-*)"
  grep -rEn 'rgba?\(\s*[0-9]' "${SCOPE[@]}" \
    | strip_excluded
  EXIT=1
else
  echo "OK : aucun rgba/rgb literal detecte"
fi

echo "=== Check 4: couleurs nommees hardcodees (white / black hors color-mix structurel) ==="
# Cible : 'white'/'black' utilises comme VALEUR de couleur (apres ':' ou virgule/espace),
# pas la propriete CSS white-space. Exclut color-mix (white/black y sont structurels),
# commentaires et allow-hardcoded.
NAMED=$(grep -rEn '\b(white|black)\b' "${SCOPE[@]}" \
  | grep -vE 'white-space|color-mix' \
  | grep -vE '\b(white|black)-' \
  | strip_excluded \
  | grep -E '(:|,|\()\s*(white|black)\b|\b(solid|dotted|dashed|inset|outset)\s+(white|black)\b' \
  | wc -l)
if [ "$NAMED" -gt 0 ]; then
  echo "ERREUR : $NAMED couleur(s) nommee(s) hardcodee(s) — utiliser var(--text-on-accent) / var(--overlay-*) / var(--token)"
  grep -rEn '\b(white|black)\b' "${SCOPE[@]}" \
    | grep -vE 'white-space|color-mix' \
    | grep -vE '\b(white|black)-' \
    | strip_excluded \
    | grep -E '(:|,|\()\s*(white|black)\b|\b(solid|dotted|dashed|inset|outset)\s+(white|black)\b'
  EXIT=1
else
  echo "OK : aucune couleur nommee hardcodee detectee"
fi

if [ "$EXIT" -eq 0 ]; then
  echo ""
  echo "OK : aucun token hardcode detecte dans ${SCOPE[*]}"
fi
exit $EXIT
