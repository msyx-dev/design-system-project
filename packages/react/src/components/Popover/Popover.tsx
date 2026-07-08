import { ReactNode, useEffect, useId, useRef, useState } from "react";

export type PopoverPosition = "top" | "bottom" | "left" | "right";

export interface PopoverProps {
  /** Contenu du déclencheur — rendu à l'intérieur du `<button>`. */
  trigger: ReactNode;
  /** Contenu riche du panneau `.popover` (h4 + p + boutons…). */
  children: ReactNode;
  /**
   * Position du panneau → modifier CSS.
   * `"top"` (défaut) n'émet AUCUN modifier (état par défaut du CSS DS) ;
   * `"bottom"`/`"left"`/`"right"` émettent `.popover--{position}`.
   */
  position?: PopoverPosition;
  /**
   * Ouverture contrôlée. Si fourni, le composant est piloté par le parent
   * (aucun état interne) — pense à câbler `onOpenChange`. Sinon le composant
   * est non-contrôlé et gère son état via `defaultOpen`.
   */
  open?: boolean;
  /** État d'ouverture initial en mode non-contrôlé. @default false */
  defaultOpen?: boolean;
  /** Notifie tout changement d'état d'ouverture (contrôlé ET non-contrôlé). */
  onOpenChange?: (open: boolean) => void;
  /** Ferme au clic hors du composant. @default true */
  closeOnOutsideClick?: boolean;
  /** Ferme sur `Escape` (+ restaure le focus sur le déclencheur). @default true */
  closeOnEscape?: boolean;
  /** Sémantique du panneau. @default "dialog" */
  role?: "dialog" | "tooltip";
  /** `aria-label` du panneau (recommandé pour un panneau `role="dialog"`). */
  label?: string;
  /** Classes additionnelles sur le conteneur `.popover-wrap`. */
  className?: string;
  /**
   * Classes additionnelles sur le panneau `.popover`. Point d'exposition de
   * l'override de largeur des popovers horizontaux (`left`/`right`) : le CSS DS
   * impose `min-width: 240px`, la démo vanilla le réduit à `160px` en inline —
   * passer ici une classe utilitaire de largeur reproduit ce réglage.
   * NE PAS écraser la position ni la flèche `::after` (100% CSS).
   */
  panelClassName?: string;
}

/**
 * Popover — panneau flottant riche du Design System msyx.fr
 * (`overlays.html` section #tooltip « Tooltip & Popover »,
 * `components/overlays.css` bloc POPOVER).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="popover-wrap">
 *   <button aria-haspopup="dialog" aria-expanded="false" aria-controls="…">Plus d'info</button>
 *   <div id="…" class="popover popover--bottom open" role="dialog" aria-label="…">
 *     <h4>…</h4><p>…</p>
 *   </div>
 * </div>
 * ```
 *
 * **État critique — `.open`** : le panneau `.popover` est TOUJOURS monté ; la
 * visibilité est pilotée à 100% par la classe `.open` (base `opacity:0` +
 * `pointer-events:none` → `.open` = `opacity:1` + `pointer-events:auto`, avec
 * une transition `opacity 0.2s`). Le wrapper pose/retire donc la classe `.open`
 * sans jamais démonter le panneau — reproduire le `{open && <div/>}`
 * d'`<ActionMenu>` ferait perdre le fondu d'entrée/sortie ET rendrait le
 * composant invisible (piège `.open` #612). C'est l'inverse d'ActionMenu, dont
 * le panneau apparaît/disparaît en `display`.
 *
 * **Position** : `top` (défaut) = aucun modifier ; `bottom`/`left`/`right` →
 * `.popover--{position}` (positionnement absolu + flèche `::after` retournée,
 * 100% CSS). La flèche est un pseudo-élément — ne pas tenter de la porter.
 *
 * **Contrôlé ou non** : passer `open` (+ `onOpenChange`) pour piloter depuis le
 * parent ; sinon état interne initialisé par `defaultOpen`. `onOpenChange` est
 * appelé dans les deux modes.
 *
 * **A11y** (au-delà du vanilla, qui n'a qu'un `onclick` inline) :
 * `aria-haspopup="dialog"` (pour `role="dialog"`), `aria-expanded` reflétant
 * l'état, `aria-controls` reliant le déclencheur au panneau, `aria-label` sur le
 * panneau. Fermeture au clic extérieur et sur `Escape` (écoute globale
 * `document`, active uniquement à l'ouverture, nettoyée au démontage / à la
 * fermeture ; `Escape` restaure le focus sur le déclencheur), calquée sur
 * `<ActionMenu>`.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; les listeners
 * globaux vivent dans `useEffect` (post-hydratation).
 */
export function Popover({
  trigger,
  children,
  position = "top",
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  role = "dialog",
  label,
  className,
  panelClassName,
}: PopoverProps) {
  const panelId = useId();
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const setOpenState = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Fermeture au clic extérieur + Escape — active uniquement à l'ouverture.
  useEffect(() => {
    if (!currentOpen) return;
    if (!closeOnOutsideClick && !closeOnEscape) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!closeOnOutsideClick) return;
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpenState(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!closeOnEscape) return;
      if (event.key === "Escape") {
        setOpenState(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOpen, closeOnOutsideClick, closeOnEscape]);

  const wrapClasses = ["popover-wrap", className].filter(Boolean).join(" ");
  const panelClasses = [
    "popover",
    position !== "top" ? `popover--${position}` : null,
    currentOpen ? "open" : null,
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClasses} ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup={role === "dialog" ? "dialog" : undefined}
        aria-expanded={currentOpen}
        aria-controls={panelId}
        onClick={() => setOpenState(!currentOpen)}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        className={panelClasses}
        role={role}
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

Popover.displayName = "Popover";
