import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("émet .empty-state seul sans props optionnelles", () => {
    render(<EmptyState data-testid="es" />);
    const el = document.querySelector(".empty-state") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toBe("empty-state");
    expect(document.querySelector(".empty-state-icon")).not.toBeInTheDocument();
  });

  it("icon émet .empty-state-icon avec aria-hidden=true", () => {
    render(<EmptyState icon={<span>📦</span>} />);
    const el = document.querySelector(".empty-state-icon") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("title rend un <h3> dans .empty-state", () => {
    render(<EmptyState title="Aucun projet" />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Aucun projet");
    expect(document.querySelector(".empty-state")?.contains(heading)).toBe(
      true,
    );
  });

  it("description rend un <p>", () => {
    render(<EmptyState description="Rien à afficher pour l'instant." />);
    expect(
      screen.getByText("Rien à afficher pour l'instant."),
    ).toBeInTheDocument();
  });

  it("action rend le nœud fourni (ex. bouton)", () => {
    render(<EmptyState action={<button type="button">Créer</button>} />);
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });

  it("compose icon+title+description+action ensemble (markup réel #empty-states)", () => {
    render(
      <EmptyState
        icon={<span>🔍</span>}
        title="Aucun résultat"
        description="Essayez d'autres termes."
        action={<button type="button">Effacer les filtres</button>}
      />,
    );
    const root = document.querySelector(".empty-state") as HTMLElement;
    expect(root.querySelector(".empty-state-icon")).toBeInTheDocument();
    expect(root.querySelector("h3")).toHaveTextContent("Aucun résultat");
    expect(root.querySelector("p")).toHaveTextContent(
      "Essayez d'autres termes.",
    );
    expect(root.querySelector("button")).toHaveTextContent(
      "Effacer les filtres",
    );
  });

  it("className additionnelle est fusionnée", () => {
    render(<EmptyState className="custom" />);
    expect(document.querySelector(".empty-state.custom")).toBeInTheDocument();
  });
});
