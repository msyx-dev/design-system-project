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
 * parcourir, validation type/taille non bloquante, sans re-encodage, #714).
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
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setAttachmentError(null);
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
      if (!mountedRef.current) return;
      onClose();
    } catch {
      if (!mountedRef.current) return;
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

  const handleAttachFiles = useCallback((files: File[]) => {
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
    setScreenshot(file);
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setScreenshot(null);
    setAttachmentError(null);
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
            <span className="input-label">Joindre un fichier (optionnel)</span>
            <FileUpload
              accept="image/*"
              multiple={false}
              hint="Image jusqu'à 5 Mo (PNG, JPG, WebP…)"
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
            {attachmentError && (
              <span className="input-hint" role="status">
                {attachmentError}
              </span>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

UserFeedbackModal.displayName = "UserFeedbackModal";
