import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

afterEach(() => {
  cleanup();
});

describe("Skeleton — variantes", () => {
  it("émet .skeleton seul par défaut", () => {
    render(<Skeleton data-testid="sk" />);
    const el = document.querySelector(".skeleton") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toBe("skeleton");
  });

  it.each(["text", "title", "avatar", "btn"] as const)(
    "variant=%s émet .skeleton.skeleton-%s (jamais seul)",
    (variant) => {
      render(<Skeleton variant={variant} />);
      const el = document.querySelector(".skeleton") as HTMLElement;
      expect(el.classList.contains("skeleton")).toBe(true);
      expect(el.classList.contains(`skeleton-${variant}`)).toBe(true);
    },
  );

  it("accepte un style inline pour le dimensionnement (markup réel)", () => {
    render(<Skeleton variant="text" style={{ width: "90%" }} />);
    const el = document.querySelector(".skeleton-text") as HTMLElement;
    expect(el.style.width).toBe("90%");
  });

  it("className additionnelle est fusionnée", () => {
    render(<Skeleton className="custom" />);
    expect(document.querySelector(".skeleton.custom")).toBeInTheDocument();
  });
});
