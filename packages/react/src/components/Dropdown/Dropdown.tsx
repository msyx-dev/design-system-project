import {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface DropdownOption {
  /** Valeur unique de l'option (utilisée pour `value`/`onChange`). */
  value: string;
  /** Libellé affiché dans le `.dropdown-option` (aussi utilisé pour le filtre `searchable` si string/number). */
  label: ReactNode;
  /** Désactive l'option — non sélectionnable, sautée par la navigation clavier. */
  disabled?: boolean;
}

interface DropdownCommonProps {
  /** Options à rendre dans `.dropdown-menu`. */
  options: DropdownOption[];
  /** Texte affiché dans `.dropdown-value` quand rien n'est sélectionné. */
  placeholder?: string;
  /** Ajoute `.dropdown-search` (input de filtre) en tête du menu. */
  searchable?: boolean;
  /** Libellé accessible du trigger (`aria-label`) — le DS vanilla n'en émet aucun. */
  label?: string;
  /** Classes additionnelles sur le conteneur `.dropdown`. */
  className?: string;
  /** Désactive le trigger — le menu ne peut pas s'ouvrir. */
  disabled?: boolean;
}

export interface DropdownSingleProps extends DropdownCommonProps {
  multi?: false;
  /** Valeur sélectionnée — chaîne vide `""` = aucune sélection. */
  value: string;
  onChange: (value: string) => void;
}

export interface DropdownMultiProps extends DropdownCommonProps {
  multi: true;
  /** Valeurs sélectionnées (tableau, éventuellement vide). */
  value: string[];
  onChange: (value: string[]) => void;
}

export type DropdownProps = DropdownSingleProps | DropdownMultiProps;

/**
 * Extrait un texte filtrable d'un `label` — `null` si le label n'est pas une
 * primitive (JSX complexe) auquel cas l'option reste toujours incluse par
 * `searchable` (fallback sûr, jamais de disparition surprise).
 */
function getOptionText(label: ReactNode): string | null {
  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }
  return null;
}

/**
 * Dropdown — Menu déroulant custom (div-based) du Design System msyx.fr
 * (`formulaires.html` #dropdown, `shared/components.js` handler « Dropdowns »).
 *
 * À ne pas confondre avec `<Select>` (`Input/Select.tsx`) qui wrap le
 * `<select>` natif — celui-ci reproduit le menu déroulant custom
 * (`.dropdown` / `.dropdown-trigger` / `.dropdown-menu`).
 *
 * Émet le markup canonique (`components/forms.css`) :
 * ```html
 * <div class="dropdown" data-multi="true"?>
 *   <button class="dropdown-trigger [open]" aria-haspopup="listbox" aria-expanded="…">
 *     <span class="dropdown-value">…</span>
 *     <span class="arrow">▾</span>
 *   </button>
 *   <div class="dropdown-menu [open]" role="listbox">
 *     <div class="dropdown-search"><input placeholder="Filtrer..."></div>
 *     <div class="dropdown-option [selected]" role="option" aria-selected="…">
 *       <span class="check"><svg class="icon"><use href="…#i-check"/></svg></span> Libellé
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **CLASSES D'ÉTAT — critique pour le CSS DS** (`forms.css`) :
 * - `.dropdown-menu` est `opacity:0;pointer-events:none` sans `.open` — la
 *   classe est REQUISE pour la visibilité (piège identique à ActionMenu,
 *   voir #612) ;
 * - `.dropdown-trigger.open` pilote la bordure accent + la rotation de
 *   `.arrow` (`transform: rotate(180deg)`) ;
 * - `.dropdown-option.selected` pilote la couleur accent + l'opacité de
 *   `.check` (`opacity:0` au repos, `1` si `.selected`).
 *
 * **Contrôlé** : `value`/`onChange` — aucun état interne de sélection.
 * Mode `multi` (`value: string[]`) : la sélection **ne ferme pas** le menu.
 * Mode single (`value: string`, `""` = aucune sélection) : la sélection
 * ferme le menu et restaure le focus sur le trigger.
 *
 * **A11y (au-delà du vanilla, qui n'émet aucun aria)** : trigger
 * `aria-haspopup="listbox"` + `aria-expanded`, menu `role="listbox"`
 * (+ `aria-multiselectable` si multi), options `role="option"` +
 * `aria-selected`. Navigation clavier : ↑/↓ déplacent le focus réel entre
 * options (bouclant, options `disabled` sautées), `Home`/`End` sautent au
 * premier/dernier, `Enter`/`Espace` sélectionnent, `Echap` ferme et restaure
 * le focus trigger (écoute globale `document`, comme ActionMenu). Clic
 * extérieur ferme (idem). Ouverture pose le focus sur la recherche si
 * `searchable`, sinon sur la première option activable.
 *
 * ⚠️ Dépendance sprite : l'icône `.check` est rendue via
 * `<use href="/shared/icons/sprite.svg#i-check">` — le consumer doit servir
 * le sprite SVG du DS.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect`/handlers (post-hydratation).
 */
export function Dropdown(props: DropdownProps) {
  const { options, placeholder, searchable, label, className, disabled } =
    props;
  const multi = props.multi === true;

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const generatedId = useId();
  const menuId = `dropdown-menu-${generatedId}`;

  const selectedValues: string[] = multi
    ? (props as DropdownMultiProps).value
    : (props as DropdownSingleProps).value
      ? [(props as DropdownSingleProps).value]
      : [];

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((option) => {
      const text = getOptionText(option.label);
      return text === null ? true : text.toLowerCase().includes(query);
    });
  }, [options, searchable, searchQuery]);

  const enabledFilteredOptions = filteredOptions.filter(
    (option) => !option.disabled,
  );

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  // Focus initial à l'ouverture : recherche si searchable, sinon 1ère option.
  useEffect(() => {
    if (!open) return;
    if (searchable) {
      searchInputRef.current?.focus();
    } else {
      const first = enabledFilteredOptions[0];
      if (first) {
        optionRefs.current.get(first.value)?.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Réinitialise la recherche à la fermeture.
  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  // Fermeture au clic extérieur + Echap (écoute globale `document`).
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu(true);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleTriggerClick = () => {
    if (disabled) return;
    setOpen((current) => !current);
  };

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled) return;

    if (multi) {
      const current = (props as DropdownMultiProps).value;
      const next = current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value];
      (props as DropdownMultiProps).onChange(next);
    } else {
      (props as DropdownSingleProps).onChange(option.value);
      closeMenu(true);
    }
  };

  const focusOptionAt = (index: number) => {
    const target = enabledFilteredOptions[index];
    if (target) {
      optionRefs.current.get(target.value)?.focus();
    }
  };

  const moveFocus = (currentValue: string, direction: 1 | -1) => {
    const list = enabledFilteredOptions;
    const currentIndex = list.findIndex((o) => o.value === currentValue);
    if (currentIndex === -1) return;
    const targetIndex = (currentIndex + direction + list.length) % list.length;
    focusOptionAt(targetIndex);
  };

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    option: DropdownOption,
  ) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveFocus(option.value, 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(option.value, -1);
        break;
      case "Home":
        event.preventDefault();
        focusOptionAt(0);
        break;
      case "End":
        event.preventDefault();
        focusOptionAt(enabledFilteredOptions.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        handleSelect(option);
        break;
      default:
        break;
    }
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOptionAt(0);
    }
  };

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  let displayValue: ReactNode;
  if (selectedLabels.length === 0) {
    displayValue = placeholder ?? "";
  } else if (!multi) {
    displayValue = selectedLabels[0];
  } else if (
    selectedLabels.every((l) => typeof l === "string" || typeof l === "number")
  ) {
    displayValue = selectedLabels.join(", ");
  } else {
    displayValue = `${selectedLabels.length} sélectionné${selectedLabels.length > 1 ? "s" : ""}`;
  }

  const wrapClasses = ["dropdown", className].filter(Boolean).join(" ");
  const triggerClasses = ["dropdown-trigger", open ? "open" : null]
    .filter(Boolean)
    .join(" ");
  const menuClasses = ["dropdown-menu", "open"].join(" ");

  return (
    <div
      className={wrapClasses}
      ref={wrapRef}
      data-multi={multi ? "true" : undefined}
    >
      <button
        type="button"
        ref={triggerRef}
        className={triggerClasses}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={handleTriggerClick}
      >
        <span className="dropdown-value">{displayValue}</span>
        <span className="arrow" aria-hidden="true">
          &#9662;
        </span>
      </button>
      {open && (
        <div
          className={menuClasses}
          id={menuId}
          role="listbox"
          aria-multiselectable={multi || undefined}
          aria-label={label}
        >
          {searchable && (
            <div className="dropdown-search">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Filtrer..."
                aria-label="Filtrer les options"
              />
            </div>
          )}
          {filteredOptions.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <div
                key={option.value}
                ref={(node) => {
                  if (node) {
                    optionRefs.current.set(option.value, node);
                  } else {
                    optionRefs.current.delete(option.value);
                  }
                }}
                className={["dropdown-option", selected ? "selected" : null]
                  .filter(Boolean)
                  .join(" ")}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                tabIndex={-1}
                onClick={() => handleSelect(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, option)}
              >
                <span className="check">
                  <svg className="icon" aria-hidden="true">
                    <use href="/shared/icons/sprite.svg#i-check" />
                  </svg>
                </span>
                {option.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Dropdown.displayName = "Dropdown";
