import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export interface TagInputProps {
  /** Valeurs courantes — le parent pilote l'état, aucun état interne sur la liste. */
  values: string[];
  /** Appelé avec le tableau mis à jour (ajout ou retrait d'un tag). */
  onChange: (values: string[]) => void;
  /** Nombre maximum de tags. Non borné si absent (comme le vanilla sans `data-max`). */
  max?: number;
  /** Placeholder du champ de saisie. @default "Ajouter un tag..." */
  placeholder?: string;
  /** Libellé visible — `.tag-input-label` lié au champ via `htmlFor`. */
  label?: string;
  /** Texte d'aide sous le champ — `.tag-input-hint`. Remplacé par `error` s'il est une chaîne. */
  hint?: string;
  /** État/message d'erreur — `true` bascule `.tag-input-wrap--error` ; une chaîne remplace en plus le `.tag-input-hint` (avec `.tag-input-hint--error`). */
  error?: string | boolean;
  /** Désactive le composant — `.tag-input-wrap--disabled` + champ natif `disabled`. Les boutons `.tag-close` ne sont PAS rendus (calque exact du markup vanilla désactivé, `formulaires.html` #tag-disabled-prefilled). */
  disabled?: boolean;
  /** Classes additionnelles sur `.tag-input-wrap`. */
  className?: string;
  /** id du champ — sinon généré via `useId`. */
  id?: string;
}

const REMOVE_TRANSITION_MS = 150;

/**
 * TagInput — Champ de saisie multi-valeurs du Design System msyx.fr
 * (`formulaires.html` #tag-input, calque `initTagInputs` —
 * `shared/components.js:1716-1825`).
 *
 * Émet le markup canonique `.tag-input-wrap` (`components/forms.css:325-406`) :
 * ```html
 * <label class="tag-input-label" for="...">Technologies</label>
 * <div class="tag-input-wrap" data-max="5">
 *   <span class="tag-item">Design <button class="tag-close" aria-label="Supprimer Design">&times;</button></span>
 *   <input class="tag-input-field" type="text" placeholder="Ajouter un tag..." aria-label="Ajouter un tag">
 *   <span class="tag-input-limit">1/5</span>
 * </div>
 * <span class="tag-input-hint">Enter ou virgule pour ajouter</span>
 * ```
 *
 * **Contrôlé** : `values`/`onChange` passthrough — aucun état interne sur la
 * liste de tags. Le texte en cours de saisie (non encore validé en tag) et
 * l'état transitoire de suppression restent internes (non exposés, comme le
 * vanilla qui manipule son propre DOM).
 *
 * **État critique — `.tag-item--removing`** : le vanilla (`removeTag()`,
 * `components.js:1774-1783`) pose la classe AVANT de démonter le tag, laisse
 * l'animation opacity/scale jouer 150ms (`forms.css:361-364`), puis retire
 * l'élément du DOM. Répliqué ici via un `Set` de valeurs "en cours de
 * suppression" : au retrait, la valeur est ajoutée au set (classe posée,
 * `onChange` PAS encore appelé) puis, après 150ms, retirée du set ET
 * `onChange` est appelé avec le tableau filtré. Piège équivalent à la classe
 * `.open` manquante d'`<ActionMenu>` (#612) : sans ce délai le tag disparaît
 * instantanément sans transition.
 *
 * **Limite atteinte** (`values.length >= max`) : le champ passe `disabled`
 * natif + placeholder "Limite atteinte" (`updateInputState()`,
 * `components.js:1741-1750`) et `.tag-input-limit` affiche `count/max`.
 *
 * **Désactivé globalement** : `.tag-input-wrap--disabled` sur le wrap + champ
 * natif `disabled`. Les `.tag-close` ne sont PAS rendus (calque exact du
 * markup vanilla désactivé — pas de bouton retrait possible, cf.
 * `formulaires.html` #tag-disabled-prefilled).
 *
 * Clavier : Enter ou `,` crée un tag (trim, anti-doublon, respecte `max`) ;
 * Backspace sur champ vide retire le dernier tag. La virgule est aussi
 * gérée via `onChange` du champ (cas mobile/composition, calque du vanilla
 * qui écoute `input` en plus de `keydown`).
 *
 * SSR-safe : aucun accès à `document`/`window` en dehors des timers.
 */
export function TagInput({
  values,
  onChange,
  max,
  placeholder = "Ajouter un tag...",
  label,
  hint,
  error,
  disabled,
  className,
  id,
}: TagInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [inputValue, setInputValue] = useState("");
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const isDisabled = Boolean(disabled);
  const hasMax = typeof max === "number" && Number.isFinite(max);
  const atLimit = hasMax && values.length >= (max as number);
  const hasError = Boolean(error);
  const hintText = typeof error === "string" ? error : hint;

  function requestRemove(value: string) {
    if (removing.has(value)) return;
    setRemoving((prev) => {
      const next = new Set(prev);
      next.add(value);
      return next;
    });
    const timer = setTimeout(() => {
      timersRef.current.delete(value);
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(value);
        return next;
      });
      onChange(values.filter((v) => v !== value));
    }, REMOVE_TRANSITION_MS);
    timersRef.current.set(value, timer);
  }

  function commitValue(raw: string): boolean {
    const trimmed = raw.trim().replace(/,+$/, "").trim();
    if (!trimmed) return false;
    if (values.includes(trimmed)) return false;
    if (hasMax && values.length >= (max as number)) return false;
    onChange([...values, trimmed]);
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isDisabled) return;
    if ((event.key === "Enter" || event.key === ",") && !atLimit) {
      event.preventDefault();
      if (commitValue(inputValue)) {
        setInputValue("");
      }
    } else if (event.key === "Backspace" && inputValue === "") {
      if (values.length > 0) {
        requestRemove(values[values.length - 1]);
      }
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (next.endsWith(",")) {
      const candidate = next.slice(0, -1);
      if (commitValue(candidate)) {
        setInputValue("");
      } else {
        setInputValue(candidate);
      }
      return;
    }
    setInputValue(next);
  }

  const wrapClasses = [
    "tag-input-wrap",
    isDisabled ? "tag-input-wrap--disabled" : null,
    hasError ? "tag-input-wrap--error" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hintClasses = [
    "tag-input-hint",
    hasError ? "tag-input-hint--error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {label && (
        <label className="tag-input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div
        className={wrapClasses}
        data-max={hasMax ? max : undefined}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (
            !target.classList.contains("tag-close") &&
            !target.classList.contains("tag-item")
          ) {
            inputRef.current?.focus();
          }
        }}
      >
        {values.map((value) => (
          <span
            key={value}
            className={[
              "tag-item",
              removing.has(value) ? "tag-item--removing" : null,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {value}
            {!isDisabled && (
              <>
                {" "}
                <button
                  type="button"
                  className="tag-close"
                  aria-label={`Supprimer ${value}`}
                  onClick={() => requestRemove(value)}
                >
                  &times;
                </button>
              </>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          className="tag-input-field"
          type="text"
          value={inputValue}
          placeholder={atLimit ? "Limite atteinte" : placeholder}
          aria-label={!label ? "Ajouter un tag" : undefined}
          disabled={isDisabled || atLimit}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {hasMax && (
          <span className="tag-input-limit">
            {values.length}/{max}
          </span>
        )}
      </div>
      {hintText && <span className={hintClasses}>{hintText}</span>}
    </div>
  );
}

TagInput.displayName = "TagInput";
