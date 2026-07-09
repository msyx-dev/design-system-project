import { CSSProperties, useEffect, useRef, useState } from "react";

/** Un anneau de la variante concentrique (`.progress-tracker-multi`). */
export interface ProgressTrackerRing {
  /** Libellé affiché dans la légende. */
  label: string;
  /** Progression 0-100 de l'anneau. */
  pct: number;
  /** Couleur du stroke (token CSS). @default "var(--accent)" */
  color?: string;
}

export interface ProgressTrackerProps {
  // --- Anneau simple ---
  /** Progression 0-100 de l'anneau unique. Ignoré si `rings` est fourni. @default 0 */
  progress?: number;
  /** Nombre de jalons répartis sur l'anneau (`0` = aucun). @default 0 */
  steps?: number;
  /** Étape courante 1-indexée : jalons `< current-1` = done, `=== current-1` = active, sinon pending. @default 0 */
  current?: number;
  /** Texte central `.progress-tracker-value` (ex. "75%" ou "3/4"). */
  value?: string;
  /** Sous-texte central `.progress-tracker-label`. */
  label?: string;

  // --- Variante concentrique ---
  /**
   * Bascule sur `.progress-tracker-multi` : jusqu'à 3 anneaux concentriques
   * (rayons 84 / 68 / 52 dans un viewBox 200). Au-delà de 3, les anneaux
   * supplémentaires sont ignorés (limite géométrique du DS).
   */
  rings?: ProgressTrackerRing[];
  /** Affiche `.progress-tracker-multi-legend` à côté des anneaux. @default true */
  legend?: boolean;

  // --- Commun ---
  /** Taille de l'anneau simple : `"sm"` pose `.progress-tracker--sm`. Sans effet en multi. @default "md" */
  size?: "md" | "sm";
  /**
   * Anime le remplissage au premier passage dans le viewport
   * (IntersectionObserver). Respecte `prefers-reduced-motion` et est SSR-safe.
   * `false` = rendu directement à la valeur cible. @default true
   */
  animateOnView?: boolean;
  /**
   * Nom accessible OBLIGATOIRE : le `<svg>` est `aria-hidden`, le conteneur
   * porte `role="img"` + cet `aria-label`.
   */
  "aria-label": string;
  /** Classes additionnelles sur l'élément racine. */
  className?: string;
}

// --- Géométrie (calquée sur initProgressTrackers, components.js:2542-2665) ---
const SINGLE_R = 62; // rayon anneau simple
const SINGLE_C = 80; // cx = cy = centre (viewBox 160)
const SINGLE_VIEWBOX = 160;
const STEP_R = 5; // rayon d'un point de jalon

const MULTI_C = 100; // cx = cy (viewBox 200)
const MULTI_VIEWBOX = 200;
const MULTI_RADII = [84, 68, 52]; // 3 anneaux concentriques
const MULTI_SW = 7; // stroke-width des anneaux multi

const clampPct = (n: number): number =>
  Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), 100);

const circumference = (r: number): number => 2 * Math.PI * r;

/**
 * Hook de révélation « au scroll » partagé single/multi.
 *
 * SSR-safe : aucun accès à `window`/`IntersectionObserver` au niveau module.
 * - `animateOnView === false` → révélé d'emblée (valeur cible).
 * - `prefers-reduced-motion` → révélé immédiatement (pas d'animation).
 * - `IntersectionObserver` absent (SSR / jsdom) → révélé immédiatement (no-op).
 * - sinon → révélé au premier `isIntersecting`.
 */
function useReveal(animateOnView: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(!animateOnView);

  useEffect(() => {
    if (!animateOnView) {
      setRevealed(true);
      return;
    }
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      try {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setRevealed(true);
          return;
        }
      } catch {
        /* matchMedia peut lever selon l'environnement — dégrade en reveal */
      }
    }
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animateOnView]);

  return { ref, revealed };
}

/**
 * ProgressTracker — anneaux de progression circulaires SVG du Design System
 * msyx.fr (`data.html` #progress-tracker, calque `initProgressTrackers` —
 * `shared/components.js:2542-2665`, styles `components/tracker.css`).
 *
 * **Vrai composant à logique, pas un conteneur composable.** La progression
 * n'existe QUE dans des attributs/styles SVG calculés — absents du CSS — que le
 * composant pose lui-même (piège capitalisé `.progress-fill` / ActionMenu
 * `.open` #612) :
 * - `stroke-dasharray = 2·π·r` (attribut, motif de tiret = 1 arc) ;
 * - `stroke-dashoffset` (style animé) = `C` caché → `C·(1 − pct/100)` révélé —
 *   **c'est l'état réel de progression**, à animer via la transition CSS ;
 * - `transform: rotate(-90deg)` + `transform-origin` centré : démarre l'arc à
 *   12 h (sinon 3 h) ;
 * - en multi, `stroke` par anneau (le CSS `.progress-tracker-multi .pt-fill`
 *   n'a AUCUNE couleur) + le fond du `.progress-tracker-multi-legend-dot`.
 *
 * Deux variantes, un seul composant : `rings` présent ⇒ multi concentrique
 * (`.progress-tracker-multi`), sinon anneau simple (`.progress-tracker`). Les
 * jalons (`.pt-step--done/active/pending`, positionnés par trigonométrie) et
 * les cercles concentriques multi sont générés par le composant — le CSS ne
 * fournit que l'apparence.
 *
 * **Contrôlé** : la donnée (progress/steps/current/rings) vient des props ;
 * seul l'état d'animation (révélé ou non) est interne (flux légitime).
 */
export function ProgressTracker({
  progress = 0,
  steps = 0,
  current = 0,
  value,
  label,
  rings,
  legend,
  size = "md",
  animateOnView = true,
  "aria-label": ariaLabel,
  className,
}: ProgressTrackerProps) {
  const { ref, revealed } = useReveal(animateOnView);

  // ===== Variante concentrique (multi-ring) =====
  if (rings && rings.length > 0) {
    const visibleRings = rings.slice(0, MULTI_RADII.length);
    const showLegend = legend ?? true;
    const wrapperClasses = ["progress-tracker-multi-layout", className]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={ref}
        className={wrapperClasses}
        style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap" }}
      >
        <div className="progress-tracker-multi" role="img" aria-label={ariaLabel}>
          <svg
            viewBox={`0 0 ${MULTI_VIEWBOX} ${MULTI_VIEWBOX}`}
            aria-hidden="true"
          >
            {visibleRings.map((ring, idx) => {
              const r = MULTI_RADII[idx];
              const pct = clampPct(ring.pct);
              const color = ring.color ?? "var(--accent)";
              const c = circumference(r);
              const offset = revealed ? c * (1 - pct / 100) : c;
              const fillStyle: CSSProperties = {
                transform: "rotate(-90deg)",
                transformOrigin: `${MULTI_C}px ${MULTI_C}px`,
                strokeDashoffset: offset,
                stroke: color,
              };
              return (
                <g key={`${ring.label}-${idx}`}>
                  <circle
                    className="pt-track"
                    cx={MULTI_C}
                    cy={MULTI_C}
                    r={r}
                    strokeWidth={MULTI_SW}
                  />
                  <circle
                    className="pt-fill"
                    cx={MULTI_C}
                    cy={MULTI_C}
                    r={r}
                    strokeWidth={MULTI_SW}
                    strokeDasharray={c}
                    style={fillStyle}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        {showLegend && (
          <div className="progress-tracker-multi-legend">
            {visibleRings.map((ring, idx) => (
              <div
                className="progress-tracker-multi-legend-item"
                key={`${ring.label}-${idx}`}
              >
                <span
                  className="progress-tracker-multi-legend-dot"
                  style={{ background: ring.color ?? "var(--accent)" }}
                />
                <span>{ring.label}</span>
                <span className="progress-tracker-multi-legend-pct">
                  {Math.round(clampPct(ring.pct))}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== Anneau simple =====
  const pct = clampPct(progress);
  const stepCount = Math.max(0, Math.floor(Number.isFinite(steps) ? steps : 0));
  const c = circumference(SINGLE_R);
  const offset = revealed ? c * (1 - pct / 100) : c;

  const containerClasses = [
    "progress-tracker",
    size === "sm" ? "progress-tracker--sm" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const fillStyle: CSSProperties = {
    transform: "rotate(-90deg)",
    transformOrigin: `${SINGLE_C}px ${SINGLE_C}px`,
    strokeDashoffset: offset,
  };

  return (
    <div ref={ref} className={containerClasses} role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${SINGLE_VIEWBOX} ${SINGLE_VIEWBOX}`} aria-hidden="true">
        <circle className="pt-track" cx={SINGLE_C} cy={SINGLE_C} r={SINGLE_R} />
        <circle
          className="pt-fill"
          cx={SINGLE_C}
          cy={SINGLE_C}
          r={SINGLE_R}
          strokeDasharray={c}
          style={fillStyle}
        />
        {stepCount > 0 &&
          Array.from({ length: stepCount }).map((_, i) => {
            const angle = (2 * Math.PI * i) / stepCount - Math.PI / 2;
            const dx = SINGLE_C + SINGLE_R * Math.cos(angle);
            const dy = SINGLE_C + SINGLE_R * Math.sin(angle);
            const state =
              i < current - 1
                ? "pt-step--done"
                : i === current - 1
                  ? "pt-step--active"
                  : "pt-step--pending";
            return (
              <circle
                key={i}
                className={`pt-step ${state}`}
                cx={dx}
                cy={dy}
                r={STEP_R}
              />
            );
          })}
      </svg>
      {(value || label) && (
        <div className="progress-tracker-center">
          {value && <span className="progress-tracker-value">{value}</span>}
          {label && <span className="progress-tracker-label">{label}</span>}
        </div>
      )}
    </div>
  );
}

ProgressTracker.displayName = "ProgressTracker";
