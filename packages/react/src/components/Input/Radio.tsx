import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Libellé affiché à côté du bouton radio (`.radio`). */
  label?: ReactNode;
  /** Classes additionnelles sur le conteneur `.radio`. */
  className?: string;
}

/**
 * Radio — Bouton radio du Design System msyx.fr (`formulaires.html` #controls).
 *
 * Émet le markup canonique `.radio` (`components/forms.css`) :
 * ```html
 * <label class="radio">
 *   <input type="radio" name="env" checked> Production
 * </label>
 * ```
 *
 * **Contrôlé** : `checked`/`onChange` passthrough standard React, aucun état
 * interne.
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, ...rest }, ref) => {
    return (
      <label className={["radio", className].filter(Boolean).join(" ")}>
        <input ref={ref} type="radio" {...rest} />
        {label}
      </label>
    );
  },
);

Radio.displayName = "Radio";
