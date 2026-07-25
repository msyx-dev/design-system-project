// graph-engine.ts — surface TS du moteur graph vanilla (`shared/graph/index.js`)
// consommée par `<Graph>` (#676, I6-1). Le wrapper React PILOTE ce moteur, il ne
// le réimplémente pas (cf. CLAUDE.md § Process ajout composant, spec #663/#676).
//
// Le moteur est un module ESM pur (DOM pour le rendu, DOM-free pour model/layout),
// documenté exhaustivement en JSDoc dans `shared/graph/index.js` — cette source
// fait foi (la spec théorique #663 date d'avant l'implémentation, cf. écarts
// documentés dans le rapport de PR #676). Les types ci-dessous sont une
// retranscription fidèle de ce JSDoc, pas une réinvention.
//
// Import résolu via la déclaration ambiante `vanilla-graph-engine.d.ts` (même
// dossier, utile pour `tsc`/IDE en programme complet) — voir ce fichier pour la
// justification (pas d'`allowJs`). En PLUS de cette déclaration : le plugin
// `dts` de tsup (rollup-plugin-dts) compile un programme TS ISOLÉ à partir du
// SEUL point d'entrée (`src/index.ts`) et ne redécouvre PAS les `.d.ts`
// ambiants du dossier via `tsconfig.json` (`include:["src"]`) comme le ferait
// un `tsc` complet — la référence triple-slash `<reference path>` n'a PAS
// suffi non plus (constaté empiriquement, cf. rapport de PR #676). D'où le
// `@ts-ignore` ci-dessous : no-op si l'ambiante est vue (programme complet),
// supprime le TS7016 sinon (dts isolé de tsup) — robuste dans les deux modes,
// contrairement à `@ts-expect-error` (échouerait sur « directive inutilisée »
// dans le mode où l'erreur n'existe pas).
// @ts-ignore — cf. commentaire ci-dessus (TS7016 selon le mode de compilation)
import { createGraph as createGraphEngine } from "../../../../../shared/graph/index.js";

/** Nom de layout — cf. `shared/graph/layout/index.js` (registre). */
export type GraphLayout =
  "fixed" | "tree" | "radial" | "mindmap" | "layered" | "auto";

/** Options transmises telles quelles au layout résolu (cf. `layout/tree.js`, `radial.js`…). */
export interface GraphLayoutOptions {
  direction?: "TB" | "LR";
  gap?: { x: number; y: number };
  root?: string;
  startAngle?: number;
  sweep?: number;
  ringGap?: number;
  balance?: "height" | "count";
}

/** `{typeName: {className, icon}}` — cf. `shared/graph/render/node-types.js`. */
export interface NodeTypeSpec {
  className?: string;
  icon?: string;
}

/**
 * Nœud du graphe — shape Cytoscape-alignée (`data{}` = sémantique, `position`/`size`
 * = géométrie optionnelle, cf. `shared/graph/model/graph-model.js`).
 * `TData` étend les champs custom consommateur (propagé jusqu'à `onSelect`/`renderNode`).
 */
export interface GraphNode<TData = unknown> {
  data: { id: string; label?: string; type?: string; rich?: boolean } & TData;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
}

/** Arête du graphe — namespace d'id partagé avec les nœuds (invariant #1 du modèle). */
export interface GraphEdge<TData = unknown> {
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
    directed?: boolean;
  } & TData;
}

/** Sélection courante — `{id,kind}`, PAS le nœud/arête complet (cf. écart documenté #676). */
export interface GraphEngineSelection {
  id: string;
  kind: "node" | "edge";
}

/** Patch `updateNode` — fusion superficielle côté modèle (`{...existing, ...patch}`). */
export interface GraphNodePatch {
  data?: Record<string, unknown>;
  position?: { x: number; y: number } | null;
  size?: { w: number; h: number } | null;
}

/** Patch `updateEdge` — `id`/`source`/`target` restent immuables (ignorés silencieusement). */
export interface GraphEdgePatch {
  data?: Record<string, unknown>;
}

/**
 * Détail du `CustomEvent('graph:model:change')` émis par `GraphModel#emit()`
 * (`shared/graph/model/graph-model.js`) — 1 mutation atomique = 1 événement.
 * `update-node`/`update-edge` portent `prev` (état avant patch, #675). Consommé
 * par `onModelChange` (#677, I6-2) — retranscription fidèle, pas une réinvention.
 */
export type GraphEngineModelChangeDetail =
  | { op: "add-node"; id: string; node: GraphNode }
  | {
      op: "update-node";
      id: string;
      node: GraphNode;
      patch: GraphNodePatch;
      prev: GraphNode;
    }
  | {
      op: "remove-node";
      id: string;
      node: GraphNode;
      removedEdges: GraphEdge[];
    }
  | { op: "add-edge"; id: string; edge: GraphEdge }
  | {
      op: "update-edge";
      id: string;
      edge: GraphEdge;
      patch: GraphEdgePatch;
      prev: GraphEdge;
    }
  | { op: "remove-edge"; id: string; edge: GraphEdge };

/**
 * Surface minimale de `GraphModel` (`shared/graph/model/graph-model.js`) exploitée par
 * le wrapper pour la réconciliation warm-start (#676) et l'écoute `onModelChange`
 * (#677, I6-2). `GraphModel extends EventTarget` (cf. en-tête du fichier source) —
 * `addEventListener`/`removeEventListener` retranscrits ici pour `graph:model:change`.
 */
export interface GraphEngineModel {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  hasNode(id: string): boolean;
  hasEdge(id: string): boolean;
  getNode(id: string): GraphNode | undefined;
  getEdge(id: string): GraphEdge | undefined;
  addNode(node: GraphNode): void;
  updateNode(id: string, patch: GraphNodePatch): void;
  removeNode(id: string): void;
  addEdge(edge: GraphEdge): void;
  updateEdge(id: string, patch: GraphEdgePatch): void;
  removeEdge(id: string): void;
  addEventListener(
    type: "graph:model:change",
    listener: (event: CustomEvent<GraphEngineModelChangeDetail>) => void,
  ): void;
  removeEventListener(
    type: "graph:model:change",
    listener: (event: CustomEvent<GraphEngineModelChangeDetail>) => void,
  ): void;
}

/** Options réelles de `createGraph(el, opts)` — cf. JSDoc `shared/graph/index.js`. */
export interface CreateGraphOptions {
  data: { nodes: GraphNode[]; edges: GraphEdge[] };
  layout?: GraphLayout;
  layoutOptions?: GraphLayoutOptions;
  nodeTypes?: Record<string, NodeTypeSpec>;
  /** Escape hatch nœud riche — retourne un `HTMLElement` (foreignObject), PAS un React node. */
  renderNode?: (node: GraphNode) => HTMLElement;
  label?: string;
  a11yTable?: boolean;
  viewport?: boolean;
  selectable?: boolean;
  initialSelection?: string;
  onSelect?: (selection: GraphEngineSelection) => void;
  selectionDetail?: boolean;
  refitOnResize?: boolean;
  keyboardNav?: boolean;
  mode?: "view" | "edit";
}

/**
 * Retour de `createGraph()` — surface exploitée par le wrapper (I6-1, view-only).
 *
 * ÉCART MOTEUR DOCUMENTÉ (#676) : la façade publique `createGraph()` expose
 * `select: (id) => renderer.select(id)` (cf. `shared/graph/index.js`) — le second
 * paramètre `{silent}` du `SvgRenderer.select()` interne N'EST PAS transmis par
 * cette façade (vérifié empiriquement, cf. rapport de PR #676). Le type ci-dessous
 * garde `opts` pour rester structurellement aligné sur le renderer interne, mais
 * TOUT appel `select(id, {silent:true})` via cette API publique se comporte comme
 * un `select(id)` non silencieux (focus + annonce SR + callback `onSelect`).
 */
export interface GraphEngineInstance {
  model: GraphEngineModel;
  destroy: () => void;
  svg: SVGSVGElement;
  select: (id: string | null, opts?: { silent?: boolean }) => void;
  getSelection: () => GraphEngineSelection | null;
  fit: () => void;
  /**
   * Undo/redo (#675, I5-3) — no-op (retourne `false`/`undefined`) hors `mode:'edit'`
   * (pas de `GraphHistory` instanciée côté renderer). Passe par `_undo()`/`_redo()`
   * en interne (repose le focus clavier via `_afterHistoryNav`), pas `history.undo()`
   * en direct — cf. `shared/graph/index.js`.
   */
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * `createGraph` typé — cast local sur l'export réel du moteur (déclaré `unknown`
 * par la déclaration ambiante). Le moteur lui-même n'est ni modifié ni réimplémenté.
 */
export const createGraph = createGraphEngine as unknown as (
  el: HTMLElement,
  opts: CreateGraphOptions,
) => GraphEngineInstance;
