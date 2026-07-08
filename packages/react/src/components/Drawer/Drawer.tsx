import { ReactNode, useEffect, useId, useRef } from "react";

export interface DrawerProps {
  /** Contrôle l'ouverture — le parent pilote l'état, aucun état interne. */
  open: boolean;
  /**
   * Appelé pour toute demande de fermeture (clic overlay, bouton close, ESC).
   * Le parent doit repasser `open={false}` en réponse.
   */
  onClose: () => void;
  /** Titre affiché dans le `.drawer-header` (`<h3>`) et lié via `aria-labelledby`. */
  title?: ReactNode;
  /** Contenu du `.drawer-body`. */
  children: ReactNode;
  /** Slot boutons pied `.drawer-footer` (optionnel). */
  actions?: ReactNode;
  /** Label accessible du bouton de fermeture (`.drawer-close`). @default "Fermer" */
  closeLabel?: string;
  /**
   * Mode plein-écran : ajoute `.drawer-overlay--fullscreen` +
   * `.drawer-panel--fullscreen` (position `fixed`, recouvre le viewport,
   * z-index 200/201). `false` = drawer contenu dans son parent positionné
   * (mode demo-preview `.drawer-preview` position:relative). @default true
   */
  fullscreen?: boolean;
  /**
   * Retire le padding par défaut du `.drawer-body` (`padding: 0` inline) pour
   * un contenu full-bleed (ex. `.list`). Le CSS DS ne fournit pas de classe
   * flush — le style est donc posé INLINE (calque de la variante liste vanilla
   * `overlays.html` #drawer demo-2 : `<div class="drawer-body" style="padding:0">`).
   */
  flush?: boolean;
  /** Classes additionnelles sur le `.drawer-body`. */
  bodyClassName?: string;
  /** Classes additionnelles sur le `.drawer-panel`. */
  className?: string;
  /** id du `.drawer-panel`. */
  id?: string;
}

/**
 * Drawer — Panneau glissant latéral du Design System msyx.fr
 * (`overlays.html` #drawer, `components/overlays.css:277-291`).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="drawer-overlay open drawer-overlay--fullscreen"></div>
 * <div class="drawer-panel open drawer-panel--fullscreen"
 *      role="dialog" aria-modal="true" aria-labelledby="…">
 *   <div class="drawer-header">
 *     <h3 id="…">Titre</h3>
 *     <button class="drawer-close" aria-label="Fermer">×</button>
 *   </div>
 *   <div class="drawer-body">{children}</div>
 *   <div class="drawer-footer">{actions}</div>
 * </div>
 * ```
 *
 * **Contrôlé** : le parent pilote `open`/`onClose`, aucun état interne.
 *
 * **État critique — `.open` sur DEUX éléments** : le prop `open` toggle la
 * classe `.open` SIMULTANÉMENT sur l'overlay ET le panneau. Sans `.open`,
 * l'overlay est `opacity:0` + `pointer-events:none` (invisible ET non
 * cliquable) et le panneau est `transform:translateX(100%)` (hors écran à
 * droite). Oublier l'un des deux = backdrop invisible ou panneau hors écran —
 * même footgun que la classe `.open` manquante d'`<ActionMenu>` (#612). Ici
 * un seul prop `open` pilote les deux, impossible à désynchroniser.
 *
 * Les deux éléments sont TOUJOURS montés (comme le vanilla) pour que les
 * transitions CSS `opacity`/`transform` jouent à l'ouverture ET à la
 * fermeture — un montage conditionnel casserait l'animation de sortie.
 *
 * **Modifieur structurel `--fullscreen`** (défaut, `fullscreen=true`) : bascule
 * overlay et panneau en `position:fixed` (recouvre le viewport, z-index
 * 200/201) — requis en usage réel. `fullscreen={false}` garde le drawer dans
 * le flux d'un parent positionné (mode demo `.drawer-preview`).
 *
 * **Focus restore WAI-APG (WCAG 2.4.3)** — calque `attachFocusRestore`
 * (`shared/components.js`, cf. Modal) : à l'ouverture, capture
 * `document.activeElement` puis déplace le focus sur le bouton de fermeture ;
 * à la fermeture, restaure le focus sur le déclencheur (si toujours dans le
 * DOM). Le vanilla n'a AUCUN focus trap — on ajoute l'intention canonique
 * (Escape + focus restore), pas le trap complet.
 *
 * **Fermeture** : clic overlay, bouton `.drawer-close`, touche `Escape`
 * (écoute globale `document`, active uniquement quand `open`).
 *
 * **Piège padding liste** : `flush` pose `padding: 0` INLINE sur le
 * `.drawer-body` (le CSS ne fournit pas de classe flush) — indispensable pour
 * un contenu full-bleed type `.list`. Sinon `bodyClassName` pour du custom.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect` (post-hydratation).
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  actions,
  closeLabel = "Fermer",
  fullscreen = true,
  flush,
  bodyClassName,
  className,
  id,
}: DrawerProps) {
  const titleId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus restore WAI-APG (WCAG 2.4.3) : capture le déclencheur à l'ouverture,
  // déplace le focus dans le panneau (bouton close), restaure à la fermeture.
  useEffect(() => {
    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      closeButtonRef.current?.focus();
    } else {
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) {
        trigger.focus();
      }
      triggerRef.current = null;
    }
  }, [open]);

  // Escape ferme le drawer — écoute globale active uniquement quand `open`
  // (le vanilla div n'a pas de <dialog> natif, on câble l'ESC manuellement).
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const overlayClasses = [
    "drawer-overlay",
    open ? "open" : null,
    fullscreen ? "drawer-overlay--fullscreen" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const panelClasses = [
    "drawer-panel",
    open ? "open" : null,
    fullscreen ? "drawer-panel--fullscreen" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyClasses = ["drawer-body", bodyClassName].filter(Boolean).join(" ");

  return (
    <>
      <div className={overlayClasses} onClick={onClose} />
      <div
        className={panelClasses}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        <div className="drawer-header">
          {title && <h3 id={titleId}>{title}</h3>}
          <button
            type="button"
            ref={closeButtonRef}
            className="drawer-close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className={bodyClasses} style={flush ? { padding: 0 } : undefined}>
          {children}
        </div>
        {actions && <div className="drawer-footer">{actions}</div>}
      </div>
    </>
  );
}

Drawer.displayName = "Drawer";
