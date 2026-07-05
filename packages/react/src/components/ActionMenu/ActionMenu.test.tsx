import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ActionMenu, ActionMenuItem } from "./ActionMenu";

const ITEMS: ActionMenuItem[] = [
  { id: "edit", label: "Éditer" },
  { id: "duplicate", label: "Dupliquer" },
  { type: "divider" },
  { id: "delete", label: "Supprimer" },
];

describe("ActionMenu — structure", () => {
  it("rend le markup canonique .action-menu-wrap/.action-menu-trigger, menu fermé par défaut", () => {
    render(<ActionMenu label="Actions" items={ITEMS} />);

    const wrap = document.querySelector(".action-menu-wrap");
    expect(wrap).toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(trigger).toHaveClass("action-menu-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    expect(document.querySelector(".action-menu")).not.toBeInTheDocument();
  });

  it("rend l'icône du trigger dans .action-menu-icon pour chaque item", async () => {
    const user = userEvent.setup();
    render(
      <ActionMenu
        label="Actions"
        items={[
          {
            id: "edit",
            label: "Éditer",
            icon: <svg data-testid="icon-edit" />,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));

    const icon = screen.getByTestId("icon-edit");
    expect(icon.closest(".action-menu-icon")).toBeInTheDocument();
  });

  it("rend un divider avec role=separator", async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="Actions" items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));

    const divider = document.querySelector(".action-menu-divider");
    expect(divider).toBeInTheDocument();
    expect(divider).toHaveAttribute("role", "separator");
  });

  it("rend le contenu custom trigger prioritaire sur label/icon", () => {
    render(
      <ActionMenu
        trigger={<span data-testid="custom-trigger">⋮</span>}
        label="Ignoré"
        items={ITEMS}
      />,
    );
    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
    expect(screen.queryByText("Ignoré")).not.toBeInTheDocument();
  });
});

describe("ActionMenu — ouverture / fermeture", () => {
  it("clic sur le trigger ouvre le menu et reflète aria-expanded", async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="Actions" items={ITEMS} />);

    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = document.querySelector(".action-menu");
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute("role", "menu");
    // Garde anti-régression : le CSS DS (overlays.css) laisse .action-menu en
    // opacity:0/visibility:hidden — seul .action-menu.open est visible.
    expect(menu).toHaveClass("open");
  });

  it("re-clic sur le trigger referme le menu (toggle)", async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="Actions" items={ITEMS} />);

    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);
    expect(document.querySelector(".action-menu")).toBeInTheDocument();

    await user.click(trigger);
    expect(document.querySelector(".action-menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("clic sur un item appelle onSelect et ferme le menu", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ActionMenu
        label="Actions"
        items={[{ id: "edit", label: "Éditer", onSelect }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Éditer" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".action-menu")).not.toBeInTheDocument();
  });

  it("clic sur un item disabled n'appelle pas onSelect et ne ferme pas le menu", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ActionMenu
        label="Actions"
        items={[{ id: "edit", label: "Éditer", onSelect, disabled: true }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));
    const item = screen.getByRole("menuitem", { name: "Éditer" });
    expect(item).toBeDisabled();

    await user.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Échap ferme le menu et restaure le focus sur le trigger", async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="Actions" items={ITEMS} />);

    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);
    expect(document.querySelector(".action-menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(document.querySelector(".action-menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("clic à l'extérieur ferme le menu", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ActionMenu label="Actions" items={ITEMS} />
        <button type="button">Ailleurs</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(document.querySelector(".action-menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ailleurs" }));

    expect(document.querySelector(".action-menu")).not.toBeInTheDocument();
  });
});

describe("ActionMenu — navigation clavier", () => {
  it("focus le premier item activable à l'ouverture", async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="Actions" items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.getByRole("menuitem", { name: "Éditer" })).toHaveFocus();
  });

  it("ArrowDown/ArrowUp déplacent le focus entre les items en bouclant", async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="Actions" items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menuitem", { name: "Éditer" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Dupliquer" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Supprimer" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Éditer" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Supprimer" })).toHaveFocus();
  });

  it("Home/End vont au premier/dernier item activable", async () => {
    const user = userEvent.setup();
    render(<ActionMenu label="Actions" items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Supprimer" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Éditer" })).toHaveFocus();
  });

  it("la navigation clavier saute les items disabled", async () => {
    const user = userEvent.setup();
    render(
      <ActionMenu
        label="Actions"
        items={[
          { id: "a", label: "A" },
          { id: "b", label: "B", disabled: true },
          { id: "c", label: "C" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menuitem", { name: "A" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "C" })).toHaveFocus();
  });
});
