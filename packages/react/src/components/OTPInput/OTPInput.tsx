import {
  ChangeEvent,
  ClipboardEvent,
  FocusEvent,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";

export interface OTPInputProps {
  /** Code courant — le parent pilote l'état, aucun état interne sur la donnée. */
  value: string;
  /** Appelé avec la NOUVELLE chaîne complète (jamais case par case) — saisie, backspace ou paste. */
  onChange: (value: string) => void;
  /** Nombre de cases. @default 6 (cf. démos 4 & 6 chiffres) */
  length?: number;
  /** Désactive le composant — `.otp-group--disabled` sur le groupe + `disabled` natif par case + `aria-disabled`. */
  disabled?: boolean;
  /** Appelé avec la valeur quand toutes les cases (`length`) sont remplies. */
  onComplete?: (value: string) => void;
  /** Focus la 1ère case au montage. */
  autoFocus?: boolean;
  /** aria-label posé sur `.otp-group`. */
  ariaLabel?: string;
  /** Classes additionnelles sur `.otp-group`. */
  className?: string;
}

/**
 * Dérive un tableau de `length` caractères depuis `value` — position = index
 * (`value.charAt(i)`, `""` si absent). Voir la note "divergence assumée"
 * ci-dessous : un trou au milieu de `value` collapse au prochain rendu.
 */
function getChars(value: string, length: number): string[] {
  return Array.from({ length }, (_, i) => value.charAt(i) || "");
}

/**
 * OTPInput — Cases de saisie de code à usage unique du Design System msyx.fr
 * (`formulaires.html` #otp-input, calque `initOTPInputs` —
 * `shared/components.js:1622-1715`).
 *
 * Émet le markup canonique `.otp-group` / `.otp-digit`
 * (`components/forms.css:284-322`) :
 * ```html
 * <div class="otp-group" aria-label="Code à 6 chiffres">
 *   <input class="otp-digit filled" type="text" maxlength="1" inputmode="numeric"
 *          pattern="[0-9]" autocomplete="one-time-code" aria-label="Chiffre 1" value="4">
 *   <input class="otp-digit" type="text" maxlength="1" inputmode="numeric"
 *          pattern="[0-9]" autocomplete="off" aria-label="Chiffre 2">
 *   ...
 * </div>
 * ```
 *
 * **Contrôlé** : `value`/`onChange` passthrough — aucun état interne sur la
 * donnée. `value` est une chaîne (ex. `"427"`, partielle autorisée) où le
 * caractère à l'index `i` correspond à la case `i` (`value.charAt(i)`).
 *
 * **État critique — `.otp-digit.filled`** : dérivé à CHAQUE rendu, case par
 * case, depuis `value.charAt(i)` non vide. Sans cette dérivation les cases
 * remplies gardent la bordure d'état "vide" — piège capitalisé identique à la
 * classe `.open` manquante d'`<ActionMenu>` (#612).
 *
 * **Focus impératif** (refs, jamais laissé à React reprendre le focus) :
 * - saisie d'un chiffre → avance sur la case suivante ;
 * - `Backspace` sur case pleine → efface SEULEMENT la case courante, le focus
 *   reste dessus ; sur case vide → efface la case précédente ET y déplace le
 *   focus (calque exact `components.js:1667-1678`) ;
 * - `ArrowLeft`/`ArrowRight` → déplace le focus sans modifier la valeur ;
 * - focus sur une case → `select()` (facilite l'écrasement à la frappe) ;
 * - `autoFocus` → focus la 1ère case au montage (effet, jamais pendant le
 *   rendu — SSR-safe).
 *
 * **Paste** : distribue la chaîne collée (chiffres uniquement, `[^0-9]`
 * filtré) sur les cases à partir de l'index courant, rappelle `onChange` UNE
 * SEULE FOIS avec la nouvelle chaîne complète (jamais case par case), puis
 * focus la prochaine case vide ou — si toutes remplies — la dernière case
 * (calque `components.js:1679-1706`).
 *
 * **`onComplete`** : appelé avec la valeur dès que `length` cases sont
 * remplies (remplace le `CustomEvent('otp:change')` bubblant du vanilla, qui
 * n'a pas d'équivalent "complete" dédié) — déclenché après saisie ou paste.
 *
 * **`autocomplete`** : `one-time-code` UNIQUEMENT sur la 1ère case (autofill
 * SMS/TOTP iOS/Android), `off` sur les autres — posé inconditionnellement, y
 * compris quand `disabled` (la démo vanilla désactivée omet l'attribut sur
 * son exemple statique, jugé non significatif : l'API du composant suit la
 * règle générale du vanilla actif).
 *
 * **Divergence assumée vs vanilla** : le vanilla manipule `length` inputs DOM
 * indépendants — un "trou" au milieu (ex. case 2 vidée par `Backspace`, cases
 * 3 et 4 encore pleines) reste visible tel quel dans le DOM, même si l'export
 * `otp:change` (`digits.map(d => d.value).join('')`) le collapse déjà à
 * l'exportation. Ici `value` contrôlé EST la seule source de vérité et suit
 * le même `.join('')` : un trou au milieu se retrouve donc collapsé aussi
 * dans le state affiché au rendu suivant (le chiffre suivant "remonte" d'une
 * case). Comportement mineur, déjà présent dans le format exporté par le
 * vanilla — documenté ici, ce n'est pas un bug d'implémentation React.
 *
 * SSR-safe : aucun accès à `document`/`window` au rendu (uniquement dans les
 * handlers et l'effet `autoFocus`).
 */
export function OTPInput({
  value,
  onChange,
  length = 6,
  disabled,
  onComplete,
  autoFocus,
  ariaLabel,
  className,
}: OTPInputProps) {
  const isDisabled = Boolean(disabled);
  const chars = getChars(value, length);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) {
      refs.current[0]?.focus();
    }
    // Uniquement au montage — ne pas reprendre le focus à chaque changement
    // de valeur (le composant est contrôlé, l'orchestration focus est
    // gérée explicitement par les handlers ci-dessous).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(nextChars: string[]) {
    const nextValue = nextChars.join("");
    onChange(nextValue);
    if (nextValue.length === length) {
      onComplete?.(nextValue);
    }
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    if (isDisabled) return;
    // Ne garder que le dernier caractere saisi (cas colle caractere par caractere / IME mobile).
    const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
    const char = digitsOnly ? digitsOnly.slice(-1) : "";

    const nextChars = getChars(value, length);
    nextChars[index] = char;
    commit(nextChars);

    if (char) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (isDisabled) return;
    if (event.key === "Backspace") {
      event.preventDefault();
      const nextChars = getChars(value, length);
      if (nextChars[index]) {
        nextChars[index] = "";
        commit(nextChars);
      } else if (index > 0) {
        nextChars[index - 1] = "";
        commit(nextChars);
        refs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft") {
      const prev = refs.current[index - 1];
      if (prev) {
        event.preventDefault();
        prev.focus();
      }
    } else if (event.key === "ArrowRight") {
      const next = refs.current[index + 1];
      if (next) {
        event.preventDefault();
        next.focus();
      }
    }
  }

  function handlePaste(
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) {
    if (isDisabled) return;
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pasted) return;

    const nextChars = getChars(value, length);
    for (let i = 0; i < pasted.length; i += 1) {
      const targetIndex = index + i;
      if (targetIndex >= length) break;
      nextChars[targetIndex] = pasted[i];
    }
    commit(nextChars);

    const lastFilledIndex = Math.min(index + pasted.length - 1, length - 1);
    const nextEmptyIndex = index + pasted.length;
    const target =
      nextEmptyIndex < length
        ? refs.current[nextEmptyIndex]
        : refs.current[lastFilledIndex];
    target?.focus();
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    event.target.select();
  }

  const groupClasses = [
    "otp-group",
    isDisabled ? "otp-group--disabled" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={groupClasses}
      aria-label={ariaLabel}
      aria-disabled={isDisabled ? true : undefined}
    >
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className={["otp-digit", char ? "filled" : null]
            .filter(Boolean)
            .join(" ")}
          type="text"
          maxLength={1}
          inputMode="numeric"
          pattern="[0-9]"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Chiffre ${index + 1}`}
          value={char}
          disabled={isDisabled}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={handleFocus}
        />
      ))}
    </div>
  );
}

OTPInput.displayName = "OTPInput";
