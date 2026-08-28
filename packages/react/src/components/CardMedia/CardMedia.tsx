import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { Card } from "../Card/Card";

export interface CardMediaProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `.card-muted` — atténuation WCAG-safe, cumulable avec `card-media`
   * (`composants.html:257` : `class="card card-media card-muted"`).
   */
  muted?: boolean;
  /**
   * Rend la card cliquable — wrapper `<a class="card-link">`
   * (`composants.html:274`, « Card media cliquable »). Même contrat que `Card`.
   */
  href?: string;
  children?: ReactNode;
}

/**
 * `CardMedia` — variante `Card` à vignette bleed pleine largeur
 * (`pages/composants.html` #card-media, `cards.css` v2.79.0 #37).
 *
 * Compose `Card` (base `.card`) et ajoute `.card-media`. Ne réexpose PAS
 * `flat`/`compact`/`horizontal` : aucune combinaison de ce type n'existe
 * dans le DS (`card-media` ne s'utilise qu'avec `muted` et/ou `card-link`,
 * cf. markup réel de la page) — surface d'API volontairement restreinte
 * plutôt que d'inventer des combinaisons non démontrées.
 *
 * Structure attendue : `<CardMedia><CardThumb>…</CardThumb><CardBody>…</CardBody></CardMedia>`.
 */
export const CardMedia = forwardRef<HTMLDivElement, CardMediaProps>(
  function CardMedia({ muted, href, className, children, ...rest }, ref) {
    const classes = ["card-media", className].filter(Boolean).join(" ");

    return (
      <Card ref={ref} muted={muted} href={href} className={classes} {...rest}>
        {children}
      </Card>
    );
  },
);
CardMedia.displayName = "CardMedia";

export interface CardThumbProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * `CardThumb` — zone vignette (image ou fond décoratif) en tête de `CardMedia`.
 * Émet `.card-thumb`. Hauteur pilotée par le token `--card-thumb-h` (160px
 * par défaut, `tokens.css`).
 */
export function CardThumb({ className, children, ...rest }: CardThumbProps) {
  const classes = ["card-thumb", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
CardThumb.displayName = "CardThumb";

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/**
 * `CardBody` — zone de contenu sous la vignette, rétablit le padding retiré
 * par `.card-media`. Émet `.card-body`.
 */
export function CardBody({ className, children, ...rest }: CardBodyProps) {
  const classes = ["card-body", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
CardBody.displayName = "CardBody";
