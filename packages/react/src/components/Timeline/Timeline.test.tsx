import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Timeline, TimelineGroup } from "./Timeline";

afterEach(() => {
  cleanup();
});

const GROUPS: TimelineGroup[] = [
  {
    id: "session-1",
    title: "Comité de pilotage",
    date: "14:32",
    items: [
      {
        id: "item-1",
        type: "decision",
        typeIcon: "D",
        tag: "décision",
        time: "14:35",
        children: (
          <>
            Décision :{" "}
            <span className="activity-target">migrer vers Postgres</span>
          </>
        ),
      },
      {
        id: "item-2",
        type: "action",
        tag: "action",
        time: "14:40",
        children: "Action : préparer le plan de migration",
      },
    ],
  },
  {
    id: "session-2",
    title: "Point hebdo",
    dateSeparator: "Hier",
    items: [{ id: "item-3", children: "Information sans acteur" }],
  },
];

describe("Timeline — structure canonique à deux niveaux", () => {
  it("rend .timeline + un .timeline-group par groupe + un .timeline-item par item", () => {
    render(<Timeline groups={GROUPS} />);

    expect(document.querySelector(".timeline")).toBeInTheDocument();
    expect(document.querySelectorAll(".timeline-group")).toHaveLength(2);
    expect(document.querySelectorAll(".timeline-item")).toHaveLength(3);
  });

  it("le fil est une structure de liste sémantique (ol > li > ol > li)", () => {
    render(<Timeline groups={GROUPS} ariaLabel="Journal" />);
    const root = document.querySelector(".timeline");
    expect(root?.tagName).toBe("OL");
    expect(root).toHaveAttribute("aria-label", "Journal");

    const group = document.querySelector(".timeline-group");
    expect(group?.tagName).toBe("LI");

    const items = document.querySelector(".timeline-group-items");
    expect(items?.tagName).toBe("OL");
    expect(items?.querySelector(".timeline-item")?.tagName).toBe("LI");
  });

  it("chaque groupe porte un .timeline-dot + un .timeline-group-header avec titre et date", () => {
    render(<Timeline groups={GROUPS} />);
    const group = document.querySelectorAll(".timeline-group")[0];

    expect(group.querySelector(".timeline-dot")).toBeInTheDocument();
    expect(group.querySelector(".timeline-group-title")?.textContent).toBe(
      "Comité de pilotage",
    );
    expect(group.querySelector(".timeline-date")?.textContent).toBe("14:32");
  });

  it("omet .timeline-date sur le groupe quand date absente", () => {
    render(<Timeline groups={GROUPS} />);
    const secondGroup = document.querySelectorAll(".timeline-group")[1];
    expect(secondGroup.querySelector(".timeline-date")).not.toBeInTheDocument();
  });

  it("chaque item porte son propre .timeline-dot et .timeline-content", () => {
    render(<Timeline groups={GROUPS} />);
    const item = document.querySelectorAll(".timeline-item")[0];
    expect(item.querySelector(".timeline-dot")).toBeInTheDocument();
    expect(item.querySelector(".timeline-content")).toBeInTheDocument();
  });

  it("propage className sur .timeline", () => {
    render(<Timeline groups={GROUPS} className="max-w-lg" />);
    expect(document.querySelector(".timeline")).toHaveClass("max-w-lg");
  });
});

describe("Timeline — vocabulaire de rendu repris d'ActivityFeed (challenge #852, point 1)", () => {
  it("rend .activity-type-icon (aria-hidden) quand typeIcon fourni sur un item", () => {
    render(<Timeline groups={GROUPS} />);
    const icon = document.querySelector(".activity-type-icon");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.textContent).toBe("D");
  });

  it("omet .activity-type-icon quand typeIcon absent sur l'item", () => {
    render(<Timeline groups={GROUPS} />);
    const items = document.querySelectorAll(".timeline-item");
    expect(
      items[1].querySelector(".activity-type-icon"),
    ).not.toBeInTheDocument();
  });

  it("rend .activity-time et .activity-tag dans .activity-meta pour un item", () => {
    render(<Timeline groups={GROUPS} />);
    const item = document.querySelectorAll(".timeline-item")[0];
    const meta = item.querySelector(".activity-meta");
    expect(meta).toBeInTheDocument();
    expect(meta?.querySelector(".activity-time")?.textContent).toBe("14:35");
    expect(meta?.querySelector(".activity-tag")?.textContent).toBe("décision");
  });

  it("omet .activity-meta sur un item sans time ni tag", () => {
    render(<Timeline groups={GROUPS} />);
    const lastItem = document.querySelectorAll(".timeline-item")[2];
    expect(lastItem.querySelector(".activity-meta")).not.toBeInTheDocument();
  });

  it("conserve le contenu libre de l'item (.activity-target inclus)", () => {
    render(<Timeline groups={GROUPS} />);
    const item = document.querySelectorAll(".timeline-item")[0];
    expect(item.querySelector(".activity-target")?.textContent).toBe(
      "migrer vers Postgres",
    );
  });

  it("aucun avatar n'est imposé sur un item (pas de .activity-avatar)", () => {
    render(<Timeline groups={GROUPS} />);
    expect(document.querySelector(".activity-avatar")).not.toBeInTheDocument();
  });

  it("data-type sur .timeline-item reflète item.type sans piloter d'affichage", () => {
    render(<Timeline groups={GROUPS} />);
    const items = document.querySelectorAll(".timeline-item");
    expect(items[0]).toHaveAttribute("data-type", "decision");
    expect(items[1]).toHaveAttribute("data-type", "action");
    // item sans `type` → pas d'attribut data-type posé.
    expect(items[2]).not.toHaveAttribute("data-type");
  });
});

describe("Timeline — séparateur de date", () => {
  it("rend .timeline-date-separator uniquement quand dateSeparator fourni", () => {
    render(<Timeline groups={GROUPS} />);
    const separators = document.querySelectorAll(".timeline-date-separator");
    expect(separators).toHaveLength(1);
    expect(separators[0].textContent).toBe("Hier");
  });
});

describe("Timeline — mode compact entièrement contrôlé (challenge #852, point 2)", () => {
  const COMPACT_GROUPS: TimelineGroup[] = [
    {
      id: "big-session",
      title: "Revue trimestrielle",
      compact: true,
      previewCount: 2,
      counts: [
        { label: "3 décisions", count: 3 },
        { label: "2 actions", count: 2 },
      ],
      items: [
        { id: "a", children: "Item A" },
        { id: "b", children: "Item B" },
        { id: "c", children: "Item C" },
        { id: "d", children: "Item D" },
        { id: "e", children: "Item E" },
      ],
    },
  ];

  it("n'affiche que les previewCount premiers items en mode compact", () => {
    render(<Timeline groups={COMPACT_GROUPS} />);
    expect(document.querySelectorAll(".timeline-item")).toHaveLength(2);
  });

  it("les items masqués en compact ne sont PAS montés dans le DOM (pas de display:none)", () => {
    render(<Timeline groups={COMPACT_GROUPS} />);
    const texts = Array.from(document.querySelectorAll(".timeline-item")).map(
      (el) => el.textContent,
    );
    expect(texts).toEqual(["Item A", "Item B"]);
    expect(document.body.textContent).not.toContain("Item C");
    expect(document.body.textContent).not.toContain("Item E");
  });

  it("rend les compteurs (.activity-tag dans .activity-meta) en mode compact", () => {
    render(<Timeline groups={COMPACT_GROUPS} />);
    const group = document.querySelector(".timeline-group")!;
    const counts = group.querySelectorAll(
      ":scope > .activity-meta .activity-tag",
    );
    expect(counts).toHaveLength(2);
    expect(counts[0].textContent).toBe("3 décisions");
    expect(counts[1].textContent).toBe("2 actions");
  });

  it("rend le bouton « Afficher les N autres » (.activity-load-more, btn-secondary btn-sm)", () => {
    render(<Timeline groups={COMPACT_GROUPS} />);
    const block = document.querySelector(".activity-load-more");
    expect(block).toBeInTheDocument();
    const btn = block?.querySelector("button");
    expect(btn).toHaveClass("btn-secondary");
    expect(btn).toHaveClass("btn-sm");
    expect(btn?.textContent).toBe("Afficher les 3 autres");
  });

  it("libellé du bouton configurable via expandLabel", () => {
    render(
      <Timeline
        groups={COMPACT_GROUPS}
        expandLabel={(n) => `Voir ${n} de plus`}
      />,
    );
    expect(
      document.querySelector(".activity-load-more button")?.textContent,
    ).toBe("Voir 3 de plus");
  });

  it("le clic sur « Afficher les N autres » NE modifie PAS le DOM lui-même : il remonte onExpandGroup", () => {
    const onExpandGroup = vi.fn();
    render(<Timeline groups={COMPACT_GROUPS} onExpandGroup={onExpandGroup} />);

    fireEvent.click(
      document.querySelector(".activity-load-more button") as HTMLButtonElement,
    );

    expect(onExpandGroup).toHaveBeenCalledTimes(1);
    expect(onExpandGroup).toHaveBeenCalledWith(
      "big-session",
      COMPACT_GROUPS[0],
    );
    // Aucune manipulation interne : toujours 2 items rendus après le clic
    // tant que le consumer n'a pas re-rendu avec de nouvelles props.
    expect(document.querySelectorAll(".timeline-item")).toHaveLength(2);
  });

  it("repasser compact à false (re-render côté consumer) affiche tous les items — aucun état interne à l'encontre", () => {
    const { rerender } = render(<Timeline groups={COMPACT_GROUPS} />);
    expect(document.querySelectorAll(".timeline-item")).toHaveLength(2);

    const expanded = [{ ...COMPACT_GROUPS[0], compact: false }];
    rerender(<Timeline groups={expanded} />);

    expect(document.querySelectorAll(".timeline-item")).toHaveLength(5);
    expect(
      document.querySelector(".activity-load-more"),
    ).not.toBeInTheDocument();
  });

  it("n'affiche pas .activity-load-more quand compact absent (liste complète par défaut)", () => {
    render(<Timeline groups={GROUPS} />);
    expect(
      document.querySelector(".activity-load-more"),
    ).not.toBeInTheDocument();
  });

  it("n'affiche pas .activity-load-more quand compact=true mais items.length <= previewCount", () => {
    const small: TimelineGroup[] = [
      {
        id: "small",
        title: "Petit groupe",
        compact: true,
        previewCount: 5,
        items: [{ id: "x", children: "Seul item" }],
      },
    ];
    render(<Timeline groups={small} />);
    expect(
      document.querySelector(".activity-load-more"),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll(".timeline-item")).toHaveLength(1);
  });
});
