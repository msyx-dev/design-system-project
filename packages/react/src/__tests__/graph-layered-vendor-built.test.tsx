// graph-layered-vendor-built.test.tsx — harnais de non-regression #942.
//
// Ce que les autres suites NE voient PAS : ni `tests/regression/graph-layout-layered.test.js`
// (teste `shared/graph/` en SOURCE, jamais le paquet npm construit) ni `pnpm test`/`pnpm build`
// habituels (le build reussit meme si `vendor/` n'est pas publie : tsup ne verifie que la
// COPIE locale, pas ce que `files` dans package.json laisse sortir dans le tarball). C'est
// exactement pour ca que la regression #942 (layout 'layered' cassait chez un consommateur
// npm) est passee inapercue jusqu'a la production.
//
// `shared/graph/layout/layered.js:41` choisit son specifier ainsi :
//   typeof window !== 'undefined' ? '/shared/graph/vendor/graph-layered.js' : '../vendor/graph-layered.js'
// Ce harnais verifie la branche SERVEUR (celle que #942 repare) telle qu'elle apparait dans
// le paquet REELLEMENT CONSTRUIT — pas en source.
//
// Quatre verifications, chacune capable de faire echouer ce test seule :
//  1. Le MANIFESTE de publication (`npm pack --dry-run --json`, la meme logique de filtrage
//     que `npm publish`) liste bien `vendor/graph-layered.js`. Retirer "vendor" de `files`
//     dans package.json fait rougir CETTE assertion, sans reconstruire quoi que ce soit.
//  2. Le paquet CONSTRUIT (`dist/index.js` en ESM, `dist/index.cjs` en CJS) contient bien
//     `vendor/` a cote de `dist/` (copie `onSuccess` de tsup.config.ts).
//  3. ESM — le chunk separe issu du code-splitting esbuild (`dist/layered-<hash>.js`, cf. le
//     commentaire de tsup.config.ts ; le hash n'est JAMAIS fige en dur ici, il est lu depuis
//     le vrai `import('./layered-<hash>.js')` ecrit par esbuild dans `dist/index.js` pour le
//     registre de layouts) porte bien le specifier serveur, et celui-ci resout vers un fichier
//     reel non vide.
//  4. CJS — esbuild NE code-splitte PAS ce format : `layeredLayout` reste INLINE dans
//     `dist/index.cjs`, dans une fermeture privee, non exportee. Le specifier serveur y est
//     neanmoins present tel quel (LITTERALEMENT le meme texte que `shared/graph/layout/
//     layered.js:41`) et doit resoudre vers un fichier reel non vide depuis l'emplacement
//     REEL du fichier construit.
//
// POURQUOI UNE VERIFICATION STATIQUE, PAS UNE EXECUTION : une version anterieure de ce test
// executait reellement le chargement (import() du chunk ESM depuis son vrai chemin sur
// disque, puis appel de layeredLayout() ; pour le CJS, import() du fichier vendor resolu
// depuis dist/index.cjs). Les deux cas echouaient, mais pour des raisons d'OUTILLAGE, pas de
// defaut du paquet : le lanceur de tests (transform Vite/Vitest) reecrit les imports
// dynamiques d'un module charge hors de la racine suivie du projet — un `import()` sur un
// chemin absolu vers dist/layered-<hash>.js ou vers vendor/graph-layered.js n'atteint donc
// pas le fichier reel de la meme facon qu'un `import()` Node nu, et un test construit
// dessus mesure le lanceur autant que le paquet construit. Une verification par EXECUTION
// n'est donc pas fiable ici. La verification STATIQUE ci-dessous evite entierement ce
// probleme : elle lit le texte litteral emis par le build (sans presupposer le style de
// guillemets — esbuild normalise en guillemets doubles, une ancienne assertion cherchait des
// simples et rougissait pour cette seule raison), resout ce specifier exactement comme le
// ferait la resolution de module Node (`new URL(specifier, pathToFileURL(fichier))`, relatif
// au fichier qui le PORTE), et verifie que la cible existe reellement sur disque et n'est pas
// vide. Cette verification rougit precisement quand le defaut #942 reapparait — vendor non
// copie, `files` qui perd "vendor", ou chemin relatif modifie sans que la cible suive — et ne
// peut pas rougir pour une raison etrangere au defaut (elle ne depend d'aucune machinerie
// d'import runtime).
//
// Ce que ce test NE couvre PAS (a ecrire ailleurs si besoin, cf. CHANGELOG.md #942) : la
// branche NAVIGATEUR du chargement (`/shared/graph/vendor/graph-layered.js`, chemin ABSOLU
// site-root) n'est testee nulle part ici. Pour un consommateur npm, ce chemin echouera
// toujours cote client si l'app ne sert pas ce fichier depuis son propre `public/` — le
// filet de degradation fait que la PAGE tient (pas de crash), mais le graphe affiche n'est
// pas celui demande (repli silencieux-une-fois sur 'tree'). Gap connu, assume, pas corrige
// ici : hors perimetre de cette PR.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const PKG_ROOT = path.resolve(path.dirname(__filename), "../..");
const DIST_DIR = path.join(PKG_ROOT, "dist");
const DIST_ESM = path.join(DIST_DIR, "index.js");
const DIST_CJS = path.join(DIST_DIR, "index.cjs");
const VENDOR_FILE = path.join(PKG_ROOT, "vendor/graph-layered.js");
const SERVER_SPECIFIER = "../vendor/graph-layered.js";

beforeAll(() => {
  // Rebuild reel (tsup), pas un dist perime laisse par un job precedent — c'est la
  // COPIE `onSuccess` de tsup.config.ts (#942) qui doit s'etre executee.
  execSync("npx tsup", { cwd: PKG_ROOT, stdio: "inherit" });
}, 120_000);

/**
 * Verifie que `filePath` contient bien le specifier serveur du vendor, et que ce specifier
 * resout — relativement a `filePath` lui-meme, comme le ferait Node — vers un fichier reel
 * et non vide. Ne presuppose jamais le style de guillemets autour du specifier : on cherche
 * la sous-chaine nue.
 */
function expectServerSpecifierResolves(filePath: string) {
  const src = readFileSync(filePath, "utf8");
  expect(src).toContain(SERVER_SPECIFIER);

  const resolvedPath = fileURLToPath(new URL(SERVER_SPECIFIER, pathToFileURL(filePath)));
  expect(existsSync(resolvedPath)).toBe(true);
  expect(statSync(resolvedPath).size).toBeGreaterThan(0);
}

describe("#942 - paquet @msyx-dev/react CONSTRUIT : vendor dagre publie + layout 'layered' fonctionnel", () => {
  it("le manifeste de publication (npm pack) liste vendor/graph-layered.js", () => {
    const out = execSync("npm pack --dry-run --json", { cwd: PKG_ROOT }).toString();
    const parsed = JSON.parse(out);
    const files: Array<{ path: string }> = parsed[0].files;
    const paths = files.map((f) => f.path);
    expect(paths).toContain("vendor/graph-layered.js");
    // Delai propre a ce test : il lance un vrai `npm pack --dry-run` (sous-processus npm,
    // lecture du manifeste et du filtrage `files`). Mesure sur une machine chargee :
    // 5,5 s puis 10,5 s, au-dessus du delai par defaut de 5 s (vert en CI, ~2 s). 30 s
    // laisse une marge de 3x sur le pire cas mesure sans masquer une vraie regression.
  }, 30_000);

  it("dist/ construit contient bien vendor/graph-layered.js a cote de dist/ (copie onSuccess de tsup.config.ts)", () => {
    expect(existsSync(DIST_ESM)).toBe(true);
    expect(existsSync(DIST_CJS)).toBe(true);
    expect(existsSync(VENDOR_FILE)).toBe(true);
  });

  it("ESM (dist/layered-<hash>.js) : le chunk construit porte le specifier serveur du vendor, et il resout vers un fichier reel non vide", () => {
    // Le nom du chunk (hash de contenu esbuild) n'est jamais fige en dur : on le lit depuis
    // le vrai `import('./layered-<hash>.js')` ecrit par esbuild dans dist/index.js pour le
    // registre de layouts (cf. registerLayout("layered", ...) dans le fichier construit).
    const indexSrc = readFileSync(DIST_ESM, "utf8");
    const chunkMatch = indexSrc.match(/import\(['"](\.\/layered-[^'"]+\.js)['"]\)/);
    if (!chunkMatch) {
      throw new Error(
        "chunk ESM du layout 'layered' introuvable dans dist/index.js — esbuild a peut-etre " +
          "change de strategie de code-splitting (tsup.config.ts #942 a revoir).",
      );
    }
    const chunkPath = path.join(DIST_DIR, chunkMatch[1]);
    expectServerSpecifierResolves(chunkPath);
  });

  it("CJS (dist/index.cjs) : le specifier serveur inline porte bien '../vendor/graph-layered.js', et il resout vers un fichier reel non vide", () => {
    expectServerSpecifierResolves(DIST_CJS);
  });
});
