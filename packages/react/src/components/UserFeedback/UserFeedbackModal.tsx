import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { Modal } from "../Modal/Modal";
import { Input } from "../Input/Input";
import { Select, type SelectOption } from "../Input/Select";
import { Button } from "../Button/Button";
import { FormErrorSummary } from "../FormValidation/FormErrorSummary";
import { useFormValidation } from "../../hooks/useFormValidation";
import type {
  FeedbackFormValues,
  FeedbackImpact,
  FeedbackSubmitHandler,
  FeedbackType,
  UserFeedbackContextData,
} from "./types";

const FORM_ID = "user-feedback-form";

const TYPE_OPTIONS: SelectOption[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idée" },
  { value: "question", label: "Question" },
  { value: "other", label: "Autre" },
];

const IMPACT_OPTIONS: SelectOption[] = [
  { value: "", label: "Non spécifié" },
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyen" },
  { value: "high", label: "Élevé" },
];

/** Seuil de taille cible pour la capture WebP encodée (contrat #693). */
const MAX_SCREENSHOT_BYTES = 512 * 1024;
/** Paliers de qualité `toBlob('image/webp', q)`, du meilleur au plus compressé. */
const WEBP_QUALITY_STEPS = [0.92, 0.8, 0.65, 0.5, 0.35, 0.2] as const;
/** Nombre max de réductions de dimensions si la qualité seule ne suffit pas. */
const MAX_DOWNSCALE_PASSES = 4;
const DOWNSCALE_FACTOR = 0.75;
/** Sous ce seuil de dimension, on abandonne plutôt que de produire une image inutilisable. */
const MIN_CANVAS_DIMENSION = 16;

/** Canvas-like minimal — permet de tester `encodeScreenshotWebp` sans DOM/canvas réel. */
export interface EncodableCanvas {
  width: number;
  height: number;
  toBlob: (
    callback: (blob: Blob | null) => void,
    type?: string,
    quality?: number,
  ) => void;
}

function canvasToWebpBlob(
  canvas: EncodableCanvas,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

function downscaleCanvas(
  source: EncodableCanvas,
  width: number,
  height: number,
): EncodableCanvas | null {
  if (typeof document === "undefined") return null;
  const scaled = document.createElement("canvas");
  scaled.width = width;
  scaled.height = height;
  const ctx = scaled.getContext("2d");
  if (!ctx) return null;
  // `source` peut être un HTMLCanvasElement réel (drawImage l'accepte) ou un
  // mock de test (EncodableCanvas) — drawImage n'est appelé qu'en environnement
  // navigateur réel, jamais dans les tests unitaires de cette fonction.
  ctx.drawImage(source as unknown as CanvasImageSource, 0, 0, width, height);
  return scaled;
}

/**
 * Downscale/encode récursif WebP jusqu'à ≤512Ko (contrat #693) : boucle de
 * qualité décroissante à dimensions fixes, puis réduction de dimensions si
 * la qualité minimale ne suffit toujours pas. Retourne `null` si le budget
 * n'est atteignable dans les limites (pas de blocage du flux de soumission —
 * `screenshot` reste optionnel).
 */
export async function encodeScreenshotWebp(
  sourceCanvas: EncodableCanvas,
): Promise<Blob | null> {
  let working: EncodableCanvas = sourceCanvas;

  for (let pass = 0; pass <= MAX_DOWNSCALE_PASSES; pass++) {
    for (const quality of WEBP_QUALITY_STEPS) {
      const blob = await canvasToWebpBlob(working, quality);
      if (blob && blob.size <= MAX_SCREENSHOT_BYTES) return blob;
    }

    const nextWidth = Math.floor(working.width * DOWNSCALE_FACTOR);
    const nextHeight = Math.floor(working.height * DOWNSCALE_FACTOR);
    if (nextWidth < MIN_CANVAS_DIMENSION || nextHeight < MIN_CANVAS_DIMENSION) {
      break;
    }
    const scaled = downscaleCanvas(working, nextWidth, nextHeight);
    if (!scaled) break;
    working = scaled;
  }

  return null;
}

/**
 * Capture un unique instantané de l'écran via `getDisplayMedia` (derrière
 * try/catch — un refus utilisateur ou une API indisponible retourne `null`
 * sans jamais bloquer le flux, cf. contrat #693) et le peint sur un canvas
 * hors-DOM. Aucune dépendance externe.
 */
export async function captureScreenCanvas(): Promise<HTMLCanvasElement | null> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getDisplayMedia
  ) {
    return null;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  } catch {
    // Refus utilisateur, contexte non sécurisé, API absente… — jamais bloquant.
    return null;
  }

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    try {
      await video.play();
    } catch {
      // certains environnements (autoplay policy) rejettent play() malgré
      // un stream valide — on tente quand même de lire une frame ci-dessous.
    }

    await new Promise<void>((resolve) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }
      video.onloadeddata = () => resolve();
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1;
    canvas.height = video.videoHeight || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return null;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/** Bout en bout capture → encodage, exposé pour être appelé par la Modal. */
export async function captureFeedbackScreenshot(): Promise<Blob | null> {
  const canvas = await captureScreenCanvas();
  if (!canvas) return null;
  return encodeScreenshotWebp(canvas);
}

function formatKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export interface UserFeedbackModalProps {
  /** Contrôle l'ouverture — délégué tel quel à `<Modal>`. */
  open: boolean;
  /** Appelé pour toute demande de fermeture (croix, ESC, backdrop, Annuler, post-submit). */
  onClose: () => void;
  /** Contexte transverse capturé par `UserFeedbackProvider` (#692). */
  context: UserFeedbackContextData;
  /** Handler de soumission — reçoit les valeurs saisies + le contexte. */
  onSubmit: FeedbackSubmitHandler;
  /** Affiche le bouton de capture d'écran opt-in. Défaut `true`. */
  allowScreenshot?: boolean;
}

type ScreenshotStatus = "idle" | "capturing" | "attached" | "error";

/**
 * UserFeedbackModal — Formulaire de retour utilisateur du Design System
 * msyx.fr (#693). Compose intégralement des primitives existantes
 * (`<Modal>`, `<Input>`, `<Select>`, `<Button>`, `useFormValidation` +
 * `<FormErrorSummary>`) — aucune nouvelle primitive DS.
 *
 * Champs : `type`/`title`/`description` requis, `impact` optionnel, `email`
 * requis uniquement si `context.user === null` (mode anonyme), `screenshot`
 * opt-in (WebP ≤512Ko, sans dépendance externe — `captureFeedbackScreenshot`).
 *
 * Contrôlée par le parent (`open`/`onClose`), sans état de session propre :
 * l'état local du formulaire est réinitialisé quand `open` redevient `false`
 * (couvre à la fois l'usage recommandé — montage/démontage piloté par
 * `UserFeedbackProvider` — et un usage autonome où la Modal resterait
 * montée en permanence).
 */
export function UserFeedbackModal({
  open,
  onClose,
  context,
  onSubmit,
  allowScreenshot = true,
}: UserFeedbackModalProps) {
  const isAnonymous = context.user === null;

  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<FeedbackImpact | "">("");
  const [email, setEmail] = useState("");
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [screenshotStatus, setScreenshotStatus] =
    useState<ScreenshotStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetFormState = useCallback(() => {
    setType("bug");
    setTitle("");
    setDescription("");
    setImpact("");
    setEmail("");
    setScreenshot(null);
    setScreenshotStatus("idle");
    setSubmitting(false);
    setSubmitError(null);
  }, []);

  // Filet pour un usage où la Modal resterait montée en permanence (le
  // patron recommandé — UserFeedbackProvider — démonte le composant à la
  // fermeture, ce qui réinitialise déjà l'état gratuitement).
  useEffect(() => {
    if (!open) resetFormState();
  }, [open, resetFormState]);

  const handleValidSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const values: FeedbackFormValues = {
        type,
        title,
        description,
        impact: impact || undefined,
        email: isAnonymous ? email : undefined,
        screenshot,
      };
      await onSubmit(values, context);
      onClose();
    } catch {
      setSubmitError(
        "L'envoi du retour a échoué. Vérifiez votre connexion et réessayez.",
      );
      setSubmitting(false);
    }
  }, [
    type,
    title,
    description,
    impact,
    email,
    screenshot,
    isAnonymous,
    onSubmit,
    context,
    onClose,
  ]);

  const { formProps, getFieldProps, fieldErrors, errors, summaryRef } =
    useFormValidation({
      onValid: () => {
        void handleValidSubmit();
      },
    });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCaptureScreenshot = useCallback(async () => {
    setScreenshotStatus("capturing");
    const blob = await captureFeedbackScreenshot();
    if (blob) {
      setScreenshot(blob);
      setScreenshotStatus("attached");
    } else {
      setScreenshot(null);
      setScreenshotStatus("error");
    }
  }, []);

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshot(null);
    setScreenshotStatus("idle");
  }, []);

  const descriptionField = getFieldProps("description");
  const descriptionHasError = Boolean(fieldErrors.description);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Envoyer un retour"
      actions={
        <>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" form={FORM_ID} loading={submitting}>
            Envoyer
          </Button>
        </>
      }
    >
      <form id={FORM_ID} {...formProps}>
        <FormErrorSummary errors={errors} summaryRef={summaryRef} />

        {submitError && (
          <div className="alert alert-danger" role="alert">
            <div className="alert-body">{submitError}</div>
          </div>
        )}

        <Select
          label="Type de retour"
          required
          options={TYPE_OPTIONS}
          value={type}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            setType(event.target.value as FeedbackType)
          }
          error={fieldErrors.type}
          {...getFieldProps("type")}
          id="type"
        />

        <Input
          label="Titre"
          required
          value={title}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setTitle(event.target.value)
          }
          error={fieldErrors.title}
          {...getFieldProps("title")}
          id="title"
        />

        <div className="input-group">
          <label className="input-label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className={descriptionHasError ? "input input-error" : "input"}
            required
            value={description}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(event.target.value)
            }
            ref={descriptionField.ref}
            onBlur={descriptionField.onBlur}
            aria-invalid={descriptionField["aria-invalid"]}
            aria-describedby={descriptionField["aria-describedby"]}
          />
          {descriptionHasError && (
            <span className="input-error-msg" id="description-error">
              {fieldErrors.description}
            </span>
          )}
        </div>

        <Select
          label="Impact (optionnel)"
          options={IMPACT_OPTIONS}
          value={impact}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            setImpact(event.target.value as FeedbackImpact | "")
          }
          error={fieldErrors.impact}
          {...getFieldProps("impact")}
          id="impact"
        />

        {isAnonymous && (
          <Input
            type="email"
            label="Email"
            hint="Requis pour vous recontacter — vous n'êtes pas connecté."
            required
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
            error={fieldErrors.email}
            {...getFieldProps("email")}
            id="email"
          />
        )}

        {allowScreenshot && (
          <div className="input-group">
            <span className="input-label">Capture d'écran (optionnel)</span>
            {screenshot ? (
              <div>
                <p className="input-hint">
                  Capture jointe ({formatKb(screenshot.size)})
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRemoveScreenshot}
                >
                  Retirer la capture
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={screenshotStatus === "capturing"}
                onClick={handleCaptureScreenshot}
              >
                Joindre une capture
              </Button>
            )}
            {screenshotStatus === "error" && (
              <span className="input-hint">
                Capture indisponible ou refusée — vous pouvez continuer sans.
              </span>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

UserFeedbackModal.displayName = "UserFeedbackModal";
