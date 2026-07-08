import type {
  FocusEvent as ReactFocusEvent,
  FormEvent,
  RefObject,
} from "react";
import { useCallback, useRef, useState } from "react";

/** Champ nativement validable (Constraint Validation API). */
type ValidatableField =
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Messages FR paramétrables — réplique `MESSAGES_FR`
 * (`shared/components.js:4274-4283`), aplati (pas d'objet imbriqué
 * `typeMismatch.email/default`) pour une surface TS plus simple.
 */
export interface FrMessages {
  valueMissing: string;
  typeMismatchEmail: string;
  typeMismatchDefault: string;
  tooShort: (min: number) => string;
  tooLong: (max: number) => string;
  patternMismatch: string;
  /** Repli générique (contrainte non gérée explicitement, ex. `rangeOverflow`). */
  fallback: string;
}

/** Messages FR par défaut — valeurs identiques au vanilla `MESSAGES_FR`. */
export const DEFAULT_FR_MESSAGES: FrMessages = {
  valueMissing: "Ce champ est requis.",
  typeMismatchEmail: "Veuillez saisir une adresse e-mail valide.",
  typeMismatchDefault: "Valeur incorrecte.",
  tooShort: (min) => `Minimum ${min} caractère${min > 1 ? "s" : ""}.`,
  tooLong: (max) => `Maximum ${max} caractère${max > 1 ? "s" : ""}.`,
  patternMismatch: "Format invalide.",
  fallback: "Valeur incorrecte.",
};

/** Entrée du résumé d'erreurs — `id` = attribut `id` DOM du champ concerné. */
export interface FormValidationError {
  id: string;
  message: string;
}

export interface UseFormValidationOptions {
  /** Surcharge partielle des messages FR par défaut. */
  messages?: Partial<FrMessages>;
  /** Appelé au submit quand tous les champs enregistrés sont valides. */
  onValid?: (event: FormEvent<HTMLFormElement>) => void;
  /** Appelé au submit quand au moins un champ enregistré est invalide. */
  onInvalid?: (errors: FormValidationError[]) => void;
}

export interface FieldProps {
  name: string;
  /** Posé uniquement quand le champ est invalide (jamais `"false"` — retiré du DOM sinon). */
  "aria-invalid"?: true;
  /** id du message d'erreur (`${champ.id}-error`), posé uniquement quand le champ est invalide. */
  "aria-describedby"?: string;
  onBlur: (event: ReactFocusEvent<ValidatableField>) => void;
  ref: (node: ValidatableField | null) => void;
}

export interface UseFormValidationReturn {
  formProps: {
    noValidate: true;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    ref: (node: HTMLFormElement | null) => void;
  };
  /** Props à spreader sur le champ natif (ou sur `<Input>` — `id` doit valoir `name`). */
  getFieldProps: (name: string) => FieldProps;
  /** `fieldErrors[name]` → à passer directement à `<Input error={fieldErrors[name]}>`. */
  fieldErrors: Record<string, string>;
  /** Liste résumé (dernier passage de validation complet — submit ou `validate()`). */
  errors: FormValidationError[];
  /** `true` si le dernier passage de validation complet n'a produit aucune erreur. */
  isValid: boolean;
  /** Lance un passage de validation complet sur tous les champs enregistrés. Retourne `true` si valide. */
  validate: () => boolean;
  /**
   * Ref optionnelle à poser sur le conteneur du résumé d'erreurs construit par le
   * consumer (ex. `<div ref={summaryRef} role="alert" tabIndex={-1} className="alert alert-danger">`).
   * Reçoit le focus automatiquement au submit invalide (réplique `renderSummary(...).focus()`).
   */
  summaryRef: RefObject<HTMLElement | null>;
}

function resolveMessage(field: ValidatableField, messages: FrMessages): string {
  const v = field.validity;
  const d = field.dataset;
  if (v.valueMissing) return d.validateMsgRequired || messages.valueMissing;
  if (v.typeMismatch) {
    if (d.validateMsgEmail) return d.validateMsgEmail;
    return (field as HTMLInputElement).type === "email"
      ? messages.typeMismatchEmail
      : messages.typeMismatchDefault;
  }
  if (v.tooShort) {
    const min = (field as HTMLInputElement | HTMLTextAreaElement).minLength;
    return d.validateMsgMin || messages.tooShort(min);
  }
  if (v.tooLong) {
    const max = (field as HTMLInputElement | HTMLTextAreaElement).maxLength;
    return d.validateMsgMax || messages.tooLong(max);
  }
  if (v.patternMismatch)
    return d.validateMsgPattern || messages.patternMismatch;
  return messages.fallback;
}

function ensureLiveRegion(form: HTMLFormElement): HTMLDivElement {
  let lr = form.querySelector<HTMLDivElement>("[data-fv-live]");
  if (!lr) {
    lr = document.createElement("div");
    lr.className = "sr-only";
    lr.setAttribute("aria-live", "polite");
    lr.setAttribute("aria-atomic", "true");
    lr.setAttribute("data-fv-live", "");
    form.prepend(lr);
  }
  return lr;
}

function announce(liveRegion: HTMLDivElement | null, message: string) {
  if (!liveRegion) return;
  liveRegion.textContent = "";
  // Force le reflow pour garantir l'annonce (réplique `announce()` vanilla,
  // `shared/components.js:4314-4319`) — sans ce cycle reset+reflow, un
  // lecteur d'écran ne réannonce pas un message identique au précédent.
  void liveRegion.offsetHeight;
  liveRegion.textContent = message;
}

/**
 * useFormValidation — orchestration a11y de la validation de formulaire
 * (`pages/formulaires.html` #form-validation, `initFormValidation`
 * `shared/components.js:4273-4473`).
 *
 * C'est un **hook**, pas un composant : le rendu par champ
 * (`.input-error` / `.input-error-msg` / `aria-invalid` / `aria-describedby`)
 * est déjà couvert par `<Input error>` — ce hook feed `fieldErrors[name]` à
 * la prop `error` d'`<Input>`, il ne rend rien lui-même. Le résumé
 * (`.alert.alert-danger` + `.form-error-list`) reste à la charge du consumer
 * (classes DS déjà existantes) ; `errors` fournit les données, `summaryRef`
 * permet de recevoir le focus automatiquement au submit invalide.
 *
 * Traduit la Constraint Validation API native (`field.validity`) en messages
 * FR paramétrables, gère le cycle blur (validation immédiate) / input
 * (retrait immédiat de l'erreur si le champ redevient valide) / submit
 * (passage complet + résumé), et une région live `.sr-only` (`aria-live`
 * `polite`) annonçant chaque message d'erreur.
 *
 * **Convention requise** : posez `id={name}` sur chaque champ enregistré via
 * `getFieldProps(name)` — c'est ce qui aligne l'`aria-describedby` généré
 * ici (`${id}-error`) avec l'id que calcule `<Input error=...>` en interne.
 * Un consumer peut toujours surcharger un message par champ via les
 * attributs `data-validate-msg-required` / `-email` / `-min` / `-max` /
 * `-pattern` posés directement sur le JSX du champ (lus depuis
 * `field.dataset`, exactement comme en vanilla).
 *
 * SSR-safe : aucun accès à `window`/`document` pendant le rendu — toute
 * manipulation DOM (région live, listeners natifs `input`) se fait dans les
 * callbacks de ref / gestionnaires d'événements, exécutés uniquement côté
 * client après montage.
 *
 * Limite connue : les champs sont validés uniquement s'ils sont câblés
 * explicitement via `getFieldProps(name)` (pas de découverte implicite façon
 * `form[data-validate] input` du vanilla). Les groupes radio/checkbox ne
 * sont pas une cible première (chaque entrée a sa propre `validity`) —
 * câblez la représentante du groupe ou gérez ce cas à la main.
 */
export function useFormValidation(
  options?: UseFormValidationOptions,
): UseFormValidationReturn {
  const messages: FrMessages = { ...DEFAULT_FR_MESSAGES, ...options?.messages };

  const onValidRef = useRef(options?.onValid);
  onValidRef.current = options?.onValid;
  const onInvalidRef = useRef(options?.onInvalid);
  onInvalidRef.current = options?.onInvalid;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FormValidationError[]>([]);

  const fieldsRef = useRef<Map<string, ValidatableField>>(new Map());
  const fieldCleanupRef = useRef<Map<string, () => void>>(new Map());
  const fieldRefCallbacksRef = useRef<
    Map<string, (node: ValidatableField | null) => void>
  >(new Map());
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);

  const clearFieldError = useCallback((name: string) => {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const attachField = useCallback(
    (name: string, node: ValidatableField | null) => {
      const previous = fieldsRef.current.get(name);
      if (previous && previous !== node) {
        fieldCleanupRef.current.get(name)?.();
        fieldCleanupRef.current.delete(name);
        fieldsRef.current.delete(name);
      }
      if (!node) return;

      fieldsRef.current.set(name, node);

      const handleNativeInput = () => {
        if (node.validity.valid) clearFieldError(name);
      };
      node.addEventListener("input", handleNativeInput);
      fieldCleanupRef.current.set(name, () => {
        node.removeEventListener("input", handleNativeInput);
      });
    },
    [clearFieldError],
  );

  const getFieldRefCallback = useCallback(
    (name: string) => {
      const cache = fieldRefCallbacksRef.current;
      let cb = cache.get(name);
      if (!cb) {
        cb = (node: ValidatableField | null) => attachField(name, node);
        cache.set(name, cb);
      }
      return cb;
    },
    [attachField],
  );

  const handleFieldBlur = useCallback(
    (name: string) => {
      const field = fieldsRef.current.get(name);
      if (!field) return;
      if (field.validity.valid) {
        clearFieldError(name);
        return;
      }
      const message = resolveMessage(field, messages);
      setFieldErrors((prev) => ({ ...prev, [name]: message }));
      announce(liveRegionRef.current, message);
    },
    // `messages` est recalculé à chaque rendu (merge défaut + overrides) —
    // pas de useMemo ici volontairement : ce n'est pas la ref qui doit être
    // stable (elle ne pilote aucun attach/detach DOM), seule `ref` (ci-dessus,
    // via le cache par nom) doit l'être pour éviter un churn des listeners
    // natifs à chaque changement d'état.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearFieldError, JSON.stringify(Object.keys(messages))],
  );

  const formNodeRef = useRef<HTMLFormElement | null>(null);
  const formRefCallback = useCallback((node: HTMLFormElement | null) => {
    formNodeRef.current = node;
    liveRegionRef.current = node ? ensureLiveRegion(node) : null;
  }, []);

  const runValidationPass = useCallback((): {
    valid: boolean;
    errors: FormValidationError[];
  } => {
    const nextFieldErrors: Record<string, string> = {};
    const errorList: FormValidationError[] = [];

    fieldsRef.current.forEach((field, name) => {
      if (field.disabled) return;
      if (field.validity.valid) return;
      const message = resolveMessage(field, messages);
      nextFieldErrors[name] = message;
      errorList.push({ id: field.id || name, message });
    });

    setFieldErrors(nextFieldErrors);
    setErrors(errorList);
    return { valid: errorList.length === 0, errors: errorList };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.keys(messages))]);

  const validate = useCallback(
    () => runValidationPass().valid,
    [runValidationPass],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const { valid, errors: errorList } = runValidationPass();

      if (valid) {
        onValidRef.current?.(event);
        return;
      }

      announce(
        liveRegionRef.current,
        `${errorList.length} erreur${errorList.length > 1 ? "s" : ""} à corriger`,
      );
      onInvalidRef.current?.(errorList);
      summaryRef.current?.focus();
    },
    [runValidationPass],
  );

  const getFieldProps = useCallback(
    (name: string): FieldProps => {
      const hasError = Object.prototype.hasOwnProperty.call(fieldErrors, name);
      const field = fieldsRef.current.get(name);
      const errorId = `${field?.id || name}-error`;

      return {
        name,
        ref: getFieldRefCallback(name),
        onBlur: () => handleFieldBlur(name),
        ...(hasError
          ? { "aria-invalid": true as const, "aria-describedby": errorId }
          : {}),
      };
    },
    [fieldErrors, getFieldRefCallback, handleFieldBlur],
  );

  return {
    formProps: {
      noValidate: true,
      onSubmit: handleSubmit,
      ref: formRefCallback,
    },
    getFieldProps,
    fieldErrors,
    errors,
    isValid: errors.length === 0,
    validate,
    summaryRef,
  };
}
