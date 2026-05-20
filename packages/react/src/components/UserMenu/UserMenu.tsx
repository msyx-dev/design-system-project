import {
  useState,
  useRef,
  useEffect,
  useId,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export interface UserMenuProps {
  displayName: string;
  email: string;
  avatarUrl?: string;
  authentikUserUrl: string;
  logoutUrl: string;
  // Controlled (optionnels)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Badge de rôle dans l'en-tête du dropdown (ex: "Admin", <Badge>…</Badge>)
  roleBadge?: ReactNode;
  // Items custom injectés dans une section dédiée du dropdown (ex: toggle de thème)
  extraItems?: ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({
  displayName,
  email,
  avatarUrl,
  authentikUserUrl,
  logoutUrl,
  open,
  onOpenChange,
  roleBadge,
  extraItems,
}: UserMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const baseId = useId();
  const menuId = `${baseId}-menu`;
  const triggerId = `${baseId}-trigger`;

  // Click-outside ferme le menu
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Escape global ferme + focus retour trigger
  useEffect(() => {
    function handleKeydown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isOpen]);

  // Navigation clavier dans le menu
  function handleMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const menu = e.currentTarget;
    const items = Array.from(
      menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    const idx = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case "Escape":
        // Géré par le handler global (useEffect) — ne pas doubler setIsOpen/focus
        e.preventDefault();
        break;
      case "ArrowDown":
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        e.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  }

  const initials = getInitials(displayName);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        id={triggerId}
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`Menu utilisateur — ${displayName}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="user-menu-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </span>
        <svg
          className="user-menu-caret"
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      <div
        id={menuId}
        className={`user-menu-dropdown${isOpen ? " open" : ""}`}
        role="menu"
        aria-labelledby={triggerId}
        onKeyDown={handleMenuKeyDown}
      >
        <div className="user-menu-dropdown-header">
          <span className="user-menu-dropdown-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
          </span>
          <div className="user-menu-dropdown-info">
            <span className="user-menu-dropdown-name">{displayName}</span>
            <span className="user-menu-dropdown-email">{email}</span>
            {roleBadge && (
              <span className="user-menu-dropdown-role">{roleBadge}</span>
            )}
          </div>
        </div>

        <div className="user-menu-divider" role="separator"></div>

        {extraItems && (
          <>
            {extraItems}
            <div className="user-menu-divider" role="separator"></div>
          </>
        )}

        <a
          href={authentikUserUrl}
          className="user-menu-item"
          role="menuitem"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Mon compte (ouvre un nouvel onglet)"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Mon compte
        </a>

        <form
          method="POST"
          action={logoutUrl}
          className="user-menu-logout-form"
        >
          <button
            type="submit"
            className="user-menu-item user-menu-item--danger"
            role="menuitem"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}

UserMenu.displayName = "UserMenu";
