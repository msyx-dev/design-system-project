import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { SprintBoard, SprintColumnData, SprintStat } from "./SprintBoard";

afterEach(() => {
  cleanup();
});

const STATS: SprintStat[] = [
  { id: "points", label: "Points", value: "21" },
  { id: "tasks", label: "Tâches", value: "7" },
  { id: "progress", label: "Avancement", value: "62%", progress: 62 },
];

const COLUMNS: SprintColumnData[] = [
  {
    id: "todo",
    title: "À faire",
    cards: [
      { id: "c1", title: "Tests unitaires auth" },
      { id: "c2", title: "Cache Redis sessions" },
    ],
  },
  {
    id: "doing",
    title: "En cours",
    cards: [{ id: "c3", title: "API deploy webhook" }],
  },
];

describe("SprintBoard", () => {
  it("rend titre/sous-titre et les stats", () => {
    render(
      <SprintBoard
        title="Sprint 12"
        subtitle="4 mars — 18 mars 2026"
        stats={STATS}
        columns={COLUMNS}
      />,
    );
    expect(screen.getByRole("heading", { name: "Sprint 12" })).toBeInTheDocument();
    expect(screen.getByText("4 mars — 18 mars 2026")).toBeInTheDocument();
    expect(screen.getByText("21")).toHaveClass("stat-value--sm");
  });

  it("rend une Progress uniquement pour les stats avec progress", () => {
    render(<SprintBoard title="Sprint 12" stats={STATS} columns={COLUMNS} />);
    const progressStat = screen.getByText("Avancement").closest(".text-center")!;
    expect(progressStat.querySelector('[role="progressbar"]')).toHaveAttribute(
      "aria-valuenow",
      "62",
    );
    const pointsStat = screen.getByText("Points").closest(".text-center")!;
    expect(pointsStat.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("réutilise .kanban-column/.kanban-card pour .sprint-board, sans draggable", () => {
    render(<SprintBoard title="Sprint 12" stats={STATS} columns={COLUMNS} />);
    const board = document.querySelector(".sprint-board")!;
    expect(board.querySelectorAll(".kanban-column")).toHaveLength(2);
    const card = screen.getByText("Tests unitaires auth").closest(".kanban-card")!;
    expect(card).not.toHaveAttribute("draggable");
    expect(
      screen.getByText("À faire").closest(".kanban-column")?.querySelector(
        ".kanban-count",
      )?.textContent,
    ).toBe("2");
  });

  it("rend .sprint-burndown seulement si burndown est fourni", () => {
    const { rerender } = render(
      <SprintBoard title="Sprint 12" stats={STATS} columns={COLUMNS} />,
    );
    expect(document.querySelector(".sprint-burndown")).toBeNull();

    rerender(
      <SprintBoard
        title="Sprint 12"
        stats={STATS}
        columns={COLUMNS}
        burndown={<svg data-testid="chart" />}
      />,
    );
    expect(document.querySelector(".sprint-burndown")).not.toBeNull();
    expect(screen.getByText("Burndown Chart")).toHaveClass(
      "sprint-burndown-title",
    );
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });
});
