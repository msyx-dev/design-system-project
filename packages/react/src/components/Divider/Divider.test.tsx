import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Divider } from "./Divider";

afterEach(() => {
  cleanup();
});

describe("Divider — avec et sans libellé", () => {
  it("sans label, rend <hr class='divider'>", () => {
    render(<Divider />);
    const el = document.querySelector("hr.divider") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe("HR");
    expect(document.querySelector(".divider-label")).not.toBeInTheDocument();
  });

  it("avec label, rend <div class='divider-label'> contenant le libellé", () => {
    render(<Divider label="ou continuer avec" />);
    const el = document.querySelector(".divider-label") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveTextContent("ou continuer avec");
    expect(document.querySelector("hr.divider")).not.toBeInTheDocument();
  });

  it("label accepte du contenu React (ex. icône)", () => {
    render(<Divider label={<span data-testid="icon">●</span>} />);
    expect(document.querySelector(".divider-label span")).toBeInTheDocument();
  });

  it("className additionnelle est fusionnée (variante hr)", () => {
    render(<Divider className="custom" />);
    expect(document.querySelector("hr.divider.custom")).toBeInTheDocument();
  });

  it("className additionnelle est fusionnée (variante label)", () => {
    render(<Divider label="ou" className="custom" />);
    expect(document.querySelector(".divider-label.custom")).toBeInTheDocument();
  });
});
