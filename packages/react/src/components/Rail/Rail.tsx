import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
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

export interface RailSection {
  /** Identifiant stable — clé React. Unique dans le rail. */
  id: string;
  /** Titre de groupe, rendu en `.rail-section-title` (calque `.sidebar-section`). Absent → la section n'affiche aucun titre, juste son contenu. */
  label?: ReactNode;
  /** Contenu libre de la section — `TreeView`, `Dropdown`, ou tout autre `ReactNode`. Fourni, prioritaire sur `items` (les deux ignorés simultanément n'a pas de sens ; les deux fournis, seul `content` est rendu). */
  content?: ReactNode;
  /** Entrées classiques de la section, même gabarit et même rendu que `RailProps.items` (sous-entrées comprises). Ignoré si `content` est fourni. */
  items?: RailItem[];
}

export interface RailProps {
  /**
   * Entrées de premier niveau (`.rail-nav`), `key = item.id`. Ignoré si
   * `sections` est fourni (voir `sections`). Reste le mode par défaut —
   * assoupli en optionnel (#906) pour qu'un rail purement `sections` n'ait
   * pas à fournir un tableau vide inutile ; tout consumer existant continue
   * de le passer sans rien changer.
   */
  items?: RailItem[];
  /**
   * Groupes composables de `.rail-nav` — alternative à `items` pour un rail
   * organisé en sections titrées et/ou pour accueillir un slot de contenu
   * libre (`TreeView`, `Dropdown`…) que `RailItem` ne peut pas représenter.
   * Fourni (même `[]`), remplace ENTIÈREMENT le rendu de `items` — les deux
   * props ne se combinent pas. @default undefined (mode `items` legacy)
   */
  sections?: RailSection[];
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
  /**
   * Où rendre le bouton de repli (#920) — `"header"` (défaut, rendu
   * historique inchangé) ou `"footer"`, à la suite des entrées de pied.
   * Le CSS ne scope pas `.rail-toggle` au header : la classe est réemployée
   * telle quelle, aucune règle nouvelle. En `"footer"`, le pied est rendu même
   * sans `footerItems` — sinon le bouton n'aurait pas de conteneur.
   */
  togglePosition?: "header" | "footer";
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
   * `position:fixed; top:var(--header-h); left:0;
   * height:calc(100vh - var(--header-h))`) — c'est le mode réel d'une app.
   * `false` garde le rail dans le flux d'un parent positionné (mode showcase
   * `.rail-demo`, calque `fullscreen` de `<Drawer>`). Sans effet sur
   * `mobileOpen`/l'overlay, qui ne s'appliquent qu'en mode fixe (voir
   * `mobileOpen`). @default true
   */
  fixed?: boolean;
  /**
   * Ouvert en panneau hors-flux sous 768px (`.rail-sidebar--fixed.open` +
   * `.rail-overlay.active`, calque `.sidebar`/`.sidebar-overlay` de
   * `layout.css`) — mode **contrôlé**. Fourni, l'état interne ET
   * `defaultMobileOpen` sont ignorés (le parent doit répercuter
   * `onMobileOpenChange`, typiquement depuis le bouton burger de son propre
   * header — comme `.sidebar` mobile, `<Rail>` n'a pas de déclencheur
   * interne). Sans effet si `fixed={false}`. @default false (fermé)
   */
  mobileOpen?: boolean;
  /** Amorce l'état ouvert mobile au montage (mode non contrôlé uniquement). @default false */
  defaultMobileOpen?: boolean;
  /** Appelé à toute demande de fermeture (clic overlay, touche Escape) ou d'ouverture avec le prochain état. */
  onMobileOpenChange?: (open: boolean) => void;
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
 * **Slot de contenu libre — `sections` (design-system-project#906)** : `items`
 * ne pouvait accueillir qu'un `RailItem` typé, aucun point d'entrée pour un
 * `<TreeView>` ou un `<Dropdown>`. `sections` est le mode alternatif de
 * `.rail-nav` : `{ id, label?, items?, content? }[]`, rendu à la place
 * d'`items` s'il est fourni (les deux ne se combinent jamais). Chaque section
 * affiche son `label` en `.rail-section-title` (calque `.sidebar-section`)
 * puis SOIT `content` (n'importe quel `ReactNode` — profondeur libre, le
 * rail ne connaît pas sa structure), SOIT `items` (même gabarit/rendu que
 * `RailProps.items`, `content` prioritaire si les deux sont fournis). Choix
 * délibéré plutôt que de lever la limite « un seul niveau » de
 * `RailItem.children` : un slot `ReactNode` couvre déjà le cas (un consumer
 * qui a besoin d'un arbre apporte `<TreeView>`, qui gère lui-même sa propre
 * profondeur) sans faire porter au rail une recursion qu'il n'a pas à
 * connaître.
 *
 * **Géométrie d'app-shell + hors-flux mobile (#906)** : `.rail-sidebar--fixed`
 * passait sous `.site-header` (`top:0` contre le `z-index:150` de l'en-tête)
 * — corrigé (`top:var(--header-h)`, hauteur réduite d'autant), sans rien
 * changer côté props. Sous 768px, `.rail-sidebar--fixed` bascule hors-écran
 * avec overlay — calque exact de `.sidebar`/`.sidebar-overlay`
 * (`layout.css`) — piloté par `mobileOpen`/`defaultMobileOpen`/
 * `onMobileOpenChange`, mode **contrôlé** comme `collapsed`. Comme
 * `.sidebar`, `<Rail>` n'a pas de bouton burger interne : le consumer câble
 * le sien (typiquement dans son propre header) sur `onMobileOpenChange`. Sans
 * effet en mode `fixed={false}` (`<HelpNav>` de KeepThread, non-fixe,
 * inchangé). Fermeture au clic sur l'overlay ET à `Escape` (écoute globale
 * `document`, active uniquement quand ouvert — même pattern que `<Drawer>`).
 *
 * **Tokens de largeur (#906)** : `--rail-w`/`--rail-w-collapsed`
 * (`tokens.css`) remplacent les `260px`/`64px` en dur — un consumer peut
 * offsetter son propre layout dessus, comme `.main` le fait déjà sur
 * `--sidebar-w`.
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
 * SSR-safe : aucun accès à `document`/`window` au niveau module ni pendant le
 * rendu — tout l'état est du `useState` React pur ; seule l'écoute `Escape`
 * de la fermeture mobile touche `document`, et uniquement dans un
 * `useEffect` (post-hydratation, même garantie que `<Drawer>`).
 */
export function Rail({
  togglePosition = "header",
  items = [],
  sections,
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
  mobileOpen: mobileOpenProp,
  defaultMobileOpen = false,
  onMobileOpenChange,
  className,
  id,
}: RailProps) {
  const toggleId = useId();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [internalExpandedIds, setInternalExpandedIds] =
    useState<string[]>(defaultExpandedIds);
  const [internalMobileOpen, setInternalMobileOpen] =
    useState(defaultMobileOpen);

  const collapsed = collapsedProp ?? internalCollapsed;
  const expandedIds = expandedIdsProp ?? internalExpandedIds;
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;

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

  function setMobileOpen(next: boolean) {
    if (mobileOpenProp === undefined) setInternalMobileOpen(next);
    onMobileOpenChange?.(next);
  }

  // Escape ferme le panneau mobile (#906) — écoute globale active uniquement
  // quand ouvert ET fixe (mode non-fixe n'a pas d'état hors-écran à fermer),
  // même pattern que <Drawer>.
  useEffect(() => {
    if (!fixed || !mobileOpen) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fixed, mobileOpen, mobileOpenProp, onMobileOpenChange]);

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

  function renderSection(section: RailSection) {
    return (
      <div key={section.id}>
        {section.label ? (
          <div className="rail-section-title">{section.label}</div>
        ) : null}
        {section.content ??
          (section.items ?? []).map((item) => renderItem(item))}
      </div>
    );
  }

  const sidebarClasses = [
    "rail-sidebar",
    collapsed ? "collapsed" : null,
    fixed ? "rail-sidebar--fixed" : null,
    fixed && mobileOpen ? "open" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const overlayClasses = ["rail-overlay", mobileOpen ? "active" : null]
    .filter(Boolean)
    .join(" ");

  // Un SEUL bouton, rendu à un endroit ou à l'autre (#920) : le dupliquer
  // dans les deux conteneurs donnerait deux cibles clavier pour une action.
  const toggleInFooter = togglePosition === "footer";
  const toggleButton = (
    <button
      type="button"
      className="rail-toggle"
      aria-label={collapsed ? expandLabel : collapseLabel}
      aria-expanded={!collapsed}
      onClick={toggleCollapsed}
    >
      <Icon name="chevron-left" className="icon icon--sm" aria-hidden="true" />
    </button>
  );

  return (
    <>
      {fixed ? (
        <div className={overlayClasses} onClick={() => setMobileOpen(false)} />
      ) : null}
      <div className={sidebarClasses} id={id}>
        <div className="rail-header">
          {brand ? <span className="rail-logo">{brand}</span> : null}
          {toggleInFooter ? null : toggleButton}
        </div>
        <nav className="rail-nav" aria-label={ariaLabel}>
          {sections
            ? sections.map((section) => renderSection(section))
            : items.map((item) => renderItem(item))}
        </nav>
        {footerItems?.length || toggleInFooter ? (
          <div className="rail-footer">
            {footerItems?.map((item) => renderItem(item, { nested: true }))}
            {toggleInFooter ? toggleButton : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

Rail.displayName = "Rail";
