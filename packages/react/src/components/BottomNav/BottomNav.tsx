import { ReactNode } from "react";

export interface BottomNavItem {
  /** Identifiant unique — utilisé pour `value`/`onChange` et la clé React. */
  id: string;
  /** Libellé affiché dans `.bottom-nav-label`. */
  label: string;
  /** Icône (SVG inline recommandé, 24×24) rendue dans `.bottom-nav-icon`. */
  icon: ReactNode;
  /**
   * URL de destination — l'item est rendu `<a href>` plutôt que `<button>`.
   * Absent, l'item reste un `<button>` (bascule de vue interne, sans navigation
   * d'URL) — les deux formes existent dans le vanilla (registre vs markup réel,
   * cf. doc du composant).
   */
  href?: string;
  /** Contenu du badge numérique `.bottom-nav-badge` (ex. "3"). Ignoré si `badgeDot`. */
  badge?: ReactNode;
  /** Variante pastille `.bottom-nav-badge--dot` (sans contenu) — prioritaire sur `badge`. */
  badgeDot?: boolean;
}

export interface BottomNavProps {
  /** Items de la barre, dans l'ordre d'affichage. */
  items: BottomNavItem[];
  /** Id de l'item actif — le parent gère l'état, aucun état interne. */
  value: string;
  /** Appelé avec l'id du nouvel item sélectionné. */
  onChange: (id: string) => void;
  /** `aria-label` du `<nav>` racine. @default "Navigation principale" */
  ariaLabel?: string;
  /** Classes additionnelles sur `.bottom-nav`. */
  className?: string;
}

/**
 * BottomNav — Navigation mobile basse du Design System msyx.fr
 * (`navigation.html` #bottom-nav, calque `initBottomNav` —
 * `shared/components.js:1843-1869`).
 *
 * Émet le markup canonique `.bottom-nav` (`components/navigation.css`) :
 * ```html
 * <nav class="bottom-nav" aria-label="Navigation principale">
 *   <button class="bottom-nav-item active" aria-current="page">
 *     <span class="bottom-nav-icon" aria-hidden="true">…</span>
 *     <span class="bottom-nav-label">Accueil</span>
 *   </button>
 *   <button class="bottom-nav-item" style="position:relative">
 *     <span class="bottom-nav-badge">3</span>
 *     <span class="bottom-nav-icon" aria-hidden="true">…</span>
 *     <span class="bottom-nav-label">Messages</span>
 *   </button>
 * </nav>
 * ```
 *
 * **Contrôlé** : le parent pilote `value`/`onChange`, aucun état interne —
 * la sélection est un simple clic (pas de navigation clavier dédiée côté
 * vanilla, `initBottomNav` ne pose ni `role` ni gestion des flèches).
 *
 * **Marquage de l'élément courant — `aria-current="page"`, PAS `aria-selected`
 * (divergence documentée vs le vanilla)** : `initBottomNav` pose
 * `aria-selected` sur l'item actif (`shared/components.js:1853,1857,1860`),
 * mais **aucun `role="tablist"`/`role="tab"` n'est jamais posé** sur
 * `.bottom-nav`/`.bottom-nav-item` (ni dans `initBottomNav`, ni dans les 3
 * démos réelles de `navigation.html`) — hors d'un conteneur
 * `tablist`/`listbox`/`grid`, `aria-selected` n'a aucune sémantique définie
 * (WAI-ARIA). C'est un vrai gap vanilla, pas un choix : l'`example` du
 * registre (`shared/components-registry.json`, entrée `bottom-nav`) documente
 * d'ailleurs déjà `aria-current="page"` sur l'item actif — le contrat visé,
 * jamais câblé côté JS. Le wrapper applique ce contrat déjà documenté plutôt
 * que de reproduire un attribut ARIA invalide dans son contexte.
 *
 * **`<button>` par défaut, `<a href>` si fourni** : les 3 démos réelles de
 * `navigation.html` utilisent `<button>` (bascule de vue, pas de changement
 * d'URL) ; l'`example` du registre utilise `<a href>`. Les deux formes sont
 * légitimes selon l'usage — `href` bascule la balise.
 *
 * SSR-safe : aucun accès à `document`/`window`, tout est piloté par les props.
 */
export function BottomNav({
  items,
  value,
  onChange,
  ariaLabel = "Navigation principale",
  className,
}: BottomNavProps) {
  const classes = ["bottom-nav", className].filter(Boolean).join(" ");

  return (
    <nav className={classes} aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.id === value;
        const itemClasses = ["bottom-nav-item", isActive ? "active" : null]
          .filter(Boolean)
          .join(" ");
        const content = (
          <>
            {item.badgeDot ? (
              <span className="bottom-nav-badge bottom-nav-badge--dot" />
            ) : item.badge != null ? (
              <span className="bottom-nav-badge">{item.badge}</span>
            ) : null}
            <span className="bottom-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </>
        );

        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              className={itemClasses}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onChange(item.id);
              }}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            className={itemClasses}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(item.id)}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}

BottomNav.displayName = "BottomNav";
