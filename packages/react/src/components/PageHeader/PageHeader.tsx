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
  /** Slot ReactNode pour le breadcrumb au-dessus — optionnel */
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
        <nav className="section-header-breadcrumb" aria-label="Fil d'ariane">
          {breadcrumb}
        </nav>
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
