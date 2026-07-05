import { InputHTMLAttributes, ReactNode, forwardRef, useId } from "react";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  /** Libellé affiché au-dessus du champ (`.input-label`). */
  label?: ReactNode;
  /** Texte d'aide sous le champ (`.input-hint`), lié via `aria-describedby`. */
  hint?: ReactNode;
  /** Message d'erreur (`.input-error-msg`) — bascule le champ en état erreur. */
  error?: ReactNode;
  /** Marque le champ comme valide (`.input-success`). */
  success?: boolean;
  /** Icône affichée à gauche du champ (`.input-with-icon` / `.input-icon`). */
  icon?: ReactNode;
  /** Classes additionnelles sur le conteneur `.input-group`. */
  className?: string;
}

/**
 * Input — Champ de saisie du Design System msyx.fr (`formulaires.html` #inputs).
 *
 * Émet le markup canonique `.input-group` (`components/forms.css`) :
 * ```html
 * <div class="input-group">
 *   <label class="input-label" for="...">Nom du projet</label>
 *   <input class="input" id="..." aria-describedby="...">
 *   <span class="input-hint" id="...">Lettres minuscules...</span>
 * </div>
 * ```
 *
 * **Contrôlé** : `value`/`onChange` passthrough standard React, aucun état
 * interne. `id` auto-généré via `useId` si absent, pour lier `label`/`htmlFor`
 * et `aria-describedby` (hint et/ou error).
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, success, icon, id, className, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy =
      [hintId, errorId].filter(Boolean).join(" ") || undefined;

    const inputClasses = [
      "input",
      error ? "input-error" : null,
      !error && success ? "input-success" : null,
    ]
      .filter(Boolean)
      .join(" ");

    const field = (
      <input
        ref={ref}
        id={inputId}
        className={inputClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    );

    return (
      <div className={["input-group", className].filter(Boolean).join(" ")}>
        {label && (
          <label className="input-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        {icon ? (
          <div className="input-with-icon">
            <span className="input-icon">{icon}</span>
            {field}
          </div>
        ) : (
          field
        )}
        {error ? (
          <span className="input-error-msg" id={errorId}>
            {error}
          </span>
        ) : (
          hint && (
            <span className="input-hint" id={hintId}>
              {hint}
            </span>
          )
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
