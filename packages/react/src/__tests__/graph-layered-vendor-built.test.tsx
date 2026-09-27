// @vitest-environment node
//
// graph-layered-vendor-built.test.tsx — harnais de non-regression #942.
//
// Ce que les autres suites NE voient PAS : ni `tests/regression/graph-layout-layered.test.js`
// (teste `shared/graph/` en SOURCE, jamais le paquet npm construit) ni `pnpm test`/`pnpm build`
// habituels (le build reussit meme si `vendor/` n'est pas publie : tsup ne verifie que la
// COPIE locale, pas ce que `files` dans package.json laisse sortir dans le tarball). C'est
// exactement pour ca que la regression #942 (layout 'layered' cassait chez un consommateur
// npm) est passee inapercue jusqu'a la production.
//
// ENVIRONNEMENT `node`, PAS `jsdom` (correction du ciblage, groom #11) : `shared/graph/
// layout/layered.js:41` choisit son specifier ainsi :
//   typeof window !== 'undefined' ? '/shared/graph/vendor/graph-layered.js' : '../vendor/graph-layered.js'
// Sous jsdom, `window` EXISTE toujours (c'est le but de jsdom) — la suite precedente heritait
// donc de l'environnement `jsdom` global du paquet (vitest.config.ts:7) et exercait a chaque
// fois la branche NAVIGATEUR (chemin absolu site-root, que rien ne sert dans un test), jamais
// la branche SERVEUR que ce correctif #942 repare. Les 2 cas ci-dessous echouaient pour une
// vraie raison (repli sur 'tree' detecte), mais ne testaient pas ce qu'ils pretendaient tester.
// `environment: node` retire `window` du global — condition necessaire pour forcer la branche
// serveur — mais retire aussi tout DOM : un `render()` `@testing-library/react` est donc exclu
// ici (pas de `document`). Ce n'est pas une perte : ce qui compte est de prouver que le
// CHARGEMENT DU VENDOR reussit depuis le paquet CONSTRUIT, pas de faire peindre un `<svg>` par
// React — cf. le detail par cas ci-dessous.
//
// Quatre verifications, chacune capable de faire echouer ce test seule :
//  1. Le MANIFESTE de publication (`npm pack --dry-run --json`, la meme logique de filtrage
//     que `npm publish`) liste bien `vendor/graph-layered.js`. Retirer "vendor" de `files`
//     dans package.json fait rougir CETTE assertion, sans reconstruire quoi que ce soit.
//  2. Le paquet CONSTRUIT (`dist/index.js` en ESM, `dist/index.cjs` en CJS) contient bien
//     `vendor/` a cote de `dist/` (copie `onSuccess` de tsup.config.ts).
//  3. ESM — appel DIRECT de `layeredLayout()` : esbuild code-splitte le format ESM sur la
//     frontiere du dynamic import (cf. le commentaire de tsup.config.ts sur `dist/layered-
//     <hash>.js`) — `dist/index.js` delegue via `import('./layered-<hash>.js').then(m =>
//     m.layeredLayout(...))`. Ce chunk separe EXPORTE reellement `layeredLayout` (effet de
//     bord du code-splitting d'esbuild, pas une API publique intentionnelle du paquet — le
//     hash n'est donc JAMAIS fige en dur ici, il est lu depuis le vrai `import()` ecrit par
//     esbuild dans `dist/index.js`). On l'appelle directement, sans passer par `<Graph>` :
//     c'est la forme la plus directe pour ce format, et elle exerce la VRAIE resolution
//     relative depuis le VRAI fichier construit.
//  4. CJS — pas de chunk separe : esbuild NE code-splitte PAS le format CJS, `layeredLayout`
//     reste INLINE dans `dist/index.cjs`, dans une fermeture privee (mecanique `__esm`/
//     `layered_exports` d'esbuild pour simuler l'ex-dynamic-import interne au registre de
//     layouts) — elle n'est exposee ni sur `module.exports`, ni ailleurs. Impossible de
//     l'appeler PAR SON NOM depuis l'exterieur sans modifier le build (hors perimetre #942).
//     Ce test verifie donc directement ce dont depend `loadDagre()` pour ce format : que le
//     specifier relatif '../vendor/graph-layered.js' (LITTERALEMENT le meme texte que la
//     branche serveur de `shared/graph/layout/layered.js:41`, cf. aussi le commentaire de
//     tsup.config.ts sur la profondeur partagee `dist/index.cjs` / `dist/vendor`) resout ET
//     s'EXECUTE bien depuis l'emplacement REEL du fichier construit (`dist/index.cjs`), via
//     la resolution d'URL Node reelle (`new URL(specifier, base)`) — pas une reconstruction
//     manuelle de chemin qui ne prouverait que nos propres maths. Preuve plus indirecte que
//     le cas ESM (on ne "declenche" pas le code inline), mais c'est la meilleure preuve
//     directe disponible pour cette forme de bundle sans toucher au perimetre du correctif.
//
// Dans les DEUX cas 3 et 4, l'exigence du harnais initial est conservee : on verifie
// l'ABSENCE d'avertissement de repli (`FALLBACK_MARKER`), pas l'absence de plantage — le
// filet de degradation (#942 point b) rend desormais le plantage impossible, donc un test
// "ca ne plante pas" serait un FAUX POSITIF permanent. Le cas 3 espionne `console.error`
// autour de l'appel reel ; le cas 4 charge et execute reellement le module vendor et verifie
// sa forme utilisable (`graphlib.Graph`, `layout`) — un dagre reellement charge ne peut pas,
// par construction du code source, avoir declenche l'avertissement de repli.
//
// Ce que ce test NE couvre PAS (a ecrire ailleurs si besoin, cf. CHANGELOG.md #942) : la
// branche NAVIGATEUR du chargement (`/shared/graph/vendor/graph-layered.js`, chemin ABSOLU
// site-root) n'est testee nulle part ici. Pour un consommateur npm, ce chemin echouera
// toujours cote client si l'app ne sert pas ce fichier depuis son propre `public/` — le
// filet de degradation fait que la PAGE tient (pas de crash), mais le graphe affiche n'est
// pas celui demande (repli silencieux-une-fois sur 'tree'). Gap connu, assume, pas corrige
// ici : hors perimetre de cette PR.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const PKG_ROOT = path.resolve(path.dirname(__filename), "../..");
const DIST_DIR = path.join(PKG_ROOT, "dist");
const DIST_ESM = path.join(DIST_DIR, "index.js");
const DIST_CJS = path.join(DIST_DIR, "index.cjs");
const VENDOR_FILE = path.join(PKG_ROOT, "vendor/graph-layered.js");
const FALLBACK_MARKER = "layout 'layered' indisponible";
const SERVER_SPECIFIER = "../vendor/graph-layered.js";

beforeAll(() => {
  // Rebuild reel (tsup), pas un dist perime laisse par un job precedent — c'est la
  // COPIE `onSuccess` de tsup.config.ts (#942) qui doit s'etre executee.
  execSync("npx tsup", { cwd: PKG_ROOT, stdio: "inherit" });
}, 120_000);

/** Forme minimale attendue par `layeredLayout(model, opts)` — pas besoin d'un vrai GraphModel. */
function sampleGraph() {
  return {
    nodes: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "c" } }],
    edges: [
      { data: { id: "e1", source: "a", target: "b", directed: true } },
      { data: { id: "e2", source: "b", target: "c", directed: true } },
    ],
  };
}

describe("#942 - paquet @msyx-dev/react CONSTRUIT : vendor dagre publie + layout 'layered' fonctionnel", () => {
  it("le manifeste de publication (npm pack) liste vendor/graph-layered.js", () => {
    const out = execSync("npm pack --dry-run --json", { cwd: PKG_ROOT }).toString();
    const parsed = JSON.parse(out);
    const files: Array<{ path: string }> = parsed[0].files;
    const paths = files.map((f) => f.path);
    expect(paths).toContain("vendor/graph-layered.js");
  });

  it("dist/ construit contient bien vendor/graph-layered.js a cote de dist/ (copie onSuccess de tsup.config.ts)", () => {
    expect(existsSync(DIST_ESM)).toBe(true);
    expect(existsSync(DIST_CJS)).toBe(true);
    expect(existsSync(VENDOR_FILE)).toBe(true);
  });

  it("ESM (dist/index.js) : appel direct de layeredLayout() depuis le chunk construit — resout le vendor et calcule reellement dagre (pas de repli 'tree')", async () => {
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

    const errors: unknown[][] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
    const mod: any = await import(/* @vite-ignore */ pathToFileURL(chunkPath).href);
    const positions: Map<string, { x: number; y: number }> = await mod.layeredLayout(sampleGraph(), {});
    spy.mockRestore();

    const fellBack = errors.some((args) => String(args[0] ?? "").includes(FALLBACK_MARKER));
    expect(fellBack).toBe(false);
    expect(positions.size).toBe(3);
  });

  it("CJS (dist/index.cjs) : le specifier serveur inline ('../vendor/graph-layered.js') resout et s'execute bien depuis l'emplacement reel du fichier construit", async () => {
    // layeredLayout() est INLINE dans dist/index.cjs (esbuild ne code-splitte pas le format
    // CJS) et n'est exportee nulle part : impossible de l'appeler par son nom sans modifier
    // le build. On verifie donc ce dont depend loadDagre() pour ce format — meme specifier
    // texte que la branche serveur source, resolu ET execute depuis le VRAI dist/index.cjs.
    const cjsSrc = readFileSync(DIST_CJS, "utf8");
    expect(cjsSrc).toContain(`'${SERVER_SPECIFIER}'`);

    const resolvedUrl = new URL(SERVER_SPECIFIER, pathToFileURL(DIST_CJS)).href;
    const mod: any = await import(/* @vite-ignore */ resolvedUrl);
    const dagre = mod.default ?? mod;
    expect(typeof dagre.layout).toBe("function");
    expect(typeof dagre.graphlib?.Graph).toBe("function");
  });
});
