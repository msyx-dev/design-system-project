import {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Icon } from "../../icons/Icon";

export type SplitButtonVariant = "primary" | "secondary";

export interface SplitButtonItemEntry {
  /** Identifiant unique de l'item (clé React + navigation clavier). */
  id: string;
  /** Libellé affiché dans le `.menu-item`. */
  label: ReactNode;
  /** Icône optionnelle — enfant direct (`.menu-item` est déjà flex + gap). */
  icon?: ReactNode;
  /** Appelé à la sélection (clic ou Entrée/Espace) — ferme le menu ensuite. */
  onSelect?: () => void;
  /** Désactive l'item — non sélectionnable, sauté par la navigation clavier. */
  disabled?: boolean;
  /** Action destructive — `.menu-item--danger` (modifieur canonique, menu.css:50). */
  danger?: boolean;
}

export interface SplitButtonDividerEntry {
  type: "divider";
}

export type SplitButtonItem = SplitButtonItemEntry | SplitButtonDividerEntry;

export interface SplitButtonProps {
  /** Libellé du bouton d'action primaire (1er enfant du wrapper). */
  label: ReactNode;
  /** Action par défaut — n'ouvre jamais le menu. */
  onClick?: () => void;
  /** Items du menu (actions et/ou séparateurs). */
  items: SplitButtonItem[];
  /** Variante de bouton — restreinte par le CSS DS (buttons.css:122-123). @default "primary" */
  variant?: SplitButtonVariant;
  /** `aria-label` du caret icon-only (DS-PRINCIPLES §3). @default "Plus d'actions" */
  caretLabel?: string;
  /** Désactive l'action ET le caret. @default false */
  disabled?: boolean;
  /** Classes additionnelles sur `.split-button`. */
  className?: string;
  /** `id` du wrapper `.split-button`. */
  id?: string;
}

function isDivider(item: SplitButtonItem): item is SplitButtonDividerEntry {
  return "type" in item && item.type === "divider";
}

/**
 * SplitButton — action primaire + caret menu du Design System msyx.fr
 * (`pages/composants.html` #split-button, calque `initSplitButton` —
 * `shared/components.js:3881-3983`).
 *
 * Émet le markup canonique (`buttons.css:113-174` + `menu.css`) :
 * ```html
 * <div class="split-button">
 *   <button class="btn-primary" type="button">Enregistrer</button>
 *   <button class="btn-primary split-button__caret" type="button"
 *           aria-haspopup="menu" aria-expanded="false" aria-label="Plus d'actions">…</button>
 *   <div class="menu split-button__menu" role="menu">
 *     <button class="menu-item" role="menuitem" type="button">Enregistrer et fermer</button>
 *     <div class="menu-divider" role="separator"></div>
 *     <button class="menu-item menu-item--danger" role="menuitem" type="button">Annuler</button>
 *   </div>
 * </div>
 * ```
 *
 * **ÉTAT CRITIQUE — où vit `.open`** : la classe est posée sur
 * `.split-button__menu` UNIQUEMENT (`buttons.css:170`). Le wrapper
 * `.split-button` et le caret `.split-button__caret` ne la portent JAMAIS —
 * aucun sélecteur CSS ne les cible avec `.open`. Poser `.open` au mauvais
 * endroit rendrait le menu invisible avec des tests verts : c'est exactement
 * l'incident `<ActionMenu>` #612.
 *
 * **Panneau TOUJOURS monté**, seule la classe bascule — pour préserver la
 * transition CSS de sortie (`buttons.css:165-168` : `opacity`/`visibility`/
 * `transform`). Pattern `Drawer`/`BottomSheet`, PAS le montage conditionnel
 * d'`ActionMenu` (dette existante, hors scope #600).
 *
 * **Primitif canonique `.menu` (#520)** : le panneau réutilise
 * `.menu`/`.menu-item`/`.menu-divider`, PAS les alias `@deprecated`
 * `.action-menu-*` (supprimés en v3) qu'émet `<ActionMenu>`.
 *
 * **`variant` limité à primary|secondary** : `buttons.css:122-123` ne
 * neutralise le radius jointif que pour ces deux classes.
 *
 * **Non contrôlé** : état d'ouverture interne (`useState`), comme
 * `<ActionMenu>`/`<UserMenu>` — le déclencheur (le caret) fait partie du
 * composant. `open`/`onOpenChange` pourront être ajoutés plus tard sans
 * breaking change si un consumer en a besoin.
 *
 * **A11y — WAI-ARIA APG « Menu Button »** (pas `radiogroup` : DS-PRINCIPLES
 * §3.2 traite du choix exclusif, un split-button est un menu d'actions) :
 * `aria-haspopup="menu"` + `aria-expanded` sur le caret, `role="menu"` sur le
 * panneau, `role="menuitem"` sur les items. Ajouts vs vanilla :
 * `aria-labelledby`/`aria-controls` entre caret et panneau, roving
 * `tabIndex={-1}` sur les items, `inert` sur le panneau fermé (il reste monté).
 *
 * **Icône auto-contenue (#713)** : `<Icon name="chevron-down">` inline les
 * paths — JAMAIS de `<use href="/shared/icons/sprite.svg#…">`, qui dépendrait
 * d'un sprite servi par l'app consommatrice.
 *
 * SSR-safe : aucun accès `document`/`window` au niveau module ni au render ;
 * tout est en `useEffect`/handlers (post-hydratation).
 */
/** `inert` n'est pas typé par @types/react 18 (ajouté en React 19 types). */
type InertAttr = { inert?: "" };

export function SplitButton({
  label,
  onClick,
  items,
  variant = "primary",
  caretLabel = "Plus d'actions",
  disabled = false,
  className,
  id,
}: SplitButtonProps) {
  const [openState, setOpenState] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const caretId = useId();
  const menuId = useId();

  // `disabled` gagne toujours : un composant désactivé ne peut pas être ouvert
  // (y compris s'il l'était au moment où `disabled` est passé à true).
  const open = openState && !disabled;

  const enabledItems = items.filter(
    (item): item is SplitButtonItemEntry => !isDivider(item) && !item.disabled,
  );

  const closeMenu = (restoreFocus = true) => {
    setOpenState(false);
    if (restoreFocus) caretRef.current?.focus();
  };

  // Focus sur le premier item activable à l'ouverture (iso-vanilla,
  // components.js:3905-3906).
  useEffect(() => {
    if (!open) return;
    const first = enabledItems[0];
    if (first) {
      itemRefs.current.get(first.id)?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Échap + clic extérieur — listeners montés UNIQUEMENT quand ouvert (évite
  // l'empilement des handlers globaux du vanilla, components.js:6584-6604).
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        // Pas de restauration du focus : l'utilisateur l'a déplacé lui-même.
        setOpenState(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
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

  const handleSelect = (item: SplitButtonItemEntry) => {
    if (item.disabled) return;
    item.onSelect?.();
    closeMenu();
  };

  const handleCaretKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    // Entrée/Espace : laissés au click natif du <button> (toggle).
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpenState(true);
    }
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    const currentIndex = enabledItems.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    let targetIndex: number | null = null;

    switch (event.key) {
      case "ArrowDown":
        targetIndex = (currentIndex + 1) % enabledItems.length;
        break;
      case "ArrowUp":
        targetIndex =
          (currentIndex - 1 + enabledItems.length) % enabledItems.length;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = enabledItems.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = enabledItems[targetIndex];
    if (target) {
      itemRefs.current.get(target.id)?.focus();
    }
  };

  const wrapClasses = ["split-button", className].filter(Boolean).join(" ");
  // `.open` UNIQUEMENT ici (buttons.css:170) — ni sur le wrapper, ni sur le caret.
  const menuClasses = ["menu", "split-button__menu", open ? "open" : null]
    .filter(Boolean)
    .join(" ");
  // Panneau fermé : `inert` neutralise focus + annonce AT de tout le sous-arbre.
  const inertProps: InertAttr = open ? {} : { inert: "" };

  return (
    <div className={wrapClasses} id={id} ref={wrapRef}>
      <button
        type="button"
        className={`btn-${variant}`}
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </button>
      <button
        type="button"
        ref={caretRef}
        id={caretId}
        className={`btn-${variant} split-button__caret`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={caretLabel}
        disabled={disabled}
        onClick={() => setOpenState((current) => !current)}
        onKeyDown={handleCaretKeyDown}
      >
        <Icon name="chevron-down" aria-hidden="true" />
      </button>
      <div
        id={menuId}
        className={menuClasses}
        role="menu"
        aria-labelledby={caretId}
        {...inertProps}
      >
        {items.map((item, index) => {
          if (isDivider(item)) {
            // eslint-disable-next-line react/no-array-index-key
            return (
              <div
                key={`divider-${index}`}
                className="menu-divider"
                role="separator"
              />
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(item.id, node);
                } else {
                  itemRefs.current.delete(item.id);
                }
              }}
              className={["menu-item", item.danger ? "menu-item--danger" : null]
                .filter(Boolean)
                .join(" ")}
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              onKeyDown={(event) => handleItemKeyDown(event, item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

SplitButton.displayName = "SplitButton";
