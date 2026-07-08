import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Popover, PopoverProps } from "./Popover";

/** Wrapper contrôlé — reflète les changements d'état comme un vrai consumer. */
function ControlledPopover(
  props: Partial<Omit<PopoverProps, "open" | "onOpenChange">> & {
    initialOpen?: boolean;
    onOpenChange?: PopoverProps["onOpenChange"];
    trigger?: PopoverProps["trigger"];
    children?: PopoverProps["children"];
  },
) {
  const { initialOpen = false, onOpenChange, trigger, children, ...rest } =
    props;
  const [open, setOpen] = useState(initialOpen);
  return (
    <Popover
      {...rest}
      trigger={trigger ?? "Plus d'info"}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      {children ?? <p>Contenu</p>}
    </Popover>
  );
}

const trigger = "Plus d'info";
const content = <p>Contenu du panneau</p>;

afterEach(() => {
  cleanup();
});

describe("Popover — structure & câblage a11y", () => {
  it("rend .popover-wrap > button + panneau .popover TOUJOURS monté", () => {
    render(<Popover trigger={trigger}>{content}</Popover>);
    expect(document.querySelector(".popover-wrap")).toBeInTheDocument();
    const btn = document.querySelector(".popover-wrap > button");
    expect(btn).toBeInTheDocument();
    // Panneau monté même fermé (transition opacity, PAS de démontage).
    expect(document.querySelector(".popover")).toBeInTheDocument();
  });

  it("le panneau porte role='dialog' par défaut + aria-label ; le trigger aria-haspopup='dialog'", () => {
    render(
      <Popover trigger={trigger} label="Détails déploiement">
        {content}
      </Popover>,
    );
    const panel = document.querySelector(".popover");
    expect(panel).toHaveAttribute("role", "dialog");
    expect(panel).toHaveAttribute("aria-label", "Détails déploiement");
    expect(
      document.querySelector(".popover-wrap > button"),
    ).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("aria-controls du trigger === id du panneau", () => {
    render(<Popover trigger={trigger}>{content}</Popover>);
    const btn = document.querySelector(".popover-wrap > button");
    const panel = document.querySelector(".popover");
    const controls = btn?.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(panel?.getAttribute("id")).toBe(controls);
  });

  it("role='tooltip' : panneau role='tooltip' et pas d'aria-haspopup", () => {
    render(
      <Popover trigger={trigger} role="tooltip">
        {content}
      </Popover>,
    );
    expect(document.querySelector(".popover")).toHaveAttribute(
      "role",
      "tooltip",
    );
    expect(
      document.querySelector(".popover-wrap > button"),
    ).not.toHaveAttribute("aria-haspopup");
  });
});

describe("Popover — état critique .open (visibilité)", () => {
  it("fermé par défaut : PAS de .open, aria-expanded=false", () => {
    render(<Popover trigger={trigger}>{content}</Popover>);
    expect(document.querySelector(".popover")).not.toHaveClass("open");
    expect(
      document.querySelector(".popover-wrap > button"),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("clic sur le trigger : pose .open + aria-expanded=true (le panneau reste le MÊME nœud)", () => {
    render(<Popover trigger={trigger}>{content}</Popover>);
    const btn = document.querySelector(
      ".popover-wrap > button",
    ) as HTMLButtonElement;
    const panelBefore = document.querySelector(".popover");

    fireEvent.click(btn);

    const panelAfter = document.querySelector(".popover");
    expect(panelAfter).toHaveClass("open");
    expect(btn).toHaveAttribute("aria-expanded", "true");
    // Même nœud DOM avant/après : on toggle la classe, on ne démonte pas.
    expect(panelAfter).toBe(panelBefore);
  });

  it("second clic : retire .open (toggle)", () => {
    render(<Popover trigger={trigger} defaultOpen>{content}</Popover>);
    const btn = document.querySelector(
      ".popover-wrap > button",
    ) as HTMLButtonElement;
    expect(document.querySelector(".popover")).toHaveClass("open");

    fireEvent.click(btn);

    expect(document.querySelector(".popover")).not.toHaveClass("open");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("defaultOpen : ouvert au montage", () => {
    render(<Popover trigger={trigger} defaultOpen>{content}</Popover>);
    expect(document.querySelector(".popover")).toHaveClass("open");
  });
});

describe("Popover — position → modifier CSS", () => {
  it("position='top' (défaut) : aucun modifier de position", () => {
    render(<Popover trigger={trigger}>{content}</Popover>);
    const panel = document.querySelector(".popover") as HTMLElement;
    expect(panel.className).not.toMatch(/popover--/);
  });

  it.each(["bottom", "left", "right"] as const)(
    "position='%s' → .popover--%s",
    (pos) => {
      render(
        <Popover trigger={trigger} position={pos}>
          {content}
        </Popover>,
      );
      expect(document.querySelector(".popover")).toHaveClass(`popover--${pos}`);
    },
  );
});

describe("Popover — mode contrôlé", () => {
  it("la prop open pilote la classe .open (aucun état interne)", () => {
    const { rerender } = render(
      <Popover trigger={trigger} open={false} onOpenChange={() => {}}>
        {content}
      </Popover>,
    );
    expect(document.querySelector(".popover")).not.toHaveClass("open");

    rerender(
      <Popover trigger={trigger} open onOpenChange={() => {}}>
        {content}
      </Popover>,
    );
    expect(document.querySelector(".popover")).toHaveClass("open");
  });

  it("clic sur trigger : onOpenChange(true) appelé, mais l'état N'est PAS auto-appliqué sans re-render du parent", () => {
    const onOpenChange = vi.fn();
    render(
      <Popover trigger={trigger} open={false} onOpenChange={onOpenChange}>
        {content}
      </Popover>,
    );
    fireEvent.click(document.querySelector(".popover-wrap > button")!);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Contrôlé : la prop reste false → pas de .open tant que le parent ne l'applique pas.
    expect(document.querySelector(".popover")).not.toHaveClass("open");
  });

  it("wrapper contrôlé complet : clic ouvre puis referme", () => {
    render(<ControlledPopover />);
    const btn = document.querySelector(
      ".popover-wrap > button",
    ) as HTMLButtonElement;

    fireEvent.click(btn);
    expect(document.querySelector(".popover")).toHaveClass("open");

    fireEvent.click(btn);
    expect(document.querySelector(".popover")).not.toHaveClass("open");
  });
});

describe("Popover — fermeture clic extérieur", () => {
  it("clic hors du composant : ferme (retire .open) en non-contrôlé", () => {
    render(
      <div>
        <Popover trigger={trigger} defaultOpen>{content}</Popover>
        <button type="button" data-testid="outside">
          Dehors
        </button>
      </div>,
    );
    expect(document.querySelector(".popover")).toHaveClass("open");

    fireEvent.mouseDown(document.querySelector('[data-testid="outside"]')!);

    expect(document.querySelector(".popover")).not.toHaveClass("open");
  });

  it("clic à l'intérieur du panneau : NE ferme PAS", () => {
    render(
      <Popover trigger={trigger} defaultOpen>
        <button type="button" data-testid="inside">
          Action
        </button>
      </Popover>,
    );
    fireEvent.mouseDown(document.querySelector('[data-testid="inside"]')!);
    expect(document.querySelector(".popover")).toHaveClass("open");
  });

  it("closeOnOutsideClick=false : le clic extérieur ne ferme pas", () => {
    render(
      <div>
        <Popover trigger={trigger} defaultOpen closeOnOutsideClick={false}>
          {content}
        </Popover>
        <button type="button" data-testid="outside">
          Dehors
        </button>
      </div>,
    );
    fireEvent.mouseDown(document.querySelector('[data-testid="outside"]')!);
    expect(document.querySelector(".popover")).toHaveClass("open");
  });

  it("contrôlé : clic extérieur appelle onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(
      <div>
        <ControlledPopover initialOpen onOpenChange={onOpenChange} />
        <button type="button" data-testid="outside">
          Dehors
        </button>
      </div>,
    );
    fireEvent.mouseDown(document.querySelector('[data-testid="outside"]')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.querySelector(".popover")).not.toHaveClass("open");
  });
});

describe("Popover — Escape", () => {
  it("Escape ferme le popover + restaure le focus sur le trigger", () => {
    render(<Popover trigger={trigger} defaultOpen>{content}</Popover>);
    expect(document.querySelector(".popover")).toHaveClass("open");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.querySelector(".popover")).not.toHaveClass("open");
    expect(document.activeElement).toBe(
      document.querySelector(".popover-wrap > button"),
    );
  });

  it("closeOnEscape=false : Escape ne ferme pas", () => {
    render(
      <Popover trigger={trigger} defaultOpen closeOnEscape={false}>
        {content}
      </Popover>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector(".popover")).toHaveClass("open");
  });

  it("fermé : aucun listener global actif (Escape sans effet, pas d'erreur)", () => {
    render(<Popover trigger={trigger}>{content}</Popover>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector(".popover")).not.toHaveClass("open");
  });
});

describe("Popover — classes additionnelles & panneau", () => {
  it("className s'applique sur .popover-wrap", () => {
    render(
      <Popover trigger={trigger} className="ma-classe">
        {content}
      </Popover>,
    );
    expect(document.querySelector(".popover-wrap")).toHaveClass("ma-classe");
  });

  it("panelClassName s'applique sur .popover (sans écraser .popover ni la position)", () => {
    render(
      <Popover
        trigger={trigger}
        position="left"
        panelClassName="w-40"
      >
        {content}
      </Popover>,
    );
    const panel = document.querySelector(".popover");
    expect(panel).toHaveClass("popover");
    expect(panel).toHaveClass("popover--left");
    expect(panel).toHaveClass("w-40");
  });

  it("rend le contenu enfant dans le panneau", () => {
    render(
      <Popover trigger={trigger}>
        <h4>Titre</h4>
        <p>Corps</p>
      </Popover>,
    );
    const panel = document.querySelector(".popover");
    expect(panel?.querySelector("h4")).toHaveTextContent("Titre");
    expect(panel?.querySelector("p")).toHaveTextContent("Corps");
  });
});

describe("Popover — nettoyage", () => {
  it("retire les listeners globaux au démontage (pas d'erreur sur Escape après unmount)", () => {
    const { unmount } = render(
      <Popover trigger={trigger} defaultOpen>{content}</Popover>,
    );
    unmount();
    expect(() =>
      fireEvent.keyDown(document, { key: "Escape" }),
    ).not.toThrow();
  });
});
