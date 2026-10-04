#!/usr/bin/env bash
# test-release-bump.sh — tests du hook de release scripts/release-bump.sh
# (msyx-dev/claude-config#543, tranche T3, critère CA13).
#
# Méthode : chaque cas travaille sur une COPIE des fichiers réels du dépôt (les 10 sources,
# site.html, pages/, themes/, docs/ARCHITECTURE.md, shared/, bin/, RELEASES.md, CHANGELOG.md,
# packages/react/{package.json,RELEASES.md}) dans un dossier temporaire, puis `git init` pour
# observer les écritures (git status) et jouer `tags`. Pas de `git worktree` : un worktree ne
# porte que l'état COMMITÉ (une mutation non commitée du hook y serait invisible) et il
# s'enregistre dans le dépôt réel (reliquat si le test est interrompu). Les vrais générateurs
# tournent sur les vraies données : si l'un d'eux change, ce test le voit.
#
# Test 0 : scripts/release-bump.sh suivi par git, exécutable (100755)
# Test A : config -> exactement « mode=pr » puis « vtag=no », rc 0
# Test B : next rempli + [Unreleased] React rempli, package.json pré-bumpé (comme version-release.sh)
#          -> rc 0, check-versions rc 0, site.html v9.9.0, released[0] = 9.9.0, next vidé,
#             RELEASES.md : entrée en tête, H1/H2 -> H3 hors blocs de code,
#             React alpha.N -> alpha.N+1, section scellée sous une [Unreleased] vide,
#             CHANGELOG.md inchangé à l'octet ; puis `tags --commit HEAD` -> tag=react-v…
# Test B1 / C1 : le contrôle §8.6 du runtime (~/.claude/scripts/pipeline/fil-de-leau-check.sh,
#          appelé tel quel) passe sur la fixture après apply (bac rempli / bac vide). Runtime
#          absent (CI GitHub) ou jq absent -> SKIP explicite, jamais un PASS
# Test C : next vide + [Unreleased] React vide, package.json NON pré-bumpé
#          -> rc 0, check-versions rc 0, released[0] = 9.9.0 portant la seule note de repli
#             (type amelioration), released +1, next vide, React intact ; tags -> rien
# Test D : section [Unreleased] React absente -> rc 0, React intact
# Test E : [Unreleased] React rempli + version React hors prérelease -> rc 1, rien écrit
# Test F : un générateur écrit CHANGELOG.md -> apply rc 1 (garde fail-closed)
# Test G : tags — <sha> invalide -> rc≠0 ; --commit absent -> rc 2
# Test H : usage — sous-commande inconnue/absente, config avec argument, apply sans --title,
#          --notes-file relatif, --version invalide -> rc 2, rien écrit
# Test I : released porte déjà --version -> rc 1, rien écrit, bac vide comme bac rempli
#
# Variable RELEASE_BUMP_SH (optionnelle) : chemin d'un autre release-bump.sh, pour le rejouer
# MUTÉ et prouver que ce test rougit (ex. `base` retiré de DS_CSS_SOURCES).
# Variable FIL_DE_LEAU_SH (optionnelle) : chemin du contrôle §8.6 (défaut : celui du runtime),
# pour prouver la branche SKIP (chemin inexistant).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
HOOK_SH="${RELEASE_BUMP_SH:-scripts/release-bump.sh}"

PASS=0
FAIL=0
SKIP=0
# Un seul dossier racine, nettoyé en sortie : new_tmp est appelé dans des $(…), donc dans
# un sous-shell — une liste de dossiers tenue par le parent n'y serait jamais complétée.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
new_tmp() { mktemp -d "$WORK/cas.XXXXXX"; }

pass() { echo "  PASS"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; printf '%s\n' "${OUT:-}" | tail -25 | sed 's/^/    /'; FAIL=$((FAIL+1)); }

NEW="9.9.0"
DATE="2099-12-31"        # date future fixe : released[] doit rester en ordre décroissant
TITLE="Titre de test"
CUR="$(grep -m1 -E '"version"[[:space:]]*:' package.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
REACT_FIX="9.0.0-alpha.41"   # hors historique réel : « ## v…alpha.42 » ne doit pas préexister
REACT_EXP="9.0.0-alpha.42"
HL='[{"type":"nouveaute","text":"Entree de fixture du bac next."}]'
# Note de repli écrite par le hook quand le bac next est vide (précédent : 2.145.2, PR #1036)
HL_REPLI='[{"type":"amelioration","text":"Améliorations internes, aucun changement visible."}]'
FDL_SH="${FIL_DE_LEAU_SH:-$HOME/.claude/scripts/pipeline/fil-de-leau-check.sh}"

NOTES_DIR="$(new_tmp)"
NOTES="$NOTES_DIR/notes.md"
cat > "$NOTES" <<'EOF'

# Titre H1 des notes
Introduction des notes.

## Added
- ajout de fixture

### Detail H3 garde

```bash
# commentaire de code jamais retrograde
## pas un titre
```

EOF

gitf() { git -C "$1" -c user.name=test -c user.email=test@example.invalid -c commit.gpgsign=false "${@:2}"; }

# fixture <next:rempli|vide> <react:rempli|vide|absent> <version React> -> chemin
fixture() {
  local d next="$1" react="$2" rver="$3"
  d="$(new_tmp)"
  mkdir -p "$d/docs" "$d/packages/react" "$d/scripts"
  cp -R shared bin pages themes "$d/"
  cp site.html package.json RELEASES.md CHANGELOG.md "$d/"
  cp docs/ARCHITECTURE.md "$d/docs/"
  cp packages/react/package.json packages/react/RELEASES.md "$d/packages/react/"
  cp "$HOOK_SH" "$d/scripts/release-bump.sh"
  local hl='[]'; [ "$next" = rempli ] && hl="$HL"
  node -e 'const fs=require("fs");const f=process.argv[1];const d=JSON.parse(fs.readFileSync(f,"utf8"));d.next.highlights=JSON.parse(process.argv[2]);fs.writeFileSync(f,JSON.stringify(d,null,2)+"\n")' \
    "$d/shared/version-notes.json" "$hl"
  (cd "$d" && node bin/generate-version-notes.js >/dev/null)
  sed -i -E "0,/\"version\"[[:space:]]*:/s/(\"version\"[[:space:]]*:[[:space:]]*)\"[^\"]*\"/\1\"$rver\"/" "$d/packages/react/package.json"
  # Retire toute section [Unreleased] existante, puis pose celle du cas avant le 1er « ## v »
  awk -v mode="$react" '
    /^## \[Unreleased\][ \t]*$/ { skip = 1; next }
    skip && /^## / { skip = 0 }
    skip { next }
    !done && /^## v/ && mode != "absent" {
      print "## [Unreleased]"; print ""
      if (mode == "rempli") { print "### Added"; print "- composant de fixture"; print "" }
      done = 1
    }
    { print }' "$d/packages/react/RELEASES.md" > "$d/react.tmp" && mv "$d/react.tmp" "$d/packages/react/RELEASES.md"
  gitf "$d" init -q
  gitf "$d" add -A
  gitf "$d" commit -qm fixture
  printf '%s' "$d"
}

# run_hook <dir> <args...> : sortie dans $OUT, code dans $RC (stdout seul dans $STDOUT)
run_hook() {
  local d="$1"; shift
  local errf; errf="$(mktemp)"
  STDOUT="$(cd "$d" && bash scripts/release-bump.sh "$@" </dev/null 2>"$errf")"
  RC=$?
  OUT="$STDOUT"$'\n'"$(cat "$errf")"
  rm -f "$errf"
}
run_apply() { run_hook "$1" apply --version "$NEW" --previous "$CUR" --type minor --date "$DATE" --title "$TITLE" --notes-file "$NOTES" "${@:2}"; }

json() { node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(eval(process.argv[2])))' "$1" "$2"; }
react_ver() { grep -m1 -E '"version"[[:space:]]*:' "$1/packages/react/package.json" | sed -E 's/.*:[[:space:]]*"([^"]*)".*/\1/'; }
clean_tree() { [ -z "$(gitf "$1" status --porcelain)" ]; }
# headings <fichier> : lignes « ## » hors blocs de code (un « ## » de bloc de code n'est pas un titre)
headings() { awk '/^[ \t]*(```|~~~)/ { f = !f } !f && /^## /' "$1"; }

# fil_de_leau <dir> : le contrôle §8.6 du runtime, appelé tel quel sur la fixture. Sa branche
# « dated » exige jq : sans jq, il retomberait sur le contrôle « cut », muet ici (faux PASS).
fil_de_leau() {
  if [ ! -f "$FDL_SH" ]; then echo "  SKIP fil-de-leau-check : runtime absent ($FDL_SH)"; SKIP=$((SKIP+1)); return; fi
  if ! command -v jq >/dev/null 2>&1; then echo "  SKIP fil-de-leau-check : jq absent"; SKIP=$((SKIP+1)); return; fi
  local rc=0
  OUT="$(bash "$FDL_SH" "$1" 2>&1)" || rc=$?
  if [ "$rc" -eq 0 ]; then pass; else fail "fil-de-leau-check rc=$rc"; fi
}

# --- Test 0 -------------------------------------------------------------------------------
echo "Test 0: scripts/release-bump.sh suivi par git et executable (100755)..."
if git ls-files -s scripts/release-bump.sh | grep -q '^100755 '; then pass; else OUT="$(git ls-files -s scripts/release-bump.sh)"; fail "hook non suivi ou non executable"; fi

# --- Test A -------------------------------------------------------------------------------
echo "Test A: config -> mode=pr / vtag=no, rc 0..."
A="$(new_tmp)"; mkdir -p "$A/scripts"; cp "$HOOK_SH" "$A/scripts/release-bump.sh"
run_hook "$A" config
if [ "$RC" -eq 0 ] && [ "$STDOUT" = $'mode=pr\nvtag=no' ]; then pass; else fail "sortie ou rc inattendus (rc=$RC)"; fi

# --- Test B -------------------------------------------------------------------------------
echo "Test B: next rempli + [Unreleased] React rempli -> apply complet, React bumpe..."
B="$(fixture rempli rempli "$REACT_FIX")"
sed -i -E "0,/\"version\"[[:space:]]*:/s/(\"version\"[[:space:]]*:[[:space:]]*)\"[^\"]*\"/\1\"$NEW\"/" "$B/package.json"  # bump canonique de version-release.sh
FIRST_BEFORE="$(headings "$B/RELEASES.md" | head -1)"
run_apply "$B"
why=""
[ "$RC" -eq 0 ] || why="$why apply rc=$RC;"
bash "$B/shared/check-versions.sh" "$B" >/dev/null 2>&1 || why="$why check-versions rc!=0;"
grep -q "v$NEW" "$B/site.html" || why="$why site.html sans v$NEW;"
[ "$(json "$B/shared/version-notes.json" 'd.released[0].version+"|"+d.released[0].date+"|"+d.released[0].titre')" = "$NEW|$DATE|$TITLE" ] || why="$why released[0] faux;"
[ "$(json "$B/shared/version-notes.json" 'JSON.stringify(d.released[0].highlights)')" = "$HL" ] || why="$why highlights non deplaces;"
[ "$(json "$B/shared/version-notes.json" 'd.next.highlights.length')" = "0" ] || why="$why next non vide;"
mapfile -t H < <(headings "$B/RELEASES.md" | head -2)
[ "${H[0]:-}" = "## $NEW — $DATE — $TITLE" ] || why="$why entree RELEASES.md absente ou pas en tete;"
[ "${H[1]:-}" = "$FIRST_BEFORE" ] || why="$why entree precedente deplacee;"
for l in '### Titre H1 des notes' '### Added' '### Detail H3 garde' '# commentaire de code jamais retrograde' '## pas un titre'; do
  grep -qxF -- "$l" "$B/RELEASES.md" || why="$why ligne « $l » absente;"
done
! grep -qxE '#{1,2} (Titre H1 des notes|Added)' "$B/RELEASES.md" || why="$why titre H1/H2 non retrograde;"
[ "$(react_ver "$B")" = "$REACT_EXP" ] || why="$why React $(react_ver "$B") != $REACT_EXP;"
mapfile -t RH < <(grep -A2 -x '## \[Unreleased\]' "$B/packages/react/RELEASES.md")
[ "${RH[2]:-}" = "## v$REACT_EXP — $DATE — $TITLE" ] || why="$why section React non scellee sous une [Unreleased] vide;"
grep -qxF -- '- composant de fixture' "$B/packages/react/RELEASES.md" || why="$why contenu React perdu;"
cmp -s "$ROOT/CHANGELOG.md" "$B/CHANGELOG.md" || why="$why CHANGELOG.md modifie;"
if [ -z "$why" ]; then pass; else fail "$why"; fi

echo "Test B1: fil-de-leau-check.sh du runtime passe apres apply (bac rempli)..."
fil_de_leau "$B"

echo "Test B2: tags --commit sur le commit de release (React a bouge) -> tag=react-v$REACT_EXP..."
gitf "$B" add -A && gitf "$B" commit -qm "release: v$NEW"
run_hook "$B" tags --commit "$(gitf "$B" rev-parse HEAD)"
if [ "$RC" -eq 0 ] && [ "$STDOUT" = "tag=react-v$REACT_EXP" ]; then pass; else fail "attendu tag=react-v$REACT_EXP (rc=$RC)"; fi

# --- Test C -------------------------------------------------------------------------------
echo "Test C: next vide + [Unreleased] React vide, package.json non pre-bumpe -> note de repli, aucun bump React..."
C="$(fixture vide vide "$REACT_FIX")"
REL0="$(json "$C/shared/version-notes.json" 'd.released[0].version')"
LEN0="$(json "$C/shared/version-notes.json" 'd.released.length')"
run_apply "$C"
why=""
[ "$RC" -eq 0 ] || why="$why apply rc=$RC;"
bash "$C/shared/check-versions.sh" "$C" >/dev/null 2>&1 || why="$why check-versions rc!=0;"
grep -q "v$NEW" "$C/site.html" || why="$why site.html sans v$NEW;"
[ "$(json "$C/shared/version-notes.json" 'd.released[0].version+"|"+d.released[0].date+"|"+d.released[0].titre')" = "$NEW|$DATE|$TITLE" ] || why="$why released[0] faux (pas d'entree $NEW sur bac vide);"
[ "$(json "$C/shared/version-notes.json" 'JSON.stringify(d.released[0].highlights)')" = "$HL_REPLI" ] || why="$why highlights != note de repli;"
[ "$(json "$C/shared/version-notes.json" 'd.released.length+"|"+d.released[1].version')" = "$((LEN0 + 1))|$REL0" ] || why="$why released non decale d'une entree;"
[ "$(json "$C/shared/version-notes.json" 'd.next.highlights.length')" = "0" ] || why="$why next non vide;"
gitf "$C" diff --quiet -- packages/react || why="$why packages/react modifie;"
cmp -s "$ROOT/CHANGELOG.md" "$C/CHANGELOG.md" || why="$why CHANGELOG.md modifie;"
if [ -z "$why" ]; then pass; else fail "$why"; fi

echo "Test C1: fil-de-leau-check.sh du runtime passe apres apply (bac vide)..."
fil_de_leau "$C"

echo "Test C2: tags --commit sur le commit de release (React immobile) -> rien..."
gitf "$C" add -A && gitf "$C" commit -qm "release: v$NEW"
run_hook "$C" tags --commit "$(gitf "$C" rev-parse HEAD)"
if [ "$RC" -eq 0 ] && [ -z "$STDOUT" ]; then pass; else fail "attendu sortie vide et rc 0 (rc=$RC)"; fi

# --- Test D -------------------------------------------------------------------------------
echo "Test D: section [Unreleased] React absente -> rc 0, React intact..."
D="$(fixture rempli absent "$REACT_FIX")"
run_apply "$D"
if [ "$RC" -eq 0 ] && gitf "$D" diff --quiet -- packages/react && bash "$D/shared/check-versions.sh" "$D" >/dev/null 2>&1; then pass; else fail "rc=$RC ou packages/react modifie"; fi

# --- Test E -------------------------------------------------------------------------------
echo "Test E: [Unreleased] React rempli + version React hors prerelease -> rc 1, rien ecrit..."
E="$(fixture rempli rempli "3.0.0")"
run_apply "$E"
if [ "$RC" -eq 1 ] && clean_tree "$E"; then pass; else OUT="$OUT"$'\n'"$(gitf "$E" status --porcelain)"; fail "attendu rc 1 et arbre intact (rc=$RC)"; fi

# --- Test F -------------------------------------------------------------------------------
echo "Test F: un generateur ecrit CHANGELOG.md -> apply rc 1 (garde fail-closed)..."
F="$(fixture vide vide "$REACT_FIX")"
sed -i "1a require('fs').appendFileSync(require('path').join(__dirname, '..', 'CHANGELOG.md'), 'sabotage\\\\n');" "$F/bin/generate-counters.js"
run_apply "$F"
if [ "$RC" -eq 1 ] && grep -q 'CHANGELOG.md a été modifié' <<< "$OUT"; then pass; else fail "attendu rc 1 sur CHANGELOG.md modifie (rc=$RC)"; fi

# --- Test G -------------------------------------------------------------------------------
echo "Test G: tags — sha invalide -> rc!=0 ; --commit absent -> rc 2..."
run_hook "$C" tags --commit deadbeefdeadbeef
rc1=$RC; o1="$STDOUT"
run_hook "$C" tags
if [ "$rc1" -ne 0 ] && [ -z "$o1" ] && [ "$RC" -eq 2 ]; then pass; else fail "rc sha invalide=$rc1, rc sans --commit=$RC"; fi

# --- Test H -------------------------------------------------------------------------------
echo "Test H: usage invalide -> rc 2, rien ecrit..."
Hd="$(fixture rempli rempli "$REACT_FIX")"
bad=""
run_hook "$Hd" frobnicate;  [ "$RC" -eq 2 ] || bad="$bad inconnue=$RC"
run_hook "$Hd";             [ "$RC" -eq 2 ] || bad="$bad absente=$RC"
run_hook "$Hd" config extra; [ "$RC" -eq 2 ] || bad="$bad config+arg=$RC"
run_hook "$Hd" apply --version "$NEW" --previous "$CUR" --type minor --date "$DATE" --notes-file "$NOTES"
[ "$RC" -eq 2 ] || bad="$bad sans-title=$RC"
run_hook "$Hd" apply --version "$NEW" --previous "$CUR" --type minor --date "$DATE" --title "$TITLE" --notes-file notes.md
[ "$RC" -eq 2 ] || bad="$bad notes-relatif=$RC"
run_hook "$Hd" apply --version "v$NEW" --previous "$CUR" --type minor --date "$DATE" --title "$TITLE" --notes-file "$NOTES"
[ "$RC" -eq 2 ] || bad="$bad version-invalide=$RC"
clean_tree "$Hd" || bad="$bad arbre-modifie"
if [ -z "$bad" ]; then pass; else fail "$bad"; fi

# --- Test I -------------------------------------------------------------------------------
echo "Test I: released porte deja $NEW -> rc 1, rien ecrit (bac vide et bac rempli)..."
bad=""
for next in vide rempli; do
  Id="$(fixture "$next" vide "$REACT_FIX")"
  node -e 'const fs=require("fs");const f=process.argv[1];const d=JSON.parse(fs.readFileSync(f,"utf8"));d.released.unshift({version:process.argv[2],date:"2099-01-01",titre:"Deja publiee",highlights:[{type:"amelioration",text:"Deja publiee."}]});fs.writeFileSync(f,JSON.stringify(d,null,2)+"\n")' \
    "$Id/shared/version-notes.json" "$NEW"
  (cd "$Id" && node bin/generate-version-notes.js >/dev/null) && gitf "$Id" add -A && gitf "$Id" commit -qm "deja $NEW"
  run_apply "$Id"
  [ "$RC" -eq 1 ] || bad="$bad $next:rc=$RC"
  grep -q "released porte déjà la version $NEW" <<< "$OUT" || bad="$bad $next:message-absent"
  clean_tree "$Id" || bad="$bad $next:arbre-modifie"
done
if [ -z "$bad" ]; then pass; else fail "$bad"; fi

echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL, $SKIP SKIP"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
