import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardBody, CardMedia, CardThumb } from "./CardMedia";

afterEach(() => {
  cleanup();
});

describe("CardMedia — structure & variantes", () => {
  it("rend .card.card-media par défaut", () => {
    render(
      <CardMedia>
        <CardThumb>thumb</CardThumb>
        <CardBody>body</CardBody>
      </CardMedia>,
    );
    const el = document.querySelector(".card.card-media") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.classList.contains("card-flat")).toBe(false);
  });

  it("CardThumb émet .card-thumb", () => {
    render(<CardThumb data-testid="thumb">img</CardThumb>);
    expect(document.querySelector(".card-thumb")).toHaveTextContent("img");
  });

  it("CardBody émet .card-body", () => {
    render(<CardBody>résumé</CardBody>);
    expect(document.querySelector(".card-body")).toHaveTextContent("résumé");
  });

  it("muted cumule .card-muted avec .card-media (composants.html:257)", () => {
    render(<CardMedia muted>x</CardMedia>);
    const el = document.querySelector(".card") as HTMLElement;
    expect(el.classList.contains("card-media")).toBe(true);
    expect(el.classList.contains("card-muted")).toBe(true);
  });

  it("href enveloppe dans <a class='card-link'> comme Card", () => {
    render(<CardMedia href="/article/slug">x</CardMedia>);
    const link = document.querySelector("a.card-link") as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/article/slug");
    expect(link.querySelector(".card.card-media")).toBeInTheDocument();
  });

  it("href + muted cumulés (composants.html:288)", () => {
    render(
      <CardMedia href="#" muted>
        x
      </CardMedia>,
    );
    const el = document.querySelector(".card") as HTMLElement;
    expect(el.classList.contains("card-media")).toBe(true);
    expect(el.classList.contains("card-muted")).toBe(true);
    expect(document.querySelector("a.card-link")).toBeInTheDocument();
  });
});
