import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Libellé affiché à côté de la case (`.checkbox`). */
  label?: ReactNode;
  /** Classes additionnelles sur le conteneur `.checkbox`. */
  className?: string;
}

/**
 * Checkbox — Case à cocher du Design System msyx.fr (`formulaires.html` #controls).
 *
 * Émet le markup canonique `.checkbox` (`components/forms.css`) :
 * ```html
 * <label class="checkbox">
 *   <input type="checkbox" checked> Next.js
 * </label>
 * ```
 *
 * **Contrôlé** : `checked`/`onChange` passthrough standard React, aucun état
 * interne.
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...rest }, ref) => {
    return (
      <label className={["checkbox", className].filter(Boolean).join(" ")}>
        <input ref={ref} type="checkbox" {...rest} />
        {label}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
