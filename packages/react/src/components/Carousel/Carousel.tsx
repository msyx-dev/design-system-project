import {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
  useEffect,
  useRef,
} from "react";

import { Icon } from "../../icons/Icon";

export interface CarouselSlide {
  /** Identifiant unique de la diapositive (clé React). */
  id: string;
  /** Contenu de la diapositive (`.carousel-slide`) — libre, composé par le consommateur. */
  content: ReactNode;
}

export interface CarouselProps {
  /** Diapositives, dans l'ordre d'affichage. */
  slides: CarouselSlide[];
  /** Index de la diapositive active — le parent gère l'état, aucun état interne. */
  index: number;
  /** Appelé avec le nouvel index (flèches, pastilles, clavier, swipe, auto-play), déjà borné/bouclé. */
  onIndexChange: (index: number) => void;
  /** Variante visuelle `.carousel--cards` (dots statiques, boutons thème-aware). */
  variant?: "cards";
  /**
   * Intervalle d'auto-play en ms (calque `data-autoplay`). Absent/0 = pas
   * d'auto-play. Suspendu tant que le carousel a le focus ou le pointeur
   * dessus (calque `mouseenter`/`focusin` → `stopAutoplay`).
   */
  autoplayMs?: number;
  /** `aria-label` du `role="region"` (calque `carousel.dataset.label`). @default "Carrousel" */
  label?: string;
  /** Classes additionnelles sur le conteneur `.carousel`. */
  className?: string;
}

/**
 * Carousel — Slider d'images/cartes du Design System msyx.fr
 * (`divers.html` #carousel, calque `initCarousel` — `shared/components.js:1617-1741`).
 *
 * Émet le markup canonique `.carousel` (`components/media.css`) :
 * ```html
 * <div class="carousel" role="region" aria-label="Carrousel" tabindex="0">
 *   <div class="carousel-track" role="list">
 *     <div class="carousel-slide" role="listitem">…</div>
 *   </div>
 *   <button class="carousel-btn carousel-btn-prev" aria-label="Slide precedent">…</button>
 *   <button class="carousel-btn carousel-btn-next" aria-label="Slide suivant">…</button>
 *   <div class="carousel-dots" role="tablist">
 *     <button class="carousel-dot active" role="tab" aria-label="Slide 1 sur 3"></button>
 *   </div>
 * </div>
 * ```
 *
 * **Contrôlé** : le parent pilote `index`/`onIndexChange`, aucun état interne
 * sur la position. La piste se déplace via `transform: translateX(-{index*100}%)`
 * sur `.carousel-track` (calque `track.style.transform`).
 *
 * **Bouclage** : flèches, pastilles, clavier et swipe bouclent (`((i % total)
 * + total) % total`, calque `goTo()`) — jamais bloqués aux bornes.
 *
 * **Clavier** : `ArrowLeft`/`ArrowRight` sur le conteneur (`role="region"`,
 * `tabindex="0"`) déplacent d'une diapositive — calque exact du listener
 * `keydown` vanilla posé sur `.carousel`.
 *
 * **Swipe tactile** : `touchstart`/`touchmove`/`touchend`, seuil 50px,
 * seulement si le déplacement horizontal domine le vertical — calque exact
 * du vanilla (y compris le `preventDefault()` conditionnel sur `touchmove`
 * pour ne pas bloquer le scroll vertical de la page).
 *
 * **Auto-play** (`autoplayMs`) : `setInterval` avançant d'une diapositive,
 * suspendu tant que la souris survole le conteneur ou qu'un descendant a le
 * focus (`mouseenter`/`focusin` → pause, `mouseleave`/`focusout` hors
 * conteneur → reprise) — calque exact `startAutoplay`/`stopAutoplay`.
 *
 * SSR-safe : aucun accès à `document`/`window` hors handlers/effets.
 */
export function Carousel({
  slides,
  index,
  onIndexChange,
  variant,
  autoplayMs,
  label = "Carrousel",
  className,
}: CarouselProps) {
  const total = slides.length;
  const touchStart = useRef<{ x: number; y: number; moved: boolean } | null>(
    null,
  );
  const paused = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function goTo(next: number): void {
    if (total === 0) return;
    onIndexChange(((next % total) + total) % total);
  }

  // Auto-play — calque startAutoplay/stopAutoplay : intervalle recréé à
  // chaque changement d'index (rejoue le délai complet, comme le
  // setInterval vanilla qui repart de la même fonction goTo(current + 1)).
  useEffect(() => {
    if (!autoplayMs) return;
    const timer = window.setInterval(() => {
      if (paused.current) return;
      goTo(index + 1);
    }, autoplayMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayMs, index, total]);

  function handleMouseEnter(): void {
    paused.current = true;
  }
  function handleMouseLeave(): void {
    paused.current = false;
  }
  function handleFocus(): void {
    paused.current = true;
  }
  function handleBlur(event: ReactFocusEvent<HTMLDivElement>): void {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
      paused.current = false;
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>): void {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, moved: false };
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>): void {
    const start = touchStart.current;
    if (!start) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (!start.moved && Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault();
    }
    start.moved = true;
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>): void {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      goTo(dx < 0 ? index + 1 : index - 1);
    }
  }

  const rootClasses = [
    "carousel",
    variant === "cards" ? "carousel--cards" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const trackStyle: CSSProperties = {
    transform: `translateX(-${index * 100}%)`,
  };

  return (
    <div
      ref={rootRef}
      className={rootClasses}
      role="region"
      aria-label={label}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={autoplayMs ? handleMouseEnter : undefined}
      onMouseLeave={autoplayMs ? handleMouseLeave : undefined}
      onFocus={autoplayMs ? handleFocus : undefined}
      onBlur={autoplayMs ? handleBlur : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="carousel-track" role="list" style={trackStyle}>
        {slides.map((slide) => (
          <div key={slide.id} className="carousel-slide" role="listitem">
            {slide.content}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="carousel-btn carousel-btn-prev"
        aria-label="Slide precedent"
        onClick={() => goTo(index - 1)}
      >
        <Icon name="chevron-left" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="carousel-btn carousel-btn-next"
        aria-label="Slide suivant"
        onClick={() => goTo(index + 1)}
      >
        <Icon name="chevron-right" aria-hidden="true" />
      </button>
      <div className="carousel-dots" role="tablist">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={["carousel-dot", i === index ? "active" : null]
              .filter(Boolean)
              .join(" ")}
            role="tab"
            aria-label={`Slide ${i + 1} sur ${total}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

Carousel.displayName = "Carousel";
