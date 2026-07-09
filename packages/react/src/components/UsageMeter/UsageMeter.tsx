import { ReactNode, useEffect, useState } from "react";

export type UsageMeterVariant = "ok" | "warn" | "danger";

export interface UsageMeterProps {
  /**
   * Valeur 0-100. Pose la largeur INLINE de `.usage-fill`
   * (`style={{ width: \`${value}%\` }}`). SANS ce style inline la barre est
   * invisible : le DS pose `.usage-fill { width: 0 }` par défaut
   * (`pricing.css:198`) et la largeur réelle est TOUJOURS posée inline (le
   * vanilla la calque via `fill.style.width = pct + '%'`, `components.js:4484`).
   * Bornée à `[0, 100]` et arrondie pour la largeur et `aria-valuenow`.
   */
  value: number;
  /** Libellé — `.usage-meter-label`. Le header n'est rendu que si `label` ou `valueLabel` est fourni. */
  label?: ReactNode;
  /** Valeur affichée à droite du header — `.usage-meter-value` (ex `"300 Mo / 1 Go"`, `"60%"`). */
  valueLabel?: ReactNode;
  /**
   * Seuil de couleur explicite → classe `.usage-fill--{ok|warn|danger}`.
   * @default "ok"
   * Prioritaire sur `thresholds`.
   */
  variant?: UsageMeterVariant;
  /**
   * Auto-calcul du variant depuis `value` : `[warnAt, dangerAt]`
   * (ex `[60, 80]` ⇒ `<60` ok, `60-80` warn, `>80` danger). Ignoré si
   * `variant` est fourni. Calque la logique métier décrite dans `data.html`.
   */
  thresholds?: [number, number];
  /** Texte d'aide sous la barre — `.usage-meter-hint`. Omis ⇒ pas de hint. */
  hint?: ReactNode;
  /**
   * Anime le remplissage `0 → value` au montage (calque l'entrée
   * `IntersectionObserver` vanilla via la transition CSS `width 0.6s`).
   * @default true
   * Respecte `prefers-reduced-motion` (rendu direct à `value%`, sans transition).
   */
  animate?: boolean;
  /** `aria-label` du `role="progressbar"` quand `label` n'est pas une chaîne (ex barres sans header). */
  ariaLabel?: string;
  /** Classes additionnelles sur `.usage-meter`. */
  className?: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

function resolveVariant(
  value: number,
  variant?: UsageMeterVariant,
  thresholds?: [number, number],
): UsageMeterVariant {
  if (variant) return variant;
  if (thresholds) {
    const [warnAt, dangerAt] = thresholds;
    if (value > dangerAt) return "danger";
    if (value >= warnAt) return "warn";
    return "ok";
  }
  return "ok";
}

/**
 * UsageMeter — Barre de quota à seuils colorés du Design System msyx.fr
 * (`pages/data.html` #usage-meter, `shared/css/components/pricing.css:193-203`,
 * calque `initUsageMeter` — `shared/components.js:4476`).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="usage-meter">
 *   <div class="usage-meter-header">
 *     <span class="usage-meter-label">Stockage</span>
 *     <span class="usage-meter-value">300 Mo / 1 Go</span>
 *   </div>
 *   <div class="usage-meter-track" role="progressbar"
 *        aria-valuemin="0" aria-valuemax="100" aria-valuenow="30">
 *     <div class="usage-fill usage-fill--ok" style="width:30%"></div>
 *   </div>
 *   <div class="usage-meter-hint">30% utilisé — OK</div>
 * </div>
 * ```
 *
 * **Piège capitalisé — largeur inline** (identique `FileUpload` `.progress-fill`) :
 * le CSS pose `.usage-fill { width: 0 }` par défaut ; la largeur réelle est
 * TOUJOURS posée inline (`style={{ width: \`${value}%\` }}`). Sans ce style, la
 * barre est INVISIBLE quelle que soit la variante. Le background, lui, vient de
 * la classe `--ok/--warn/--danger` (pas besoin de l'inliner, contrairement à
 * `FileUpload`).
 *
 * **État critique — variante `.usage-fill--danger`** : seule variante qui anime
 * (`@keyframes usagePulse`, opacity 1↔0.65, infini, `pricing.css:201-202`). La
 * classe est reposée telle quelle pour que le pulse joue.
 *
 * **Contrôlé** : `value`/`variant`/`thresholds` pilotés par le parent. Le seul
 * état interne est la largeur animée d'entrée (flux d'animation légitime, pas de
 * donnée métier).
 *
 * **A11y (comble le gap vanilla, décision Mike #613)** : le vanilla n'a AUCUN
 * ARIA sur le track. Ici `.usage-meter-track` porte `role="progressbar"` +
 * `aria-valuemin/max/now` + `aria-label` (depuis `label` string ou `ariaLabel`)
 * + `aria-valuetext` (depuis `valueLabel` string) pour verbaliser le quota.
 *
 * SSR-safe : aucun accès `window`/`document` au render ; `matchMedia` et
 * `requestAnimationFrame` ne sont touchés qu'en `useEffect`, avec garde de
 * disponibilité (no-op si absents, ex jsdom sans `matchMedia`).
 */
export function UsageMeter({
  value,
  label,
  valueLabel,
  variant,
  thresholds,
  hint,
  animate = true,
  ariaLabel,
  className,
}: UsageMeterProps) {
  const clamped = clamp(value);
  const rounded = Math.round(clamped);
  const resolvedVariant = resolveVariant(clamped, variant, thresholds);

  // Largeur inline animée : au montage, part de 0 (si `animate`) puis transite
  // vers `rounded%` via la transition CSS. Rendu direct sinon / si reduced-motion.
  const [fillWidth, setFillWidth] = useState<number>(animate ? 0 : rounded);

  useEffect(() => {
    if (!animate) {
      setFillWidth(rounded);
      return;
    }
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setFillWidth(rounded);
      return;
    }
    if (typeof requestAnimationFrame !== "function") {
      setFillWidth(rounded);
      return;
    }
    // rAF garantit un paint à 0 avant de poser la largeur cible → la transition
    // CSS `width 0.6s` joue réellement (calque l'entrée IntersectionObserver).
    const raf = requestAnimationFrame(() => setFillWidth(rounded));
    return () => cancelAnimationFrame(raf);
  }, [animate, rounded]);

  const hasHeader = label != null || valueLabel != null;

  const meterClasses = ["usage-meter", className].filter(Boolean).join(" ");

  const computedAriaLabel =
    ariaLabel ?? (typeof label === "string" ? label : undefined);
  const ariaValueText = typeof valueLabel === "string" ? valueLabel : undefined;

  return (
    <div className={meterClasses}>
      {hasHeader && (
        <div className="usage-meter-header">
          {label != null && <span className="usage-meter-label">{label}</span>}
          {valueLabel != null && (
            <span className="usage-meter-value">{valueLabel}</span>
          )}
        </div>
      )}
      <div
        className="usage-meter-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-label={computedAriaLabel}
        aria-valuetext={ariaValueText}
      >
        <div
          className={`usage-fill usage-fill--${resolvedVariant}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      {hint != null && <div className="usage-meter-hint">{hint}</div>}
    </div>
  );
}

UsageMeter.displayName = "UsageMeter";
