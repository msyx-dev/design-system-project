import { KeyboardEvent, useLayoutEffect, useRef, useState } from "react";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  );
}

export interface RatingProps {
  /** Note courante (0 = aucune sélection). Le parent pilote l'état, aucun état interne sur la valeur. */
  value: number;
  /** Nombre total d'étoiles. @default 5 */
  max?: number;
  /**
   * Appelé avec la nouvelle note (clic ou clavier). Absent ⇒ le rating est
   * lecture seule (déduit — cf. prop `readonly` pour forcer explicitement).
   */
  onChange?: (value: number) => void;
  /** Force le mode lecture seule (sinon déduit de l'absence d'`onChange`). */
  readonly?: boolean;
  /** Taille — `.rating--sm` / `.rating--lg`. */
  size?: "sm" | "lg";
  /** `aria-label` du `role="radiogroup"` en mode interactif. @default "Notation" */
  label?: string;
  /** `aria-label` du conteneur en mode lecture seule. @default `Note : {value} sur {max}` */
  readonlyLabel?: string;
  /** Classes additionnelles sur le conteneur `.rating`. */
  className?: string;
}

/**
 * `Rating` — Notation par étoiles du Design System msyx.fr
 * (`composants.html` #rating, calque `initRating` — `shared/components.js:1745-1840`).
 *
 * **Contrat clavier repris à l'identique de #836** (pattern WAI-ARIA APG
 * « Radio Group », même convention que `<SegmentedControl>` #613) :
 * conteneur `role="radiogroup"`, étoiles `role="radio"` + `aria-checked`,
 * roving tabindex (une seule étoile à `tabIndex=0` — celle de la valeur
 * courante, ou la première si `value===0`, exactement `setRoving(currentValue
 * > 0 ? currentValue - 1 : 0)` côté vanilla), ←/→ et ↑/↓ déplacent LA
 * SÉLECTION en bouclant (« sélection suit le focus » — la flèche sélectionne
 * directement la nouvelle étoile et lui donne le focus, pas seulement le
 * focus), `Home`/`End` aux extrémités. Jamais attaché en mode lecture seule
 * (comportement vanilla identique — `isReadonly` empêche le binding).
 *
 * **Mode lecture seule** (`readonly` déduit de l'absence d'`onChange`, ou
 * forcé explicitement) : aucun rôle/tabindex/handler sur les étoiles,
 * conteneur `role="img"` — calque exact du markup vanilla readonly
 * (`composants.html:535`, `<div class="rating rating--readonly" role="img"
 * data-value="4" aria-label="Note : 4 sur 5">`).
 *
 * **Survol** : état interne (`hoverIndex`), n'affecte jamais `value` — les
 * étoiles ≤ `hoverIndex` reçoivent `.hover` (au lieu de `.active`) tant que
 * la souris survole le widget ; jamais posé en lecture seule.
 *
 * **Divergence documentée** (hors contrat clavier — n'affecte ni rôle, ni
 * touche, ni gestion du focus) : le vanilla pose `aria-label="Note {n} sur
 * 5"` sur CHAQUE étoile interactive, `5` **hardcodé** indépendamment du
 * nombre réel d'étoiles rendues (`shared/components.js:1802` — artefact de
 * la démo fixée à 5 étoiles, jamais généralisé). Le wrapper supporte un
 * `max` arbitraire : le label utilise le `max` réellement rendu plutôt que
 * de reproduire le hardcode pour un `max` différent de 5.
 *
 * SSR-safe : aucun accès à `document`/`window` hors refs/effets.
 */
export function Rating({
  value,
  max = 5,
  onChange,
  readonly,
  size,
  label = "Notation",
  readonlyLabel,
  className,
}: RatingProps) {
  const isReadonly = readonly ?? !onChange;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const starRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const pendingFocusRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending !== null) {
      pendingFocusRef.current = null;
      starRefs.current[pending]?.focus();
    }
  }, [value]);

  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const activeIdx = value > 0 ? value - 1 : 0;

  function selectValue(n: number, focusIt: boolean) {
    if (isReadonly || !onChange) return;
    if (focusIt) pendingFocusRef.current = n - 1;
    onChange(n);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>, idx: number) {
    if (isReadonly) return;
    let targetIdx: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        targetIdx = (idx + 1) % stars.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        targetIdx = (idx - 1 + stars.length) % stars.length;
        break;
      case "Home":
        targetIdx = 0;
        break;
      case "End":
        targetIdx = stars.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectValue(targetIdx + 1, true);
  }

  const wrapClasses = [
    "rating",
    size === "sm" ? "rating--sm" : null,
    size === "lg" ? "rating--lg" : null,
    isReadonly ? "rating--readonly" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (isReadonly) {
    return (
      <div
        className={wrapClasses}
        role="img"
        aria-label={readonlyLabel ?? `Note : ${value} sur ${max}`}
        data-value={value}
      >
        {stars.map((n) => (
          <span
            key={n}
            className={["rating-star", n <= value ? "active" : null]
              .filter(Boolean)
              .join(" ")}
          >
            <StarIcon />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={wrapClasses}
      role="radiogroup"
      aria-label={label}
      data-value={value}
      data-max={max}
    >
      {stars.map((n) => {
        const idx = n - 1;
        const isChecked = n === value;

        let stateClass: "active" | "hover" | null = null;
        if (hoverIndex !== null) {
          stateClass = n <= hoverIndex ? "hover" : null;
        } else if (n <= value) {
          stateClass = "active";
        }

        return (
          <span
            key={n}
            ref={(el) => {
              starRefs.current[idx] = el;
            }}
            className={["rating-star", stateClass].filter(Boolean).join(" ")}
            role="radio"
            aria-checked={isChecked}
            aria-label={`Note ${n} sur ${max}`}
            tabIndex={idx === activeIdx ? 0 : -1}
            onMouseOver={() => setHoverIndex(n)}
            onMouseOut={() => setHoverIndex(null)}
            onClick={() => selectValue(n, false)}
            onKeyDown={(event) => handleKeyDown(event, idx)}
          >
            <StarIcon />
          </span>
        );
      })}
    </div>
  );
}

Rating.displayName = "Rating";
