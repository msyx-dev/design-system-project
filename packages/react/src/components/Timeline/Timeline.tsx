import { ReactNode } from "react";

export interface TimelineItem {
  /** Clé React et identité de l'item. */
  id: string | number;
  /**
   * `data-type` sur `.timeline-item` — hook de style/analytics libre pour le
   * consumer. AUCUN filtrage interne ne s'y accroche (cf. challenge #852,
   * point 2 : `Timeline` reste entièrement contrôlé).
   */
  type?: string;
  /**
   * Contenu de `.activity-type-icon` (svg `<use>` ou texte). Décoratif — le
   * span reçoit `aria-hidden`. Omis → pas de pastille. Vocabulaire repris
   * d'`ActivityFeed` (challenge #852, point 1), pas réinventé à côté.
   */
  typeIcon?: ReactNode;
  /**
   * Contenu libre de la ligne — le consumer y compose ses propres badges,
   * acteurs et métadonnées. **Aucun `avatar` imposé** (trap nommé par le
   * challenge #852) : une ligne peut porter plusieurs acteurs, ou aucun.
   */
  children: ReactNode;
  /** `.activity-time` — déjà formaté, ex. `"14:32"`. Omis → pas de meta temporelle. */
  time?: string;
  /** `.activity-tag` — libellé optionnel. */
  tag?: string;
  /** Classes additionnelles sur `.timeline-item`. */
  className?: string;
}

export interface TimelineGroupCount {
  /** Libellé affiché dans le badge, ex. `"3 décisions"`. */
  label: string;
  /** Valeur brute — non affichée directement, disponible pour le consumer (tri, tests). */
  count: number;
}

export interface TimelineGroup {
  /** Clé React et identité du groupe (l'événement parent, ex. une Session). */
  id: string | number;
  /** Contenu de `.timeline-group-title` — libre (titre de l'événement). */
  title: ReactNode;
  /** `.timeline-date` — date/heure de l'événement, déjà formatée. */
  date?: ReactNode;
  /**
   * Séparateur affiché AVANT ce groupe (ex. `"AUJOURD'HUI"`, `"HIER"`, une
   * date). Le calcul de la relativité (aujourd'hui/hier/date) reste côté
   * consumer — le composant ne fait qu'afficher ce qui lui est fourni.
   */
  dateSeparator?: ReactNode;
  /** Items du groupe — deux niveaux, pas une liste plate (apport central du portage #852). */
  items: TimelineItem[];
  /**
   * Mode compact — piloté par le consumer, **aucun état interne**. `true` :
   * n'affiche que les `previewCount` premiers items + les `counts` +
   * la bascule « Afficher les N autres ». Le composant ne masque jamais du
   * DOM déjà monté (contrairement au `load-more` d'`ActivityFeed`,
   * disqualifiant identifié par le challenge #852) : en compact, les items
   * au-delà de `previewCount` ne sont tout simplement pas rendus.
   */
  compact?: boolean;
  /** Nombre d'items visibles en mode compact. @default 3 */
  previewCount?: number;
  /** Compteurs par nature affichés en mode compact (rendus en `.activity-tag` dans `.activity-meta`). */
  counts?: TimelineGroupCount[];
  /** Classes additionnelles sur `.timeline-group`. */
  className?: string;
}

export interface TimelineProps {
  /** Groupes du fil (data-driven). */
  groups: TimelineGroup[];
  /**
   * Appelé au clic sur « Afficher les N autres » d'un groupe compact.
   * **Aucune manipulation de DOM interne** : le composant remonte
   * l'intention, c'est au consumer de répercuter le changement (ex. passer
   * `compact: false` ou augmenter `previewCount` au prochain rendu) — cf.
   * challenge #852, point 2 : « Le composant reçoit ce qu'il doit afficher
   * et remonte les intentions ; c'est l'application qui décide. »
   */
  onExpandGroup?: (groupId: string | number, group: TimelineGroup) => void;
  /** Libellé du bouton d'expansion. @default (hidden) => `Afficher les ${hidden} autres` */
  expandLabel?: (hiddenCount: number) => string;
  /** `aria-label` de la racine `.timeline` (liste sémantique). */
  ariaLabel?: string;
  /** Classes additionnelles sur `.timeline`. */
  className?: string;
}

const DEFAULT_PREVIEW_COUNT = 3;

function defaultExpandLabel(hiddenCount: number): string {
  return `Afficher les ${hiddenCount} autres`;
}

/**
 * Timeline — Fil vertical à deux niveaux du Design System msyx.fr
 * (`divers.html` #timeline, `components/lists.css:34-42` pour le fil plat
 * hérité + bloc « regroupement à deux niveaux » ajouté par ce portage).
 *
 * Émet le markup :
 * ```html
 * <ol class="timeline">
 *   <li class="timeline-group">
 *     <div class="timeline-date-separator"><span>Aujourd'hui</span></div>
 *     <span class="timeline-dot"></span>
 *     <div class="timeline-group-header">
 *       <span class="timeline-group-title">Comité de pilotage</span>
 *       <span class="timeline-date">14:32</span>
 *     </div>
 *     <div class="activity-meta">
 *       <span class="activity-tag">3 décisions</span>
 *       <span class="activity-tag">2 actions</span>
 *     </div>
 *     <ol class="timeline-group-items">
 *       <li class="timeline-item">
 *         <span class="timeline-dot"></span>
 *         <div class="timeline-content">
 *           <span class="activity-type-icon" aria-hidden="true">D</span>
 *           <div>Décision : <span class="activity-target">migrer vers Postgres</span></div>
 *           <div class="activity-meta">
 *             <span class="activity-time">14:35</span>
 *             <span class="activity-tag">décision</span>
 *           </div>
 *         </div>
 *       </li>
 *     </ol>
 *     <div class="activity-load-more">
 *       <button class="btn-secondary btn-sm">Afficher les 4 autres</button>
 *     </div>
 *   </li>
 * </ol>
 * ```
 *
 * **Conception issue du challenge #852** (trois points non négociables) :
 * 1. **Vocabulaire de rendu repris d'`ActivityFeed`** — `.activity-type-icon`,
 *    `.activity-meta`, `.activity-time`, `.activity-tag` sont réutilisées
 *    telles quelles pour les items (déjà des classes de premier niveau dans
 *    `lists.css`, aucune extraction de primitive n'a été nécessaire). Le
 *    bouton « Afficher les N autres » réutilise `.activity-load-more` +
 *    `btn-secondary btn-sm`, à l'identique du load-more d'`ActivityFeed`.
 * 2. **Entièrement contrôlé** — aucun état de filtre, aucun état d'expansion
 *    interne. Le mode `compact` d'un groupe et son `previewCount` sont des
 *    props ; le clic sur « Afficher les N autres » ne fait QUE remonter
 *    `onExpandGroup`, il ne bascule rien lui-même. Les items au-delà de
 *    `previewCount` ne sont jamais montés dans le DOM en mode compact (à la
 *    différence du `load-more` d'`ActivityFeed`, qui masque en CSS des
 *    items déjà chargés — le trait précis qui le disqualifiait comme socle).
 * 3. **Deux niveaux** — `groups[].items[]` : un en-tête d'événement
 *    (`.timeline-group-header`) porte N items (`.timeline-group-items`),
 *    chacun avec son propre `.timeline-dot` sur un sous-fil vertical dédié.
 *    La liste plate reste possible (un seul groupe, ou plusieurs groupes à
 *    un seul item) mais n'est plus la seule forme.
 *
 * **Pas d'`avatar` obligatoire** (trap nommé par le challenge) : `children`
 * est un slot libre — une ligne peut porter plusieurs acteurs ou aucun,
 * contrairement à l'`avatar` obligatoire d'`ActivityFeed`.
 *
 * **Structure de liste sémantique** : `<ol class="timeline">` de
 * `<li class="timeline-group">`, chacun contenant une `<ol
 * class="timeline-group-items">` de `<li class="timeline-item">` — arbre DOM
 * natif, aucun `role` custom nécessaire, navigable au clavier via les
 * contrôles interactifs qu'y place le consumer (`children`) et le bouton
 * « Afficher les N autres ».
 *
 * SSR-safe : aucun accès `window`/`document`, aucun état React (composant
 * pur, entièrement dérivé des props).
 */
export function Timeline({
  groups,
  onExpandGroup,
  expandLabel = defaultExpandLabel,
  ariaLabel,
  className,
}: TimelineProps) {
  const rootClasses = ["timeline", className].filter(Boolean).join(" ");

  return (
    <ol className={rootClasses} aria-label={ariaLabel}>
      {groups.map((group) => {
        const previewCount = group.previewCount ?? DEFAULT_PREVIEW_COUNT;
        const isCompact = Boolean(group.compact);
        const visibleItems = isCompact
          ? group.items.slice(0, previewCount)
          : group.items;
        const hiddenCount = group.items.length - visibleItems.length;
        const hasCounts = isCompact && group.counts && group.counts.length > 0;

        const groupClasses = ["timeline-group", group.className]
          .filter(Boolean)
          .join(" ");

        return (
          <li key={group.id} className={groupClasses}>
            {group.dateSeparator != null && (
              <div className="timeline-date-separator">
                <span>{group.dateSeparator}</span>
              </div>
            )}
            <span className="timeline-dot" aria-hidden="true" />
            <div className="timeline-group-header">
              <span className="timeline-group-title">{group.title}</span>
              {group.date != null && (
                <span className="timeline-date">{group.date}</span>
              )}
            </div>

            {hasCounts && (
              <div className="activity-meta">
                {group.counts!.map((c) => (
                  <span key={c.label} className="activity-tag">
                    {c.label}
                  </span>
                ))}
              </div>
            )}

            {visibleItems.length > 0 && (
              <ol className="timeline-group-items">
                {visibleItems.map((item) => {
                  const itemClasses = ["timeline-item", item.className]
                    .filter(Boolean)
                    .join(" ");
                  const hasMeta = Boolean(item.time) || Boolean(item.tag);

                  return (
                    <li
                      key={item.id}
                      className={itemClasses}
                      data-type={item.type}
                    >
                      <span className="timeline-dot" aria-hidden="true" />
                      <div className="timeline-content">
                        {item.typeIcon != null && (
                          <span
                            className="activity-type-icon"
                            aria-hidden="true"
                          >
                            {item.typeIcon}
                          </span>
                        )}
                        <div>{item.children}</div>
                        {hasMeta && (
                          <div className="activity-meta">
                            {item.time && (
                              <span className="activity-time">{item.time}</span>
                            )}
                            {item.tag && (
                              <span className="activity-tag">{item.tag}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {hiddenCount > 0 && (
              <div className="activity-load-more">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => onExpandGroup?.(group.id, group)}
                >
                  {expandLabel(hiddenCount)}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

Timeline.displayName = "Timeline";
