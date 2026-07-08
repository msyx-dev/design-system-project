import type { MouseEvent, Ref, RefObject } from "react";
import type { FormValidationError } from "../../hooks/useFormValidation";

export interface FormErrorSummaryProps {
  /** Erreurs à lister — typiquement `errors` renvoyé par `useFormValidation()`. */
  errors: FormValidationError[];
  /**
   * Ref posée sur le conteneur `.alert` — passez `summaryRef` de
   * `useFormValidation()` pour que le hook lui donne le focus au submit
   * invalide (via son `useEffect` post-commit).
   */
  summaryRef?: RefObject<HTMLElement | null>;
  /** Titre du résumé. Défaut : « N erreur(s) à corriger ». */
  title?: string;
  /**
   * Appelé au clic sur un lien d'erreur (après `preventDefault`). Défaut :
   * focus du champ dont l'`id` DOM correspond (`document.getElementById(id)`).
   */
  onFocusField?: (id: string) => void;
  className?: string;
}

/**
 * FormErrorSummary — résumé d'erreurs accessible, compagnon de
 * `useFormValidation()`. Calque `renderSummary` d'`initFormValidation`
 * (`shared/components.js:4378-4415`) : émet `.alert.alert-danger`
 * (`role="alert"`, `tabIndex={-1}`) + `.alert-title` + `.alert-body` >
 * `ul.form-error-list` > `li > a`. La **brique a11y non triviale** est le
 * focus-link : cliquer une erreur `preventDefault` puis focus le champ
 * correspondant par `id` (surchargeable via `onFocusField`).
 *
 * Ne rend RIEN si `errors` est vide (le résumé n'apparaît qu'en cas d'erreur —
 * timing géré côté hook, cf. le focus post-commit de `useFormValidation`).
 *
 * SSR-safe : aucun accès `document` au rendu (uniquement dans le handler de
 * clic, exécuté côté client).
 */
export function FormErrorSummary({
  errors,
  summaryRef,
  title,
  onFocusField,
  className,
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  const heading =
    title ??
    `${errors.length} erreur${errors.length > 1 ? "s" : ""} à corriger`;

  function handleClick(id: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (onFocusField) {
        onFocusField(id);
        return;
      }
      const target =
        typeof document !== "undefined" ? document.getElementById(id) : null;
      target?.focus();
    };
  }

  return (
    <div
      ref={summaryRef as Ref<HTMLDivElement>}
      className={`alert alert-danger${className ? ` ${className}` : ""}`}
      role="alert"
      tabIndex={-1}
    >
      <div className="alert-title">{heading}</div>
      <div className="alert-body">
        <ul className="form-error-list">
          {errors.map((err) => (
            <li key={err.id}>
              <a href={`#${err.id}`} onClick={handleClick(err.id)}>
                {err.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
