import {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useRef,
  useState,
} from "react";

const MIN = 5;
const MAX = 95;

function clampPercent(value: number): number {
  return Math.min(MAX, Math.max(MIN, value));
}

export interface BeforeAfterProps {
  /** Contenu du calque `.before-after-before` (image/couleur « avant »). */
  before: ReactNode;
  /** Contenu du calque `.before-after-after` (image/couleur « après »). */
  after: ReactNode;
  /**
   * Position de la poignée en % — mode **contrôlé**. Fourni, l'état interne
   * ET `defaultPercent` sont ignorés : le parent doit répercuter `onChange`.
   */
  percent?: number;
  /** Position initiale en mode non contrôlé. @default 50 */
  defaultPercent?: number;
  /** Appelé avec le pourcentage clampé à chaque déplacement (drag ou clavier). */
  onChange?: (percent: number) => void;
  /** `aria-label` de la poignée séparateur. */
  handleAriaLabel?: string;
  /** Classes additionnelles sur le conteneur `.before-after`. */
  className?: string;
}

/**
 * BeforeAfter — Slider de comparaison avant/après du Design System msyx.fr
 * (`divers.html` #before-after, calque `initBeforeAfter` —
 * `shared/components.js:3792-3870`).
 *
 * Émet le markup canonique `.before-after` (`components/media.css`) :
 * ```html
 * <div class="before-after">
 *   <div class="before-after-before" style="clip-path: inset(0 50% 0 0)">…</div>
 *   <div class="before-after-after">…</div>
 *   <div class="before-after-handle" role="separator" tabindex="0"
 *        aria-orientation="vertical" aria-valuemin="5" aria-valuemax="95"
 *        aria-valuenow="50" style="left: 50%"></div>
 * </div>
 * ```
 *
 * **Contrat clavier de #836 repris à l'identique** (comparé touche par
 * touche au vanilla, `shared/components.js:3804-3867`) : poignée
 * `role="separator"`, `tabindex="0"`, `aria-orientation="vertical"` (la
 * poignée est une ligne verticale, axe de déplacement `x` — même convention
 * que le gutter de `<SplitPane>` pour `axis==='x'`), `aria-valuemin="5"` /
 * `aria-valuemax="95"` posés une fois, `aria-valuenow` mis à jour à chaque
 * déplacement (`Math.round`). `ArrowLeft`/`ArrowRight` ajustent par pas de
 * **2** (même step que le vanilla), `Home`→`MIN`(5), `End`→`MAX`(95),
 * `preventDefault()` sur les 4 touches gérées.
 *
 * **Position initiale 50% déléguée au CSS** — calque le commentaire vanilla
 * (`shared/components.js:3814-3819`) : `media.css` fixe déjà
 * `.before-after-handle{left:50%}` / `.before-after-before{clip-path:
 * inset(0 50% 0 0)}`. En mode non contrôlé, `defaultPercent` vaut 50 par
 * défaut — le rendu initial pose donc les mêmes valeurs que le CSS, sans
 * qu'aucun style inline supplémentaire ne soit nécessaire avant la première
 * interaction (le style inline est de toute façon posé dès le premier
 * rendu ici, contrairement au vanilla qui ne l'ajoute qu'au premier drag/
 * clavier — divergence sans effet visuel, le style inline reproduit
 * exactement les valeurs CSS par défaut).
 *
 * **Drag réimplémenté en Pointer Events** (calque `<SplitPane>`, #595) : le
 * vanilla délègue à `window.__pointerDrag()`, primitive globale du DS **non
 * disponible** côté React. Comportement reproduit à l'identique —
 * `setPointerCapture`/`releasePointerCapture` sur la poignée, axe `x`
 * uniquement, pourcentage recalculé depuis `getBoundingClientRect()` du
 * conteneur `.before-after` à chaque `pointermove`.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans les handlers (post-hydratation).
 */
export function BeforeAfter({
  before,
  after,
  percent: controlledPercent,
  defaultPercent = 50,
  onChange,
  handleAriaLabel,
  className,
}: BeforeAfterProps) {
  const isControlled = controlledPercent !== undefined;
  const [internalPercent, setInternalPercent] = useState<number>(() =>
    clampPercent(defaultPercent),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingPointerId = useRef<number | null>(null);

  const currentPercent = clampPercent(
    isControlled ? (controlledPercent as number) : internalPercent,
  );

  function applyPercent(next: number): void {
    const clamped = clampPercent(next);
    if (!isControlled) setInternalPercent(clamped);
    onChange?.(clamped);
  }

  function percentFromPoint(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return currentPercent;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    draggingPointerId.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* déjà capturé ou non supporté — best-effort, calque pointer-drag.js */
    }
    event.preventDefault();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (draggingPointerId.current !== event.pointerId) return;
    applyPercent(percentFromPoint(event.clientX));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>): void {
    if (draggingPointerId.current !== event.pointerId) return;
    draggingPointerId.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* déjà relâché — best-effort */
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const step = 2;
    // Base arrondie (calque exact `parseFloat(handle.getAttribute('aria-valuenow'))`,
    // shared/components.js:3852) — pas `currentPercent` brut : après un drag
    // sur une valeur fractionnaire, le vanilla repart de la valeur ARIA déjà
    // arrondie, pas de la position exacte du pointeur.
    const base = Math.round(currentPercent);
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applyPercent(base - step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applyPercent(base + step);
    } else if (event.key === "Home") {
      event.preventDefault();
      applyPercent(MIN);
    } else if (event.key === "End") {
      event.preventDefault();
      applyPercent(MAX);
    }
  }

  const rootClasses = ["before-after", className].filter(Boolean).join(" ");
  const beforeStyle: CSSProperties = {
    clipPath: `inset(0 ${100 - currentPercent}% 0 0)`,
  };
  const handleStyle: CSSProperties = { left: `${currentPercent}%` };

  return (
    <div ref={containerRef} className={rootClasses}>
      <div className="before-after-after">{after}</div>
      <div className="before-after-before" style={beforeStyle}>
        {before}
      </div>
      <div
        className="before-after-handle"
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={Math.round(currentPercent)}
        aria-label={handleAriaLabel}
        style={{ ...handleStyle, touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

BeforeAfter.displayName = "BeforeAfter";
