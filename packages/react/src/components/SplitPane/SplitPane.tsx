import {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export type SplitPaneOrientation = "horizontal" | "vertical";

export interface SplitPaneProps {
  /** Contenu du panneau PILOTÉ par le ratio (`flex-basis`, `.split-panel`). */
  first: ReactNode;
  /** Contenu du panneau restant (`.split-panel--fluid`, absorbe l'espace). */
  second: ReactNode;
  /**
   * Axe du split. `"horizontal"` (défaut) = panneaux côte à côte,
   * `"vertical"` = panneaux empilés haut/bas (`.split-pane--vertical`).
   */
  orientation?: SplitPaneOrientation;
  /** Borne minimale du ratio (`aria-valuemin` + clamp). @default 15 */
  min?: number;
  /** Borne maximale du ratio (`aria-valuemax` + clamp). @default 85 */
  max?: number;
  /**
   * Ratio initial en mode non contrôlé (ignoré si `persistKey` restaure une
   * valeur, et ignoré si `ratio` est fourni). @default 50
   */
  defaultRatio?: number;
  /**
   * Ratio courant — mode **contrôlé**. Fourni, l'état interne ET
   * `defaultRatio`/la restauration `persistKey` sont ignorés : le parent
   * doit répercuter `onResize`.
   */
  ratio?: number;
  /** Appelé avec le ratio clampé à chaque déplacement (drag ou clavier). */
  onResize?: (ratio: number) => void;
  /**
   * Clé `localStorage` de persistance du ratio (try/catch, calque vanilla —
   * `shared/components.js:5713-5799`). Restaurée une seule fois au montage,
   * en mode non contrôlé uniquement.
   */
  persistKey?: string;
  /** `aria-label` du gutter (`.split-gutter`, `role="separator"`). Le vanilla n'en pose aucun — amélioration opt-in, au-delà du vanilla. */
  gutterAriaLabel?: string;
  /** Classes additionnelles sur `.split-pane` (racine). */
  className?: string;
  /** Classes additionnelles sur le premier `.split-panel`. */
  firstClassName?: string;
  /** Classes additionnelles sur le second `.split-panel--fluid`. */
  secondClassName?: string;
}

/** Lecture localStorage SSR-safe — no-op silencieux si indisponible (SSR, mode privé, quota). */
function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Écriture localStorage SSR-safe — no-op silencieux si indisponible. */
function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible — no-op, calque vanilla */
  }
}

function clampRatio(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * SplitPane — Panneaux redimensionnables du Design System msyx.fr
 * (`divers.html` #splitter, calque `initSplitPane` —
 * `shared/components.js:5713-5799`).
 *
 * Émet le markup canonique `.split-pane` (`components/splitter.css`) :
 * ```html
 * <div class="split-pane">
 *   <div class="split-panel" style="flex-basis: 50%">…</div>
 *   <div class="split-gutter" role="separator" tabindex="0"
 *        aria-orientation="vertical" aria-valuemin="15" aria-valuemax="85"
 *        aria-valuenow="50"></div>
 *   <div class="split-panel split-panel--fluid">…</div>
 * </div>
 * ```
 *
 * **Seul le PREMIER panneau (`first`) est piloté par `flex-basis: {ratio}%`**
 * — le second (`second`) est `.split-panel--fluid` et absorbe le reste, non
 * piloté par le composant (iso-vanilla, `firstPanel.style.flexBasis`).
 *
 * **`aria-orientation` — piège volontaire, NE PAS "corriger"** : pour un
 * split **vertical** (panneaux empilés), `aria-orientation` vaut
 * **`"horizontal"`**, et inversement. Ce n'est pas un bug : l'attribut décrit
 * l'orientation du **séparateur** (la ligne de la poignée), pas celle du
 * split. Calque exact de `vertical ? 'horizontal' : 'vertical'`
 * (`shared/components.js:5730`).
 *
 * **Drag réimplémenté en Pointer Events** : le vanilla délègue à
 * `window.__pointerDrag()`, primitive globale du DS **non disponible** côté
 * React (pas un module importable). Le comportement est reproduit à
 * l'identique — `setPointerCapture`/`releasePointerCapture` sur le gutter,
 * axe contraint par `orientation`, ratio recalculé depuis
 * `getBoundingClientRect()` du conteneur `.split-pane` à chaque
 * `pointermove` — sans importer les globals (impossible de toute façon hors
 * du DOM vanilla).
 *
 * **Classe d'état `.split-pane--dragging`** : posée sur `.split-pane`
 * pendant le drag (dès `pointerdown`), retirée à `pointerup`/`pointercancel`
 * — iso-vanilla. ⚠️ Cette classe n'a **aucune règle CSS** dans le DS
 * aujourd'hui (bug suivi séparément, **#763**) : émise quand même, c'est de
 * la parité, #763 la rendra visible des deux côtés simultanément.
 *
 * **Clavier (gutter)** : `ArrowLeft`/`ArrowRight` (horizontal) ou
 * `ArrowUp`/`ArrowDown` (vertical) déplacent par pas de 2 ; `Home` → `min` ;
 * `End` → `max`. `preventDefault()` sur les touches gérées (calque exact).
 *
 * **Ratio — non contrôlé par défaut** (`defaultRatio`, @default 50) +
 * **contrôlé** via `ratio`/`onResize` (convention alignée sur
 * `<Accordion openIds>`/`<TreeView selectedId>`).
 *
 * **Persistance `persistKey`** : restaurée dans un `useEffect` de montage
 * (mode non contrôlé uniquement — SSR-safe, pas de lecture `localStorage`
 * au render, calque `VersionBadge`), puis réécrite à chaque déplacement
 * (drag ou clavier). « L'application initiale ne réécrit pas » (iso-vanilla
 * `persist:false`) : la restauration ne déclenche pas d'écriture.
 *
 * **Événement `split:resize` → `onResize`** : le vanilla dispatch un
 * `CustomEvent('split:resize', { detail: { ratio } })`. Convention du
 * package : callback `onResize(ratio)` plutôt qu'un événement DOM.
 *
 * SSR-safe : aucun accès `window`/`document`/`localStorage` au render (le
 * `useEffect` de restauration ne s'exécute que côté client, après montage).
 */
export function SplitPane({
  first,
  second,
  orientation = "horizontal",
  min = 15,
  max = 85,
  defaultRatio = 50,
  ratio: controlledRatio,
  onResize,
  persistKey,
  gutterAriaLabel,
  className,
  firstClassName,
  secondClassName,
}: SplitPaneProps) {
  const vertical = orientation === "vertical";
  const isControlled = controlledRatio !== undefined;

  const [internalRatio, setInternalRatio] = useState<number>(() =>
    clampRatio(defaultRatio, min, max),
  );
  const [dragging, setDragging] = useState(false);

  const paneRef = useRef<HTMLDivElement>(null);
  const draggingPointerId = useRef<number | null>(null);

  // Restauration persistance — AVANT tout drag (montage), mode non contrôlé
  // uniquement. Volontairement lancé une seule fois : le vanilla lit la
  // clé une seule fois à l'init, pas à chaque changement de persistKey.
  useEffect(() => {
    if (isControlled || !persistKey) return;
    const stored = safeGetItem(persistKey);
    if (stored === null) return;
    const parsed = parseFloat(stored);
    if (!Number.isNaN(parsed)) {
      setInternalRatio(clampRatio(parsed, min, max));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentRatio = clampRatio(
    isControlled ? (controlledRatio as number) : internalRatio,
    min,
    max,
  );

  function applyRatio(next: number): void {
    const clamped = clampRatio(next, min, max);
    if (!isControlled) setInternalRatio(clamped);
    if (persistKey) safeSetItem(persistKey, String(clamped));
    onResize?.(clamped);
  }

  function ratioFromPoint(clientX: number, clientY: number): number {
    const rect = paneRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return currentRatio;
    return vertical
      ? ((clientY - rect.top) / rect.height) * 100
      : ((clientX - rect.left) / rect.width) * 100;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    draggingPointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* déjà capturé ou non supporté — best-effort, calque pointer-drag.js */
    }
    setDragging(true);
    e.preventDefault();
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    if (draggingPointerId.current !== e.pointerId) return;
    applyRatio(ratioFromPoint(e.clientX, e.clientY));
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>): void {
    if (draggingPointerId.current !== e.pointerId) return;
    draggingPointerId.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* déjà relâché — best-effort */
    }
    setDragging(false);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    const step = 2;
    const decreaseKey = vertical ? "ArrowUp" : "ArrowLeft";
    const increaseKey = vertical ? "ArrowDown" : "ArrowRight";

    if (e.key === decreaseKey) {
      e.preventDefault();
      applyRatio(currentRatio - step);
    } else if (e.key === increaseKey) {
      e.preventDefault();
      applyRatio(currentRatio + step);
    } else if (e.key === "Home") {
      e.preventDefault();
      applyRatio(min);
    } else if (e.key === "End") {
      e.preventDefault();
      applyRatio(max);
    }
  }

  const paneClasses = [
    "split-pane",
    vertical ? "split-pane--vertical" : null,
    dragging ? "split-pane--dragging" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const firstPanelClasses = ["split-panel", firstClassName]
    .filter(Boolean)
    .join(" ");
  const secondPanelClasses = [
    "split-panel",
    "split-panel--fluid",
    secondClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const firstPanelStyle: CSSProperties = { flexBasis: `${currentRatio}%` };

  return (
    <div ref={paneRef} className={paneClasses}>
      <div className={firstPanelClasses} style={firstPanelStyle}>
        {first}
      </div>
      <div
        className="split-gutter"
        role="separator"
        tabIndex={0}
        // Piège volontaire — décrit l'orientation du SÉPARATEUR, pas celle
        // du split. Ne pas inverser. Cf. JSDoc du composant.
        aria-orientation={vertical ? "horizontal" : "vertical"}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(currentRatio)}
        aria-label={gutterAriaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      />
      <div className={secondPanelClasses}>{second}</div>
    </div>
  );
}

SplitPane.displayName = "SplitPane";
