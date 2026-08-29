import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export type LogoMarkSize = "sm" | "md" | "lg";

/** `md` = classe de base seule (`.brand-mark-ds`, 72px) — pas de modificateur dédié. */
const SIZE_CLASS: Partial<Record<LogoMarkSize, string>> = {
  sm: "brand-mark-ds--sm",
  lg: "brand-mark-ds--lg",
};

export interface LogoMarkProps extends HTMLAttributes<HTMLDivElement> {
  /** Taille. @default "md" (`.brand-mark-ds`, 72px — `.brand-mark-ds--sm` 40px / `.brand-mark-ds--lg` 96px) */
  size?: LogoMarkSize;
  /** Contenu textuel. @default "DS" */
  children?: ReactNode;
}

const DEFAULT_TEXT = "DS";
const DEFAULT_ARIA_LABEL = "Design System";

/**
 * `LogoMark` — mark stylisé `.brand-mark-ds` (`fondation.html` #brand-mark-ds,
 * `brand.css` : Space Grotesk 700, gradient charte). Utilisé sur la page
 * login en remplacement du pictogramme msyx (`index.html`).
 *
 * Absorbée par `<Logo>` (#878, lot de clôture) — co-localisée dans le même
 * dossier plutôt qu'un dossier `LogoMark/` propre (entrée registre
 * `brand-mark-ds`, `reactComponent: "Logo"`, cf. `REACT_COVERED_BY` de
 * `bin/generate-registry.js`).
 *
 * `aria-label="Design System"` par défaut (calque `index.html:104`, le
 * texte visible "DS" seul n'est pas un nom accessible suffisant) —
 * surchargeable comme le texte lui-même.
 */
export function LogoMark({
  size = "md",
  children = DEFAULT_TEXT,
  className,
  "aria-label": ariaLabel = DEFAULT_ARIA_LABEL,
  ...rest
}: LogoMarkProps): ReactElement {
  const classes = ["brand-mark-ds", SIZE_CLASS[size], className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} aria-label={ariaLabel} {...rest}>
      {children}
    </div>
  );
}

LogoMark.displayName = "LogoMark";
