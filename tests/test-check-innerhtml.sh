#!/usr/bin/env bash
# test-check-innerhtml.sh — verifie que bin/check-innerhtml.js fonctionne (#758)
# Run A : shared/components.js + shared/nav.js propres -> exit 0 attendu
# Run B..E : fixtures adverses (attribut, template literal, multi-ligne,
#            constantMarkup concatene) -> exit 1 attendu chacune
# Run F : fixture legitime (wipe / litteral / derogation) -> exit 0 attendu
# Run G : fichier manquant -> exit 1 attendu (fail-closed, pas fail-open)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
TMPDIR_IH="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR_IH"; }
trap cleanup EXIT

check() {
  local desc="$1"
  local expected_exit="$2"
  shift 2
  if node bin/check-innerhtml.js "$@" > /tmp/check-innerhtml-test-out.$$ 2>&1; then
    actual_exit=0
  else
    actual_exit=$?
  fi
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    echo "  PASS: $desc (exit $actual_exit attendu)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (exit $actual_exit obtenu, $expected_exit attendu)"
    cat /tmp/check-innerhtml-test-out.$$
    FAIL=$((FAIL + 1))
  fi
  rm -f /tmp/check-innerhtml-test-out.$$
}

# ─── Run A : le DS lui-même doit être propre ───────────────────────────────
echo "Test A: shared/components.js + shared/nav.js propres (exit 0 attendu)..."
check "DS propre" 0

# ─── Fixtures adverses (doivent toutes échouer, exit 1) ────────────────────

echo "Test B: concaténation en contexte attribut (exit 1 attendu)..."
cat > "$TMPDIR_IH/bad-attr.js" <<'EOF'
function render(userAvatar) {
    var el = document.createElement('span');
    el.innerHTML = '<img src="' + userAvatar + '" alt="avatar">';
    return el;
}
EOF
check "concat attribut non dérogée" 1 "$TMPDIR_IH/bad-attr.js"

echo "Test C: template literal avec \${} (exit 1 attendu)..."
cat > "$TMPDIR_IH/bad-template.js" <<'EOF'
function render(user) {
    var el = document.createElement('div');
    el.innerHTML = `<span>${user.name}</span>`;
    return el;
}
EOF
check "template literal non dérogé" 1 "$TMPDIR_IH/bad-template.js"

echo "Test D: affectation multi-ligne concaténée (exit 1 attendu)..."
cat > "$TMPDIR_IH/bad-multiline.js" <<'EOF'
function render(dot) {
    var tooltip = document.createElement('div');
    tooltip.innerHTML =
        '<div class="risk-tooltip-title">' + dot.label + '</div>' +
        '<div class="risk-tooltip-row">' + dot.owner + '</div>';
    return tooltip;
}
EOF
check "multi-ligne non dérogée" 1 "$TMPDIR_IH/bad-multiline.js"

echo "Test E: constantMarkup(...) concaténé (exit 1 attendu)..."
cat > "$TMPDIR_IH/bad-constantmarkup.js" <<'EOF'
function constantMarkup(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    return tpl.content.firstElementChild;
}
function render(iconName) {
    return constantMarkup('<svg class="icon-' + iconName + '"></svg>');
}
EOF
check "constantMarkup concaténé" 1 "$TMPDIR_IH/bad-constantmarkup.js"

# ─── Run F : fixture légitime (wipe / littéral pur / dérogation justifiée) ──
echo "Test F: cas légitimes — wipe, littéral pur, dérogation justifiée (exit 0 attendu)..."
cat > "$TMPDIR_IH/good.js" <<'EOF'
function constantMarkup(html) {
    var tpl = document.createElement('template');
    // ds-allow-innerhtml: fragment toujours littéral (jamais concaténé à une variable)
    tpl.innerHTML = html;
    return tpl.content.firstElementChild;
}

function render(state, icons) {
    var el = document.createElement('div');
    el.innerHTML = ''; // wipe — toujours sûr

    var badge = document.createElement('span');
    badge.innerHTML = '<svg></svg>' + '<span>OK</span>'; // littéraux purs concaténés, sûr

    // ds-allow-innerhtml: icons indexe une map interne à clés fixes, jamais une donnée consumer
    if (el) el.innerHTML = icons[state];

    return { el: el, badge: badge };
}
EOF
check "cas légitimes (wipe/littéral/dérogation)" 0 "$TMPDIR_IH/good.js"

# ─── Run G : fichier manquant → fail-closed (exit 1, PAS exit 0) ───────────
echo "Test G: fichier manquant -> fail-closed (exit 1 attendu, jamais [OK])..."
check "fichier manquant (fail-closed)" 1 "$TMPDIR_IH/does-not-exist.js"

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
