import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoadingBar, LoadingOverlay, Spinner, SpinnerDots } from "./Spinner";

afterEach(() => {
  cleanup();
});

describe("Spinner — tailles", () => {
  it("émet .spinner.spinner-md par défaut", () => {
    render(<Spinner />);
    const el = document.querySelector(".spinner") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toBe("spinner spinner-md");
  });

  it.each(["sm", "md", "lg"] as const)(
    "size=%s émet .spinner.spinner-%s (jamais .spinner seul)",
    (size) => {
      render(<Spinner size={size} />);
      const el = document.querySelector(".spinner") as HTMLElement;
      expect(el.classList.contains("spinner")).toBe(true);
      expect(el.classList.contains(`spinner-${size}`)).toBe(true);
    },
  );

  it("role=status et aria-label=Chargement par défaut", () => {
    render(<Spinner />);
    const el = document.querySelector(".spinner") as HTMLElement;
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-label", "Chargement");
  });

  it("label personnalise aria-label", () => {
    render(<Spinner label="Enregistrement en cours" />);
    expect(document.querySelector(".spinner")).toHaveAttribute(
      "aria-label",
      "Enregistrement en cours",
    );
  });

  it("aria-label explicite écrase label", () => {
    render(<Spinner label="Chargement" aria-label="Custom" />);
    expect(document.querySelector(".spinner")).toHaveAttribute(
      "aria-label",
      "Custom",
    );
  });
});

describe("SpinnerDots", () => {
  it("émet .spinner-dots avec 3 <span> internes", () => {
    render(<SpinnerDots />);
    const el = document.querySelector(".spinner-dots") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.querySelectorAll("span")).toHaveLength(3);
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-label", "Chargement");
  });
});

describe("LoadingBar", () => {
  it("émet .loading-bar avec role=progressbar par défaut", () => {
    render(<LoadingBar />);
    const el = document.querySelector(".loading-bar") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("role", "progressbar");
    expect(el).toHaveAttribute("aria-label", "Chargement");
  });
});

describe("LoadingOverlay", () => {
  it("émet .loading-overlay et rend ses children (Spinner + message)", () => {
    render(
      <LoadingOverlay>
        <Spinner size="lg" />
        <p>Chargement des données...</p>
      </LoadingOverlay>,
    );
    const el = document.querySelector(".loading-overlay") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.querySelector(".spinner.spinner-lg")).toBeInTheDocument();
    expect(el.querySelector("p")).toHaveTextContent(
      "Chargement des données...",
    );
  });

  it("className additionnelle est fusionnée", () => {
    render(<LoadingOverlay className="custom" />);
    expect(
      document.querySelector(".loading-overlay.custom"),
    ).toBeInTheDocument();
  });
});
