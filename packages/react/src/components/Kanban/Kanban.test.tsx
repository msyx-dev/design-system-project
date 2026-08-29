import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanColumnData,
} from "./Kanban";

afterEach(() => {
  cleanup();
});

function makeColumns(): KanbanColumnData[] {
  return [
    {
      id: "backlog",
      title: "Backlog",
      cards: [
        { id: "c1", title: "Configurer auth gate" },
        { id: "c2", title: "Design page login" },
      ],
    },
    {
      id: "in-progress",
      title: "En cours",
      cards: [{ id: "c3", title: "Déployer staging" }],
    },
  ];
}

/** Simule dataTransfer sur les événements HTML5 DnD jsdom (non implémenté nativement). */
function makeDataTransfer() {
  return { effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: vi.fn() };
}

describe("KanbanCard (présentationnel)", () => {
  it("rend title/description/footer, .dragging seulement si dragging", () => {
    const { rerender } = render(
      <KanbanCard title="T" description="D" footer={<span>F</span>} />,
    );
    expect(screen.getByText("T")).toHaveClass("kanban-card-title");
    expect(screen.getByText("D")).toHaveClass("kanban-card-desc");
    expect(screen.getByText("F").closest(".kanban-card-footer")).not.toBeNull();
    expect(screen.getByText("T").closest(".kanban-card")).not.toHaveClass(
      "dragging",
    );

    rerender(<KanbanCard title="T" dragging />);
    expect(screen.getByText("T").closest(".kanban-card")).toHaveClass(
      "dragging",
    );
  });
});

describe("KanbanColumn (présentationnel)", () => {
  it("affiche le compteur si fourni, l'omet sinon, .drag-over conditionnel", () => {
    const { rerender } = render(
      <KanbanColumn title="Backlog" count={3}>
        <div>card</div>
      </KanbanColumn>,
    );
    expect(screen.getByText("3")).toHaveClass("kanban-count");
    expect(screen.getByText("Backlog").closest(".kanban-column")).not.toHaveClass(
      "drag-over",
    );

    rerender(
      <KanbanColumn title="Backlog" dragOver>
        <div>card</div>
      </KanbanColumn>,
    );
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    expect(screen.getByText("Backlog").closest(".kanban-column")).toHaveClass(
      "drag-over",
    );
  });
});

describe("KanbanBoard (contrôlé, drag & drop)", () => {
  it("rend les colonnes avec le compteur dérivé de cards.length", () => {
    render(
      <KanbanBoard columns={makeColumns()} onColumnsChange={() => {}} />,
    );
    expect(screen.getByText("Backlog").closest(".kanban-column")?.querySelector(".kanban-count")?.textContent).toBe("2");
    expect(screen.getByText("En cours").closest(".kanban-column")?.querySelector(".kanban-count")?.textContent).toBe("1");
  });

  it("dragstart pose .dragging sur la carte source", () => {
    render(
      <KanbanBoard columns={makeColumns()} onColumnsChange={() => {}} />,
    );
    const card = screen.getByText("Configurer auth gate").closest(".kanban-card")!;
    fireEvent.dragStart(card, { dataTransfer: makeDataTransfer() });
    expect(card).toHaveClass("dragging");
  });

  it("dragover pose .drag-over sur la colonne cible", () => {
    render(
      <KanbanBoard columns={makeColumns()} onColumnsChange={() => {}} />,
    );
    const targetColumn = screen.getByText("En cours").closest(".kanban-column")!;
    fireEvent.dragOver(targetColumn, { dataTransfer: makeDataTransfer() });
    expect(targetColumn).toHaveClass("drag-over");
  });

  it("dragend retire .dragging et .drag-over", () => {
    render(
      <KanbanBoard columns={makeColumns()} onColumnsChange={() => {}} />,
    );
    const card = screen.getByText("Configurer auth gate").closest(".kanban-card")!;
    const targetColumn = screen.getByText("En cours").closest(".kanban-column")!;
    fireEvent.dragStart(card, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(targetColumn, { dataTransfer: makeDataTransfer() });
    fireEvent.dragEnd(card);
    expect(card).not.toHaveClass("dragging");
    expect(targetColumn).not.toHaveClass("drag-over");
  });

  it("drop appelle onColumnsChange avec la carte déplacée en fin de colonne cible", () => {
    const onColumnsChange = vi.fn();
    render(
      <KanbanBoard columns={makeColumns()} onColumnsChange={onColumnsChange} />,
    );
    const card = screen.getByText("Configurer auth gate").closest(".kanban-card")!;
    const targetColumn = screen.getByText("En cours").closest(".kanban-column")!;
    fireEvent.dragStart(card, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(targetColumn, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(targetColumn, { dataTransfer: makeDataTransfer() });

    expect(onColumnsChange).toHaveBeenCalledTimes(1);
    const next = onColumnsChange.mock.calls[0][0] as KanbanColumnData[];
    expect(next.find((c) => c.id === "backlog")!.cards.map((c) => c.id)).toEqual([
      "c2",
    ]);
    expect(next.find((c) => c.id === "in-progress")!.cards.map((c) => c.id)).toEqual([
      "c3",
      "c1",
    ]);
  });

  it("drop sur la même colonne n'appelle pas onColumnsChange", () => {
    const onColumnsChange = vi.fn();
    render(
      <KanbanBoard columns={makeColumns()} onColumnsChange={onColumnsChange} />,
    );
    const card = screen.getByText("Configurer auth gate").closest(".kanban-card")!;
    const sameColumn = screen.getByText("Backlog").closest(".kanban-column")!;
    fireEvent.dragStart(card, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(sameColumn, { dataTransfer: makeDataTransfer() });
    expect(onColumnsChange).not.toHaveBeenCalled();
  });

  it("entièrement contrôlé : un cycle complet via un parent réel met à jour l'affichage", () => {
    function Controlled() {
      const [columns, setColumns] = useState(makeColumns());
      return <KanbanBoard columns={columns} onColumnsChange={setColumns} />;
    }
    render(<Controlled />);
    const card = screen.getByText("Configurer auth gate").closest(".kanban-card")!;
    const targetColumn = screen.getByText("En cours").closest(".kanban-column")!;
    fireEvent.dragStart(card, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(targetColumn, { dataTransfer: makeDataTransfer() });

    expect(targetColumn.querySelector(".kanban-count")?.textContent).toBe("2");
    expect(
      screen.getByText("Backlog").closest(".kanban-column")?.querySelector(
        ".kanban-count",
      )?.textContent,
    ).toBe("1");
  });
});
