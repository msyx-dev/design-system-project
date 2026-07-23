import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserFeedbackModal } from "./UserFeedbackModal";
import type { UserFeedbackContextData } from "./types";

afterEach(cleanup);

const baseContext: UserFeedbackContextData = {
  appId: "test-app",
  version: "1.2.3",
  env: "dev",
  route: "/dashboard",
  browser: "Chrome",
  device: "desktop",
  viewport: { width: 1280, height: 800 },
  language: "fr",
  user: { id: "u1", email: "u1@example.com" },
  tenant: null,
};

const anonymousContext: UserFeedbackContextData = {
  ...baseContext,
  user: null,
};

function renderModal(
  overrides: Partial<Parameters<typeof UserFeedbackModal>[0]> = {},
) {
  const onClose = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <UserFeedbackModal
      open
      onClose={onClose}
      context={baseContext}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onClose, onSubmit, ...utils };
}

describe("UserFeedbackModal — structure & composition DS", () => {
  it("rend la modale DS avec titre + champs type/titre/description/impact", () => {
    renderModal();

    expect(document.querySelector("dialog.modal-dialog")).toBeInTheDocument();
    expect(screen.getByText("Envoyer un retour")).toBeInTheDocument();

    expect(screen.getByLabelText("Type de retour")).toBeInTheDocument();
    expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Impact (optionnel)")).toBeInTheDocument();
  });

  it("n'affiche PAS le champ email quand context.user est renseigné (connecté)", () => {
    renderModal({ context: baseContext });
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("affiche le champ email requis quand context.user === null (anonyme)", () => {
    renderModal({ context: anonymousContext });
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    expect(email).toBeInTheDocument();
    expect(email).toBeRequired();
    expect(email.type).toBe("email");
  });

  it("affiche la zone de pièce jointe par défaut, la masque si allowScreenshot=false", () => {
    const { rerender } = renderModal();
    expect(
      screen.getByText("Joindre un fichier (optionnel)"),
    ).toBeInTheDocument();
    expect(document.querySelector(".file-upload")).toBeInTheDocument();

    rerender(
      <UserFeedbackModal
        open
        onClose={vi.fn()}
        context={baseContext}
        onSubmit={vi.fn()}
        allowScreenshot={false}
      />,
    );
    expect(document.querySelector(".file-upload")).not.toBeInTheDocument();
  });

  it("le bouton Annuler appelle onClose sans appeler onSubmit", async () => {
    const user = userEvent.setup();
    const { onClose, onSubmit } = renderModal();

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("UserFeedbackModal — validation a11y", () => {
  it("submit invalide (champs requis vides) affiche FormErrorSummary, focus le résumé, n'appelle pas onSubmit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveClass("alert-danger");
    expect(summary.textContent).toMatch(/erreur/);
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submit invalide en mode anonyme liste aussi l'erreur email requis", async () => {
    const user = userEvent.setup();
    renderModal({ context: anonymousContext });

    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    const summary = await screen.findByRole("alert");
    const links = summary.querySelectorAll(".form-error-list a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("#email");
  });

  it("soumission valide (connecté) appelle onSubmit avec les values + context puis onClose", async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderModal({ context: baseContext });

    await user.type(screen.getByLabelText("Titre"), "Un titre de test");
    await user.type(
      screen.getByLabelText("Description"),
      "Une description suffisamment détaillée.",
    );

    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values, context] = onSubmit.mock.calls[0];
    expect(values).toMatchObject({
      type: "bug",
      title: "Un titre de test",
      description: "Une description suffisamment détaillée.",
      impact: undefined,
      email: undefined,
      screenshot: null,
    });
    expect(context).toBe(baseContext);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("soumission valide en mode anonyme requiert l'email et le transmet dans values", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ context: anonymousContext });

    await user.type(screen.getByLabelText("Titre"), "Titre anonyme");
    await user.type(
      screen.getByLabelText("Description"),
      "Description anonyme complète.",
    );
    await user.type(screen.getByLabelText("Email"), "anon@example.com");

    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values] = onSubmit.mock.calls[0];
    expect(values.email).toBe("anon@example.com");
  });
});

describe("UserFeedbackModal — pièce jointe fichier (#714)", () => {
  function getHiddenInput(container: HTMLElement): HTMLInputElement {
    return container.querySelector('input[type="file"]') as HTMLInputElement;
  }

  it("attache une image valide via FileUpload et la transmet dans values.screenshot", async () => {
    const user = userEvent.setup();
    const { container, onSubmit } = renderModal({ context: baseContext });

    const file = new File([new Uint8Array(1024)], "capture.png", {
      type: "image/png",
    });
    fireEvent.change(getHiddenInput(container), { target: { files: [file] } });

    // La liste .file-item native de FileUpload affiche le fichier joint.
    expect(await screen.findByText("capture.png")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Titre"), "Titre");
    await user.type(
      screen.getByLabelText("Description"),
      "Description complète.",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values] = onSubmit.mock.calls[0];
    expect(values.screenshot).toBe(file);
  });

  it("rejette un fichier non-image sans bloquer la soumission (message non bloquant)", async () => {
    const { container } = renderModal({ context: baseContext });

    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(getHiddenInput(container), { target: { files: [file] } });

    expect(
      await screen.findByText(/Format non pris en charge/),
    ).toBeInTheDocument();
    // Aucune pièce jointe retenue, la zone reste disponible.
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    expect(document.querySelector(".file-upload")).toBeInTheDocument();
  });

  it("rejette un fichier image > 5 Mo (message non bloquant)", async () => {
    const { container } = renderModal({ context: baseContext });

    const file = new File([new Uint8Array(8)], "huge.png", {
      type: "image/png",
    });
    Object.defineProperty(file, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(getHiddenInput(container), { target: { files: [file] } });

    expect(await screen.findByText(/trop volumineux/)).toBeInTheDocument();
    expect(screen.queryByText("huge.png")).not.toBeInTheDocument();
  });

  it("retirer la pièce jointe la remet à null (onRemove FileUpload)", async () => {
    const user = userEvent.setup();
    const { container } = renderModal({ context: baseContext });

    const file = new File([new Uint8Array(1024)], "capture.png", {
      type: "image/png",
    });
    fireEvent.change(getHiddenInput(container), { target: { files: [file] } });
    await screen.findByText("capture.png");

    await user.click(
      screen.getByRole("button", { name: "Supprimer capture.png" }),
    );

    expect(screen.queryByText("capture.png")).not.toBeInTheDocument();
  });
});
