import { ReactNode } from "react";
import { Progress } from "../Progress/Progress";

export type RoadmapMilestoneStatus = "completed" | "in-progress" | "planned";

/**
 * Couleur par défaut de `<Progress fill>` selon le statut — calque les
 * couleurs inline du markup vanilla (`pages/templates.html:55,60,65,73,78,86,91,96,101,104`) :
 * `completed` → `var(--success)`, `in-progress` → `var(--gradient-1)`,
 * `planned` → `var(--text-dim)`. C'est la seule couleur que le DS associe à
 * ces 3 statuts (déjà posée par la démo, pas une politique inventée ici) ;
 * `.roadmap-milestone-dot` n'a besoin d'AUCUN styling correspondant côté
 * React, la couleur du point vient automatiquement de la classe de statut
 * posée sur `.roadmap-milestone` (`templates.css:34-36`).
 */
const STATUS_PROGRESS_FILL: Record<RoadmapMilestoneStatus, string> = {
  completed: "var(--success)",
  "in-progress": "var(--gradient-1)",
  planned: "var(--text-dim)",
};

export interface RoadmapMilestone {
  /** Clé React. */
  id: string;
  /**
   * `.roadmap-milestone.{status}` — pilote aussi la couleur automatique de
   * `.roadmap-milestone-dot` via le CSS (`templates.css:34-36`), sans style
   * additionnel côté wrapper.
   */
  status: RoadmapMilestoneStatus;
  /** `.roadmap-milestone-title` (affiché après le point `.roadmap-milestone-dot`). */
  title: ReactNode;
  /** `.roadmap-milestone-desc`. Omis → pas de description. */
  description?: ReactNode;
  /**
   * Avancement 0-100 — rendu via `<Progress height={6}>` déjà porté
   * (`fill` par défaut dérivé de `status`, cf. `STATUS_PROGRESS_FILL`).
   * Omis → pas de barre (aucune barre n'est un état invalide, contrairement
   * au vanilla qui en pose toujours une à 0 % pour les jalons `planned`).
   */
  progress?: number;
}

export interface RoadmapQuarter {
  /** Clé React. */
  id: string;
  /** `.roadmap-quarter-title`. */
  title: ReactNode;
  milestones: RoadmapMilestone[];
}

export interface RoadmapProps {
  quarters: RoadmapQuarter[];
  className?: string;
}

/**
 * Roadmap — Timeline horizontale par trimestre du Design System msyx.fr
 * (`pages/templates.html` #roadmap, `components/templates.css`).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="roadmap-container">
 *   <div class="roadmap-track">
 *     <div class="roadmap-quarter">
 *       <div class="roadmap-quarter-title">Q1 2026</div>
 *       <div class="roadmap-milestone completed">
 *         <div class="roadmap-milestone-title">
 *           <span class="roadmap-milestone-dot"></span>Infrastructure VPS
 *         </div>
 *         <div class="roadmap-milestone-desc">…</div>
 *         <div class="progress-bar" role="progressbar" …><div class="progress-fill" …></div></div>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **Pure structure, aucun état, aucun JS** (`docs/DS-PRINCIPLES.md` §8.1 —
 * pas d'`initRoadmap` côté vanilla). Composant purement présentationnel,
 * data-driven : le wrapper ne décide ni du sens d'un statut, ni de ce qui
 * fait qu'un jalon appartient à un trimestre — il assemble `quarters`.
 *
 * **Réutilise `<Progress>` déjà porté** pour la barre de chaque jalon
 * (`height={6}`, identique à `style="height:6px;"` du markup réel) plutôt
 * que de réémettre `.progress-bar`/`.progress-fill` à la main.
 *
 * SSR-safe : aucun accès `window`/`document`.
 */
export function Roadmap({ quarters, className }: RoadmapProps) {
  const containerClasses = ["roadmap-container", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses}>
      <div className="roadmap-track">
        {quarters.map((quarter) => (
          <div key={quarter.id} className="roadmap-quarter">
            <div className="roadmap-quarter-title">{quarter.title}</div>
            {quarter.milestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`roadmap-milestone ${milestone.status}`}
              >
                <div className="roadmap-milestone-title">
                  <span className="roadmap-milestone-dot" />
                  {milestone.title}
                </div>
                {milestone.description != null && (
                  <div className="roadmap-milestone-desc">
                    {milestone.description}
                  </div>
                )}
                {milestone.progress != null && (
                  <Progress
                    value={milestone.progress}
                    height={6}
                    fill={STATUS_PROGRESS_FILL[milestone.status]}
                    label={
                      typeof milestone.title === "string"
                        ? milestone.title
                        : undefined
                    }
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Roadmap.displayName = "Roadmap";
