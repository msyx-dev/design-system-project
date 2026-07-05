import {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface SegmentedControlOption {
  /** Valeur unique de l'option (utilisée pour `value`/`onChange`). */
  value: string;
  /** Libellé affiché dans l'item. */
  label: ReactNode;
  /** Désactive l'option — non sélectionnable, sautée par la navigation clavier. */
  disabled?: boolean;
}

export interface SegmentedControlProps {
  /** Liste des options (ordre d'affichage). */
  options: SegmentedControlOption[];
  /** Valeur active — le parent gère l'état, aucun état interne. */
  value: string;
  /** Appelé avec la nouvelle valeur sélectionnée. */
  onChange: (value: string) => void;
  /** Taille compacte (`.segmented--sm`) ou large (`.segmented--lg`). */
  size?: "sm" | "lg";
  /** Variante subtile — indicateur moins saillant (`.segmented--subtle`). */
  subtle?: boolean;
  /** Label accessible du `role="radiogroup"` (`aria-label`). */
  label?: string;
  /** Classes additionnelles sur le conteneur `.segmented`. */
  className?: string;
}

/**
 * SegmentedControl — Segmented control du Design System msyx.fr
 * (`composants.html` #segmented-control).
 *
 * Émet le markup canonique `.segmented` / `.segmented-item` /
 * `.segmented-indicator` (`components/navigation.css`) :
 * ```html
 * <div class="segmented" role="radiogroup" aria-label="...">
 *   <span class="segmented-indicator" style="transform:translateX(...);width:...px"></span>
 *   <button class="segmented-item active" role="radio" aria-checked="true" tabindex="0">Semaine</button>
 *   <button class="segmented-item" role="radio" aria-checked="false" tabindex="-1">Mois</button>
 * </div>
 * ```
 *
 * **Contrôlé** : le parent pilote `value`/`onChange`, aucun état interne
 * hormis la position mesurée de l'indicateur.
 *
 * **Indicateur glissant** : calque le calcul de `initSegmentedControls`
 * (`shared/components.js`) — `transform: translateX(item.offsetLeft)` +
 * `width: item.offsetWidth` mesurés sur l'item actif via ref, appliqués en
 * style inline de POSITION uniquement (aucune couleur/décoration ajoutée,
 * celles-ci restent portées par `.segmented-indicator` / `.segmented--subtle`
 * dans le CSS DS). Remesuré via `useLayoutEffect` à chaque changement de
 * `value`/`options` pour rester synchrone avec le layout avant paint.
 *
 * **Navigation clavier WAI-ARIA radiogroup** : roving tabindex (`0` sur
 * l'option active, `-1` sinon), ←/→ et ↑/↓ déplacent la sélection en
 * bouclant, sautent les options `disabled`. Activation automatique (la
 * flèche sélectionne directement la nouvelle option et lui donne le focus).
 *
 * SSR-safe : aucun accès à `document`/`window` en dehors des effets
 * (`useLayoutEffect`/refs), qui ne s'exécutent que côté client.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size,
  subtle,
  label,
  className,
}: SegmentedControlProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pendingFocusValueRef = useRef<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>({});

  const enabledOptions = options.filter((option) => !option.disabled);

  useLayoutEffect(() => {
    const activeEl = itemRefs.current[value];
    if (!activeEl) return;
    setIndicatorStyle({
      width: activeEl.offsetWidth,
      transform: `translateX(${activeEl.offsetLeft}px)`,
    });

    const pendingValue = pendingFocusValueRef.current;
    if (pendingValue !== null) {
      pendingFocusValueRef.current = null;
      itemRefs.current[pendingValue]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  const focusAndSelect = (optionValue: string) => {
    pendingFocusValueRef.current = optionValue;
    onChange(optionValue);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    optionValue: string,
  ) => {
    const currentEnabledIndex = enabledOptions.findIndex(
      (option) => option.value === optionValue,
    );
    if (currentEnabledIndex === -1) return;

    let targetIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        targetIndex = (currentEnabledIndex + 1) % enabledOptions.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        targetIndex =
          (currentEnabledIndex - 1 + enabledOptions.length) %
          enabledOptions.length;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = enabledOptions.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = enabledOptions[targetIndex];
    if (target) {
      focusAndSelect(target.value);
    }
  };

  const classes = [
    "segmented",
    size === "sm" ? "segmented--sm" : null,
    size === "lg" ? "segmented--lg" : null,
    subtle ? "segmented--subtle" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="radiogroup" aria-label={label}>
      <span
        className="segmented-indicator"
        style={indicatorStyle}
        aria-hidden="true"
      />
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              itemRefs.current[option.value] = el;
            }}
            type="button"
            className={["segmented-item", isActive ? "active" : null]
              .filter(Boolean)
              .join(" ")}
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

SegmentedControl.displayName = "SegmentedControl";
