import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { BottomSheet, BottomSheetProps } from "./BottomSheet";

/** Wrapper contrôlé avec trigger — reflète un vrai consumer (open piloté). */
function ControlledBottomSheet(
  props: Partial<Omit<BottomSheetProps, "open" | "onClose">> & {
    initialOpen?: boolean;
    onClose?: BottomSheetProps["onClose"];
  },
) {
  const { initialOpen = false, onClose, children, title, ...rest } = props;
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <BottomSheet
        {...rest}
        open={open}
        title={title ?? "Titre"}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
      >
        {children ?? <p>Contenu</p>}
      </BottomSheet>
    </>
  );
}

afterEach(() => {
  cleanup();
});

function getOverlay() {
  return document.querySelector(".bottom-sheet-overlay");
}
function getPanel() {
  return document.querySelector(".bottom-sheet");
}

describe("BottomSheet — structure", () => {
  it("rend les DEUX frères .bottom-sheet-overlay + .bottom-sheet", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="Info">
        <p>Corps</p>
      </BottomSheet>,
    );
    expect(getOverlay()).toBeInTheDocument();
    expect(getPanel()).toBeInTheDocument();
  });

  it("ouvert : le panneau porte role=dialog / aria-modal / aria-label (défaut 'Panneau')", () => {
    render(
      <BottomSheet open onClose={() => {}}>
        <p>Corps</p>
      </BottomSheet>,
    );
    const panel = getPanel();
    expect(panel).toHaveAttribute("role", "dialog");
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(panel).toHaveAttribute("aria-label", "Panneau");
  });

  it("fermé : role/aria-modal sont retirés, aria-label reste (a11y overlay fermé)", () => {
    render(
      <BottomSheet open={false} onClose={() => {}}>
        <p>Corps</p>
      </BottomSheet>,
    );
    const panel = getPanel();
    expect(panel).not.toHaveAttribute("role");
    expect(panel).not.toHaveAttribute("aria-modal");
    expect(panel).toHaveAttribute("aria-label", "Panneau");
  });

  it("aria-label du panneau personnalisable", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} ariaLabel="Menu d'actions">
        <p>Corps</p>
      </BottomSheet>,
    );
    expect(getPanel()).toHaveAttribute("aria-label", "Menu d'actions");
  });

  it("rend le titre dans un <h3> du .bottom-sheet-header", () => {
    render(
      <BottomSheet open onClose={() => {}} title="Information">
        <p>Corps</p>
      </BottomSheet>,
    );
    const header = document.querySelector(".bottom-sheet-header");
    const h3 = header?.querySelector("h3");
    expect(h3).toHaveTextContent("Information");
  });

  it("sans title : pas de <h3>, mais le bouton close reste présent", () => {
    render(
      <BottomSheet open onClose={() => {}}>
        <p>Corps</p>
      </BottomSheet>,
    );
    expect(document.querySelector(".bottom-sheet-header h3")).toBeNull();
    expect(document.querySelector(".bottom-sheet-close")).toBeInTheDocument();
  });

  it("le contenu est dans .bottom-sheet-content avec tabindex=0", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T">
        <span data-testid="child">Corps</span>
      </BottomSheet>,
    );
    const content = document.querySelector(".bottom-sheet-content");
    expect(content).toHaveAttribute("tabindex", "0");
    expect(content).toContainElement(screen.getByTestId("child"));
  });

  it("le bouton close porte l'aria-label (défaut 'Fermer', personnalisable)", () => {
    const { rerender } = render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(document.querySelector(".bottom-sheet-close")).toHaveAttribute(
      "aria-label",
      "Fermer",
    );
    rerender(
      <BottomSheet open onClose={() => {}} title="T" closeLabel="Close panel">
        <p>c</p>
      </BottomSheet>,
    );
    expect(document.querySelector(".bottom-sheet-close")).toHaveAttribute(
      "aria-label",
      "Close panel",
    );
  });

  it("l'overlay est aria-hidden (backdrop décoratif)", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(getOverlay()).toHaveAttribute("aria-hidden", "true");
  });

  it("applique className sur le panneau et contentClassName sur le contenu", () => {
    render(
      <BottomSheet
        open
        onClose={() => {}}
        title="T"
        className="my-sheet"
        contentClassName="p-0"
      >
        <p>c</p>
      </BottomSheet>,
    );
    expect(getPanel()).toHaveClass("bottom-sheet", "my-sheet");
    expect(document.querySelector(".bottom-sheet-content")).toHaveClass(
      "bottom-sheet-content",
      "p-0",
    );
  });
});

describe("BottomSheet — état critique : double .open synchrone (#612)", () => {
  it("open=true → .open sur .bottom-sheet ET .bottom-sheet-overlay", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(getPanel()).toHaveClass("open");
    expect(getOverlay()).toHaveClass("open");
  });

  it("open=false → NI le panneau NI l'overlay n'ont .open", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(getPanel()).not.toHaveClass("open");
    expect(getOverlay()).not.toHaveClass("open");
  });

  it("bascule les DEUX .open simultanément quand open change", () => {
    const { rerender } = render(
      <BottomSheet open={false} onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(getPanel()).not.toHaveClass("open");
    expect(getOverlay()).not.toHaveClass("open");

    rerender(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(getPanel()).toHaveClass("open");
    expect(getOverlay()).toHaveClass("open");
  });

  it("le markup reste monté quand open=false (transition CSS préservée)", () => {
    const { rerender } = render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    rerender(
      <BottomSheet open={false} onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    // Toujours présent dans le DOM, juste sans .open
    expect(getPanel()).toBeInTheDocument();
    expect(getOverlay()).toBeInTheDocument();
  });
});

describe("BottomSheet — fermeture", () => {
  it("clic sur l'overlay appelle onClose", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    fireEvent.click(getOverlay() as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic sur le bouton close appelle onClose", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    fireEvent.click(document.querySelector(".bottom-sheet-close") as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("touche Escape appelle onClose quand ouvert", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape n'appelle PAS onClose quand fermé (listener inactif)", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open={false} onClose={onClose} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("retire le listener Escape au démontage (pas d'appel après unmount)", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <BottomSheet open onClose={onClose} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("BottomSheet — swipe-to-close (drag tactile + styles inline)", () => {
  it("pendant touchmove : transform inline translateY(delta) + transition:none", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    const handle = document.querySelector(
      ".bottom-sheet-handle-wrap",
    ) as HTMLElement;
    const panel = getPanel() as HTMLElement;

    fireEvent.touchStart(handle, { touches: [{ clientY: 300 }] });
    expect(panel.style.transition).toBe("none");

    fireEvent.touchMove(handle, { touches: [{ clientY: 450 }] });
    expect(panel.style.transform).toBe("translateY(150px)");
    expect(panel.style.transition).toBe("none");
  });

  it("touchend au-delà du seuil (100) : onClose appelé + styles inline vidés", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    const handle = document.querySelector(
      ".bottom-sheet-handle-wrap",
    ) as HTMLElement;
    const panel = getPanel() as HTMLElement;

    fireEvent.touchStart(handle, { touches: [{ clientY: 300 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 450 }] });
    fireEvent.touchEnd(handle);

    expect(onClose).toHaveBeenCalledTimes(1);
    // Reset load-bearing : les styles inline sont vidés (rend la main au CSS .open)
    expect(panel.style.transform).toBe("");
    expect(panel.style.transition).toBe("");
  });

  it("touchend sous le seuil : onClose NON appelé + styles inline vidés (retour en place)", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    const handle = document.querySelector(
      ".bottom-sheet-handle-wrap",
    ) as HTMLElement;
    const panel = getPanel() as HTMLElement;

    fireEvent.touchStart(handle, { touches: [{ clientY: 300 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 350 }] }); // delta 50 < 100
    fireEvent.touchEnd(handle);

    expect(onClose).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe("");
    expect(panel.style.transition).toBe("");
  });

  it("swipeThreshold personnalisé respecté", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="T" swipeThreshold={40}>
        <p>c</p>
      </BottomSheet>,
    );
    const handle = document.querySelector(
      ".bottom-sheet-handle-wrap",
    ) as HTMLElement;

    fireEvent.touchStart(handle, { touches: [{ clientY: 300 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 350 }] }); // delta 50 > 40
    fireEvent.touchEnd(handle);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("delta négatif (drag vers le haut) : pas de transform inline", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    const handle = document.querySelector(
      ".bottom-sheet-handle-wrap",
    ) as HTMLElement;
    const panel = getPanel() as HTMLElement;

    fireEvent.touchStart(handle, { touches: [{ clientY: 300 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 250 }] }); // delta -50
    expect(panel.style.transform).toBe("");
  });

  it("showHandle=false : pas de .bottom-sheet-handle-wrap", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T" showHandle={false}>
        <p>c</p>
      </BottomSheet>,
    );
    expect(
      document.querySelector(".bottom-sheet-handle-wrap"),
    ).not.toBeInTheDocument();
  });

  it("swipeToClose=false : le handle existe mais le swipe ne ferme pas et ne pose pas de transform", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="T" swipeToClose={false}>
        <p>c</p>
      </BottomSheet>,
    );
    const handle = document.querySelector(
      ".bottom-sheet-handle-wrap",
    ) as HTMLElement;
    const panel = getPanel() as HTMLElement;

    fireEvent.touchStart(handle, { touches: [{ clientY: 300 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 500 }] });
    fireEvent.touchEnd(handle);

    expect(onClose).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe("");
  });
});

describe("BottomSheet — focus WAI-APG (WCAG 2.4.3)", () => {
  it("focus initial sur le bouton close à l'ouverture, restauré au trigger à la fermeture", () => {
    render(<ControlledBottomSheet />);
    const trigger = screen.getByText("Ouvrir");

    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger); // open
    const closeBtn = document.querySelector(".bottom-sheet-close");
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.click(closeBtn as Element); // close → onClose → open=false
    expect(document.activeElement).toBe(trigger);
  });

  it("ne restaure pas le focus si aucun cycle d'ouverture n'a eu lieu", () => {
    // Monté fermé puis démonté : aucune capture/restore, pas de crash.
    const { unmount } = render(
      <BottomSheet open={false} onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(() => unmount()).not.toThrow();
  });
});

describe("BottomSheet — a11y overlay fermé (inert + focus, vérif adversariale)", () => {
  it("fermé : overlay ET panneau portent l'attribut inert", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(getOverlay()).toHaveAttribute("inert");
    expect(getPanel()).toHaveAttribute("inert");
  });

  it("ouvert : ni overlay ni panneau ne portent inert", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(getOverlay()).not.toHaveAttribute("inert");
    expect(getPanel()).not.toHaveAttribute("inert");
  });

  it("fermé : .bottom-sheet-close et .bottom-sheet-content sont tabIndex=-1 (non-tabbables)", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(document.querySelector(".bottom-sheet-close")).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(document.querySelector(".bottom-sheet-content")).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("ouvert : .bottom-sheet-close redevient tabbable, .bottom-sheet-content retrouve tabIndex=0", () => {
    render(
      <BottomSheet open onClose={() => {}} title="T">
        <p>c</p>
      </BottomSheet>,
    );
    expect(document.querySelector(".bottom-sheet-close")).not.toHaveAttribute(
      "tabindex",
    );
    expect(document.querySelector(".bottom-sheet-content")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("fermé : Tab depuis un élément externe ne peut PAS atteindre .bottom-sheet-close (document.activeElement inatteignable)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button data-testid="before">Avant</button>
        <BottomSheet open={false} onClose={() => {}} title="T">
          <p>c</p>
        </BottomSheet>
      </>,
    );
    const before = screen.getByTestId("before") as HTMLButtonElement;
    before.focus();
    expect(before).toHaveFocus();

    await user.tab();

    expect(document.activeElement).not.toBe(
      document.querySelector(".bottom-sheet-close"),
    );
    expect(document.activeElement).not.toBe(
      document.querySelector(".bottom-sheet-content"),
    );
  });

  it("ouvert : Tab depuis un élément externe ATTEINT bien .bottom-sheet-close (contrôle redevenu tabbable)", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button data-testid="before">Avant</button>
        <BottomSheet open onClose={() => {}} title="T">
          <p>c</p>
        </BottomSheet>
      </>,
    );
    const before = screen.getByTestId("before") as HTMLButtonElement;
    // Reprend la main sur "before" après l'auto-focus WAI-APG à l'ouverture.
    before.focus();
    expect(before).toHaveFocus();

    await user.tab();

    expect(document.activeElement).toBe(
      document.querySelector(".bottom-sheet-close"),
    );
  });
});
