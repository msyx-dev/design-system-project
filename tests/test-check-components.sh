#!/usr/bin/env bash
# test-check-components.sh — preuve de la passe « orphelins » de check-components.sh (issue #938, T3)
#
# Le defaut du ticket : un composant LIVRE par sync.sh (ses classes sont dans les copies
# ds-*.css du consommateur) et jamais MONTE dans son code — cas d'ecole, <SiteHeader> sans la
# prop `versionNotes` : le badge de version est livre et absent de l'ecran. check-components.sh
# ne lisait que les CSS du consommateur et ne voyait pas ce sens-la. La passe est opt-in :
# `check-components.sh --orphans=<src> <css>` (moteur : bin/lib/check-orphans.js).
#
# Cas A a I de la spec #938 (+ cas J, #967) (les fixtures sont reconstruites dans un tmp, le cas keepthread de
# claude-config#435 n'est pas utilise) :
#   A  sans --orphans : aucune section orphelins ; un .btn-maison local -> rc=1 + WARNING
#   B  SiteHeader + versionNotes={...}            -> rc=0, pas de STRUCTUREL, liste informative non vide
#   C  SiteHeader SANS versionNotes               -> rc=1, ORPHELIN-STRUCTUREL version-notes (le defaut)
#   D  C + AppHeader.test.tsx qui cite version-badge -> rc=1 toujours (tests exclus du corpus)
#   E  app vanilla, <script src="/styles/ds-nav.js"> -> version-notes + site-header consommes ;
#      sans la balise -> les deux ORPHELIN-STRUCTUREL
#   F  C + `orphelin:version-notes` au .ds-allowlist -> rc=0, ORPHELIN-ACCEPTÉ
#   G  `import { Modal as M }` -> modal consomme ; `import type { VersionBadge }` seul -> reste orphelin
#   H  source qui n'utilise que btn-icon/icon/header-notification -> user-feedback reste ORPHELIN
#   I  sync.sh --components=core : entree dont aucune classe n'est dans les copies core -> non livree
#   J  passe historique (#967) : copies DS propres en sync complet et core, step CI shared/css rc=0,
#      et les copies components/ restent scannees (un modificateur non enregistre y est signale)
#
# FIXTURES PAR LE VRAI sync.sh : si sync.sh change ce qu'il distribue, ce test le voit.
#
# PASSE HISTORIQUE : depuis #967, elle sort rc=0 sur un dossier synchronise sans AUCUNE allowlist,
# grace aux modificateurs composes (`.tooltip.tooltip--bottom`...) enregistres au registre. Le cas J
# l'epingle et prouve que les copies `components/` restent scannees.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Nombre d'assertions attendu : garde-fou contre une suite « verte » qui a saute des cas.
EXPECTED_CHECKS=52

PASS=0
FAIL=0
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

OUT=""
RC=0

# --- assertions ---------------------------------------------------------------
# Les tests de contenu utilisent `grep -q ... <<< "$OUT"`, jamais `echo "$OUT" | grep -q` :
# sous pipefail, grep -q quitte au 1er match, echo prend SIGPIPE et le pipeline vaut 141 (flaky).
rc_is() { [ "$RC" -eq "$1" ]; }
has() { grep -qE -- "$1" <<< "$OUT"; }
lacks() { ! grep -qE -- "$1" <<< "$OUT"; }

check() {
  local label="$1"; shift
  if "$@"; then
    echo "  PASS: $label"; PASS=$((PASS+1))
  else
    echo "  FAIL: $label (rc=$RC)"
    sed 's/^/      | /' <<< "$OUT" | tail -n 25
    FAIL=$((FAIL+1))
  fi
}

# --- fixtures -----------------------------------------------------------------
# make_template <nom> [options sync.sh...] : UN vrai sync.sh par variante, copie ensuite par
# new_consumer (equivalent a un sync par fixture, en 10x moins de temps).
make_template() {
  local name="$1"; shift
  local dir="$WORK/tpl-$name"
  mkdir -p "$dir/styles"
  bash shared/sync.sh "$@" "$dir/styles" > /dev/null 2>&1
}

# new_consumer <nom-fixture> <template> : copie styles/ du template, cree src/
new_consumer() {
  local dir="$WORK/$1"
  mkdir -p "$dir/src"
  cp -a "$WORK/tpl-$2/styles" "$dir/styles"
  printf '%s' "$dir"
}

app_with_prop() {
  mkdir -p "$1/src/components"
  cat > "$1/src/components/AppHeader.tsx" <<'EOF'
import { SiteHeader } from "@msyx-dev/react";

export function AppHeader() {
  return <SiteHeader versionNotes={{ current: "1.0.0", released: [] }} />;
}
EOF
}

app_without_prop() {
  mkdir -p "$1/src/components"
  cat > "$1/src/components/AppHeader.tsx" <<'EOF'
import { SiteHeader } from "@msyx-dev/react";

export function AppHeader() {
  return <SiteHeader />;
}
EOF
}

run_plain()   { OUT="$(bash shared/check-components.sh "$1/styles" 2>&1)"; RC=$?; }
run_orphans() { OUT="$(bash shared/check-components.sh --orphans="$1/src" "$1/styles" 2>&1)"; RC=$?; }

# Motifs de lignes de sortie (prefixes figes par la spec : en debut de ligne, puis espaces, puis le nom)
struct_of() { printf '^ORPHELIN-STRUCTUREL +%s ' "$1"; }
orphan_of() { printf '^ORPHELIN +%s ' "$1"; }
any_of()    { printf '^ORPHELIN(-STRUCTUREL|-ACCEPTÉ)? +%s( |$)' "$1"; }

echo "Preparation : sync.sh reel (defaut) + sync.sh --components=core..."
make_template full
# Le template core ne sert qu'aux cas I et J : saute quand CASES les exclut (rejeu de mutation).
if [ -z "${CASES:-}" ] || [[ " $CASES " == *" I "* ]] || [[ " $CASES " == *" J "* ]]; then
  make_template core --components=core
fi

case_A() {
# --- Cas A : sans --orphans -----------------------------------------------------
echo "Cas A: sans --orphans — consommateur synchronise, puis avec un .btn-maison local"
A="$(new_consumer A full)"
run_plain "$A"
check "A1 consommateur synchronise, sans allowlist -> rc=0" rc_is 0
check "A1b garde-fou : aucun .ds-allowlist dans la fixture" test ! -e "$A/styles/.ds-allowlist"
check "A2 aucune section « Passe orphelins » sans le drapeau" lacks 'Passe orphelins'
check "A3 aucun prefixe ORPHELIN sans le drapeau" lacks '^(ORPHELIN|NON-MESURABLE)'
printf '.btn-maison { color: red; }\n' > "$A/styles/local.css"
run_plain "$A"
check "A4 .btn-maison local -> rc=1" rc_is 1
check "A5 WARNING sur .btn-maison, et sur elle seule (Avertissements : 1)" has '^  Classe  : \.btn-maison$'
check "A6 un seul avertissement (aucune allowlist) : .btn-maison seule" has '^Avertissements : 1$'
check "A7 toujours aucune section « Passe orphelins »" lacks 'Passe orphelins'
# Variante de la spec (« sans CSS local ») : sans les copies components/, la passe historique ne
# trouve aucun CSS hors ds-*.css et sort par la branche « INFO : aucun fichier CSS » — un AUTRE
# garde du drapeau que celui de la fin du script.
A0="$(new_consumer A0 full)"
rm -rf "$A0/styles/components"
run_plain "$A0"
check "A8 sans CSS local, sans drapeau : INFO aucun fichier CSS" has '^INFO: aucun fichier CSS'
check "A8b sans CSS local, sans drapeau : rc=0 (le garde du drapeau sort avant la passe orphelins)" rc_is 0
check "A9 sans CSS local, sans drapeau : aucune section « Passe orphelins »" lacks 'Passe orphelins'
}

case_B() {
# --- Cas B : le montage canonique ------------------------------------------------
echo "Cas B: SiteHeader + versionNotes={...} — rc=0, liste informative non vide"
B="$(new_consumer B full)"; app_with_prop "$B"
run_orphans "$B"
check "B1 rc=0" rc_is 0
check "B2 en-tete « === Passe orphelins (#938) === »" has '^=== Passe orphelins \(#938\) ===$'
check "B3 aucun ORPHELIN-STRUCTUREL" lacks '^ORPHELIN-STRUCTUREL'
check "B4 au moins un ORPHELIN informatif (la liste n'est pas vide)" has '^ORPHELIN '
check "B5 version-notes consomme par S3 (versionNotes={) : absent des lignes ORPHELIN*" lacks "$(any_of version-notes)"
check "B6 site-header consomme par S2 (import) : absent des lignes ORPHELIN*" lacks "$(any_of site-header)"
}

case_C() {
# --- Cas C : le defaut du ticket ---------------------------------------------------
echo "Cas C: SiteHeader SANS versionNotes — le defaut du ticket, reconstruit"
C="$(new_consumer C full)"; app_without_prop "$C"
run_orphans "$C"
check "C1 rc=1" rc_is 1
check "C2 ORPHELIN-STRUCTUREL version-notes" has "$(struct_of version-notes)"
check "C3 verdict FAIL nommant 1 composant structurant" has '^FAIL — 1 composant\(s\) structurant\(s\) livré\(s\) et jamais monté\(s\)'
check "C4 site-header reste consomme (import) : un seul structurel" lacks "$(any_of site-header)"
}

case_D() {
# --- Cas D : les tests sont exclus du corpus ------------------------------------------
echo "Cas D: C + AppHeader.test.tsx qui cite version-badge — les tests ne comptent pas"
D="$(new_consumer D full)"; app_without_prop "$D"
cat > "$D/src/components/AppHeader.test.tsx" <<'EOF'
import { render } from "@testing-library/react";
import { AppHeader } from "./AppHeader";

it("ne monte pas le badge", () => {
  const { container } = render(<AppHeader />);
  expect(container.querySelector(".version-badge")).toBeNull();
});
EOF
run_orphans "$D"
check "D1 rc=1 malgre la citation de .version-badge dans un test" rc_is 1
check "D2 ORPHELIN-STRUCTUREL version-notes" has "$(struct_of version-notes)"
# Garde-fou : le MEME fichier, renomme hors `.test.`, consomme version-notes. Sans cela, D
# ne prouverait rien (la citation pourrait etre inoperante de toute facon).
mv "$D/src/components/AppHeader.test.tsx" "$D/src/components/AppHeaderSpecimen.tsx"
run_orphans "$D"
check "D3 garde-fou : le meme fichier hors *.test.* consomme version-notes (fixture valide)" lacks "$(struct_of version-notes)"
}

case_E() {
# --- Cas E : shell Niveau C ---------------------------------------------------------------
echo "Cas E: app vanilla — ds-nav.js charge vs seulement present sur disque"
E1="$(new_consumer E1 full)"
printf '<!doctype html>\n<script src="/styles/ds-nav.js"></script>\n' > "$E1/src/index.html"
run_orphans "$E1"
check "E1 ds-nav.js charge : rc=0" rc_is 0
check "E2 version-notes consomme par S4" lacks "$(any_of version-notes)"
check "E3 site-header consomme par S4" lacks "$(any_of site-header)"
E2="$(new_consumer E2 full)"
printf '<!doctype html>\n<p>vanilla, sans shell</p>\n' > "$E2/src/index.html"
run_orphans "$E2"
check "E4 sans la balise : rc=1" rc_is 1
check "E5 sans la balise : version-notes ORPHELIN-STRUCTUREL" has "$(struct_of version-notes)"
check "E6 sans la balise : site-header ORPHELIN-STRUCTUREL" has "$(struct_of site-header)"
check "E7 garde-fou : ds-nav.js est PRESENT sur disque dans les deux fixtures (sa presence ne vaut rien)" \
  test -f "$E1/styles/ds-nav.js" -a -f "$E2/styles/ds-nav.js"
}

case_F() {
# --- Cas F : echappatoire ---------------------------------------------------------------
echo "Cas F: C + orphelin:version-notes au .ds-allowlist — ecart assume, visible, non bloquant"
F="$(new_consumer F full)"; app_without_prop "$F"
printf '# badge de version volontairement absent (app interne, pas de notes de version)\norphelin:version-notes\n' >> "$F/styles/.ds-allowlist"
run_orphans "$F"
check "F1 rc=0" rc_is 0
check "F2 ligne « ORPHELIN-ACCEPTÉ     version-notes »" has '^ORPHELIN-ACCEPTÉ {5}version-notes( |$)'
check "F3 plus aucun ORPHELIN-STRUCTUREL" lacks '^ORPHELIN-STRUCTUREL'
}

case_G() {
# --- Cas G : import React (alias, import type) -------------------------------------------
echo "Cas G: S2 — alias accepte, import type refuse"
G0="$(new_consumer G0 full)"
printf 'export const rien = 1;\n' > "$G0/src/rien.ts"
run_orphans "$G0"
check "G1 garde-fou : sans import, modal est ORPHELIN (livre, non monte)" has "$(orphan_of modal)"
G1="$(new_consumer G1 full)"
printf 'import { Modal as M } from "@msyx-dev/react";\nexport const X = M;\n' > "$G1/src/x.tsx"
run_orphans "$G1"
check "G2 import { Modal as M } : modal absent des lignes ORPHELIN*" lacks "$(any_of modal)"
G2="$(new_consumer G2 full)"
# Noms PRESENTS dans reactExports de version-notes : c'est ce qui fait mordre la mutation
# « accepter import type ».
printf "import type { VersionNotesProps } from \"@msyx-dev/react\";\nimport type { VersionBadge } from '@msyx-dev/react';\nexport type T = VersionBadge;\n" > "$G2/src/t.ts"
run_orphans "$G2"
check "G3 import type { VersionBadge } seul : version-notes reste ORPHELIN-STRUCTUREL" has "$(struct_of version-notes)"
check "G4 garde-fou : VersionBadge figure bien dans reactExports de version-notes" \
  node -e 'const r=require("./shared/components-registry.json");const c=r.components.find(x=>x.name==="version-notes");process.exit((c.reactExports||[]).includes("VersionBadge")?0:1)'
}

case_H() {
# --- Cas H : classes discriminantes ---------------------------------------------------------
echo "Cas H: S1 — btn-icon / icon / header-notification ne suffisent pas a consommer user-feedback"
H="$(new_consumer H full)"
printf '<button class="btn-icon icon header-notification" aria-label="Retour">x</button>\n' > "$H/src/index.html"
run_orphans "$H"
check "H1 user-feedback reste ORPHELIN (classes partagees, non discriminantes)" has "$(orphan_of user-feedback)"
# Garde-fou : ces 3 classes sont bien dans user-feedback ET partagees avec une autre entree
# non-module. Sans cela, la mutation « toutes les classes » ne pourrait pas faire rougir H.
check "H2 garde-fou : les 3 classes sont listees par user-feedback et partagees avec >= 1 autre entree" \
  node -e '
    const r=require("./shared/components-registry.json");
    const scope=r.components.filter(c=>c.kind!=="module");
    const uf=scope.find(c=>c.name==="user-feedback");
    const ok=[".btn-icon",".icon",".header-notification"].every(cls =>
      (uf.cssClasses||[]).includes(cls) && scope.filter(c=>(c.cssClasses||[]).includes(cls)).length>=2);
    process.exit(ok?0:1)'
}

case_I() {
# --- Cas I : --components=core ----------------------------------------------------------
echo "Cas I: sync.sh --components=core — une entree hors core n'est pas « livree »"
# lightbox : non structurel, aucune de ses classes simples n'est definie dans les copies core (garde-fou I5). kanban, essaye d'abord, ne convenait pas : le garde-fou I5 a montre qu'une de ses classes est deja definie dans les copies toujours livrees.
ENTRY=lightbox
I1="$(new_consumer I1 full)"; app_with_prop "$I1"
run_orphans "$I1"
check "I1 garde-fou : en sync complet, $ENTRY est ORPHELIN (livre, non monte)" has "$(orphan_of $ENTRY)"
NL_FULL="$(grep -oP 'non livrées : \K[0-9]+' <<< "$OUT")"
I2="$(new_consumer I2 core)"; app_with_prop "$I2"
run_orphans "$I2"
NL_CORE="$(grep -oP 'non livrées : \K[0-9]+' <<< "$OUT")"
check "I2 en --components=core : rc=0" rc_is 0
check "I3 en --components=core : $ENTRY absent des lignes ORPHELIN*" lacks "$(any_of $ENTRY)"
check "I4 « non livrées » augmente avec core ($NL_FULL -> $NL_CORE)" test "${NL_CORE:-0}" -gt "${NL_FULL:-0}"
check "I5 garde-fou : aucune classe simple de $ENTRY n'est definie dans les copies core" \
  node -e '
    const fs=require("fs"),path=require("path");
    const dir=process.argv[1];
    const r=require("./shared/components-registry.json");
    const cls=r.components.find(c=>c.name===process.argv[2]).cssClasses.filter(x=>/^\.[A-Za-z][A-Za-z0-9_-]*$/.test(x));
    const files=[...fs.readdirSync(dir).filter(f=>/^ds-.*\.css$/.test(f)).map(f=>path.join(dir,f)),
                 ...fs.readdirSync(path.join(dir,"components")).map(f=>path.join(dir,"components",f))];
    const css=files.map(f=>fs.readFileSync(f,"utf8").replace(/\/\*[\s\S]*?\*\//g," ")).join("\n");
    const hit=cls.some(c=>new RegExp("\\"+c+"(?![A-Za-z0-9_-])").test(css));
    process.exit(hit?1:0)' "$I2/styles" "$ENTRY"
}

case_J() {
# --- Cas J : passe historique sur copies DS (#967) -----------------------------------------
echo "Cas J: passe historique — copies DS propres, registre complet, copies toujours scannees"
J1="$(new_consumer J1 full)"
run_plain "$J1"
check "J1 sync complet, sans allowlist -> rc=0" rc_is 0
check "J2 sync complet : Avertissements : 0" has '^Avertissements : 0$'
J3="$(new_consumer J3 core)"
run_plain "$J3"
check "J3 sync --components=core, sans allowlist -> rc=0" rc_is 0
check "J4 sync core : Avertissements : 0" has '^Avertissements : 0$'
OUT="$(bash shared/check-components.sh shared/css 2>&1)"; RC=$?
check "J5 le step CI (check-components.sh shared/css) -> rc=0" rc_is 0
# Garde-fou : les copies components/ restent scannees. Un modificateur DS non enregistre
# dans une copie est signale ; c'est ce qui rend le step CI bloquant utile.
J6="$(new_consumer J6 full)"
printf '.tooltip.tooltip--top { top: 0; }\n' >> "$J6/styles/components/overlays.css"
run_plain "$J6"
check "J6 modificateur non enregistre dans une copie components/ -> rc=1" rc_is 1
check "J7 WARNING nomme .tooltip--top dans components/overlays.css" has '^  Classe  : \.tooltip--top$'
}

# Execution : tous les cas, ou ceux de CASES (ex. CASES="B D") pour rejouer une mutation.
for c in ${CASES:-A B C D E F G H I J}; do "case_$c"; done

# --- Bilan -----------------------------------------------------------------------------------
echo ""
echo "Resultats : $PASS PASS, $FAIL FAIL (assertions attendues : $EXPECTED_CHECKS)"
if [ -z "${CASES:-}" ] && [ "$((PASS+FAIL))" -ne "$EXPECTED_CHECKS" ]; then
  echo "ECHEC : $((PASS+FAIL)) assertions executees au lieu de $EXPECTED_CHECKS — un cas a ete saute ou ajoute sans mettre a jour EXPECTED_CHECKS"
  exit 1
fi
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "Tous les tests OK"
exit 0
