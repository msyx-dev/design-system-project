import { ReactNode, SelectHTMLAttributes, forwardRef, useId } from "react";

export interface SelectOption {
  value: string;
  label: ReactNode;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
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
  /** Options à rendre — alternative aux `children` `<option>`. */
  options?: SelectOption[];
  /** Classes additionnelles sur le conteneur `.input-group`. */
  className?: string;
}

/**
 * Select — Liste déroulante du Design System msyx.fr (`formulaires.html` #inputs).
 *
 * Le DS style les `<select>` via la même classe `.input` que les champs texte
 * (`components/forms.css`, `select.input { appearance: none; ... }`).
 *
 * ```html
 * <div class="input-group">
 *   <label class="input-label" for="...">Environnement</label>
 *   <select class="input" id="...">
 *     <option>Production</option>
 *   </select>
 * </div>
 * ```
 *
 * **Contrôlé** : `value`/`onChange` passthrough standard React. Accepte soit
 * `options`, soit des `children` `<option>` fournis directement.
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, success, options, id, className, children, ...rest },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy =
      [hintId, errorId].filter(Boolean).join(" ") || undefined;

    const selectClasses = [
      "input",
      error ? "input-error" : null,
      !error && success ? "input-success" : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={["input-group", className].filter(Boolean).join(" ")}>
        {label && (
          <label className="input-label" htmlFor={selectId}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={selectClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
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

Select.displayName = "Select";
