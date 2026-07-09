import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FAB, FabAction } from "./FAB";

const ACTIONS: FabAction[] = [
  { id: "share", label: "Partager", icon: <span data-testid="ic-share">↑</span> },
  { id: "edit", label: "Modifier", icon: <span data-testid="ic-edit">✎</span> },
  {
    id: "delete",
    label: "Supprimer",
    icon: <span data-testid="ic-del">🗑</span>,
    danger: true,
  },
];

describe("FAB — structure", () => {
  it("rend le markup canonique .fab-menu/.fab-actions/.fab-action/.fab-trigger, fermé par défaut", () => {
    render(<FAB actions={ACTIONS} />);

    const menu = document.querySelector(".fab-menu");
    expect(menu).toBeInTheDocument();
    // État fermé : PAS de .open sur le conteneur persistant.
    expect(menu).not.toHaveClass("open");
    expect(menu).toHaveAttribute("aria-label", "Menu actions");

    const actionsWrap = document.querySelector(".fab-actions");
    expect(actionsWrap).toBeInTheDocument();
    expect(actionsWrap).toHaveAttribute("aria-live", "polite");

    const trigger = screen.getByRole("button", { name: "Ouvrir les actions" });
    expect(trigger).toHaveClass("fab", "fab-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("monte les .fab-action EN PERMANENCE même menu fermé (anim opacity/transform gérée par CSS via .open)", () => {
    render(<FAB actions={ACTIONS} />);

    // Piège #612 : contrairement à ActionMenu, le montage NE doit PAS être
    // conditionnel — les actions existent dès le rendu fermé.
    expect(document.querySelector(".fab-menu")).not.toHaveClass("open");
    expect(document.querySelectorAll(".fab-action")).toHaveLength(3);
    expect(document.querySelectorAll(".fab-action-btn")).toHaveLength(3);
    expect(document.querySelectorAll(".fab-action-label")).toHaveLength(3);
    // Boutons cliquables présents dans le DOM même fermé.
    expect(
      screen.getByRole("button", { name: "Partager" }),
    ).toBeInTheDocument();
  });

  it("enveloppe l'icône du trigger dans .fab-icon-main (cible de la rotation 45°)", () => {
    render(<FAB actions={ACTIONS} icon={<span data-testid="trg-icon">＋</span>} />);

    const icon = screen.getByTestId("trg-icon");
    expect(icon.closest(".fab-icon-main")).toBeInTheDocument();
  });

  it('utilise "+" comme icône de trigger par défaut', () => {
    render(<FAB actions={ACTIONS} />);
    const iconMain = document.querySelector(".fab-icon-main");
    expect(iconMain).toBeInTheDocument();
    expect(iconMain).toHaveTextContent("+");
  });

  it("rend le label dans .fab-action-label et l'icône dans .fab-action-btn", () => {
    render(<FAB actions={ACTIONS} />);

    const shareBtn = screen.getByRole("button", { name: "Partager" });
    expect(shareBtn).toHaveClass("fab-action-btn");
    expect(shareBtn).toContainElement(screen.getByTestId("ic-share"));

    const label = document.querySelector(".fab-action-label");
    expect(label).toHaveTextContent("Partager");
  });

  it("aria-label de l'action = ariaLabel explicite, sinon fallback sur label chaîne", () => {
    render(
      <FAB
        actions={[
          { id: "a", label: "Partager", icon: <span>↑</span> },
          {
            id: "b",
            label: <strong>Riche</strong>,
            icon: <span>x</span>,
            ariaLabel: "Action riche",
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Partager" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Action riche" }),
    ).toBeInTheDocument();
  });
});

describe("FAB — styles inline requis", () => {
  it("pose color:var(--danger) inline sur l'action danger (aucune classe DS de couleur)", () => {
    render(<FAB actions={ACTIONS} />);

    const delBtn = screen.getByRole("button", { name: "Supprimer" });
    expect(delBtn.style.color).toBe("var(--danger)");

    // Les actions non-danger ne portent pas de couleur inline.
    const shareBtn = screen.getByRole("button", { name: "Partager" });
    expect(shareBtn.style.color).toBe("");
  });

  it("forwarde className ET style sur .fab-menu (positionnement fixe prod)", () => {
    render(
      <FAB
        actions={ACTIONS}
        className="fab-fixed"
        style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem" }}
      />,
    );

    const menu = document.querySelector(".fab-menu") as HTMLElement;
    expect(menu).toHaveClass("fab-menu", "fab-fixed");
    expect(menu.style.position).toBe("fixed");
    expect(menu.style.bottom).toBe("1.5rem");
    expect(menu.style.right).toBe("1.5rem");
  });
});

describe("FAB — ouverture / fermeture", () => {
  it("clic sur le trigger ajoute .open sur .fab-menu et passe aria-expanded=true", async () => {
    const user = userEvent.setup();
    render(<FAB actions={ACTIONS} />);

    const trigger = screen.getByRole("button", { name: "Ouvrir les actions" });
    await user.click(trigger);

    // Garde anti-régression #612 : le CSS DS laisse .fab-action en opacity:0 —
    // seul .fab-menu.open les révèle. C'est LA classe d'état load-bearing.
    expect(document.querySelector(".fab-menu")).toHaveClass("open");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("re-clic sur le trigger referme le menu (toggle)", async () => {
    const user = userEvent.setup();
    render(<FAB actions={ACTIONS} />);

    const trigger = screen.getByRole("button", { name: "Ouvrir les actions" });
    await user.click(trigger);
    expect(document.querySelector(".fab-menu")).toHaveClass("open");

    await user.click(trigger);
    expect(document.querySelector(".fab-menu")).not.toHaveClass("open");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("clic sur une action appelle onSelect puis ferme le menu", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FAB
        actions={[
          { id: "share", label: "Partager", icon: <span>↑</span>, onSelect },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ouvrir les actions" }));
    expect(document.querySelector(".fab-menu")).toHaveClass("open");

    await user.click(screen.getByRole("button", { name: "Partager" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".fab-menu")).not.toHaveClass("open");
  });

  it("Escape ferme le menu et restaure le focus sur le trigger", async () => {
    const user = userEvent.setup();
    render(<FAB actions={ACTIONS} />);

    const trigger = screen.getByRole("button", { name: "Ouvrir les actions" });
    await user.click(trigger);
    expect(document.querySelector(".fab-menu")).toHaveClass("open");

    await user.keyboard("{Escape}");

    expect(document.querySelector(".fab-menu")).not.toHaveClass("open");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("clic à l'extérieur ferme le menu", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <FAB actions={ACTIONS} />
        <button type="button">Ailleurs</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Ouvrir les actions" }));
    expect(document.querySelector(".fab-menu")).toHaveClass("open");

    await user.click(screen.getByRole("button", { name: "Ailleurs" }));

    expect(document.querySelector(".fab-menu")).not.toHaveClass("open");
  });

  it("ouvrir un second FAB ferme le premier (via clic-extérieur)", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <FAB actions={ACTIONS} triggerLabel="FAB A" />
        <FAB actions={ACTIONS} triggerLabel="FAB B" />
      </div>,
    );

    const menus = document.querySelectorAll(".fab-menu");
    await user.click(screen.getByRole("button", { name: "FAB A" }));
    expect(menus[0]).toHaveClass("open");

    await user.click(screen.getByRole("button", { name: "FAB B" }));
    expect(menus[0]).not.toHaveClass("open");
    expect(menus[1]).toHaveClass("open");
  });
});

describe("FAB — a11y actions fermées (inert + tabIndex, vérif adversariale)", () => {
  it("menu fermé : .fab-actions porte inert, chaque .fab-action-btn est tabIndex=-1", () => {
    render(<FAB actions={ACTIONS} />);

    expect(document.querySelector(".fab-actions")).toHaveAttribute("inert");
    document.querySelectorAll(".fab-action-btn").forEach((btn) => {
      expect(btn).toHaveAttribute("tabindex", "-1");
    });
  });

  it("menu ouvert : .fab-actions ne porte plus inert, les .fab-action-btn redeviennent tabbables", async () => {
    const user = userEvent.setup();
    render(<FAB actions={ACTIONS} />);

    await user.click(screen.getByRole("button", { name: "Ouvrir les actions" }));

    expect(document.querySelector(".fab-actions")).not.toHaveAttribute(
      "inert",
    );
    document.querySelectorAll(".fab-action-btn").forEach((btn) => {
      expect(btn).not.toHaveAttribute("tabindex");
    });
  });

  it("le .fab-trigger reste TOUJOURS focusable/tabbable, menu fermé ou ouvert", async () => {
    const user = userEvent.setup();
    render(<FAB actions={ACTIONS} />);
    const trigger = screen.getByRole("button", { name: "Ouvrir les actions" });

    expect(trigger).not.toHaveAttribute("tabindex", "-1");
    expect(trigger).not.toHaveAttribute("inert");

    await user.click(trigger);
    expect(trigger).not.toHaveAttribute("tabindex", "-1");
    expect(trigger).not.toHaveAttribute("inert");
  });

  it("menu fermé : Tab depuis un élément externe ATTEINT le trigger mais PAS un .fab-action-btn (DOM : actions AVANT trigger)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button data-testid="before">Avant</button>
        <FAB actions={ACTIONS} />
      </>,
    );
    const before = screen.getByTestId("before") as HTMLButtonElement;
    before.focus();
    expect(before).toHaveFocus();

    await user.tab();

    document.querySelectorAll(".fab-action-btn").forEach((btn) => {
      expect(document.activeElement).not.toBe(btn);
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Ouvrir les actions" }),
    );
  });

  it("menu ouvert : Tab depuis un élément externe ATTEINT le premier .fab-action-btn (redevenu tabbable, avant le trigger dans le DOM)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button data-testid="before">Avant</button>
        <FAB actions={ACTIONS} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Ouvrir les actions" }));

    const before = screen.getByTestId("before") as HTMLButtonElement;
    before.focus();
    expect(before).toHaveFocus();

    await user.tab();

    const firstActionBtn = document.querySelector(".fab-action-btn");
    expect(document.activeElement).toBe(firstActionBtn);
  });
});
