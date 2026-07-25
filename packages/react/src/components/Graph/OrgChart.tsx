import {
  forwardRef,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import { Graph, type GraphHandle, type GraphProps } from "./Graph";

export type OrgChartProps<TNode = unknown, TEdge = unknown> = GraphProps<
  TNode,
  TEdge
>;

/**
 * `<OrgChart>` — preset métier au-dessus de `<Graph>` (#677, I6-2) : défaut
 * `layout:'tree'` + `layoutOptions:{direction:'TB'}` (Reingold-Tilford naïf
 * déterministe, top-down — cf. `shared/graph/layout/tree.js`).
 *
 * Composition PURE — mêmes garanties que `<Mindmap>`/`<DependencyMap>`. Surcharge
 * « tout ou rien » : passer `layoutOptions` explicitement (même partiel, ex.
 * `{direction:'LR'}`) remplace ENTIÈREMENT le défaut `{direction:'TB'}` — pas de
 * fusion champ à champ (cohérent avec la sémantique props de `<Graph>` : chaque
 * option de construction est une valeur unique, pas un patch).
 */
function OrgChartInner<TNode = unknown, TEdge = unknown>(
  props: OrgChartProps<TNode, TEdge>,
  ref: ForwardedRef<GraphHandle>,
) {
  const { layout, layoutOptions, ...rest } = props;
  return (
    <Graph
      ref={ref}
      layout={layout ?? "tree"}
      layoutOptions={layoutOptions ?? { direction: "TB" }}
      {...rest}
    />
  );
}

const OrgChartWithRef = forwardRef(
  OrgChartInner as (
    props: OrgChartProps<unknown, unknown>,
    ref: ForwardedRef<GraphHandle>,
  ) => ReactElement,
);
OrgChartWithRef.displayName = "OrgChart";

export const OrgChart = OrgChartWithRef as <TNode = unknown, TEdge = unknown>(
  props: OrgChartProps<TNode, TEdge> & { ref?: Ref<GraphHandle> },
) => ReactElement;
