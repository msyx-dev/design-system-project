import { CSSProperties, useEffect, useState } from "react";

export interface GaugeProps {
  /** Valeur courante. */
  value: number;
  /** Valeur max. @default 100 */
  max?: number;
  /**
   * Seuils `[low, high]` en % : `<= low` → danger, `<= high` → warning, sinon
   * success. Absent → accent (défaut CSS `var(--accent)`, aucun stroke inline).
   */
  thresholds?: [number, number];
  /** Libellé sous la jauge (`.gauge-label`). Optionnel. */
  label?: string;
  /**
   * Texte central (`.gauge-value`).
   * @default `${Math.round(clamp(value / max) * 100)}%`
   * Le vanilla l'authore en dur dans le markup ; ici on le dérive de
   * `value`/`max`. Override pour un texte ≠ pourcentage.
   */
  valueText?: string;
  /** Variante compacte → `.gauge--mini` (svg 90px). @default false */
  mini?: boolean;
  /** `aria-label` du conteneur `role="img"` — REQUIS (SVG interne aria-hidden). */
  ariaLabel: string;
  /** `<title>` SVG (tooltip natif). @default = `ariaLabel` */
  title?: string;
  /**
   * Anime au montage via offset caché → cible (transition CSS 1s).
   * @default true
   */
  animate?: boolean;
  /** Classes additionnelles sur `.gauge`. */
  className?: string;
}

/**
 * Géométrie couplée au `viewBox="0 0 100 60"` — émise À L'IDENTIQUE que le
 * vanilla (`shared/components.js` `initGauges`). Ne PAS paramétrer : l'offset
 * de remplissage n'a de sens que pour cet arc précis.
 */
const ARC_PATH = "M 10 55 A 40 40 0 0 1 90 55";
/** Longueur de l'arc semi-circulaire (r = 40). `Math.PI * 40 ≈ 125.66`. */
const ARC_LENGTH = Math.PI * 40;

function clampRatio(value: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.min(Math.max(value / max, 0), 1);
}

/**
 * Couleur du seuil (calque `getThresholdColor`, `components.js:2443-2449`).
 * `null` → pas d'override inline, le défaut CSS `var(--accent)` s'applique.
 */
function getThresholdColor(
  pct: number,
  thresholds?: [number, number],
): string | null {
  if (!thresholds) return null;
  const [low, high] = thresholds;
  if (pct <= low) return "var(--danger)";
  if (pct <= high) return "var(--warning)";
  return "var(--success)";
}

/**
 * Gauge / Speedometer — jauge semi-circulaire SVG du Design System msyx.fr
 * (`data.html` #gauge, calque `initGauges` — `shared/components.js:2438-2495`).
 *
 * Émet le markup canonique `.gauge` (`components/data.css:90-107`) :
 * ```html
 * <div class="gauge" role="img" aria-label="Performance — 72%">
 *   <svg viewBox="0 0 100 60" aria-hidden="true">
 *     <title>Performance — 72%</title>
 *     <path class="gauge-track" d="M 10 55 A 40 40 0 0 1 90 55"/>
 *     <path class="gauge-fill"  d="M 10 55 A 40 40 0 0 1 90 55"
 *           style="stroke-dasharray:125.66; stroke-dashoffset:35.2"/>
 *     <text class="gauge-value" x="50" y="52">72%</text>
 *   </svg>
 *   <span class="gauge-label">Performance</span>
 * </div>
 * ```
 *
 * **Contrôlé** : `value`/`max`/`thresholds` pilotent tout le rendu ; aucun état
 * métier interne (seul l'offset animé au montage est un état de présentation).
 *
 * **Piège `.progress-fill` (capital)** : le remplissage proportionnel n'existe
 * PAS dans le CSS — il est 100% piloté par des styles inline calculés sur
 * `.gauge-fill` :
 * - `strokeDasharray = ARC_LENGTH` (`Math.PI * 40`),
 * - `strokeDashoffset = ARC_LENGTH * (1 - pct / 100)` — C'EST la proportion,
 * - `stroke = var(--danger|--warning|--success)` selon `thresholds` (override
 *   du défaut CSS `var(--accent)`).
 * Un `.gauge` monté sans ces styles affiche un arc PLEIN, mono-couleur accent,
 * sans proportion ni seuil (exactement le bug FileUpload `.progress-fill`).
 *
 * **Animation au montage** (`animate`, défaut `true`) : l'offset démarre à
 * `ARC_LENGTH` (jauge cachée) puis un effet post-paint le pose à la cible ; la
 * transition CSS `stroke-dashoffset 1s` (`data.css:95`) joue le remplissage.
 * `animate={false}` pose directement l'offset cible (pas d'animation d'entrée ;
 * les changements de `value` ultérieurs restent animés par le CSS).
 * L'IntersectionObserver du vanilla (animation à l'entrée dans le viewport) est
 * volontairement hors périmètre v1.
 *
 * **A11y** : le conteneur porte `role="img"` + `aria-label` (requis) ; le SVG
 * est `aria-hidden` (le `<title>` sert de tooltip natif, non annoncé).
 *
 * SSR-safe : aucun accès `window`/`document` ; l'effet d'animation ne s'exécute
 * que côté client.
 */
export function Gauge({
  value,
  max = 100,
  thresholds,
  label,
  valueText,
  mini = false,
  ariaLabel,
  title,
  animate = true,
  className,
}: GaugeProps) {
  const ratio = clampRatio(value, max);
  const pct = ratio * 100;
  const targetOffset = ARC_LENGTH * (1 - ratio);
  const strokeColor = getThresholdColor(pct, thresholds);

  // Offset initial : caché (ARC_LENGTH) si `animate`, sinon directement la cible
  // (rendu correct sans JS / SSR). L'effet ci-dessous fait converger vers la
  // cible après le premier paint → la transition CSS anime le remplissage.
  const [offset, setOffset] = useState<number>(
    animate ? ARC_LENGTH : targetOffset,
  );

  useEffect(() => {
    setOffset(targetOffset);
  }, [targetOffset]);

  const displayValue =
    valueText !== undefined ? valueText : `${Math.round(pct)}%`;
  const svgTitle = title ?? ariaLabel;

  const containerClasses = ["gauge", mini ? "gauge--mini" : null, className]
    .filter(Boolean)
    .join(" ");

  const fillStyle: CSSProperties = {
    strokeDasharray: ARC_LENGTH,
    strokeDashoffset: offset,
    ...(strokeColor ? { stroke: strokeColor } : {}),
  };

  return (
    <div className={containerClasses} role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 60" aria-hidden="true">
        <title>{svgTitle}</title>
        <path className="gauge-track" d={ARC_PATH} />
        <path className="gauge-fill" d={ARC_PATH} style={fillStyle} />
        <text className="gauge-value" x="50" y="52">
          {displayValue}
        </text>
      </svg>
      {label && <span className="gauge-label">{label}</span>}
    </div>
  );
}

Gauge.displayName = "Gauge";
