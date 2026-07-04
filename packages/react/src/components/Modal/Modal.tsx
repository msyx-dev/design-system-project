import {
  DialogHTMLAttributes,
  MouseEvent,
  ReactNode,
  useEffect,
  useRef,
} from "react";

export interface ModalProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "title" | "children" | "onClose"
> {
  /** Contrôle l'ouverture — le parent gère l'état, aucun état interne. */
  open: boolean;
  /** Appelé pour toute demande de fermeture (ESC, backdrop, bouton close). */
  onClose: () => void;
  /** Titre affiché dans le `.modal-header`. */
  title?: ReactNode;
  /** Contenu du `.modal-body`. */
  children: ReactNode;
  /** Slot boutons pied `.modal-actions` (optionnel). */
  actions?: ReactNode;
  /** Label accessible du bouton de fermeture (défaut "Fermer"). */
  closeLabel?: string;
}

/**
 * Modal — Dialogue modal du Design System msyx.fr, porté sur `<dialog>` natif.
 *
 * Émet le markup canonique `.modal-dialog` (overlays.css) :
 * ```html
 * <dialog class="modal-dialog">
 *   <header class="modal-header">
 *     {title}
 *     <button class="modal-close" aria-label="Fermer">×</button>
 *   </header>
 *   <div class="modal-body">{children}</div>
 *   <div class="modal-actions">{actions}</div>
 * </dialog>
 * ```
 *
 * **Contrôlé** : le parent pilote `open`/`onClose`, aucun état interne. La
 * synchronisation avec l'API native `<dialog>` (`showModal()`/`close()`) est
 * faite via `useEffect` + `useRef<HTMLDialogElement>`.
 *
 * **Focus restore WAI-APG (WCAG 2.4.3)** — réplique `attachFocusRestore`
 * (`shared/components.js`, issue #174) : capture `document.activeElement`
 * juste avant `showModal()`, restaure `trigger.focus()` après `close()` (si
 * l'élément est toujours attaché au DOM). Idempotent (une seule capture par
 * cycle open→close).
 *
 * **Fermeture** : ESC natif (le `<dialog>` émet `cancel` puis `close`), clic
 * sur le backdrop (clic direct sur l'élément `<dialog>` hors contenu), et le
 * bouton `.modal-close`. Tous convergent vers l'événement natif `close` du
 * dialog, écouté pour propager `onClose` — couvre ESC sans logique dupliquée.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect` (post-hydratation).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  closeLabel = "Fermer",
  className,
  ...rest
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Synchronise `open` avec l'API native <dialog>, avec capture du trigger
  // pour le focus restore WAI-APG (WCAG 2.4.3).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        triggerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Écoute l'événement natif `close` (déclenché par ESC, .close(), ou
  // requestClose()) pour propager onClose et restaurer le focus — couvre
  // ESC sans logique dupliquée côté React.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) {
        trigger.focus();
      }
      triggerRef.current = null;
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Clic sur le backdrop : le clic natif atterrit sur l'élément <dialog>
  // lui-même (pas sur .modal-body/.modal-header) quand il cible la zone hors
  // contenu.
  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      dialogRef.current?.close();
    }
  };

  const classes = ["modal-dialog", className].filter(Boolean).join(" ");

  return (
    <dialog
      ref={dialogRef}
      className={classes}
      onClick={handleDialogClick}
      {...rest}
    >
      <header className="modal-header">
        {title}
        <button
          type="button"
          className="modal-close"
          aria-label={closeLabel}
          onClick={() => dialogRef.current?.close()}
        >
          &times;
        </button>
      </header>
      <div className="modal-body">{children}</div>
      {actions && <div className="modal-actions">{actions}</div>}
    </dialog>
  );
}

Modal.displayName = "Modal";
