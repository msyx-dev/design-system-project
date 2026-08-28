import { HTMLAttributes } from "react";

/**
 * Modificateurs de forme de `.skeleton` (`shared/css/components/feedback.css`).
 * Non exhaustif des compositions de page (`skeleton-table-row`,
 * `skeleton-dashboard`, etc. — kind:module, hors périmètre de l'entrée
 * registre `skeleton`, cf. `pages/feedback.html` #skeleton).
 */
export type SkeletonVariant = "text" | "title" | "avatar" | "btn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Forme du placeholder. Sans valeur, émet `.skeleton` nu — dimensionné via
   * `style` par le consommateur (`feedback.html:129` `<div class="skeleton"
   * style="height:40px;border-radius:12px;">`).
   */
  variant?: SkeletonVariant;
}

/**
 * `Skeleton` — Design System msyx.fr (`pages/feedback.html` #skeleton).
 *
 * Émet `.skeleton` + modificateur `.skeleton-{text,title,avatar,btn}` optionnel,
 * toujours cumulé à la classe de base (jamais seul, sauf le cas nu documenté
 * ci-dessus). Largeur/hauteur pilotées par `style` (voir markup réel : les
 * largeurs varient par instance, ex. `style="width:90%"`).
 */
export function Skeleton({ variant, className, ...rest }: SkeletonProps) {
  const classes = ["skeleton", variant && `skeleton-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...rest} />;
}
Skeleton.displayName = "Skeleton";
