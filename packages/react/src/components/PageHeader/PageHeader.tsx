import { type ReactNode } from "react";

export type PageHeaderHeadingLevel = "h1" | "h2" | "h3";

export interface PageHeaderProps {
  /** Titre principal — requis */
  title: string;
  /** Label overline au-dessus du titre — optionnel */
  overline?: string;
  /** Texte descriptif sous le titre — optionnel */
  lead?: string;
  /** Slot ReactNode pour les boutons d'actions à droite — optionnel */
  actions?: ReactNode;
  /**
   * Slot ReactNode pour le fil d'Ariane au-dessus — optionnel.
   *
   * Attend un `<Breadcrumb>` : c'est lui qui porte le landmark
   * `<nav aria-label="Fil d'Ariane">`. `PageHeader` n'en ajoute aucun (son
   * conteneur `.section-header-breadcrumb` est un `<div>` de mise en forme) ;
   * passer ici un `<a>` ou une liste nue ne produit donc PAS de landmark
   * `navigation` — enveloppez-les dans votre propre `<nav aria-label>`.
   */
  breadcrumb?: ReactNode;
  /** Niveau de heading du titre — défaut : "h1" */
  as?: PageHeaderHeadingLevel;
  /** Classe CSS additionnelle sur l'élément racine — optionnel */
  className?: string;
}

export function PageHeader({
  title,
  overline,
  lead,
  actions,
  breadcrumb,
  as: Heading = "h1",
  className,
}: PageHeaderProps) {
  const rootClasses = ["section-header", className].filter(Boolean).join(" ");

  return (
    <section className={rootClasses}>
      {breadcrumb != null && (
        // <div>, pas <nav> : le landmark appartient au <Breadcrumb> du slot.
        // Un <nav> ici imbriquerait deux landmarks « navigation » (#937).
        <div className="section-header-breadcrumb">{breadcrumb}</div>
      )}
      <div className="section-header-row">
        <div className="section-header-text">
          {overline != null && <span className="overline">{overline}</span>}
          <Heading>{title}</Heading>
          {lead != null && <p className="lead">{lead}</p>}
        </div>
        {actions != null && (
          <div className="section-header-actions">{actions}</div>
        )}
      </div>
    </section>
  );
}

PageHeader.displayName = "PageHeader";
