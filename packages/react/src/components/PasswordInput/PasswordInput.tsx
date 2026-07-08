import {
  InputHTMLAttributes,
  ReactNode,
  forwardRef,
  useId,
  useState,
} from "react";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Libellé affiché au-dessus du champ (`.input-label`). */
  label?: ReactNode;
  /** Texte d'aide sous le champ (`.input-hint`), lié via `aria-describedby`. */
  hint?: ReactNode;
  /** Message d'erreur (`.input-error-msg`) — bascule le champ en état erreur. */
  error?: ReactNode;
  /**
   * État révélé contrôlé. Si fourni (avec `onRevealedChange`), le composant
   * ne gère plus d'état interne — le parent pilote la visibilité.
   */
  revealed?: boolean;
  /** État révélé initial en mode non contrôlé. @default false */
  defaultRevealed?: boolean;
  /** Appelé après bascule (mode contrôlé ou non contrôlé), avec le nouvel état. */
  onRevealedChange?: (revealed: boolean) => void;
  /** `aria-label` du bouton quand le mot de passe est masqué. @default "Afficher le mot de passe" */
  revealLabel?: string;
  /** `aria-label` du bouton quand le mot de passe est révélé. @default "Masquer le mot de passe" */
  hideLabel?: string;
  /** Classes additionnelles sur le conteneur `.input-group`. */
  className?: string;
}

/**
 * PasswordInput — Champ mot de passe avec révélation du Design System msyx.fr
 * (`formulaires.html` #password-toggle, calque `initPasswordToggle` —
 * `shared/components.js:4216-4240`).
 *
 * Propriétaire de son `<input>` (le `type` doit rester déclaratif — un
 * toggle standalone autour d'un input étranger serait anti-React). Émet le
 * markup canonique `.password-field` (`components/forms.css:523-561`) :
 * ```html
 * <div class="input-group">
 *   <label class="input-label" for="...">Mot de passe</label>
 *   <div class="password-field">
 *     <input class="input" id="..." type="password">
 *     <button type="button" class="password-toggle" aria-pressed="false"
 *             aria-label="Afficher le mot de passe" aria-controls="...">
 *       <svg class="icon password-toggle-on" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-eye" /></svg>
 *       <svg class="icon password-toggle-off" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-eye-off" /></svg>
 *     </button>
 *   </div>
 * </div>
 * ```
 *
 * **État critique — `aria-pressed`** : c'est un ATTRIBUT (pas une classe) et
 * l'UNIQUE driver CSS du swap d'icône (`forms.css:549-551` masque
 * `.password-toggle-off` par défaut et l'affiche quand
 * `[aria-pressed="true"]`, et inversement pour `.password-toggle-on`). Le
 * composant DOIT toujours rendre `aria-pressed={revealed}` sur le bouton —
 * l'oublier affiche la mauvaise icône ou les deux (piège capitalisé
 * ActionMenu `.open`, #612).
 *
 * Les DEUX `<svg>` (`.password-toggle-on` et `.password-toggle-off`) sont
 * TOUJOURS montés dans le DOM : c'est le CSS, via `aria-pressed`, qui décide
 * lequel afficher. Ne jamais les rendre conditionnellement.
 *
 * Le `type` de l'input est piloté DÉCLARATIVEMENT (`revealed ? "text" :
 * "password"`), jamais par mutation impérative du DOM comme le vanilla.
 *
 * **Contrôlé/non contrôlé** : `value`/`onChange` sont un passthrough natif
 * (comme un `<input>` standard). L'état "révélé" est interne par défaut
 * (`defaultRevealed`), ou contrôlé via `revealed`/`onRevealedChange`.
 *
 * `disabled` propage au champ natif ET au bouton toggle (`:disabled`,
 * `forms.css:552`, opacity + cursor not-allowed).
 *
 * ⚠️ Dépendance sprite : les icônes oeil/oeil-barré sont rendues via
 * `<use href="/shared/icons/sprite.svg#i-eye|#i-eye-off">`. Le consumer
 * **doit servir** le sprite SVG du DS à `/shared/icons/sprite.svg` (fourni
 * par la distribution DS CSS), sinon les boutons seront vides.
 *
 * SSR-safe : aucun accès à `document`/`window`.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      hint,
      error,
      revealed: revealedProp,
      defaultRevealed = false,
      onRevealedChange,
      revealLabel = "Afficher le mot de passe",
      hideLabel = "Masquer le mot de passe",
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy =
      [hintId, errorId].filter(Boolean).join(" ") || undefined;

    const isControlled = revealedProp !== undefined;
    const [internalRevealed, setInternalRevealed] = useState(defaultRevealed);
    const revealed = isControlled ? (revealedProp as boolean) : internalRevealed;

    function handleToggle() {
      const next = !revealed;
      if (!isControlled) {
        setInternalRevealed(next);
      }
      onRevealedChange?.(next);
    }

    const inputClasses = ["input", error ? "input-error" : null]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={["input-group", className].filter(Boolean).join(" ")}>
        {label && (
          <label className="input-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="password-field">
          <input
            ref={ref}
            id={inputId}
            type={revealed ? "text" : "password"}
            className={inputClasses}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...rest}
          />
          <button
            type="button"
            className="password-toggle"
            aria-pressed={revealed}
            aria-label={revealed ? hideLabel : revealLabel}
            aria-controls={inputId}
            disabled={disabled}
            onClick={handleToggle}
          >
            <svg className="icon password-toggle-on" aria-hidden="true">
              <use href="/shared/icons/sprite.svg#i-eye" />
            </svg>
            <svg className="icon password-toggle-off" aria-hidden="true">
              <use href="/shared/icons/sprite.svg#i-eye-off" />
            </svg>
          </button>
        </div>
        {error ? (
          <span className="input-error-msg" id={errorId}>
            {error}
          </span>
        ) : (
          hint && (
            <span className="input-hint" id={hintId}>
              {hint}
            </span>
          )
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
