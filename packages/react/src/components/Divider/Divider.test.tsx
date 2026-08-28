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

describe("Divider — gradient (composants.html:489, fondation.html:192)", () => {
  it("gradient rend <div class='divider-gradient'> vide", () => {
    render(<Divider gradient />);
    const el = document.querySelector(".divider-gradient") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe("DIV");
    expect(el).toBeEmptyDOMElement();
    expect(document.querySelector("hr.divider")).not.toBeInTheDocument();
  });

  it("gradient l'emporte sur le rendu par défaut mais pas sur label/vertical", () => {
    render(<Divider gradient label="ou" />);
    expect(document.querySelector(".divider-label")).toBeInTheDocument();
    expect(document.querySelector(".divider-gradient")).not.toBeInTheDocument();
  });

  it("className additionnelle est fusionnée (variante gradient)", () => {
    render(<Divider gradient className="custom" />);
    expect(
      document.querySelector(".divider-gradient.custom"),
    ).toBeInTheDocument();
  });
});

describe("Divider — vertical (composants.html:498)", () => {
  it("vertical rend <span class='divider-vertical'> vide", () => {
    render(<Divider vertical />);
    const el = document.querySelector(".divider-vertical") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe("SPAN");
    expect(el).toBeEmptyDOMElement();
  });

  it("vertical est prioritaire sur label et gradient", () => {
    render(<Divider vertical label="ou" gradient />);
    expect(document.querySelector(".divider-vertical")).toBeInTheDocument();
    expect(document.querySelector(".divider-label")).not.toBeInTheDocument();
    expect(document.querySelector(".divider-gradient")).not.toBeInTheDocument();
  });

  it("usage typique : plusieurs séparateurs verticaux inline dans un flex", () => {
    render(
      <div style={{ display: "flex" }}>
        <span>Accueil</span>
        <Divider vertical />
        <span>Projets</span>
        <Divider vertical />
        <span>Contact</span>
      </div>,
    );
    expect(document.querySelectorAll(".divider-vertical")).toHaveLength(2);
  });

  it("className additionnelle est fusionnée (variante vertical)", () => {
    render(<Divider vertical className="custom" />);
    expect(
      document.querySelector(".divider-vertical.custom"),
    ).toBeInTheDocument();
  });
});
