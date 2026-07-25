import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Mindmap } from "./Mindmap";
import type { GraphEdge, GraphNode } from "./Graph";

// Espionne `createGraph` via un stub minimal (`graph-test-stub.ts`, import
// dynamique dans la factory pour éviter tout souci de hoisting `vi.mock`) pour
// asserter l'OPTION `layout` réellement transmise, plutôt que de dépendre du
// DOM produit par le layout — suffisant et plus direct pour un preset qui ne
// fait QUE composer des defaults d'options (#677 I6-2), et évite de faire
// tourner le moteur réel (déjà couvert par `Graph.test.tsx`, layout="fixed").
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
    { data: { id: "n1", label: "Racine" } },
    { data: { id: "n2", label: "Branche" } },
  ];
  const edges: GraphEdge[] = [
    { data: { id: "e1", source: "n1", target: "n2" } },
  ];
  return { nodes, edges };
}

describe("Mindmap — preset (#677, I6-2)", () => {
  it("transmet layout='mindmap' au moteur par défaut", () => {
    const { nodes, edges } = makeData();
    render(<Mindmap nodes={nodes} edges={edges} ariaLabel="Carte mentale" />);

    expect(createGraph).toHaveBeenCalledTimes(1);
    const [, opts] = (createGraph as ReturnType<typeof vi.fn>).mock
      .calls[0] as [HTMLElement, { layout?: string }];
    expect(opts.layout).toBe("mindmap");
  });

  it("surcharge : un layout explicite du consumer gagne sur le défaut du preset", () => {
    const { nodes, edges } = makeData();
    render(
      <Mindmap
        nodes={nodes}
        edges={edges}
        ariaLabel="Carte mentale"
        layout="fixed"
      />,
    );

    const [, opts] = (createGraph as ReturnType<typeof vi.fn>).mock
      .calls[0] as [HTMLElement, { layout?: string }];
    expect(opts.layout).toBe("fixed");
  });
});
