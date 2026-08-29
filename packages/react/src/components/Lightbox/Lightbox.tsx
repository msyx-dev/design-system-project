import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Icon } from "../../icons/Icon";

export interface LightboxImage {
  /** Identifiant unique (clé React). */
  id: string;
  /** URL de l'image plein format (calque `data-full`). */
  src: string;
  /** Légende — alimente `.lightbox-caption` ET l'`alt` de l'image (calque `data-caption`). */
  caption?: string;
  /** Contenu de la vignette `.lightbox-trigger` — libre, composé par le consommateur. */
  thumbnail: ReactNode;
  /** `aria-label` de la vignette. @default `Ouvrir l'image {n}` */
  triggerLabel?: string;
}

export interface LightboxProps {
  /** Galerie d'images, dans l'ordre d'affichage/navigation. */
  images: LightboxImage[];
  /** `aria-label` de l'overlay `role="dialog"`. @default "Visionneuse d'images" */
  overlayLabel?: string;
  /** `aria-label` du bouton de fermeture. @default "Fermer" */
  closeLabel?: string;
  /** Classes additionnelles sur `.lightbox-gallery`. */
  className?: string;
}

/**
 * Lightbox — Galerie + visionneuse plein écran du Design System msyx.fr
 * (`divers.html` #lightbox, calque `initLightbox` —
 * `shared/components.js:2660-2836`).
 *
 * Émet le markup canonique `.lightbox-gallery`/`.lightbox-overlay`
 * (`components/media.css`) :
 * ```html
 * <div class="lightbox-gallery">
 *   <div class="lightbox-trigger" tabindex="0" aria-label="Ouvrir l'image 1">…</div>
 * </div>
 * <!-- portail document.body -->
 * <div class="lightbox-overlay lb-open" role="dialog" aria-modal="true" aria-label="Visionneuse d'images">
 *   <div class="lightbox-img-wrap"><img class="lightbox-img lb-img-visible" …></div>
 *   <button class="lightbox-close" aria-label="Fermer">✕</button>
 *   <button class="lightbox-btn lightbox-prev" aria-label="Image precedente">…</button>
 *   <button class="lightbox-btn lightbox-next" aria-label="Image suivante">…</button>
 *   <div class="lightbox-caption">…</div>
 *   <div class="lightbox-counter">1 / 3</div>
 * </div>
 * ```
 *
 * **Non-contrôlé** : état d'ouverture/index interne (`useState`), comme le
 * vanilla (aucune API externe n'existe côté DS pour piloter l'overlay
 * partagé) — même parti pris que `<ActionMenu>`.
 *
 * **Clavier global (calque exact, `shared/components.js:2806-2811`)** :
 * `Escape` ferme, `ArrowLeft`/`ArrowRight` naviguent — écoute `document`,
 * active uniquement tant que l'overlay est ouvert.
 *
 * **Clic sur l'overlay hors image ferme** (`e.target === overlay`, calque
 * exact) ; les boutons prev/next stoppent la propagation avant de naviguer.
 *
 * **Restitution du focus (WAI-ARIA, ajoutée vs le vanilla)** : le vanilla
 * (`openLightbox`/`closeLightbox`, lignes citées ci-dessus) pose bien le
 * focus sur `.lightbox-close` à l'ouverture, mais ne restaure **jamais** le
 * focus vers la vignette déclenchante à la fermeture (aucun
 * `createFocusRestore()`/`attachFocusRestore()` câblé sur cette visionneuse
 * — confirmé : `closeLightbox()` ne touche à aucun focus). C'est le défaut
 * classique de ce type de composant. La visionneuse est fonctionnellement
 * une surface modale (`role="dialog"` `aria-modal="true"`, déjà posés côté
 * vanilla) : le wrapper applique le **même contrat WAI-APG que `<Modal>`/
 * `<BottomSheet>`** déjà établi ailleurs dans le DS — capture de
 * `document.activeElement` (le déclencheur réel, clic ou clavier) juste
 * avant l'ouverture, restauration de son focus à la fermeture (si toujours
 * attaché au DOM). Testé explicitement (`Lightbox.test.tsx`).
 *
 * **Focus à l'ouverture** : `.lightbox-close` reçoit le focus (calque exact
 * `btnClose.focus()`), pas la première image.
 *
 * **Fade-out avant démontage de l'image** (calque le `setTimeout(…, 250)`
 * de `closeLightbox`) : l'`<img>` reste montée 250ms après la fermeture
 * (classe `lb-open` retirée immédiatement, l'image suit sa transition CSS)
 * avant d'être retirée du DOM — évite qu'une réouverture sur une autre image
 * "saute" sans transition.
 *
 * **Portail sur `document.body`** (calque `document.body.appendChild(overlay)`,
 * `.lightbox-overlay` étant `position: fixed`) — même mécanisme que
 * `<Toast>`/`<Dropdown>`/`<ActionMenu>`.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect`/handlers (post-hydratation).
 */
export function Lightbox({
  images,
  overlayLabel = "Visionneuse d'images",
  closeLabel = "Fermer",
  className,
}: LightboxProps) {
  const total = images.length;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState<number | null>(null);
  const [imgVisible, setImgVisible] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  const isOpen = openIndex !== null;

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  // Lock du scroll body — calque `document.body.style.overflow = 'hidden'`
  // en ouverture / `''` en fermeture.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Focus sur le bouton fermer à l'ouverture — calque `btnClose.focus()`.
  useEffect(() => {
    if (isOpen) closeBtnRef.current?.focus();
  }, [isOpen]);

  // Clavier global — calque exact (Escape/ArrowLeft/ArrowRight), actif
  // uniquement tant que l'overlay est ouvert.
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openIndex, total]);

  function openAt(i: number, trigger: HTMLElement): void {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    restoreFocusRef.current = trigger;
    setImgVisible(false);
    setDisplayedIndex(i);
    setOpenIndex(i);
  }

  function close(): void {
    setOpenIndex(null);
    const trigger = restoreFocusRef.current;
    if (trigger && document.contains(trigger)) {
      trigger.focus();
    }
    restoreFocusRef.current = null;
    clearTimerRef.current = window.setTimeout(() => {
      setDisplayedIndex(null);
      clearTimerRef.current = null;
    }, 250);
  }

  function navigate(dir: 1 | -1): void {
    if (openIndex === null) return;
    const newIdx = openIndex + dir;
    if (newIdx < 0 || newIdx >= total) return;
    setImgVisible(false);
    setOpenIndex(newIdx);
    setDisplayedIndex(newIdx);
  }

  function handleOverlayClick(event: ReactMouseEvent<HTMLDivElement>): void {
    if (event.target === overlayRef.current) close();
  }

  function handleTriggerKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    i: number,
  ): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAt(i, event.currentTarget);
    }
  }

  const current = displayedIndex !== null ? images[displayedIndex] : null;
  const hidePrev = total <= 1 || openIndex === 0;
  const hideNext = total <= 1 || openIndex === total - 1;
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <>
      <div
        className={["lightbox-gallery", className].filter(Boolean).join(" ")}
      >
        {images.map((image, i) => (
          <div
            key={image.id}
            className="lightbox-trigger"
            tabIndex={0}
            aria-label={image.triggerLabel ?? `Ouvrir l'image ${i + 1}`}
            onClick={(event) => openAt(i, event.currentTarget)}
            onKeyDown={(event) => handleTriggerKeyDown(event, i)}
          >
            {image.thumbnail}
          </div>
        ))}
      </div>
      {portalTarget &&
        total > 0 &&
        createPortal(
          <div
            ref={overlayRef}
            className={["lightbox-overlay", isOpen ? "lb-open" : null]
              .filter(Boolean)
              .join(" ")}
            role="dialog"
            aria-modal="true"
            aria-label={overlayLabel}
            onClick={handleOverlayClick}
          >
            <div className="lightbox-img-wrap">
              {current && (
                <img
                  key={displayedIndex}
                  className={[
                    "lightbox-img",
                    imgVisible ? "lb-img-visible" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  src={current.src}
                  alt={current.caption ?? ""}
                  onLoad={() => setImgVisible(true)}
                  onError={() => setImgVisible(true)}
                />
              )}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className="lightbox-close"
              aria-label={closeLabel}
              onClick={close}
            >
              &#10005;
            </button>
            <button
              type="button"
              className={[
                "lightbox-btn",
                "lightbox-prev",
                hidePrev ? "lb-hidden" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label="Image precedente"
              onClick={(event) => {
                event.stopPropagation();
                navigate(-1);
              }}
            >
              <Icon name="chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={[
                "lightbox-btn",
                "lightbox-next",
                hideNext ? "lb-hidden" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label="Image suivante"
              onClick={(event) => {
                event.stopPropagation();
                navigate(1);
              }}
            >
              <Icon name="chevron-right" aria-hidden="true" />
            </button>
            <div
              className="lightbox-caption"
              style={{ display: current?.caption ? undefined : "none" }}
            >
              {current?.caption ?? ""}
            </div>
            <div
              className="lightbox-counter"
              style={{ display: total > 1 ? undefined : "none" }}
            >
              {displayedIndex !== null
                ? `${displayedIndex + 1} / ${total}`
                : ""}
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
}

Lightbox.displayName = "Lightbox";
