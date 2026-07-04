import { InputHTMLAttributes, forwardRef } from "react";

export interface ToggleProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Classes additionnelles sur le conteneur `.toggle`. */
  className?: string;
}

/**
 * Toggle — Switch on/off du Design System msyx.fr (`formulaires.html` #controls).
 *
 * Émet le markup canonique `.toggle` / `.toggle-slider` (`components/forms.css`) :
 * ```html
 * <label class="toggle">
 *   <input type="checkbox" checked aria-label="Mode sombre">
 *   <span class="toggle-slider"></span>
 * </label>
 * ```
 *
 * **Contrôlé** : `checked`/`onChange` passthrough standard React, aucun état
 * interne. Sous le capot, c'est une checkbox — fournir `aria-label` (ou
 * `aria-labelledby`) quand aucun libellé visible n'accompagne le composant.
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, ...rest }, ref) => {
    return (
      <label className={["toggle", className].filter(Boolean).join(" ")}>
        <input ref={ref} type="checkbox" {...rest} />
        <span className="toggle-slider"></span>
      </label>
    );
  },
);

Toggle.displayName = "Toggle";
