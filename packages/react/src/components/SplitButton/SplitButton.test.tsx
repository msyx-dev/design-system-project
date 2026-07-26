import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SplitButton, SplitButtonItem } from "./SplitButton";

afterEach(cleanup);

const ITEMS: SplitButtonItem[] = [
  { id: "save-close", label: "Enregistrer et fermer" },
  { id: "save-draft", label: "Enregistrer comme brouillon" },
  { type: "divider" },
  { id: "revert", label: "Annuler les modifications", danger: true },
];

/** Raccourcis de lecture du markup DS (toujours scopés au container du test). */
const wrapOf = (c: HTMLElement) =>
  c.querySelector<HTMLElement>(".split-button")!;
const caretOf = (c: HTMLElement) =>
  c.querySelector<HTMLButtonElement>(".split-button__caret")!;
const panelOf = (c: HTMLElement) =>
  c.querySelector<HTMLElement>(".split-button__menu")!;

describe("SplitButton — structure & classes DS", () => {
  it("rend .split-button avec l'action en 1er enfant, le caret en 2e, le panneau en 3e", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const wrap = wrapOf(container);
    expect(wrap).toBeInTheDocument();
    expect(wrap.children).toHaveLength(3);

    // buttons.css:122 — `.split-button > .btn-primary:first-child` : si un
    // élément s'intercale avant, le radius jointif saute.
    const action = wrap.children[0];
    expect(action.tagName).toBe("BUTTON");
    expect(action).toHaveClass("btn-primary");
    expect(action).not.toHaveClass("split-button__caret");
    expect(action).toHaveTextContent("Enregistrer");

    const caret = wrap.children[1];
    expect(caret).toHaveClass("btn-primary", "split-button__caret");

    const panel = wrap.children[2];
    expect(panel).toHaveClass("menu", "split-button__menu");
  });

  it("le panneau porte À LA FOIS .menu et .split-button__menu, et AUCUNE classe .action-menu-*", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const panel = panelOf(container);
    // Les deux classes sont load-bearing : `.menu` = surface (menu.css),
    // `.split-button__menu` = positionnement + état (buttons.css:155-174).
    expect(panel).toHaveClass("menu");
    expect(panel).toHaveClass("split-button__menu");

    // Alias @deprecated (suppression v3) — émis par <ActionMenu>, jamais ici.
    expect(container.querySelector(".action-menu")).toBeNull();
    expect(container.querySelector(".action-menu-wrap")).toBeNull();
    expect(container.querySelector(".action-menu-item")).toBeNull();
    expect(container.querySelector(".action-menu-divider")).toBeNull();
    expect(container.querySelector(".action-menu-trigger")).toBeNull();
  });

  it("rend les items en .menu-item[role=menuitem] et l'item danger en .menu-item--danger", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const items = container.querySelectorAll<HTMLButtonElement>(".menu-item");
    expect(items).toHaveLength(3);

    const revert = screen.getByRole("menuitem", {
      name: "Annuler les modifications",
    });
    expect(revert).toHaveClass("menu-item", "menu-item--danger");

    const saveClose = screen.getByRole("menuitem", {
      name: "Enregistrer et fermer",
    });
    expect(saveClose).not.toHaveClass("menu-item--danger");
  });

  it("rend le séparateur en .menu-divider avec role=separator", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const divider = container.querySelector(".menu-divider");
    expect(divider).not.toBeNull();
    expect(divider).toHaveAttribute("role", "separator");
  });

  it("n'invente aucune classe hors DS (pas de .menu-icon, .split-button__action, .split-button-menu)", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    expect(container.querySelector(".menu-icon")).toBeNull();
    expect(container.querySelector(".split-button__action")).toBeNull();
    expect(container.querySelector(".split-button-menu")).toBeNull();
  });

  it("variant='secondary' applique .btn-secondary aux deux boutons et jamais .btn-primary", () => {
    const { container } = render(
      <SplitButton label="Exporter" variant="secondary" items={ITEMS} />,
    );

    const wrap = wrapOf(container);
    const action = wrap.children[0];
    const caret = caretOf(container);

    expect(action).toHaveClass("btn-secondary");
    expect(caret).toHaveClass("btn-secondary");
    expect(action).not.toHaveClass("btn-primary");
    expect(caret).not.toHaveClass("btn-primary");
  });

  it("rend l'icône de l'item comme enfant direct du .menu-item", () => {
    const { container } = render(
      <SplitButton
        label="Enregistrer"
        items={[
          {
            id: "with-icon",
            label: "Avec icône",
            icon: <svg data-testid="icon-x" />,
          },
        ]}
      />,
    );

    const item = container.querySelector(".menu-item")!;
    expect(within(item).getByTestId("icon-x")).toBeInTheDocument();
  });

  it("n'émet AUCUN <use> (Icon auto-contenu #713) et rend le glyphe chevron-down dans le caret", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    expect(container.querySelector("use")).toBeNull();
    expect(
      caretOf(container).querySelector('svg[data-icon="chevron-down"]'),
    ).not.toBeNull();
  });
});

describe("SplitButton — classe d'état .open (garde anti-régression #612)", () => {
  it("pose .open sur .split-button__menu UNIQUEMENT — jamais sur le wrapper ni sur le caret", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const wrap = wrapOf(container);
    const caret = caretOf(container);
    const panel = panelOf(container);

    // --- Fermé ---------------------------------------------------------
    // NOTE jsdom : le CSS DS n'est pas chargé, `visibility:hidden` n'a aucun
    // effet et le panneau est TOUJOURS monté (transition CSS de sortie).
    // La classe est donc la SEULE source de vérité testable.
    expect(panel).not.toHaveClass("open");
    expect(wrap).not.toHaveClass("open");
    expect(caret).not.toHaveClass("open");
    expect(caret).toHaveAttribute("aria-expanded", "false");

    // --- Ouvert --------------------------------------------------------
    await user.click(caret);

    expect(panel).toHaveClass("open"); // buttons.css:170 — le seul sélecteur qui existe
    expect(wrap).not.toHaveClass("open"); // aucun `.split-button.open` en CSS
    expect(caret).not.toHaveClass("open"); // aucun `.split-button__caret.open` en CSS
    expect(caret).toHaveAttribute("aria-expanded", "true");

    // Un seul élément du sous-arbre porte `.open`, et c'est le panneau.
    const opened = container.querySelectorAll(".open");
    expect(opened).toHaveLength(1);
    expect(opened[0]).toBe(panel);
  });

  it("n'émet jamais les variantes de classe erronées (.split-button--open, .split-button__menu--open)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    await user.click(caretOf(container));

    // Écart spec↔code déjà payé sur le graph (#663 : `.graph-node.selected`
    // annoncé vs `.graph-node--selected` réel). Ici la convention DS est
    // l'état `.open` nu, PAS un modifieur BEM.
    expect(container.querySelector(".split-button--open")).toBeNull();
    expect(container.querySelector(".split-button__menu--open")).toBeNull();
    expect(container.querySelector(".split-button__caret--open")).toBeNull();
  });

  it("garde le panneau MONTÉ après fermeture (transition CSS de sortie) et le rend inert", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const panel = panelOf(container);
    expect(panel).toHaveAttribute("inert"); // fermé au montage

    await user.click(caretOf(container));
    expect(panel).not.toHaveAttribute("inert");

    await user.keyboard("{Escape}");
    // Toujours dans le DOM : un démontage tuerait l'animation de sortie.
    expect(panelOf(container)).toBe(panel);
    expect(panel).not.toHaveClass("open");
    expect(panel).toHaveAttribute("inert");
  });
});

describe("SplitButton — ARIA (WAI-ARIA APG Menu Button)", () => {
  it("caret : aria-haspopup=menu + aria-label + aria-controls vers le panneau", () => {
    const { container } = render(
      <SplitButton
        label="Exporter"
        variant="secondary"
        caretLabel="Plus d'options d'export"
        items={ITEMS}
      />,
    );

    const caret = caretOf(container);
    const panel = panelOf(container);

    expect(caret).toHaveAttribute("aria-haspopup", "menu");
    expect(caret).toHaveAttribute("aria-expanded", "false");
    // §3 DS-PRINCIPLES : bouton icon-only → aria-label OBLIGATOIRE.
    expect(caret).toHaveAccessibleName("Plus d'options d'export");
    expect(caret).toHaveAttribute("aria-controls", panel.id);

    expect(panel).toHaveAttribute("role", "menu");
    expect(panel).toHaveAttribute("aria-labelledby", caret.id);

    // Menu d'actions (APG Menu Button), PAS un choix exclusif : la convention
    // radiogroup de DS-PRINCIPLES §3.2 ne s'applique pas ici.
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(container.querySelector('[role="radio"]')).toBeNull();
    expect(container.querySelector("[aria-checked]")).toBeNull();
    expect(container.querySelector("[aria-pressed]")).toBeNull();
  });

  it("items : role=menuitem + roving tabindex -1 (focus déplacé programmatiquement)", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const items = container.querySelectorAll<HTMLButtonElement>(".menu-item");
    expect(items).toHaveLength(3); // 3 items + 1 divider (non compté)
    items.forEach((item) => {
      expect(item).toHaveAttribute("role", "menuitem");
      expect(item).toHaveAttribute("tabindex", "-1");
      expect(item.getAttribute("type")).toBe("button");
    });
  });
});

describe("SplitButton — interactions souris", () => {
  it("clic sur un item : onSelect, fermeture, focus restauré sur le caret", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <SplitButton
        label="Enregistrer"
        items={[{ id: "save-close", label: "Enregistrer et fermer", onSelect }]}
      />,
    );

    const caret = caretOf(container);
    await user.click(caret);
    await user.click(
      screen.getByRole("menuitem", { name: "Enregistrer et fermer" }),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(panelOf(container)).not.toHaveClass("open");
    expect(caret).toHaveAttribute("aria-expanded", "false");
    expect(caret).toHaveFocus();
  });

  it("clic sur le caret ouvre puis referme (toggle)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const caret = caretOf(container);
    const panel = panelOf(container);

    await user.click(caret);
    expect(panel).toHaveClass("open");
    expect(caret).toHaveAttribute("aria-expanded", "true");

    await user.click(caret);
    expect(panel).not.toHaveClass("open");
    expect(caret).toHaveAttribute("aria-expanded", "false");
  });

  it("clic sur le bouton d'action appelle onClick et n'ouvre PAS le menu", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <SplitButton label="Enregistrer" onClick={onClick} items={ITEMS} />,
    );

    const wrap = wrapOf(container);
    await user.click(wrap.children[0] as HTMLElement);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(panelOf(container)).not.toHaveClass("open");
  });

  it("clic sur un item disabled n'appelle pas onSelect et laisse le menu ouvert", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <SplitButton
        label="Enregistrer"
        items={[
          {
            id: "disabled-item",
            label: "Indisponible",
            disabled: true,
            onSelect,
          },
        ]}
      />,
    );

    await user.click(caretOf(container));
    const item = screen.getByRole("menuitem", { name: "Indisponible" });
    expect(item).toBeDisabled();

    await user.click(item);
    expect(onSelect).not.toHaveBeenCalled();
    expect(panelOf(container)).toHaveClass("open");
  });

  it("clic à l'extérieur ferme le menu (sans voler le focus)", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SplitButton label="Enregistrer" items={ITEMS} />
        <button type="button">Ailleurs</button>
      </div>,
    );

    const caret = screen.getByRole("button", { name: "Plus d'actions" });
    await user.click(caret);
    expect(screen.getByRole("menu")).toHaveClass("open");

    await user.click(screen.getByRole("button", { name: "Ailleurs" }));
    expect(screen.getByRole("menu")).not.toHaveClass("open");
  });

  it("ouvrir un second SplitButton ferme le premier", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <SplitButton
          label="A"
          items={[{ id: "a1", label: "Item A" }]}
          className="split-a"
        />
        <SplitButton
          label="B"
          items={[{ id: "b1", label: "Item B" }]}
          className="split-b"
        />
      </div>,
    );

    const wrapA = container.querySelector<HTMLElement>(".split-a")!;
    const wrapB = container.querySelector<HTMLElement>(".split-b")!;
    const panelA = wrapA.querySelector<HTMLElement>(".split-button__menu")!;
    const panelB = wrapB.querySelector<HTMLElement>(".split-button__menu")!;
    const caretA = wrapA.querySelector<HTMLButtonElement>(
      ".split-button__caret",
    )!;
    const caretB = wrapB.querySelector<HTMLButtonElement>(
      ".split-button__caret",
    )!;

    await user.click(caretA);
    expect(panelA).toHaveClass("open");

    await user.click(caretB);
    expect(panelA).not.toHaveClass("open");
    expect(panelB).toHaveClass("open");
  });
});

describe("SplitButton — navigation clavier", () => {
  it("ArrowDown sur le caret ouvre le menu et focus le premier item activable", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    caretOf(container).focus();
    await user.keyboard("{ArrowDown}");

    expect(panelOf(container)).toHaveClass("open");
    expect(
      screen.getByRole("menuitem", { name: "Enregistrer et fermer" }),
    ).toHaveFocus();
  });

  it("ArrowDown/ArrowUp déplacent le focus en bouclant (le divider est ignoré)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    await user.click(caretOf(container));
    expect(
      screen.getByRole("menuitem", { name: "Enregistrer et fermer" }),
    ).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Enregistrer comme brouillon" }),
    ).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Annuler les modifications" }),
    ).toHaveFocus();

    await user.keyboard("{ArrowDown}"); // bouclage
    expect(
      screen.getByRole("menuitem", { name: "Enregistrer et fermer" }),
    ).toHaveFocus();

    await user.keyboard("{ArrowUp}"); // bouclage inverse
    expect(
      screen.getByRole("menuitem", { name: "Annuler les modifications" }),
    ).toHaveFocus();
  });

  it("Home/End vont au premier/dernier item activable", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    await user.click(caretOf(container));
    await user.keyboard("{End}");
    expect(
      screen.getByRole("menuitem", { name: "Annuler les modifications" }),
    ).toHaveFocus();

    await user.keyboard("{Home}");
    expect(
      screen.getByRole("menuitem", { name: "Enregistrer et fermer" }),
    ).toHaveFocus();
  });

  it("la navigation clavier saute les items disabled", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton
        label="Enregistrer"
        items={[
          { id: "a", label: "A" },
          { id: "b", label: "B", disabled: true },
          { id: "c", label: "C" },
        ]}
      />,
    );

    await user.click(caretOf(container));
    expect(screen.getByRole("menuitem", { name: "A" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "C" })).toHaveFocus();
  });

  it("Échap ferme le menu et restaure le focus sur le caret", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} />,
    );

    const caret = caretOf(container);
    await user.click(caret);
    expect(panelOf(container)).toHaveClass("open");

    await user.keyboard("{Escape}");
    expect(panelOf(container)).not.toHaveClass("open");
    expect(caret).toHaveFocus();
  });

  it("Entrée sur un item déclenche onSelect et ferme", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <SplitButton
        label="Enregistrer"
        items={[{ id: "save-close", label: "Enregistrer et fermer", onSelect }]}
      />,
    );

    await user.click(caretOf(container));
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(panelOf(container)).not.toHaveClass("open");
  });
});

describe("SplitButton — disabled global", () => {
  it("disabled désactive l'action ET le caret", () => {
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} disabled />,
    );

    const wrap = wrapOf(container);
    expect(wrap.children[0]).toBeDisabled();
    expect(caretOf(container)).toBeDisabled();
  });

  it("disabled : le clic sur le caret n'ouvre pas le menu", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SplitButton label="Enregistrer" items={ITEMS} disabled />,
    );

    const caret = caretOf(container);
    await user.click(caret);

    expect(panelOf(container)).not.toHaveClass("open");
    expect(caret).toHaveAttribute("aria-expanded", "false");
  });

  it("disabled : le clic sur l'action n'appelle pas onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <SplitButton
        label="Enregistrer"
        onClick={onClick}
        items={ITEMS}
        disabled
      />,
    );

    const wrap = wrapOf(container);
    await user.click(wrap.children[0] as HTMLElement);
    expect(onClick).not.toHaveBeenCalled();
  });
});
