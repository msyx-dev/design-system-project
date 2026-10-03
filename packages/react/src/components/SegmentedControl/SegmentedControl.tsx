import {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface SegmentedControlOption {
  /** Valeur unique de l'option (utilisée pour `value`/`onChange`). */
  value: string;
  /** Libellé affiché dans l'item. */
  label: ReactNode;
  /** Désactive l'option — non sélectionnable, sautée par la navigation clavier. */
  disabled?: boolean;
}

export interface SegmentedControlProps {
  /** Liste des options (ordre d'affichage). */
  options: SegmentedControlOption[];
  /** Valeur active — le parent gère l'état, aucun état interne. */
  value: string;
  /** Appelé avec la nouvelle valeur sélectionnée. */
  onChange: (value: string) => void;
  /** Taille compacte (`.segmented--sm`) ou large (`.segmented--lg`). */
  size?: "sm" | "lg";
  /** Variante subtile — indicateur moins saillant (`.segmented--subtle`). */
  subtle?: boolean;
  /** Label accessible (`aria-label`) du `role="radiogroup"`, ou du `<nav>` en mode liens. */
  label?: string;
  /** Classes additionnelles sur le conteneur `.segmented`. */
  className?: string;
  /** #1016 — mode d'affichage ; défaut `"button"` (radiogroup). Pour des liens, voir `SegmentedControlLinkProps`. */
  as?: "button";
}

/** #1016 — option du mode « liens » : `href` requis (sauf à la rendre `disabled`, auquel cas il n'est pas rendu). */
export interface SegmentedControlLinkOption extends SegmentedControlOption {
  /** Cible du lien (`<a href>`). Échappée par React ; jamais interprétée par le composant. */
  href: string;
}

/**
 * #1016 — mode « liens » : `<nav>` + `<a href>`, utilisable sans JavaScript et
 * sérialisable depuis un Server Component. `as: "link"` est le discriminant.
 */
export interface SegmentedControlLinkProps
  extends Omit<SegmentedControlProps, "as" | "options" | "onChange"> {
  as: "link";
  /** Liens (ordre d'affichage), `href` requis sur chaque option. */
  options: SegmentedControlLinkOption[];
  /**
   * Optionnel. Fourni : un clic gauche sans modificateur sur un lien fait
   * `preventDefault()` puis `onChange(value)` (le lien courant n'appelle rien) —
   * navigation côté client par l'appelant. Absent, ou clic avec Ctrl/Meta/Maj/Alt
   * ou clic milieu : navigation native du navigateur.
   */
  onChange?: (value: string) => void;
}

/**
 * SegmentedControl — Segmented control du Design System msyx.fr
 * (`composants.html` #segmented-control).
 *
 * Émet le markup canonique `.segmented` / `.segmented-item` /
 * `.segmented-indicator` (`components/navigation.css`) :
 * ```html
 * <div class="segmented" role="radiogroup" aria-label="...">
 *   <span class="segmented-indicator" style="transform:translateX(...);width:...px"></span>
 *   <button class="segmented-item active" role="radio" aria-checked="true" tabindex="0">Semaine</button>
 *   <button class="segmented-item" role="radio" aria-checked="false" tabindex="-1">Mois</button>
 * </div>
 * ```
 *
 * **Contrôlé** : le parent pilote `value`/`onChange`, aucun état interne
 * hormis la position mesurée de l'indicateur.
 *
 * **Indicateur glissant** : calque le calcul de `initSegmentedControls`
 * (`shared/components.js`) — `transform: translateX(item.offsetLeft -
 * indicator.offsetLeft)` + `width: item.offsetWidth` mesurés sur l'item actif
 * via ref (l'indicateur est déjà posé à `left: 3px`, et `offsetLeft` de l'item
 * compte déjà ces 3 px de padding de `.segmented`), appliqués en style inline
 * de POSITION uniquement (aucune couleur/décoration ajoutée, celles-ci restent
 * portées par `.segmented-indicator` / `.segmented--subtle` dans le CSS DS).
 * Remesuré via `useLayoutEffect` à chaque changement de `value`/`options` pour
 * rester synchrone avec le layout avant paint, et par un `ResizeObserver` sur
 * les items (swap de police `font-display: swap`, redimensionnement — qui
 * arrivent souvent APRÈS l'hydratation).
 *
 * **Avant la première mesure** (rendu serveur, hydratation en cours) :
 * l'indicateur est rendu SANS attribut `style` (aucune largeur). Le CSS DS
 * (`navigation.css`, marqueur `.segmented-indicator:not([style*="width"])`)
 * masque alors l'indicateur et peint l'aplat sur l'item actif, qui reste lisible
 * (≥ 4,5:1). La toute première mesure s'écrit avec `transition: none` : le
 * relais de l'aplat vers l'indicateur se fait sans saut ni glissement depuis 0.
 * Les mesures suivantes glissent comme avant.
 *
 * **Navigation clavier WAI-ARIA radiogroup** : roving tabindex (`0` sur
 * l'option active, `-1` sinon), ←/→ et ↑/↓ déplacent la sélection en
 * bouclant, sautent les options `disabled`. Activation automatique (la
 * flèche sélectionne directement la nouvelle option et lui donne le focus).
 *
 * **Garde-fou roving tabindex** (#743, aligné sur `initSegmentedControls`
 * côté vanilla `shared/components.js`) : si `value` ne correspond à aucune
 * `option.value`, la première option non `disabled` reçoit `tabIndex={0}`
 * (son `aria-checked` reste `false`) pour que le `radiogroup` reste
 * atteignable au clavier. Si toutes les options sont `disabled`, aucun
 * `tabIndex={0}` n'est posé — groupe inerte, comportement attendu.
 *
 * **Mode liens (`as="link"`, #1016)** : un filtre de page statique ou rendue
 * par le serveur n'est pas un radiogroup (exception écrite à DS-PRINCIPLES §3.2).
 * Le rendu est identique au balisage de la vitrine (`composants.html`
 * #segmented-links), attribut pour attribut :
 * ```html
 * <nav class="segmented" aria-label="Filtrer par état">
 *   <span class="segmented-indicator" aria-hidden="true"></span>
 *   <a class="segmented-item active" href="?filtre=tous" aria-current="page">Tous</a>
 *   <a class="segmented-item" href="?filtre=actifs">Actifs</a>
 *   <a class="segmented-item" aria-disabled="true">Archivés</a>
 * </nav>
 * ```
 * ```tsx
 * // Server Component (Next.js) : aucun JavaScript, la navigation est native.
 * <SegmentedControl
 *   as="link"
 *   label="Filtrer par état"
 *   value={filtre}
 *   options={[
 *     { value: "tous", label: "Tous", href: "?filtre=tous" },
 *     { value: "actifs", label: "Actifs", href: "?filtre=actifs" },
 *   ]}
 * />
 * ```
 * - **Courant** : `value` désigne le lien courant (`.active` + `aria-current="page"`) ;
 *   aucune `value` correspondante = aucun lien courant, l'indicateur reste masqué.
 * - **Option `disabled`** : `<a aria-disabled="true">` SANS `href` — ni focalisable ni
 *   activable, jamais courante (ni `.active`, ni `aria-current`, ni indicateur).
 * - **Ni `role`, ni `aria-checked`, ni `tabIndex`, ni `onKeyDown`** : Tab et Entrée sont
 *   natifs ; un `role="radio"` ferait de chaque lien un faux radio.
 * - **Interception progressive (A5)** : avec `onChange`, un clic gauche sans modificateur
 *   fait `preventDefault()` puis `onChange(value)` (le lien courant n'appelle rien) — pour
 *   une navigation côté client (`router.push`). Sans `onChange`, ou avec Ctrl/Meta/Maj/Alt
 *   ou un clic milieu, la navigation reste native. Pas de prop `linkComponent` : un
 *   composant ne traverse pas la frontière Server/Client Component, et le DS ne dépend
 *   pas de Next.
 * - **Avant hydratation** : l'indicateur est rendu sans `style` (marqueur de
 *   pré-hydratation, voir plus haut) ; la mesure, 1re mesure sans transition et
 *   `ResizeObserver` compris, est celle du mode bouton.
 *
 * SSR-safe : aucun accès à `document`/`window` en dehors des effets
 * (`useLayoutEffect`/refs), qui ne s'exécutent que côté client.
 */
export function SegmentedControl(
  props: SegmentedControlProps | SegmentedControlLinkProps,
) {
  const { value, size, subtle, label, className } = props;
  // Les deux unions partagent `SegmentedControlOption` : `href` n'est lu qu'en mode liens.
  const options: SegmentedControlOption[] = props.options;
  const onChange = props.onChange;
  const itemRefs = useRef<
    Record<string, HTMLButtonElement | HTMLAnchorElement | null>
  >({});
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const pendingFocusValueRef = useRef<string | null>(null);
  // #1016 : vrai dès que l'indicateur a reçu une mesure — la toute première se fait sans transition.
  const measuredOnceRef = useRef(false);
  // Valeur courante lisible depuis le rappel du ResizeObserver (installé une fois par `options`).
  const valueRef = useRef(value);
  valueRef.current = value;
  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>({});

  const enabledOptions = options.filter((option) => !option.disabled);

  // Garde-fou roving tabindex (#743) : si `value` ne matche aucune option
  // (ex. mismatch appelant), la première option activable reste ciblable au
  // clavier plutôt que de laisser tout le groupe à tabIndex=-1. Si toutes les
  // options sont disabled, aucun fallback — groupe inerte (aligné vanilla).
  const hasActiveMatch = options.some((option) => option.value === value);
  const fallbackFocusValue = hasActiveMatch
    ? null
    : (enabledOptions[0]?.value ?? null);

  // Mesure de l'item actif -> style inline de l'indicateur. Appelée par le useLayoutEffect (changement de
  // `value`/`options`) et par le ResizeObserver (taille d'un item changée sans changement de props).
  const measure = () => {
    const activeEl = itemRefs.current[valueRef.current];
    const indicatorEl = indicatorRef.current;
    if (!activeEl || !indicatorEl) return;
    const first = !measuredOnceRef.current;
    measuredOnceRef.current = true;
    const next: CSSProperties = {
      width: activeEl.offsetWidth,
      // `.segmented-indicator` est posé à `left: 3px` et `offsetLeft` de l'item compte déjà ces 3 px :
      // on translate de l'ÉCART (aligné sur `initSegmentedControls`, #1021), pas de la position absolue.
      transform: `translateX(${activeEl.offsetLeft - indicatorEl.offsetLeft}px)`,
      ...(first ? { transition: "none" } : null),
    };
    setIndicatorStyle((prev) =>
      prev.width === next.width &&
      prev.transform === next.transform &&
      prev.transition === next.transition
        ? prev
        : next,
    );
  };

  useLayoutEffect(() => {
    measure();

    const pendingValue = pendingFocusValueRef.current;
    if (pendingValue !== null) {
      pendingFocusValueRef.current = null;
      itemRefs.current[pendingValue]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  // #1016 (A4 de #1021) : l'indicateur suit l'item actif quand la taille d'un item change sans que les props
  // changent (swap de police, redimensionnement). On observe les ITEMS, jamais l'indicateur : aucune boucle
  // d'observation possible. Garde SSR/jsdom : `ResizeObserver` peut être absent.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    Object.values(itemRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const focusAndSelect = (optionValue: string) => {
    pendingFocusValueRef.current = optionValue;
    onChange?.(optionValue);
  };

  // Mode liens (#1016, A5) : intercepter seulement quand l'appelant a fourni `onChange` ET que le
  // clic est un clic gauche « simple ». Tout le reste (Ctrl/Meta/Maj/Alt, clic milieu, `onChange`
  // absent, événement déjà traité) laisse le navigateur naviguer : ouvrir dans un nouvel onglet,
  // copier le lien et naviguer sans JavaScript doivent continuer de fonctionner.
  const handleLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    optionValue: string,
  ) => {
    if (!onChange) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (optionValue !== value) onChange(optionValue);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    optionValue: string,
  ) => {
    const currentEnabledIndex = enabledOptions.findIndex(
      (option) => option.value === optionValue,
    );
    if (currentEnabledIndex === -1) return;

    let targetIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        targetIndex = (currentEnabledIndex + 1) % enabledOptions.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        targetIndex =
          (currentEnabledIndex - 1 + enabledOptions.length) %
          enabledOptions.length;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = enabledOptions.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = enabledOptions[targetIndex];
    if (target) {
      focusAndSelect(target.value);
    }
  };

  const classes = [
    "segmented",
    size === "sm" ? "segmented--sm" : null,
    size === "lg" ? "segmented--lg" : null,
    subtle ? "segmented--subtle" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (props.as === "link") {
    return (
      <nav className={classes} aria-label={label}>
        <span
          ref={indicatorRef}
          className="segmented-indicator"
          style={indicatorStyle}
          aria-hidden="true"
        />
        {props.options.map((option) => {
          // Une option désactivée n'est jamais courante : pas de `href`, donc rien à « être là ».
          const isActive = !option.disabled && option.value === value;
          const itemClassName = ["segmented-item", isActive ? "active" : null]
            .filter(Boolean)
            .join(" ");
          if (option.disabled) {
            return (
              <a
                key={option.value}
                className={itemClassName}
                aria-disabled="true"
              >
                {option.label}
              </a>
            );
          }
          return (
            <a
              key={option.value}
              ref={(el) => {
                itemRefs.current[option.value] = el;
              }}
              className={itemClassName}
              href={option.href}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => handleLinkClick(event, option.value)}
            >
              {option.label}
            </a>
          );
        })}
      </nav>
    );
  }

  return (
    <div className={classes} role="radiogroup" aria-label={label}>
      <span
        ref={indicatorRef}
        className="segmented-indicator"
        style={indicatorStyle}
        aria-hidden="true"
      />
      {options.map((option) => {
        const isActive = option.value === value;
        const isRovingFocus =
          isActive ||
          (fallbackFocusValue !== null && option.value === fallbackFocusValue);
        return (
          <button
            key={option.value}
            ref={(el) => {
              itemRefs.current[option.value] = el;
            }}
            type="button"
            className={["segmented-item", isActive ? "active" : null]
              .filter(Boolean)
              .join(" ")}
            role="radio"
            aria-checked={isActive}
            tabIndex={isRovingFocus ? 0 : -1}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange?.(option.value)}
            onKeyDown={(event) => handleKeyDown(event, option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

SegmentedControl.displayName = "SegmentedControl";
