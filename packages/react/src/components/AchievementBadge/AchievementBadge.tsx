import { HTMLAttributes, ReactNode } from "react";

/** Niveaux réellement stylés (`shared/css/components/badges.css:114-116`). */
export type AchievementLevel = "bronze" | "silver" | "gold";

export interface AchievementBadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** `.achievement--{level}` — couleur de bordure du niveau. */
  level: AchievementLevel;
  /** `.achievement-icon` — pictogramme (emoji dans les démos réelles). `aria-hidden="true"` par défaut (décoratif, accompagné du titre). */
  icon: ReactNode;
  /** `.achievement-title`. */
  title: ReactNode;
  /**
   * `.achievement-state` — texte d'état (ex. "Débloqué"/"Verrouillé"/
   * "Nouveau !"). Omis → pas de ligne d'état, markup réel de la démo
   * « Niveaux » (`composants.html:812-826`, icône + titre seuls).
   */
  state?: ReactNode;
  /** `.locked` — badge verrouillé (opacité réduite, icône grisée, `badges.css:99-105`). */
  locked?: boolean;
  /** `.new` — glow animé (badge récemment débloqué, `badges.css:106-113`). */
  isNew?: boolean;
}

/**
 * `AchievementBadge` — Design System msyx.fr (`pages/composants.html`
 * #achievements).
 *
 * Émet `.achievement.achievement--{level}(.locked)(.new) > .achievement-icon
 * + .achievement-title + .achievement-state?`.
 */
export function AchievementBadge({
  level,
  icon,
  title,
  state,
  locked,
  isNew,
  className,
  ...rest
}: AchievementBadgeProps) {
  const classes = [
    "achievement",
    `achievement--${level}`,
    locked && "locked",
    isNew && "new",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      <div className="achievement-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="achievement-title">{title}</div>
      {state !== undefined && <div className="achievement-state">{state}</div>}
    </div>
  );
}
AchievementBadge.displayName = "AchievementBadge";

export interface AchievementGridProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** `AchievementGrid` — conteneur `.achievement-grid` (`badges.css:64-67`). */
export function AchievementGrid({
  className,
  children,
  ...rest
}: AchievementGridProps) {
  const classes = ["achievement-grid", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
AchievementGrid.displayName = "AchievementGrid";

export interface AchievementProgressProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** `.achievement-progress-label` — ex. "Progression : 4/6 badges débloqués". */
  label: ReactNode;
  /** Pourcentage 0-100, largeur de `.achievement-progress-fill` (borné). */
  value: number;
  /** `aria-label` du track (posé en plus du label visible, DS-wide precedent — cf. `Progress`). */
  ariaLabel?: string;
}

/**
 * `AchievementProgress` — récapitulatif de progression du grid (émet
 * `.achievement-progress > .achievement-progress-label + .achievement-progress-bar
 * > .achievement-progress-fill`, `composants.html:804-809`). Bloc de synthèse
 * du GRID entier (badges débloqués/total), PAS une progress bar par badge —
 * le seul markup réel (`composants.html`) l'associe au grid, pas à
 * `AchievementBadge`. `role="progressbar"` + `aria-valuenow/min/max`
 * toujours posés (absents du vanilla, même politique déjà retenue pour
 * `Progress`, `progress-bar` non-invented : classes `.achievement-progress*`
 * réelles, uniquement l'ARIA est ajouté).
 */
export function AchievementProgress({
  label,
  value,
  ariaLabel,
  className,
  style,
  ...rest
}: AchievementProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  const classes = ["achievement-progress", className].filter(Boolean).join(" ");

  return (
    <div className={classes} style={style} {...rest}>
      <div className="achievement-progress-label">{label}</div>
      <div
        className="achievement-progress-bar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="achievement-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
AchievementProgress.displayName = "AchievementProgress";
