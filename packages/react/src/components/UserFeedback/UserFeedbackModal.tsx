import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Modal } from "../Modal/Modal";
import { Input } from "../Input/Input";
import { Select, type SelectOption } from "../Input/Select";
import { Button } from "../Button/Button";
import { FileUpload } from "../FileUpload/FileUpload";
import { FormErrorSummary } from "../FormValidation/FormErrorSummary";
import { useFormValidation } from "../../hooks/useFormValidation";
import {
  normalizeScreenshot as normalizeScreenshotFile,
  ScreenshotNormalizeError,
  DEFAULT_MAX_BYTES,
  type ScreenshotFailureReason,
  type ScreenshotNormalizeConfig,
} from "./normalizeScreenshot";
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

/** Taille max acceptée pour la pièce jointe (validation non bloquante, #714). */
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
/** Préfixe MIME accepté (image seule). */
const ACCEPTED_TYPE_PREFIX = "image/";

/** Formate une taille d'octets en Ko / Mo pour `.file-item-size`. */
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** Message utilisateur par cause d'échec — non bloquants, alignés sur `:182`/`:189`. */
const ATTACHMENT_FAILURE_MESSAGES: Record<ScreenshotFailureReason, string> = {
  decode:
    "Image illisible — essayez un autre fichier. Vous pouvez continuer sans.",
  unsupported:
    "Votre navigateur ne sait pas convertir cette image en WebP. Vous pouvez continuer sans la capture.",
  "too-large":
    "Image encore trop lourde après compression — essayez une capture plus petite. Vous pouvez continuer sans.",
};

function attachmentFailureMessage(err: unknown): string {
  if (err instanceof ScreenshotNormalizeError) {
    return ATTACHMENT_FAILURE_MESSAGES[err.reason];
  }
  return "La conversion de l'image a échoué. Vous pouvez continuer sans.";
}

// Littéral au niveau module : un `{}` en défaut de props change d'identité à
// chaque rendu et invaliderait le `useCallback` de `handleAttachFiles` à
// chaque frappe (#803).
const EMPTY_NORMALIZE_CONFIG: ScreenshotNormalizeConfig = {};

export interface UserFeedbackModalProps {
  /** Contrôle l'ouverture — délégué tel quel à `<Modal>`. */
  open: boolean;
  /** Appelé pour toute demande de fermeture (croix, ESC, backdrop, Annuler, post-submit). */
  onClose: () => void;
  /** Contexte transverse capturé par `UserFeedbackProvider` (#692). */
  context: UserFeedbackContextData;
  /** Handler de soumission — reçoit les valeurs saisies + le contexte. */
  onSubmit: FeedbackSubmitHandler;
  /** Affiche la zone de pièce jointe (image) opt-in. Défaut `true`. */
  allowScreenshot?: boolean;
  /**
   * Normalisation de la pièce jointe avant `onSubmit` (#803). Omis → WebP
   * ≤ 512 Ko, plus grand côté ≤ 1600 px. Objet → réglages partiels.
   * `false` → aucune conversion, le fichier brut est transmis tel quel
   * (comportement d'avant #803).
   * @default {}
   */
  normalizeScreenshot?: false | ScreenshotNormalizeConfig;
}

/**
 * UserFeedbackModal — Formulaire de retour utilisateur du Design System
 * msyx.fr (#693). Compose intégralement des primitives existantes
 * (`<Modal>`, `<Input>`, `<Select>`, `<Button>`, `useFormValidation` +
 * `<FormErrorSummary>`) — aucune nouvelle primitive DS.
 *
 * Champs : `type`/`title`/`description` requis, `impact` optionnel, `email`
 * requis uniquement si `context.user === null` (mode anonyme), `screenshot`
 * opt-in (pièce jointe image ≤5 Mo via `<FileUpload>` DS — drag & drop +
 * parcourir, validation type/taille non bloquante, #714). Normalisée en WebP
 * ≤ 512 Ko par défaut avant `onSubmit` (`normalizeScreenshot`, #803) — le
 * fichier brut reste transmis dans `values.screenshotOriginal`.
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
  normalizeScreenshot = EMPTY_NORMALIZE_CONFIG,
}: UserFeedbackModalProps) {
  const isAnonymous = context.user === null;

  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<FeedbackImpact | "">("");
  const [email, setEmail] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotOriginal, setScreenshotOriginal] = useState<File | null>(
    null,
  );
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Deux dépôts rapprochés : la conversion du 1er peut résoudre APRÈS celle du
  // 2e et écraser la bonne pièce jointe. Seul le jeton courant a le droit d'écrire.
  const attachmentTokenRef = useRef(0);

  // `onSubmit` peut être asynchrone (POST réseau) : si la modale se démonte
  // (fermeture) pendant l'attente, les callbacks ne doivent PAS appeler
  // setState sur un composant démonté.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const resetFormState = useCallback(() => {
    setType("bug");
    setTitle("");
    setDescription("");
    setImpact("");
    setEmail("");
    setScreenshot(null);
    setScreenshotOriginal(null);
    setAttachmentError(null);
    setConverting(false);
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
        screenshotOriginal,
      };
      await onSubmit(values, context);
      if (!mountedRef.current) return;
      onClose();
    } catch (err) {
      if (!mountedRef.current) return;
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "L'envoi du retour a échoué. Vérifiez votre connexion et réessayez.",
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
    screenshotOriginal,
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

  const handleAttachFiles = useCallback(
    async (files: File[]) => {
      const file = files[0] ?? null;
      if (!file) return;
      if (!file.type.startsWith(ACCEPTED_TYPE_PREFIX)) {
        setAttachmentError(
          "Format non pris en charge — choisissez une image. Vous pouvez continuer sans.",
        );
        return;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(
          "Fichier trop volumineux (max 5 Mo). Vous pouvez continuer sans.",
        );
        return;
      }
      setAttachmentError(null);

      // Opt-out explicite : comportement d'avant #803 (brut transmis tel quel).
      if (normalizeScreenshot === false) {
        setScreenshotOriginal(file);
        setScreenshot(file);
        return;
      }

      const token = ++attachmentTokenRef.current;
      setConverting(true);
      try {
        const normalized = await normalizeScreenshotFile(
          file,
          normalizeScreenshot,
        );
        if (!mountedRef.current || token !== attachmentTokenRef.current) {
          return;
        }
        setScreenshotOriginal(file);
        setScreenshot(normalized);
      } catch (err) {
        if (!mountedRef.current || token !== attachmentTokenRef.current) {
          return;
        }
        // Fail-closed : la pièce jointe est abandonnée, JAMAIS remplacée par le
        // brut — sinon un PNG partirait dans un champ `screenshotWebp` (#803).
        setScreenshot(null);
        setScreenshotOriginal(null);
        setAttachmentError(attachmentFailureMessage(err));
      } finally {
        if (mountedRef.current && token === attachmentTokenRef.current) {
          setConverting(false);
        }
      }
    },
    [normalizeScreenshot],
  );

  const handleRemoveAttachment = useCallback(() => {
    attachmentTokenRef.current++; // annule une conversion encore en vol
    setScreenshot(null);
    setScreenshotOriginal(null);
    setConverting(false);
    setAttachmentError(null);
  }, []);

  const descriptionField = getFieldProps("description");
  const descriptionHasError = Boolean(fieldErrors.description);

  const maxBytes =
    normalizeScreenshot === false
      ? null
      : (normalizeScreenshot.maxBytes ?? DEFAULT_MAX_BYTES);
  const attachmentHint =
    maxBytes === null
      ? "Image jusqu'à 5 Mo (PNG, JPG, WebP…)"
      : `Image jusqu'à 5 Mo (PNG, JPG, WebP…) — convertie en WebP ≤ ${formatFileSize(maxBytes)}`;

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
          {/* Bloqué pendant la conversion : un envoi déclenché à cet instant
              partirait SANS la pièce jointe, silencieusement. */}
          <Button
            type="submit"
            form={FORM_ID}
            loading={submitting}
            disabled={converting}
          >
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
            <span className="input-label">Joindre un fichier (optionnel)</span>
            <FileUpload
              accept="image/*"
              multiple={false}
              hint={attachmentHint}
              disabled={converting}
              onFiles={handleAttachFiles}
              files={
                screenshot
                  ? [
                      {
                        name: screenshot.name,
                        size: formatFileSize(screenshot.size),
                      },
                    ]
                  : undefined
              }
              onRemove={handleRemoveAttachment}
            />
            {/* Région live PERSISTANTE : un `role="status"` monté en même temps
                que son texte n'est pas annoncé de façon fiable par tous les
                lecteurs d'écran. Toujours présente, elle réserve aussi sa place
                → aucun saut de mise en page quand le message apparaît. */}
            <span className="input-hint" role="status">
              {converting ? "Conversion de l'image…" : (attachmentError ?? "")}
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}

UserFeedbackModal.displayName = "UserFeedbackModal";
