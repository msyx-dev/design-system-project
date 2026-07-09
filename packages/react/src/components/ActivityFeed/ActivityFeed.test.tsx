import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import {
  ActivityFeed,
  ActivityFeedItem,
  ActivityFilterChip,
} from "./ActivityFeed";

afterEach(() => {
  cleanup();
});

const FILTERS: ActivityFilterChip[] = [
  { value: "all", label: "Tous" },
  { value: "create", label: "Créations" },
  { value: "edit", label: "Modifications" },
  { value: "deploy", label: "Déploiements" },
];

const ITEMS: ActivityFeedItem[] = [
  {
    id: 1,
    type: "deploy",
    avatar: "MS",
    avatarBackground: "var(--gradient-2)",
    typeIcon: "R",
    text: (
      <>
        <strong>Mickael</strong> a déployé{" "}
        <span className="activity-target">design-system v2.17</span>
      </>
    ),
    time: "il y a 3 min",
    tag: "deploy",
  },
  {
    id: 2,
    type: "create",
    avatar: "CB",
    avatarBackground: "var(--gradient-3)",
    typeIcon: "+",
    text: (
      <>
        <strong>Claude</strong> a créé{" "}
        <span className="activity-target">Pricing Table</span>
      </>
    ),
    time: "il y a 12 min",
    tag: "creation",
  },
  {
    id: 3,
    type: "edit",
    avatar: "AB",
    avatarBackground: "var(--gradient-1)",
    text: (
      <>
        <strong>Admin</strong> a modifié{" "}
        <span className="activity-target">tokens.css</span>
      </>
    ),
    time: "il y a 45 min",
    tag: "edit",
  },
];

/** Items avec un 2e lot masqué (load-more). */
const ITEMS_WITH_HIDDEN: ActivityFeedItem[] = [
  ...ITEMS,
  {
    id: 4,
    type: "create",
    avatar: "MS",
    avatarBackground: "var(--gradient-2)",
    typeIcon: "+",
    text: <strong>Mickael</strong>,
    time: "hier",
    tag: "creation",
    initiallyHidden: true,
  },
  {
    // Item sans avatarBackground → doit retomber sur le défaut CSS --gradient-1.
    id: 5,
    type: "deploy",
    avatar: "CD",
    text: <strong>CI/CD</strong>,
    time: "avant-hier",
    tag: "deploy",
    initiallyHidden: true,
  },
];

describe("ActivityFeed — structure canonique", () => {
  it("rend .activity-feed + .activity-filters + un .activity-item par item", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);

    expect(document.querySelector(".activity-feed")).toBeInTheDocument();
    expect(document.querySelector(".activity-filters")).toBeInTheDocument();
    expect(document.querySelectorAll(".activity-filter-chip")).toHaveLength(4);
    expect(document.querySelectorAll(".activity-item")).toHaveLength(3);
  });

  it("chaque item porte data-type + avatar (initiales) + time + tag", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    const items = document.querySelectorAll(".activity-item");

    expect(items[0]).toHaveAttribute("data-type", "deploy");
    expect(items[0].querySelector(".activity-avatar")?.textContent).toBe("MS");
    expect(items[0].querySelector(".activity-time")?.textContent).toBe(
      "il y a 3 min",
    );
    expect(items[0].querySelector(".activity-tag")?.textContent).toBe("deploy");
  });

  it("le tag est distinct du type (create → creation)", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    const createItem = document.querySelector('[data-type="create"]');
    expect(createItem).toHaveAttribute("data-type", "create");
    expect(createItem?.querySelector(".activity-tag")?.textContent).toBe(
      "creation",
    );
  });

  it(".activity-text conserve la structure <strong> + .activity-target", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    const text = document.querySelector(".activity-text");
    expect(text?.querySelector("strong")?.textContent).toBe("Mickael");
    expect(text?.querySelector(".activity-target")?.textContent).toBe(
      "design-system v2.17",
    );
  });

  it("omet .activity-filters quand filters absent", () => {
    render(<ActivityFeed items={ITEMS} />);
    expect(document.querySelector(".activity-filters")).not.toBeInTheDocument();
  });

  it("omet .activity-tag quand tag absent sur l'item", () => {
    render(
      <ActivityFeed
        items={[{ id: 1, type: "x", avatar: "AA", text: "hello", time: "now" }]}
      />,
    );
    expect(document.querySelector(".activity-tag")).not.toBeInTheDocument();
  });

  it("propage className sur .activity-feed", () => {
    render(<ActivityFeed items={ITEMS} className="max-w-md" />);
    expect(document.querySelector(".activity-feed")).toHaveClass("max-w-md");
  });
});

describe("ActivityFeed — icône de type (décorative)", () => {
  it("rend .activity-type-icon avec aria-hidden quand typeIcon fourni", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    const icon = document.querySelector(".activity-type-icon");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.textContent).toBe("R");
  });

  it("omet .activity-type-icon quand typeIcon absent", () => {
    render(
      <ActivityFeed
        items={[{ id: 1, type: "x", avatar: "AA", text: "hi", time: "now" }]}
      />,
    );
    expect(document.querySelector(".activity-type-icon")).not.toBeInTheDocument();
  });
});

describe("ActivityFeed — style inline avatarBackground (trap FileUpload)", () => {
  it("pose background inline sur .activity-avatar quand avatarBackground fourni", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    const avatars = document.querySelectorAll(".activity-avatar");
    expect((avatars[0] as HTMLElement).style.background).toBe(
      "var(--gradient-2)",
    );
    expect((avatars[1] as HTMLElement).style.background).toBe(
      "var(--gradient-3)",
    );
  });

  it("ne pose PAS de background inline quand avatarBackground absent (fallback CSS --gradient-1)", () => {
    render(<ActivityFeed items={ITEMS_WITH_HIDDEN} />);
    // L'item CD (id 5) n'a pas d'avatarBackground → aucun style inline.
    const cdAvatars = Array.from(
      document.querySelectorAll(".activity-avatar"),
    ).filter((el) => el.textContent === "CD");
    expect(cdAvatars).toHaveLength(1);
    expect((cdAvatars[0] as HTMLElement).style.background).toBe("");
    // Sanity : un item AVEC avatarBackground a bien un background inline.
    const msAvatars = Array.from(
      document.querySelectorAll(".activity-avatar"),
    ).filter((el) => el.textContent === "MS");
    expect((msAvatars[0] as HTMLElement).style.background).toBe(
      "var(--gradient-2)",
    );
  });
});

describe("ActivityFeed — filtrage (.active + .hidden)", () => {
  it("le filtre par défaut 'all' active le 1er chip (aria-pressed) et ne masque rien", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    const chips = document.querySelectorAll(".activity-filter-chip");

    expect(chips[0]).toHaveClass("active");
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
    expect(chips[1]).not.toHaveClass("active");
    expect(chips[1]).toHaveAttribute("aria-pressed", "false");

    document
      .querySelectorAll(".activity-item")
      .forEach((item) => expect(item).not.toHaveClass("hidden"));
  });

  it("clic sur un chip déplace .active/aria-pressed et masque les items d'un autre type", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    const createChip = document.querySelector(
      '.activity-filter-chip[data-filter="create"]',
    ) as HTMLButtonElement;

    fireEvent.click(createChip);

    // .active déplacé
    expect(createChip).toHaveClass("active");
    expect(createChip).toHaveAttribute("aria-pressed", "true");
    expect(
      document.querySelector('.activity-filter-chip[data-filter="all"]'),
    ).not.toHaveClass("active");

    // Seuls les items type=create restent visibles
    document.querySelectorAll(".activity-item").forEach((item) => {
      if (item.getAttribute("data-type") === "create") {
        expect(item).not.toHaveClass("hidden");
      } else {
        expect(item).toHaveClass("hidden");
      }
    });
  });

  it("un seul chip actif à la fois", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    fireEvent.click(
      document.querySelector(
        '.activity-filter-chip[data-filter="create"]',
      ) as HTMLButtonElement,
    );
    fireEvent.click(
      document.querySelector(
        '.activity-filter-chip[data-filter="edit"]',
      ) as HTMLButtonElement,
    );
    expect(document.querySelectorAll(".activity-filter-chip.active")).toHaveLength(
      1,
    );
    expect(
      document.querySelector('.activity-filter-chip[data-filter="edit"]'),
    ).toHaveClass("active");
  });

  it("revenir sur 'all' retire .hidden de tous les items", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    fireEvent.click(
      document.querySelector(
        '.activity-filter-chip[data-filter="deploy"]',
      ) as HTMLButtonElement,
    );
    // Au moins un item masqué après filtrage
    expect(document.querySelectorAll(".activity-item.hidden").length).toBeGreaterThan(
      0,
    );

    fireEvent.click(
      document.querySelector(
        '.activity-filter-chip[data-filter="all"]',
      ) as HTMLButtonElement,
    );
    expect(document.querySelectorAll(".activity-item.hidden")).toHaveLength(0);
  });

  it("defaultFilter applique un filtre initial autre que 'all'", () => {
    render(
      <ActivityFeed items={ITEMS} filters={FILTERS} defaultFilter="edit" />,
    );
    expect(
      document.querySelector('.activity-filter-chip[data-filter="edit"]'),
    ).toHaveClass("active");
    document.querySelectorAll(".activity-item").forEach((item) => {
      if (item.getAttribute("data-type") === "edit") {
        expect(item).not.toHaveClass("hidden");
      } else {
        expect(item).toHaveClass("hidden");
      }
    });
  });
});

describe("ActivityFeed — load-more (option A, .initially-hidden + display:none inline)", () => {
  it("les items initiallyHidden portent .initially-hidden + display:none inline avant révélation", () => {
    render(<ActivityFeed items={ITEMS_WITH_HIDDEN} filters={FILTERS} />);
    const hidden = document.querySelectorAll(".activity-item.initially-hidden");
    expect(hidden).toHaveLength(2);
    hidden.forEach((item) => {
      expect((item as HTMLElement).style.display).toBe("none");
    });

    // Les items du 1er lot ne portent NI la classe NI l'inline.
    const firstBatch = document.querySelector('[data-type="deploy"]');
    expect(firstBatch).not.toHaveClass("initially-hidden");
    expect((firstBatch as HTMLElement).style.display).toBe("");
  });

  it("rend .activity-load-more (btn-secondary btn-sm) quand au moins un item initiallyHidden", () => {
    render(<ActivityFeed items={ITEMS_WITH_HIDDEN} filters={FILTERS} />);
    const block = document.querySelector(".activity-load-more");
    expect(block).toBeInTheDocument();
    const btn = block?.querySelector(".activity-load-more-btn");
    expect(btn).toHaveClass("btn-secondary");
    expect(btn).toHaveClass("btn-sm");
    expect(btn?.textContent).toBe("Charger plus");
  });

  it("libellé du bouton configurable via loadMoreLabel", () => {
    render(
      <ActivityFeed
        items={ITEMS_WITH_HIDDEN}
        loadMoreLabel="Voir plus d'activité"
      />,
    );
    expect(document.querySelector(".activity-load-more-btn")?.textContent).toBe(
      "Voir plus d'activité",
    );
  });

  it("clic sur « Charger plus » révèle les items et démonte le bloc load-more", () => {
    render(<ActivityFeed items={ITEMS_WITH_HIDDEN} filters={FILTERS} />);

    fireEvent.click(
      document.querySelector(".activity-load-more-btn") as HTMLButtonElement,
    );

    // Plus aucun item masqué par initially-hidden, ni inline display:none.
    expect(
      document.querySelectorAll(".activity-item.initially-hidden"),
    ).toHaveLength(0);
    document.querySelectorAll(".activity-item").forEach((item) => {
      expect((item as HTMLElement).style.display).toBe("");
    });

    // Le bloc load-more est retiré.
    expect(document.querySelector(".activity-load-more")).not.toBeInTheDocument();
  });

  it("n'affiche pas le bloc load-more quand aucun item initiallyHidden", () => {
    render(<ActivityFeed items={ITEMS} filters={FILTERS} />);
    expect(document.querySelector(".activity-load-more")).not.toBeInTheDocument();
  });

  it("après révélation, un item révélé reste filtrable (.hidden si hors filtre)", () => {
    render(<ActivityFeed items={ITEMS_WITH_HIDDEN} filters={FILTERS} />);
    fireEvent.click(
      document.querySelector(".activity-load-more-btn") as HTMLButtonElement,
    );
    fireEvent.click(
      document.querySelector(
        '.activity-filter-chip[data-filter="create"]',
      ) as HTMLButtonElement,
    );

    // L'item révélé id=5 (type deploy) doit être masqué par le filtre create.
    const cdItem = Array.from(document.querySelectorAll(".activity-item")).find(
      (el) => el.querySelector(".activity-avatar")?.textContent === "CD",
    );
    expect(cdItem).toHaveClass("hidden");
  });
});
