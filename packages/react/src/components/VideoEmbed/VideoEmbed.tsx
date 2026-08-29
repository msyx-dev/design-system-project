import {
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
  useState,
} from "react";

/**
 * Glyphe "play" — copie fidèle de `<symbol id="i-zap">` du sprite Lucide
 * self-hosted (`shared/icons/sprite.svg:60`, calque `divers.html:276`).
 * Absent de `IconName` (`packages/react/src/icons/Icon.tsx`, glyphes
 * consommés par d'autres composants uniquement) — inline localement plutôt
 * que d'étendre le primitif partagé pour un seul consommateur, même
 * approche que `StarIcon` dans `<Rating>` (#874).
 */
function PlayIcon(): ReactElement {
  return (
    <svg
      className="icon icon--lg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

export interface VideoEmbedProps {
  /** URL de l'iframe (calque `data-src`) — YouTube/Vimeo `/embed/…`. */
  src: string;
  /** `aria-label` du lecteur (`.video-embed`) ET `title` de l'iframe. @default "Lecteur video" */
  label?: string;
  /** `aria-label` de la façade cliquable avant chargement. @default "Lancer la lecture" */
  playLabel?: string;
  /** Titre affiché dans `.video-card-title` — active la variante `.video-card` si fourni. */
  cardTitle?: ReactNode;
  /** Description affichée dans `.video-card-desc` (ignorée sans `cardTitle`). */
  cardDescription?: ReactNode;
  /** Classes additionnelles sur le conteneur racine (`.video-embed` ou `.video-card`). */
  className?: string;
}

/**
 * VideoEmbed — Lecteur vidéo à chargement différé du Design System msyx.fr
 * (`divers.html` #video-embed, calque `initVideoEmbeds` —
 * `shared/components.js:3754-3790`).
 *
 * Émet le markup canonique `.video-embed` (`components/media.css`) :
 * ```html
 * <div class="video-embed" aria-label="Lecteur video">
 *   <div class="video-embed-overlay" role="button" tabindex="0" aria-label="Lancer la lecture">
 *     <div class="video-embed-play"><svg class="icon icon--lg">…</svg></div>
 *   </div>
 *   <!-- iframe injecté seulement après activation -->
 * </div>
 * ```
 *
 * **Chargement différé au clic — préservé à l'identique** : l'iframe n'est
 * montée qu'après activation de la façade `.video-embed-overlay` (clic ou
 * `Entrée`/`Espace`, calque `activate()`). Aucun `<iframe>` n'entre dans la
 * page tant que l'utilisateur n'a pas explicitement demandé la lecture —
 * monter l'iframe au montage du composant annulerait le bénéfice de
 * performance et ferait entrer un tiers dans la page sans action de
 * l'utilisateur.
 *
 * **Idempotence** (calque le garde `embed.classList.contains('loaded')`,
 * #744 vague 18) : `activate()` est un no-op une fois `loaded` — un
 * clavier suivi d'un clic (ou double-déclenchement) ne monte jamais deux
 * `<iframe>`.
 *
 * `?autoplay=1` ajouté à l'URL à l'activation (calque exact), `allow`/
 * `allowFullScreen` posés à l'identique.
 *
 * **Variante carte** (`cardTitle` fourni) : enveloppe dans `.video-card` +
 * `.video-card-body` (`.video-card-title`/`.video-card-desc`) — calque
 * `divers.html:283-294`.
 *
 * SSR-safe : aucun accès à `document`/`window`, l'état `loaded` est purement
 * local (`useState`).
 */
export function VideoEmbed({
  src,
  label = "Lecteur video",
  playLabel = "Lancer la lecture",
  cardTitle,
  cardDescription,
  className,
}: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  function activate(): void {
    if (loaded) return;
    setLoaded(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  }

  const embedClasses = [
    "video-embed",
    loaded ? "loaded" : null,
    cardTitle === undefined ? className : null,
  ]
    .filter(Boolean)
    .join(" ");

  const embed = (
    <div className={embedClasses} aria-label={label}>
      {!loaded && (
        <div
          className="video-embed-overlay"
          role="button"
          tabIndex={0}
          aria-label={playLabel}
          onClick={activate}
          onKeyDown={handleKeyDown}
        >
          <div className="video-embed-play" aria-hidden="true">
            <PlayIcon />
          </div>
        </div>
      )}
      {loaded && (
        <iframe
          src={`${src}?autoplay=1`}
          title={label}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      )}
    </div>
  );

  if (cardTitle === undefined) {
    return embed;
  }

  const cardClasses = ["video-card", className].filter(Boolean).join(" ");
  return (
    <div className={cardClasses}>
      {embed}
      <div className="video-card-body">
        <div className="video-card-title">{cardTitle}</div>
        {cardDescription !== undefined && (
          <div className="video-card-desc">{cardDescription}</div>
        )}
      </div>
    </div>
  );
}

VideoEmbed.displayName = "VideoEmbed";
