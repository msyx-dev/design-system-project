import { defineConfig } from "tsup";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

// #703 : le barrel `dist/index.js`/`dist/index.cjs` n'avait AUCUNE
// directive "use client" en tete, cassant l'import de @msyx-dev/react
// depuis un Server Component (Next 15 App Router) — decouvert sur
// <PageHeader>, alpha.14.
const USE_CLIENT_DIRECTIVE = '"use client";\n';
const CLIENT_ENTRY_FILES = ["dist/index.js", "dist/index.cjs"];

// #942 : shared/graph/layout/layered.js charge dagre vendore via un dynamic
// import() dont le specifier est calcule dans une VARIABLE (`spec`, cf. le
// fichier source) -> esbuild ne peut PAS l'analyser statiquement et laisse le
// literal '../vendor/graph-layered.js' tel quel dans la sortie bundlee (branche
// Node, `typeof window === 'undefined'`). Ce chemin relatif se resout contre
// l'URL du FICHIER qui le contient une fois bundle -> dist/layered-<hash>.js en
// ESM (chunk separe, code-splitting naturel d'esbuild sur la frontiere du
// dynamic import), ou dist/index.cjs en CJS (tout inline, meme mecanique
// d'import() differe). Dans les deux cas, le fichier porteur vit dans
// packages/react/dist/ -> "../vendor/graph-layered.js" cible
// packages/react/vendor/graph-layered.js (UN niveau au-dessus de dist, PAS a
// l'interieur : meme profondeur relative que shared/graph/layout/ -> ../vendor/
// dans le monorepo non-bundle, d'ou l'absence de changement du specifier
// source). Ce dossier doit donc exister dans le paquet publie a cote de dist/
// (voir "files" dans package.json) — copie generee ici, jamais committee.
const VENDOR_SRC = path.resolve(__dirname, "../../shared/graph/vendor/graph-layered.js");
const VENDOR_DEST_DIR = path.resolve(__dirname, "vendor");
const VENDOR_DEST = path.join(VENDOR_DEST_DIR, "graph-layered.js");

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

    // #942 : voir le commentaire au-dessus de VENDOR_SRC/VENDOR_DEST.
    await mkdir(VENDOR_DEST_DIR, { recursive: true });
    await copyFile(VENDOR_SRC, VENDOR_DEST);
  },
});
