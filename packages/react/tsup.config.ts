import { defineConfig } from "tsup";
import { readFile, writeFile } from "node:fs/promises";

// #703 : le barrel `dist/index.js`/`dist/index.cjs` n'avait AUCUNE
// directive "use client" en tete, cassant l'import de @msyx-dev/react
// depuis un Server Component (Next 15 App Router) — decouvert sur
// <PageHeader>, alpha.14.
const USE_CLIENT_DIRECTIVE = '"use client";\n';
const CLIENT_ENTRY_FILES = ["dist/index.js", "dist/index.cjs"];

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
  target: "es2020",
  outDir: "dist",
  // NOTE : l'option tsup/esbuild `banner: { js: '"use client";' }` a ete
  // essayee en premier (pattern standard pour un DS React distribue via
  // tsup) mais esbuild >=0.19 la strip silencieusement au build avec le
  // warning "Module level directives cause errors when bundled" (une
  // directive de prologue injectee en tete d'un bundle multi-modules est
  // rejetee). Verifie empiriquement : dist/index.cjs sortait avec 'use
  // strict'; seul, notre directive disparue. Fix retenu : post-traitement
  // `onSuccess` qui prefixe le texte APRES l'ecriture des fichiers par
  // esbuild, donc hors de son pipeline de parsing/validation des
  // directives — deterministe et sans warning.
  async onSuccess() {
    for (const file of CLIENT_ENTRY_FILES) {
      const contents = await readFile(file, "utf8");
      if (!contents.startsWith(USE_CLIENT_DIRECTIVE)) {
        await writeFile(file, USE_CLIENT_DIRECTIVE + contents);
      }
    }
  },
});
