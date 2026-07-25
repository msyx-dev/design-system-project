import {
  forwardRef,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import { Graph, type GraphHandle, type GraphProps } from "./Graph";

export type DependencyMapProps<TNode = unknown, TEdge = unknown> = GraphProps<
  TNode,
  TEdge
>;

/**
 * `<DependencyMap>` — preset métier au-dessus de `<Graph>` (#677, I6-2) : défaut
 * `layout:'layered'` (Sugiyama via dagre vendoré, DAG — le SEUL layout ASYNC du
 * moteur, dynamic import, cf. `shared/graph/layout/layered.js`). Pas de défaut
 * `layoutOptions` : dagre applique déjà `rankdir:'TB'` en interne si absent.
 *
 * Composition PURE — mêmes garanties que `<Mindmap>`/`<OrgChart>`. Le caractère
 * async du layout est géré par le moteur/renderer (`paint()` async-tolérant,
 * #670) — invisible pour ce wrapper, aucune gestion de Promise ici.
 */
function DependencyMapInner<TNode = unknown, TEdge = unknown>(
  props: DependencyMapProps<TNode, TEdge>,
  ref: ForwardedRef<GraphHandle>,
) {
  const { layout, ...rest } = props;
  return <Graph ref={ref} layout={layout ?? "layered"} {...rest} />;
}

const DependencyMapWithRef = forwardRef(
  DependencyMapInner as (
    props: DependencyMapProps<unknown, unknown>,
    ref: ForwardedRef<GraphHandle>,
  ) => ReactElement,
);
DependencyMapWithRef.displayName = "DependencyMap";

export const DependencyMap = DependencyMapWithRef as <
  TNode = unknown,
  TEdge = unknown,
>(
  props: DependencyMapProps<TNode, TEdge> & { ref?: Ref<GraphHandle> },
) => ReactElement;
