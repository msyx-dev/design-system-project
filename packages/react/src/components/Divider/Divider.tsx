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
}

/**
 * `Divider` — Design System msyx.fr (`pages/composants.html` #dividers).
 *
 * Sans `label` : `<hr class="divider">`. Avec `label` : `<div class="divider-label">`.
 * Périmètre volontairement limité à `.divider`/`.divider-label` (registre
 * `shared/components-registry.json` entrée `divider`) : `.divider-gradient`
 * et `.divider-vertical` existent bien dans `feedback.css` et sont démontrés
 * sur la page, mais ne font pas partie des `cssClasses` déclarées pour cette
 * entrée — hors du périmètre explicite de l'issue #871 (« avec et sans
 * libellé »), non portés ici plutôt qu'ajoutés sans mandat.
 */
export function Divider({ label, className, ...rest }: DividerProps) {
  if (label != null) {
    const classes = ["divider-label", className].filter(Boolean).join(" ");
    return (
      <div className={classes} {...(rest as HTMLAttributes<HTMLDivElement>)}>
        {label}
      </div>
    );
  }

  const classes = ["divider", className].filter(Boolean).join(" ");
  return (
    <hr className={classes} {...(rest as HTMLAttributes<HTMLHRElement>)} />
  );
}
Divider.displayName = "Divider";
