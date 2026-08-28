import { HTMLAttributes, ReactNode } from "react";

/**
 * Variantes sémantiques réellement stylées (`shared/css/components/badges.css`).
 * Note : l'issue #871 en annonce 7, seules 6 existent dans le CSS du DS
 * (`.badge-primary/-success/-warning/-danger/-info/-neutral`) — vérifié par
 * grep exhaustif, aucune 7e classe `.badge-*` sémantique déclarée nulle part.
 * Divergence documentée dans la PR, pas de 7e variante inventée (§ N'invente
 * aucune classe, CLAUDE.md).
 */
export type BadgeVariant =
  "primary" | "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** @default "primary" */
  variant?: BadgeVariant;
  /**
   * `.badge-nav` — variante compacte pour compteurs sidebar/nav
   * (`margin-left:auto` push-right, `min-width:1.5rem`).
   */
  nav?: boolean;
  /**
   * Ajoute `.pulse-dot` avant le contenu (statut « en ligne » animé,
   * `composants.html` « Badges » : `badge-primary` + `pulse-dot`). Décoratif —
   * rendu `aria-hidden`.
   */
  pulse?: boolean;
  children?: ReactNode;
}

/**
 * `Badge` — Design System msyx.fr (`pages/composants.html` #badges).
 * Émet `.badge .badge-{variant}` (+`.badge-nav` si `nav`, +`.pulse-dot` si `pulse`).
 */
export function Badge({
  variant = "primary",
  nav,
  pulse,
  className,
  children,
  ...rest
}: BadgeProps) {
  const classes = ["badge", `badge-${variant}`, nav && "badge-nav", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {pulse && <span className="pulse-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
Badge.displayName = "Badge";
