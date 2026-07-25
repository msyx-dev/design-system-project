import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import {
  createGraph,
  type CreateGraphOptions,
  type GraphEdge,
  type GraphEngineInstance,
  type GraphEngineModel,
  type GraphEngineModelChangeDetail,
  type GraphLayout,
  type GraphLayoutOptions,
  type GraphNode,
  type NodeTypeSpec,
} from "./graph-engine";

export type {
  GraphLayout,
  GraphLayoutOptions,
  GraphNode,
  GraphEdge,
  NodeTypeSpec,
  GraphEngineModelChangeDetail,
};

/**
 * Ref impérative exposée par `<Graph>` (et les presets Mindmap/OrgChart/DependencyMap
 * qui la relaient, #677 I6-2) — undo/redo hors du flux props/callbacks, car ce sont
 * des COMMANDES ponctuelles adressées au moteur (pas un état à refléter dans le JSX),
 * exactement le cas d'usage documenté de `useImperativeHandle` (piloter un instant
 * impératif d'un enfant, ici la pile `GraphHistory` du moteur, cf. `shared/graph/model/
 * history.js`). No-op hors `mode:'edit'` (le moteur n'instancie pas de `GraphHistory`
 * en mode `view` — cf. `shared/graph/index.js`).
 */
export interface GraphHandle {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export interface GraphProps<TNode = unknown, TEdge = unknown> {
  /** Nœuds du graphe — `data.id` unique (namespace partagé avec les arêtes). */
  nodes: GraphNode<TNode>[];
  /** Arêtes du graphe — `data.source`/`data.target` doivent exister dans `nodes`. */
  edges: GraphEdge<TEdge>[];
  /** Algorithme de layout — défaut `'auto'` (détection topologique, cf. moteur). */
  layout?: GraphLayout;
  /** Options transmises telles quelles au layout résolu (direction, gap, root…). */
  layoutOptions?: GraphLayoutOptions;
  /** Id sélectionné (nœud) — mode **contrôlé**. */
  selectedId?: string;
  /** Sélection interne initiale (mode non contrôlé). Graine `initialSelection` du moteur. */
  defaultSelectedId?: string;
  /** Id d'arête sélectionnée — mode **contrôlé** (pas d'équivalent non contrôlé). */
  selectedEdgeId?: string;
  /** Invoqué à la sélection interactive d'un nœud (jamais sur la graine initiale). */
  onSelect?: (node: GraphNode<TNode>) => void;
  /** Invoqué à la sélection interactive d'une arête (jamais sur la graine initiale). */
  onSelectEdge?: (edge: GraphEdge<TEdge>) => void;
  /**
   * Invoqué après repaint du moteur (mesure→layout→peinture), y compris le premier
   * rendu au montage. Best-effort : le moteur n'expose PAS d'événement natif
   * « fin de layout » (écart documenté #676) — implémenté via `MutationObserver`
   * sur le conteneur (`childList`+`subtree`) débouncé sur 2 `requestAnimationFrame`.
   * Peut aussi se déclencher sur des mutations DOM non liées au layout (ex. texte
   * de la live-region d'annonce SR) — imprécision connue, acceptable au vu de l'absence
   * de hook natif.
   */
  onLayoutEnd?: () => void;
  /**
   * Escape hatch nœud riche — retourne un `HTMLElement` (foreignObject), PAS un
   * `React.ReactNode` (écart documenté #676 : le moteur peint dans le SVG via DOM
   * brut, pas de racine React par nœud — hors scope de monter/démonter un arbre
   * React par nœud dans un `<foreignObject>`, disproportionné pour 5 SP view-only).
   */
  renderNode?: (node: GraphNode<TNode>) => HTMLElement;
  /** `{typeName: {className, icon}}` — transmis tel quel au moteur. */
  nodeTypes?: Record<string, NodeTypeSpec>;
  /** Libellé accessible du `<svg>` — REQUIS (le moteur l'exige aussi en pratique). */
  ariaLabel: string;
  /** Classes additionnelles sur le conteneur (le moteur ajoute `.graph` en plus). */
  className?: string;
  /**
   * `'view'` (défaut, INCHANGÉ depuis I6-1) ou `'edit'` (#673-675, I5) — monte la
   * `.graph-toolbar` (Ajouter/Relier/Supprimer), la création/suppression de
   * nœuds/arêtes, l'édition inline du label et l'historique undo/redo (cf.
   * `GraphHandle`). Option de CONSTRUCTION côté moteur (comme `layout`) : un
   * changement de `mode` en cours de vie remonte l'instance (destroy+create).
   */
  mode?: "view" | "edit";
  /**
   * Invoqué à chaque mutation atomique du modèle moteur — branché sur le
   * `CustomEvent('graph:model:change')` réel de `GraphModel` (retranscrit
   * `GraphEngineModelChangeDetail`, PAS l'alias DOM `graph:edit` posé sur le
   * conteneur : ce dernier n'est qu'un rebalance optionnel réservé aux consumers
   * qui écoutent l'élément hôte plutôt que le modèle, cf. `shared/graph/render/
   * svg-renderer.js` `_onChange()` — « pas un 2e canal de vérité »). Se déclenche
   * pour TOUTE mutation du modèle, y compris celles issues de la réconciliation
   * warm-start (changement des props `nodes`/`edges`) — pas seulement les éditions
   * utilisateur en `mode:'edit'` (aucune mutation initiale n'est émise : la
   * construction du modèle via `data` ne déclenche aucun événement, cf. `GraphModel`
   * constructeur — seuls les changements RÉELS après montage sont notifiés).
   */
  onModelChange?: (detail: GraphEngineModelChangeDetail) => void;
}

/** État interne d'un nœud/arête réduit à sa comparaison de contenu (warm-start diff). */
function shallowJsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Réconcilie `model` (instance vivante du moteur) avec `nextNodes`/`nextEdges` via
 * l'API de mutation granulaire (`addNode`/`updateNode`/`removeNode`/…) plutôt que de
 * détruire/recréer l'instance — c'est le warm-start (#676) : le moteur n'a pas d'API
 * de remplacement en bloc, et détruire/recréer réinitialiserait le viewport (pan/zoom)
 * et la sélection à chaque changement de `nodes`/`edges`.
 * Ordre : ajoute/maj nœuds → ajoute/maj arêtes → retire arêtes obsolètes → retire
 * nœuds obsolètes (l'invariant #4 du modèle cascade déjà les arêtes incidentes
 * restantes, filet de sécurité si l'appelant a oublié de retirer une arête).
 */
function reconcileGraphData(
  model: GraphEngineModel,
  nextNodes: GraphNode[],
  nextEdges: GraphEdge[],
): void {
  const nextNodeIds = new Set<string>();
  for (const node of nextNodes) {
    const id = node?.data?.id;
    if (!id) continue;
    nextNodeIds.add(id);
    if (!model.hasNode(id)) {
      model.addNode(node);
      continue;
    }
    const current = model.getNode(id);
    if (!current) continue;
    if (
      !shallowJsonEqual(current.data, node.data) ||
      !shallowJsonEqual(current.position, node.position)
    ) {
      model.updateNode(id, {
        data: node.data,
        position: node.position ?? null,
      });
    }
  }

  const nextEdgeIds = new Set<string>();
  for (const edge of nextEdges) {
    const id = edge?.data?.id;
    if (!id) continue;
    nextEdgeIds.add(id);
    if (!model.hasEdge(id)) {
      model.addEdge(edge);
      continue;
    }
    const current = model.getEdge(id);
    if (!current) continue;
    if (!shallowJsonEqual(current.data, edge.data)) {
      model.updateEdge(id, { data: edge.data });
    }
  }

  for (const existing of model.edges) {
    if (!nextEdgeIds.has(existing.data.id)) model.removeEdge(existing.data.id);
  }
  for (const existing of model.nodes) {
    if (!nextNodeIds.has(existing.data.id)) model.removeNode(existing.data.id);
  }
}

/**
 * `<Graph>` — wrapper React data-driven du moteur graphique node-link maison
 * (`shared/graph/`, #676 I6-1 view-only + #677 I6-2 mode édition/presets). Défaut
 * `mode:'view'` INCHANGÉ depuis I6-1 ; `mode:'edit'` monte la toolbar et expose
 * undo/redo via la ref impérative (`GraphHandle`). Les presets `Mindmap`/`OrgChart`/
 * `DependencyMap` (#677) composent PAR-DESSUS ce composant (defaults d'options),
 * ils ne dupliquent ni le moteur ni ce wrapper.
 *
 * Le moteur touche le DOM/SVG directement (measure→layout→paint) : montage
 * **client-only** via `useEffect` (jamais au render, SSR-safe par construction —
 * aucun accès DOM avant le commit du premier effet côté client).
 *
 * **Warm-start** : les changements de `nodes`/`edges` réconcilient l'instance
 * EXISTANTE (cf. `reconcileGraphData`) plutôt que de la détruire/recréer — pas de
 * saut visuel (viewport/sélection préservés).
 *
 * **Remount requis** (limitation connue, pas d'API de hot-swap côté moteur) pour :
 * `layout` (déclenche un destroy+create, seul cas géré automatiquement — les autres
 * options de construction ci-dessous nécessitent un remount MANUEL via prop `key`
 * si l'app a besoin de les changer en cours de vie) : `layoutOptions`, `nodeTypes`,
 * `renderNode`. `ariaLabel` est synchronisée en place (pas de remount, simple
 * `setAttribute` sur le `<svg>`).
 *
 * **Contrôlé/non-contrôlé** — aligné `<TreeView>` : `selectedId`/`selectedEdgeId`
 * fournis ⇒ un effet réconcilie la sélection à chaque changement de prop via
 * `select(id)`. **Écart moteur documenté (#676)** : la façade publique
 * `createGraph()` expose `select: (id) => renderer.select(id)` — l'option
 * `{silent}` du renderer interne (utilisée par le moteur pour sa propre graine
 * `initialSelection`) n'est PAS transmise par cette façade. Une resynchronisation
 * contrôlée ne peut donc PAS être silencieuse : elle refire `onSelect`/`onSelectEdge`
 * et déplace le focus DOM + l'annonce SR, exactement comme un clic interactif (sans
 * boucle infinie : l'effet ne réagit qu'à un changement RÉEL de `selectedId`).
 * Absents ⇒ `defaultSelectedId` amorce `initialSelection` (celle-ci EST silencieuse,
 * posée en interne par le moteur lui-même avant que la façade publique existe) puis
 * le moteur pilote seul (aucun état React interne nécessaire, contrairement à
 * `<TreeView>` : la sélection vit déjà visuellement dans le DOM peint par le moteur).
 */
function GraphInner<TNode = unknown, TEdge = unknown>(
  props: GraphProps<TNode, TEdge>,
  ref: ForwardedRef<GraphHandle>,
) {
  const {
    nodes,
    edges,
    layout = "auto",
    mode = "view",
    selectedId,
    selectedEdgeId,
    ariaLabel,
    className,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GraphEngineInstance | null>(null);

  // Ref « dernière valeur » — évite d'inclure les callbacks/objets dans les deps
  // des effets ci-dessous (une inline arrow function recréée à chaque render du
  // consommateur ne doit JAMAIS déclencher un destroy+create de l'instance moteur).
  const latest = useRef(props);
  latest.current = props;

  // ---- Effet 1 — création/destruction de l'instance moteur ----
  // Dépend de `layout` ET `mode` (#677 : `mode` est aussi une option de
  // CONSTRUCTION côté moteur — `_initEdit()` n'est appelé qu'une fois dans le
  // constructeur du renderer, cf. `shared/graph/render/svg-renderer.js` — donc
  // hot-swappée automatiquement par remount, comme `layout`). `layoutOptions`/
  // `nodeTypes`/`renderNode`/données/sélection initiale sont lus via
  // `latest.current` au moment du montage — toujours à jour grâce à
  // l'assignation synchrone ci-dessus.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let settleRaf1: number | null = null;
    let settleRaf2: number | null = null;
    const scheduleLayoutEnd = () => {
      if (settleRaf1 != null) return; // déjà une passe de settle en vol
      settleRaf1 = requestAnimationFrame(() => {
        settleRaf2 = requestAnimationFrame(() => {
          settleRaf1 = null;
          settleRaf2 = null;
          latest.current.onLayoutEnd?.();
        });
      });
    };
    // Observé AVANT `createGraph()` : capture aussi le tout premier repaint
    // synchrone (construction du moteur), pas seulement les repaints ultérieurs
    // (cf. docstring `onLayoutEnd` — pas de hook natif côté moteur).
    const observer = new MutationObserver(scheduleLayoutEnd);
    observer.observe(el, { childList: true, subtree: true });

    const initialProps = latest.current;
    const initialSelection =
      initialProps.selectedId ??
      initialProps.selectedEdgeId ??
      initialProps.defaultSelectedId;

    const opts: CreateGraphOptions = {
      data: { nodes: initialProps.nodes, edges: initialProps.edges },
      layout,
      layoutOptions: initialProps.layoutOptions,
      nodeTypes: initialProps.nodeTypes,
      renderNode: initialProps.renderNode as
        ((node: GraphNode) => HTMLElement) | undefined,
      label: initialProps.ariaLabel,
      mode, // #677, I6-2 — 'view' (défaut, inchangé) ou 'edit' (toolbar + undo/redo)
      initialSelection,
      // selectionDetail:false — le wrapper route TOUJOURS vers onSelect/onSelectEdge
      // (composition React : Modal/Drawer DS côté consommateur), jamais la modale
      // vanilla par défaut du moteur (window.__openModal) — décision documentée #676.
      selectionDetail: false,
      onSelect: (selection) => {
        if (!selection || selection.id == null) return;
        const inst = instanceRef.current;
        if (!inst) return;
        if (selection.kind === "node") {
          const node = inst.model.getNode(selection.id);
          if (node) latest.current.onSelect?.(node as GraphNode<TNode>);
        } else {
          const edge = inst.model.getEdge(selection.id);
          if (edge) latest.current.onSelectEdge?.(edge as GraphEdge<TEdge>);
        }
      },
    };

    const instance = createGraph(el, opts);
    instanceRef.current = instance;

    // #677, I6-2 — `onModelChange` branché sur l'événement RÉEL du modèle
    // (`graph:model:change`, PAS l'alias DOM `graph:edit` — cf. docstring du
    // composant et JSDoc de `GraphProps.onModelChange`).
    const onModelChangeListener = (
      event: CustomEvent<GraphEngineModelChangeDetail>,
    ) => {
      latest.current.onModelChange?.(event.detail);
    };
    instance.model.addEventListener(
      "graph:model:change",
      onModelChangeListener,
    );

    return () => {
      if (settleRaf1 != null) cancelAnimationFrame(settleRaf1);
      if (settleRaf2 != null) cancelAnimationFrame(settleRaf2);
      observer.disconnect();
      instance.model.removeEventListener(
        "graph:model:change",
        onModelChangeListener,
      );
      instance.destroy();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, mode]);

  // ---- Ref impérative — undo/redo (#677, I6-2) ----
  // Lit toujours `instanceRef.current` au moment de l'appel (pas de capture figée) :
  // no-op sûr (retour par défaut) tant que l'instance n'est pas montée ou hors
  // `mode:'edit'` (le moteur renvoie lui-même des no-op dans ce cas, cf. `shared/
  // graph/index.js` — `undo`/`redo` passent par `_undo()`/`_redo()` qui retournent
  // `false` sans `GraphHistory`, `canUndo`/`canRedo` lisent `renderer.history` qui
  // reste `undefined` en mode `view`).
  useImperativeHandle(
    ref,
    () => ({
      undo: () => instanceRef.current?.undo(),
      redo: () => instanceRef.current?.redo(),
      canUndo: () => instanceRef.current?.canUndo() ?? false,
      canRedo: () => instanceRef.current?.canRedo() ?? false,
    }),
    [],
  );

  // ---- Effet 2 — réconciliation warm-start des données ----
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    reconcileGraphData(inst.model, nodes as GraphNode[], edges as GraphEdge[]);
  }, [nodes, edges]);

  // ---- Effet 3 — synchronisation `aria-label` (pas de remount pour une string) ----
  useEffect(() => {
    instanceRef.current?.svg.setAttribute("aria-label", ariaLabel);
  }, [ariaLabel]);

  // ---- Effet 4 — sélection contrôlée ----
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    const isControlled =
      selectedId !== undefined || selectedEdgeId !== undefined;
    if (!isControlled) return; // non contrôlé : le moteur reste seul juge (clics utilisateur)
    const desired = selectedId ?? selectedEdgeId ?? null;
    const current = inst.getSelection();
    if ((current?.id ?? null) !== desired) {
      // Écart moteur (#676, documenté dans le rapport de PR) : le wrapper public
      // `createGraph()` expose `select: (id) => renderer.select(id)` — l'option
      // `{silent}` du renderer interne n'est PAS transmise par cette façade
      // publique. Impossible donc de resynchroniser silencieusement : un
      // changement de `selectedId` par le parent redéclenche `onSelect`/focus/
      // annonce SR exactement comme un clic interactif (sans boucle infinie :
      // l'effet ne se redéclenche que si `selectedId` change RÉELLEMENT).
      inst.select(desired);
    }
  }, [selectedId, selectedEdgeId]);

  // Pas d'`aria-label` ici : le moteur le pose déjà sur le `<svg>` interne
  // (`opts.label`, synchronisé par l'effet 3) — en dupliquer un sur le conteneur
  // créerait une double annonce SR (`role="group"` posé par le moteur + `<svg
  // role="graphics-document">` imbriqué, tous deux libellés).
  return <div ref={containerRef} className={className} />;
}

// `forwardRef` + générique : TS ne préserve pas `<TNode,TEdge>` à travers
// `forwardRef()` nativement (perd les paramètres de type, cf. limitation connue
// de la lib React types). Cast local sur un type de fonction appelable générique
// (même pattern que `graph-engine.ts` `createGraph` — le composant réel N'EST PAS
// réimplémenté, seul le TYPE exposé est reconstitué). `displayName` posé AVANT le
// cast (propriété absente du type fonction générique final, mais bien présente à
// l'exécution sur le même objet).
const GraphWithRef = forwardRef(
  GraphInner as (
    props: GraphProps<unknown, unknown>,
    ref: ForwardedRef<GraphHandle>,
  ) => ReactElement,
);
GraphWithRef.displayName = "Graph";

export const Graph = GraphWithRef as <TNode = unknown, TEdge = unknown>(
  props: GraphProps<TNode, TEdge> & { ref?: Ref<GraphHandle> },
) => ReactElement;
