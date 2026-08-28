import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Card, CardIcon } from "./Card";

afterEach(() => {
  cleanup();
});

describe("Card — variantes", () => {
  it("rend .card seul par défaut", () => {
    render(<Card data-testid="card">Contenu</Card>);
    const el = document.querySelector(".card") as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toBe("card");
  });

  it("flat ajoute .card-flat en plus de .card (jamais seul)", () => {
    render(<Card flat>Contenu</Card>);
    const el = document.querySelector(".card") as HTMLElement;
    expect(el.classList.contains("card")).toBe(true);
    expect(el.classList.contains("card-flat")).toBe(true);
  });

  it("compact ajoute .card-compact", () => {
    render(<Card compact>Contenu</Card>);
    expect(document.querySelector(".card.card-compact")).toBeInTheDocument();
  });

  it("horizontal ajoute .card-horizontal", () => {
    render(<Card horizontal>Contenu</Card>);
    expect(document.querySelector(".card.card-horizontal")).toBeInTheDocument();
  });

  it("muted ajoute .card-muted", () => {
    render(<Card muted>Contenu</Card>);
    expect(document.querySelector(".card.card-muted")).toBeInTheDocument();
  });

  it("les modificateurs sont cumulables", () => {
    render(
      <Card horizontal muted>
        Contenu
      </Card>,
    );
    const el = document.querySelector(".card") as HTMLElement;
    expect(el.classList.contains("card-horizontal")).toBe(true);
    expect(el.classList.contains("card-muted")).toBe(true);
  });

  it("href enveloppe la card dans un <a class='card-link'> (a11y)", () => {
    render(<Card href="/projet">Contenu</Card>);
    const link = document.querySelector("a.card-link") as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/projet");
    expect(link.querySelector(".card")).toBeInTheDocument();
  });

  it("sans href, aucun wrapper <a> n'est rendu", () => {
    render(<Card>Contenu</Card>);
    expect(document.querySelector("a.card-link")).not.toBeInTheDocument();
  });

  it("className additionnelle est fusionnée", () => {
    render(<Card className="custom">Contenu</Card>);
    expect(document.querySelector(".card.custom")).toBeInTheDocument();
  });
});

describe("CardIcon — variantes de couleur", () => {
  it("émet .card-icon.card-icon--accent par défaut", () => {
    render(<CardIcon>⚡</CardIcon>);
    expect(
      document.querySelector(".card-icon.card-icon--accent"),
    ).toBeInTheDocument();
  });

  it.each([
    ["deco-violet", "card-icon--deco-violet"],
    ["deco-cyan", "card-icon--deco-cyan"],
    ["deco-pink", "card-icon--deco-pink"],
  ] as const)("variant=%s émet .%s", (variant, expectedClass) => {
    render(<CardIcon variant={variant}>x</CardIcon>);
    expect(
      document.querySelector(`.card-icon.${expectedClass}`),
    ).toBeInTheDocument();
  });
});
