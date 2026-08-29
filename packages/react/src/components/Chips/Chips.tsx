import {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useRef,
  useState,
} from "react";

export interface ChipProps {
  children: ReactNode;
  /** Modificateur sémantique — `.chip-{variant}` (`badges.css:36-39`). */
  variant?: "accent" | "warning" | "success" | "danger";
  /** Taille compacte — `.chip-sm`. */
  size?: "sm";
  /** Icône décorative — `.chip-icon-slot`, pose aussi `.chip.chip-icon` sur la racine. */
  icon?: ReactNode;
  /** Fournir un bouton de fermeture (`.chip-close`) et gérer son clic. Absent ⇒ pas de bouton. */
  onClose?: () => void;
  /**
   * `aria-label` du bouton de fermeture. Par défaut `Supprimer {children}` si
   * `children` est une chaîne (calque `'Supprimer ' + trimmed` du vanilla,
   * `shared/components.js:553`) ; sinon `"Supprimer"` (le vanilla ne gère
   * jamais de contenu non-textuel dans un chip).
   */
  closeLabel?: string;
  className?: string;
}

/**
 * `Chip` — chip fermable du Design System msyx.fr (`composants.html`
 * #chips, calque la branche fermeture d'`initChips` —
 * `shared/components.js:502-516`).
 *
 * Émet `.chip(.chip-{variant})(.chip-sm)(.chip-icon) > (.chip-icon-slot?) +
 * children + (.chip-close?)`.
 *
 * **Divergence documentée** : le vanilla anime la suppression (opacity/scale
 * inline styles + `setTimeout` 200ms) AVANT de retirer le nœud du DOM — mais
 * cette animation n'est adossée à AUCUNE classe CSS d'état (contrairement à
 * `<TagInput>`/`.tag-item--removing`, une vraie classe CSS) : c'est du style
 * inline posé/retiré directement par le JS. Un composant **contrôlé** ne
 * peut pas retarder son propre démontage sans état de transition interne
 * (le parent retire l'item de son tableau immédiatement) ; comme aucune
 * classe CSS ne dépend de cette transition, `onClose` est appelé
 * immédiatement au clic — aucune régression visuelle du DS, la sortie
 * "brute" est un choix de simplicité assumé plutôt qu'une classe manquante.
 */
export function Chip({
  children,
  variant,
  size,
  icon,
  onClose,
  closeLabel,
  className,
}: ChipProps) {
  const classes = [
    "chip",
    variant ? `chip-${variant}` : null,
    size === "sm" ? "chip-sm" : null,
    icon ? "chip-icon" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const fallbackLabel =
    typeof children === "string" ? `Supprimer ${children}` : "Supprimer";

  return (
    <span className={classes}>
      {icon && <span className="chip-icon-slot">{icon}</span>}
      {children}
      {onClose && (
        <button
          type="button"
          className="chip-close"
          aria-label={closeLabel ?? fallbackLabel}
          onClick={onClose}
        >
          &times;
        </button>
      )}
    </span>
  );
}
Chip.displayName = "Chip";

export interface ChipFilterOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface ChipFilterGroupProps {
  options: ChipFilterOption[];
  /** Valeur active — le parent pilote l'état, aucun état interne. */
  value: string;
  onChange: (value: string) => void;
  /** `aria-label` du conteneur `.chip-group`. @default "Filtres" */
  label?: string;
  className?: string;
}

/**
 * `ChipFilterGroup` — filtres à sélection simple du Design System msyx.fr
 * (`composants.html` #chips, calque la branche filtre d'`initChips` —
 * `shared/components.js:517-527`).
 *
 * Émet `.chip-group[role="group"] > button.chip.chip-filter(.active)`.
 *
 * **`role="group"` conservé tel quel** (pas `radiogroup`) : le vanilla ne
 * pose ni `role="radio"` ni `aria-checked` sur `.chip-filter` — contrairement
 * à `<Rating>`/`<SegmentedControl>`, ce composant n'a jamais reçu le contrat
 * ARIA #613/#836. Reproduire le markup vanilla, pas l'inventer.
 */
export function ChipFilterGroup({
  options,
  value,
  onChange,
  label = "Filtres",
  className,
}: ChipFilterGroupProps) {
  const classes = ["chip-group", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="group" aria-label={label}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={["chip", "chip-filter", isActive ? "active" : null]
              .filter(Boolean)
              .join(" ")}
            data-filter={option.value}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
ChipFilterGroup.displayName = "ChipFilterGroup";

export interface ChipInputProps {
  /** Valeurs courantes — le parent pilote l'état, aucun état interne sur la liste. */
  values: string[];
  onChange: (values: string[]) => void;
  /** @default "Ajouter un tag..." */
  placeholder?: string;
  /** `aria-label` du champ. @default "Ajouter un tag" */
  ariaLabel?: string;
  id?: string;
  className?: string;
}

/**
 * `ChipInput` — saisie multi-valeurs du Design System msyx.fr
 * (`composants.html` #chips, calque la branche saisie d'`initChips` —
 * `shared/components.js:529-583`).
 *
 * **`@deprecated` côté vanilla** — `.chip-input-wrapper` est un alias
 * rétro-compat de `.tag-input-wrap` (`<TagInput>`, `formulaires.html`
 * #tag-input), conservé jusqu'à suppression en v3. Existe ici pour couvrir
 * l'entrée registre `chips`, qui embarque ces classes (`cssClasses` :
 * `.chip-input-wrapper`/`.chip-input-item`/`.chip-input-field`) — préférer
 * `<TagInput>` pour tout nouveau code.
 *
 * Émet `.chip-input-wrapper > (Chip.chip-input-item)* + input.chip-input-field`.
 * Réutilise `<Chip>` pour chaque item (`className="chip-input-item"`) —
 * markup réel identique au vanilla, `<span class="chip chip-input-item">…
 * <button class="chip-close">`.
 *
 * Clavier : `Enter`/`,` valide la saisie (trim, anti-doublon) ; `Backspace`
 * sur champ vide retire le dernier item — calque exact d'`initChips`.
 */
export function ChipInput({
  values,
  onChange,
  placeholder = "Ajouter un tag...",
  ariaLabel = "Ajouter un tag",
  id,
  className,
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commitValue(raw: string): boolean {
    const trimmed = raw.trim().replace(/,+$/, "").trim();
    if (!trimmed) return false;
    if (values.includes(trimmed)) return false;
    onChange([...values, trimmed]);
    return true;
  }

  function removeValue(target: string) {
    onChange(values.filter((v) => v !== target));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (commitValue(inputValue)) setInputValue("");
    } else if (event.key === "Backspace" && inputValue === "") {
      if (values.length > 0) removeValue(values[values.length - 1]);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

  function handleWrapperClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".chip-close")) return;
    inputRef.current?.focus();
  }

  const classes = ["chip-input-wrapper", className].filter(Boolean).join(" ");

  return (
    <div className={classes} onClick={handleWrapperClick}>
      {values.map((v) => (
        <Chip
          key={v}
          className="chip-input-item"
          onClose={() => removeValue(v)}
        >
          {v}
        </Chip>
      ))}
      <input
        ref={inputRef}
        id={id}
        className="chip-input-field"
        type="text"
        value={inputValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
ChipInput.displayName = "ChipInput";
