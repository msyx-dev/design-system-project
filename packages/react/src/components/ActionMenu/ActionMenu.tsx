import {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ActionMenuItemEntry {
  /** Identifiant unique de l'item (clé React + navigation clavier). */
  id: string;
  /** Libellé affiché dans le `.action-menu-item`. */
  label: ReactNode;
  /** Icône optionnelle, rendue dans `.action-menu-icon`. */
  icon?: ReactNode;
  /** Appelé à la sélection (clic ou Entrée/Espace) — ferme le menu ensuite. */
  onSelect?: () => void;
  /** Désactive l'item — non sélectionnable, sauté par la navigation clavier. */
  disabled?: boolean;
}

export interface ActionMenuDividerEntry {
  type: "divider";
}

export type ActionMenuItem = ActionMenuItemEntry | ActionMenuDividerEntry;

export interface ActionMenuProps {
  /** Contenu du bouton déclencheur — prioritaire sur `label`/`icon` si fourni. */
  trigger?: ReactNode;
  /** Libellé texte du déclencheur (utilisé si `trigger` n'est pas fourni). */
  label?: string;
  /** Icône du déclencheur (utilisée si `trigger` n'est pas fourni). */
  icon?: ReactNode;
  /** Items du menu (actions et/ou séparateurs). */
  items: ActionMenuItem[];
  /**
   * Alignement du panneau par rapport au déclencheur (défaut "end").
   *
   * NOTE : le CSS DS (`overlays.css` `.action-menu`) fixe aujourd'hui
   * `right: 0` en dur — aucune classe DS n'existe pour l'alignement
   * "start". La prop est acceptée pour coller à l'API cible mais n'émet
   * aucune classe hors DS (règle "zéro style ajouté") ; elle est donc
   * actuellement un no-op visuel tant que le DS n'expose pas de variante.
   */
  align?: "start" | "end";
  /** Classes additionnelles sur le conteneur `.action-menu-wrap`. */
  className?: string;
}

function isDivider(item: ActionMenuItem): item is ActionMenuDividerEntry {
  return "type" in item && item.type === "divider";
}

/**
 * ActionMenu — Menu déroulant d'actions du Design System msyx.fr
 * (`navigation.html` #action-menu).
 *
 * Émet le markup canonique (calqué sur `initActionMenu`,
 * `shared/components.js`) :
 * ```html
 * <div class="action-menu-wrap">
 *   <button class="action-menu-trigger" aria-haspopup="menu" aria-expanded="false">…</button>
 *   <div class="action-menu" role="menu">
 *     <button class="action-menu-item" role="menuitem">
 *       <span class="action-menu-icon">…</span> Éditer
 *     </button>
 *     <div class="action-menu-divider" role="separator"></div>
 *   </div>
 * </div>
 * ```
 *
 * **Non-contrôlé** : état d'ouverture interne (`useState`), pas de prop
 * `open`/`onOpenChange` — comme un menu déroulant classique.
 *
 * **Comportement** :
 * - clic sur le trigger : ouvre/ferme le menu (toggle) ;
 * - clic sur un item actif : appelle `onSelect` puis ferme le menu et
 *   restaure le focus sur le trigger ;
 * - `Escape` : ferme le menu (écoute globale `document`, calquée sur le
 *   comportement DS vanilla) et restaure le focus sur le trigger ;
 * - clic à l'extérieur du menu : ferme (écoute globale `document`, nettoyée
 *   au démontage / à la fermeture) ;
 * - navigation clavier `role="menu"` (WAI-ARIA Menu Button, au-delà du DS
 *   vanilla qui ne l'implémente pas) : ↑/↓ déplacent le focus entre les
 *   items en bouclant, `Home`/`End` vont au premier/dernier item activable,
 *   les items `disabled` sont sautés ;
 * - focus posé sur le premier item activable à l'ouverture.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect`/handlers (post-hydratation).
 */
export function ActionMenu({
  trigger,
  label,
  icon,
  items,
  align: _align = "end",
  className,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const enabledItems = items.filter(
    (item): item is ActionMenuItemEntry => !isDivider(item) && !item.disabled,
  );

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Focus sur le premier item activable à l'ouverture.
  useEffect(() => {
    if (!open) return;
    const first = enabledItems[0];
    if (first) {
      itemRefs.current.get(first.id)?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fermeture au clic extérieur + Escape (écoute globale `document`).
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
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

  const handleSelect = (item: ActionMenuItemEntry) => {
    if (item.disabled) return;
    item.onSelect?.();
    closeMenu();
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const currentIndex = enabledItems.findIndex((item) => item.id === id);
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

  const wrapClasses = ["action-menu-wrap", className].filter(Boolean).join(" ");

  return (
    <div className={wrapClasses} ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="action-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger ?? (
          <>
            {icon}
            {label}
          </>
        )}
      </button>
      {open && (
        <div className="action-menu open" role="menu">
          {items.map((item, index) => {
            if (isDivider(item)) {
              // eslint-disable-next-line react/no-array-index-key
              return (
                <div
                  key={`divider-${index}`}
                  className="action-menu-divider"
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
                className="action-menu-item"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => handleSelect(item)}
                onKeyDown={(event) => handleItemKeyDown(event, item.id)}
              >
                {item.icon && (
                  <span className="action-menu-icon">{item.icon}</span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

ActionMenu.displayName = "ActionMenu";
