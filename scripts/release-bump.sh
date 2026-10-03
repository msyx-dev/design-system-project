#!/usr/bin/env bash
# release-bump.sh — hook de release du design system, appelé par version-release.sh
# (msyx-dev/claude-config#543, tranche T3). Contrat « Noms figés » de la spec #543 :
#
#   bash scripts/release-bump.sh config
#       stdout : mode=pr / vtag=no (une ligne clé=valeur chacune), rc 0.
#       Le DS se livre par une PR release/vX.Y.Z (main protégé) et ne pose ni tag
#       vX.Y.Z ni release GitHub : seul le tag react-v* (publish-react.yml) compte.
#
#   bash scripts/release-bump.sh apply --version X.Y.Z --previous A.B.C \
#        --type patch|minor|major --date AAAA-MM-JJ --title "…" --notes-file /chemin/absolu
#       Appelé APRÈS le bump de package.json par version-release.sh (idempotent ici).
#       Écrit l'arbre, dans cet ordre :
#         1. --version sur les 9 sources non autogénérées, puis node shared/build-themes.js
#         2. shared/version-notes.json : next.highlights non vide -> released[0], next vidé ;
#            puis node bin/generate-version-notes.js
#         3. node bin/generate-counters.js
#         4. RELEASES.md : « ## X.Y.Z — date — titre » + notes (H1/H2 -> H3), avant le 1er « ## »
#         5. packages/react : bump 3.0.0-alpha.N -> alpha.N+1 SI « ## [Unreleased] » de
#            packages/react/RELEASES.md n'est pas vide (la section devient « ## vY — date — titre »,
#            une « ## [Unreleased] » vide reste au-dessus) ; version non -alpha.N -> rc 1
#         6. contrôles : check-versions.sh, generate-version-notes.js --check,
#            check-counters.sh, generate-counters.js --check (les deux gardes de compteurs
#            de la CI) ; un seul rc≠0 -> rc 1
#       N'écrit JAMAIS CHANGELOG.md (garde fail-closed : modifié -> rc 1). Ne commite pas,
#       ne tague pas, ne pousse pas, ne change pas de branche. Tout ce qui peut être refusé
#       l'est AVANT la première écriture (pré-vols) ; un échec ensuite rend rc 1 et
#       version-release.sh restaure l'arbre.
#
#   bash scripts/release-bump.sh tags --commit <sha>
#       Lecture seule. stdout : « tag=react-v<version de packages/react/package.json à <sha>> »
#       si packages/react/package.json a changé dans <sha> (diff <sha>^..<sha>), rien sinon.
#       rc 0 ; <sha> invalide, sans parent ou erreur git -> rc 1 (jamais un tag par défaut).
#
# Codes retour : 0 OK ; 1 échec ou décision humaine requise ; 2 usage (sous-commande
# inconnue, argument manquant ou invalide), message sur stderr.
# Test : tests/test-release-bump.sh (branché en CI à côté de tests/test-check-versions.sh).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

SEMVER_RE='^[0-9]+\.[0-9]+\.[0-9]+$'
REACT_PRE_RE='^([0-9]+\.[0-9]+\.[0-9]+)-alpha\.([0-9]+)$'
REACT_PKG="packages/react/package.json"
REACT_RELEASES="packages/react/RELEASES.md"

# Les 5 fichiers CSS dont l'en-tête @ds-version est écrit à la main. themes.css (6e) est
# autogénéré par shared/build-themes.js depuis tokens.css : il n'est JAMAIS écrit ici.
DS_CSS_SOURCES=(tokens utilities components layout base)

usage() {
  cat >&2 <<'EOF'
Usage :
  release-bump.sh config
  release-bump.sh apply --version X.Y.Z --previous A.B.C --type patch|minor|major \
                        --date AAAA-MM-JJ --title "…" --notes-file /chemin/absolu
  release-bump.sh tags --commit <sha>
EOF
}
die2() { echo "release-bump : $*" >&2; usage; exit 2; }
die1() { echo "release-bump : ERREUR — $*" >&2; exit 1; }
log()  { echo "[release-bump] $*"; }

# --- node : PATH d'abord, NODE_BIN si fourni, sinon le plus récent de nvm -----------------
# version-release.sh peut tourner dans un shell où nvm n'est pas chargé : sans repli, apply
# échouerait au premier générateur. Le dossier retenu est préfixé au PATH, car
# check-counters.sh appelle lui-même `node`.
resolve_node() {
  local c=""
  if [ -n "${NODE_BIN:-}" ]; then
    c="$NODE_BIN"
  elif command -v node >/dev/null 2>&1; then
    c="$(command -v node)"
  else
    c="$(ls -1d "$HOME"/.nvm/versions/node/v*/bin/node 2>/dev/null | sort -V | tail -1)"
  fi
  [ -n "$c" ] && [ -x "$c" ] || return 1
  PATH="$(dirname "$c"):$PATH"
  export PATH
}

# set_first_match_semver <fichier> <motif ERE de ligne> <version>
# Remplace le 1er X.Y.Z de la PREMIÈRE ligne qui porte le motif — la même ligne que lit
# shared/check-versions.sh (grep -m1). Ligne absente ou sans X.Y.Z -> rc 1, fichier intact.
# `sed -i` sur un numéro de ligne, pas awk : awk ajoute un saut de ligne final aux fichiers
# qui n'en ont pas (layout.css), ce qui polluerait le diff de release.
set_first_match_semver() {
  local f="$1" pat="$2" v="$3" n
  n="$(grep -n -m1 -E "$pat" "$f" | cut -d: -f1)"
  if [ -z "$n" ] || ! sed -n "${n}p" "$f" | grep -qE '[0-9]+\.[0-9]+\.[0-9]+'; then
    echo "release-bump : $f — aucune ligne « $pat » portant X.Y.Z" >&2
    return 1
  fi
  sed -i -E "${n}s/[0-9]+\.[0-9]+\.[0-9]+/$v/" "$f"
}

# first_heading_line <fichier> <motif ERE> : n° de la 1re ligne qui porte le motif hors blocs
# de code (un « ## » dans un bloc de code n'est pas un titre). Vide si aucune.
first_heading_line() {
  awk -v pat="$2" '/^[ \t]*(```|~~~)/ { f = !f; next } !f && $0 ~ pat { print NR; exit }' "$1"
}

# --- shared/version-notes.json : pré-vol (check) et estampille (write) ----------------------
# Sérialisation JSON.stringify(…, null, 2) + "\n" : c'est le format exact du fichier (vérifié
# par aller-retour au 2026-10-03), donc seul le bloc déplacé apparaît au diff.
NOTES_JS='
const fs = require("fs");
const [mode, file, version, date, titre] = process.argv.slice(1);
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const hl = data && data.next && Array.isArray(data.next.highlights) ? data.next.highlights : null;
if (!hl || !Array.isArray(data.released)) { console.error(file + " : next.highlights ou released absent"); process.exit(1); }
if (hl.length === 0) { console.log("next.highlights vide : aucune entrée released"); process.exit(0); }
if (data.released.some(function (r) { return r && r.version === version; })) {
  console.error(file + " : released porte déjà la version " + version); process.exit(1);
}
if (mode === "check") process.exit(0);
data.released.unshift({ version: version, date: date, titre: titre, highlights: hl });
data.next.highlights = [];
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("released[0] = " + version + " (" + hl.length + " highlight(s)), next vidé");
'

# react_unreleased_state : « absent », « vide » ou « rempli » (1re section ## [Unreleased]).
# Lignes blanches et commentaires HTML d'une ligne ne comptent pas comme contenu.
react_unreleased_state() {
  [ -f "$REACT_RELEASES" ] || { echo absent; return 0; }
  awk '
    /^[ \t]*(```|~~~)/ { fence = !fence }
    !fence && /^## \[Unreleased\][ \t]*$/ && !found { found = 1; inside = 1; next }
    inside && !fence && /^## / { inside = 0 }
    inside && $0 !~ /^[ \t]*$/ && $0 !~ /^[ \t]*<!--.*-->[ \t]*$/ { filled = 1 }
    END { print (found ? (filled ? "rempli" : "vide") : "absent") }' "$REACT_RELEASES"
}

read_json_version() { # 1re ligne "version" d'un package.json (même lecture que check-versions)
  grep -m1 -E '"version"[[:space:]]*:' "$1" | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/'
}

file_sig() { # empreinte d'un fichier, « absent » s'il n'existe pas
  if [ -e "$1" ]; then sha256sum "$1" | cut -d' ' -f1; else echo absent; fi
}

# ============================================================================================
cmd_config() {
  [ "$#" -eq 0 ] || die2 "config ne prend aucun argument"
  echo "mode=pr"
  echo "vtag=no"
}

# ============================================================================================
cmd_apply() {
  local VERSION="" PREVIOUS="" TYPE="" DATE="" TITLE="" NOTES="" have_title=0
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --version|--previous|--type|--date|--title|--notes-file)
        [ "$#" -ge 2 ] || die2 "apply : $1 sans valeur"
        case "$1" in
          --version)    VERSION="$2" ;;
          --previous)   PREVIOUS="$2" ;;
          --type)       TYPE="$2" ;;
          --date)       DATE="$2" ;;
          --title)      TITLE="$2"; have_title=1 ;;
          --notes-file) NOTES="$2" ;;
        esac
        shift 2 ;;
      *) die2 "apply : argument inconnu « $1 »" ;;
    esac
  done
  [[ "$VERSION"  =~ $SEMVER_RE ]] || die2 "apply : --version X.Y.Z requis (reçu « $VERSION »)"
  [[ "$PREVIOUS" =~ $SEMVER_RE ]] || die2 "apply : --previous A.B.C requis (reçu « $PREVIOUS »)"
  case "$TYPE" in patch|minor|major) ;; *) die2 "apply : --type patch|minor|major requis (reçu « $TYPE »)" ;; esac
  [[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die2 "apply : --date AAAA-MM-JJ requis (reçu « $DATE »)"
  [ "$have_title" -eq 1 ] && [ -n "${TITLE//[[:space:]]/}" ] || die2 "apply : --title non vide requis"
  [[ "$TITLE" != *$'\n'* ]] || die2 "apply : --title sur une seule ligne"
  [[ "$NOTES" == /* ]] || die2 "apply : --notes-file doit être un chemin absolu (reçu « $NOTES »)"
  [ -f "$NOTES" ] && [ -r "$NOTES" ] || die2 "apply : --notes-file illisible : $NOTES"

  # ---- Pré-vols : tout ce qui peut être refusé l'est AVANT la première écriture -----------
  resolve_node || die1 "node introuvable (PATH, NODE_BIN, ~/.nvm) — rien écrit"
  local f
  local -a REQUIRED=()
  for f in "${DS_CSS_SOURCES[@]}"; do REQUIRED+=("shared/css/$f.css"); done
  REQUIRED+=(shared/nav.js shared/components-registry.json package.json shared/version-notes.json
             RELEASES.md shared/build-themes.js bin/generate-version-notes.js bin/generate-counters.js
             shared/check-versions.sh shared/check-counters.sh)
  for f in "${REQUIRED[@]}"; do
    [ -f "$f" ] || die1 "fichier attendu absent : $f — rien écrit"
  done
  if grep -qE "^## ${VERSION//./\\.}([[:space:]]|$)" RELEASES.md; then
    die1 "RELEASES.md porte déjà une entrée « ## $VERSION » — rien écrit"
  fi
  node -e "$NOTES_JS" check shared/version-notes.json "$VERSION" "$DATE" "$TITLE" >/dev/null \
    || die1 "shared/version-notes.json refusé (voir ci-dessus) — rien écrit"

  local REACT_STATE REACT_CUR="" REACT_NEW=""
  REACT_STATE="$(react_unreleased_state)"
  if [ "$REACT_STATE" = "rempli" ]; then
    [ -f "$REACT_PKG" ] || die1 "$REACT_PKG absent alors que [Unreleased] React est rempli — rien écrit"
    REACT_CUR="$(read_json_version "$REACT_PKG")"
    if [[ "$REACT_CUR" =~ $REACT_PRE_RE ]]; then
      REACT_NEW="${BASH_REMATCH[1]}-alpha.$(( BASH_REMATCH[2] + 1 ))"
    else
      die1 "version React « $REACT_CUR » hors prérelease -alpha.N : bump React = décision humaine — rien écrit"
    fi
    if grep -qE "^## v${REACT_NEW//./\\.}([[:space:]]|$)" "$REACT_RELEASES"; then
      die1 "$REACT_RELEASES porte déjà « ## v$REACT_NEW » — rien écrit"
    fi
  fi

  local CL_SIG0; CL_SIG0="$(file_sig CHANGELOG.md)"
  log "apply $PREVIOUS -> $VERSION ($TYPE, $DATE) ; React [Unreleased] : $REACT_STATE"

  # ---- 1. les 9 sources non autogénérées, puis themes.css --------------------------------
  for f in "${DS_CSS_SOURCES[@]}"; do
    set_first_match_semver "shared/css/$f.css" '@ds-version' "$VERSION" || die1 "étape 1 : shared/css/$f.css"
  done
  set_first_match_semver shared/nav.js '@ds-version' "$VERSION"                    || die1 "étape 1 : nav.js @ds-version"
  set_first_match_semver shared/nav.js 'const[[:space:]]+VERSION[[:space:]]*=' "$VERSION" || die1 "étape 1 : nav.js const VERSION"
  set_first_match_semver shared/components-registry.json '"version"[[:space:]]*:' "$VERSION" || die1 "étape 1 : components-registry.json"
  set_first_match_semver package.json '"version"[[:space:]]*:' "$VERSION"           || die1 "étape 1 : package.json"
  node shared/build-themes.js || die1 "étape 1 : node shared/build-themes.js"

  # ---- 2. notes de version produit --------------------------------------------------------
  node -e "$NOTES_JS" write shared/version-notes.json "$VERSION" "$DATE" "$TITLE" || die1 "étape 2 : version-notes.json"
  node bin/generate-version-notes.js || die1 "étape 2 : node bin/generate-version-notes.js"

  # ---- 3. compteurs de site.html (dont « vX.Y.Z ») ------------------------------------------
  node bin/generate-counters.js || die1 "étape 3 : node bin/generate-counters.js"

  # ---- 4. RELEASES.md racine ----------------------------------------------------------------
  local entry tmp
  entry="$(mktemp)" && tmp="$(mktemp)" || die1 "étape 4 : mktemp"
  {
    printf '## %s — %s — %s\n\n' "$VERSION" "$DATE" "$TITLE"
    # Corps des notes : titres H1/H2 hors blocs de code rétrogradés en H3, lignes blanches
    # de tête et de fin retirées (une seule ligne blanche avant l'entrée suivante).
    awk '
      /^[ \t]*(```|~~~)/ { fence = !fence }
      !fence && /^##?[ \t]/ { sub(/^##?/, "###") }
      /^[ \t]*$/ { if (started) pending++; next }
      { while (pending > 0) { print ""; pending-- } ; started = 1; print }' "$NOTES"
    printf '\n'
  } > "$entry"
  # head/tail plutôt qu'awk : la fin du fichier (saut de ligne final absent) reste à l'octet.
  local n
  n="$(first_heading_line RELEASES.md '^## ')"
  if [ -n "$n" ]; then
    { head -n "$((n - 1))" RELEASES.md; cat "$entry"; tail -n +"$n" RELEASES.md; } > "$tmp"
  else
    { cat RELEASES.md; [ -z "$(tail -c1 RELEASES.md)" ] || printf '\n'; printf '\n'; cat "$entry"; } > "$tmp"
  fi || { rm -f "$entry" "$tmp"; die1 "étape 4 : RELEASES.md"; }
  cat "$tmp" > RELEASES.md; rm -f "$entry" "$tmp"
  log "RELEASES.md : entrée « ## $VERSION — $DATE — $TITLE »"

  # ---- 5. @msyx-dev/react : seulement si [Unreleased] est rempli ----------------------------
  if [ "$REACT_STATE" = "rempli" ]; then
    n="$(grep -n -m1 -E '"version"[[:space:]]*:' "$REACT_PKG" | cut -d: -f1)"
    [ -n "$n" ] || die1 "étape 5 : $REACT_PKG sans \"version\""
    sed -i "${n}s/\"${REACT_CUR//./\\.}\"/\"$REACT_NEW\"/" "$REACT_PKG" || die1 "étape 5 : $REACT_PKG"
    [ "$(read_json_version "$REACT_PKG")" = "$REACT_NEW" ] || die1 "étape 5 : $REACT_PKG ne relit pas $REACT_NEW"
    n="$(first_heading_line "$REACT_RELEASES" '^## \\[Unreleased\\][ \t]*$')"
    [ -n "$n" ] || die1 "étape 5 : [Unreleased] introuvable dans $REACT_RELEASES"
    tmp="$(mktemp)" || die1 "étape 5 : mktemp"
    { head -n "$n" "$REACT_RELEASES"; printf '\n## v%s — %s — %s\n' "$REACT_NEW" "$DATE" "$TITLE"; tail -n +"$((n + 1))" "$REACT_RELEASES"; } > "$tmp" \
      || { rm -f "$tmp"; die1 "étape 5 : $REACT_RELEASES"; }
    cat "$tmp" > "$REACT_RELEASES"; rm -f "$tmp"
    log "@msyx-dev/react : $REACT_CUR -> $REACT_NEW ([Unreleased] scellé)"
  else
    log "@msyx-dev/react : aucun bump ([Unreleased] $REACT_STATE)"
  fi

  # ---- 6. contrôles (un seul rc≠0 => rc 1) ---------------------------------------------------
  local KO=0
  bash shared/check-versions.sh            || { echo "release-bump : check-versions.sh rc≠0" >&2; KO=1; }
  node bin/generate-version-notes.js --check || { echo "release-bump : generate-version-notes.js --check rc≠0" >&2; KO=1; }
  bash shared/check-counters.sh            || { echo "release-bump : check-counters.sh rc≠0" >&2; KO=1; }
  node bin/generate-counters.js --check    || { echo "release-bump : generate-counters.js --check rc≠0" >&2; KO=1; }
  if [ "$(file_sig CHANGELOG.md)" != "$CL_SIG0" ]; then
    echo "release-bump : CHANGELOG.md a été modifié — le scellement appartient à version-release.sh" >&2
    KO=1
  fi
  [ "$KO" -eq 0 ] || die1 "contrôles finaux KO — arbre à restaurer par l'appelant"
  log "OK : $VERSION appliquée"
}

# ============================================================================================
cmd_tags() {
  local SHA=""
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --commit) [ "$#" -ge 2 ] || die2 "tags : --commit sans valeur"; SHA="$2"; shift 2 ;;
      *) die2 "tags : argument inconnu « $1 »" ;;
    esac
  done
  [ -n "$SHA" ] || die2 "tags : --commit <sha> requis"
  git rev-parse --verify --quiet "${SHA}^{commit}" >/dev/null || die1 "tags : commit invalide « $SHA »"
  git rev-parse --verify --quiet "${SHA}^" >/dev/null || die1 "tags : « $SHA » n'a pas de parent"
  local rc=0
  git diff --quiet "${SHA}^" "$SHA" -- "$REACT_PKG" || rc=$?
  case "$rc" in
    0) return 0 ;;   # React n'a pas bougé dans ce commit : aucun tag
    1) ;;            # React a bougé
    *) die1 "tags : git diff rc=$rc sur $SHA" ;;
  esac
  local ver
  ver="$(git show "${SHA}:$REACT_PKG" 2>/dev/null | grep -m1 -E '"version"[[:space:]]*:' \
        | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"
  [[ "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || die1 "tags : version React illisible à $SHA (« $ver »)"
  echo "tag=react-v$ver"
}

# ============================================================================================
[ "$#" -ge 1 ] || die2 "sous-commande requise"
SUB="$1"; shift
case "$SUB" in
  config) cmd_config "$@" ;;
  apply)  cmd_apply "$@" ;;
  tags)   cmd_tags "$@" ;;
  *)      die2 "sous-commande inconnue « $SUB »" ;;
esac
