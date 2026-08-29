import { ReactNode } from "react";
import { KanbanCardData, KanbanCard, KanbanColumn } from "../Kanban/Kanban";
import { Progress } from "../Progress/Progress";

export interface SprintColumnData {
  /** Clé React. */
  id: string;
  /** `.kanban-column-title`. */
  title: ReactNode;
  cards: KanbanCardData[];
}

export interface SprintStat {
  /** Clé React. */
  id: string;
  /** `.stat-label`. */
  label: ReactNode;
  /** `.stat-value--sm`. */
  value: ReactNode;
  /**
   * Avancement 0-100 — rendu sous la valeur via `<Progress height={4}>`
   * (calque `style="height:4px;width:80px;margin-top:0.3rem;"` du markup
   * réel, `pages/templates.html:143`). Omis → pas de mini barre.
   */
  progress?: number;
}

export interface SprintBoardProps {
  /** `.sprint-header-info h3`. */
  title: ReactNode;
  /** `.sprint-header-info p`. Omis → pas de sous-titre. */
  subtitle?: ReactNode;
  /** `.sprint-stats`. */
  stats: SprintStat[];
  /**
   * Colonnes du tableau — mêmes données que `<KanbanBoard>`, mais rendues
   * SANS drag & drop : `docs/DS-PRINCIPLES.md` §8.1, `<SprintBoard>` est une
   * structure sans `initSprintBoard` côté vanilla (pas d'interactivité
   * dédiée à reproduire ici — `.kanban-card`/`.kanban-column` restent
   * statiques, contrairement à `<KanbanBoard>` qui porte le comportement).
   */
  columns: SprintColumnData[];
  /** Contenu du burndown (`.sprint-burndown`, ex. un SVG). Omis → bloc absent. */
  burndown?: ReactNode;
  /** `.sprint-burndown-title`. @default "Burndown Chart" */
  burndownTitle?: ReactNode;
  className?: string;
}

/**
 * SprintBoard — Vue sprint du Design System msyx.fr (`pages/templates.html`
 * #sprint, `components/templates.css`).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="sprint-header">
 *   <div class="sprint-header-info"><h3>…</h3><p>…</p></div>
 *   <div class="sprint-stats">…</div>
 * </div>
 * <div class="sprint-board">…colonnes…</div>
 * <div class="sprint-burndown">
 *   <div class="sprint-burndown-title">Burndown Chart</div>
 *   …
 * </div>
 * ```
 *
 * **Pure structure, aucun état** (`docs/DS-PRINCIPLES.md` §8.1 — pas
 * d'`initSprintBoard` côté vanilla). **Réutilise `<KanbanColumn>`/
 * `<KanbanCard>`** pour `.sprint-board` (mêmes classes `.kanban-column`/
 * `.kanban-card` que le markup réel, `pages/templates.html:149-164` — le
 * vanilla lie `initComponents` globalement sur ces classes, sans distinction
 * de section) plutôt que de réémettre leur rendu. Contrairement à
 * `<KanbanBoard>`, aucun drag & drop n'est câblé ici : `<SprintBoard>`
 * apporte le typage et la composition, pas le comportement (déjà porté par
 * `<KanbanBoard>` si un consumer en a besoin sur cette vue).
 *
 * **`.sprint-stats` réutilise `<Progress>` déjà porté** pour la mini barre
 * optionnelle d'une statistique (`height={4}`, calque le style inline du
 * markup réel). `.text-center` (utilitaire DS) remplace `style="text-align:center;"`.
 *
 * SSR-safe : aucun accès `window`/`document`.
 */
export function SprintBoard({
  title,
  subtitle,
  stats,
  columns,
  burndown,
  burndownTitle = "Burndown Chart",
  className,
}: SprintBoardProps) {
  const rootClasses = className ? className : undefined;

  return (
    <div className={rootClasses}>
      <div className="sprint-header">
        <div className="sprint-header-info">
          <h3>{title}</h3>
          {subtitle != null && <p>{subtitle}</p>}
        </div>
        <div className="sprint-stats">
          {stats.map((stat) => (
            <div key={stat.id} className="text-center">
              <div className="stat-value stat-value--sm">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              {stat.progress != null && (
                <Progress
                  value={stat.progress}
                  height={4}
                  style={{ width: 80, marginTop: "var(--space-xs)" }}
                  label={typeof stat.label === "string" ? stat.label : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sprint-board">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            title={column.title}
            count={column.cards.length}
          >
            {column.cards.map((card) => (
              <KanbanCard
                key={card.id}
                title={card.title}
                description={card.description}
                footer={card.footer}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>

      {burndown != null && (
        <div className="sprint-burndown">
          <div className="sprint-burndown-title">{burndownTitle}</div>
          {burndown}
        </div>
      )}
    </div>
  );
}

SprintBoard.displayName = "SprintBoard";
