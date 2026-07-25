import type { GraphEdge, GraphEngineInstance, GraphNode } from "./graph-engine";

/**
 * Fake `GraphEngineInstance` minimal — utilisé par les tests des PRESETS
 * (`Mindmap`/`OrgChart`/`DependencyMap.test.tsx`, #677 I6-2) qui ne veulent
 * vérifier QUE l'option (`layout`/`layoutOptions`) réellement transmise par le
 * preset, pas le comportement du moteur réel lui-même (déjà couvert par
 * `Graph.test.tsx` avec `layout="fixed"`, synchrone).
 *
 * Nécessaire notamment pour `<DependencyMap>` (défaut `layout:'layered'`) : le
 * moteur RÉEL déclenche un `import()` dynamique du vendor dagre
 * (`shared/graph/layout/layered.js`) dont la promesse peut résoudre APRÈS le
 * teardown de l'environnement de test (`cleanup()`/fin de fichier suivant) —
 * `EnvironmentTeardownError` observé empiriquement en lançant les fichiers de
 * test Graph en lot. Le stub évite tout DOM/async réel : aucune fuite inter-fichiers.
 */
export function makeStubGraphInstance(): GraphEngineInstance {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  return {
    model: {
      get nodes() {
        return nodes;
      },
      get edges() {
        return edges;
      },
      hasNode: (id: string) => nodes.some((n) => n.data.id === id),
      hasEdge: (id: string) => edges.some((e) => e.data.id === id),
      getNode: (id: string) => nodes.find((n) => n.data.id === id),
      getEdge: (id: string) => edges.find((e) => e.data.id === id),
      addNode: (n: GraphNode) => {
        nodes.push(n);
      },
      updateNode: () => {},
      removeNode: (id: string) => {
        const i = nodes.findIndex((n) => n.data.id === id);
        if (i >= 0) nodes.splice(i, 1);
      },
      addEdge: (e: GraphEdge) => {
        edges.push(e);
      },
      updateEdge: () => {},
      removeEdge: (id: string) => {
        const i = edges.findIndex((e) => e.data.id === id);
        if (i >= 0) edges.splice(i, 1);
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    destroy: () => {},
    svg: { setAttribute: () => {} } as unknown as SVGSVGElement,
    select: () => {},
    getSelection: () => null,
    fit: () => {},
    undo: () => {},
    redo: () => {},
    canUndo: () => false,
    canRedo: () => false,
  };
}
