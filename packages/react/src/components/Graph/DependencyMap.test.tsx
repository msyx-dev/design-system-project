import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DependencyMap } from "./DependencyMap";
import type { GraphEdge, GraphNode } from "./Graph";

// Layout 'layered' est le SEUL layout ASYNC du moteur (dynamic import dagre
// vendoré, cf. shared/graph/layout/layered.js) : déléguer au moteur RÉEL ici
// déclenche cet `import()` en arrière-plan et sa promesse peut résoudre APRÈS
// le teardown de l'environnement de test (`EnvironmentTeardownError` observé
// empiriquement en lançant les fichiers Graph en lot) — remplacé par un stub
// minimal (`graph-test-stub.ts`, import dynamique pour éviter tout souci de
// hoisting `vi.mock`) : suffisant, on vérifie l'OPTION transmise au moteur,
// pas le comportement réel du layout (composition-only, #677 I6-2).
vi.mock("./graph-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./graph-engine")>();
  const { makeStubGraphInstance } = await import("./graph-test-stub");
  return { ...actual, createGraph: vi.fn(() => makeStubGraphInstance()) };
});
import { createGraph } from "./graph-engine";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeData() {
  const nodes: GraphNode[] = [
    { data: { id: "a", label: "Module A" } },
    { data: { id: "b", label: "Module B" } },
  ];
  const edges: GraphEdge[] = [{ data: { id: "e1", source: "a", target: "b" } }];
  return { nodes, edges };
}

describe("DependencyMap — preset (#677, I6-2)", () => {
  it("transmet layout='layered' au moteur par défaut", () => {
    const { nodes, edges } = makeData();
    render(
      <DependencyMap nodes={nodes} edges={edges} ariaLabel="Dépendances" />,
    );

    const [, opts] = (createGraph as ReturnType<typeof vi.fn>).mock
      .calls[0] as [HTMLElement, { layout?: string }];
    expect(opts.layout).toBe("layered");
  });

  it("surcharge : un layout explicite du consumer gagne sur le défaut du preset", () => {
    const { nodes, edges } = makeData();
    render(
      <DependencyMap
        nodes={nodes}
        edges={edges}
        ariaLabel="Dépendances"
        layout="fixed"
      />,
    );

    const [, opts] = (createGraph as ReturnType<typeof vi.fn>).mock
      .calls[0] as [HTMLElement, { layout?: string }];
    expect(opts.layout).toBe("fixed");
  });
});
