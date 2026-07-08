import { ReactNode, useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Drawer, DrawerProps } from "./Drawer";

/** Wrapper contrôlé avec un déclencheur — reflète un vrai consumer. */
function ControlledDrawer(
  props: Partial<Omit<DrawerProps, "open" | "onClose" | "children">> & {
    initialOpen?: boolean;
    onClose?: () => void;
    children?: ReactNode;
  },
) {
  const { initialOpen = false, onClose, children = "Contenu", ...rest } = props;
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button data-testid="trigger" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <Drawer
        {...rest}
        open={open}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
      >
        {children}
      </Drawer>
    </>
  );
}

afterEach(() => {
  cleanup();
});

describe("Drawer — structure & a11y", () => {
  it("rend .drawer-overlay + .drawer-panel[role=dialog][aria-modal]", () => {
    render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    const overlay = document.querySelector(".drawer-overlay");
    const panel = document.querySelector(".drawer-panel");
    expect(overlay).toBeInTheDocument();
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute("role", "dialog");
    expect(panel).toHaveAttribute("aria-modal", "true");
  });

  it("le bouton .drawer-close porte l'aria-label par défaut 'Fermer'", () => {
    render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-close")).toHaveAttribute(
      "aria-label",
      "Fermer",
    );
  });

  it("closeLabel personnalise l'aria-label du bouton de fermeture", () => {
    render(
      <Drawer open onClose={() => {}} closeLabel="Fermer le panneau">
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-close")).toHaveAttribute(
      "aria-label",
      "Fermer le panneau",
    );
  });

  it("le titre est rendu dans un <h3> lié au panneau via aria-labelledby", () => {
    render(
      <Drawer open onClose={() => {}} title="Détails du projet">
        Corps
      </Drawer>,
    );
    const heading = document.querySelector(".drawer-header h3");
    const panel = document.querySelector(".drawer-panel");
    expect(heading).toHaveTextContent("Détails du projet");
    expect(heading?.id).toBeTruthy();
    expect(panel).toHaveAttribute("aria-labelledby", heading?.id as string);
  });

  it("sans titre : pas de <h3> ni d'aria-labelledby", () => {
    render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-header h3")).not.toBeInTheDocument();
    expect(document.querySelector(".drawer-panel")).not.toHaveAttribute(
      "aria-labelledby",
    );
  });

  it("rend le contenu dans .drawer-body", () => {
    render(
      <Drawer open onClose={() => {}}>
        <p data-testid="body-content">Formulaire</p>
      </Drawer>,
    );
    const body = document.querySelector(".drawer-body");
    expect(body).toBeInTheDocument();
    expect(body?.querySelector('[data-testid="body-content"]')).toHaveTextContent(
      "Formulaire",
    );
  });
});

describe("Drawer — état critique : classe .open sur overlay ET panel (#612)", () => {
  it("open=false : NI overlay NI panel n'ont la classe .open", () => {
    render(
      <Drawer open={false} onClose={() => {}}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-overlay")).not.toHaveClass("open");
    expect(document.querySelector(".drawer-panel")).not.toHaveClass("open");
  });

  it("open=true : overlay ET panel portent SIMULTANÉMENT la classe .open", () => {
    render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    // Sans .open l'overlay est opacity:0/pointer-events:none et le panel
    // translateX(100%) hors écran — les deux DOIVENT l'avoir.
    expect(document.querySelector(".drawer-overlay")).toHaveClass("open");
    expect(document.querySelector(".drawer-panel")).toHaveClass("open");
  });

  it("le toggle open→false retire .open des DEUX éléments", () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-overlay")).toHaveClass("open");
    expect(document.querySelector(".drawer-panel")).toHaveClass("open");

    rerender(
      <Drawer open={false} onClose={() => {}}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-overlay")).not.toHaveClass("open");
    expect(document.querySelector(".drawer-panel")).not.toHaveClass("open");
  });
});

describe("Drawer — modifieur structurel --fullscreen", () => {
  it("fullscreen par défaut (true) : overlay ET panel ont --fullscreen", () => {
    render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-overlay")).toHaveClass(
      "drawer-overlay--fullscreen",
    );
    expect(document.querySelector(".drawer-panel")).toHaveClass(
      "drawer-panel--fullscreen",
    );
  });

  it("fullscreen={false} : NI overlay NI panel n'ont le modifieur --fullscreen", () => {
    render(
      <Drawer open onClose={() => {}} fullscreen={false}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-overlay")).not.toHaveClass(
      "drawer-overlay--fullscreen",
    );
    expect(document.querySelector(".drawer-panel")).not.toHaveClass(
      "drawer-panel--fullscreen",
    );
  });
});

describe("Drawer — footer (actions)", () => {
  it("rend .drawer-footer quand actions est fourni", () => {
    render(
      <Drawer
        open
        onClose={() => {}}
        actions={<button className="btn-primary">Sauvegarder</button>}
      >
        Corps
      </Drawer>,
    );
    const footer = document.querySelector(".drawer-footer");
    expect(footer).toBeInTheDocument();
    expect(footer?.querySelector(".btn-primary")).toHaveTextContent(
      "Sauvegarder",
    );
  });

  it("pas de .drawer-footer quand actions est absent", () => {
    render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-footer")).not.toBeInTheDocument();
  });
});

describe("Drawer — piège padding liste : style inline flush", () => {
  it("flush : .drawer-body porte le style inline padding:0", () => {
    render(
      <Drawer open onClose={() => {}} flush>
        Liste
      </Drawer>,
    );
    const body = document.querySelector(".drawer-body") as HTMLElement;
    // Le CSS ne fournit PAS de classe flush — le padding:0 est posé INLINE.
    expect(body.style.padding).toBe("0px");
  });

  it("sans flush : aucun style inline padding sur .drawer-body", () => {
    render(
      <Drawer open onClose={() => {}}>
        Corps
      </Drawer>,
    );
    const body = document.querySelector(".drawer-body") as HTMLElement;
    expect(body.style.padding).toBe("");
  });

  it("bodyClassName est appliqué au .drawer-body", () => {
    render(
      <Drawer open onClose={() => {}} bodyClassName="p-0">
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-body")).toHaveClass("p-0");
  });
});

describe("Drawer — passthrough className / id", () => {
  it("className additionnel est appliqué au .drawer-panel", () => {
    render(
      <Drawer open onClose={() => {}} className="drawer-wide">
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-panel")).toHaveClass("drawer-wide");
  });

  it("id est appliqué au .drawer-panel", () => {
    render(
      <Drawer open onClose={() => {}} id="my-drawer">
        Corps
      </Drawer>,
    );
    expect(document.querySelector(".drawer-panel")).toHaveAttribute(
      "id",
      "my-drawer",
    );
  });
});

describe("Drawer — fermeture (onClose)", () => {
  it("clic sur le bouton .drawer-close appelle onClose", () => {
    const handleClose = vi.fn();
    render(
      <Drawer open onClose={handleClose}>
        Corps
      </Drawer>,
    );
    fireEvent.click(document.querySelector(".drawer-close") as HTMLElement);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("clic sur l'overlay appelle onClose", () => {
    const handleClose = vi.fn();
    render(
      <Drawer open onClose={handleClose}>
        Corps
      </Drawer>,
    );
    fireEvent.click(document.querySelector(".drawer-overlay") as HTMLElement);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("touche Escape appelle onClose quand le drawer est ouvert", () => {
    const handleClose = vi.fn();
    render(
      <Drawer open onClose={handleClose}>
        Corps
      </Drawer>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("Escape n'appelle PAS onClose quand le drawer est fermé", () => {
    const handleClose = vi.fn();
    render(
      <Drawer open={false} onClose={handleClose}>
        Corps
      </Drawer>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).not.toHaveBeenCalled();
  });
});

describe("Drawer — focus restore WAI-APG", () => {
  it("déplace le focus dans le panneau (bouton close) à l'ouverture, puis le restaure au déclencheur à la fermeture", () => {
    render(<ControlledDrawer />);
    const trigger = document.querySelector(
      '[data-testid="trigger"]',
    ) as HTMLButtonElement;

    trigger.focus();
    expect(trigger).toHaveFocus();

    // Ouverture via le déclencheur → focus déplacé sur le bouton close.
    fireEvent.click(trigger);
    const closeBtn = document.querySelector(".drawer-close") as HTMLElement;
    expect(closeBtn).toHaveFocus();

    // Fermeture via Escape → focus restauré sur le déclencheur.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
  });
});
