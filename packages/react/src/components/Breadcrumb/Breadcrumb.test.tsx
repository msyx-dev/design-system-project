import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Breadcrumb, BreadcrumbItemData } from "./Breadcrumb";

afterEach(() => {
  cleanup();
});

const ITEMS: BreadcrumbItemData[] = [
  { id: "home", label: "Accueil", href: "#" },
  { id: "projects", label: "Projets", href: "#" },
  { id: "ds", label: "Design System", href: "#" },
  { id: "current", label: "Navigation" },
];

describe("Breadcrumb — markup et classes", () => {
  it("émet .breadcrumbs sur <nav>, aria-label par défaut", () => {
    render(<Breadcrumb items={ITEMS} />);
    const nav = document.querySelector("nav.breadcrumbs");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("aria-label", "Fil d'Ariane");
  });

  it("aria-label surchageable", () => {
    render(<Breadcrumb items={ITEMS} aria-label="Chemin" />);
    expect(document.querySelector("nav")).toHaveAttribute(
      "aria-label",
      "Chemin",
    );
  });

  it("chaque item sauf le 1er est précédé d'un .bc-sep aria-hidden", () => {
    render(<Breadcrumb items={ITEMS} />);
    const seps = document.querySelectorAll(".bc-sep");
    expect(seps).toHaveLength(ITEMS.length - 1);
    seps.forEach((s) => expect(s).toHaveAttribute("aria-hidden", "true"));
    expect(seps[0]).toHaveTextContent("/");
  });

  it("separator personnalisable (ex. chevron SVG)", () => {
    render(<Breadcrumb items={ITEMS} separator=">" />);
    expect(document.querySelectorAll(".bc-sep")[0]).toHaveTextContent(">");
  });

  it("le dernier item est un <span aria-current='page'>, sans lien", () => {
    render(<Breadcrumb items={ITEMS} />);
    const current = document.querySelector('[aria-current="page"]');
    expect(current).toBeInTheDocument();
    expect(current?.tagName).toBe("SPAN");
    expect(current).toHaveTextContent("Navigation");
  });

  it("les items intermédiaires avec href sont des <a>", () => {
    render(<Breadcrumb items={ITEMS} />);
    const links = document.querySelectorAll("nav.breadcrumbs a");
    expect(links).toHaveLength(3); // home, projects, ds — pas le dernier
  });

  it("icon remplace le libellé et émet .bc-home avec aria-label", () => {
    const items: BreadcrumbItemData[] = [
      {
        id: "home",
        label: "Accueil",
        href: "#",
        icon: <svg data-testid="home-icon" />,
      },
      { id: "current", label: "Page" },
    ];
    render(<Breadcrumb items={items} />);
    const home = document.querySelector(".bc-home");
    expect(home).toBeInTheDocument();
    expect(home?.tagName).toBe("A");
    expect(home).toHaveAttribute("aria-label", "Accueil");
    expect(
      home?.querySelector('[data-testid="home-icon"]'),
    ).toBeInTheDocument();
  });

  it("responsive ajoute .bc-responsive sur la racine", () => {
    render(<Breadcrumb items={ITEMS} responsive />);
    expect(
      document.querySelector("nav.breadcrumbs.bc-responsive"),
    ).toBeInTheDocument();
  });

  it("responsive insère un <li class='bc-ellipsis'> juste après le 1er item", () => {
    render(<Breadcrumb items={ITEMS} responsive />);
    const lis = document.querySelectorAll("ol > li");
    expect(lis[1]).toHaveClass("bc-ellipsis");
    expect(lis[1]).toHaveAttribute("aria-hidden", "true");
    expect(lis[0]).toHaveTextContent("Accueil");
  });

  it("sans responsive, aucun .bc-ellipsis n'est rendu", () => {
    render(<Breadcrumb items={ITEMS} />);
    expect(document.querySelector(".bc-ellipsis")).not.toBeInTheDocument();
  });

  it("un seul item : pas d'ellipsis même en responsive", () => {
    render(<Breadcrumb items={[{ id: "only", label: "Seul" }]} responsive />);
    expect(document.querySelector(".bc-ellipsis")).not.toBeInTheDocument();
  });

  it("className additionnelle est fusionnée", () => {
    render(<Breadcrumb items={ITEMS} className="custom" />);
    expect(
      document.querySelector("nav.breadcrumbs.custom"),
    ).toBeInTheDocument();
  });
});
