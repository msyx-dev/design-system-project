import { forwardRef, HTMLAttributes, ReactNode } from "react";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Pictogramme rendu dans `.empty-state-icon` — icône SVG ou emoji
   * (`pages/feedback.html` #empty-states montre les deux cas).
   */
  icon?: ReactNode;
  /** Titre `<h3>` (markup réel : titre en texte simple, sans classe dédiée). */
  title?: ReactNode;
  /** Description `<p>` sous le titre. */
  description?: ReactNode;
  /**
   * Action, typiquement un `<button class="btn-primary btn-sm">` — passer
   * le composant `Button` du DS ou un bouton natif, non stylé par une classe
   * `.empty-state-*` dédiée.
   */
  action?: ReactNode;
  children?: ReactNode;
}

/**
 * `EmptyState` — Design System msyx.fr (`pages/feedback.html` #empty-states).
 *
 * Émet `.empty-state` + `.empty-state-icon` (wrapper de `icon`). Titre/
 * description/action sont des props structurées (h3/p/action) plutôt qu'une
 * composition par sous-composants : le markup réel n'a que 2 classes dédiées
 * (`.empty-state`, `.empty-state-icon`) — titre et description sont du texte
 * simple sans slot CSS propre, une API composée n'apporterait rien ici
 * (contraste avec `Alert`, dont les 6 slots sont réellement stylés/partagés
 * entre variantes, #872). `children` reste disponible pour du contenu
 * additionnel après l'action.
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    { icon, title, description, action, className, children, ...rest },
    ref,
  ) {
    const classes = ["empty-state", className].filter(Boolean).join(" ");

    return (
      <div ref={ref} className={classes} {...rest}>
        {icon && (
          <div className="empty-state-icon" aria-hidden="true">
            {icon}
          </div>
        )}
        {title && <h3>{title}</h3>}
        {description && <p>{description}</p>}
        {action}
        {children}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";
