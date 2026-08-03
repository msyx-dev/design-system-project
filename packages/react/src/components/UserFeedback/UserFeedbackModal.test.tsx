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
import {
  normalizeScreenshot,
  ScreenshotNormalizeError,
} from "./normalizeScreenshot";
import type { UserFeedbackContextData } from "./types";

// Mock du module de normalisation (#803) — même patron que
// `Graph/DependencyMap.test.tsx` (`vi.mock` + `importOriginal`) : les exports
// réels (dont `ScreenshotNormalizeError`) restent la vraie classe, sinon
// `instanceof` échouerait côté composant. Seule `normalizeScreenshot` est
// remplacée par un mock contrôlable par test.
vi.mock("./normalizeScreenshot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./normalizeScreenshot")>();
  return {
    ...actual,
    normalizeScreenshot: vi.fn(),
  };
});

const normalizeScreenshotMock = vi.mocked(normalizeScreenshot);

afterEach(() => {
  cleanup();
  normalizeScreenshotMock.mockReset();
});

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

/** Fichier WebP normalisé factice — nom/type/taille au choix du test. */
function makeNormalizedFile(name: string, size = 100 * 1024): File {
  return new File([new Uint8Array(size)], name, { type: "image/webp" });
}

function getHiddenInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
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
    expect(normalizeScreenshotMock).not.toHaveBeenCalled();
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
    expect(normalizeScreenshotMock).not.toHaveBeenCalled();
  });

  it("retirer la pièce jointe la remet à null (onRemove FileUpload)", async () => {
    const user = userEvent.setup();
    normalizeScreenshotMock.mockResolvedValue(
      makeNormalizedFile("capture.webp"),
    );
    const { container } = renderModal({ context: baseContext });

    const file = new File([new Uint8Array(1024)], "capture.png", {
      type: "image/png",
    });
    fireEvent.change(getHiddenInput(container), { target: { files: [file] } });
    await screen.findByText("capture.webp");

    await user.click(
      screen.getByRole("button", { name: "Supprimer capture.webp" }),
    );

    expect(screen.queryByText("capture.webp")).not.toBeInTheDocument();
  });
});

describe("UserFeedbackModal — normalisation de la pièce jointe (#803)", () => {
  it("14. dépôt nominal — onSubmit reçoit screenshot normalisé et screenshotOriginal brut", async () => {
    const user = userEvent.setup();
    const normalized = makeNormalizedFile("capture.webp");
    normalizeScreenshotMock.mockResolvedValue(normalized);
    const { container, onSubmit } = renderModal({ context: baseContext });

    const raw = new File([new Uint8Array(2 * 1024 * 1024)], "capture.png", {
      type: "image/png",
    });
    fireEvent.change(getHiddenInput(container), { target: { files: [raw] } });
    await screen.findByText("capture.webp");

    await user.type(screen.getByLabelText("Titre"), "Titre");
    await user.type(
      screen.getByLabelText("Description"),
      "Description complète.",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values] = onSubmit.mock.calls[0];
    expect(values.screenshot).toBe(normalized);
    expect(values.screenshotOriginal).toBe(raw);
  });

  it("15. pendant la conversion — région status, bouton Envoyer et zone de dépôt disabled", async () => {
    let resolveConvert!: (file: File) => void;
    normalizeScreenshotMock.mockImplementation(
      () =>
        new Promise<File>((resolve) => {
          resolveConvert = resolve;
        }),
    );
    const { container } = renderModal({ context: baseContext });

    const raw = new File([new Uint8Array(1024)], "capture.png", {
      type: "image/png",
    });
    fireEvent.change(getHiddenInput(container), { target: { files: [raw] } });

    expect(
      await screen.findByText("Conversion de l'image…"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
    expect(document.querySelector(".file-upload")).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await act(async () => {
      resolveConvert(makeNormalizedFile("capture.webp"));
    });
  });

  it("16. après conversion — .file-item-size affiche la taille normalisée, pas celle du brut", async () => {
    normalizeScreenshotMock.mockResolvedValue(
      makeNormalizedFile("capture.webp", 100 * 1024),
    );
    const { container } = renderModal({ context: baseContext });

    const raw = new File([new Uint8Array(4 * 1024 * 1024)], "capture.png", {
      type: "image/png",
    });
    Object.defineProperty(raw, "size", { value: 4 * 1024 * 1024 });
    fireEvent.change(getHiddenInput(container), { target: { files: [raw] } });

    await screen.findByText("capture.webp");
    expect(document.querySelector(".file-item-size")?.textContent).toBe(
      "100 Ko",
    );
  });

  it("17. échec unsupported — message spécifique, pièce jointe absente, envoi reste possible", async () => {
    const user = userEvent.setup();
    normalizeScreenshotMock.mockRejectedValue(
      new ScreenshotNormalizeError(
        "unsupported",
        "Encodage WebP non pris en charge par ce navigateur.",
      ),
    );
    const { container, onSubmit } = renderModal({ context: baseContext });

    const raw = new File([new Uint8Array(1024)], "capture.png", {
      type: "image/png",
    });
    fireEvent.change(getHiddenInput(container), { target: { files: [raw] } });

    expect(
      await screen.findByText(/ne sait pas convertir cette image en WebP/),
    ).toBeInTheDocument();
    expect(screen.queryByText("capture.png")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Titre"), "Titre");
    await user.type(
      screen.getByLabelText("Description"),
      "Description complète.",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values] = onSubmit.mock.calls[0];
    expect(values.screenshot).toBeNull();
  });

  it("18. normalizeScreenshot={false} — conversion jamais appelée, screenshot === screenshotOriginal === brut", async () => {
    const user = userEvent.setup();
    const { container, onSubmit } = renderModal({
      context: baseContext,
      normalizeScreenshot: false,
    });

    const raw = new File([new Uint8Array(1024)], "capture.png", {
      type: "image/png",
    });
    fireEvent.change(getHiddenInput(container), { target: { files: [raw] } });
    await screen.findByText("capture.png");

    await user.type(screen.getByLabelText("Titre"), "Titre");
    await user.type(
      screen.getByLabelText("Description"),
      "Description complète.",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values] = onSubmit.mock.calls[0];
    expect(values.screenshot).toBe(raw);
    expect(values.screenshotOriginal).toBe(raw);
    expect(normalizeScreenshotMock).not.toHaveBeenCalled();
  });

  it("19. hint dérivé du plafond effectif — 512 Ko par défaut, personnalisable via maxBytes", () => {
    renderModal({ context: baseContext });
    expect(screen.getByText(/≤ 512 Ko/)).toBeInTheDocument();
    cleanup();

    renderModal({
      context: baseContext,
      normalizeScreenshot: { maxBytes: 200 * 1024 },
    });
    expect(screen.getByText(/≤ 200 Ko/)).toBeInTheDocument();
  });

  it("20. anti-race — deux dépôts rapprochés, résolutions inversées : le dernier fichier déposé gagne", async () => {
    let resolveFirst!: (file: File) => void;
    let resolveSecond!: (file: File) => void;
    normalizeScreenshotMock
      .mockImplementationOnce(
        () =>
          new Promise<File>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<File>((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { container } = renderModal({ context: baseContext });

    const file1 = new File([new Uint8Array(1024)], "un.png", {
      type: "image/png",
    });
    const file2 = new File([new Uint8Array(1024)], "deux.png", {
      type: "image/png",
    });

    fireEvent.change(getHiddenInput(container), { target: { files: [file1] } });
    fireEvent.change(getHiddenInput(container), { target: { files: [file2] } });

    // Le 2e dépôt résout D'ABORD (résolutions inversées).
    await act(async () => {
      resolveSecond(makeNormalizedFile("deux.webp"));
    });
    await screen.findByText("deux.webp");

    // Le 1er dépôt résout ENSUITE — son jeton est périmé, il ne doit rien écraser.
    await act(async () => {
      resolveFirst(makeNormalizedFile("un.webp"));
    });

    expect(screen.getByText("deux.webp")).toBeInTheDocument();
    expect(screen.queryByText("un.webp")).not.toBeInTheDocument();
  });

  it("21. gardes amont préservées — fichier non-image et fichier > 5 Mo n'appellent jamais normalizeScreenshot", async () => {
    const { container, rerender } = renderModal({ context: baseContext });

    const nonImage = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(getHiddenInput(container), {
      target: { files: [nonImage] },
    });
    await screen.findByText(/Format non pris en charge/);
    expect(normalizeScreenshotMock).not.toHaveBeenCalled();

    const tooBig = new File([new Uint8Array(8)], "huge.png", {
      type: "image/png",
    });
    Object.defineProperty(tooBig, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(getHiddenInput(container), {
      target: { files: [tooBig] },
    });
    await screen.findByText(/trop volumineux/);
    expect(normalizeScreenshotMock).not.toHaveBeenCalled();

    rerender(
      <UserFeedbackModal
        open
        onClose={vi.fn()}
        context={baseContext}
        onSubmit={vi.fn()}
      />,
    );
  });
});

describe("UserFeedbackModal — erreur de soumission (#799)", () => {
  const GENERIC_ERROR_MESSAGE =
    "L'envoi du retour a échoué. Vérifiez votre connexion et réessayez.";

  async function submitValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Titre"), "Titre");
    await user.type(
      screen.getByLabelText("Description"),
      "Description suffisamment détaillée.",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
  }

  it("affiche le message de l'Error levée par onSubmit quand il est non vide", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error("Fichier trop volumineux (max 2 Mo)"));
    const onClose = vi.fn();
    render(
      <UserFeedbackModal
        open
        onClose={onClose}
        context={baseContext}
        onSubmit={onSubmit}
      />,
    );

    await submitValidForm(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveClass("alert-danger");
    expect(alert.textContent).toContain("Fichier trop volumineux (max 2 Mo)");
    expect(alert.textContent).not.toContain(GENERIC_ERROR_MESSAGE);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("conserve le message générique si l'erreur n'est pas une Error ou a un message vide", async () => {
    // Cas 1 : rejet avec une valeur non-Error (ex. `throw "boom"`).
    const user1 = userEvent.setup();
    const onSubmitNonError = vi.fn().mockRejectedValue("boom");
    render(
      <UserFeedbackModal
        open
        onClose={vi.fn()}
        context={baseContext}
        onSubmit={onSubmitNonError}
      />,
    );
    await submitValidForm(user1);
    const alert1 = await screen.findByRole("alert");
    expect(alert1.textContent).toContain(GENERIC_ERROR_MESSAGE);
    cleanup();

    // Cas 2 : rejet avec une Error au message vide.
    const user2 = userEvent.setup();
    const onSubmitEmptyMessage = vi.fn().mockRejectedValue(new Error(""));
    render(
      <UserFeedbackModal
        open
        onClose={vi.fn()}
        context={baseContext}
        onSubmit={onSubmitEmptyMessage}
      />,
    );
    await submitValidForm(user2);
    const alert2 = await screen.findByRole("alert");
    expect(alert2.textContent).toContain(GENERIC_ERROR_MESSAGE);
  });

  it("non-régression : soumission réussie n'affiche aucune alerte d'erreur", async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderModal();

    await submitValidForm(user);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
