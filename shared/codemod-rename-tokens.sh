#!/usr/bin/env bash
# codemod-rename-tokens.sh — Token rename idempotent (issue #186, v2.34.0)
# Usage : ./shared/codemod-rename-tokens.sh [--check-idempotent] [--dry-run]
#
# Renames :
#   --border      -> --border-color  (couleur vs longueur)
#   --violet      -> --deco-violet   (couleur décorative)
#   --violet-rgb  -> --deco-violet-rgb
#   --cyan        -> --deco-cyan
#   --cyan-rgb    -> --deco-cyan-rgb
#   --pink        -> --deco-pink
#   --radius      -> --radius-card   (sans suffixe uniquement)
#
# Les aliases legacy dans tokens.css garantissent 0 régression consumer.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
CHECK_IDEMPOTENT=false

for arg in "$@"; do
  case $arg in
    --dry-run)          DRY_RUN=true ;;
    --check-idempotent) CHECK_IDEMPOTENT=true ;;
  esac
done

# Files to process (CSS, JS, HTML — excluding tokens.css which has legacy aliases)
FILES=$(find "$REPO_ROOT" -type f \( -name "*.css" -o -name "*.js" -o -name "*.html" -o -name "*.ts" -o -name "*.md" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/visual-tests/baseline/*" \
  ! -path "*/shared/codemod-rename-tokens.sh" \
  2>/dev/null)

MODIFIED=()

apply_rename() {
  local file="$1"
  local original
  original=$(cat "$file")
  local updated="$original"

  # --border (not followed by - or alphanumeric after) -> --border-color
  # Matches: var(--border), --border:, --border )  etc.
  # Does NOT match: --border-width, --border-radius, --border-color (already renamed)
  updated=$(echo "$updated" | sed -E 's/--border([^a-zA-Z0-9_-])/--border-color\1/g')

  # --violet-rgb -> --deco-violet-rgb (before --violet to avoid double-rename)
  updated=$(echo "$updated" | sed -E 's/--violet-rgb([^a-zA-Z0-9_-])/--deco-violet-rgb\1/g')

  # --violet -> --deco-violet
  updated=$(echo "$updated" | sed -E 's/--violet([^a-zA-Z0-9_-])/--deco-violet\1/g')

  # --cyan-rgb -> --deco-cyan-rgb (before --cyan)
  updated=$(echo "$updated" | sed -E 's/--cyan-rgb([^a-zA-Z0-9_-])/--deco-cyan-rgb\1/g')

  # --cyan -> --deco-cyan
  updated=$(echo "$updated" | sed -E 's/--cyan([^a-zA-Z0-9_-])/--deco-cyan\1/g')

  # --pink -> --deco-pink
  updated=$(echo "$updated" | sed -E 's/--pink([^a-zA-Z0-9_-])/--deco-pink\1/g')

  # --radius (without suffix, i.e. not --radius-xxx) -> --radius-card
  updated=$(echo "$updated" | sed -E 's/--radius([^a-zA-Z0-9_-])/--radius-card\1/g')

  if [ "$updated" != "$original" ]; then
    if $DRY_RUN; then
      echo "[DRY-RUN] Would modify: $file"
    else
      echo "$updated" > "$file"
      MODIFIED+=("$file")
    fi
  fi
}

# Process all files
while IFS= read -r file; do
  apply_rename "$file"
done <<< "$FILES"

if $DRY_RUN; then
  echo "Dry run complete — no files modified."
  exit 0
fi

if [ "${#MODIFIED[@]}" -gt 0 ]; then
  echo "Modified ${#MODIFIED[@]} file(s):"
  for f in "${MODIFIED[@]}"; do
    echo "  $f"
  done
else
  echo "No files modified (already renamed or nothing matched)."
fi

if $CHECK_IDEMPOTENT; then
  # Run again and check no more changes
  SECOND_MODIFIED=()
  while IFS= read -r file; do
    original=$(cat "$file")
    updated="$original"
    updated=$(echo "$updated" | sed -E 's/--border([^a-zA-Z0-9_-])/--border-color\1/g')
    updated=$(echo "$updated" | sed -E 's/--violet-rgb([^a-zA-Z0-9_-])/--deco-violet-rgb\1/g')
    updated=$(echo "$updated" | sed -E 's/--violet([^a-zA-Z0-9_-])/--deco-violet\1/g')
    updated=$(echo "$updated" | sed -E 's/--cyan-rgb([^a-zA-Z0-9_-])/--deco-cyan-rgb\1/g')
    updated=$(echo "$updated" | sed -E 's/--cyan([^a-zA-Z0-9_-])/--deco-cyan\1/g')
    updated=$(echo "$updated" | sed -E 's/--pink([^a-zA-Z0-9_-])/--deco-pink\1/g')
    updated=$(echo "$updated" | sed -E 's/--radius([^a-zA-Z0-9_-])/--radius-card\1/g')
    if [ "$updated" != "$original" ]; then
      SECOND_MODIFIED+=("$file")
    fi
  done <<< "$FILES"

  if [ "${#SECOND_MODIFIED[@]}" -gt 0 ]; then
    echo "IDEMPOTENCE FAIL — ${#SECOND_MODIFIED[@]} file(s) still match:"
    for f in "${SECOND_MODIFIED[@]}"; do echo "  $f"; done
    exit 1
  else
    echo "IDEMPOTENCE PASS — 2nd run = 0 changes."
  fi
fi
