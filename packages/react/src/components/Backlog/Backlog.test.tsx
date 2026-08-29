import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { Backlog, BacklogFilterOption, BacklogItemData } from "./Backlog";

afterEach(() => {
  cleanup();
});

const FILTERS: BacklogFilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "high", label: "Haute" },
  { value: "medium", label: "Moyenne" },
  { value: "low", label: "Basse" },
];

const ITEMS: BacklogItemData[] = [
  { id: "1", priority: "high", title: "Migrer base PostgreSQL", description: "Exporter les données" },
  { id: "2", priority: "high", title: "Rate limiting API" },
  { id: "3", priority: "medium", title: "Page settings utilisateur" },
  { id: "4", priority: "low", title: "Animations transitions" },
];

describe("Backlog", () => {
  it("rend un item par entrée avec sa priorité en data-attribute et classe", () => {
    render(<Backlog items={ITEMS} />);
    const item = screen.getByText("Migrer base PostgreSQL").closest(".backlog-item")!;
    expect(item).toHaveAttribute("data-priority", "high");
    expect(item.querySelector(".backlog-priority")).toHaveClass("high");
  });

  it("sans filters : pas de barre de filtres, tous les items visibles", () => {
    render(<Backlog items={ITEMS} />);
    expect(document.querySelector(".backlog-filters")).toBeNull();
    ITEMS.forEach((item) => {
      expect(screen.getByText(item.title as string).closest(".backlog-item")).not.toHaveClass(
        "hidden",
      );
    });
  });

  it("filtre 'all' actif par défaut : .btn-filter.active + aria-pressed", () => {
    render(<Backlog items={ITEMS} filters={FILTERS} />);
    const allBtn = screen.getByText("Tous");
    expect(allBtn).toHaveClass("active");
    expect(allBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Haute")).toHaveAttribute("aria-pressed", "false");
  });

  it("clic sur un filtre masque les items ne correspondant pas (.hidden)", () => {
    render(<Backlog items={ITEMS} filters={FILTERS} />);
    fireEvent.click(screen.getByText("Haute"));

    expect(screen.getByText("Haute")).toHaveClass("active");
    expect(screen.getByText("Tous")).not.toHaveClass("active");

    expect(
      screen.getByText("Migrer base PostgreSQL").closest(".backlog-item"),
    ).not.toHaveClass("hidden");
    expect(
      screen.getByText("Page settings utilisateur").closest(".backlog-item"),
    ).toHaveClass("hidden");
    expect(
      screen.getByText("Animations transitions").closest(".backlog-item"),
    ).toHaveClass("hidden");
  });

  it("revenir sur 'Tous' démasque tous les items", () => {
    render(<Backlog items={ITEMS} filters={FILTERS} />);
    fireEvent.click(screen.getByText("Basse"));
    fireEvent.click(screen.getByText("Tous"));
    ITEMS.forEach((item) => {
      expect(screen.getByText(item.title as string).closest(".backlog-item")).not.toHaveClass(
        "hidden",
      );
    });
  });

  it("defaultFilter personnalisé filtre dès le premier rendu", () => {
    render(<Backlog items={ITEMS} filters={FILTERS} defaultFilter="medium" />);
    expect(screen.getByText("Moyenne")).toHaveClass("active");
    expect(
      screen.getByText("Migrer base PostgreSQL").closest(".backlog-item"),
    ).toHaveClass("hidden");
    expect(
      screen.getByText("Page settings utilisateur").closest(".backlog-item"),
    ).not.toHaveClass("hidden");
  });

  it("rend meta après .backlog-content si fourni", () => {
    render(
      <Backlog
        items={[
          {
            id: "1",
            priority: "high",
            title: "Avec meta",
            meta: <span data-testid="meta">tag</span>,
          },
        ]}
      />,
    );
    expect(screen.getByTestId("meta")).toBeInTheDocument();
  });
});
