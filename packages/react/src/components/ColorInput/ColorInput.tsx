import { ChangeEvent, useId } from "react";

export interface ColorInputPreset {
  /** Valeur hex du preset, ex `"#3b82f6"`. Posée en `data-color` + `style={{ background }}` sur le swatch. */
  color: string;
  /** Libellé accessible du swatch (`aria-label`) — la pastille n'a pas de texte visible. */
  label: string;
}

export interface ColorInputProps {
  /** Hex courant, ex `"#3b82f6"` — affiché en MAJUSCULES dans `.color-input-value` (calque `syncUI`). */
  value: string;
  /** Appelé avec le hex natif (`input.target.value`, minuscule) au changement du picker ou au clic d'un preset. */
  onChange: (hex: string) => void;
  /** Libellé affiché au-dessus du champ (`.input-label`). */
  label?: string;
  /** Pastilles de couleurs prédéfinies (`.color-swatch`) — la rangée n'est pas rendue si absent/vide. */
  presets?: ColorInputPreset[];
  /** Affiche le hex courant (`.color-input-value`). @default true */
  showValue?: boolean;
  /** Désactive le picker natif + les presets (`.color-input--disabled` + `disabled` natif). */
  disabled?: boolean;
  /** id du champ — sinon généré via `useId`. */
  id?: string;
  /** Classes additionnelles sur `.color-input` (le wrapper picker + valeur, pas le `.input-group` englobant). */
  className?: string;
}

/**
 * ColorInput — Color picker du Design System msyx.fr (`formulaires.html` #color-picker,
 * calque `initColorInput` — `shared/components.js:4243-4270`).
 *
 * Émet le markup canonique (`components/forms.css:743-804`) :
 * ```html
 * <div class="input-group">
 *   <label class="input-label" for="...">Couleur d'accent</label>
 *   <div class="color-input">
 *     <input type="color" id="..." value="#3b82f6">
 *     <span class="color-input-value">#3B82F6</span>
 *   </div>
 *   <div class="flex gap-xs mt-sm">
 *     <button type="button" class="color-swatch" data-color="#22c55e" aria-pressed="true"
 *       aria-label="Vert" style="background:#22c55e;"></button>
 *   </div>
 * </div>
 * ```
 *
 * **Contrôlé** : `value`/`onChange` passthrough — aucun état interne. `onChange` reçoit le
 * hex natif du picker (`input.target.value`, minuscule) ou le hex du preset cliqué.
 *
 * **Style inline OBLIGATOIRE sur les swatches** — piège capitalisé (récidive exacte du bug
 * `FileUpload` `.progress-fill`) : `.color-swatch[data-color]` (`forms.css:793-799`) ne
 * définit AUCUN `background` — uniquement le reset 44px/border/cursor. Ce composant DOIT
 * poser `style={{ background: preset.color }}` sur chaque swatch, sinon les pastilles sont
 * invisibles (rendu bouton natif du navigateur).
 *
 * **Preset actif** : piloté par `aria-pressed` (pas une classe CSS) — comparaison en
 * MAJUSCULES des deux côtés (`preset.color.toUpperCase() === value.toUpperCase()`), car
 * `input[type=color]` renvoie toujours du hex minuscule (calque exact de `syncUI`).
 *
 * **Presets optionnels** : la rangée `.flex.gap-xs.mt-sm` n'est rendue que si `presets` est
 * un tableau non vide (démo « basique » du DS n'en a aucun).
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export function ColorInput({
  value,
  onChange,
  label,
  presets,
  showValue = true,
  disabled,
  id,
  className,
}: ColorInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const upperValue = value.toUpperCase();
  const hasPresets = Array.isArray(presets) && presets.length > 0;

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  const wrapClasses = [
    "color-input",
    disabled ? "color-input--disabled" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={wrapClasses}>
        <input
          type="color"
          id={inputId}
          value={value}
          disabled={disabled}
          onChange={handleInputChange}
        />
        {showValue && <span className="color-input-value">{upperValue}</span>}
      </div>
      {hasPresets && (
        <div
          className={`flex gap-xs mt-sm${
            disabled ? " color-input--disabled" : ""
          }`}
        >
          {presets!.map((preset, index) => {
            const active = preset.color.toUpperCase() === upperValue;
            return (
              <button
                key={`${preset.color}-${index}`}
                type="button"
                className="color-swatch"
                data-color={preset.color}
                aria-pressed={active}
                aria-label={preset.label}
                style={{ background: preset.color }}
                disabled={disabled}
                onClick={() => onChange(preset.color)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

ColorInput.displayName = "ColorInput";
