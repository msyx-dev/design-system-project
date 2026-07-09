import { ReactNode, useState } from "react";

export interface ActivityFeedItem {
  /** Clé React et identité de l'item. */
  id: string | number;
  /** `data-type` — sert au filtrage (matché contre le `value` du chip). */
  type: string;
  /** Initiales affichées dans `.activity-avatar`. */
  avatar: string;
  /**
   * Fond inline de l'avatar, ex. `"var(--gradient-2)"`. Optionnel → l'avatar
   * retombe sur le défaut CSS `--gradient-1` (`lists.css:160`). Trap
   * FileUpload `.progress-fill` : sans cette prop, tous les avatars
   * perdraient la variété de gradient.
   */
  avatarBackground?: string;
  /**
   * Contenu de `.activity-type-icon` (svg `<use>` ou texte, ex. `"+"`).
   * Décoratif — le span reçoit `aria-hidden`. Omis → pas de pastille.
   */
  typeIcon?: ReactNode;
  /**
   * Contenu de `.activity-text` (accepte `<strong>` +
   * `<span className="activity-target">` pour rester DS-compliant).
   */
  text: ReactNode;
  /** `.activity-time` — déjà formaté, ex. `"il y a 3 min"`. */
  time: string;
  /**
   * `.activity-tag` — libellé d'affichage, DISTINCT de `type`
   * (ex. `type="create"` → `tag="creation"`). Omis → pas de tag.
   */
  tag?: string;
  /** Item du 2e lot, masqué jusqu'au clic sur « Charger plus ». */
  initiallyHidden?: boolean;
}

export interface ActivityFilterChip {
  /** Valeur comparée à `item.type` (et posée en `data-filter`). */
  value: string;
  /** Libellé affiché sur le chip. */
  label: string;
}

export interface ActivityFeedProps {
  /** Items du flux (data-driven). */
  items: ActivityFeedItem[];
  /**
   * Barre de chips de filtre. Omise → pas de `.activity-filters`.
   * Convention : premier `value="all"` (aucun masquage).
   */
  filters?: ActivityFilterChip[];
  /** Filtre actif initial (non contrôlé). @default `"all"` */
  defaultFilter?: string;
  /**
   * Libellé du bouton « Charger plus ». @default `"Charger plus"`.
   * Le bloc `.activity-load-more` n'est rendu que s'il existe au moins un
   * item `initiallyHidden` non encore révélé.
   */
  loadMoreLabel?: string;
  /** Classes additionnelles sur `.activity-feed`. */
  className?: string;
}

const ALL_FILTER = "all";

/**
 * ActivityFeed — Flux d'activité du Design System msyx.fr
 * (`data.html` #activity-feed, calque `initActivityFeed`,
 * `shared/components.js:3505-3543`).
 *
 * Émet le markup canonique `.activity-feed` (`components/lists.css:105-214`) :
 * ```html
 * <div class="activity-feed">
 *   <div class="activity-filters">
 *     <button class="activity-filter-chip active" data-filter="all">Tous</button>
 *     <button class="activity-filter-chip" data-filter="create">Créations</button>
 *   </div>
 *   <div class="activity-item" data-type="deploy">
 *     <div class="activity-avatar-wrap">
 *       <div class="activity-avatar" style="background:var(--gradient-2)">MS</div>
 *       <span class="activity-type-icon" aria-hidden="true">…</span>
 *     </div>
 *     <div class="activity-body">
 *       <div class="activity-text"><strong>Mickael</strong> a déployé
 *         <span class="activity-target">design-system v2.17</span></div>
 *       <div class="activity-meta">
 *         <span class="activity-time">il y a 3 min</span>
 *         <span class="activity-tag">deploy</span>
 *       </div>
 *     </div>
 *   </div>
 *   <div class="activity-load-more">
 *     <button class="btn-secondary btn-sm activity-load-more-btn">Charger plus</button>
 *   </div>
 * </div>
 * ```
 *
 * **Non contrôlé** (comme le vanilla qui manipule son propre DOM) : deux états
 * internes légers — `activeFilter` (défaut `"all"`) et `revealed` (load-more).
 * La donnée métier reste pilotée par la prop `items`.
 *
 * **État critique — `.activity-filter-chip.active`** : un seul chip actif à la
 * fois (`lists.css:131`, fond accent 10 %). Le clic déplace `.active` +
 * `aria-pressed`. **`.activity-item.hidden`** (`lists.css:145` `display:none`)
 * est le mécanisme réel du filtrage : posé quand `item.type` ≠ filtre courant
 * (sauf filtre `"all"` qui démasque tout).
 *
 * **Décision `.initially-hidden` (option A — load-more fonctionnel)** : dans le
 * vanilla la classe `.initially-hidden` n'a AUCUN backing CSS (bug latent) →
 * les items du 2e lot sont visibles d'emblée et « Charger plus » est cosmétique.
 * Ce port RÉPARE le comportement (trap FileUpload `.progress-fill`) : les items
 * `initiallyHidden` non révélés reçoivent la classe `.initially-hidden` ET un
 * `display:none` inline (le CSS ne le fournit pas). Le clic sur « Charger plus »
 * révèle les items (retrait de la classe + de l'inline) et démonte le bloc
 * `.activity-load-more`. Fix CSS vanilla à traiter en issue séparée.
 *
 * SSR-safe : aucun accès `window`/`document` (état pur + handlers).
 */
export function ActivityFeed({
  items,
  filters,
  defaultFilter = ALL_FILTER,
  loadMoreLabel = "Charger plus",
  className,
}: ActivityFeedProps) {
  const [activeFilter, setActiveFilter] = useState(defaultFilter);
  const [revealed, setRevealed] = useState(false);

  const hasFilters = Array.isArray(filters) && filters.length > 0;
  const hasHiddenItems = items.some((item) => item.initiallyHidden);
  const showLoadMore = hasHiddenItems && !revealed;

  const feedClasses = ["activity-feed", className].filter(Boolean).join(" ");

  return (
    <div className={feedClasses}>
      {hasFilters && (
        <div className="activity-filters">
          {filters!.map((chip) => {
            const isActive = chip.value === activeFilter;
            return (
              <button
                key={chip.value}
                type="button"
                className={
                  isActive
                    ? "activity-filter-chip active"
                    : "activity-filter-chip"
                }
                data-filter={chip.value}
                aria-pressed={isActive}
                onClick={() => setActiveFilter(chip.value)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {items.map((item) => {
        const notRevealed = Boolean(item.initiallyHidden) && !revealed;
        const filteredOut =
          activeFilter !== ALL_FILTER && item.type !== activeFilter;

        const itemClasses = [
          "activity-item",
          notRevealed ? "initially-hidden" : null,
          filteredOut ? "hidden" : null,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={item.id}
            className={itemClasses}
            data-type={item.type}
            style={notRevealed ? { display: "none" } : undefined}
          >
            <div className="activity-avatar-wrap">
              <div
                className="activity-avatar"
                style={
                  item.avatarBackground
                    ? { background: item.avatarBackground }
                    : undefined
                }
              >
                {item.avatar}
              </div>
              {item.typeIcon != null && (
                <span className="activity-type-icon" aria-hidden="true">
                  {item.typeIcon}
                </span>
              )}
            </div>
            <div className="activity-body">
              <div className="activity-text">{item.text}</div>
              <div className="activity-meta">
                <span className="activity-time">{item.time}</span>
                {item.tag && <span className="activity-tag">{item.tag}</span>}
              </div>
            </div>
          </div>
        );
      })}

      {showLoadMore && (
        <div className="activity-load-more">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setRevealed(true)}
          >
            {loadMoreLabel}
          </button>
        </div>
      )}
    </div>
  );
}

ActivityFeed.displayName = "ActivityFeed";
