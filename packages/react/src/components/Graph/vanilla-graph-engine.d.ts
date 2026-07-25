// vanilla-graph-engine.d.ts — déclaration ambiante pour le moteur graph vanilla
// (`shared/graph/index.js`, ESM pur + JSDoc, sans fichier `.d.ts`).
//
// Pourquoi une déclaration ambiante plutôt que `allowJs` dans tsconfig.json :
// `shared/graph/**` est HORS `rootDir`/`include` (`src`) du package. Activer
// `allowJs` aurait fait entrer tout le moteur (model/layout/render/vendor dagre)
// dans le programme TS compilé par tsup (`dts:true`), avec un risque concret
// d'erreur TS6059 (« File is not under 'rootDir' ») ou de bundling de types
// non maîtrisé. Une déclaration ambiante ciblée sur le SEUL spécificateur
// d'import réellement utilisé (cf. `graph-engine.ts`) contourne le problème :
// TypeScript résout le module via cette déclaration, SANS jamais charger/typer
// le `.js` réel — le moteur reste un artefact JS opaque, bundlé tel quel par
// esbuild (tsup) au runtime.
//
// Le spécificateur ci-dessous DOIT matcher caractère pour caractère celui de
// l'import dans `graph-engine.ts` (même dossier, même profondeur relative).
// Signature volontairement large (opts loose) — le typage précis exploité par
// le wrapper React vit dans `graph-engine.ts` (cast local `as unknown as`).
declare module "../../../../../shared/graph/index.js" {
  export function createGraph(
    el: HTMLElement,
    opts: Record<string, unknown>,
  ): {
    model: unknown;
    destroy: () => void;
    svg: SVGSVGElement;
    getViewport: () => unknown;
    setViewport: (v: unknown) => void;
    screenToWorld: (cx: number, cy: number) => unknown;
    fit: () => void;
    zoomToNode: (id: string, k?: number) => void;
    select: (id: string | null, opts?: { silent?: boolean }) => void;
    getSelection: () => { id: string; kind: "node" | "edge" } | null;
    focusNode: (id: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
  };
}
