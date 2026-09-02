import {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** useLayoutEffect côté client, useEffect côté serveur (SSR-safe, calque HeatmapCalendar/Dropdown). */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
 * **Portail sur `document.body` (#856)** : `.action-menu` était rendu en
 * enfant inline, `position: absolute` relatif à `.action-menu-wrap` —
 * clippé par tout ancêtre `overflow: hidden`. Constaté en recette KeepThread :
 * dans le panneau de détail d'un Périmètre (un `.card`), le menu Actions
 * était incliquable à la souris (`document.elementFromPoint` résolvait sur
 * `.card`, jamais sur le bouton) — seule la navigation clavier fonctionnait
 * encore, `focus()` n'étant pas affecté par le clipping visuel. Un simple
 * passage à `position: fixed` sans déplacer le nœud ne suffit pas : `.card`
 * porte aussi `will-change: transform`, qui établit un containing block pour
 * les descendants `fixed` au même titre qu'un `transform` réel (vérifié
 * empiriquement via Playwright). Le menu est donc porté via `createPortal`
 * dans `document.body` — même mécanisme que `RiskMatrix`/`HeatmapCalendar`/
 * `Toast`/`Dropdown` (#856) — avec sa position calculée à l'ouverture
 * (`useLayoutEffect`, pas de flash de position) depuis
 * `triggerRef.getBoundingClientRect()`.
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
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Position du menu porté (#856) — calculée à l'ouverture depuis le
  // déclencheur, AVANT peinture (useLayoutEffect) pour ne pas flasher à
  // (top:auto;left:auto) le temps d'un frame. Ancre le bord droit du menu
  // sur le bord droit du déclencheur, largeur intrinsèque — calque l'ancien
  // `right: 0` de `position: absolute`.
  //
  // `left` (pas `right: window.innerWidth - rect.right`, #886) : bug jumeau
  // du vanilla `openFloatingPanel()` (shared/components.js) — `window.innerWidth`
  // n'est pas garanti identique au bord droit réel du containing block d'un
  // `position: fixed` (scrollbar classique vs overlay selon l'environnement),
  // constaté flaky en CI sur `card-floating-panel-clip.spec.ts` (jamais
  // reproduit en local). `left` calculé depuis `rect.right - menu.offsetWidth`
  // reste entièrement dans l'espace de coordonnées du déclencheur — aucune
  // dépendance à une métrique globale de viewport. `menuRef.current` est déjà
  // monté à ce stade (portail + ref posés dans le même commit React que
  // l'ouverture, avant ce layout effect).
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 0;
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: rect.right - menuWidth,
    });
  }, [open]);

  // Fermeture au clic extérieur + Escape (écoute globale `document`). Le
  // menu étant porté hors de `wrapRef` (`.action-menu-wrap`, #856), un clic
  // à l'intérieur du menu porté doit AUSSI compter comme "à l'intérieur" —
  // sinon toute sélection à la souris ferme le menu avant que le clic sur
  // l'item ne soit traité.
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
      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={menuRef}
            className="action-menu open"
            role="menu"
            style={menuStyle}
          >
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
          </div>,
          portalTarget,
        )}
    </div>
  );
}

ActionMenu.displayName = "ActionMenu";
