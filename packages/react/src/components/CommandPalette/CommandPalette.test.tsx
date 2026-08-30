import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { CommandPalette, CommandPaletteItem } from "./CommandPalette";

afterEach(() => {
  cleanup();
});

function makeItems(
  overrides?: Partial<CommandPaletteItem>[],
): CommandPaletteItem[] {
  const onSelectButtons = vi.fn();
  const onSelectCards = vi.fn();
  const onSelectSidebar = vi.fn();
  return [
    {
      id: "buttons",
      label: "Boutons",
      category: "Composants",
      onSelect: onSelectButtons,
    },
    {
      id: "cards",
      label: "Cards",
      category: "Composants",
      onSelect: onSelectCards,
    },
    {
      id: "toggle-sidebar",
      label: "Toggle sidebar",
      category: "Actions",
      onSelect: onSelectSidebar,
    },
  ].map((item, i) => ({ ...item, ...(overrides?.[i] ?? {}) }));
}

function openViaShortcut() {
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
}

describe("CommandPalette — structure au repos", () => {
  it("l'overlay est monté mais fermé (pas de .open) au repos", () => {
    render(<CommandPalette items={makeItems()} />);
    const overlay = document.querySelector(".cmd-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay).not.toHaveClass("open");
    expect(overlay).toHaveAttribute("role", "dialog");
    expect(overlay).toHaveAttribute("aria-modal", "true");
    expect(overlay).toHaveAttribute("aria-label", "Palette de commandes");
    expect(document.querySelector(".cmd-palette")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("CommandPalette — raccourci global Ctrl/Cmd+K", () => {
  it("Ctrl+K ouvre la palette, Ctrl+K à nouveau la referme (toggle)", () => {
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    expect(document.querySelector(".cmd-overlay")).toHaveClass("open");
    openViaShortcut();
    expect(document.querySelector(".cmd-overlay")).not.toHaveClass("open");
  });

  it("Cmd+K (metaKey) ouvre aussi la palette", () => {
    render(<CommandPalette items={makeItems()} />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(document.querySelector(".cmd-overlay")).toHaveClass("open");
  });

  it("l'écouteur global est RETIRÉ au démontage — un 2e Ctrl+K après unmount ne rouvre rien (fuite classique React)", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<CommandPalette items={makeItems()} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    // Un raccourci tapé après démontage ne doit lever aucune exception ni
    // rien ouvrir puisque plus aucun overlay n'existe dans le DOM.
    expect(() => openViaShortcut()).not.toThrow();
    expect(document.querySelector(".cmd-overlay")).not.toBeInTheDocument();
    removeSpy.mockRestore();
  });

  it("onOpenChange observe les transitions (n'ouvre/ferme rien lui-même)", () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette items={makeItems()} onOpenChange={onOpenChange} />);
    openViaShortcut();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    openViaShortcut();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("CommandPalette — focus WAI-APG (ajouté vs le vanilla)", () => {
  it("Ctrl+K depuis un bouton focus : ouverture focus le champ, fermeture restaure le focus du déclencheur", () => {
    render(
      <>
        <button>Un déclencheur quelconque</button>
        <CommandPalette items={makeItems()} />
      </>,
    );
    const trigger = screen.getByText("Un déclencheur quelconque");
    trigger.focus();
    expect(trigger).toHaveFocus();

    openViaShortcut();
    expect(document.querySelector(".cmd-input")).toHaveFocus();

    fireEvent.keyDown(document.querySelector(".cmd-input") as HTMLElement, {
      key: "Escape",
    });
    expect(document.querySelector(".cmd-overlay")).not.toHaveClass("open");
    expect(trigger).toHaveFocus();
  });

  it("clic sur le fond (hors palette) ferme et restaure le focus", () => {
    render(
      <>
        <button>Trigger</button>
        <CommandPalette items={makeItems()} />
      </>,
    );
    const trigger = screen.getByText("Trigger");
    trigger.focus();
    openViaShortcut();

    const overlay = document.querySelector(".cmd-overlay") as HTMLElement;
    fireEvent.click(overlay);
    expect(overlay).not.toHaveClass("open");
    expect(trigger).toHaveFocus();
  });

  it("clic à l'intérieur de la palette (pas sur le fond) NE ferme PAS", () => {
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    fireEvent.click(document.querySelector(".cmd-palette") as HTMLElement);
    expect(document.querySelector(".cmd-overlay")).toHaveClass("open");
  });
});

describe("CommandPalette — recherche + groupes", () => {
  it("query vide → index A-Z, groupé par catégorie (ordre de 1re apparition)", () => {
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    const titles = Array.from(
      document.querySelectorAll(".cmd-group-title"),
    ).map((el) => el.textContent);
    expect(titles).toEqual(["Composants", "Actions"]);
    const texts = Array.from(document.querySelectorAll(".cmd-item-text")).map(
      (el) => el.textContent,
    );
    // "Boutons" < "Cards" alphabétiquement au sein de Composants.
    expect(texts).toEqual(["Boutons", "Cards", "Toggle sidebar"]);
  });

  it("filtre par label (substring, insensible à la casse)", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    await user.type(
      document.querySelector(".cmd-input") as HTMLElement,
      "card",
    );
    const texts = Array.from(document.querySelectorAll(".cmd-item-text")).map(
      (el) => el.textContent,
    );
    expect(texts).toEqual(["Cards"]);
  });

  it("filtre aussi par catégorie", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    await user.type(
      document.querySelector(".cmd-input") as HTMLElement,
      "actions",
    );
    const texts = Array.from(document.querySelectorAll(".cmd-item-text")).map(
      (el) => el.textContent,
    );
    expect(texts).toEqual(["Toggle sidebar"]);
  });

  it("aucun résultat → .cmd-empty avec la requête", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    await user.type(
      document.querySelector(".cmd-input") as HTMLElement,
      "zzz-introuvable",
    );
    const empty = document.querySelector(".cmd-empty");
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent("zzz-introuvable");
  });
});

describe("CommandPalette — navigation clavier (calque exact, sans boucle)", () => {
  it("ArrowDown/ArrowUp déplacent .active sans boucler aux bornes", () => {
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    const input = document.querySelector(".cmd-input") as HTMLElement;

    // Premier résultat actif par défaut.
    expect(document.querySelectorAll(".cmd-item")[0]).toHaveClass("active");

    fireEvent.keyDown(input, { key: "ArrowUp" }); // déjà au 1er → reste au 1er (Math.max)
    expect(document.querySelectorAll(".cmd-item")[0]).toHaveClass("active");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const items = document.querySelectorAll(".cmd-item");
    expect(items[2]).toHaveClass("active");

    fireEvent.keyDown(input, { key: "ArrowDown" }); // déjà au dernier → reste (Math.min)
    expect(items[2]).toHaveClass("active");
  });

  it("Entrée active l'item sélectionné, ferme la palette, et restaure le focus", () => {
    const items = makeItems();
    render(
      <>
        <button>Trigger</button>
        <CommandPalette items={items} />
      </>,
    );
    const trigger = screen.getByText("Trigger");
    trigger.focus();
    openViaShortcut();
    const input = document.querySelector(".cmd-input") as HTMLElement;
    fireEvent.keyDown(input, { key: "ArrowDown" }); // → "Cards"
    fireEvent.keyDown(input, { key: "Enter" });

    expect(items[1].onSelect).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".cmd-overlay")).not.toHaveClass("open");
    expect(trigger).toHaveFocus();
  });

  it("clic direct sur un item l'active, appelle onSelect et ferme", async () => {
    const user = userEvent.setup();
    const items = makeItems();
    render(<CommandPalette items={items} />);
    openViaShortcut();
    await user.click(document.querySelectorAll(".cmd-item")[2]); // Toggle sidebar
    expect(items[2].onSelect).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".cmd-overlay")).not.toHaveClass("open");
  });

  it("Échap depuis le champ ferme la palette", () => {
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    fireEvent.keyDown(document.querySelector(".cmd-input") as HTMLElement, {
      key: "Escape",
    });
    expect(document.querySelector(".cmd-overlay")).not.toHaveClass("open");
  });
});

describe("CommandPalette — reset à l'ouverture", () => {
  it("rouvrir la palette réinitialise la requête et la sélection au 1er item", async () => {
    const user = userEvent.setup();
    render(<CommandPalette items={makeItems()} />);
    openViaShortcut();
    await user.type(
      document.querySelector(".cmd-input") as HTMLElement,
      "card",
    );
    openViaShortcut(); // ferme
    openViaShortcut(); // rouvre
    expect(
      (document.querySelector(".cmd-input") as HTMLInputElement).value,
    ).toBe("");
    expect(document.querySelectorAll(".cmd-item")).toHaveLength(3);
  });
});

// --- Mode contrôlé (#911) ----------------------------------------------------
//
// Chaque bascule est opt-in et indépendante. Le fil rouge de ces tests : sans
// la prop, le comportement historique est intact (couvert par les describe
// ci-dessus) ; avec la prop, le composant NOTIFIE et n'écrit plus lui-même.

const input = () => document.querySelector(".cmd-input") as HTMLInputElement;
const itemTexts = () =>
  Array.from(document.querySelectorAll(".cmd-item-text")).map(
    (el) => el.textContent,
  );

describe("CommandPalette — ouverture contrôlée (#911)", () => {
  it("open={false} : Ctrl+K notifie l'intention mais n'ouvre pas — le parent s'interpose", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        items={makeItems()}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    openViaShortcut();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Le parent n'a pas appliqué : la palette reste fermée.
    expect(document.querySelector(".cmd-overlay")?.className).not.toContain(
      "open",
    );
  });

  it("open={true} rend la palette ouverte sans qu'aucun raccourci ait été frappé", () => {
    render(<CommandPalette items={makeItems()} open />);
    expect(document.querySelector(".cmd-overlay")?.className).toContain("open");
  });

  it("Échap et clic sur le fond notifient false au lieu de fermer eux-mêmes", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette items={makeItems()} open onOpenChange={onOpenChange} />,
    );
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(document.querySelector(".cmd-overlay")?.className).toContain("open");

    onOpenChange.mockClear();
    fireEvent.click(document.querySelector(".cmd-overlay") as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("une fermeture déjà effective ne renotifie pas (Échap sur palette fermée)", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        items={makeItems()}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("CommandPalette — recherche contrôlée (#911)", () => {
  it("searchQuery pilote la valeur affichée, la frappe part en onSearchChange sans écrire", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <CommandPalette
        items={makeItems()}
        open
        searchQuery="card"
        onSearchChange={onSearchChange}
      />,
    );
    expect(input().value).toBe("card");
    await user.type(input(), "s");
    expect(onSearchChange).toHaveBeenCalledWith("cards");
    // Le parent n'a pas appliqué : la valeur reste celle de la prop.
    expect(input().value).toBe("card");
  });

  it("la réinitialisation à l'ouverture NOTIFIE une requête vide au lieu de l'écrire", () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <CommandPalette
        items={makeItems()}
        open={false}
        searchQuery="reste"
        onSearchChange={onSearchChange}
      />,
    );
    rerender(
      <CommandPalette
        items={makeItems()}
        open
        searchQuery="reste"
        onSearchChange={onSearchChange}
      />,
    );
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(input().value).toBe("reste");
  });
});

describe("CommandPalette — filtrage désactivable (#911)", () => {
  it("shouldFilter={false} affiche les items tels quels, sans filtre NI tri A-Z", () => {
    // Ordre volontairement non alphabétique : c'est l'ordre de pertinence
    // qu'un serveur renvoie, et qu'un tri interne détruirait.
    const serverItems: CommandPaletteItem[] = [
      { id: "z", label: "Zèbre", category: "Notes", onSelect: vi.fn() },
      { id: "a", label: "Abeille", category: "Notes", onSelect: vi.fn() },
    ];
    render(
      <CommandPalette
        items={serverItems}
        open
        shouldFilter={false}
        searchQuery="rien-a-voir"
        onSearchChange={vi.fn()}
      />,
    );
    // Aucun des deux libellés ne contient la requête : avec le filtre interne
    // la liste serait vide.
    expect(itemTexts()).toEqual(["Zèbre", "Abeille"]);
  });

  it("le filtre interne reste actif par défaut (aucune régression)", () => {
    render(
      <CommandPalette
        items={makeItems()}
        open
        searchQuery="card"
        onSearchChange={vi.fn()}
      />,
    );
    expect(itemTexts()).toEqual(["Cards"]);
  });
});

describe("CommandPalette — raccourci débrayable (#911)", () => {
  it("enableShortcut={false} : Ctrl+K n'ouvre plus rien et ne notifie plus", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        items={makeItems()}
        enableShortcut={false}
        onOpenChange={onOpenChange}
      />,
    );
    onOpenChange.mockClear(); // l'effet de montage notifie déjà false
    openViaShortcut();
    expect(document.querySelector(".cmd-overlay")?.className).not.toContain(
      "open",
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(true);
  });

  it("Échap continue de fermer quand le raccourci est débrayé", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        items={makeItems()}
        open
        enableShortcut={false}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

describe("CommandPalette — renderItem (#911)", () => {
  it("remplace le contenu du résultat sans lui retirer son enveloppe a11y", () => {
    render(
      <CommandPalette
        items={makeItems()}
        open
        renderItem={(item, { active, index }) => (
          <span className="kt-hit">{`${index}:${item.label}${active ? " *" : ""}`}</span>
        )}
      />,
    );
    const items = document.querySelectorAll(".cmd-item");
    expect(items).toHaveLength(3);
    // Contenu délégué…
    expect(document.querySelectorAll(".cmd-item-text")).toHaveLength(0);
    expect(items[0].querySelector(".kt-hit")?.textContent).toBe("0:Boutons *");
    // …enveloppe conservée : classes DS, rôle, sélection ARIA, id cible de
    // aria-activedescendant.
    expect(items[0].getAttribute("role")).toBe("option");
    expect(items[0].getAttribute("aria-selected")).toBe("true");
    expect(items[0].id).toBe(input().getAttribute("aria-activedescendant"));
  });

  it("un résultat rendu sur mesure reste cliquable (onSelect appelé)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const items = makeItems([{ onSelect }]);
    render(
      <CommandPalette
        items={items}
        open
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );
    await user.click(document.querySelectorAll(".cmd-item")[0] as HTMLElement);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
