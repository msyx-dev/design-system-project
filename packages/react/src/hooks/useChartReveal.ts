import type { RefObject } from "react";
import { useEffect, useRef } from "react";

/**
 * Classe d'ÉTAT critique posée sur `.chart-wrap.chart-animated` à l'entrée en
 * viewport. Déclenche TOUTES les animations d'entrée (barres `chartGrow`, ligne
 * `drawLine`, aire `chartAreaFade`) — cf. `shared/css/components/data.css:49-57`.
 *
 * ABSENTE => `.chart-animated` reste `opacity:0 translateY(20px)` => chart
 * INVISIBLE. Même famille de bug qu'ActionMenu `.open` (#612) : monter le markup
 * sans la classe d'état rend le composant invisible.
 */
const VISIBLE_CLASS = "chart-visible";

/** Classe d'ÉTAT du tooltip : toggle `opacity 0 -> 1` (`data.css:36`). */
const TOOLTIP_VISIBLE_CLASS = "visible";

/**
 * Sélecteur des points de données porteurs du tooltip. Sans CES DEUX
 * data-attributs, le vanilla fait un early-return (`components.js:151-152`) et
 * aucun tooltip ne s'affiche.
 */
const DATAPOINT_SELECTOR = "[data-label][data-value]";

/** Seuil d'intersection par défaut — identique au vanilla (`components.js:144`). */
const DEFAULT_THRESHOLD = 0.15;

export interface UseChartRevealOptions {
  /** Seuil `IntersectionObserver` (0–1). Défaut `0.15` (fidèle au vanilla). */
  threshold?: number;
}

export interface UseChartTooltipReturn<W extends HTMLElement = HTMLDivElement> {
  /** À poser sur `.chart-wrap` (doit être `position:relative`, ce que fait `.chart-wrap`). */
  wrapRef: RefObject<W>;
  /** À poser sur l'élément `.chart-tooltip` enfant du wrap. */
  tooltipRef: RefObject<HTMLDivElement>;
}

export interface UseChartOptions {
  /** Seuil `IntersectionObserver` (0–1). Défaut `0.15`. */
  threshold?: number;
  /** Active le tooltip de survol. Défaut `true`. */
  tooltip?: boolean;
}

export interface UseChartReturn {
  /** À poser sur `.chart-wrap.chart-animated` : reçoit reveal + (option) tooltip. */
  wrapRef: RefObject<HTMLDivElement>;
  /** À poser sur `.chart-tooltip`. */
  tooltipRef: RefObject<HTMLDivElement>;
}

/**
 * Observe `node` et lui ajoute `.chart-visible` à l'entrée en viewport.
 *
 * SSR-safe : n'est appelée que depuis un `useEffect` (jamais au render).
 * Dégradation gracieuse si `IntersectionObserver` est absent côté client (très
 * vieux navigateur) : on révèle IMMÉDIATEMENT pour ne pas laisser
 * `.chart-animated` bloqué en `opacity:0` (le piège de la chart invisible).
 * No-op si le node est déjà révélé (re-mount / class posée statiquement).
 *
 * @returns une fonction de cleanup (déconnexion de l'observer).
 */
function observeReveal(node: Element, threshold: number): () => void {
  if (node.classList.contains(VISIBLE_CLASS)) return () => {};

  if (typeof IntersectionObserver === "undefined") {
    node.classList.add(VISIBLE_CLASS);
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(VISIBLE_CLASS);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold },
  );
  observer.observe(node);
  return () => observer.disconnect();
}

/**
 * Câble le tooltip de survol par DÉLÉGATION sur le wrap (au lieu d'un listener
 * par barre comme le vanilla `components.js:148-170`, non idiomatique en React).
 *
 * `mousemove` bubble : on détecte le point de donnée sous le curseur via
 * `closest([data-label][data-value])`, on positionne le tooltip au curseur
 * (`getBoundingClientRect` + `clientX/clientY`, offsets `+10 / -30` identiques au
 * vanilla) et on togglee `.visible`. `mouseleave` masque en sortie de wrap.
 *
 * @returns une fonction de cleanup (retrait des listeners).
 */
function bindTooltip(wrap: HTMLElement, tooltip: HTMLElement): () => void {
  const handleMove = (event: MouseEvent) => {
    const origin = event.target as Element | null;
    const point = origin
      ? (origin.closest(DATAPOINT_SELECTOR) as HTMLElement | null)
      : null;

    if (!point || !wrap.contains(point)) {
      tooltip.classList.remove(TOOLTIP_VISIBLE_CLASS);
      return;
    }

    const { label, value } = point.dataset;
    if (!label || !value) {
      tooltip.classList.remove(TOOLTIP_VISIBLE_CLASS);
      return;
    }

    tooltip.textContent = `${label} : ${value}`;
    tooltip.classList.add(TOOLTIP_VISIBLE_CLASS);
    const rect = wrap.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - rect.left + 10}px`;
    tooltip.style.top = `${event.clientY - rect.top - 30}px`;
  };

  const handleLeave = () => {
    tooltip.classList.remove(TOOLTIP_VISIBLE_CLASS);
  };

  wrap.addEventListener("mousemove", handleMove);
  wrap.addEventListener("mouseleave", handleLeave);
  return () => {
    wrap.removeEventListener("mousemove", handleMove);
    wrap.removeEventListener("mouseleave", handleLeave);
  };
}

/**
 * useChartReveal — port du comportement scroll-reveal des « charts » du DS
 * (`pages/data.html`, JS `shared/components.js:141-145`).
 *
 * ## Pourquoi un hook et pas un composant `<Chart>`
 * Le rendu des charts DS est du **SVG hand-authored statique** : géométrie 100 %
 * hardcodée dans le markup (positions/tailles de barres, `stroke-dasharray` des
 * donuts, `points` des lignes/aires), aucun modèle de données. La surface
 * visuelle est donc **couverte par composition** — l'app colle le SVG dans
 * `<div className="chart-wrap chart-animated" ref={wrapRef}>` et React le rend
 * nativement. Un vrai `<BarChart data=...>` serait un moteur de dataviz complet
 * (scales/axes/paths génératifs), hors périmètre DS (lib tierce type Recharts
 * côté app). Ce qui se porte = les comportements JS **non composables** et
 * **load-bearing** : (1) ce reveal et (2) le tooltip (`useChartTooltip`).
 *
 * ## PIÈGE #1 (le pire) — bloc `<defs>` global des gradients
 * Les `fill="url(#gradBar1)"` / `url(#gradArea1)` … des barres et aires
 * référencent un bloc `<svg width="0" height="0"><defs>…` rendu UNE FOIS par page
 * (`data.html:21-31`, ids `gradBar1/gradBar2/gradArea1/gradArea2/gradLine1`).
 * S'il est absent, TOUS les remplissages de barres/aires cassent (vides/noirs) —
 * équivalent du `.progress-fill` sans fond de FileUpload, ×5 gradients. Ce hook
 * ne peut pas fournir ce bloc à votre place : rendez-le une seule fois.
 *
 * ## PIÈGE #2 — `.chart-animated` sans `.chart-visible`
 * `.chart-animated` est `opacity:0`. Si le reveal ne s'exécute jamais, la chart
 * reste invisible. Ce hook lève le piège : il ajoute `.chart-visible` à l'entrée
 * en viewport (ou immédiatement si `IntersectionObserver` est indisponible).
 *
 * @example
 * const wrapRef = useChartReveal<HTMLDivElement>();
 * return (
 *   <div className="chart-wrap chart-animated" ref={wrapRef}>
 *     <svg>…SVG collé, fill="url(#gradBar1)"…</svg>
 *   </div>
 * );
 *
 * SSR-safe : aucun accès `window`/`IntersectionObserver` au render (tout en
 * `useEffect`). Idempotent : ne réobserve pas un node déjà `.chart-visible`.
 */
export function useChartReveal<T extends Element = HTMLDivElement>(
  options?: UseChartRevealOptions,
): RefObject<T> {
  const ref = useRef<T>(null);
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return observeReveal(node, threshold);
  }, [threshold]);

  return ref;
}

/**
 * useChartTooltip — port du tooltip de survol des charts
 * (`shared/components.js:147-170`).
 *
 * Posez `wrapRef` sur `.chart-wrap` et `tooltipRef` sur le `.chart-tooltip`
 * enfant. Les points de données (barres/points/tranches de donut) DOIVENT porter
 * `data-label` ET `data-value` — sinon aucun tooltip (comme le vanilla). Le
 * contenu affiché est `` `${data-label} : ${data-value}` ``.
 *
 * @example
 * const { wrapRef, tooltipRef } = useChartTooltip<HTMLDivElement>();
 * return (
 *   <div className="chart-wrap chart-animated" ref={wrapRef}>
 *     <div className="chart-tooltip" ref={tooltipRef} />
 *     <svg>
 *       <rect className="chart-bar" data-label="Jan" data-value="32k" … />
 *     </svg>
 *   </div>
 * );
 *
 * SSR-safe : listeners posés en `useEffect`, retirés au unmount.
 */
export function useChartTooltip<
  W extends HTMLElement = HTMLDivElement,
>(): UseChartTooltipReturn<W> {
  const wrapRef = useRef<W>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const tooltip = tooltipRef.current;
    if (!wrap || !tooltip) return;
    return bindTooltip(wrap, tooltip);
  }, []);

  return { wrapRef, tooltipRef };
}

/**
 * useChart — combiné pratique : `wrapRef` reçoit à la fois le reveal et (par
 * défaut) le tooltip, `tooltipRef` se pose sur `.chart-tooltip`. Équivaut à
 * `useChartReveal` + `useChartTooltip` partageant le même wrap.
 *
 * @example
 * const { wrapRef, tooltipRef } = useChart();
 * return (
 *   <div className="chart-wrap chart-animated" ref={wrapRef}>
 *     <div className="chart-tooltip" ref={tooltipRef} />
 *     <svg>…</svg>
 *   </div>
 * );
 */
export function useChart(options?: UseChartOptions): UseChartReturn {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const tooltipEnabled = options?.tooltip ?? true;

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    return observeReveal(node, threshold);
  }, [threshold]);

  useEffect(() => {
    if (!tooltipEnabled) return;
    const wrap = wrapRef.current;
    const tooltip = tooltipRef.current;
    if (!wrap || !tooltip) return;
    return bindTooltip(wrap, tooltip);
  }, [tooltipEnabled]);

  return { wrapRef, tooltipRef };
}
