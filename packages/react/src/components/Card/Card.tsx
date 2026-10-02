import {
  forwardRef,
  ForwardedRef,
  HTMLAttributes,
  ReactNode,
  useId,
} from "react";

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

/** Niveau du titre de carte — jamais h1 (une carte n'est pas le titre de page). */
export type CardHeadingLevel = "h2" | "h3" | "h4" | "h5" | "h6";

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
   * `.card-static` — carte conteneur non interactive (#1010) : aucun retour de
   * survol (élévation, ombre, bordure, barre dégradée, icône). Pour une carte
   * qui CONTIENT un formulaire ou des contrôles sans être cliquable. Combinable
   * avec `flat`/`muted`. Ignoré si `href` : une carte-lien est interactive par
   * définition.
   */
  static?: boolean;
  /**
   * Titre de la carte (#1010) : rendu en premier enfant, dans un
   * `<hN class="card-title" id>` dont l'`id` est généré par `useId()`. Le niveau
   * se règle par `headingLevel`.
   */
  heading?: ReactNode;
  /**
   * Niveau du titre `heading`. Défaut `"h2"` : une carte est un bloc de page
   * sous le `h1` de la page. Choisir le niveau qui prolonge le plan de titres
   * de la page, pas l'apparence (`.card-title` rend h2 à h6 à l'identique).
   * @default "h2"
   */
  headingLevel?: CardHeadingLevel;
  /**
   * Fait de la racine un `<section aria-labelledby={id du titre}>` : une région
   * nommée, donc un repère de navigation pour les lecteurs d'écran. Opt-in, à
   * réserver aux blocs principaux et distincts d'une page (5 au plus) — jamais
   * aux cartes répétées d'une grille, qui polluent la liste des repères. Sans
   * `region`, le titre seul suffit à la navigation par titres. Sans `heading`,
   * passer `aria-label` pour nommer la région. Ignoré si `href`.
   */
  region?: boolean;
  /**
   * Rend la card cliquable : wrapper `<a class="card-link">` autour du
   * `<div class="card">` (a11y WAI — `pages/composants.html` « Card cliquable
   * (a11y) »). Focus-visible et hover gérés par `.card-link` (`cards.css`),
   * pas de logique JS supplémentaire nécessaire côté wrapper. Prime sur
   * `static` et `region` (ignorés).
   */
  href?: string;
  children?: ReactNode;
}

/**
 * `Card` — Design System msyx.fr (`pages/composants.html` #cards).
 *
 * Émet `.card` + modificateurs `.card-flat`/`.card-compact`/`.card-horizontal`/
 * `.card-muted`/`.card-static`, toujours cumulés à la classe de base (jamais
 * seuls — vérifié sur le markup réel de la page, pas sur l'exemple
 * `cssClasses.example` du registre qui omet `.card` par erreur de doc
 * préexistante).
 *
 * Motif « carte titrée » (#1010, `pages/composants.html` #card-static) :
 * `<Card static region heading="Lancement">…</Card>` rend un
 * `<section class="card card-static" aria-labelledby>` dont le premier enfant
 * est le `<h2 class="card-title">`. Hors `region`, la racine reste un `<div>`
 * (`aria-labelledby` sur un `<div>` sans rôle serait ignoré) : la `ref` désigne
 * donc un `HTMLElement` (`HTMLDivElement`, ou `HTMLElement` de tag `SECTION`).
 *
 * Ne couvre PAS `.hero-*`/`.hub-*`/`.lazy-*`/`.label`/`.number`/`.orb-3` :
 * ces classes sont lumpées dans l'entrée registre `cards` par un artefact de
 * regroupement par fichier CSS (dette déjà tracée #770), ce sont des classes
 * de chrome de page (hero, hub de navigation, lazy-loader) sans rapport avec
 * le composant `Card` réutilisable — hors périmètre de ce portage.
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    flat,
    compact,
    horizontal,
    muted,
    // `static` est un mot réservé en mode strict : la destructuration renomme.
    static: isStatic,
    heading,
    headingLevel: Heading = "h2",
    region,
    href,
    className,
    children,
    ...rest
  },
  ref,
) {
  // Appelé sans condition (règles des hooks), même sans `heading`.
  const headingId = useId();
  const hasHeading = heading != null;
  const asRegion = Boolean(region) && !href;

  const classes = [
    "card",
    flat && "card-flat",
    compact && "card-compact",
    horizontal && "card-horizontal",
    muted && "card-muted",
    isStatic && !href && "card-static",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {hasHeading && (
        <Heading className="card-title" id={headingId}>
          {heading}
        </Heading>
      )}
      {children}
    </>
  );

  const card = asRegion ? (
    // `aria-labelledby` AVANT `{...rest}` : celui du consommateur l'emporte.
    <section
      ref={ref}
      className={classes}
      aria-labelledby={hasHeading ? headingId : undefined}
      {...rest}
    >
      {content}
    </section>
  ) : (
    <div
      ref={ref as ForwardedRef<HTMLDivElement>}
      className={classes}
      {...rest}
    >
      {content}
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
