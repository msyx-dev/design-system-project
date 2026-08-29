import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { LogoMark } from "./LogoMark";

afterEach(cleanup);

describe("LogoMark", () => {
  it("émet .brand-mark-ds, texte 'DS', aria-label 'Design System' par défaut", () => {
    render(<LogoMark />);
    const el = document.querySelector(".brand-mark-ds")!;
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveTextContent("DS");
    expect(el).toHaveAttribute("aria-label", "Design System");
    expect(el).not.toHaveClass("brand-mark-ds--sm");
    expect(el).not.toHaveClass("brand-mark-ds--lg");
  });

  it("size='sm' ajoute .brand-mark-ds--sm", () => {
    render(<LogoMark size="sm" />);
    const el = document.querySelector(".brand-mark-ds")!;
    expect(el).toHaveClass("brand-mark-ds--sm");
    expect(el).not.toHaveClass("brand-mark-ds--lg");
  });

  it("size='lg' ajoute .brand-mark-ds--lg", () => {
    render(<LogoMark size="lg" />);
    const el = document.querySelector(".brand-mark-ds")!;
    expect(el).toHaveClass("brand-mark-ds--lg");
    expect(el).not.toHaveClass("brand-mark-ds--sm");
  });

  it("children et aria-label custom remplacent les défauts", () => {
    render(<LogoMark aria-label="Custom label">XY</LogoMark>);
    const el = document.querySelector(".brand-mark-ds")!;
    expect(el).toHaveTextContent("XY");
    expect(el).toHaveAttribute("aria-label", "Custom label");
  });

  it("className additionnel fusionné", () => {
    render(<LogoMark className="extra" />);
    expect(document.querySelector(".brand-mark-ds")).toHaveClass("extra");
  });
});
