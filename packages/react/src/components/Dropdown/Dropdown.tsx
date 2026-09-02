import {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../icons/Icon";

/** useLayoutEffect côté client, useEffect côté serveur (SSR-safe, calque HeatmapCalendar). */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  /**
   * Motif combobox créatif (#855) : appelé avec la requête courante quand
   * l'utilisateur choisit l'entrée « + Ajouter "…" », rendue **uniquement**
   * quand `searchable` est actif, que la requête n'est pas vide et que le
   * filtre ne retourne AUCUNE option. Absent → aucune entrée de création,
   * comportement strictement inchangé.
   */
  onCreateOption?: (query: string) => void;
  /**
   * Libellé de l'entrée de création. Défaut : `Ajouter « <query> »`, la requête
   * étant rendue dans un `.dropdown-create-query`. Ignoré sans `onCreateOption`.
   */
  createOptionLabel?: (query: string) => ReactNode;
  /**
   * Recherche **contrôlée** (#855) — même convention que `value`/`onChange` :
   * fournir `searchQuery` bascule le champ en contrôlé, le parent devient
   * responsable de sa valeur. Permet de faire varier `options` selon l'état de
   * la recherche (favoris et récents tant que le champ est vide, référentiel
   * complet dès la première frappe). Absent → état interne, inchangé.
   */
  searchQuery?: string;
  /** Notifie chaque changement de la recherche (frappe, effacement à la fermeture). */
  onSearchChange?: (query: string) => void;
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
 * Valeur interne de l'entrée de création (#855). Aucune collision possible avec
 * une vraie option : l'entrée n'est rendue QUE lorsque la liste filtrée est
 * vide, donc aucune autre option n'est montée à ce moment-là.
 */
const CREATE_OPTION_VALUE = "__msyx-dropdown-create__";

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
 *       <span class="check"><svg class="icon">…path…</svg></span> Libellé
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
 * Icône `.check` auto-contenue (inline SVG via `<Icon>`, #713) — aucun
 * sprite à servir.
 *
 * **Portail sur `document.body` (#856)** : `.dropdown-menu` était rendu en
 * enfant inline, `position: absolute` relatif à `.dropdown` — clippé par
 * tout ancêtre `overflow: hidden` (`.card` notamment, vérifié en recette
 * KeepThread). Un simple passage à `position: fixed` sans déplacer le nœud
 * ne suffit pas : `.card` porte aussi `will-change: transform`, qui établit
 * un containing block pour les descendants `fixed` au même titre qu'un
 * `transform` réel (vérifié empiriquement via Playwright — `container-type`
 * seul ne piège PAS `position: fixed`, `will-change: transform` si). Le menu
 * est donc porté via `createPortal` dans `document.body` — même mécanisme
 * que `RiskMatrix`/`HeatmapCalendar`/`Toast` — avec sa position calculée à
 * l'ouverture (`useLayoutEffect`, pas de flash de position) depuis
 * `triggerRef.getBoundingClientRect()`. Aucune ré-écoute scroll/resize :
 * comportement identique au DS vanilla (position figée à l'ouverture).
 *
 * **Motif combobox créatif (#855)** — `onCreateOption` : quand la recherche ne
 * retourne AUCUNE option et que la requête n'est pas vide, une entrée
 * `.dropdown-option.dropdown-create` « + Ajouter « … » » est rendue. Elle est
 * insérée dans la liste **navigable** plutôt que rendue à part : elle hérite
 * ainsi de toute la navigation clavier existante (flèches bouclantes,
 * `Home`/`End`, `Enter`/`Espace`, focus depuis la recherche) sans dupliquer
 * la moindre logique. C'est une ACTION, pas un choix dans le référentiel :
 * elle ne prend jamais `.selected`, n'écrit pas dans `.dropdown-value`, et
 * ferme le menu dans les deux modes — y compris `multi`, où une sélection
 * ordinaire le laisse ouvert (sinon le parent ajoute l'option, elle matche la
 * requête, et le focus se retrouve sur un nœud démonté).
 *
 * **Recherche contrôlable (#855)** — `searchQuery`/`onSearchChange`, même
 * convention que `value`/`onChange` : fournir `searchQuery` bascule le champ en
 * contrôlé. Permet la divulgation progressive (favoris et récents tant que le
 * champ est vide, référentiel complet dès la première frappe) — impossible tant
 * que la requête restait un état interne. À la fermeture, le composant
 * **notifie** `onSearchChange("")` sans écrire lui-même en mode contrôlé.
 *
 * `getOptionText()` est inchangé — l'entrée de création ne passe pas par le
 * filtre (elle n'existe que lorsque celui-ci ne retourne rien), donc le contrat
 * « libellé `ReactNode` complexe ⇒ option toujours incluse » reste intact.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect`/handlers (post-hydratation).
 */
export function Dropdown(props: DropdownProps) {
  const {
    options,
    placeholder,
    searchable,
    label,
    className,
    disabled,
    onCreateOption,
    createOptionLabel,
    searchQuery: controlledSearchQuery,
    onSearchChange,
  } = props;
  const multi = props.multi === true;

  const [open, setOpen] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  // Bascule contrôlé / non contrôlé — même convention que `value`/`onChange`.
  const searchControlled = controlledSearchQuery !== undefined;
  const searchQuery = searchControlled
    ? controlledSearchQuery
    : internalSearchQuery;
  const setSearchQuery = (query: string) => {
    if (!searchControlled) setInternalSearchQuery(query);
    onSearchChange?.(query);
  };
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Entrée de création (#855) — insérée dans la liste NAVIGABLE plutôt que
  // rendue à part : elle hérite ainsi de toute la navigation clavier existante
  // (flèches bouclantes, Home/End, Enter/Espace, focus depuis la recherche)
  // sans qu'aucune de ces logiques ne soit dupliquée.
  const createQuery = searchQuery.trim();
  const showCreateOption =
    Boolean(onCreateOption) &&
    Boolean(searchable) &&
    createQuery.length > 0 &&
    filteredOptions.length === 0;

  const renderedOptions: DropdownOption[] = showCreateOption
    ? [{ value: CREATE_OPTION_VALUE, label: createQuery }]
    : filteredOptions;

  const enabledFilteredOptions = renderedOptions.filter(
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

  // Réinitialise la recherche à la fermeture. En mode contrôlé, le composant
  // NOTIFIE `onSearchChange("")` sans écrire lui-même : c'est le parent qui
  // décide, exactement comme pour `value`/`onChange`.
  useEffect(() => {
    if (!open) setSearchQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Position du menu porté (#856) — calculée à l'ouverture depuis le
  // déclencheur, AVANT peinture (useLayoutEffect) pour ne pas flasher à
  // (top:auto;left:auto) le temps d'un frame. Étire le menu à la largeur du
  // déclencheur (calque `left:0;right:0` de l'ancien `position:absolute`).
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [open]);

  // Fermeture au clic extérieur + Echap (écoute globale `document`). Le menu
  // étant porté hors de `wrapRef` (`.dropdown`, #856), un clic à l'intérieur
  // du menu porté doit AUSSI compter comme "à l'intérieur" — sinon toute
  // sélection à la souris ferme le menu avant que le clic sur l'option ne
  // soit traité.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

    // La création est une ACTION, pas un choix dans le référentiel : elle ferme
    // le menu dans les DEUX modes, y compris multi (où une sélection ordinaire
    // le laisse ouvert). Garder le menu ouvert ferait disparaître l'entrée sous
    // le focus — le parent ajoute l'option, elle matche alors la requête, et le
    // focus se retrouverait sur un nœud démonté.
    if (option.value === CREATE_OPTION_VALUE) {
      onCreateOption?.(createQuery);
      closeMenu(true);
      return;
    }

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

  // Portail #856 — cf. JSDoc du composant.
  // Cible du portail (#934) : le plus proche `<dialog open>` qui CONTIENT le
  // déclencheur, sinon `document.body`. Un `<dialog>` ouvert par `showModal()`
  // entre dans le « top layer » : il est peint au-dessus de tout le document,
  // et tout ce qui est HORS de son sous-arbre devient inerte — clic ET focus
  // bloqués — quel que soit le `z-index`. Le panneau porté dans `document.body`
  // est un FRÈRE du dialog, donc inerte ; porté DANS le dialog, il redevient
  // atteignable. Aucune valeur d'empilement ne peut remplacer ce choix de
  // conteneur : c'est ce qui distingue #934 de #932.
  const portalTarget =
    typeof document === "undefined"
      ? null
      : (triggerRef.current?.closest("dialog[open]") ?? document.body);

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
      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={menuRef}
            className={menuClasses}
            id={menuId}
            role="listbox"
            aria-multiselectable={multi || undefined}
            aria-label={label}
            style={menuStyle}
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
            {renderedOptions.map((option) => {
              const isCreate = option.value === CREATE_OPTION_VALUE;
              const selected =
                !isCreate && selectedValues.includes(option.value);
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
                  className={[
                    "dropdown-option",
                    isCreate ? "dropdown-create" : null,
                    selected ? "selected" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  // Pas de tabIndex sur les options disabled : un <div> sans
                  // tabindex n'est pas focusable au clic souris, ce qui évite
                  // qu'une option disabled cliquée reste focus-piégée (les
                  // flèches ↑/↓ n'ont d'effet que sur enabledFilteredOptions).
                  tabIndex={option.disabled ? undefined : -1}
                  onClick={() => handleSelect(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, option)}
                >
                  <span className="check">
                    <Icon name={isCreate ? "plus" : "check"} aria-hidden="true" />
                  </span>
                  {isCreate
                    ? (createOptionLabel?.(createQuery) ?? (
                        <>
                          Ajouter&nbsp;«&nbsp;
                          <span className="dropdown-create-query">
                            {createQuery}
                          </span>
                          &nbsp;»
                        </>
                      ))
                    : option.label}
                </div>
              );
            })}
          </div>,
          portalTarget,
        )}
    </div>
  );
}

Dropdown.displayName = "Dropdown";
