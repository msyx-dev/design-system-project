#!/usr/bin/env bash
# test-check-dead-classes.sh — verifie bin/check-dead-classes.js (#765)
# Run A : fixture avec 1 classe morte -> le mode --strict echoue (exit 1),
#         le mode par defaut warn-only reste vert (exit 0)
# Run B : fixture 100% legitime (classe presente en CSS, y compris via
#         selecteur compose `.foo.bar`) -> --strict et defaut passent (exit 0)
# Run C : fichier JS manquant -> fail-closed (exit 1), meme en mode par defaut
# Run D : repertoire CSS manquant -> fail-closed (exit 1)
# Run E : classList.add multi-arguments + classe construite dynamiquement
#         (`'btn-' + variant`) -> seule la classe litterale complete morte
#         est signalee, la classe dynamique est ignoree proprement (pas de
#         faux positif ni faux negatif sur la partie non resolvable)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
TMPDIR_DC="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR_DC"; }
trap cleanup EXIT

check() {
  local desc="$1"
  local expected_exit="$2"
  shift 2
  if node bin/check-dead-classes.js "$@" > /tmp/check-dead-classes-test-out.$$ 2>&1; then
    actual_exit=0
  else
    actual_exit=$?
  fi
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    echo "  PASS: $desc (exit $actual_exit attendu)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (exit $actual_exit obtenu, $expected_exit attendu)"
    cat /tmp/check-dead-classes-test-out.$$
    FAIL=$((FAIL + 1))
  fi
  rm -f /tmp/check-dead-classes-test-out.$$
}

check_output_contains() {
  local desc="$1"
  local needle="$2"
  shift 2
  node bin/check-dead-classes.js "$@" > /tmp/check-dead-classes-test-out.$$ 2>&1 || true
  if grep -qF -- "$needle" /tmp/check-dead-classes-test-out.$$; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (attendu de trouver « $needle » dans la sortie)"
    cat /tmp/check-dead-classes-test-out.$$
    FAIL=$((FAIL + 1))
  fi
  rm -f /tmp/check-dead-classes-test-out.$$
}

# ─── Run A : classe morte (exit 1 en --strict, exit 0 en warn-only) ────────
echo "Test A: classe posee par le JS et absente du CSS..."
mkdir -p "$TMPDIR_DC/bad/css"
cat > "$TMPDIR_DC/bad/app.js" <<'EOF'
function reveal(el) {
    el.classList.add('foo-bar');
}
EOF
cat > "$TMPDIR_DC/bad/css/style.css" <<'EOF'
.some-other-class { color: red; }
EOF
check "classe morte -- warn-only par defaut (exit 0)" 0 \
  "--js=$TMPDIR_DC/bad/app.js" "--css=$TMPDIR_DC/bad/css"
check "classe morte -- --strict echoue (exit 1)" 1 \
  "--strict" "--js=$TMPDIR_DC/bad/app.js" "--css=$TMPDIR_DC/bad/css"
check_output_contains "classe morte -- rapportee dans la sortie" ".foo-bar" \
  "--js=$TMPDIR_DC/bad/app.js" "--css=$TMPDIR_DC/bad/css"

# ─── Run B : cas legitime (classe presente, y compris selecteur compose) ───
echo "Test B: classes presentes en CSS (litterale simple + selecteur compose)..."
mkdir -p "$TMPDIR_DC/good/css"
cat > "$TMPDIR_DC/good/app.js" <<'EOF'
function reveal(el, panel) {
    el.classList.add('visible');
    panel.classList.toggle('open');
}
EOF
cat > "$TMPDIR_DC/good/css/style.css" <<'EOF'
.thing.visible { opacity: 1; }
.panel.open { display: block; }
EOF
check "cas legitime -- warn-only (exit 0)" 0 \
  "--js=$TMPDIR_DC/good/app.js" "--css=$TMPDIR_DC/good/css"
check "cas legitime -- --strict aussi (exit 0)" 0 \
  "--strict" "--js=$TMPDIR_DC/good/app.js" "--css=$TMPDIR_DC/good/css"

# ─── Run C : fichier JS manquant -> fail-closed (exit 1, jamais exit 0) ────
echo "Test C: fichier JS manquant -> fail-closed (exit 1 attendu)..."
check "fichier JS manquant (fail-closed)" 1 \
  "--js=$TMPDIR_DC/does-not-exist.js" "--css=$TMPDIR_DC/good/css"

# ─── Run D : repertoire CSS manquant -> fail-closed (exit 1) ───────────────
echo "Test D: repertoire CSS manquant -> fail-closed (exit 1 attendu)..."
check "repertoire CSS manquant (fail-closed)" 1 \
  "--js=$TMPDIR_DC/good/app.js" "--css=$TMPDIR_DC/does-not-exist-dir"

# ─── Run E : multi-arguments + classe dynamique ignoree proprement ────────
echo "Test E: classList.add multi-arguments + construction dynamique (bruit)..."
mkdir -p "$TMPDIR_DC/dyn/css"
cat > "$TMPDIR_DC/dyn/app.js" <<'EOF'
function render(el, variant) {
    el.classList.add('range-start', 'selected');
    el.className = 'btn btn-' + variant;
}
EOF
cat > "$TMPDIR_DC/dyn/css/style.css" <<'EOF'
.cal.range-start { color: blue; }
EOF
# 'selected' est absente du CSS (vraie classe morte) ; 'btn-' est une
# construction dynamique (variant inconnu) et ne doit JAMAIS etre rapportee
# telle quelle ; 'btn' (litteral complet, borne par le debut de chaine) DOIT
# etre rapportee comme morte (aucune regle .btn dans ce CSS de fixture).
check_output_contains "multi-arg -- 'selected' rapportee comme morte" ".selected" \
  "--js=$TMPDIR_DC/dyn/app.js" "--css=$TMPDIR_DC/dyn/css"
check_output_contains "multi-arg -- 'btn' (token complet) rapportee comme morte" ".btn" \
  "--js=$TMPDIR_DC/dyn/app.js" "--css=$TMPDIR_DC/dyn/css"
node bin/check-dead-classes.js "--js=$TMPDIR_DC/dyn/app.js" "--css=$TMPDIR_DC/dyn/css" > /tmp/check-dead-classes-test-out.$$ 2>&1 || true
if grep -qE "\.btn-[[:space:]]|\.btn-$" /tmp/check-dead-classes-test-out.$$; then
  echo "  FAIL: multi-arg -- le prefixe dynamique 'btn-' n'aurait jamais du etre rapporte tel quel"
  cat /tmp/check-dead-classes-test-out.$$
  FAIL=$((FAIL + 1))
else
  echo "  PASS: multi-arg -- le prefixe dynamique 'btn-' est ignore proprement (pas de faux positif brut)"
  PASS=$((PASS + 1))
fi
rm -f /tmp/check-dead-classes-test-out.$$

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
