import { HTMLAttributes, ReactNode } from "react";

export interface DividerProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  /**
   * Libellé au centre du divider — bascule le rendu de `<hr class="divider">`
   * vers `<div class="divider-label">{label}</div>` (les traits latéraux sont
   * tracés par `::before`/`::after` en CSS, `feedback.css:16-17`).
   */
  label?: ReactNode;
  /**
   * `.divider-gradient` — variante dégradée (`--gradient-1`, `feedback.css:15`),
   * rendue `<div class="divider-gradient">` sans contenu (`composants.html:489`,
   * `fondation.html:192`). Ignoré si `vertical` est actif.
   */
  gradient?: boolean;
  /**
   * `.divider-vertical` — séparateur vertical inline pour layouts flex
   * (`feedback.css:18`), rendu `<span class="divider-vertical">` sans contenu
   * (`composants.html:498`). Prioritaire sur `label`/`gradient`.
   */
  vertical?: boolean;
}

/**
 * `Divider` — Design System msyx.fr (`pages/composants.html` #dividers,
 * `pages/fondation.html` « Séparateurs »).
 *
 * 4 rendus, par ordre de priorité :
 * - `vertical` → `<span class="divider-vertical">` (inline, layouts flex).
 * - `label` → `<div class="divider-label">{label}</div>`.
 * - `gradient` → `<div class="divider-gradient">`.
 * - défaut → `<hr class="divider">`.
 *
 * Note : `.divider`/`.divider-label`/`.divider-gradient`/`.divider-vertical`
 * vivent toutes dans `feedback.css`, pas dans un module dédié « séparateur » —
 * c'est le regroupement CSS existant du DS, pas une particularité du wrapper.
 */
export function Divider({
  label,
  gradient,
  vertical,
  className,
  ...rest
}: DividerProps) {
  if (vertical) {
    const classes = ["divider-vertical", className].filter(Boolean).join(" ");
    return (
      <span
        className={classes}
        {...(rest as HTMLAttributes<HTMLSpanElement>)}
      />
    );
  }

  if (label != null) {
    const classes = ["divider-label", className].filter(Boolean).join(" ");
    return (
      <div className={classes} {...(rest as HTMLAttributes<HTMLDivElement>)}>
        {label}
      </div>
    );
  }

  if (gradient) {
    const classes = ["divider-gradient", className].filter(Boolean).join(" ");
    return (
      <div className={classes} {...(rest as HTMLAttributes<HTMLDivElement>)} />
    );
  }

  const classes = ["divider", className].filter(Boolean).join(" ");
  return (
    <hr className={classes} {...(rest as HTMLAttributes<HTMLHRElement>)} />
  );
}
Divider.displayName = "Divider";
