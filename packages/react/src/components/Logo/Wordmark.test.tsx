import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Wordmark } from "./Wordmark";

afterEach(cleanup);

describe("Wordmark", () => {
  it("émet .brand-wordmark avec le texte par défaut 'design-system'", () => {
    render(<Wordmark />);
    const el = document.querySelector(".brand-wordmark")!;
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveTextContent("design-system");
  });

  it("children custom remplace le texte par défaut", () => {
    render(<Wordmark>mikpulse</Wordmark>);
    expect(document.querySelector(".brand-wordmark")).toHaveTextContent(
      "mikpulse",
    );
  });

  it("className additionnel fusionné", () => {
    render(<Wordmark className="extra">x</Wordmark>);
    const el = document.querySelector(".brand-wordmark")!;
    expect(el).toHaveClass("brand-wordmark");
    expect(el).toHaveClass("extra");
  });
});
