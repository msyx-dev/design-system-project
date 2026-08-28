import { HTMLAttributes, MouseEvent, ReactNode } from "react";

export interface BreadcrumbItemData {
  /** Clé React et identité de l'item. */
  id: string | number;
  /**
   * Libellé affiché. Utilisé aussi comme `aria-label` par défaut quand
   * `icon` est fourni et que le libellé n'est pas rendu (item icône seule,
   * ex. `.bc-home`).
   */
  label: ReactNode;
  /**
   * `href` du lien. Omis → l'item est rendu comme du texte non-navigable
   * (`<span>`), ou comme la page courante (`aria-current="page"`) si c'est
   * le DERNIER item de `items` — markup réel de toutes les démos
   * `navigation.html` #breadcrumbs (le dernier item n'a jamais de `href`).
   */
  href?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Icône décorative remplaçant le libellé texte — émet `.bc-home`
   * (`navigation.html:376`, démo « Avec icône home »). `label` sert alors
   * d'`aria-label` sur le lien icône-seule.
   */
  icon?: ReactNode;
}

export interface BreadcrumbProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  items: BreadcrumbItemData[];
  /**
   * Contenu de chaque `.bc-sep` entre deux items. @default "/"
   * (`navigation.html` démo « Simple » — la démo « chevron SVG » passe un
   * SVG à la place).
   */
  separator?: ReactNode;
  /**
   * Ajoute `.bc-responsive` : sur mobile (`<=640px`), seuls le 1er item, le
   * dernier, et une ellipsis restent visibles (`navigation.css:43-47`,
   * `@media (max-width: 640px)`). @default false
   */
  responsive?: boolean;
}

/**
 * `Breadcrumb` — Design System msyx.fr (`pages/navigation.html` #breadcrumbs).
 *
 * Émet `.breadcrumbs(.bc-responsive) > ol > li > (.bc-sep + .bc-home|a|span)`.
 *
 * **Contrat ARIA — déjà posé par le vanilla, reproduit à l'identique** (DoD
 * #873 : « si le vanilla ne les pose pas, pose-les côté React ») : les
 * quatre démos de `navigation.html` portent toutes `<nav aria-label="Fil
 * d'Ariane">` et `aria-current="page"` sur le dernier item, et chaque
 * `.bc-sep` a `aria-hidden="true"`. Aucun gap constaté → aucun ajout
 * inventé, ce composant se contente de reproduire ce contrat.
 *
 * **Structure `<li>` unifiée** (divergence documentée) : les démos
 * « Simple »/« icône home »/« chevron SVG » de `navigation.html` isolent
 * chaque séparateur dans son propre `<li>` (`<li><a>…</a></li><li><span
 * class="bc-sep">/</span></li>`), tandis que la démo « Responsive » regroupe
 * séparateur + contenu dans le MÊME `<li>` (`<li><span class="bc-sep">/
 * </span><a>…</a></li>`) — nécessaire pour que `li:first-child`/
 * `li:last-child` (`navigation.css:45-46`) ciblent le 1er ET le dernier
 * item complet (séparateur inclus) en mode `bc-responsive`. Ce composant
 * adopte TOUJOURS la structure groupée (celle de la démo responsive) : elle
 * est CSS-neutre pour les 3 autres démos (vérifié — `.breadcrumbs li` ne
 * dépend pas du nombre d'enfants) et évite qu'activer `responsive`
 * dynamiquement change la structure du DOM.
 *
 * **Composant contrôlé/statique** : aucun état interne, `items` piloté par
 * le parent.
 */
export function Breadcrumb({
  items,
  separator = "/",
  responsive = false,
  className,
  "aria-label": ariaLabel,
  ...rest
}: BreadcrumbProps) {
  const classes = ["breadcrumbs", responsive && "bc-responsive", className]
    .filter(Boolean)
    .join(" ");

  const listItems: ReactNode[] = items.map((item, idx) => {
    const isLast = idx === items.length - 1;
    const sep = idx > 0 && (
      <span className="bc-sep" aria-hidden="true">
        {separator}
      </span>
    );

    let content: ReactNode;
    if (item.icon) {
      content = item.href ? (
        <a
          href={item.href}
          className="bc-home"
          aria-label={typeof item.label === "string" ? item.label : undefined}
          onClick={item.onClick}
        >
          {item.icon}
        </a>
      ) : (
        <span
          className="bc-home"
          aria-label={typeof item.label === "string" ? item.label : undefined}
        >
          {item.icon}
        </span>
      );
    } else if (isLast) {
      content = <span aria-current="page">{item.label}</span>;
    } else if (item.href) {
      content = (
        <a href={item.href} onClick={item.onClick}>
          {item.label}
        </a>
      );
    } else {
      content = <span>{item.label}</span>;
    }

    return (
      <li key={item.id}>
        {sep}
        {content}
      </li>
    );
  });

  // Ellipsis insérée juste après le 1er item (markup réel `navigation.html:420`
  // — `<li>Accueil</li><li class="bc-ellipsis">…</li><li>…reste…</li>`), pas
  // en fin de liste : sur mobile seuls 1er/dernier/ellipsis restent visibles,
  // l'ordre de lecture doit rester « premier … dernier ».
  if (responsive && items.length > 1) {
    listItems.splice(
      1,
      0,
      <li key="bc-ellipsis" className="bc-ellipsis" aria-hidden="true">
        <span className="bc-sep">{separator}</span>
        <span>…</span>
      </li>,
    );
  }

  return (
    <nav className={classes} aria-label={ariaLabel ?? "Fil d'Ariane"} {...rest}>
      <ol>{listItems}</ol>
    </nav>
  );
}
Breadcrumb.displayName = "Breadcrumb";
