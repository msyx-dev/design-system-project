import {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface SearchInputSuggestionObject {
  /** Valeur de la suggestion — utilisée pour `onChange`/`onSelect` et le filtre par défaut. */
  value: string;
  /** Libellé affiché dans le `.search-item` — si absent, `value` est utilisé (et surligné via `mark`). */
  label?: ReactNode;
}

/**
 * Liste de suggestions — soit un tableau de chaînes, soit un tableau
 * d'objets `{ value, label? }` (label custom non surligné — le highlight
 * `mark` ne s'applique qu'aux libellés texte simple).
 */
export type SearchInputSuggestions = string[] | SearchInputSuggestionObject[];

interface NormalizedSuggestion {
  value: string;
  label: ReactNode;
  searchText: string;
}

function normalizeSuggestion(
  suggestion: string | SearchInputSuggestionObject,
): NormalizedSuggestion {
  if (typeof suggestion === "string") {
    return { value: suggestion, label: suggestion, searchText: suggestion };
  }
  const label = suggestion.label ?? suggestion.value;
  const searchText = typeof label === "string" ? label : suggestion.value;
  return { value: suggestion.value, label, searchText };
}

/**
 * Surligne la portion de `text` correspondant à `query` via `<mark>`
 * (insensible à la casse) — calque `highlightMatch` de `initSearchInputs`
 * (`shared/components.js`).
 */
function highlightMatch(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? <mark key={index}>{part}</mark> : part,
  );
}

export interface SearchInputProps {
  /** Valeur courante — le parent pilote l'état, aucun état interne pour la saisie. */
  value: string;
  /** Appelé avec la nouvelle valeur à chaque saisie, effacement ou sélection. */
  onChange: (value: string) => void;
  /** Placeholder natif de l'input. */
  placeholder?: string;
  /** Appelé en plus de `onChange("")` au clic sur le bouton d'effacement. */
  onClear?: () => void;
  /** Variante compacte — `.search-compact` (barre de nav, espaces réduits). */
  compact?: boolean;
  /** Désactive le champ (et le bouton clear). */
  disabled?: boolean;
  /** Classes additionnelles sur le conteneur `.search-input-wrap`. */
  className?: string;
  /**
   * Liste de suggestions — active la variante `.search-with-suggestions`
   * (panneau `.search-suggestions`, navigation clavier, highlight). Absent
   * → simple champ de recherche + bouton clear, aucun panneau rendu.
   */
  suggestions?: SearchInputSuggestions;
  /** Appelé avec la valeur de la suggestion choisie (clic ou Entrée). */
  onSelect?: (value: string) => void;
  /** Libellé accessible du champ (`aria-label`). @default "Rechercher" */
  label?: string;
}

/**
 * SearchInput — Champ de recherche du Design System msyx.fr
 * (`formulaires.html` #search-input, `initSearchInputs` dans
 * `shared/components.js`).
 *
 * Émet le markup canonique (`components/forms.css`) :
 * ```html
 * <div class="search-input-wrap [search-with-suggestions] [search-compact]"
 *      role="search|combobox" aria-haspopup="listbox"? aria-expanded="…"?>
 *   <span class="search-icon" aria-hidden="true">…</span>
 *   <input class="search-input" type="search" aria-label="…">
 *   <button class="search-clear [hidden]" aria-label="Effacer la recherche" tabindex="-1">…</button>
 *   <ul class="search-suggestions [hidden]" role="listbox" aria-label="Suggestions">
 *     <li class="search-item [active]" role="option" aria-selected="…">…</li>
 *     <li class="search-no-result">Aucun résultat pour "…"</li>
 *   </ul>
 * </div>
 * ```
 *
 * **CLASSES D'ÉTAT — critiques pour le CSS DS** (`forms.css`) :
 * - `.search-clear.hidden` : `display:none` — retirée dès que `value` est non vide ;
 * - `.search-suggestions.hidden` : `display:none` — retirée uniquement quand le
 *   panneau est ouvert (piège identique à `<ActionMenu>`/`<Dropdown>`, #612/#457) ;
 * - `.search-item.active` : item actuellement navigué au clavier (pas de focus
 *   réel déplacé — l'input garde le focus, comme le DS vanilla).
 *
 * **Contrôlé** : `value`/`onChange`, aucun état interne pour la saisie.
 * L'ouverture du panneau de suggestions (`open`) et l'item actif
 * (`activeIndex`) restent internes (miroir de `initSearchInputs`).
 *
 * **Comportement suggestions** : saisie non vide → ouvre + filtre
 * (insensible à la casse, sur `value`/`label` texte) ; saisie vide → ferme.
 * `Focus` avec valeur non vide → réouvre. `Blur` → ferme après 150ms (délai
 * volontaire, laisse le `mousedown` d'un item s'exécuter avant — l'item
 * utilise `onMouseDown`+`preventDefault` pour ne jamais déclencher ce blur,
 * calque exact de `initSearchInputs`). `ArrowDown`/`ArrowUp` déplacent
 * `activeIndex` (borné, ne boucle pas). `Enter` sélectionne l'item actif.
 * `Escape` ferme et retire le focus de l'input.
 *
 * A11y : `role="combobox"`/`aria-haspopup="listbox"`/`aria-expanded` sur le
 * wrap (variante suggestions uniquement — `role="search"` simple sinon),
 * `aria-autocomplete="list"` + `aria-controls` sur l'input,
 * `role="option"`/`aria-selected` sur chaque `.search-item`.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect`/handlers (post-hydratation).
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  onClear,
  compact = false,
  disabled = false,
  className,
  suggestions,
  onSelect,
  label = "Rechercher",
}: SearchInputProps) {
  const hasSuggestions = suggestions !== undefined;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const generatedId = useId();
  const listId = `search-suggestions-${generatedId}`;

  const normalized = useMemo<NormalizedSuggestion[]>(
    () => (suggestions ?? []).map((s) => normalizeSuggestion(s)),
    [suggestions],
  );

  const query = value.trim();

  const filteredSuggestions = useMemo(() => {
    if (!hasSuggestions || query.length === 0) return [];
    const q = query.toLowerCase();
    return normalized.filter((item) =>
      item.searchText.toLowerCase().includes(q),
    );
  }, [hasSuggestions, normalized, query]);

  // Nettoyage du timer de fermeture différée au démontage.
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const closeSuggestions = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const selectItem = (item: NormalizedSuggestion) => {
    onChange(item.value);
    onSelect?.(item.value);
    closeSuggestions();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    if (!hasSuggestions) return;
    if (newValue.trim().length === 0) {
      closeSuggestions();
    } else {
      setOpen(true);
      setActiveIndex(-1);
    }
  };

  const handleFocus = () => {
    if (disabled || !hasSuggestions) return;
    if (value.trim().length > 0) {
      setOpen(true);
      setActiveIndex(-1);
    }
  };

  const handleBlur = () => {
    if (!hasSuggestions) return;
    blurTimeoutRef.current = setTimeout(() => {
      closeSuggestions();
    }, 150);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!hasSuggestions) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) =>
          Math.min(current + 1, filteredSuggestions.length - 1),
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, -1));
        break;
      case "Enter": {
        const item = filteredSuggestions[activeIndex];
        if (activeIndex >= 0 && item) {
          event.preventDefault();
          selectItem(item);
        }
        break;
      }
      case "Escape":
        closeSuggestions();
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  const handleItemMouseDown = (
    event: ReactMouseEvent<HTMLLIElement>,
    item: NormalizedSuggestion,
  ) => {
    // preventDefault : évite que le mousedown ne déplace le focus hors de
    // l'input (ce qui déclencherait le blur différé) — calque exact du
    // handler `mousedown` vanilla.
    event.preventDefault();
    selectItem(item);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange("");
    onClear?.();
    if (hasSuggestions) closeSuggestions();
    inputRef.current?.focus();
  };

  const wrapClasses = [
    "search-input-wrap",
    hasSuggestions ? "search-with-suggestions" : null,
    compact ? "search-compact" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const clearClasses = ["search-clear", value.length === 0 ? "hidden" : null]
    .filter(Boolean)
    .join(" ");

  const suggestionsClasses = ["search-suggestions", open ? null : "hidden"]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapClasses}
      role={hasSuggestions ? "combobox" : "search"}
      aria-haspopup={hasSuggestions ? "listbox" : undefined}
      aria-expanded={hasSuggestions ? open : undefined}
    >
      <span className="search-icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="search"
        className="search-input"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-autocomplete={hasSuggestions ? "list" : undefined}
        aria-controls={hasSuggestions ? listId : undefined}
      />
      <button
        type="button"
        className={clearClasses}
        aria-label="Effacer la recherche"
        tabIndex={-1}
        disabled={disabled}
        onClick={handleClear}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {hasSuggestions && (
        <ul
          id={listId}
          className={suggestionsClasses}
          role="listbox"
          aria-label="Suggestions"
        >
          {query.length > 0 && filteredSuggestions.length === 0 ? (
            <li className="search-no-result">
              Aucun résultat pour &quot;{query}&quot;
            </li>
          ) : (
            filteredSuggestions.map((item, index) => (
              <li
                key={item.value}
                className={[
                  "search-item",
                  index === activeIndex ? "active" : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => handleItemMouseDown(event, item)}
              >
                {typeof item.label === "string"
                  ? highlightMatch(item.label, query)
                  : item.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

SearchInput.displayName = "SearchInput";
