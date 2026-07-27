import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuItemEntry,
} from "./ContextMenu";
import { clampToViewport, VIEWPORT_MARGIN } from "./clampToViewport";

const ITEMS: ContextMenuItem[] = [
  { id: "copy", label: "Copier" },
  { id: "paste", label: "Coller" },
  { type: "divider" },
  { id: "select-all", label: "Sélectionner tout" },
];

const menuEl = () => document.querySelector(".context-menu") as HTMLElement;
const zoneEl = () => document.querySelector(".test-zone") as HTMLElement;

function renderMenu(
  props: Partial<React.ComponentProps<typeof ContextMenu>> = {},
) {
  return render(
    <ContextMenu className="test-zone" items={ITEMS} {...props}>
      <span>Zone cible</span>
    </ContextMenu>,
  );
}

/** Fixture avec un sous-menu (item "share" en 2e position d'entrée). */
function makeSubmenuItems(
  shareOnSelect?: () => void,
  subOnSelect?: () => void,
): ContextMenuItemEntry[] {
  return [
    { id: "copy", label: "Copier" },
    {
      id: "share",
      label: "Partager",
      onSelect: shareOnSelect,
      submenu: {
        label: "Partager via",
        items: [
          { id: "email", label: "Email", onSelect: subOnSelect },
          { id: "link", label: "Lien" },
        ],
      },
    },
  ];
}

describe("ContextMenu — classe d'état (.show)", () => {
  it("menu fermé par défaut : toujours monté, sans la classe .show", () => {
    renderMenu();
    expect(menuEl()).toBeInTheDocument();
    expect(menuEl()).not.toHaveClass("show");
  });

  it("ouverture au clic droit : .show ajoutée, ni .open, ni .active, ni [hidden]", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 120, clientY: 240 });

    expect(menuEl()).toHaveClass("show");
    expect(menuEl()).not.toHaveClass("open");
    expect(menuEl()).not.toHaveClass("active");
    expect(menuEl()).not.toHaveAttribute("hidden");
  });

  it("n'émet aucune classe du primitif .menu-*", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    expect(document.querySelector(".menu")).toBeNull();
    expect(document.querySelector(".menu-item")).toBeNull();
    expect(document.querySelector(".menu-divider")).toBeNull();
  });

  it("preventDefault() est appelé sur l'événement contextmenu", () => {
    renderMenu();
    const notCancelled = fireEvent.contextMenu(zoneEl(), {
      clientX: 10,
      clientY: 10,
    });
    expect(notCancelled).toBe(false);
  });
});

describe("ContextMenu — structure DS", () => {
  it("le panneau a role=menu et aria-label par défaut 'Menu contextuel'", () => {
    renderMenu();
    expect(menuEl()).toHaveAttribute("role", "menu");
    expect(menuEl()).toHaveAttribute("aria-label", "Menu contextuel");
  });

  it("aria-label surchargé par la prop label", () => {
    renderMenu({ label: "Actions fichier" });
    expect(menuEl()).toHaveAttribute("aria-label", "Actions fichier");
  });

  it("les items feuilles sont des <button type=button role=menuitem>", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    const item = screen.getByRole("menuitem", { name: "Copier" });
    expect(item.tagName).toBe("BUTTON");
    expect(item).toHaveAttribute("type", "button");
    expect(item).toHaveClass("context-menu-item");
  });

  it("l'icône d'un item est rendue dans .icon", () => {
    render(
      <ContextMenu
        className="test-zone"
        items={[
          {
            id: "copy",
            label: "Copier",
            icon: <svg data-testid="icon-copy" />,
          },
        ]}
      >
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    expect(
      screen.getByTestId("icon-copy").closest(".icon"),
    ).toBeInTheDocument();
  });

  it("le divider a la classe .context-menu-divider et role=separator", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    const divider = document.querySelector(".context-menu-divider");
    expect(divider).toBeInTheDocument();
    expect(divider).toHaveAttribute("role", "separator");
  });

  it("le conteneur n'a pas .context-target par défaut ; contextTarget l'ajoute", () => {
    const { rerender } = renderMenu();
    expect(zoneEl()).not.toHaveClass("context-target");

    rerender(
      <ContextMenu className="test-zone" items={ITEMS} contextTarget>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    expect(zoneEl()).toHaveClass("context-target");
  });

  it("targetTabIndex vaut -1 par défaut, reflété quand fourni", () => {
    const { rerender } = renderMenu();
    expect(zoneEl()).toHaveAttribute("tabindex", "-1");

    rerender(
      <ContextMenu className="test-zone" items={ITEMS} targetTabIndex={0}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    expect(zoneEl()).toHaveAttribute("tabindex", "0");
  });

  it("item parent de sous-menu = <div role=menuitem aria-haspopup=menu> avec .context-arrow et .context-submenu enfant direct", () => {
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    const parent = screen.getByRole("menuitem", { name: /Partager/ });
    expect(parent.tagName).toBe("DIV");
    expect(parent).toHaveAttribute("aria-haspopup", "menu");
    expect(parent).toHaveAttribute("aria-expanded", "false");
    // "Copier" (1er item) est le focus initial ⇒ "Partager" n'est pas encore
    // l'item roving-actif de son niveau.
    expect(parent).toHaveAttribute("tabindex", "-1");
    expect(parent.querySelector(".context-arrow")).toBeInTheDocument();

    const sub = document.querySelector(".context-submenu") as HTMLElement;
    expect(sub).toHaveAttribute("role", "menu");
    expect(sub).toHaveAttribute("aria-label", "Partager via");
    expect(sub.parentElement).toHaveClass("context-menu-item");
    // Sous-menu non ouvert : pas de .show (#750/#773).
    expect(sub).not.toHaveClass("show");

    const subItems = sub.querySelectorAll("button.context-menu-item");
    expect(subItems.length).toBe(2);
    expect(subItems[0]).toHaveAttribute("role", "menuitem");
  });
});

describe("ContextMenu — positionnement", () => {
  it("applique la position en style inline (left/top)", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 300, clientY: 200 });

    expect(menuEl().style.left).toBe("300px");
    expect(menuEl().style.top).toBe("200px");
  });

  it("borne le bord droit/bas (fonctionne malgré offsetWidth/offsetHeight === 0 en jsdom)", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 1020, clientY: 764 });

    expect(menuEl().style.left).toBe("1016px"); // 1024 - 0 - 8
    expect(menuEl().style.top).toBe("760px"); // 768 - 0 - 8
  });

  it("ramène les coordonnées négatives à la marge (8px)", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: -50, clientY: -50 });

    expect(menuEl().style.left).toBe("8px");
    expect(menuEl().style.top).toBe("8px");
  });

  it("recalcule la position à une réouverture à un autre endroit", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 50, clientY: 60 });
    expect(menuEl().style.left).toBe("50px");

    fireEvent.contextMenu(zoneEl(), { clientX: 200, clientY: 210 });
    expect(menuEl().style.left).toBe("200px");
    expect(menuEl().style.top).toBe("210px");
  });
});

describe("clampToViewport — fonction pure", () => {
  const VP = { viewportWidth: 1024, viewportHeight: 768 };

  it("laisse la position inchangée quand le menu tient", () => {
    expect(
      clampToViewport({
        x: 100,
        y: 100,
        menuWidth: 180,
        menuHeight: 200,
        ...VP,
      }),
    ).toEqual({ left: 100, top: 100 });
  });

  it("borne le bord droit à viewportWidth - menuWidth - 8", () => {
    expect(
      clampToViewport({
        x: 1000,
        y: 100,
        menuWidth: 180,
        menuHeight: 200,
        ...VP,
      }).left,
    ).toBe(1024 - 180 - 8);
  });

  it("borne le bord bas à viewportHeight - menuHeight - 8", () => {
    expect(
      clampToViewport({
        x: 100,
        y: 700,
        menuWidth: 180,
        menuHeight: 200,
        ...VP,
      }).top,
    ).toBe(768 - 200 - 8);
  });

  it("colle au bord haut/gauche quand le menu est plus grand que le viewport (ordre des bornes)", () => {
    expect(
      clampToViewport({
        x: 10,
        y: 10,
        menuWidth: 1200,
        menuHeight: 900,
        ...VP,
      }),
    ).toEqual({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN });
  });

  it("ramène les coordonnées négatives à la marge", () => {
    expect(
      clampToViewport({
        x: -50,
        y: -50,
        menuWidth: 180,
        menuHeight: 200,
        ...VP,
      }),
    ).toEqual({ left: 8, top: 8 });
  });

  it("accepte une marge custom", () => {
    expect(
      clampToViewport({
        x: 1000,
        y: 100,
        menuWidth: 180,
        menuHeight: 200,
        margin: 20,
        ...VP,
      }).left,
    ).toBe(1024 - 180 - 20);
  });
});

describe("ContextMenu — fermeture", () => {
  it("clic gauche à l'extérieur ferme le menu", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ContextMenu className="test-zone" items={ITEMS}>
          <span>Zone cible</span>
        </ContextMenu>
        <button type="button">Ailleurs</button>
      </div>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    expect(menuEl()).toHaveClass("show");

    await user.click(screen.getByRole("button", { name: "Ailleurs" }));
    expect(menuEl()).not.toHaveClass("show");
  });

  it("clic gauche sur la zone (hors panneau) ferme le menu", async () => {
    const user = userEvent.setup();
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    expect(menuEl()).toHaveClass("show");

    await user.click(screen.getByText("Zone cible"));
    expect(menuEl()).not.toHaveClass("show");
  });

  it("Escape ferme le menu et restaure le focus sur la zone", async () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    expect(menuEl()).toHaveClass("show");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuEl()).not.toHaveClass("show");
    expect(zoneEl()).toHaveFocus();
  });

  it("clic sur un item appelle onSelect, ferme le menu et restaure le focus", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ContextMenu
        className="test-zone"
        items={[{ id: "copy", label: "Copier", onSelect }]}
      >
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.click(screen.getByRole("menuitem", { name: "Copier" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(menuEl()).not.toHaveClass("show");
    expect(zoneEl()).toHaveFocus();
  });

  it("clic sur un sous-item appelle son onSelect et ferme le menu", async () => {
    const user = userEvent.setup();
    const subOnSelect = vi.fn();
    render(
      <ContextMenu
        className="test-zone"
        items={makeSubmenuItems(undefined, subOnSelect)}
      >
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.click(screen.getByRole("menuitem", { name: "Email" }));

    expect(subOnSelect).toHaveBeenCalledTimes(1);
    expect(menuEl()).not.toHaveClass("show");
  });

  it("clic sur un item parent de sous-menu SANS onSelect laisse le menu ouvert", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.click(screen.getByRole("menuitem", { name: /Partager/ }));

    expect(menuEl()).toHaveClass("show");
  });

  it("onOpenChange est appelé avec true puis false", async () => {
    const onOpenChange = vi.fn();
    renderMenu({ onOpenChange });

    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

describe("ContextMenu — instances multiples", () => {
  it("ouvrir la 2e instance ferme la 1re ; un seul .context-menu.show à la fois", () => {
    render(
      <div>
        <ContextMenu className="zone-a" items={ITEMS}>
          <span>Zone A</span>
        </ContextMenu>
        <ContextMenu className="zone-b" items={ITEMS}>
          <span>Zone B</span>
        </ContextMenu>
      </div>,
    );

    const zoneA = document.querySelector(".zone-a") as HTMLElement;
    const zoneB = document.querySelector(".zone-b") as HTMLElement;

    fireEvent.contextMenu(zoneA, { clientX: 10, clientY: 10 });
    expect(document.querySelectorAll(".context-menu.show").length).toBe(1);

    fireEvent.contextMenu(zoneB, { clientX: 20, clientY: 20 });

    expect(document.querySelectorAll(".context-menu.show").length).toBe(1);
    expect(zoneB.querySelector(".context-menu")).toHaveClass("show");
    expect(zoneA.querySelector(".context-menu")).not.toHaveClass("show");
  });
});

describe("ContextMenu — navigation clavier", () => {
  it("focus le premier item à l'ouverture", () => {
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    expect(screen.getByRole("menuitem", { name: "Copier" })).toHaveFocus();
  });

  it("ArrowDown boucle sur les items de premier niveau (dividers ignorés)", async () => {
    const user = userEvent.setup();
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    expect(screen.getByRole("menuitem", { name: "Copier" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Coller" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Sélectionner tout" }),
    ).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Copier" })).toHaveFocus();
  });

  it("ArrowUp depuis le premier item va au dernier", async () => {
    const user = userEvent.setup();
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{ArrowUp}");
    expect(
      screen.getByRole("menuitem", { name: "Sélectionner tout" }),
    ).toHaveFocus();
  });

  it("Home/End vont au premier/dernier item", async () => {
    const user = userEvent.setup();
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{End}");
    expect(
      screen.getByRole("menuitem", { name: "Sélectionner tout" }),
    ).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Copier" })).toHaveFocus();
  });

  it("Entrée sur un item feuille appelle onSelect exactement une fois", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ContextMenu
        className="test-zone"
        items={[{ id: "copy", label: "Copier", onSelect }]}
      >
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(menuEl()).not.toHaveClass("show");
  });

  it("Espace sur un item feuille appelle onSelect exactement une fois", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ContextMenu
        className="test-zone"
        items={[{ id: "copy", label: "Copier", onSelect }]}
      >
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard(" ");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(menuEl()).not.toHaveClass("show");
  });

  it("les flèches atteignent l'item parent de sous-menu (roving tabindex → 0 une fois focus)", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{ArrowDown}");
    const parent = screen.getByRole("menuitem", { name: /Partager/ });
    expect(parent).toHaveFocus();
    expect(parent).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("menuitem", { name: "Copier" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("Entrée sur l'item parent porteur d'un sous-menu OUVRE le sous-menu (jamais onSelect, même s'il est fourni) — parité #750/#773", async () => {
    const user = userEvent.setup();
    const shareOnSelect = vi.fn();
    render(
      <ContextMenu
        className="test-zone"
        items={makeSubmenuItems(shareOnSelect)}
      >
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{ArrowDown}{Enter}");

    expect(shareOnSelect).not.toHaveBeenCalled();
    expect(menuEl()).toHaveClass("show");
    const submenu = document.querySelector(".context-submenu") as HTMLElement;
    expect(submenu).toHaveClass("show");
    expect(screen.getByRole("menuitem", { name: /Partager/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
  });

  it("Espace sur l'item parent porteur d'un sous-menu l'ouvre également", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{ArrowDown} ");

    const submenu = document.querySelector(".context-submenu") as HTMLElement;
    expect(submenu).toHaveClass("show");
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
  });

  it("ArrowRight sur l'item parent ouvre le sous-menu et focus son 1er item", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{ArrowDown}{ArrowRight}");

    const submenu = document.querySelector(".context-submenu") as HTMLElement;
    expect(submenu).toHaveClass("show");
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("menuitem", { name: "Lien" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("ArrowRight sur un item SANS sous-menu est un no-op", async () => {
    const user = userEvent.setup();
    renderMenu();
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });

    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("menuitem", { name: "Copier" })).toHaveFocus();
    expect(document.querySelector(".context-submenu")).toBeNull();
  });

  it("ArrowDown/ArrowUp/Home/End naviguent (bouclant) dans le sous-menu ouvert", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    await user.keyboard("{ArrowDown}{ArrowRight}");

    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Lien" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Lien" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Lien" })).toHaveFocus();
  });

  it("ArrowLeft dans le sous-menu le referme et rend le focus à l'item parent", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    await user.keyboard("{ArrowDown}{ArrowRight}");

    const submenu = document.querySelector(".context-submenu") as HTMLElement;
    expect(submenu).toHaveClass("show");

    await user.keyboard("{ArrowLeft}");

    expect(submenu).not.toHaveClass("show");
    const parent = screen.getByRole("menuitem", { name: /Partager/ });
    expect(parent).toHaveFocus();
    expect(parent).toHaveAttribute("aria-expanded", "false");
    // Le menu racine, lui, reste ouvert.
    expect(menuEl()).toHaveClass("show");
  });

  it("Escape referme d'abord le sous-menu ouvert le plus profond (le menu racine reste show)", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    await user.keyboard("{ArrowDown}{ArrowRight}");

    const submenu = document.querySelector(".context-submenu") as HTMLElement;
    expect(submenu).toHaveClass("show");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(submenu).not.toHaveClass("show");
    expect(menuEl()).toHaveClass("show");
    expect(screen.getByRole("menuitem", { name: /Partager/ })).toHaveFocus();

    // 2e Escape : referme tout le menu, restaure le focus sur la zone.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menuEl()).not.toHaveClass("show");
    expect(zoneEl()).toHaveFocus();
  });

  it("fermer le menu racine (Escape direct, sans sous-menu ouvert) referme aussi tout sous-menu résiduel", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu className="test-zone" items={makeSubmenuItems()}>
        <span>Zone cible</span>
      </ContextMenu>,
    );
    fireEvent.contextMenu(zoneEl(), { clientX: 10, clientY: 10 });
    await user.keyboard("{ArrowDown}{ArrowRight}{ArrowLeft}");

    const submenu = document.querySelector(".context-submenu") as HTMLElement;
    expect(submenu).not.toHaveClass("show");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(menuEl()).not.toHaveClass("show");
  });
});
