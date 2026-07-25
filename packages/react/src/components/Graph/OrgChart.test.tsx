import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { OrgChart } from "./OrgChart";
import type { GraphEdge, GraphNode } from "./Graph";

// Stub minimal (`graph-test-stub.ts`) plutôt que le moteur réel : suffisant
// pour vérifier l'OPTION transmise, évite tout effet de bord DOM/async — cf.
// justification détaillée dans `DependencyMap.test.tsx`.
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
    { data: { id: "ceo", label: "CEO" } },
    { data: { id: "cto", label: "CTO" } },
  ];
  const edges: GraphEdge[] = [
    { data: { id: "e1", source: "ceo", target: "cto" } },
  ];
  return { nodes, edges };
}

describe("OrgChart — preset (#677, I6-2)", () => {
  it("transmet layout='tree' + layoutOptions.direction='TB' par défaut", () => {
    const { nodes, edges } = makeData();
    render(<OrgChart nodes={nodes} edges={edges} ariaLabel="Organigramme" />);

    const [, opts] = (createGraph as ReturnType<typeof vi.fn>).mock
      .calls[0] as [HTMLElement, { layout?: string; layoutOptions?: object }];
    expect(opts.layout).toBe("tree");
    expect(opts.layoutOptions).toEqual({ direction: "TB" });
  });

  it("surcharge : un layout explicite du consumer gagne sur le défaut du preset", () => {
    const { nodes, edges } = makeData();
    render(
      <OrgChart
        nodes={nodes}
        edges={edges}
        ariaLabel="Organigramme"
        layout="fixed"
      />,
    );

    const [, opts] = (createGraph as ReturnType<typeof vi.fn>).mock
      .calls[0] as [HTMLElement, { layout?: string }];
    expect(opts.layout).toBe("fixed");
  });

  it("surcharge : un layoutOptions explicite du consumer (même partiel) remplace ENTIÈREMENT le défaut TB", () => {
    const { nodes, edges } = makeData();
    render(
      <OrgChart
        nodes={nodes}
        edges={edges}
        ariaLabel="Organigramme"
        layoutOptions={{ direction: "LR" }}
      />,
    );

    const [, opts] = (createGraph as ReturnType<typeof vi.fn>).mock
      .calls[0] as [HTMLElement, { layoutOptions?: object }];
    expect(opts.layoutOptions).toEqual({ direction: "LR" });
  });
});
