// @msyx-dev/react — NotificationBell (#717)
//
// Port React du contrat "cloche de notifications" du header vanilla
// (shared/nav.js : buildHeader L81-88 + initHeaderNotifications L369-443).
// Composant PRÉSENTATIONNEL / CONTRÔLÉ : n'possède JAMAIS la donnée notifications.
//
// Zéro CSS nouveau : émet le markup canonique .header-notif* / .header-notification*
// (layout.css L314-570). Le panel .header-notif-panel est position:absolute ancré
// sur un parent position:relative — on réutilise .header-user-zone comme racine
// (l'ancre exacte du vanilla), aucune classe DS créée.
//
// Icône `bell` via le primitif interne <Icon> (#713) — aucun sprite à servir.

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "../../icons/Icon";

export interface NotificationItem {
  /** Clé stable (React key + identité du clic). */
  id: string;
  title: string;
  desc?: string;
  time?: string;
  /** Contenu libre de l'icône (emoji, <Icon/>, <img/>…) — parité vanilla `n.icon`. */
  icon?: ReactNode;
  /** Marque l'item comme non lu (classe d'état `.unread` + pastille CSS). */
  unread?: boolean;
  /** Si fourni, l'item est rendu en <a href> (naturellement focusable/clavier). */
  href?: string;
}

export interface NotificationBellProps {
  /** Notifications affichées (le composant ne les possède pas — data pilotée par le parent). */
  notifications: NotificationItem[];
  /**
   * Compteur du badge. Défaut : dérivé de `notifications.filter(n => n.unread).length`.
   * Prop explicite prioritaire (couvre « 42 non lues, 10 items chargés »).
   * Badge masqué (classe `.hidden`) si ≤ 0 ; « 99+ » au-delà de 99.
   */
  unreadCount?: number;
  /** Mark-all-read GLOBAL (parité header vanilla). PAS de mark-as-read individuel. */
  onMarkAllRead?: () => void;
  /**
   * Clic sur un item = notification simple. NE marque PAS lu, NE ferme PAS le panel
   * (présentationnel — le consumer pilote via `onOpenChange` si souhaité).
   */
  onItemClick?: (item: NotificationItem) => void;
  /** aria-label de la cloche. Défaut « Notifications ». */
  label?: string;
  /** Libellé du bouton mark-all-read. Défaut « Tout lire ». */
  markAllLabel?: string;
  /** Libellé de l'état vide. Défaut « Aucune notification ». */
  emptyLabel?: string;
  // Contrôlé / non-contrôlé (convention UserMenu).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Classe(s) additionnelle(s) sur la racine `.header-user-zone`. */
  className?: string;
}

// `inert` n'est pas typé par @types/react 18 (cf. alpha.12 #396) — attribut string vide.
type InertAttr = { inert?: "" };

// aria-label du panel : parité vanilla (distinct du label de la cloche). Interne
// (l'API est figée — pas de prop dédiée) ; UI FR comme le reste du DS.
const PANEL_LABEL = "Centre de notifications";

/**
 * NotificationBell — cloche de notifications du header (#717).
 *
 * **role du panel** : `role="dialog"` **non-modal** (parité vanilla `shared/nav.js`,
 * `aria-modal` NON posé) — **pas de focus trap** (décision groom). Le panel reste
 * monté (transition CSS opacity/scale via `.open`) ; fermé il est neutralisé par
 * `inert` + `aria-hidden` (précédent alpha.12 #396) pour éviter la tabulation vers
 * des items invisibles.
 *
 * Ouverture : clic cloche (toggle), Échap (ferme + refocus cloche), clic extérieur
 * (`mousedown` + `.contains`). aria : `aria-haspopup="dialog"` + `aria-expanded` +
 * `aria-controls` (léger sur-ensemble du vanilla, documenté).
 *
 * Contrôlé/non-contrôlé : `open`/`onOpenChange` (calque `UserMenu`). SSR-safe
 * (aucun accès `document`/`window` hors `useEffect`/handlers).
 */
export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  onItemClick,
  label = "Notifications",
  markAllLabel = "Tout lire",
  emptyLabel = "Aucune notification",
  open,
  onOpenChange,
  className,
}: NotificationBellProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `${useId()}-notif-panel`;

  // Badge : prop explicite prioritaire, sinon dérivé des items non lus.
  const count =
    unreadCount !== undefined
      ? unreadCount
      : notifications.filter((n) => n.unread).length;
  const badgeHidden = count <= 0;
  const badgeText = count > 99 ? "99+" : String(count);

  // Clic extérieur ferme (mousedown + contains) — patron UserMenu/Dropdown.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Échap global ferme + refocus la cloche (patron UserMenu).
  useEffect(() => {
    function handleKeydown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const triggerClasses = ["header-notification", isOpen ? "active" : null]
    .filter(Boolean)
    .join(" ");
  const badgeClasses = [
    "header-notification-badge",
    badgeHidden ? "hidden" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const panelClasses = ["header-notif-panel", isOpen ? "open" : null]
    .filter(Boolean)
    .join(" ");
  const rootClasses = ["header-user-zone", className].filter(Boolean).join(" ");

  function handleItemActivate(item: NotificationItem) {
    onItemClick?.(item);
  }
  function handleItemKeyDown(
    e: ReactKeyboardEvent<HTMLDivElement>,
    item: NotificationItem,
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleItemActivate(item);
    }
  }

  const inertProps: InertAttr = isOpen ? {} : { inert: "" };

  return (
    <div className={rootClasses} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={triggerClasses}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon name="bell" aria-hidden="true" />
        <span className={badgeClasses} aria-hidden="true">
          {badgeHidden ? "" : badgeText}
        </span>
      </button>

      <div
        id={panelId}
        className={panelClasses}
        role="dialog"
        aria-label={PANEL_LABEL}
        aria-hidden={isOpen ? undefined : true}
        {...inertProps}
      >
        <div className="header-notif-panel-header">
          <span>{label}</span>
          <button
            type="button"
            className="header-notif-mark-read"
            onClick={() => onMarkAllRead?.()}
          >
            {markAllLabel}
          </button>
        </div>

        <div className="header-notif-list">
          {notifications.length === 0 ? (
            <div className="header-notif-empty">{emptyLabel}</div>
          ) : (
            notifications.map((item) => {
              const itemClasses = [
                "header-notif-item",
                item.unread ? "unread" : null,
              ]
                .filter(Boolean)
                .join(" ");

              const inner = (
                <>
                  {item.icon != null && (
                    <span className="header-notif-icon">{item.icon}</span>
                  )}
                  <div className="header-notif-body">
                    <div className="header-notif-title">{item.title}</div>
                    {item.desc && (
                      <div className="header-notif-desc">{item.desc}</div>
                    )}
                  </div>
                  {item.time && (
                    <span className="header-notif-time">{item.time}</span>
                  )}
                </>
              );

              if (item.href) {
                return (
                  <a
                    key={item.id}
                    className={itemClasses}
                    href={item.href}
                    onClick={() => handleItemActivate(item)}
                  >
                    {inner}
                  </a>
                );
              }

              const interactive = onItemClick !== undefined;
              return (
                <div
                  key={item.id}
                  className={itemClasses}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={
                    interactive ? () => handleItemActivate(item) : undefined
                  }
                  onKeyDown={
                    interactive ? (e) => handleItemKeyDown(e, item) : undefined
                  }
                >
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

NotificationBell.displayName = "NotificationBell";
