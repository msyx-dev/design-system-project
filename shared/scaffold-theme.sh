#!/bin/bash
# scaffold-theme.sh <name> — Cree themes/<name>.json (depuis msyx comme template) et recompile themes.css.
# Usage: ./shared/scaffold-theme.sh <theme-name>

set -euo pipefail

NAME="${1:-}"
if [ -z "$NAME" ]; then
    echo "Usage: $0 <theme-name>" >&2
    exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ROOT/themes/msyx.json"
TARGET="$ROOT/themes/$NAME.json"

if [ -f "$TARGET" ]; then
    echo "Error: Theme '$NAME' already exists at $TARGET" >&2
    exit 1
fi

if [ ! -f "$TEMPLATE" ]; then
    echo "Error: Template msyx.json missing at $TEMPLATE" >&2
    exit 1
fi

# Copy template + replace name/displayName via node (no jq dependency)
node -e "
const fs = require('fs');
const t = JSON.parse(fs.readFileSync('$TEMPLATE', 'utf8'));
t.name = '$NAME';
t.displayName = '$NAME';
fs.writeFileSync('$TARGET', JSON.stringify(t, null, 2) + '\n', { encoding: 'utf8' });
"

# Recompile themes.css
node "$ROOT/shared/build-themes.js"

echo "Created themes/$NAME.json and recompiled shared/css/themes.css"
