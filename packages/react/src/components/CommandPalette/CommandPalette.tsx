import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export interface CommandPaletteItem {
  /** Identifiant unique — clé React + navigation clavier. */
  id: string;
  /** Libellé affiché dans `.cmd-item-text`, aussi filtré par la recherche. */
  label: string;
  /** Icône rendue dans `.cmd-item-icon` (glyphe libre — emoji, `<Icon>`, sprite…). */
  icon?: ReactNode;
  /**
   * Catégorie — regroupe l'item sous un `.cmd-group-title`, et alimente
   * `.cmd-item-shortcut` (calque exact `item.category` du vanilla, qui sert
   * les deux rôles). Filtrée par la recherche au même titre que `label`.
   */
  category?: string;
  /** Appelé à la sélection (clic, Entrée) — la palette se ferme ensuite. */
  onSelect: () => void;
}

export interface CommandPaletteProps {
  /** Items indexés (nav + actions confondus — un seul champ `category` les distingue). */
  items: CommandPaletteItem[];
  /** `aria-label` de l'overlay `role="dialog"`. @default "Palette de commandes" */
  overlayLabel?: string;
  /** Placeholder du champ de recherche. @default "Rechercher une page, commande..." */
  placeholder?: string;
  /**
   * Ouverture **contrôlée** (#911) — même convention que `searchQuery` :
   * fournir `open` bascule l'état d'ouverture en contrôlé, le parent devient
   * la source de vérité et `onOpenChange` sa seule voie de notification.
   * Omis, le composant garde son état interne (comportement historique).
   */
  open?: boolean;
  /**
   * Appelé à chaque ouverture/fermeture. Observation en non-contrôlé ; en
   * contrôlé (`open` fourni), c'est le canal par lequel le parent applique —
   * ou refuse — le changement.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Recherche **contrôlée** (#911) — même convention que `<Dropdown>` (#855) :
   * fournir `searchQuery` bascule le champ en contrôlé. C'est ce qui permet
   * de déclencher une requête serveur à la frappe.
   */
  searchQuery?: string;
  /** Notifié à chaque frappe, et à `""` quand la palette réinitialise sa recherche. */
  onSearchChange?: (query: string) => void;
  /**
   * Filtrage interne (sous-chaîne sur `label`/`category`, index A-Z quand la
   * requête est vide). `false` affiche `items` **tel quel**, sans filtre ni
   * tri : le cas d'une recherche déjà exécutée côté serveur, dont l'ordre de
   * pertinence ne doit pas être réécrit. @default true
   */
  shouldFilter?: boolean;
  /**
   * Raccourci global `Ctrl/Cmd+K`. `false` ne pose plus l'écouteur — au
   * consommateur d'ouvrir la palette (typiquement via `open`), par exemple
   * pour s'interposer et avertir d'une saisie en cours. `Échap` reste géré.
   * @default true
   */
  enableShortcut?: boolean;
  /**
   * Rendu du CONTENU d'un résultat (extrait surligné, date, contexte…). Le
   * `.cmd-item` lui-même — classes DS, `role="option"`, `aria-selected`, id
   * de `aria-activedescendant`, clic — reste fourni par le composant : le
   * contrat d'accessibilité n'est pas délégué au consommateur.
   */
  renderItem?: (
    item: CommandPaletteItem,
    state: { active: boolean; index: number },
  ) => ReactNode;
  /** Classes additionnelles sur `.cmd-palette`. */
  className?: string;
}

interface Group {
  category: string;
  items: CommandPaletteItem[];
}

/** Filtre + trie (index A-Z par défaut) — calque `renderResults` (`shared/components.js:4196-4262`), généralisé à une source unique d'items (le vanilla fusionne 2 tableaux internes `index`/`ACTIONS`, sans équivalent générique côté React). `shouldFilter: false` (#911) court-circuite les DEUX : ni filtre, ni tri — une liste renvoyée par un serveur arrive triée par pertinence, la retrier en A-Z détruirait l'information. */
function filterItems(
  items: CommandPaletteItem[],
  query: string,
  shouldFilter = true,
): CommandPaletteItem[] {
  if (!shouldFilter) return items;
  const q = query.trim().toLowerCase();
  if (q === "") {
    return [...items].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      (item.category ?? "").toLowerCase().includes(q),
  );
}

/** Groupe par catégorie, ordre de première apparition — calque exact la boucle `groupOrder`/`groups` du vanilla. */
function groupItems(items: CommandPaletteItem[]): Group[] {
  const order: string[] = [];
  const byCategory = new Map<string, CommandPaletteItem[]>();
  for (const item of items) {
    const cat = item.category || "Autre";
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
      order.push(cat);
    }
    byCategory.get(cat)!.push(item);
  }
  return order.map((category) => ({
    category,
    items: byCategory.get(category)!,
  }));
}

/**
 * CommandPalette — Palette de commandes du Design System msyx.fr
 * (`divers.html` #command-palette, calque `initCommandPalette` —
 * `shared/components.js:4129-4349`).
 *
 * Émet le markup canonique `.cmd-overlay`/`.cmd-palette` (`components/overlays.css`) :
 * ```html
 * <div class="cmd-overlay open" role="dialog" aria-modal="true" aria-label="Palette de commandes">
 *   <div class="cmd-palette" role="combobox" aria-expanded="true" aria-haspopup="listbox">
 *     <div class="cmd-input-wrap">
 *       <span class="cmd-input-icon" aria-hidden="true">🔍</span>
 *       <input class="cmd-input" aria-controls="cmd-listbox-…" aria-autocomplete="list">
 *       <div class="cmd-kbd"><kbd>Esc</kbd></div>
 *     </div>
 *     <div class="cmd-results" id="cmd-listbox-…" role="listbox" aria-label="Résultats">
 *       <div class="cmd-group-title">Composants</div>
 *       <div class="cmd-item active" id="cmd-item-…-0" role="option" aria-selected="true">
 *         <span class="cmd-item-icon">…</span><span class="cmd-item-text">Boutons</span><span class="cmd-item-shortcut">Composants</span>
 *       </div>
 *     </div>
 *     <div class="cmd-footer">…</div>
 *   </div>
 * </div>
 * ```
 *
 * **Non-contrôlé PAR DÉFAUT** (état d'ouverture interne, comme `<ActionMenu>`/
 * `<Lightbox>`) : sans les props de contrôle, `onOpenChange` observe et ne
 * pilote pas — comportement d'origine strictement inchangé. Le vanilla est un
 * singleton injecté une fois dans `document.body` ; côté React chaque
 * instance montée porte son propre portail et son propre état — cohérent
 * avec le reste du package (aucun autre composant DS n'implémente de
 * singleton global).
 *
 * **Mode contrôlé, pour une palette adossée au serveur (#911)** — quatre
 * verrous levés, chacun opt-in, aucun n'altère l'usage statique :
 * - `searchQuery`/`onSearchChange` (convention `<Dropdown>` #855) : le parent
 *   voit la frappe et déclenche sa requête ;
 * - `shouldFilter={false}` : `items` est affiché **tel quel**, ni filtré ni
 *   retrié — l'ordre de pertinence du serveur est une information, la remettre
 *   en A-Z la détruirait ;
 * - `open`/`onOpenChange` : le parent devient la source de vérité de
 *   l'ouverture et peut donc **s'interposer** (avertir d'une saisie en cours,
 *   refuser l'ouverture) ;
 * - `enableShortcut={false}` : l'écouteur `Ctrl/Cmd+K` n'est plus posé du
 *   tout, au consommateur de câbler son propre déclencheur. `Échap` continue
 *   de fermer.
 *
 * Chaque bascule est indépendante : on peut contrôler la recherche sans
 * contrôler l'ouverture, et réciproquement. En contrôlé, le composant
 * **notifie sans écrire** — y compris pour la réinitialisation de la
 * recherche à l'ouverture, qui part en `onSearchChange("")`.
 *
 * **`renderItem`** rend le CONTENU d'un résultat (extrait, date, contexte).
 * Le `.cmd-item` porteur — classes DS, `role="option"`, `aria-selected`, id
 * cible de `aria-activedescendant`, gestion du clic — reste fourni par le
 * composant : déléguer ça au consommateur reviendrait à lui déléguer le
 * contrat d'accessibilité, que le DS existe précisément pour tenir.
 *
 * **Raccourci global `Ctrl/Cmd+K` — posé au montage, RETIRÉ au démontage**
 * (calque `document.addEventListener('keydown', …)`, `shared/components.js:4337`) :
 * contrairement au vanilla qui bind une fois pour la durée de vie de la page
 * (jamais retiré — un singleton n'a pas besoin de cleanup), le composant
 * React peut monter/démonter plusieurs fois dans une session (route
 * conditionnelle, feature flag…) ; l'écouteur `document` est donc posé dans
 * un `useEffect` à dépendances vides et retiré dans sa fonction de nettoyage
 * — un écouteur `document` qui survit au démontage est la fuite mémoire
 * classique de ce genre de composant en React. Testé explicitement
 * (`CommandPalette.test.tsx` — un 2e `Ctrl+K` après démontage ne rouvre
 * rien).
 *
 * **Navigation clavier (calque exact `shared/components.js:4316-4332`)** :
 * `ArrowDown`/`ArrowUp` déplacent la sélection **sans boucler** (`Math.min`/
 * `Math.max`, pas de modulo — contrairement à `<Tabs>`/`<SegmentedControl>`),
 * `Entrée` active l'item sélectionné, `Échap` ferme. Aucune touche
 * supplémentaire (`Home`/`End` notamment) n'est ajoutée — le vanilla ne les
 * gère pas, reprise du contrat tel quel plutôt qu'inventée.
 *
 * **Recherche + groupes** : filtre substring insensible à la casse sur
 * `label`/`category` (query vide → index A-Z, `localeCompare('fr')`),
 * regroupement par catégorie dans l'ordre de première apparition — calque
 * exact `renderResults`. Le vanilla fusionne deux tableaux internes
 * (`index` triable + `ACTIONS` non triées toujours en fin) propres au site
 * DS ; le wrapper généralise à la seule source `items` fournie par le
 * consommateur (voir `filterItems`).
 *
 * **Surface modale — focus WAI-APG, ajouté vs le vanilla (aligné sur le
 * contrat `<Modal>`)** : `openOverlay()`/`closeOverlay()` (vanilla) posent le
 * focus sur `.cmd-input` à l'ouverture (`input.focus()`) mais **ne
 * restaurent jamais** le focus vers le déclencheur à la fermeture — confirmé
 * par lecture complète des deux fonctions, aucun `createFocusRestore()`/
 * `attachFocusRestore()` câblé sur cette surface, exactement le même défaut
 * que `<Lightbox>` (#896). C'est d'autant plus net ici que l'ouverture n'est
 * PAS un clic sur un élément dédié mais un raccourci clavier global :
 * `document.activeElement` au moment de `Ctrl+K` EST le déclencheur réel.
 * Le wrapper capture cet élément synchronement dans le handler du raccourci
 * (avant `setOpen(true)`, même timing que `<Modal>` avant `showModal()`) et
 * restaure son focus à la fermeture (si toujours attaché au DOM) — testé
 * explicitement. **Divergence à signaler** : ce gap vanilla devrait faire
 * l'objet d'un ticket dédié pour aligner `initCommandPalette` sur le contrat
 * `<Modal>`/`<BottomSheet>`, comme #896 pour `<Lightbox>`.
 *
 * **Overlay toujours monté (portail permanent sur `document.body`)** : comme
 * le vanilla (`opacity`/`pointer-events` pilotés par `.open`, transition CSS
 * 0.2s, `cmd-overlay { display` jamais togglé) — démonter/remonter le nœud à
 * chaque fermeture casserait le fondu de sortie.
 *
 * SSR-safe : aucun accès à `document`/`window` au niveau module ; tout est
 * dans `useEffect`/handlers (post-hydratation).
 */
export function CommandPalette({
  items,
  overlayLabel = "Palette de commandes",
  placeholder = "Rechercher une page, commande...",
  open: controlledOpen,
  onOpenChange,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  shouldFilter = true,
  enableShortcut = true,
  renderItem,
  className,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  // Bascules contrôlé / non contrôlé — même convention que `<Dropdown>` (#855) :
  // une prop definie fait du parent la source de verite, le composant se
  // contente de NOTIFIER. Sans elles, l'etat interne historique est conserve.
  const openControlled = controlledOpen !== undefined;
  const open = openControlled ? controlledOpen : internalOpen;
  const searchControlled = controlledSearchQuery !== undefined;
  const query = searchControlled ? controlledSearchQuery : internalQuery;

  const uid = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const matched = useMemo(
    () => filterItems(items, query, shouldFilter),
    [items, query, shouldFilter],
  );
  const groups = useMemo(() => groupItems(matched), [matched]);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  function setQuery(next: string) {
    if (!searchControlled) setInternalQuery(next);
    onSearchChange?.(next);
  }

  // Etat courant lisible depuis l'ecouteur `document`, pose une seule fois.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Demande d'ouverture/fermeture. En contrôlé, seule la notification part :
  // le parent applique (ou refuse — c'est le point de #911, s'interposer avant
  // l'ouverture). Un no-op (`next` deja courant) ne notifie pas, ce qui preserve
  // la semantique historique : `setOpen(false)` sur une palette fermee ne
  // declenchait aucun rendu, donc aucun `onOpenChange`.
  function requestOpen(next: boolean) {
    if (next === openRef.current) return;
    if (next) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    if (!openControlled) setInternalOpen(next);
    // En non-contrôlé, la notification reste portee par l'effet ci-dessous
    // (comportement historique, appel au montage inclus) — la dedoubler ici
    // ferait deux appels par changement.
    if (openControlled) onOpenChange?.(next);
  }

  // Raccourci global Ctrl/Cmd+K — posé au montage, retiré au démontage.
  // `latestRef` : l'ecouteur reste unique (comme avant #911) tout en voyant
  // toujours les props courantes, sans se re-poser a chaque rendu du parent.
  const latestRef = useRef({ requestOpen, enableShortcut });
  useEffect(() => {
    latestRef.current = { requestOpen, enableShortcut };
  });
  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      const current = latestRef.current;
      if (
        current.enableShortcut &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        current.requestOpen(!openRef.current);
      } else if (event.key === "Escape") {
        current.requestOpen(false);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Réinitialise la recherche à l'ouverture — calque `input.value = '';
  // renderResults('')`. En contrôlé, NOTIFIE `onSearchChange("")` sans ecrire :
  // c'est le parent qui vide (ou non) sa propre requete.
  useEffect(() => {
    if (open) setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus le champ à l'ouverture — calque `input.focus()`.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Restitution du focus à la fermeture (WAI-APG, ajoutée vs le vanilla).
  useEffect(() => {
    if (open) return;
    const trigger = triggerRef.current;
    if (trigger && document.contains(trigger)) trigger.focus();
    triggerRef.current = null;
  }, [open]);

  // Sélection réinitialisée sur le 1er résultat à chaque changement de
  // requête (ou à l'ouverture) — calque `activeIdx = -1` puis
  // `if (globalIdx > 0) setActive(0)` en fin de `renderResults`.
  useEffect(() => {
    setActiveIndex(flatItems.length > 0 ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  // Scroll l'item actif dans la vue — calque `scrollIntoView({ block: 'nearest' })`.
  // Garde défensive : jsdom (environnement de test) n'implémente pas
  // `Element.prototype.scrollIntoView` — absente, pas seulement no-op
  // (même nature de gap que `getScreenCTM()`, cf. `test-setup.ts`).
  useEffect(() => {
    if (activeIndex < 0) return;
    itemRefs.current.get(activeIndex)?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  // Notification en NON contrôlé : portee par l'etat interne, comportement
  // historique inchange (appel au montage compris). En contrôlé, l'effet ne
  // verrait jamais un changement que le parent a refuse d'appliquer —
  // `requestOpen()` notifie donc l'INTENTION, et cet effet se tait.
  useEffect(() => {
    if (openControlled) return;
    onOpenChange?.(internalOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalOpen, openControlled]);

  function activate(item: CommandPaletteItem) {
    requestOpen(false);
    item.onSelect();
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flatItems[activeIndex];
      if (item) activate(item);
    }
  }

  function handleOverlayClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === overlayRef.current) requestOpen(false);
  }

  const listboxId = `cmd-listbox-${uid}`;
  const activeItemId =
    activeIndex >= 0 ? `cmd-item-${uid}-${activeIndex}` : undefined;
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  if (!portalTarget) return null;

  let globalIdx = 0;

  return createPortal(
    <div
      ref={overlayRef}
      className={["cmd-overlay", open ? "open" : null]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={overlayLabel}
      onClick={handleOverlayClick}
    >
      <div
        className={["cmd-palette", className].filter(Boolean).join(" ")}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="cmd-input-wrap">
          <span className="cmd-input-icon" aria-hidden="true">
            &#128269;
          </span>
          <input
            ref={inputRef}
            className="cmd-input"
            type="text"
            placeholder={placeholder}
            autoComplete="off"
            aria-label="Recherche"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeItemId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <div className="cmd-kbd">
            <kbd>Esc</kbd>
          </div>
        </div>
        <div
          className="cmd-results"
          id={listboxId}
          role="listbox"
          aria-label="Résultats"
        >
          {flatItems.length === 0 ? (
            <div className="cmd-empty">
              Aucun résultat pour <strong>{query}</strong>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.category}>
                <div className="cmd-group-title">{group.category}</div>
                {group.items.map((item) => {
                  const idx = globalIdx++;
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(idx, el);
                        else itemRefs.current.delete(idx);
                      }}
                      id={`cmd-item-${uid}-${idx}`}
                      className={["cmd-item", isActive ? "active" : null]
                        .filter(Boolean)
                        .join(" ")}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => activate(item)}
                    >
                      {renderItem ? (
                        renderItem(item, { active: isActive, index: idx })
                      ) : (
                        <>
                          {item.icon != null && (
                            <span className="cmd-item-icon" aria-hidden="true">
                              {item.icon}
                            </span>
                          )}
                          <span className="cmd-item-text">{item.label}</span>
                          <span className="cmd-item-shortcut">
                            {item.category ?? ""}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="cmd-footer" aria-hidden="true">
          <span>&#8593;&#8595; Naviguer</span>
          <span>&#8629; Ouvrir</span>
          <span>Esc Fermer</span>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

CommandPalette.displayName = "CommandPalette";
