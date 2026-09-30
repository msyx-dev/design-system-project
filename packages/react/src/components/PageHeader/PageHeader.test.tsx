import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "./PageHeader";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";

describe("PageHeader — rendu minimum (title seul)", () => {
  it("rend un <section> avec la classe section-header", () => {
    const { container } = render(<PageHeader title="Aksyva" />);
    expect(container.querySelector("section.section-header")).not.toBeNull();
  });

  it("affiche le titre dans un <h1> par défaut", () => {
    render(<PageHeader title="Aksyva" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Aksyva" }),
    ).toBeInTheDocument();
  });

  it("n'affiche pas l'overline si absent", () => {
    const { container } = render(<PageHeader title="Aksyva" />);
    expect(container.querySelector(".overline")).toBeNull();
  });

  it("n'affiche pas le lead si absent", () => {
    const { container } = render(<PageHeader title="Aksyva" />);
    expect(container.querySelector(".lead")).toBeNull();
  });

  it("n'affiche pas les actions si absentes", () => {
    const { container } = render(<PageHeader title="Aksyva" />);
    expect(container.querySelector(".section-header-actions")).toBeNull();
  });

  it("n'affiche pas le breadcrumb si absent", () => {
    const { container } = render(<PageHeader title="Aksyva" />);
    expect(container.querySelector(".section-header-breadcrumb")).toBeNull();
  });
});

describe("PageHeader — avec overline", () => {
  it("affiche l'overline dans un <span class='overline'>", () => {
    const { container } = render(
      <PageHeader title="Aksyva" overline="ACCUEIL" />,
    );
    const overline = container.querySelector("span.overline");
    expect(overline).not.toBeNull();
    expect(overline?.textContent).toBe("ACCUEIL");
  });
});

describe("PageHeader — avec lead", () => {
  it("affiche le lead dans un <p class='lead'>", () => {
    const { container } = render(
      <PageHeader title="Aksyva" lead="Suite d'outils de pilotage" />,
    );
    const lead = container.querySelector("p.lead");
    expect(lead).not.toBeNull();
    expect(lead?.textContent).toBe("Suite d'outils de pilotage");
  });
});

describe("PageHeader — avec actions", () => {
  it("rend le slot actions dans .section-header-actions", () => {
    const { container } = render(
      <PageHeader title="Aksyva" actions={<button>Action</button>} />,
    );
    const actionsDiv = container.querySelector(".section-header-actions");
    expect(actionsDiv).not.toBeNull();
    expect(actionsDiv?.querySelector("button")?.textContent).toBe("Action");
  });
});

describe("PageHeader — avec breadcrumb", () => {
  it("rend le slot breadcrumb dans un conteneur .section-header-breadcrumb", () => {
    const { container } = render(
      <PageHeader title="Aksyva" breadcrumb={<a href="/">Accueil</a>} />,
    );
    const wrapper = container.querySelector(".section-header-breadcrumb");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("a")?.textContent).toBe("Accueil");
  });

  it("le conteneur est un <div> non landmark : ni <nav>, ni role, ni aria-label (#937)", () => {
    const { container } = render(
      <PageHeader title="Aksyva" breadcrumb={<a href="/">Accueil</a>} />,
    );
    const wrapper = container.querySelector(".section-header-breadcrumb");
    expect(wrapper?.tagName).toBe("DIV");
    expect(wrapper?.hasAttribute("role")).toBe(false);
    expect(wrapper?.hasAttribute("aria-label")).toBe(false);
  });

  it("avec un <Breadcrumb> : exactement UN landmark navigation, nommé « Fil d'Ariane » (#937)", () => {
    render(
      <PageHeader
        title="Aksyva"
        breadcrumb={
          <Breadcrumb
            items={[
              { id: "home", label: "Accueil", href: "/" },
              { id: "current", label: "Aksyva" },
            ]}
          />
        }
      />,
    );
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    // Nom résolu sans `exact: false` : une seule casse existe, celle du Breadcrumb.
    expect(
      screen.getByRole("navigation", { name: "Fil d'Ariane" }),
    ).toBeInTheDocument();
  });

  it("le <nav> du Breadcrumb est DANS .section-header-breadcrumb, sans <nav> ancêtre (#937)", () => {
    const { container } = render(
      <PageHeader
        title="Aksyva"
        breadcrumb={
          <Breadcrumb items={[{ id: "home", label: "Accueil", href: "/" }]} />
        }
      />,
    );
    const nav = container.querySelector("nav");
    expect(nav?.parentElement?.className).toBe("section-header-breadcrumb");
    expect(nav?.parentElement?.closest("nav")).toBeNull();
  });
});

describe("PageHeader — heading level", () => {
  it("rend un <h2> quand as='h2'", () => {
    render(<PageHeader title="Section" as="h2" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Section" }),
    ).toBeInTheDocument();
  });

  it("rend un <h3> quand as='h3'", () => {
    render(<PageHeader title="Sous-section" as="h3" />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Sous-section" }),
    ).toBeInTheDocument();
  });
});

describe("PageHeader — className additionnelle", () => {
  it("merge la className sur l'élément racine", () => {
    const { container } = render(
      <PageHeader title="Aksyva" className="my-custom" />,
    );
    const section = container.querySelector("section");
    expect(section?.classList.contains("section-header")).toBe(true);
    expect(section?.classList.contains("my-custom")).toBe(true);
  });
});

describe("PageHeader — props undefined non rendus", () => {
  it("ne rend pas de nav si breadcrumb=undefined", () => {
    const { container } = render(
      <PageHeader title="T" breadcrumb={undefined} />,
    );
    expect(container.querySelector("nav")).toBeNull();
  });

  it("ne rend pas .section-header-actions si actions=undefined", () => {
    const { container } = render(<PageHeader title="T" actions={undefined} />);
    expect(container.querySelector(".section-header-actions")).toBeNull();
  });

  it("ne rend pas .lead si lead=undefined", () => {
    const { container } = render(<PageHeader title="T" lead={undefined} />);
    expect(container.querySelector(".lead")).toBeNull();
  });

  it("ne rend pas .overline si overline=undefined", () => {
    const { container } = render(<PageHeader title="T" overline={undefined} />);
    expect(container.querySelector(".overline")).toBeNull();
  });
});

describe("PageHeader — structure HTML", () => {
  it("rend .section-header-row > .section-header-text", () => {
    const { container } = render(<PageHeader title="Aksyva" />);
    const row = container.querySelector(".section-header-row");
    expect(row).not.toBeNull();
    expect(row?.querySelector(".section-header-text")).not.toBeNull();
  });

  it("rend le breadcrumb AVANT .section-header-row dans le DOM", () => {
    const { container } = render(
      <PageHeader title="Aksyva" breadcrumb={<a href="/">Accueil</a>} />,
    );
    const section = container.querySelector("section");
    const children = section ? Array.from(section.children) : [];
    const breadcrumbIdx = children.findIndex((el) =>
      el.classList.contains("section-header-breadcrumb"),
    );
    const rowIdx = children.findIndex((el) =>
      el.classList.contains("section-header-row"),
    );
    expect(breadcrumbIdx).toBeGreaterThanOrEqual(0);
    expect(breadcrumbIdx).toBeLessThan(rowIdx);
  });
});
