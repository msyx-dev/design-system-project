import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { Modal } from "./Modal";

describe("Modal — structure & ouverture", () => {
  it("rend le markup canonique .modal-dialog / .modal-header / .modal-body / .modal-close", () => {
    render(
      <Modal open onClose={() => {}} title="Titre">
        Corps
      </Modal>,
    );

    const dialog = document.querySelector("dialog.modal-dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog?.querySelector(".modal-header")).toBeInTheDocument();
    expect(dialog?.querySelector(".modal-body")).toHaveTextContent("Corps");
    expect(
      dialog?.querySelector(".modal-close[aria-label='Fermer']"),
    ).toBeInTheDocument();
  });

  it("appelle dialog.showModal() et rend le dialog visible/ouvert quand open=true", () => {
    render(
      <Modal open onClose={() => {}} title="Titre">
        Corps
      </Modal>,
    );
    const dialog = document.querySelector(
      "dialog.modal-dialog",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
  });

  it("ne montre pas le dialog quand open=false", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Titre">
        Corps
      </Modal>,
    );
    const dialog = document.querySelector(
      "dialog.modal-dialog",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
  });

  it("rend le slot actions dans .modal-actions quand fourni", () => {
    render(
      <Modal
        open
        onClose={() => {}}
        title="Titre"
        actions={<button>OK</button>}
      >
        Corps
      </Modal>,
    );
    const actions = document.querySelector(".modal-actions");
    expect(actions).toBeInTheDocument();
    expect(actions).toHaveTextContent("OK");
  });

  it("n'affiche pas .modal-actions quand actions est absent", () => {
    render(
      <Modal open onClose={() => {}} title="Titre">
        Corps
      </Modal>,
    );
    expect(document.querySelector(".modal-actions")).not.toBeInTheDocument();
  });

  it("utilise closeLabel personnalisé sur le bouton close", () => {
    render(
      <Modal
        open
        onClose={() => {}}
        title="Titre"
        closeLabel="Annuler la boîte"
      >
        Corps
      </Modal>,
    );
    expect(
      document.querySelector(".modal-close[aria-label='Annuler la boîte']"),
    ).toBeInTheDocument();
  });
});

describe("Modal — fermeture", () => {
  it("clic sur .modal-close appelle onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Corps
      </Modal>,
    );

    const closeBtn = document.querySelector(
      ".modal-close",
    ) as HTMLButtonElement;
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic sur le backdrop (élément dialog lui-même) appelle onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Corps
      </Modal>,
    );

    const dialog = document.querySelector(
      "dialog.modal-dialog",
    ) as HTMLDialogElement;
    // Simule un clic dont la cible est le dialog lui-même (backdrop) —
    // un vrai clic sur la zone hors contenu atterrit sur l'élément dialog.
    const clickEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvent, "target", { value: dialog });
    dialog.dispatchEvent(clickEvent);

    expect(onClose).toHaveBeenCalled();
  });

  it("ne ferme pas quand le clic cible un enfant (.modal-body)", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Corps
      </Modal>,
    );

    const body = document.querySelector(".modal-body") as HTMLDivElement;
    const clickEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvent, "target", { value: body });
    body.dispatchEvent(clickEvent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("l'événement natif `close` du dialog (ESC) déclenche onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Corps
      </Modal>,
    );

    const dialog = document.querySelector(
      "dialog.modal-dialog",
    ) as HTMLDialogElement;
    dialog.close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Modal — focus restore WAI-APG (WCAG 2.4.3)", () => {
  it("capture le trigger avant showModal() et restaure le focus après close()", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button data-testid="trigger" onClick={() => setOpen(true)}>
            Ouvrir
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="Titre">
            Corps
          </Modal>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByTestId("trigger");
    await user.click(trigger);

    const dialog = document.querySelector(
      "dialog.modal-dialog",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    const closeBtn = document.querySelector(
      ".modal-close",
    ) as HTMLButtonElement;
    await user.click(closeBtn);

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("n'échoue pas si le trigger a été retiré du DOM avant la fermeture (idempotence)", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose} title="Titre">
        Corps
      </Modal>,
    );

    const dialog = document.querySelector(
      "dialog.modal-dialog",
    ) as HTMLDialogElement;
    expect(() => dialog.close()).not.toThrow();
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal open={false} onClose={onClose} title="Titre">
        Corps
      </Modal>,
    );
  });
});
