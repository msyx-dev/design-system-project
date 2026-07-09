import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";

export interface FabAction {
  /** Identifiant unique — clé React + navigation. */
  id: string;
  /** Libellé rendu dans `.fab-action-label`. */
  label: ReactNode;
  /** Icône rendue dans `.fab-action-btn`. */
  icon: ReactNode;
  /** Appelé au clic sur l'action — le menu se ferme ensuite. */
  onSelect?: () => void;
  /** `aria-label` du `.fab-action-btn`. Fallback : `label` si c'est une chaîne. */
  ariaLabel?: string;
  /**
   * Tinte l'action en rouge via `style={{ color: "var(--danger)" }}` inline.
   * AUCUNE classe DS de couleur d'action n'existe (`overlays.html:318` pose le
   * rouge en style inline) — sans ce style, impossible de faire une action
   * rouge en restant DS-legal (même piège que `FileUpload` `.progress-fill`).
   */
  danger?: boolean;
}

export interface FabProps {
  /** Actions du menu radial (`.fab-action`). Toujours montées (anim CSS via `.open`). */
  actions: FabAction[];
  /**
   * Icône du déclencheur, enveloppée dans `.fab-icon-main` (élément-cible du
   * sélecteur `.fab-menu.open .fab-trigger .fab-icon-main` qui pivote 45°).
   * @default "+"
   */
  icon?: ReactNode;
  /** `aria-label` du `.fab-trigger`. @default "Ouvrir les actions" */
  triggerLabel?: string;
  /** `aria-label` du conteneur `.fab-menu`. @default "Menu actions" */
  menuLabel?: string;
  /**
   * Classes additionnelles sur `.fab-menu`. À utiliser pour le positionnement
   * fixe en production (aucune classe DS `position: fixed` n'existe).
   */
  className?: string;
  /**
   * Styles inline sur `.fab-menu`. Le positionnement fixe prod
   * (`position: fixed; bottom: 1.5rem; right: 1.5rem`) est ABSENT du CSS DS
   * (`.fab-menu` = `position: relative`) — c'est au consumer de le poser ici.
   */
  style?: CSSProperties;
}

/**
 * FAB — Menu radial (Floating Action Button) du Design System msyx.fr
 * (`overlays.html` #fab, calqué sur `initFAB` — `shared/components.js:1513-1564`).
 *
 * **Port PARTIEL** : seul le *menu radial* interactif est porté. Les FAB
 * « plats » (`.fab` / `.fab-mini` / `.fab-extended` / `.fab-success` /
 * `.fab-danger`) sont des modifieurs CSS statiques sur un `<button>` — ils
 * relèvent de la composition directe
 * (`<button className="fab fab-mini fab-success" aria-label="…" />`), pas d'un
 * wrapper. Les wrapper serait de l'anti-principe (forward de `className` sans
 * valeur ajoutée).
 *
 * Émet le markup canonique (calqué sur la démo `overlays.html:305-324`) :
 * ```html
 * <div class="fab-menu {open?open}" aria-label="Menu actions">
 *   <div class="fab-actions" aria-live="polite">
 *     <div class="fab-action">
 *       <span class="fab-action-label">Partager</span>
 *       <button class="fab-action-btn" aria-label="Partager">…</button>
 *     </div>
 *   </div>
 *   <button class="fab fab-trigger" aria-haspopup="true" aria-expanded="false"
 *           aria-label="Ouvrir les actions">
 *     <span class="fab-icon-main">+</span>
 *   </button>
 * </div>
 * ```
 *
 * **Non-contrôlé** : état d'ouverture interne (`useState`), calqué sur
 * `ActionMenu`.
 *
 * **État critique — `.open` sur `.fab-menu`** : c'est le SEUL déclencheur CSS
 * du menu (`feedback.css:187-208`). Le conteneur `.fab-menu` reste monté en
 * permanence et bascule `.open` ; `.fab-actions`/`.fab-action` restent TOUJOURS
 * montés — l'anim opacity/transform + stagger est gérée par le CSS via
 * `.fab-menu.open .fab-action`. Contrairement à `ActionMenu` (qui démonte
 * `.action-menu`), le montage conditionnel casserait ici l'anim de sortie et
 * les sélecteurs descendants. Réplique exacte du piège `.open` de
 * `ActionMenu` (#612) : sans `.open` sur le conteneur, les actions sont
 * `opacity:0` + `pointer-events:none` = invisibles ET non cliquables.
 *
 * **Rotation trigger** : l'icône DOIT être enveloppée dans `.fab-icon-main`
 * sinon la rotation 45° (`.fab-menu.open .fab-trigger .fab-icon-main`) meurt
 * silencieusement.
 *
 * **Comportement** (calqué sur `initFAB`) : toggle `.open` au clic sur le
 * trigger, `aria-expanded` synchronisé, fermeture au clic extérieur et à
 * `Escape` (avec restauration du focus sur le trigger). La fermeture des
 * autres menus FAB ouverts émerge naturellement du handler de clic-extérieur
 * (chaque instance ferme quand on clique en dehors de son propre `.fab-menu`).
 * Aligné vanilla : pas de navigation clavier fléchée (le vanilla ne
 * l'implémente pas).
 *
 * SSR-safe : aucun accès `document`/`window` au render — tout est en
 * `useEffect`/handlers (post-hydratation).
 *
 * **A11y menu fermé (vérif adversariale)** : `.fab-actions`/`.fab-action`
 * restent TOUJOURS montés (anim CSS), leurs `.fab-action-btn` restaient donc
 * focusables au clavier même menu fermé (`pointer-events:none` en CSS
 * n'empêche PAS le focus clavier). Fix : `inert` posé sur `.fab-actions`
 * quand fermé (neutralise tous les `.fab-action-btn` en une fois), en plus
 * `tabIndex={-1}` sur chaque `.fab-action-btn` (défense en profondeur,
 * déclaratif/testable). Le `.fab-trigger` reste TOUJOURS focusable (c'est le
 * déclencheur qui rouvre le menu).
 */
/** `inert` n'est pas typé par @types/react 18 (ajouté en React 19 types). */
type InertAttr = { inert?: "" };

export function FAB({
  actions,
  icon = "+",
  triggerLabel = "Ouvrir les actions",
  menuLabel = "Menu actions",
  className,
  style,
}: FabProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Fermeture au clic extérieur + Escape (écoute globale `document`),
  // active uniquement quand le menu est ouvert. Calqué sur `initFAB` +
  // `ActionMenu`.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
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

  const handleSelect = (action: FabAction) => {
    action.onSelect?.();
    closeMenu();
  };

  const menuClasses = ["fab-menu", open ? "open" : null, className]
    .filter(Boolean)
    .join(" ");

  // Actions fermées : `inert` neutralise le focus/l'annonce AT de tous les
  // `.fab-action-btn` d'un coup. Le trigger, lui, reste toujours focusable.
  const inertProps: InertAttr = open ? {} : { inert: "" };

  return (
    <div ref={menuRef} className={menuClasses} aria-label={menuLabel} style={style}>
      <div className="fab-actions" aria-live="polite" {...inertProps}>
        {actions.map((action) => {
          const actionAria =
            action.ariaLabel ??
            (typeof action.label === "string" ? action.label : undefined);
          return (
            <div key={action.id} className="fab-action">
              <span className="fab-action-label">{action.label}</span>
              <button
                type="button"
                className="fab-action-btn"
                aria-label={actionAria}
                tabIndex={open ? undefined : -1}
                style={action.danger ? { color: "var(--danger)" } : undefined}
                onClick={() => handleSelect(action)}
              >
                {action.icon}
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        ref={triggerRef}
        className="fab fab-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="fab-icon-main">{icon}</span>
      </button>
    </div>
  );
}

FAB.displayName = "FAB";
