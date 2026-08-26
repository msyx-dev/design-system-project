import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useId,
  useState,
} from "react";
import { Icon } from "../../icons/Icon";

export interface RailItem {
  /** Identifiant stable — clé React, cible de `expandedIds`/`onExpandedChange`. Unique dans le rail. */
  id: string;
  /** Libellé affiché dans `.rail-item-label` ET dans `.rail-tooltip` (mode replié). */
  label: string;
  /** Icône rendue dans `.rail-item-icon`. Le rail ne fournit AUCUNE icône par défaut — libre au consumer (glyphe DS, emoji, `<img>`…), comme `NotificationItem.icon`. */
  icon?: ReactNode;
  /** Si fourni (et sans `children`), l'item est rendu en `<a href>`. Sinon `<button type="button">`. */
  href?: string;
  /** Appelé au clic (item sans `children`) — ignoré si `disabled`. */
  onClick?: () => void;
  /** État actif — `.active` + `aria-current="page"`. Sans effet sur un item porteur de `children` (voir note plus bas). */
  active?: boolean;
  /** Désactive l'item — `.sidebar-link-disabled` (réutilisée telle quelle depuis `layout.css`, cf. note composant) + `aria-disabled` + retiré du tab order. */
  disabled?: boolean;
  /**
   * Sous-entrées — présence ⇒ l'item devient un **disclosure** (`<button>`,
   * jamais un lien) qui déplie/replie `.rail-subnav`. Un seul niveau : un
   * enfant qui porte lui-même `children` les voit ignorés (silencieusement,
   * pas d'erreur) — le CSS `.rail-subnav` ne prévoit pas de 3e niveau.
   */
  children?: RailItem[];
}

export interface RailProps {
  /** Entrées de premier niveau (`.rail-nav`), `key = item.id`. */
  items: RailItem[];
  /**
   * Accès secondaires en pied de rail (`.rail-footer`) — ex. Paramètres.
   * Rendus avec le même gabarit que `items` (icône/libellé/tooltip), mais
   * jamais imbriqués : un `footerItems[].children` est ignoré.
   */
  footerItems?: RailItem[];
  /** Contenu de `.rail-logo` (typiquement le nom du produit). Absent → `.rail-header` ne contient que le toggle. */
  brand?: ReactNode;
  /** `aria-label` du `<nav class="rail-nav">`. @default "Navigation principale" */
  ariaLabel?: string;
  /**
   * Replié — mode **contrôlé**. Fourni, l'état interne ET `defaultCollapsed`
   * sont ignorés (le parent doit répercuter `onCollapsedChange`).
   */
  collapsed?: boolean;
  /** Amorce l'état replié au montage (mode non contrôlé uniquement). @default false */
  defaultCollapsed?: boolean;
  /** Appelé à chaque bascule du repli (clic `.rail-toggle`) avec le prochain état. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Ids des items dépliés (sous-entrées visibles) — mode **contrôlé**. Fourni
   * (même `[]`), l'état interne est ignoré (le parent doit répercuter
   * `onExpandedChange`).
   */
  expandedIds?: string[];
  /** Ids dépliés au montage (mode non contrôlé uniquement). @default [] */
  defaultExpandedIds?: string[];
  /** Appelé à chaque bascule d'un disclosure avec `(nextExpandedIds, item)`. */
  onExpandedChange?: (expandedIds: string[], item: RailItem) => void;
  /** `aria-label` du toggle quand le rail est déplié (action = replier). @default "Réduire la sidebar" */
  collapseLabel?: string;
  /** `aria-label` du toggle quand le rail est replié (action = déplier). @default "Développer la sidebar" */
  expandLabel?: string;
  /**
   * Positionne le rail en bord d'écran (`.rail-sidebar--fixed` :
   * `position:fixed; top:0; left:0; height:100vh`) — c'est le mode réel
   * d'une app. `false` garde le rail dans le flux d'un parent positionné
   * (mode showcase `.rail-demo`, calque `fullscreen` de `<Drawer>`).
   * @default true
   */
  fixed?: boolean;
  /** Classes additionnelles sur `.rail-sidebar`. */
  className?: string;
  /** id du `.rail-sidebar`. */
  id?: string;
}

function isActionable(item: RailItem): boolean {
  return !item.disabled;
}

/**
 * Rail — Navigation verticale rétractable du Design System msyx.fr
 * (`navigation.html` #sidebar-rail, `components/navigation.css:181-360` +
 * `.sidebar-link-disabled` de `layout.css`) — design-system-project#857.
 *
 * Émet le markup canonique :
 * ```html
 * <div class="rail-sidebar collapsed" id="…">
 *   <div class="rail-header">
 *     <span class="rail-logo">KeepThread</span>
 *     <button class="rail-toggle" aria-label="Développer la sidebar" aria-expanded="false">
 *       <svg class="icon icon--sm" aria-hidden="true">…chevron-left…</svg>
 *     </button>
 *   </div>
 *   <nav class="rail-nav" aria-label="Navigation principale">
 *     <button class="rail-item" aria-expanded="true" aria-controls="…">
 *       <span class="rail-item-icon">…</span>
 *       <span class="rail-item-label">Projet A</span>
 *       <svg class="rail-item-caret icon icon--sm" aria-hidden="true">…chevron-down…</svg>
 *       <span class="rail-tooltip">Projet A</span>
 *     </button>
 *     <div class="rail-subnav" id="…">
 *       <a class="rail-item active" href="/projets/a/apercu" aria-current="page">…</a>
 *     </div>
 *     <a class="rail-item sidebar-link-disabled" href="#" aria-disabled="true" tabindex="-1">…</a>
 *   </nav>
 *   <div class="rail-footer">
 *     <button class="rail-item">…Paramètres…</button>
 *   </div>
 * </div>
 * ```
 *
 * **Décision structurante — un seul composant, deux états, pas deux
 * composants** (tranchée pour design-system-project#857) : le rail compact
 * (icônes seules, 64px) et la sidebar déployée (260px, libellés visibles)
 * sont le MÊME arbre DOM avec la classe `.collapsed` togglée sur
 * `.rail-sidebar` — exactement ce que `.rail-toggle` + `.rail-tooltip`
 * laissaient déjà deviner côté CSS avant même ce composant (le tooltip
 * n'a de sens QUE parce que le même item existe dans les deux états, sans
 * quoi il n'y aurait rien à rappeler). Scinder en deux composants aurait
 * dupliqué `items`/`footerItems`/la logique de sous-entrées et forcé le
 * consumer à synchroniser deux arbres de props à la main pour un seul état
 * visuel. Le seul autre état (déplié/replié d'un item à sous-entrées) suit
 * le même principe non-dupliqué : `expandedIds` contrôlé, pas un second
 * composant « RailGroup ».
 *
 * **Deux familles CSS fusionnées** : le rail est bâti sur `.rail-*`
 * (`navigation.css` — structure, repli, tooltip) ET réutilise
 * `.sidebar-link-disabled` (`layout.css`, sélecteur générique non lié à
 * `.sidebar-link`) pour l'état désactivé plutôt que dupliquer la règle sur
 * `.rail-item`. `.rail-subnav`/`.rail-item-caret`/`.rail-footer` sont NEUFS
 * (#857) : la famille `.rail-*` n'avait ni sous-entrées, ni zone basse avant
 * ce composant — seule `.sidebar-sublinks` (l'autre famille) les avait, mais
 * pour un sélecteur `.sidebar-link` incompatible avec `.rail-item`.
 *
 * **Non-contrôlé par défaut** (`collapsed`/`expandedIds` optionnels, comme
 * `<Accordion>`) : bascule interne si le parent ne pilote pas l'état.
 *
 * **Item à `children` = disclosure, jamais un lien** (choix WAI-ARIA APG
 * « Disclosure Navigation Menu ») : combiner navigation ET dépli sur un même
 * contrôle est ambigu au clavier (Entrée navigue-t-elle ou déplie-t-elle ?).
 * Si l'item doit aussi être atteignable, l'exposer une seconde fois en
 * premier enfant de `children` plutôt que de surcharger le parent.
 *
 * **Limite connue — tooltip et clipping (design-system-project#856)** :
 * `.rail-tooltip` reste `position:absolute` pur-CSS (comme `<Tooltip>`,
 * aucun composant DS ne fait de portail à ce jour). `.rail-sidebar` a été
 * délesté de son `overflow:hidden` pour ce composant (#857, voir
 * `navigation.css`), mais `.rail-nav` garde `overflow-y:auto` pour son
 * scroll — un item tout en bas d'une longue liste peut donc encore voir son
 * tooltip rogné à droite. Root cause identique à #856 (panneau absolu dans
 * un ancêtre `overflow`) ; le correctif de fond (portail/`position:fixed`)
 * est du ressort de cette issue-là, pas de celle-ci — signalé en commentaire
 * sur #856 plutôt que retenté ici en solo.
 *
 * **A11y clavier** : `:focus-within` ajouté à côté de `:hover` sur
 * `.rail-tooltip` (`navigation.css`, #857) — sans ça, Tab seul n'affichait
 * jamais le tooltip en mode replié (trou a11y indépendant du clipping
 * ci-dessus). Items désactivés : `aria-disabled="true"` + `tabIndex={-1}`
 * (jamais `disabled` natif, pour rester cohérent entre `<a>` et `<button>`,
 * calque `sidebar-link-disabled` du registre).
 *
 * SSR-safe : aucun accès à `document`/`window`, tout l'état est du `useState` React pur.
 */
export function Rail({
  items,
  footerItems,
  brand,
  ariaLabel = "Navigation principale",
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  expandedIds: expandedIdsProp,
  defaultExpandedIds = [],
  onExpandedChange,
  collapseLabel = "Réduire la sidebar",
  expandLabel = "Développer la sidebar",
  fixed = true,
  className,
  id,
}: RailProps) {
  const toggleId = useId();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [internalExpandedIds, setInternalExpandedIds] =
    useState<string[]>(defaultExpandedIds);

  const collapsed = collapsedProp ?? internalCollapsed;
  const expandedIds = expandedIdsProp ?? internalExpandedIds;

  function toggleCollapsed() {
    const next = !collapsed;
    if (collapsedProp === undefined) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  }

  function toggleExpanded(item: RailItem) {
    const isOpen = expandedIds.includes(item.id);
    const next = isOpen
      ? expandedIds.filter((openId) => openId !== item.id)
      : [...expandedIds, item.id];
    if (expandedIdsProp === undefined) setInternalExpandedIds(next);
    onExpandedChange?.(next, item);
  }

  function renderItem(item: RailItem, options: { nested?: boolean } = {}) {
    const hasChildren = !options.nested && !!item.children?.length;
    const itemClasses = [
      "rail-item",
      item.active ? "active" : null,
      item.disabled ? "sidebar-link-disabled" : null,
    ]
      .filter(Boolean)
      .join(" ");

    const content = (
      <>
        {item.icon ? <span className="rail-item-icon">{item.icon}</span> : null}
        <span className="rail-item-label">{item.label}</span>
        {hasChildren ? (
          <Icon
            name="chevron-down"
            className="rail-item-caret icon icon--sm"
            aria-hidden="true"
          />
        ) : null}
        <span className="rail-tooltip">{item.label}</span>
      </>
    );

    if (hasChildren) {
      const subnavId = `${toggleId}-subnav-${item.id}`;
      const expanded = expandedIds.includes(item.id);
      return (
        <div key={item.id}>
          <button
            type="button"
            className={itemClasses}
            aria-expanded={expanded}
            aria-controls={subnavId}
            aria-disabled={item.disabled ? "true" : undefined}
            tabIndex={item.disabled ? -1 : undefined}
            onClick={() => {
              if (isActionable(item)) toggleExpanded(item);
            }}
          >
            {content}
          </button>
          {expanded ? (
            <div className="rail-subnav" id={subnavId}>
              {(item.children ?? []).map((child) =>
                renderItem(child, { nested: true }),
              )}
            </div>
          ) : null}
        </div>
      );
    }

    const sharedProps = {
      key: item.id,
      className: itemClasses,
      "aria-current": item.active ? ("page" as const) : undefined,
      "aria-disabled": item.disabled ? ("true" as const) : undefined,
      tabIndex: item.disabled ? -1 : undefined,
    };

    if (item.href) {
      return (
        <a
          {...sharedProps}
          href={item.href}
          onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
            if (!isActionable(item)) {
              event.preventDefault();
              return;
            }
            item.onClick?.();
          }}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        {...sharedProps}
        type="button"
        onClick={() => {
          if (isActionable(item)) item.onClick?.();
        }}
      >
        {content}
      </button>
    );
  }

  const sidebarClasses = [
    "rail-sidebar",
    collapsed ? "collapsed" : null,
    fixed ? "rail-sidebar--fixed" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={sidebarClasses} id={id}>
      <div className="rail-header">
        {brand ? <span className="rail-logo">{brand}</span> : null}
        <button
          type="button"
          className="rail-toggle"
          aria-label={collapsed ? expandLabel : collapseLabel}
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
        >
          <Icon
            name="chevron-left"
            className="icon icon--sm"
            aria-hidden="true"
          />
        </button>
      </div>
      <nav className="rail-nav" aria-label={ariaLabel}>
        {items.map((item) => renderItem(item))}
      </nav>
      {footerItems?.length ? (
        <div className="rail-footer">
          {footerItems.map((item) => renderItem(item, { nested: true }))}
        </div>
      ) : null}
    </div>
  );
}

Rail.displayName = "Rail";
