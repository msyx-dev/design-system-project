import { forwardRef, HTMLAttributes, ReactNode } from "react";

/**
 * Couleurs disponibles pour `.card-icon` (`shared/css/utilities.css:296-299`).
 * Note : `--green` cité dans le HTML de doc (`composants.html:225`) n'a aucune
 * règle CSS déclarée (`.card-icon--green` introuvable dans le DS) — non repris
 * ici, cf. §11 CLAUDE.md « n'invente aucune classe ».
 */
export type CardIconVariant =
  "accent" | "deco-violet" | "deco-cyan" | "deco-pink";

export interface CardIconProps extends HTMLAttributes<HTMLDivElement> {
  /** @default "accent" */
  variant?: CardIconVariant;
  children?: ReactNode;
}

/**
 * `CardIcon` — pastille d'icône en tête de `Card` (`pages/composants.html` #cards).
 * Émet `.card-icon .card-icon--{variant}`.
 */
export function CardIcon({
  variant = "accent",
  className,
  children,
  ...rest
}: CardIconProps) {
  const classes = ["card-icon", `card-icon--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
CardIcon.displayName = "CardIcon";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `.card-flat` — fond atténué, élévation réduite au hover. */
  flat?: boolean;
  /** `.card-compact` — padding réduit (grilles de features/KPI courts). */
  compact?: boolean;
  /** `.card-horizontal` — icône + contenu alignés sur une ligne. */
  horizontal?: boolean;
  /**
   * `.card-muted` — atténuation WCAG-safe (#569) : opacity sur le chrome
   * (fond/bordure/icône), jamais sur le texte. Combinable avec les autres
   * modificateurs (ex. `card-media card-muted`, `composants.html:257`).
   */
  muted?: boolean;
  /**
   * Rend la card cliquable : wrapper `<a class="card-link">` autour du
   * `<div class="card">` (a11y WAI — `pages/composants.html` « Card cliquable
   * (a11y) »). Focus-visible et hover gérés par `.card-link` (`cards.css`),
   * pas de logique JS supplémentaire nécessaire côté wrapper.
   */
  href?: string;
  children?: ReactNode;
}

/**
 * `Card` — Design System msyx.fr (`pages/composants.html` #cards).
 *
 * Émet `.card` + modificateurs `.card-flat`/`.card-compact`/`.card-horizontal`/
 * `.card-muted`, toujours cumulés à la classe de base (jamais seuls — vérifié
 * sur le markup réel de la page, pas sur l'exemple `cssClasses.example` du
 * registre qui omet `.card` par erreur de doc préexistante).
 *
 * Ne couvre PAS `.hero-*`/`.hub-*`/`.lazy-*`/`.label`/`.number`/`.orb-3` :
 * ces classes sont lumpées dans l'entrée registre `cards` par un artefact de
 * regroupement par fichier CSS (dette déjà tracée #770), ce sont des classes
 * de chrome de page (hero, hub de navigation, lazy-loader) sans rapport avec
 * le composant `Card` réutilisable — hors périmètre de ce portage.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { flat, compact, horizontal, muted, href, className, children, ...rest },
  ref,
) {
  const classes = [
    "card",
    flat && "card-flat",
    compact && "card-compact",
    horizontal && "card-horizontal",
    muted && "card-muted",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const card = (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="card-link">
        {card}
      </a>
    );
  }

  return card;
});
Card.displayName = "Card";
