import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "../../icons/Icon";
import { clampToViewport } from "./clampToViewport";

/** Item feuille — rendu `<button class="context-menu-item" role="menuitem">`. */
export interface ContextMenuSubItem {
  /** Identifiant unique (clé React + navigation clavier). */
  id: string;
  /** Libellé affiché dans l'item. */
  label: ReactNode;
  /** Icône optionnelle, rendue dans `<span class="icon">` (comme la démo DS). */
  icon?: ReactNode;
  /** Appelé à l'activation (clic, Entrée ou Espace) — ferme le menu ensuite. */
  onSelect?: () => void;
}

/** Sous-menu d'un item (un seul niveau : le CSS DS n'en gère pas davantage). */
export interface ContextMenuSubmenu {
  /** `aria-label` du `<div class="context-submenu" role="menu">` (ex. « Partager via »). */
  label: string;
  /** Items du sous-menu. */
  items: ContextMenuSubItem[];
}

/** Item de premier niveau : item feuille + sous-menu optionnel. */
export interface ContextMenuItemEntry extends ContextMenuSubItem {
  /** Sous-menu au survol → item rendu en `<div role="menuitem" aria-haspopup="true">`. */
  submenu?: ContextMenuSubmenu;
}

/** Séparateur `<div class="context-menu-divider" role="separator">`. */
export interface ContextMenuDividerEntry {
  type: "divider";
}

export type ContextMenuItem = ContextMenuItemEntry | ContextMenuDividerEntry;

export interface ContextMenuProps {
  /** Zone cible : tout clic droit à l'intérieur ouvre le menu. */
  children: ReactNode;
  /** Items du menu (actions et/ou séparateurs). */
  items: ContextMenuItem[];
  /** `aria-label` du panneau `.context-menu`. @default "Menu contextuel" */
  label?: string;
  /** Ajoute la classe DS `.context-target` (rendu « zone de démo »). @default false */
  contextTarget?: boolean;
  /** Classes additionnelles sur le conteneur de la zone cible. */
  className?: string;
  /** Classes additionnelles sur le panneau `.context-menu`. */
  menuClassName?: string;
  /**
   * `tabindex` du conteneur. `-1` (défaut) = focusable par script seulement
   * (nécessaire à la restauration du focus). Passer `0` rend la zone
   * atteignable au clavier : Maj+F10 / touche « Menu » déclenchent alors
   * nativement `contextmenu` (coordonnées 0,0 → menu clampé à 8px du bord).
   * @default -1
   */
  targetTabIndex?: number;
  /** Notifie chaque changement d'état d'ouverture. */
  onOpenChange?: (open: boolean) => void;
}

function isDivider(item: ContextMenuItem): item is ContextMenuDividerEntry {
  return "type" in item && item.type === "divider";
}

/** `useLayoutEffect` côté client, `useEffect` côté serveur (SSR-safe, no warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * ContextMenu — menu contextuel (clic droit) du Design System msyx.fr
 * (`divers.html` #context-menu, `components/overlays.css` bloc CONTEXT MENU).
 *
 * Émet le markup canonique (calqué sur `initContextMenu`,
 * `shared/components.js` L2369-2452) :
 * ```html
 * <div tabindex="-1">                        <!-- zone cible (children) -->
 *   …children…
 *   <div class="context-menu show" role="menu" aria-label="Menu contextuel"
 *        style="left:120px; top:240px">
 *     <button class="context-menu-item" role="menuitem">
 *       <span class="icon">…</span> Copier
 *     </button>
 *     <div class="context-menu-divider" role="separator"></div>
 *     <div class="context-menu-item" role="menuitem" aria-haspopup="true" tabindex="-1">
 *       <span class="icon">…</span> Partager
 *       <span class="context-arrow">…</span>
 *       <div class="context-submenu" role="menu" aria-label="Partager via">
 *         <button class="context-menu-item" role="menuitem">Email</button>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **État critique — `.show`** : le panneau `.context-menu` est TOUJOURS monté ;
 * sa visibilité est pilotée à 100 % par la classe `.show`
 * (`overlays.css` : base `display:none` → `.context-menu.show { display:block }`).
 * Ni `.open`, ni `.active`, ni l'attribut `hidden` — s'en écarter rend le
 * composant invisible en production alors que les tests peuvent rester verts.
 *
 * **Non-contrôlé** : état d'ouverture interne (`useState`) ; `onOpenChange`
 * notifie chaque transition.
 *
 * **Comportement** (parité `initContextMenu` sauf mention « au-delà ») :
 * - `contextmenu` (clic droit) dans la zone : `preventDefault()` + ouverture au
 *   point cliqué ;
 * - positionnement `position: fixed` avec bornage à 8px du viewport
 *   (`clampToViewport`, mesure `offsetWidth/offsetHeight` en `useLayoutEffect`
 *   donc avant peinture — aucun flash à la position non bornée) ;
 * - clic gauche hors du panneau : ferme ;
 * - clic droit hors de la zone (y compris sur une autre instance) : ferme —
 *   garantit qu'un seul menu est ouvert à la fois ;
 * - `Escape` : ferme et restaure le focus sur la zone ;
 * - **au-delà du vanilla** (DS-PRINCIPLES §3.2 / #613) : navigation clavier
 *   WAI-ARIA APG Menu — focus posé sur le premier item à l'ouverture, ↑/↓
 *   bouclants, `Home`/`End`, `Entrée`/`Espace` pour activer.
 *
 * **Limites connues** (assumées, cf. spec #468) :
 * - **sous-menus au survol uniquement** : le CSS DS n'expose aucune règle
 *   d'état sur `.context-submenu` (`.context-menu-item:hover > .context-submenu`
 *   seulement) → l'ouverture au clavier est impossible sans CSS nouveau. Ticket
 *   de suite côté DS CSS ;
 * - **pas de portal** : le panneau est rendu en place. `position: fixed` étant
 *   résolu par rapport au plus proche ancêtre porteur de `transform`, `filter`,
 *   `perspective`, `backdrop-filter` ou `contain: paint`, un tel ancêtre décale
 *   le menu. Comportement CSS standard, hors contrôle du DS : monter la zone
 *   hors d'un conteneur transformé ;
 * - pas de variante `danger` ni d'items `disabled` : aucune règle CSS DS ne les
 *   couvre pour `.context-menu-item`.
 *
 * SSR-safe : aucun accès `document`/`window` au niveau module ; tout est en
 * effets/handlers.
 */
export function ContextMenu({
  children,
  items,
  label = "Menu contextuel",
  contextTarget = false,
  className,
  menuClassName,
  targetTabIndex = -1,
  onOpenChange,
}: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  /** Items focusables de premier niveau (dividers exclus, sous-items exclus). */
  const entries = items.filter(
    (item): item is ContextMenuItemEntry => !isDivider(item),
  );

  const openAt = (x: number, y: number) => {
    setAnchor({ x, y });
    // Position provisoire = point cliqué ; corrigée par useIsoLayoutEffect
    // AVANT peinture (aucun flash possible).
    setPosition({ left: x, top: y });
    if (!open) onOpenChange?.(true);
    setOpen(true);
  };

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    onOpenChange?.(false);
    if (restoreFocus) containerRef.current?.focus();
  };

  // Bornage au viewport — mesure APRÈS l'application de `.show` (sinon
  // display:none ⇒ offsetWidth 0), avant peinture.
  useIsoLayoutEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const next = clampToViewport({
      x: anchor.x,
      y: anchor.y,
      menuWidth: menu.offsetWidth,
      menuHeight: menu.offsetHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    setPosition((prev) =>
      prev.left === next.left && prev.top === next.top ? prev : next,
    );
  }, [open, anchor.x, anchor.y]);

  // Focus du premier item à l'ouverture (WAI-ARIA APG Menu).
  useEffect(() => {
    if (!open) return;
    const first = entries[0];
    if (first) itemRefs.current.get(first.id)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Écoutes globales pendant l'ouverture (calquées sur le vanilla).
  useEffect(() => {
    if (!open) return;

    const handleDocumentClick = (event: MouseEvent) => {
      // Parité vanilla : containment testé sur LE MENU (un clic gauche sur la
      // zone ferme donc le menu).
      if (!menuRef.current?.contains(event.target as Node)) close(false);
    };
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const handleDocumentContextMenu = (event: MouseEvent) => {
      // Clic droit hors de CETTE zone (ailleurs, ou sur une autre instance)
      // ⇒ fermeture. Reproduit le « un seul menu ouvert » du vanilla.
      if (!containerRef.current?.contains(event.target as Node)) close(false);
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("contextmenu", handleDocumentContextMenu);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("contextmenu", handleDocumentContextMenu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Clic droit DANS le panneau ouvert : on ne repositionne pas.
    if (menuRef.current?.contains(event.target as Node)) return;
    openAt(event.clientX, event.clientY);
  };

  const activate = (entry: ContextMenuSubItem | ContextMenuItemEntry) => {
    // Un item parent de sous-menu SANS action est inerte (son rôle est
    // d'ouvrir le sous-menu, ce que seul le hover CSS fait).
    if (!entry.onSelect && "submenu" in entry && entry.submenu) return;
    entry.onSelect?.();
    close(true);
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    entry: ContextMenuItemEntry,
  ) => {
    const currentIndex = entries.findIndex((item) => item.id === entry.id);
    if (currentIndex === -1) return;

    let targetIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        targetIndex = (currentIndex + 1) % entries.length;
        break;
      case "ArrowUp":
        targetIndex = (currentIndex - 1 + entries.length) % entries.length;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = entries.length - 1;
        break;
      case "Enter":
      case " ":
        // Les items feuilles sont des <button> : Entrée/Espace déclenchent
        // nativement le clic → NE PAS activer ici (double appel garanti).
        // Seul l'item parent de sous-menu est un <div> : activation manuelle.
        if (entry.submenu) {
          event.preventDefault();
          activate(entry);
        }
        return;
      default:
        return;
    }

    event.preventDefault();
    const target = entries[targetIndex];
    if (target) itemRefs.current.get(target.id)?.focus();
  };

  const registerItem = (id: string) => (node: HTMLElement | null) => {
    if (node) itemRefs.current.set(id, node);
    else itemRefs.current.delete(id);
  };

  return (
    <div
      ref={containerRef}
      className={
        [contextTarget ? "context-target" : null, className]
          .filter(Boolean)
          .join(" ") || undefined
      }
      tabIndex={targetTabIndex}
      onContextMenu={handleContextMenu}
    >
      {children}
      <div
        ref={menuRef}
        className={["context-menu", open ? "show" : null, menuClassName]
          .filter(Boolean)
          .join(" ")}
        role="menu"
        aria-label={label}
        style={{ left: `${position.left}px`, top: `${position.top}px` }}
      >
        {items.map((item, index) => {
          if (isDivider(item)) {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div
                key={`divider-${index}`}
                className="context-menu-divider"
                role="separator"
              />
            );
          }

          const content = (
            <>
              {item.icon && <span className="icon">{item.icon}</span>}
              {item.label}
            </>
          );

          if (item.submenu) {
            // HTML valide : un <button> ne peut pas contenir de contenu
            // interactif, et le CSS DS exige que .context-submenu soit un
            // ENFANT DIRECT du .context-menu-item
            // (`.context-menu-item:hover > .context-submenu`).
            return (
              <div
                key={item.id}
                ref={registerItem(item.id)}
                className="context-menu-item"
                role="menuitem"
                aria-haspopup="true"
                tabIndex={-1}
                onClick={() => activate(item)}
                onKeyDown={(event) => handleItemKeyDown(event, item)}
              >
                {content}
                <span className="context-arrow">
                  <Icon
                    name="chevron-right"
                    className="icon icon--sm"
                    aria-hidden="true"
                  />
                </span>
                <div
                  className="context-submenu"
                  role="menu"
                  aria-label={item.submenu.label}
                >
                  {item.submenu.items.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className="context-menu-item"
                      role="menuitem"
                      onClick={() => activate(sub)}
                    >
                      {sub.icon && <span className="icon">{sub.icon}</span>}
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              ref={registerItem(item.id)}
              className="context-menu-item"
              role="menuitem"
              onClick={() => activate(item)}
              onKeyDown={(event) => handleItemKeyDown(event, item)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

ContextMenu.displayName = "ContextMenu";
