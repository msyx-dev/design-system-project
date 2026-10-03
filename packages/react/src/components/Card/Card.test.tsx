import { createRef } from "react";
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

describe("Card — statique et titre (#1010)", () => {
  it("static ajoute .card-static, toujours avec .card", () => {
    render(<Card static>Contenu</Card>);
    expect(document.querySelector(".card.card-static")).toBeInTheDocument();
  });

  it("static se cumule avec flat et muted", () => {
    render(
      <Card static flat muted>
        Contenu
      </Card>,
    );
    const el = document.querySelector(".card") as HTMLElement;
    expect(el.classList.contains("card-static")).toBe(true);
    expect(el.classList.contains("card-flat")).toBe(true);
    expect(el.classList.contains("card-muted")).toBe(true);
  });

  it("static + href : aucune .card-static, a.card-link > .card présent", () => {
    render(
      <Card static href="/projet">
        Contenu
      </Card>,
    );
    expect(document.querySelector(".card-static")).not.toBeInTheDocument();
    expect(document.querySelector("a.card-link > .card")).toBeInTheDocument();
  });

  it("heading rend un h2.card-title en premier enfant, avec un id", () => {
    render(<Card heading="Lancement">Contenu</Card>);
    const root = document.querySelector(".card") as HTMLElement;
    const title = root.firstElementChild as HTMLElement;
    expect(title.tagName).toBe("H2");
    expect(title.classList.contains("card-title")).toBe(true);
    expect(title).toHaveTextContent("Lancement");
    expect(title.id).not.toBe("");
  });

  it("headingLevel='h3' rend un h3.card-title", () => {
    render(
      <Card heading="Lancement" headingLevel="h3">
        Contenu
      </Card>,
    );
    expect(document.querySelector("h3.card-title")).toBeInTheDocument();
    expect(document.querySelector("h2")).not.toBeInTheDocument();
  });

  it("sans region, avec heading : racine div.card et aucun aria-labelledby", () => {
    render(<Card heading="Lancement">Contenu</Card>);
    const root = document.querySelector(".card") as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root).not.toHaveAttribute("aria-labelledby");
    expect(document.querySelector("[aria-labelledby]")).not.toBeInTheDocument();
  });

  it("region + heading : section.card nommée par le titre (rôle region)", () => {
    const { getByRole } = render(
      <Card region heading="Lancement">
        Contenu
      </Card>,
    );
    const root = document.querySelector(".card") as HTMLElement;
    const title = document.querySelector(".card-title") as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root).toHaveAttribute("aria-labelledby", title.id);
    expect(getByRole("region", { name: "Lancement" })).toBe(root);
  });

  it("region sans heading : section sans aria-labelledby ; aria-label nomme la région", () => {
    const { getByRole, rerender } = render(<Card region>Contenu</Card>);
    const root = document.querySelector(".card") as HTMLElement;
    expect(root.tagName).toBe("SECTION");
    expect(root).not.toHaveAttribute("aria-labelledby");

    rerender(
      <Card region aria-label="X">
        Contenu
      </Card>,
    );
    expect(getByRole("region", { name: "X" })).toBeInTheDocument();
  });

  it("un aria-labelledby explicite l'emporte sur l'id généré", () => {
    render(
      <Card region heading="Lancement" aria-labelledby="ailleurs">
        Contenu
      </Card>,
    );
    const root = document.querySelector(".card") as HTMLElement;
    expect(root).toHaveAttribute("aria-labelledby", "ailleurs");
  });

  it("deux cartes titrées ont des id de titre distincts", () => {
    render(
      <>
        <Card heading="Un">A</Card>
        <Card heading="Deux">B</Card>
      </>,
    );
    const [a, b] = Array.from(
      document.querySelectorAll<HTMLElement>(".card-title"),
    );
    expect(a.id).not.toBe("");
    expect(b.id).not.toBe("");
    expect(a.id).not.toBe(b.id);
  });

  it("ref désigne la racine : HTMLDivElement sans region, SECTION avec region", () => {
    const divRef = createRef<HTMLElement>();
    const sectionRef = createRef<HTMLElement>();
    render(
      <>
        <Card ref={divRef}>A</Card>
        <Card ref={sectionRef} region heading="B">
          B
        </Card>
      </>,
    );
    expect(divRef.current).toBeInstanceOf(HTMLDivElement);
    expect(sectionRef.current).toBeInstanceOf(HTMLElement);
    expect(sectionRef.current?.tagName).toBe("SECTION");
  });

  it("region + href : pas de section, a.card-link > div.card", () => {
    render(
      <Card region heading="Lancement" href="/projet">
        Contenu
      </Card>,
    );
    expect(document.querySelector("section")).not.toBeInTheDocument();
    expect(
      document.querySelector("a.card-link > div.card"),
    ).toBeInTheDocument();
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
