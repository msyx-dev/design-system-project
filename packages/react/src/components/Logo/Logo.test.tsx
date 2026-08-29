import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Logo } from "./Logo";

afterEach(cleanup);

describe("Logo — résolution de chemin", () => {
  it("variant='default' résout logo-msyx.svg sous le basePath par défaut", () => {
    render(<Logo />);
    const img = document.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/assets/logo-msyx.svg");
  });

  it("variant='mark' résout logo-msyx-mark.svg", () => {
    render(<Logo variant="mark" />);
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/logo-msyx-mark.svg",
    );
  });

  it("variant='dark' résout logo-msyx-dark.svg", () => {
    render(<Logo variant="dark" />);
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/logo-msyx-dark.svg",
    );
  });

  it("variant='light' résout logo-msyx-light.svg", () => {
    render(<Logo variant="light" />);
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/logo-msyx-light.svg",
    );
  });

  it("basePath custom remplace le défaut, slash final toléré", () => {
    render(<Logo basePath="https://cdn.example.com/brand/" />);
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/brand/logo-msyx.svg",
    );
  });
});

describe("Logo — rendu nu (pas de href)", () => {
  it("rend un <img> seul, alt='msyx' par défaut, 40×40", () => {
    render(<Logo />);
    const img = document.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "msyx");
    expect(img).toHaveAttribute("width", "40");
    expect(img).toHaveAttribute("height", "40");
    expect(document.querySelector("a")).not.toBeInTheDocument();
  });

  it("alt custom et size custom appliqués", () => {
    render(<Logo alt="msyx design system" size={64} />);
    const img = document.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "msyx design system");
    expect(img).toHaveAttribute("width", "64");
    expect(img).toHaveAttribute("height", "64");
  });

  it("className additionnel fusionné, aucune classe forcée par défaut", () => {
    render(<Logo className="mon-logo" />);
    const img = document.querySelector("img")!;
    expect(img).toHaveClass("mon-logo");
    expect(img).not.toHaveClass("header-logo-img");
  });
});

describe("Logo — lockup header (href fourni)", () => {
  it("enveloppe dans <a class='header-logo'>, img devient décoratif", () => {
    render(<Logo href="/site.html" />);
    const link = document.querySelector("a.header-logo")!;
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/site.html");
    expect(link).toHaveAttribute("aria-label", "msyx — Accueil");

    const img = link.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img).toHaveClass("header-logo-img");
  });

  it("linkAriaLabel custom remplace le défaut", () => {
    render(<Logo href="/" linkAriaLabel="mikpulse — Accueil" />);
    expect(document.querySelector("a.header-logo")).toHaveAttribute(
      "aria-label",
      "mikpulse — Accueil",
    );
  });

  it("className additionnel fusionné avec .header-logo-img en mode lien", () => {
    render(<Logo href="/" className="extra" />);
    const img = document.querySelector("img")!;
    expect(img).toHaveClass("header-logo-img");
    expect(img).toHaveClass("extra");
  });
});
