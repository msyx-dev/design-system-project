import {
  CSSProperties,
  ReactNode,
  TouchEvent,
  useEffect,
  useRef,
  useState,
} from "react";

export interface BottomSheetProps {
  /** Contrôlé par le parent — bascule `.open` sur `.bottom-sheet` ET `.bottom-sheet-overlay`. */
  open: boolean;
  /** Appelé pour toute demande de fermeture : ESC, clic overlay, bouton close, swipe-down > seuil. */
  onClose: () => void;
  /** Titre `<h3>` dans `.bottom-sheet-header`. */
  title?: ReactNode;
  /** Contenu de `.bottom-sheet-content` (tabindex=0 conservé). */
  children: ReactNode;
  /** aria-label du `role="dialog"` aria-modal. @default "Panneau" */
  ariaLabel?: string;
  /** aria-label du bouton `.bottom-sheet-close`. @default "Fermer" */
  closeLabel?: string;
  /** Afficher `.bottom-sheet-handle-wrap` + `.bottom-sheet-handle`. @default true */
  showHandle?: boolean;
  /** Activer le drag tactile swipe-down. @default true */
  swipeToClose?: boolean;
  /** Distance px avant fermeture au relâchement (iso-vanilla). @default 100 */
  swipeThreshold?: number;
  /** Classes additionnelles sur `.bottom-sheet-content`. */
  contentClassName?: string;
  /** Classes additionnelles sur `.bottom-sheet`. */
  className?: string;
}

/**
 * BottomSheet — Panneau slide-up depuis le bas du Design System msyx.fr
 * (`overlays.html` #bottom-sheet, calque `initBottomSheet` —
 * `shared/components.js:1896-1988`).
 *
 * Émet les DEUX frères canoniques `.bottom-sheet-overlay` + `.bottom-sheet`
 * (`components/overlays.css:299-322`) :
 * ```html
 * <div class="bottom-sheet-overlay open"></div>
 * <div class="bottom-sheet open" role="dialog" aria-modal="true" aria-label="Panneau">
 *   <div class="bottom-sheet-handle-wrap"><div class="bottom-sheet-handle"></div></div>
 *   <div class="bottom-sheet-header">
 *     <h3>{title}</h3>
 *     <button class="bottom-sheet-close" aria-label="Fermer">×</button>
 *   </div>
 *   <div class="bottom-sheet-content" tabindex="0">{children}</div>
 * </div>
 * ```
 *
 * **Contrôlé** : le parent pilote `open`/`onClose`, aucun état interne sur la
 * donnée métier. Seul le drag tactile transitoire (transform inline pendant le
 * suivi du doigt) est un état local, comme le vanilla qui manipule son propre
 * `panel.style`.
 *
 * **État critique — double `.open` synchrone** : le vanilla
 * (`openSheet`/`closeSheet`, `components.js:1902/1911`) pose ET retire `.open`
 * sur `.bottom-sheet` ET `.bottom-sheet-overlay` ENSEMBLE. Sans `.open` sur le
 * panneau il reste hors-écran (`transform: translateY(100%)`) ; sans `.open`
 * sur l'overlay le fond n'est ni assombri (`opacity`) ni cliquable
 * (`pointer-events`). Piège capitalisé `<ActionMenu>` `.open` (#612) : monter
 * le markup sans la classe rend le composant invisible/cassé. Les deux classes
 * sont donc pilotées par le seul prop `open`.
 *
 * **Le markup reste TOUJOURS monté** — seule la classe `.open` bascule — pour
 * préserver la transition CSS slide-up/slide-down (`transform 0.3s`,
 * `overlays.css:303`). Démonter au close casserait l'animation de sortie.
 *
 * **Styles inline de drag (piège `FileUpload .progress-fill`)** : pendant le
 * swipe le vanilla écrit `panel.style.transform = translateY(<delta>px)` et
 * `panel.style.transition = 'none'` INLINE (aucune règle CSS ne les porte,
 * `components.js:1963/1971`), puis les vide sur touchend (`1978-1979`). Répliqué
 * ici via un state de drag appliqué en `style={}` inline ; le reset au relâché
 * est load-bearing (un transform résiduel gèlerait le panneau et écraserait le
 * `translateY(0)` de `.open`).
 *
 * **Focus restore WAI-APG (WCAG 2.4.3)** — amélioration vs vanilla (dont le
 * `panel.focus()` est un no-op faute de tabindex, `components.js:1904`) :
 * capture `document.activeElement` à l'ouverture, focus initial sur le bouton
 * close, puis restauration du trigger à la fermeture (si toujours dans le DOM).
 * Pas de focus-trap (iso-vanilla — le panneau n'en a jamais eu ; à ajouter au
 * niveau produit si requis).
 *
 * **Fermeture** : ESC (listener document actif uniquement quand `open` —
 * évite le bug d'empilement vanilla `components.js:1942` sans garde
 * dataset.bound), clic overlay, bouton close, swipe-down > `swipeThreshold`.
 *
 * **Positionnement** : `.bottom-sheet` est `position: absolute`
 * (`overlays.css:303`) — il s'ancre au premier ancêtre positionné. Le consumer
 * doit fournir un conteneur `position: relative` plein écran (ou surcharger
 * `.bottom-sheet { position: fixed }`) sinon le panneau s'ancre au mauvais
 * parent.
 *
 * SSR-safe : aucun accès `document`/`window` au niveau module ni au render ;
 * tout est en `useEffect`/handlers (post-hydratation).
 *
 * **A11y overlay fermé (vérif adversariale)** : le panneau restant TOUJOURS
 * monté hors écran, ses contrôles (bouton close, contenu tabindex=0)
 * restaient focusables au clavier même `open=false`. Fix : `inert` posé sur
 * l'overlay ET le panneau quand fermé (couvre aussi le contenu consumer
 * arbitraire), `.bottom-sheet-close`/`.bottom-sheet-content` en plus passés
 * en `tabIndex={-1}` (défense en profondeur, déclaratif/testable).
 * `role="dialog"`/`aria-modal` ne sont posés QUE quand `open`.
 */
/** `inert` n'est pas typé par @types/react 18 (ajouté en React 19 types). */
type InertAttr = { inert?: "" };

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  ariaLabel = "Panneau",
  closeLabel = "Fermer",
  showHandle = true,
  swipeToClose = true,
  swipeThreshold = 100,
  contentClassName,
  className,
}: BottomSheetProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Drag tactile : startY/currentY transitoires (pas de rerender),
  // dragTransform/dragging pilotent les styles inline (rerender voulu).
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);
  const [dragTransform, setDragTransform] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Focus restore WAI-APG (WCAG 2.4.3) : capture au open, focus close,
  // restaure le trigger au close (si toujours attaché au DOM).
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      (closeBtnRef.current ?? contentRef.current)?.focus();
      wasOpenRef.current = true;
    } else if (!open && wasOpenRef.current) {
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) {
        trigger.focus();
      }
      triggerRef.current = null;
      wasOpenRef.current = false;
    }
  }, [open]);

  // ESC → fermeture. Listener attaché SEULEMENT quand ouvert (évite
  // l'empilement de listeners du vanilla qui fermait tous les sheets).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!swipeToClose) return;
    startYRef.current = event.touches[0].clientY;
    currentYRef.current = startYRef.current;
    setDragging(true);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!swipeToClose || startYRef.current === null) return;
    currentYRef.current = event.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;
    if (delta > 0) {
      setDragTransform(`translateY(${delta}px)`);
    }
  }

  function handleTouchEnd() {
    if (!swipeToClose || startYRef.current === null) return;
    const delta = (currentYRef.current ?? startYRef.current) - startYRef.current;
    // Reset des styles inline : rend la main à la transition CSS de `.open`.
    setDragging(false);
    setDragTransform(null);
    startYRef.current = null;
    currentYRef.current = null;
    if (delta > swipeThreshold) {
      onClose();
    }
  }

  const overlayClasses = ["bottom-sheet-overlay", open ? "open" : null]
    .filter(Boolean)
    .join(" ");

  const panelClasses = ["bottom-sheet", open ? "open" : null, className]
    .filter(Boolean)
    .join(" ");

  const contentClasses = ["bottom-sheet-content", contentClassName]
    .filter(Boolean)
    .join(" ");

  const panelStyle: CSSProperties = {};
  if (dragging) panelStyle.transition = "none";
  if (dragTransform !== null) panelStyle.transform = dragTransform;

  // Overlay + panneau fermés : `inert` neutralise tout le sous-arbre (focus +
  // annonce AT), y compris le contenu consumer arbitraire (`children`).
  const inertProps: InertAttr = open ? {} : { inert: "" };

  return (
    <>
      <div
        className={overlayClasses}
        aria-hidden="true"
        onClick={onClose}
        {...inertProps}
      />
      <div
        className={panelClasses}
        role={open ? "dialog" : undefined}
        aria-modal={open ? "true" : undefined}
        aria-label={ariaLabel}
        style={panelStyle}
        {...inertProps}
      >
        {showHandle && (
          <div
            className="bottom-sheet-handle-wrap"
            onTouchStart={swipeToClose ? handleTouchStart : undefined}
            onTouchMove={swipeToClose ? handleTouchMove : undefined}
            onTouchEnd={swipeToClose ? handleTouchEnd : undefined}
          >
            <div className="bottom-sheet-handle" />
          </div>
        )}
        <div className="bottom-sheet-header">
          {title != null && <h3>{title}</h3>}
          <button
            ref={closeBtnRef}
            type="button"
            className="bottom-sheet-close"
            aria-label={closeLabel}
            tabIndex={open ? undefined : -1}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div
          ref={contentRef}
          className={contentClasses}
          tabIndex={open ? 0 : -1}
        >
          {children}
        </div>
      </div>
    </>
  );
}

BottomSheet.displayName = "BottomSheet";
