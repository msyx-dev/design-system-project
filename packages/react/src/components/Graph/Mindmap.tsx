import {
  forwardRef,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import { Graph, type GraphHandle, type GraphProps } from "./Graph";

export type MindmapProps<TNode = unknown, TEdge = unknown> = GraphProps<
  TNode,
  TEdge
>;

/**
 * `<Mindmap>` — preset métier au-dessus de `<Graph>` (#677, I6-2) : défaut
 * `layout:'mindmap'` (bilatéral maison, use case NHOOD — racine centrale,
 * branches réparties gauche/droite, cf. `shared/graph/layout/mindmap.js`).
 *
 * Composition PURE — aucune logique dupliquée, un seul default d'option change.
 * Toutes les props de `<Graph>` sont acceptées telles quelles (génériques
 * `TNode`/`TEdge`, `mode`, `onModelChange`, sélection, etc.). Surcharge : si le
 * consumer passe `layout` explicitement (y compris `'mindmap'` lui-même), sa
 * valeur gagne (`??`, jamais de fusion forcée).
 */
function MindmapInner<TNode = unknown, TEdge = unknown>(
  props: MindmapProps<TNode, TEdge>,
  ref: ForwardedRef<GraphHandle>,
) {
  const { layout, ...rest } = props;
  return <Graph ref={ref} layout={layout ?? "mindmap"} {...rest} />;
}

const MindmapWithRef = forwardRef(
  MindmapInner as (
    props: MindmapProps<unknown, unknown>,
    ref: ForwardedRef<GraphHandle>,
  ) => ReactElement,
);
MindmapWithRef.displayName = "Mindmap";

export const Mindmap = MindmapWithRef as <TNode = unknown, TEdge = unknown>(
  props: MindmapProps<TNode, TEdge> & { ref?: Ref<GraphHandle> },
) => ReactElement;
