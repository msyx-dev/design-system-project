import {
  ChangeEvent,
  MutableRefObject,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Libellé affiché au-dessus du champ (`.input-label`). */
  label?: ReactNode;
  /** Texte d'aide sous le champ (`.input-hint`), lié via `aria-describedby`. Masqué quand `error` est fourni. */
  hint?: ReactNode;
  /** Message d'erreur (`.input-error-msg`) — bascule le champ en état erreur. */
  error?: ReactNode;
  /** Marque le champ comme valide (`.input-success`), sans effet si `error`. */
  success?: boolean;
  /**
   * Affiche le compteur `N / MAX` (`.input-counter`). Sans effet si
   * `maxLength` n'est pas un nombre : il n'y a rien à compter contre.
   */
  showCount?: boolean;
  /**
   * Texte annoncé (région `aria-live="polite"`) quand la limite est atteinte.
   * @default "Limite de caractères atteinte"
   */
  limitReachedLabel?: string;
  /** Classes additionnelles sur le conteneur `.input-group`. */
  className?: string;
}

/** Affecte un nœud à une ref fonction ou objet. */
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as MutableRefObject<T | null>).current = node;
}

/**
 * Textarea — Zone de saisie multi-lignes du Design System msyx.fr, avec
 * compteur de caractères optionnel (`formulaires.html` #textarea).
 *
 * Émet le markup canonique `.input-group` (`components/forms.css`), à
 * l'identique du vanilla (`initInputCounters()` de `shared/components.js`) :
 * ```html
 * <div class="input-group">
 *   <label class="input-label" for="wish">Liste de souhaits</label>
 *   <textarea class="input" id="wish" rows="4" maxlength="2000"
 *             aria-describedby="wish-hint wish-counter"></textarea>
 *   <div class="input-footer">
 *     <span class="input-hint" id="wish-hint">Liens http(s) acceptés.</span>
 *     <span class="input-counter" id="wish-counter">0 / 2000</span>
 *     <span class="sr-only" aria-live="polite"></span>
 *   </div>
 * </div>
 * ```
 * Sans compteur (`showCount` absent ou pas de `maxLength`), aucun
 * `.input-footer` : l'aide ou l'erreur sont enfants directs de `.input-group`,
 * comme pour `Input`.
 *
 * **Contrôlé ou non** : avec `value`, le compteur suit `value.length`. Sans
 * `value` (mode `defaultValue`, ex. Server Actions), le compteur suit la
 * frappe et se resynchronise au `reset` du formulaire propriétaire. Limite : une
 * écriture impérative `ref.current.value = …` n'est pas observée.
 *
 * **Unité de comptage** : `value.length` (unités UTF-16), la même mesure que
 * `maxLength` natif — un emoji compte pour 2, un retour à la ligne pour 1.
 *
 * **Accessibilité** : `aria-describedby` = id(s) fournis par le consommateur
 * (fusionnés en tête, jamais écrasés) puis `${id}-hint` (sans erreur),
 * `${id}-error`, `${id}-counter`. La région `.sr-only[aria-live="polite"]` est
 * toujours montée avec le compteur, mais ne contient `limitReachedLabel` que
 * quand `count >= maxLength` : aucune annonce à chaque frappe.
 *
 * SSR-safe : aucun accès à `document`/`window` pendant le rendu (l'écouteur
 * `reset` n'est posé que dans un effet).
 *
 * Doc : `formulaires.html#textarea`.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      success,
      showCount,
      limitReachedLabel = "Limite de caractères atteinte",
      id,
      className,
      value,
      defaultValue,
      maxLength,
      onChange,
      "aria-describedby": consumerDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const isControlled = value !== undefined;

    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        assignRef(ref, node);
      },
      [ref],
    );

    // Mode non contrôlé : le compte vit dans un état interne, initialisé depuis
    // defaultValue. Mode contrôlé : il est dérivé de `value` à chaque rendu.
    const [uncontrolledCount, setUncontrolledCount] = useState(
      () => String(defaultValue ?? "").length,
    );
    const count = isControlled ? String(value ?? "").length : uncontrolledCount;

    // Le reset d'un formulaire ne déclenche aucun `change`, et l'événement
    // `reset` part AVANT la remise à la valeur par défaut : relire au tour
    // suivant. Inutile en contrôlé (le compte suit la prop `value`).
    useEffect(() => {
      const el = innerRef.current;
      const form = el?.form;
      if (!el || !form || isControlled) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onReset = () => {
        clearTimeout(timer);
        timer = setTimeout(() => setUncontrolledCount(el.value.length), 0);
      };
      form.addEventListener("reset", onReset);
      return () => {
        form.removeEventListener("reset", onReset);
        clearTimeout(timer);
      };
    }, [isControlled]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) setUncontrolledCount(e.target.value.length);
      onChange?.(e);
    };

    const counted = showCount && typeof maxLength === "number";
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const counterId = counted ? `${textareaId}-counter` : undefined;
    // hint et error sont mutuellement exclusifs au rendu (error masque hint) :
    // ne pas référencer hintId quand error est affiché (idref pendant, #627).
    // L'aria-describedby du consommateur passe en tête et n'est pas écrasé.
    const describedBy =
      [consumerDescribedBy, error ? undefined : hintId, errorId, counterId]
        .filter(Boolean)
        .join(" ") || undefined;

    const fieldClasses = [
      "input",
      error ? "input-error" : null,
      !error && success ? "input-success" : null,
      rest.disabled ? "input-disabled" : null,
    ]
      .filter(Boolean)
      .join(" ");

    const message = error ? (
      <span className="input-error-msg" id={errorId}>
        {error}
      </span>
    ) : hint ? (
      <span className="input-hint" id={hintId}>
        {hint}
      </span>
    ) : null;

    return (
      <div className={["input-group", className].filter(Boolean).join(" ")}>
        {label && (
          <label className="input-label" htmlFor={textareaId}>
            {label}
          </label>
        )}
        <textarea
          ref={setRefs}
          id={textareaId}
          className={fieldClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          {...rest}
        />
        {counted ? (
          <div className="input-footer">
            {message}
            <span
              className={[
                "input-counter",
                count > maxLength ? "input-counter--over" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              id={counterId}
            >
              {`${count} / ${maxLength}`}
            </span>
            <span className="sr-only" aria-live="polite">
              {count >= maxLength ? limitReachedLabel : ""}
            </span>
          </div>
        ) : (
          message
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
