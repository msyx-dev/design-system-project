import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { Graph, type GraphEdge, type GraphNode } from "./Graph";

afterEach(cleanup);

interface ServerData {
  owner: string;
}
interface LinkData {
  weight: number;
}

/**
 * Jeu de données minimal — `layout="fixed"` (positions explicites) : évite toute
 * dépendance à la détection topologique/`layered` (dynamic import dagre), garde les
 * assertions déterministes et synchrones pour le premier paint.
 */
function makeGraphData() {
  const nodes: GraphNode<ServerData>[] = [
    {
      data: { id: "n1", label: "Serveur A", owner: "alice" },
      position: { x: 0, y: 0 },
    },
    {
      data: { id: "n2", label: "Serveur B", owner: "bob" },
      position: { x: 200, y: 0 },
    },
  ];
  const edges: GraphEdge<LinkData>[] = [
    { data: { id: "e1", source: "n1", target: "n2", weight: 5 } },
  ];
  return { nodes, edges };
}

function nodeEl(container: HTMLElement, id: string) {
  return container.querySelector<HTMLElement>(
    `.graph-node[data-node-id="${id}"]`,
  );
}
function edgeEl(container: HTMLElement, id: string) {
  return container.querySelector<HTMLElement>(
    `.graph-edge[data-edge-id="${id}"]`,
  );
}

describe("Graph — montage moteur (view-only, #676 I6-1)", () => {
  it("peint .graph-canvas svg + .graph-node × N + .graph-edge du premier coup (paint synchrone, layout=fixed)", () => {
    const { nodes, edges } = makeGraphData();
    const { container } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
      />,
    );

    expect(container.querySelector(".graph")).toBeInTheDocument();
    const svgEl = container.querySelector("svg.graph-canvas");
    expect(svgEl).toBeInTheDocument();
    expect(svgEl).toHaveAttribute("aria-label", "Topologie");
    expect(nodeEl(container, "n1")).toBeInTheDocument();
    expect(nodeEl(container, "n2")).toBeInTheDocument();
    expect(edgeEl(container, "e1")).toBeInTheDocument();
  });

  it("synchronise ariaLabel en place (setAttribute, pas de remount) sur changement de prop", () => {
    const { nodes, edges } = makeGraphData();
    const { container, rerender } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
      />,
    );
    rerender(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie v2"
        layout="fixed"
      />,
    );
    expect(container.querySelector("svg.graph-canvas")).toHaveAttribute(
      "aria-label",
      "Topologie v2",
    );
  });
});

describe("Graph — sélection interactive (classes d'ÉTAT réelles du renderer)", () => {
  it("clic nœud : pose .graph-node--selected (PAS .selected) + onSelect reçoit le nœud complet avec TData propagé", () => {
    const { nodes, edges } = makeGraphData();
    const onSelect = vi.fn();
    const { container } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(nodeEl(container, "n1")!);

    expect(nodeEl(container, "n1")).toHaveClass("graph-node--selected");
    expect(nodeEl(container, "n1")).not.toHaveClass("selected");
    expect(onSelect).toHaveBeenCalledTimes(1);
    const received = onSelect.mock.calls[0][0] as GraphNode<ServerData>;
    expect(received.data.id).toBe("n1");
    expect(received.data.owner).toBe("alice"); // TData générique propagé jusqu'au callback
  });

  it("clic arête : pose .graph-edge--selected + onSelectEdge reçoit l'arête complète avec TData propagé", () => {
    const { nodes, edges } = makeGraphData();
    const onSelectEdge = vi.fn();
    const { container } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
        onSelectEdge={onSelectEdge}
      />,
    );

    fireEvent.click(edgeEl(container, "e1")!);

    expect(edgeEl(container, "e1")).toHaveClass("graph-edge--selected");
    expect(onSelectEdge).toHaveBeenCalledTimes(1);
    const received = onSelectEdge.mock.calls[0][0] as GraphEdge<LinkData>;
    expect(received.data.id).toBe("e1");
    expect(received.data.weight).toBe(5);
  });

  it("non contrôlé (defaultSelectedId) : graine la classe visuelle SANS appeler onSelect, puis le moteur pilote seul au clic suivant", () => {
    const { nodes, edges } = makeGraphData();
    const onSelect = vi.fn();
    const { container } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
        defaultSelectedId="n1"
        onSelect={onSelect}
      />,
    );

    expect(nodeEl(container, "n1")).toHaveClass("graph-node--selected");
    expect(onSelect).not.toHaveBeenCalled(); // graine initiale = silencieuse (contrat moteur)

    fireEvent.click(nodeEl(container, "n2")!);
    expect(nodeEl(container, "n2")).toHaveClass("graph-node--selected");
    expect(nodeEl(container, "n1")).not.toHaveClass("graph-node--selected");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("contrôlé (selectedId) : le parent pilote la sélection visuelle ; resync via select(id) SANS boucle infinie (écart moteur #676 : la façade publique ne relaie pas {silent}, donc onSelect refire aussi sur resync — cf. docstring)", () => {
    const { nodes, edges } = makeGraphData();
    const onSelect = vi.fn();
    const { container, rerender } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
        selectedId="n1"
        onSelect={onSelect}
      />,
    );
    expect(nodeEl(container, "n1")).toHaveClass("graph-node--selected");
    expect(onSelect).not.toHaveBeenCalled(); // graine initiale = silencieuse (interne au moteur)

    rerender(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
        selectedId="n2"
        onSelect={onSelect}
      />,
    );

    expect(nodeEl(container, "n2")).toHaveClass("graph-node--selected");
    expect(nodeEl(container, "n1")).not.toHaveClass("graph-node--selected");
    // Écart documenté : impossible de resynchroniser silencieusement via l'API
    // publique (`select()` ne relaie pas `{silent}`) → onSelect refire ici.
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls[0][0] as GraphNode).data.id).toBe("n2");

    // Non-régression boucle infinie : re-render avec le MÊME selectedId ne doit
    // PAS redéclencher select()/onSelect (l'effet ne réagit qu'à un changement réel).
    onSelect.mockClear();
    rerender(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
        selectedId="n2"
        onSelect={onSelect}
      />,
    );
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("Graph — warm-start (réconciliation, pas de destroy/recreate au changement nodes/edges)", () => {
  it("ajoute un nœud via reconciliation SANS perdre la sélection courante (preuve indirecte : pas de remount)", async () => {
    const { nodes, edges } = makeGraphData();
    const { container, rerender } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
      />,
    );
    fireEvent.click(nodeEl(container, "n2")!);
    expect(nodeEl(container, "n2")).toHaveClass("graph-node--selected");

    const nextNodes: GraphNode<ServerData>[] = [
      ...nodes,
      {
        data: { id: "n3", label: "Serveur C", owner: "carol" },
        position: { x: 400, y: 0 },
      },
    ];
    rerender(
      <Graph
        nodes={nextNodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
      />,
    );

    await waitFor(() => expect(nodeEl(container, "n3")).toBeInTheDocument());
    // Si l'instance avait été détruite/recréée, la sélection aurait été réinitialisée.
    expect(nodeEl(container, "n2")).toHaveClass("graph-node--selected");
  });

  it("retire un nœud (et son arête incidente) via reconciliation", async () => {
    const { nodes, edges } = makeGraphData();
    const { container, rerender } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
      />,
    );
    expect(nodeEl(container, "n2")).toBeInTheDocument();

    rerender(
      <Graph
        nodes={[nodes[0]]}
        edges={[]}
        ariaLabel="Topologie"
        layout="fixed"
      />,
    );

    await waitFor(() =>
      expect(nodeEl(container, "n2")).not.toBeInTheDocument(),
    );
    expect(edgeEl(container, "e1")).not.toBeInTheDocument();
    expect(nodeEl(container, "n1")).toBeInTheDocument();
  });
});

describe("Graph — onLayoutEnd (best-effort, pas de hook natif côté moteur — cf. docstring)", () => {
  it("appelé après le premier repaint (montage)", async () => {
    const { nodes, edges } = makeGraphData();
    const onLayoutEnd = vi.fn();
    render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
        onLayoutEnd={onLayoutEnd}
      />,
    );
    await waitFor(() => expect(onLayoutEnd).toHaveBeenCalled());
  });
});

describe("Graph — montage/démontage (pas de fuite)", () => {
  it("démonte sans throw et sans warning console (destroy() nettoie moteur + observers)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { nodes, edges } = makeGraphData();
    const { unmount, container } = render(
      <Graph
        nodes={nodes}
        edges={edges}
        ariaLabel="Topologie"
        layout="fixed"
      />,
    );
    expect(() => unmount()).not.toThrow();
    expect(container.querySelector(".graph-node")).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("cycles mount→unmount→mount répétés sans erreur (fuite de listeners/observers)", () => {
    const { nodes, edges } = makeGraphData();
    for (let i = 0; i < 3; i += 1) {
      const { unmount } = render(
        <Graph
          nodes={nodes}
          edges={edges}
          ariaLabel="Topologie"
          layout="fixed"
        />,
      );
      unmount();
    }
  });
});
