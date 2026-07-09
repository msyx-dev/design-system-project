import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface UseCountUpOptions {
  /**
   * Nombre de décimales. `0` → `Math.floor(current)` (parité `data-decimals`
   * absent) ; `> 0` → `current.toFixed(decimals)`. @default 0
   */
  decimals?: number;
  /** Durée du tween en ms — parité `const DURATION`. @default 1500 */
  duration?: number;
  /** Seuil de l'`IntersectionObserver` — parité `{ threshold }`. @default 0.3 */
  threshold?: number;
  /**
   * `false` court-circuite entièrement l'observer : aucune animation, la valeur
   * reste sur son état initial `"0"` et `done` reste `false`. Sert d'opt-out /
   * de garde de test / de gate (ex. n'animer qu'une fois des données chargées :
   * `useCountUp(total, { enabled: loaded })`). @default true
   */
  enabled?: boolean;
}

export interface UseCountUpResult<T extends HTMLElement = HTMLDivElement> {
  /** À poser sur l'élément `.counter` — c'est lui qui est observé au scroll. */
  ref: RefObject<T>;
  /**
   * Valeur formatée courante. Départ `"0"` (calque exact du span authored
   * `<span class="counter-value">0</span>`), puis interpolée pendant le tween,
   * enfin égale à la cible formatée.
   */
  value: string;
  /**
   * `true` une fois le tween terminé (ou immédiatement en reduced-motion /
   * sans `IntersectionObserver`). Reste `true` : garde run-once équivalente à
   * l'attribut `data-counted` du vanilla.
   */
  done: boolean;
}

const DEFAULT_DURATION = 1500;
const DEFAULT_THRESHOLD = 0.3;

/** Easing identique au vanilla (`initAnimatedCounters`). */
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

/**
 * Formatage identique au vanilla : `decimals > 0 ? toFixed(decimals) :
 * Math.floor().toString()`.
 */
function formatValue(current: number, decimals: number): string {
  return decimals > 0
    ? current.toFixed(decimals)
    : Math.floor(current).toString();
}

/** `true` si l'utilisateur a demandé la réduction des animations (SSR-safe). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * useCountUp — compteur animé « 0 → cible » au scroll du Design System msyx.fr
 * (`pages/data.html` #animated-counters, calque comportemental de
 * `initAnimatedCounters` — `shared/components.js:2497-2539`).
 *
 * **Pourquoi un hook et pas un composant** : la surface visuelle
 * (`.counter` / `.counter-value` / `.counter-prefix` / `.counter-suffix` /
 * `.counter-label`, `components/data.css:109-135`) est 100 % composable — de
 * simples spans stylés par du CSS statique. Un wrapper React n'apporterait
 * rien (anti-pattern « force un composant là où `<div className>` suffit »). Ce
 * qui N'EST PAS composable, c'est le **comportement** : `IntersectionObserver`
 * (threshold 0.3) + tween `requestAnimationFrame` `0 → cible` sur 1500 ms en
 * `easeOutQuart`, déclenché **une seule fois**, formaté. Le hook expose donc
 * juste `ref` (à poser sur `.counter`), `value` (à injecter dans
 * `.counter-value`) et `done`. Il ne pilote **jamais** prefix/suffix/label —
 * exactement comme le vanilla qui n'écrit que `.counter-value.textContent`.
 *
 * ```tsx
 * const { ref, value } = useCountUp(3.2, { decimals: 1 });
 * <div className="counter" ref={ref}>
 *   <span className="counter-prefix">€</span>
 *   <span className="counter-value">{value}</span>
 *   <span className="counter-suffix">M</span>
 * </div>
 * <div className="counter-label">Revenue</div>
 * ```
 *
 * **Garde run-once** (équivalent `data-counted`) : à la première intersection,
 * l'observer est déconnecté et un drapeau interne empêche tout redémarrage —
 * ni sur re-render, ni sur ré-intersection, ni sur toggle `enabled`.
 *
 * **a11y — écart de parité ASSUMÉ** : le vanilla ignore
 * `prefers-reduced-motion` et joue le tween quoi qu'il arrive. Ce hook, lui,
 * respecte la baseline DS (a11y) : si l'utilisateur a demandé la réduction des
 * animations, la valeur **saute** directement à la cible formatée (pas de
 * tween) et `done` passe `true`. Amélioration intentionnelle, pas un bug.
 *
 * **Robustesse** : sans `IntersectionObserver` (vieux navigateur ; rendu hors
 * DOM), la valeur finale est présentée directement plutôt que figée sur `"0"`.
 *
 * **SSR-safe** : aucun accès à `window` / `document` / `IntersectionObserver`
 * / `performance` / `requestAnimationFrame` hors `useEffect`. La valeur initiale
 * `"0"` est stable serveur↔client (le format `decimals` ne s'applique qu'en
 * cours/fin de tween) → pas de mismatch d'hydratation ; le flash `"0"` → `"0.0"`
 * éventuel est identique au vanilla.
 *
 * **Cleanup StrictMode** : `cancelAnimationFrame` + `observer.disconnect()` au
 * démontage — pas de fuite de rAF ni de `setState` post-démontage (le vanilla,
 * lui, fuit le rAF si le nœud est retiré en plein tween).
 */
export function useCountUp<T extends HTMLElement = HTMLDivElement>(
  target: number,
  options: UseCountUpOptions = {},
): UseCountUpResult<T> {
  const {
    decimals = 0,
    duration = DEFAULT_DURATION,
    threshold = DEFAULT_THRESHOLD,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const [value, setValue] = useState("0");
  const [done, setDone] = useState(false);

  // Options captées dans des refs : le tween lit toujours la dernière valeur
  // sans re-souscrire l'observer (l'effet ne dépend QUE de `enabled`, comme le
  // vanilla qui lit ses `data-*` une seule fois au bind → garantit run-once).
  const targetRef = useRef(target);
  targetRef.current = target;
  const decimalsRef = useRef(decimals);
  decimalsRef.current = decimals;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  // Drapeau run-once persistant (≈ `data-counted`) + id du rAF en vol.
  const startedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Déjà déclenché lors d'un précédent montage/effet (toggle `enabled`,
    // StrictMode) → ne jamais rejouer.
    if (startedRef.current) return;

    const node = ref.current;

    // reduced-motion (a11y) ou absence d'IntersectionObserver → pas de tween,
    // on présente la valeur finale immédiatement.
    if (
      prefersReducedMotion() ||
      typeof IntersectionObserver === "undefined"
    ) {
      startedRef.current = true;
      setValue(formatValue(targetRef.current, decimalsRef.current));
      setDone(true);
      return;
    }

    if (node == null) return;

    const runTween = () => {
      const start = performance.now();
      const totalDuration = durationRef.current;
      const finalTarget = targetRef.current;
      const dec = decimalsRef.current;

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress =
          totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 1;
        const current = easeOutQuart(progress) * finalTarget;
        setValue(formatValue(current, dec));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          setDone(true);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (startedRef.current) return;
          startedRef.current = true;
          observer.disconnect();
          runTween();
          return;
        }
      },
      { threshold: thresholdRef.current },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled]);

  return { ref, value, done };
}
