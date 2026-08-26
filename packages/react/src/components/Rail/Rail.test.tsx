import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Rail, RailItem } from "./Rail";

afterEach(() => {
  cleanup();
});

const ITEMS: RailItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <span>D</span>, active: true },
  { id: "analytics", label: "Analytics", href: "/analytics" },
];

describe("Rail — structure de base", () => {
  it("rend .rail-sidebar > .rail-header + .rail-nav[aria-label]", () => {
    render(<Rail items={ITEMS} />);
    expect(document.querySelector(".rail-sidebar")).toBeInTheDocument();
    expect(document.querySelector(".rail-header")).toBeInTheDocument();
    const nav = document.querySelector(".rail-nav");
    expect(nav).toHaveAttribute("aria-label", "Navigation principale");
  });

  it("ariaLabel personnalise l'aria-label du <nav>", () => {
    render(<Rail items={ITEMS} ariaLabel="Projets" />);
    expect(document.querySelector(".rail-nav")).toHaveAttribute(
      "aria-label",
      "Projets",
    );
  });

  it("brand rendu dans .rail-logo ; absent, aucun .rail-logo", () => {
    const { rerender } = render(<Rail items={ITEMS} brand="KeepThread" />);
    expect(document.querySelector(".rail-logo")).toHaveTextContent(
      "KeepThread",
    );
    rerender(<Rail items={ITEMS} />);
    expect(document.querySelector(".rail-logo")).not.toBeInTheDocument();
  });

  it("className et id sont appliqués sur .rail-sidebar", () => {
    render(<Rail items={ITEMS} className="rail-wide" id="app-rail" />);
    const sidebar = document.querySelector(".rail-sidebar");
    expect(sidebar).toHaveClass("rail-wide");
    expect(sidebar).toHaveAttribute("id", "app-rail");
  });
});

describe("Rail — modifieur structurel --fixed", () => {
  it("fixed par défaut (true) : .rail-sidebar--fixed est présent", () => {
    render(<Rail items={ITEMS} />);
    expect(document.querySelector(".rail-sidebar")).toHaveClass(
      "rail-sidebar--fixed",
    );
  });

  it("fixed={false} : pas de .rail-sidebar--fixed (mode showcase)", () => {
    render(<Rail items={ITEMS} fixed={false} />);
    expect(document.querySelector(".rail-sidebar")).not.toHaveClass(
      "rail-sidebar--fixed",
    );
  });
});

describe("Rail — repli/dépli (.collapsed)", () => {
  it("non contrôlé : défaut déplié, le toggle bascule .collapsed", () => {
    render(<Rail items={ITEMS} />);
    const sidebar = document.querySelector(".rail-sidebar") as HTMLElement;
    const toggle = document.querySelector(".rail-toggle") as HTMLElement;
    expect(sidebar).not.toHaveClass("collapsed");
    expect(toggle).toHaveAttribute("aria-label", "Réduire la sidebar");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(sidebar).toHaveClass("collapsed");
    expect(toggle).toHaveAttribute("aria-label", "Développer la sidebar");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("defaultCollapsed amorce l'état replié", () => {
    render(<Rail items={ITEMS} defaultCollapsed />);
    expect(document.querySelector(".rail-sidebar")).toHaveClass("collapsed");
  });

  it("contrôlé : collapsed prop pilote l'état, onCollapsedChange notifie sans mutation interne", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <Rail items={ITEMS} collapsed={false} onCollapsedChange={handleChange} />,
    );
    const sidebar = document.querySelector(".rail-sidebar") as HTMLElement;
    const toggle = document.querySelector(".rail-toggle") as HTMLElement;

    fireEvent.click(toggle);
    // Contrôlé : la classe ne bouge pas tant que le parent ne repasse pas collapsed=true.
    expect(sidebar).not.toHaveClass("collapsed");
    expect(handleChange).toHaveBeenCalledWith(true);

    rerender(<Rail items={ITEMS} collapsed onCollapsedChange={handleChange} />);
    expect(sidebar).toHaveClass("collapsed");
  });
});

describe("Rail — items : icône, libellé, actif, tooltip", () => {
  it("rend .rail-item-icon + .rail-item-label + .rail-tooltip pour chaque item", () => {
    render(<Rail items={ITEMS} />);
    const items = document.querySelectorAll(".rail-item");
    expect(items).toHaveLength(2);
    expect(items[0].querySelector(".rail-item-icon")).toHaveTextContent("D");
    expect(items[0].querySelector(".rail-item-label")).toHaveTextContent(
      "Dashboard",
    );
    expect(items[0].querySelector(".rail-tooltip")).toHaveTextContent(
      "Dashboard",
    );
  });

  it("active : classe .active + aria-current=page", () => {
    render(<Rail items={ITEMS} />);
    const active = document.querySelector(".rail-item.active");
    expect(active).toHaveTextContent("Dashboard");
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("item sans href ni children est un <button>, avec href un <a>", () => {
    render(<Rail items={ITEMS} />);
    const buttonItem = document.querySelector(
      "button.rail-item",
    ) as HTMLElement;
    const linkItem = document.querySelector("a.rail-item") as HTMLElement;
    expect(buttonItem).toHaveTextContent("Dashboard");
    expect(linkItem).toHaveAttribute("href", "/analytics");
  });

  it("clic sur un item appelle son onClick", () => {
    const handleClick = vi.fn();
    render(<Rail items={[{ id: "a", label: "A", onClick: handleClick }]} />);
    fireEvent.click(document.querySelector(".rail-item") as HTMLElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("Rail — état désactivé", () => {
  const DISABLED_ITEMS: RailItem[] = [
    {
      id: "soon",
      label: "Bientôt disponible",
      href: "/soon",
      disabled: true,
      onClick: vi.fn(),
    },
  ];

  it("porte .sidebar-link-disabled + aria-disabled + tabIndex=-1", () => {
    render(<Rail items={DISABLED_ITEMS} />);
    const item = document.querySelector(".rail-item") as HTMLElement;
    expect(item).toHaveClass("sidebar-link-disabled");
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveAttribute("tabindex", "-1");
  });

  it("le clic n'appelle pas onClick et n'exécute pas la navigation (preventDefault)", () => {
    const handleClick = vi.fn();
    render(
      <Rail
        items={[
          {
            id: "soon",
            label: "Bientôt",
            href: "/soon",
            disabled: true,
            onClick: handleClick,
          },
        ]}
      />,
    );
    const item = document.querySelector(".rail-item") as HTMLElement;
    fireEvent.click(item);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe("Rail — sous-entrées imbriquées (disclosure)", () => {
  const NESTED_ITEMS: RailItem[] = [
    {
      id: "projet-a",
      label: "Projet A",
      children: [
        { id: "apercu", label: "Aperçu", href: "/a/apercu" },
        { id: "taches", label: "Tâches", href: "/a/taches" },
      ],
    },
  ];

  it("item à children : rendu en <button> avec aria-expanded/aria-controls, jamais en <a>", () => {
    render(<Rail items={NESTED_ITEMS} />);
    const parent = document.querySelector(".rail-item") as HTMLElement;
    expect(parent.tagName).toBe("BUTTON");
    expect(parent).toHaveAttribute("aria-expanded", "false");
    expect(parent).toHaveAttribute("aria-controls");
  });

  it("replié par défaut : .rail-subnav n'est pas monté", () => {
    render(<Rail items={NESTED_ITEMS} />);
    expect(document.querySelector(".rail-subnav")).not.toBeInTheDocument();
  });

  it("clic déplie : .rail-subnav apparaît avec les 2 sous-items, aria-expanded=true", () => {
    render(<Rail items={NESTED_ITEMS} />);
    const parent = document.querySelector(".rail-item") as HTMLElement;
    fireEvent.click(parent);
    expect(parent).toHaveAttribute("aria-expanded", "true");
    const subnav = document.querySelector(".rail-subnav");
    expect(subnav).toBeInTheDocument();
    expect(subnav?.querySelectorAll(".rail-item")).toHaveLength(2);
  });

  it("un second clic replie à nouveau", () => {
    render(<Rail items={NESTED_ITEMS} />);
    const parent = document.querySelector(".rail-item") as HTMLElement;
    fireEvent.click(parent);
    fireEvent.click(parent);
    expect(parent).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".rail-subnav")).not.toBeInTheDocument();
  });

  it("expandedIds contrôlé : le parent pilote, onExpandedChange notifie", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <Rail
        items={NESTED_ITEMS}
        expandedIds={[]}
        onExpandedChange={handleChange}
      />,
    );
    const parent = document.querySelector(".rail-item") as HTMLElement;
    fireEvent.click(parent);
    expect(document.querySelector(".rail-subnav")).not.toBeInTheDocument();
    expect(handleChange).toHaveBeenCalledWith(["projet-a"], NESTED_ITEMS[0]);

    rerender(
      <Rail
        items={NESTED_ITEMS}
        expandedIds={["projet-a"]}
        onExpandedChange={handleChange}
      />,
    );
    expect(document.querySelector(".rail-subnav")).toBeInTheDocument();
  });

  it("un seul niveau : les children d'un sous-item sont ignorés", () => {
    const deep: RailItem[] = [
      {
        id: "top",
        label: "Top",
        children: [
          {
            id: "mid",
            label: "Mid",
            children: [{ id: "leaf", label: "Leaf" }],
          },
        ],
      },
    ];
    render(<Rail items={deep} defaultExpandedIds={["top"]} />);
    // "mid" est rendu comme item simple (lien/bouton d'action), pas comme
    // disclosure — donc pas de second .rail-subnav ni de aria-expanded dessus.
    const midItem = Array.from(
      document.querySelectorAll(".rail-subnav > .rail-item"),
    )[0];
    expect(midItem).toHaveTextContent("Mid");
    expect(midItem).not.toHaveAttribute("aria-expanded");
    expect(document.querySelectorAll(".rail-subnav")).toHaveLength(1);
  });
});

describe("Rail — zone basse (.rail-footer)", () => {
  it("absent sans footerItems", () => {
    render(<Rail items={ITEMS} />);
    expect(document.querySelector(".rail-footer")).not.toBeInTheDocument();
  });

  it("rend les footerItems dans .rail-footer", () => {
    render(
      <Rail
        items={ITEMS}
        footerItems={[
          { id: "settings", label: "Paramètres", href: "/settings" },
        ]}
      />,
    );
    const footer = document.querySelector(".rail-footer");
    expect(footer).toBeInTheDocument();
    expect(footer?.querySelector(".rail-item")).toHaveTextContent("Paramètres");
  });

  it("un footerItem avec children n'ouvre pas de disclosure (jamais imbriqué)", () => {
    render(
      <Rail
        items={ITEMS}
        footerItems={[
          {
            id: "settings",
            label: "Paramètres",
            href: "/settings",
            children: [{ id: "sub", label: "Sous-item" }],
          },
        ]}
      />,
    );
    const footerItem = document.querySelector(
      ".rail-footer .rail-item",
    ) as HTMLElement;
    expect(footerItem.tagName).toBe("A");
    expect(footerItem).not.toHaveAttribute("aria-expanded");
  });
});
