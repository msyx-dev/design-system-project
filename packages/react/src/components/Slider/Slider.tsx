import { CSSProperties, ChangeEvent, useId } from "react";

export interface SliderProps {
  /** Valeur courante — le parent pilote l'état, aucun état interne. */
  value: number;
  /** Appelé avec la nouvelle valeur numérique au `input`/change du range. */
  onChange: (value: number) => void;
  /** Borne minimale (`min` natif). @default 0 */
  min?: number;
  /** Borne maximale (`max` natif). @default 100 */
  max?: number;
  /** Pas d'incrément (`step` natif). @default 1 */
  step?: number;
  /** Libellé affiché dans `.slider-header` (`.input-label`). */
  label?: string;
  /** Affiche la valeur courante dans `.slider-value-display`. */
  showValue?: boolean;
  /** Unité affichée après la valeur (ex. `px`, `%`) quand `showValue`. */
  unit?: string;
  /** Désactive le slider — `.slider-disabled` + attribut natif `disabled`. */
  disabled?: boolean;
  /** Classes additionnelles sur le conteneur `.slider-group`. */
  className?: string;
}

/**
 * Slider — Curseur de sélection de valeur numérique du Design System msyx.fr
 * (`formulaires.html` #slider, variante simple).
 *
 * Émet le markup canonique `.slider-group` / `.slider-header` / `.slider-track`
 * (`components/forms.css`) :
 * ```html
 * <div class="slider-group">
 *   <div class="slider-header">
 *     <label class="input-label" for="...">Opacité</label>
 *     <span class="slider-value-display">75</span>
 *   </div>
 *   <input class="slider-track" type="range" min="0" max="100" value="75"
 *          style="--slider-fill: 75%">
 * </div>
 * ```
 *
 * **Contrôlé** : `value`/`onChange` passthrough, aucun état interne.
 *
 * **État critique — `--slider-fill`** : le remplissage visuel du track N'EST
 * PAS une classe CSS mais une custom property inline consommée par le
 * gradient de `.slider-track` (`forms.css`). Recalculée à chaque render à
 * partir de `value`/`min`/`max` et réémise en `style` — calque
 * `updateFill()` de `initSliders` (`shared/components.js`). Sans ce
 * recalcul le remplissage ne suit pas les changements de valeur (piège
 * équivalent à une classe d'état manquante, cf. bug ActionMenu `.open`).
 *
 * Ne couvre que la variante simple (une poignée). La variante duale
 * (`.slider-dual` + input numérique compagnon) n'est pas portée par ce
 * composant.
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue,
  unit,
  disabled,
  className,
}: SliderProps) {
  const generatedId = useId();
  const inputId = generatedId;

  const pct = ((value - min) / (max - min)) * 100;
  const trackStyle = {
    "--slider-fill": `${pct}%`,
  } as CSSProperties;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  const groupClasses = [
    "slider-group",
    disabled ? "slider-disabled" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = Boolean(label) || Boolean(showValue);

  return (
    <div className={groupClasses}>
      {hasHeader && (
        <div className="slider-header">
          {label && (
            <label className="input-label" htmlFor={inputId}>
              {label}
            </label>
          )}
          {showValue && (
            <span className="slider-value-display">
              {value}
              {unit}
            </span>
          )}
        </div>
      )}
      <input
        id={inputId}
        className="slider-track"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={trackStyle}
        onChange={handleChange}
      />
    </div>
  );
}

Slider.displayName = "Slider";
