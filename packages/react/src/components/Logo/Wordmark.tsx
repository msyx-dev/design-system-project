import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export interface WordmarkProps extends HTMLAttributes<HTMLSpanElement> {
  /** Texte affiché. @default "design-system" */
  children?: ReactNode;
}

const DEFAULT_TEXT = "design-system";

/**
 * `Wordmark` — texte de marque `.brand-wordmark` (`fondation.html`
 * #brand-wordmark, `brand.css` : Space Grotesk 600 18px, gradient charte).
 * Affiché à côté du pictogramme `<Logo>` en header desktop, masqué < 640px
 * (media query co-localisée dans `brand.css`, aucun JS requis côté React).
 *
 * Absorbée par `<Logo>` (#878, lot de clôture) — co-localisée dans le même
 * dossier plutôt qu'un dossier `Wordmark/` propre (entrée registre
 * `brand-wordmark`, `reactComponent: "Logo"`, cf. `REACT_COVERED_BY` de
 * `bin/generate-registry.js`).
 *
 * Texte libre par défaut `"design-system"` (calque `shared/nav.js`,
 * `brand.text` configurable côté vanilla) — le consumer surcharge via
 * `children` (ex. `<Wordmark>mikpulse</Wordmark>`, cf. `navigation.html`).
 */
export function Wordmark({
  children = DEFAULT_TEXT,
  className,
  ...rest
}: WordmarkProps): ReactElement {
  const classes = ["brand-wordmark", className].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

Wordmark.displayName = "Wordmark";
