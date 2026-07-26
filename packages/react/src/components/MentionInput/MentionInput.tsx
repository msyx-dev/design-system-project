import {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  applyMention,
  caretRectToDropdownStyle,
  detectMentionToken,
  filterMentions,
  normalizeSuggestion,
  type MentionSuggestionObject,
  type MentionSuggestions,
  type MentionToken,
  type NormalizedMention,
} from "./mention-core";
import { getCaretCoordinates } from "./caret-position";

export type { MentionSuggestionObject, MentionSuggestions };

/** Surligne `query` dans `text` via <mark> — calque de `highlightMatch`
 *  (`components.js:5677-5684`) MAIS sans `innerHTML` : le vanilla injecte du
 *  HTML non échappé issu du consumer (défaut V1 du groom). JSX échappe. */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : part,
  );
}

export interface MentionInputProps {
  /** Valeur du textarea — composant CONTRÔLÉ, aucun state interne pour la saisie. */
  value: string;
  /** Appelé à chaque saisie ET à l'insertion d'une mention. */
  onChange: (value: string) => void;
  /** Mentionnables — fournis par le consumer, le DS ne fetch rien. */
  suggestions: MentionSuggestions;
  /** Nom accessible du textarea (`aria-label`). REQUIS — cf. <Graph>, #676. */
  ariaLabel: string;
  /** `false` = le consumer a déjà filtré (source distante). @default true */
  filter?: boolean;
  /** Requête courante après le `@`, `null` à la fermeture — pour un fetch consumer. */
  onQueryChange?: (query: string | null) => void;
  /** Valeur de la mention insérée (clic ou Entrée). */
  onSelect?: (value: string) => void;
  placeholder?: string;
  /** @default 3 */
  rows?: number;
  disabled?: boolean;
  /** `aria-label` du listbox. @default "Suggestions de mention" */
  listLabel?: string;
  /** Classes additionnelles sur `.mention-input-wrap`. */
  className?: string;
  /** Classes additionnelles sur le `.input`. */
  textareaClassName?: string;
}

/**
 * MentionInput — autocomplete `@` inline du Design System msyx.fr
 * (`feedback.html` #mention, `initMentionInput` dans `shared/components.js`).
 *
 * Markup émis (`components/forms.css`) :
 * ```html
 * <div class="mention-input-wrap">
 *   <textarea class="input" role="combobox" aria-autocomplete="list"
 *             aria-haspopup="listbox" aria-expanded="…" aria-controls="…"
 *             aria-activedescendant="…"></textarea>
 *   <ul class="mention-dropdown [open]" role="listbox" aria-label="Suggestions de mention"
 *       style="top:…px;left:…px">
 *     <li class="search-item [active]" role="option" aria-selected="…" id="…-option-0">…</li>
 *     <li class="search-no-result">Aucun résultat pour "…"</li>
 *   </ul>
 * </div>
 * ```
 *
 * **CLASSE D'ÉTAT CRITIQUE** : `.mention-dropdown.open` (`display:block`).
 * Convention INVERSE de `<SearchInput>` (`.search-suggestions.hidden`) — ne
 * jamais transposer. Item navigué : `.search-item.active`.
 *
 * A11y : combobox APG « List Autocomplete » — le focus DOM reste sur le
 * textarea, la position active passe par `aria-activedescendant` (pas de
 * roving tabindex : ce n'est pas un radiogroup, §3.2 ne s'applique pas).
 *
 * SSR : aucun accès `document`/`window` au niveau module ; toutes les mesures
 * sont dans des effets (post-hydratation). Le barrel du package porte déjà
 * "use client" (#703).
 */
export function MentionInput({
  value,
  onChange,
  suggestions,
  ariaLabel,
  filter = true,
  onQueryChange,
  onSelect,
  placeholder,
  rows = 3,
  disabled = false,
  listLabel = "Suggestions de mention",
  className,
  textareaClassName,
}: MentionInputProps) {
  const [token, setToken] = useState<MentionToken | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: string;
    left: string;
  }>();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Signature explicite `| undefined` + argument initial : `useRef<T>()` sans
  // argument ne compile pas avec @types/react 18 (cf. SearchInput.tsx).
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingCaretRef = useRef<number | null>(null);

  const listId = `mention-dropdown-${useId()}`;
  const open = token !== null;

  const normalized = useMemo<NormalizedMention[]>(
    () =>
      (suggestions as (string | MentionSuggestionObject)[]).map(
        normalizeSuggestion,
      ),
    [suggestions],
  );

  const items = useMemo(
    () =>
      token && filter ? filterMentions(normalized, token.query) : normalized,
    [normalized, token, filter],
  );

  const closeDropdown = useCallback(() => {
    setToken((prev) => {
      if (prev !== null) onQueryChange?.(null);
      return null;
    });
    setActiveIndex(-1);
  }, [onQueryChange]);

  /** Re-détecte le token à partir de la valeur + du caret réels du textarea. */
  const syncToken = useCallback(
    (nextValue: string, caret: number) => {
      const next = detectMentionToken(nextValue, caret);
      if (!next) {
        closeDropdown();
        return;
      }
      setToken(next);
      setActiveIndex(-1);
      onQueryChange?.(next.query);
    },
    [closeDropdown, onQueryChange],
  );

  // Positionnement au caret — APRÈS commit (le textarea doit porter la valeur
  // courante). Mesure DOM isolée dans getCaretCoordinates ; toute l'arithmétique
  // est pure (caretRectToDropdownStyle), donc testée séparément.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!open || !ta || !token) return;
    const rect = getCaretCoordinates(ta, token.end);
    const next = caretRectToDropdownStyle(rect, ta.scrollTop, ta.scrollLeft);
    setDropdownStyle((prev) =>
      prev && prev.top === next.top && prev.left === next.left ? prev : next,
    );
  }, [open, token, value]);

  // Restauration du caret après insertion — SANS ça, React re-rend le textarea
  // contrôlé et le caret repart en fin de texte (piège n°1 du portage).
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const caret = pendingCaretRef.current;
    if (!ta || caret === null) return;
    if (ta.value.length >= caret) ta.setSelectionRange(caret, caret);
    pendingCaretRef.current = null;
  });

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    },
    [],
  );

  const insertMention = (mention: string) => {
    if (!token) return;
    const { value: nextValue, caret } = applyMention(value, token, mention);
    pendingCaretRef.current = caret;
    onChange(nextValue);
    onSelect?.(mention);
    closeDropdown();
    textareaRef.current?.focus();
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const el = event.target;
    onChange(el.value);
    syncToken(el.value, el.selectionStart ?? el.value.length);
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    // Parité vanilla (components.js:5787-5790) : ces 4 touches sont gérées par
    // keydown et NE redéclenchent PAS la détection.
    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) return;
    const el = event.currentTarget;
    syncToken(el.value, el.selectionStart ?? el.value.length);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!open) return; // dropdown fermé → aucune interception (parité vanilla)
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (items.length === 0) return;
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (items.length === 0) return;
        // Borne à 0 (PAS -1) — parité mention, diffère de <SearchInput>.
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        const item = items[activeIndex];
        if (activeIndex >= 0 && item) {
          event.preventDefault(); // sinon retour à la ligne natif (parité)
          insertMention(item.value);
        }
        break;
      }
      case "Escape":
        event.preventDefault();
        closeDropdown();
        break;
      default:
        break;
    }
  };

  const handleBlur = () => {
    // 150 ms : laisse le mousedown d'un item s'exécuter (calque vanilla).
    blurTimeoutRef.current = setTimeout(() => closeDropdown(), 150);
  };

  const handleItemMouseDown = (
    event: ReactMouseEvent<HTMLLIElement>,
    item: NormalizedMention,
  ) => {
    event.preventDefault(); // ne pas voler le focus → pas de blur différé
    insertMention(item.value);
  };

  const wrapClasses = ["mention-input-wrap", className]
    .filter(Boolean)
    .join(" ");
  const dropdownClasses = ["mention-dropdown", open ? "open" : null]
    .filter(Boolean)
    .join(" ");
  const textareaClasses = ["input", textareaClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClasses}>
      <textarea
        ref={textareaRef}
        className={textareaClasses}
        value={value}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && activeIndex >= 0
            ? `${listId}-option-${activeIndex}`
            : undefined
        }
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
      />
      <ul
        id={listId}
        className={dropdownClasses}
        role="listbox"
        aria-label={listLabel}
        style={dropdownStyle}
      >
        {open && items.length === 0 ? (
          <li className="search-no-result">
            Aucun résultat pour &quot;{token?.query ?? ""}&quot;
          </li>
        ) : (
          open &&
          items.map((item, index) => (
            <li
              key={item.value}
              id={`${listId}-option-${index}`}
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
                ? highlightMatch(item.label, token?.query ?? "")
                : item.label}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

MentionInput.displayName = "MentionInput";
