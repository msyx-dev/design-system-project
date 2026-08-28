import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge, BadgeVariant } from "./Badge";

afterEach(() => {
  cleanup();
});

const VARIANTS: BadgeVariant[] = [
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "neutral",
];

describe("Badge — variantes sémantiques", () => {
  it.each(VARIANTS)("variant=%s émet .badge.badge-%s", (variant) => {
    render(<Badge variant={variant}>Statut</Badge>);
    expect(
      document.querySelector(`.badge.badge-${variant}`),
    ).toBeInTheDocument();
  });

  it("variant par défaut = primary", () => {
    render(<Badge>Nouveau</Badge>);
    expect(document.querySelector(".badge.badge-primary")).toBeInTheDocument();
  });

  it("nav ajoute .badge-nav en plus de la variante", () => {
    render(
      <Badge variant="danger" nav>
        3
      </Badge>,
    );
    const el = document.querySelector(".badge") as HTMLElement;
    expect(el.classList.contains("badge-danger")).toBe(true);
    expect(el.classList.contains("badge-nav")).toBe(true);
  });

  it("pulse ajoute .pulse-dot en tête, aria-hidden", () => {
    render(<Badge pulse>En ligne</Badge>);
    const dot = document.querySelector(".pulse-dot");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("sans pulse, aucun .pulse-dot n'est rendu", () => {
    render(<Badge>Statut</Badge>);
    expect(document.querySelector(".pulse-dot")).not.toBeInTheDocument();
  });

  it("className additionnelle est fusionnée", () => {
    render(<Badge className="custom">x</Badge>);
    expect(document.querySelector(".badge.custom")).toBeInTheDocument();
  });

  it("rendu en <span>", () => {
    render(<Badge>x</Badge>);
    expect(document.querySelector(".badge")?.tagName).toBe("SPAN");
  });
});
