import { CSSProperties, HTMLAttributes, useId } from "react";

/** Borne un nombre dans [min, max]. */
function clampNum(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Pourcentage borné 0-100 depuis value/max (garde-fou max <= 0). */
function toPercent(value: number, max: number): number {
  const safeMax = max > 0 ? max : 100;
  return clampNum((value / safeMax) * 100, 0, 100);
}

/** Normalise une longueur CSS : number -> `${n}px`, string -> telle quelle. */
function toCssLength(v: string | number): string {
  return typeof v === "number" ? `${v}px` : v;
}

export interface ProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Valeur courante (piloté par le parent, aucun état interne). */
  value: number;
  /** Borne haute. @default 100 */
  max?: number;
  /**
   * Fond CSS inline de `.progress-fill`. Le DS ne pose AUCUN fond en CSS
   * (`data.css:6`) : sans cet inline la barre est INVISIBLE (trap capitalisé
   * FileUpload). @default "var(--gradient-1)"
   */
  fill?: string;
  /**
   * Rayures animées : pose `.progress-bar-striped` sur le BAR (parent), JAMAIS
   * sur `.progress-fill` — le sélecteur CSS est `.progress-bar-striped
   * .progress-fill` (`data.css:7`). @default false
   */
  striped?: boolean;
  /** Override inline de la hauteur du track (défaut CSS 8px ; templates.html=6px). */
  height?: string | number;
  /** Nom accessible — posé en `aria-label` sur le `role="progressbar"`. */
  label?: string;
  /** Classes additionnelles sur `.progress-bar`. */
  className?: string;
}

/**
 * Progress — Barre de progression linéaire du Design System msyx.fr
 * (`data.html` #progress, `components/data.css:5-7`).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="progress-bar" role="progressbar"
 *      aria-valuenow="92" aria-valuemin="0" aria-valuemax="100">
 *   <div class="progress-fill" style="width:92%;background:var(--gradient-1)"></div>
 * </div>
 * ```
 *
 * **Présentationnel / contrôlé** : `value` piloté par le parent, aucun état
 * interne.
 *
 * **Deux styles inline OBLIGATOIRES sur `.progress-fill`** — le CSS n'en pose
 * AUCUN (`data.css:6` = `height:100%` + transition seulement) :
 * 1. `width: N%` — sans lui un `.progress-fill` nu occupe 100 % du parent
 *    (barre pleine trompeuse). Ici `clamp(value/max*100, 0, 100)`.
 * 2. `background` — sans lui la barre est **invisible** (échec silencieux).
 *    Défaut DS `var(--gradient-1)` (identique au hand-roll `FileUpload`).
 *
 * **A11y** : `role="progressbar"` + `aria-valuenow/min/max` sont TOUJOURS posés
 * (absents de 100 % des usages vanilla — gap systémique corrigé au port).
 * `aria-valuenow` est borné à `[0, max]`.
 *
 * **Rayures** : `striped` pose `.progress-bar-striped` sur le conteneur BAR
 * (piège de placement — jamais sur le fill).
 *
 * SSR-safe : aucun accès `window`/`document`.
 */
export function Progress({
  value,
  max = 100,
  fill = "var(--gradient-1)",
  striped = false,
  height,
  label,
  className,
  style,
  ...rest
}: ProgressProps) {
  const pct = toPercent(value, max);
  const ariaNow = clampNum(value, 0, max > 0 ? max : 100);

  const barClasses = [
    "progress-bar",
    striped ? "progress-bar-striped" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const barStyle: CSSProperties | undefined =
    height != null ? { ...style, height: toCssLength(height) } : style;

  const fillStyle: CSSProperties = {
    width: `${pct}%`,
    background: fill,
  };

  return (
    <div
      {...rest}
      className={barClasses}
      role="progressbar"
      aria-valuenow={ariaNow}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      style={barStyle}
    >
      <div className="progress-fill" style={fillStyle} />
    </div>
  );
}

Progress.displayName = "Progress";

export interface ProgressRingProps {
  /** Valeur courante (piloté par le parent, aucun état interne). */
  value: number;
  /** Borne haute. @default 100 */
  max?: number;
  /** Diamètre du SVG en px. @default 80 */
  size?: number;
  /** Épaisseur du trait. @default 4 */
  strokeWidth?: number;
  /**
   * Couleur du trait de progression (`.fill`), posée inline pour battre le
   * défaut CSS `var(--accent)`. Omis → `var(--accent)`.
   */
  color?: string;
  /** Nom accessible REQUIS — rendu en `<title>` + lié via `aria-labelledby`. */
  label: string;
  /** Affiche le badge `.value` centré. @default true */
  showValue?: boolean;
  /** Classes additionnelles sur `.progress-ring`. */
  className?: string;
}

/**
 * ProgressRing — Indicateur de progression circulaire du Design System msyx.fr
 * (`data.html` #progress, `components/data.css:9-14`).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="progress-ring">
 *   <svg width="80" height="80" role="img" aria-labelledby="...">
 *     <title id="...">Build — 92%</title>
 *     <circle class="bg" cx="40" cy="40" r="34" />
 *     <circle class="fill" cx="40" cy="40" r="34"
 *             stroke-dasharray="213.6" stroke-dashoffset="17" />
 *   </svg>
 *   <span class="value">92%</span>
 * </div>
 * ```
 *
 * **Géométrie dérivée** (jamais hardcodée — casserait sur `size` custom) :
 * `cx = cy = size/2`, `r = size/2 - strokeWidth - 2`, circonférence
 * `C = 2πr`, `stroke-dashoffset = C·(1 - clamp(value/max))`. Pour la géométrie
 * par défaut (size 80, strokeWidth 4) on retrouve exactement le vanilla :
 * `r = 34`, `C ≈ 213.6`, offset ≈ 17 à 92 %.
 *
 * `stroke-width` est posé inline (le CSS `.progress-ring circle` force 4 et
 * gagnerait sur un attribut de présentation — le prop `strokeWidth` serait
 * silencieusement ignoré).
 *
 * SSR-safe : aucun accès `window`/`document`.
 */
export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 4,
  color,
  label,
  showValue = true,
  className,
}: ProgressRingProps) {
  const titleId = useId();
  const safeMax = max > 0 ? max : 100;
  const ratio = clampNum(value / safeMax, 0, 1);
  const pct = Math.round(ratio * 100);
  const center = size / 2;
  const radius = center - strokeWidth - 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  const ringClasses = ["progress-ring", className].filter(Boolean).join(" ");

  const fillStyle: CSSProperties = { strokeWidth };
  if (color) fillStyle.stroke = color;

  return (
    <div className={ringClasses}>
      <svg width={size} height={size} role="img" aria-labelledby={titleId}>
        <title id={titleId}>{label}</title>
        <circle
          className="bg"
          cx={center}
          cy={center}
          r={radius}
          style={{ strokeWidth }}
        />
        <circle
          className="fill"
          cx={center}
          cy={center}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={fillStyle}
        />
      </svg>
      {showValue && <span className="value">{pct}%</span>}
    </div>
  );
}

ProgressRing.displayName = "ProgressRing";
