import { ChangeEvent, KeyboardEvent, useId } from "react";

export interface NumberInputProps {
  /** Valeur courante — le parent pilote l'état, aucun état interne. */
  value: number;
  /** Appelé avec la nouvelle valeur numérique (déjà clampée/arrondie au step). */
  onChange: (value: number) => void;
  /** Borne minimale. @default -Infinity (non borné, comme le vanilla sans `data-min`) */
  min?: number;
  /** Borne maximale. @default Infinity (non borné, comme le vanilla sans `data-max`) */
  max?: number;
  /** Pas d'incrément/décrément. @default 1 */
  step?: number;
  /** Libellé accessible — posé en `aria-label` sur le champ (le DS vanilla n'a pas de `.input-label` visible pour ce composant, uniquement des `aria-label` sur les démos). */
  label?: string;
  /** Variante compacte — `.number-input--compact`. */
  compact?: boolean;
  /** Désactive le composant — `.number-input--disabled` sur le wrap + attribut natif `disabled` sur le champ ET les deux boutons. */
  disabled?: boolean;
  /** Classes additionnelles sur le conteneur `.number-input-wrap`. */
  className?: string;
  /** id du champ — sinon généré via `useId`. */
  id?: string;
}

function roundToStep(val: number, step: number): number {
  const inv = 1 / step;
  return Math.round(val * inv) / inv;
}

function clampValue(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * NumberInput — Champ numérique avec boutons +/- du Design System msyx.fr
 * (`formulaires.html` #number-input, calque `initNumberInputs` —
 * `shared/components.js:1449-1509`).
 *
 * Émet le markup canonique `.number-input-wrap` / `.number-input-btn` /
 * `.number-input-field` (`components/forms.css:132-214`) :
 * ```html
 * <div class="number-input-wrap" data-min="1" data-max="99" data-step="1">
 *   <button class="number-input-btn" data-action="dec" aria-label="Diminuer">&#8722;</button>
 *   <input class="number-input-field" type="number" value="1" aria-label="Quantité">
 *   <button class="number-input-btn" data-action="inc" aria-label="Augmenter">&#43;</button>
 * </div>
 * ```
 *
 * **Contrôlé** : `value`/`onChange` passthrough, aucun état interne. Le
 * vanilla dispatch un `CustomEvent('numberinput:change')` — le pendant React
 * est l'appel `onChange(value)`, pas d'événement DOM.
 *
 * **État critique — boutons `disabled` aux bornes (PAS une classe)** :
 * `updateButtons()` du vanilla (`components.js:1472-1475`) fait
 * `btnDec.disabled = value <= min` et `btnInc.disabled = value >= max`.
 * Répliqué à l'identique ici via la prop native `disabled` de chaque
 * `<button>`, recalculée à chaque render depuis `value`/`min`/`max` — CSS
 * `.number-input-btn:disabled` (opacity 0.35, `forms.css:178-182`). Piège
 * équivalent à la classe `.open` manquante d'`<ActionMenu>` (#612) : sans ce
 * recalcul les boutons restent cliquables au-delà des bornes.
 *
 * `disabled` (prop globale) pose `.number-input--disabled` sur le wrap +
 * l'attribut natif `disabled` sur le champ et les deux boutons (combiné en
 * OR avec l'état de borne ci-dessus).
 *
 * Arrondi au step : `Math.round(val / step) / (1/step)` — calque exact de
 * `round()` (`components.js:1467-1470`), origine 0 (pas la borne `min`).
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  compact,
  disabled,
  className,
  id,
}: NumberInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const commit = (nextValue: number) => {
    const rounded = roundToStep(nextValue, step);
    const clamped = clampValue(rounded, min, max);
    onChange(clamped);
  };

  const handleDecrement = () => commit(value - step);
  const handleIncrement = () => commit(value + step);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(event.target.value) || 0;
    commit(parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleIncrement();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      handleDecrement();
    }
  };

  const decDisabled = Boolean(disabled) || value <= min;
  const incDisabled = Boolean(disabled) || value >= max;

  const wrapClasses = [
    "number-input-wrap",
    compact ? "number-input--compact" : null,
    disabled ? "number-input--disabled" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapClasses}
      data-min={Number.isFinite(min) ? min : undefined}
      data-max={Number.isFinite(max) ? max : undefined}
      data-step={step}
    >
      <button
        type="button"
        className="number-input-btn"
        data-action="dec"
        aria-label="Diminuer"
        disabled={decDisabled}
        onClick={handleDecrement}
      >
        &#8722;
      </button>
      <input
        id={inputId}
        className="number-input-field"
        type="number"
        value={value}
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        aria-label={label}
        disabled={disabled}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="number-input-btn"
        data-action="inc"
        aria-label="Augmenter"
        disabled={incDisabled}
        onClick={handleIncrement}
      >
        &#43;
      </button>
    </div>
  );
}

NumberInput.displayName = "NumberInput";
