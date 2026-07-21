import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UserFeedbackModal,
  encodeScreenshotWebp,
  type EncodableCanvas,
} from "./UserFeedbackModal";
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

  it("affiche le bouton de capture par défaut, le masque si allowScreenshot=false", () => {
    const { rerender } = renderModal();
    expect(
      screen.getByRole("button", { name: "Joindre une capture" }),
    ).toBeInTheDocument();

    rerender(
      <UserFeedbackModal
        open
        onClose={vi.fn()}
        context={baseContext}
        onSubmit={vi.fn()}
        allowScreenshot={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Joindre une capture" }),
    ).not.toBeInTheDocument();
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

describe("UserFeedbackModal — screenshot opt-in WebP", () => {
  it("capture puis attache une capture (mock getDisplayMedia + canvas.toBlob)", async () => {
    const user = userEvent.setup();

    const fakeTrack = { stop: vi.fn() };
    const fakeStream = {
      getTracks: () => [fakeTrack],
    } as unknown as MediaStream;

    Object.defineProperty(window.navigator, "mediaDevices", {
      value: { getDisplayMedia: vi.fn().mockResolvedValue(fakeStream) },
      configurable: true,
    });

    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const readyStateSpy = vi
      .spyOn(HTMLMediaElement.prototype, "readyState", "get")
      .mockReturnValue(2);

    const fakeBlob = new Blob([new Uint8Array(1024)], { type: "image/webp" });
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
    const toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback: BlobCallback) => {
        callback(fakeBlob);
      });

    try {
      renderModal();

      await user.click(
        screen.getByRole("button", { name: "Joindre une capture" }),
      );

      expect(await screen.findByText(/Capture jointe/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Retirer la capture" }),
      ).toBeInTheDocument();
      expect(fakeTrack.stop).toHaveBeenCalled();
    } finally {
      playSpy.mockRestore();
      readyStateSpy.mockRestore();
      getContextSpy.mockRestore();
      toBlobSpy.mockRestore();
    }
  });

  it("refus/échec de capture (getDisplayMedia rejette) affiche un état d'erreur non bloquant", async () => {
    const user = userEvent.setup();

    Object.defineProperty(window.navigator, "mediaDevices", {
      value: {
        getDisplayMedia: vi
          .fn()
          .mockRejectedValue(
            new DOMException("Permission denied", "NotAllowedError"),
          ),
      },
      configurable: true,
    });

    renderModal();

    await user.click(
      screen.getByRole("button", { name: "Joindre une capture" }),
    );

    expect(
      await screen.findByText(/Capture indisponible ou refusée/),
    ).toBeInTheDocument();
    // Le bouton de capture reste disponible — aucun blocage du flux.
    expect(
      screen.getByRole("button", { name: "Joindre une capture" }),
    ).toBeInTheDocument();
  });

  it("retirer une capture attachée revient à l'état idle", async () => {
    const user = userEvent.setup();

    const fakeStream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream;
    Object.defineProperty(window.navigator, "mediaDevices", {
      value: { getDisplayMedia: vi.fn().mockResolvedValue(fakeStream) },
      configurable: true,
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      2,
    );
    const fakeBlob = new Blob([new Uint8Array(10)], { type: "image/webp" });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback: BlobCallback) => callback(fakeBlob),
    );

    renderModal();
    await user.click(
      screen.getByRole("button", { name: "Joindre une capture" }),
    );
    await screen.findByText(/Capture jointe/);

    await user.click(
      screen.getByRole("button", { name: "Retirer la capture" }),
    );

    expect(
      screen.getByRole("button", { name: "Joindre une capture" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Capture jointe/)).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });
});

describe("encodeScreenshotWebp — downscale/qualité récursifs", () => {
  function makeCanvas(
    width: number,
    height: number,
    toBlobImpl: EncodableCanvas["toBlob"],
  ): EncodableCanvas {
    return { width, height, toBlob: toBlobImpl };
  }

  it("retourne le blob dès qu'un palier de qualité passe sous 512Ko", async () => {
    const smallBlob = new Blob([new Uint8Array(1000)], { type: "image/webp" });
    const toBlob = vi.fn((cb: (b: Blob | null) => void) => cb(smallBlob));
    const canvas = makeCanvas(800, 600, toBlob);

    const result = await encodeScreenshotWebp(canvas);

    expect(result).toBe(smallBlob);
    expect(toBlob).toHaveBeenCalledTimes(1);
  });

  it("downscale les dimensions quand aucune qualité ne suffit, puis réussit", async () => {
    // downscaleCanvas() crée un <canvas> DOM réel pour le pass suivant —
    // jsdom n'implémente ni getContext('2d') ni toBlob() sans le package
    // `canvas`, donc on les mocke pour ce test (drawImage n'a pas besoin
    // d'un rendu réel, la logique testée est la boucle qualité/downscale).
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);

    const bigBlob = new Blob([new Uint8Array(600 * 1024)], {
      type: "image/webp",
    });
    const smallBlob = new Blob([new Uint8Array(1000)], { type: "image/webp" });

    // Le canvas réel produit par downscaleCanvas() passe par
    // HTMLCanvasElement.prototype.toBlob — réussit dès le 1er palier de
    // qualité pour isoler la vérification du downscale lui-même.
    const prototypeToBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((cb: BlobCallback) => cb(smallBlob));

    // Le canvas source (mock EncodableCanvas, pas un HTMLCanvasElement réel)
    // épuise les 6 paliers de qualité sans jamais passer sous 512Ko.
    const sourceToBlob = vi.fn((cb: (b: Blob | null) => void) => cb(bigBlob));
    const canvas = makeCanvas(1920, 1080, sourceToBlob);

    const result = await encodeScreenshotWebp(canvas);

    expect(result).toBe(smallBlob);
    expect(sourceToBlob).toHaveBeenCalledTimes(6);
    expect(prototypeToBlobSpy).toHaveBeenCalledTimes(1);

    getContextSpy.mockRestore();
    prototypeToBlobSpy.mockRestore();
  });

  it("retourne null si aucune combinaison qualité/dimension ne passe sous le seuil", async () => {
    const bigBlob = new Blob([new Uint8Array(600 * 1024)], {
      type: "image/webp",
    });
    const toBlob = vi.fn((cb: (b: Blob | null) => void) => cb(bigBlob));
    const canvas = makeCanvas(64, 64, toBlob);

    const result = await encodeScreenshotWebp(canvas);

    expect(result).toBeNull();
  });
});
