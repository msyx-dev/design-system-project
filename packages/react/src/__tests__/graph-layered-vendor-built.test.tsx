// graph-layered-vendor-built.test.tsx — harnais de non-regression #942.
//
// Ce que les autres suites NE voient PAS : ni `tests/regression/graph-layout-layered.test.js`
// (teste `shared/graph/` en SOURCE, jamais le paquet npm construit) ni `pnpm test`/`pnpm build`
// habituels (le build reussit meme si `vendor/` n'est pas publie : tsup ne verifie que la
// COPIE locale, pas ce que `files` dans package.json laisse sortir dans le tarball). C'est
// exactement pour ca que la regression #942 (layout 'layered' cassait chez un consommateur
// npm) est passee inapercue jusqu'a la production.
//
// Deux verifications, chacune capable de faire echouer ce test seule :
//  1. Le MANIFESTE de publication (`npm pack --dry-run --json`, la meme logique de filtrage
//     que `npm publish`) liste bien `vendor/graph-layered.js`. Retirer "vendor" de `files`
//     dans package.json fait rougir CETTE assertion, sans reconstruire quoi que ce soit.
//  2. Le paquet CONSTRUIT (`dist/index.js` en ESM, `dist/index.cjs` en CJS — deux resolutions
//     de specifier differentes, cf. tsup.config.ts) rend reellement `<Graph layout="layered">`
//     et le calcule bien via dagre : aucun avertissement de repli sur `tree` (#942 point b)
//     n'est emis. Un repli silencieux serait un FAUX POSITIF pour un simple "ca ne plante
//     pas" — le graphe rendu ne serait pas celui demande.
//
// Ce que ce test NE couvre PAS (a ecrire ailleurs si besoin) : la branche NAVIGATEUR du
// chargement (`/shared/graph/vendor/graph-layered.js`, chemin absolu servi depuis site-root)
// n'est testee nulle part ici — elle reste un gap connu pour un consommateur npm qui ne sert
// pas ce chemin depuis son `public/`, cf. CHANGELOG.md #942.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

const __filename = fileURLToPath(import.meta.url);
const PKG_ROOT = path.resolve(path.dirname(__filename), "../..");
const DIST_ESM = path.join(PKG_ROOT, "dist/index.js");
const DIST_CJS = path.join(PKG_ROOT, "dist/index.cjs");
const VENDOR_FILE = path.join(PKG_ROOT, "vendor/graph-layered.js");
const FALLBACK_MARKER = "layout 'layered' indisponible";

afterEach(cleanup);

beforeAll(() => {
  // Rebuild reel (tsup), pas un dist perime laisse par un job precedent — c'est la
  // COPIE `onSuccess` de tsup.config.ts (#942) qui doit s'etre executee.
  execSync("npx tsup", { cwd: PKG_ROOT, stdio: "inherit" });
}, 120_000);

function sampleGraph() {
  return {
    nodes: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "c" } }],
    edges: [
      { data: { id: "e1", source: "a", target: "b", directed: true } },
      { data: { id: "e2", source: "b", target: "c", directed: true } },
    ],
  };
}

/** Rend <Graph layout="layered">, laisse le dynamic import()/dagre se resoudre, renvoie les erreurs console captees. */
async function renderLayeredAndCollectErrors(Graph: any): Promise<unknown[][]> {
  const errors: unknown[][] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
  const { nodes, edges } = sampleGraph();
  const { container } = render(<Graph layout="layered" nodes={nodes} edges={edges} />);
  await waitFor(() => {
    expect(container.querySelector("svg")).toBeTruthy();
  });
  // Le repaint du moteur precede la resolution du dynamic import() (#670/#942) :
  // laisse le temps a la microtask/macrotask de la promesse de vendor de se vider.
  await new Promise((resolve) => setTimeout(resolve, 200));
  spy.mockRestore();
  return errors;
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

  it("ESM (dist/index.js) : layout 'layered' resout le vendor et calcule reellement dagre (pas de repli 'tree')", async () => {
    const mod: any = await import(/* @vite-ignore */ DIST_ESM);
    const errors = await renderLayeredAndCollectErrors(mod.Graph);
    const fellBack = errors.some((args) => String(args[0] ?? "").includes(FALLBACK_MARKER));
    expect(fellBack).toBe(false);
  });

  it("CJS (dist/index.cjs) : meme resolution (specifier relatif differe de l'ESM, cf. tsup.config.ts), meme absence de repli", async () => {
    const require = createRequire(import.meta.url);
    delete require.cache[require.resolve(DIST_CJS)];
    const mod = require(DIST_CJS);
    const errors = await renderLayeredAndCollectErrors(mod.Graph);
    const fellBack = errors.some((args) => String(args[0] ?? "").includes(FALLBACK_MARKER));
    expect(fellBack).toBe(false);
  });
});
