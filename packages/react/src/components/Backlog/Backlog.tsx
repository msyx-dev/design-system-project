import { ReactNode, useState } from "react";

export type BacklogPriority = "high" | "medium" | "low";

export interface BacklogItemData {
  /** Clé React et identité de l'item — sert aussi de `data-priority` pour le filtrage. */
  id: string;
  /**
   * `.backlog-priority.{priority}` — les 3 seules valeurs stylées
   * (`components/templates.css:57-59`). Ne porte aucune politique de
   * priorisation : c'est la même contrainte de variante fermée que
   * `Badge.variant`, dictée par le CSS du DS, pas une règle de gestion.
   */
  priority: BacklogPriority;
  /** `.backlog-title`. */
  title: ReactNode;
  /** `.backlog-desc`. Omis → pas de description. */
  description?: ReactNode;
  /**
   * Contenu libre affiché après `.backlog-content` (tag/points/avatar dans
   * le markup vanilla) — composez `<Chip>`/`<Badge>`/`<Avatar>` déjà portés.
   */
  meta?: ReactNode;
}

export interface BacklogFilterOption {
  /** Comparé à `item.priority` (et posé en `data-filter`). */
  value: string;
  label: ReactNode;
}

export interface BacklogProps {
  items: BacklogItemData[];
  /**
   * Barre de filtres (`.backlog-filters .btn-filter`). Omise → pas de barre,
   * tous les items affichés. Convention : premier `value="all"` (aucun
   * masquage), comme `<ActivityFeed filters>` (#657).
   */
  filters?: BacklogFilterOption[];
  /** Filtre actif initial (non contrôlé, comme `<ActivityFeed>`). @default "all" */
  defaultFilter?: string;
  /** Classes additionnelles sur la racine. */
  className?: string;
}

const ALL_FILTER = "all";

/**
 * Backlog — Liste de tâches filtrable du Design System msyx.fr
 * (`pages/templates.html` #backlog, calque le bloc « Backlog filters »
 * d'`initComponents` — `shared/components.js:344-354`).
 *
 * Émet le markup canonique (`components/templates.css`) :
 * ```html
 * <div class="backlog-filters">
 *   <button class="btn-filter active" data-filter="all">Tous</button>
 *   <button class="btn-filter" data-filter="high">Haute</button>
 * </div>
 * <div class="backlog-item[ hidden]" data-priority="high">
 *   <div class="backlog-priority high"></div>
 *   <div class="backlog-content">
 *     <div class="backlog-title">…</div>
 *     <div class="backlog-desc">…</div>
 *   </div>
 *   …meta…
 * </div>
 * ```
 *
 * **Non contrôlé** (comme le vanilla qui manipule son propre DOM, et comme
 * `<ActivityFeed>`) : un seul état interne léger, `activeFilter` (défaut
 * `"all"`). La donnée reste pilotée par la prop `items`. **`.backlog-item.hidden`**
 * (`templates.css:60`, `display:none`) est le mécanisme réel du filtrage :
 * posé quand `item.priority` ≠ filtre courant (sauf filtre `"all"`).
 *
 * `.backlog-list` du markup vanilla n'a **aucune règle CSS** (grep exhaustif
 * `shared/css/**`) et n'est ciblée par aucun hook JS — non reproduite (§
 * « n'invente aucune classe », seules `REACT_CSS_UNDETECTABLE`/
 * `REACT_JS_HOOK_CLASSES` couvrent les classes sans règle directe, celle-ci
 * ne remplit ni l'un ni l'autre critère).
 *
 * `aria-pressed` ajouté sur les boutons de filtre — état déjà visible
 * (`.active`), juste rendu accessible (même ajout que `<ActivityFeed>`,
 * absent du vanilla qui ne pose aucun ARIA sur `.btn-filter`).
 *
 * **Composition** : `meta` (tag/points/avatar) est fourni par le parent —
 * composez `<Chip>`/`<Badge>`/`<Avatar>` déjà portés. Le composant ignore
 * tout de ce que représente une priorité au-delà de son rendu visuel.
 *
 * SSR-safe : aucun accès `window`/`document`.
 */
export function Backlog({
  items,
  filters,
  defaultFilter = ALL_FILTER,
  className,
}: BacklogProps) {
  const [activeFilter, setActiveFilter] = useState(defaultFilter);

  const hasFilters = Array.isArray(filters) && filters.length > 0;
  const rootClasses = className ? className : undefined;

  return (
    <div className={rootClasses}>
      {hasFilters && (
        <div className="backlog-filters">
          {filters!.map((filter) => {
            const isActive = filter.value === activeFilter;
            return (
              <button
                key={filter.value}
                type="button"
                className={isActive ? "btn-filter active" : "btn-filter"}
                data-filter={filter.value}
                aria-pressed={isActive}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {items.map((item) => {
        const filteredOut =
          activeFilter !== ALL_FILTER && item.priority !== activeFilter;

        return (
          <div
            key={item.id}
            className={filteredOut ? "backlog-item hidden" : "backlog-item"}
            data-priority={item.priority}
          >
            <div className={`backlog-priority ${item.priority}`} />
            <div className="backlog-content">
              <div className="backlog-title">{item.title}</div>
              {item.description != null && (
                <div className="backlog-desc">{item.description}</div>
              )}
            </div>
            {item.meta}
          </div>
        );
      })}
    </div>
  );
}

Backlog.displayName = "Backlog";
