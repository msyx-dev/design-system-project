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
  /** Appelé à chaque ouverture/fermeture (observation, pas de contrôle externe). */
  onOpenChange?: (open: boolean) => void;
  /** Classes additionnelles sur `.cmd-palette`. */
  className?: string;
}

interface Group {
  category: string;
  items: CommandPaletteItem[];
}

/** Filtre + trie (index A-Z par défaut) — calque `renderResults` (`shared/components.js:4196-4262`), généralisé à une source unique d'items (le vanilla fusionne 2 tableaux internes `index`/`ACTIONS`, sans équivalent générique côté React). */
function filterItems(
  items: CommandPaletteItem[],
  query: string,
): CommandPaletteItem[] {
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
 * **Non-contrôlé** (état d'ouverture interne, comme `<ActionMenu>`/
 * `<Lightbox>`) : `onOpenChange` observe, ne pilote pas. Le vanilla est un
 * singleton injecté une fois dans `document.body` ; côté React chaque
 * instance montée porte son propre portail et son propre état — cohérent
 * avec le reste du package (aucun autre composant DS n'implémente de
 * singleton global).
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
  onOpenChange,
  className,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const uid = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const matched = useMemo(() => filterItems(items, query), [items, query]);
  const groups = useMemo(() => groupItems(matched), [matched]);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Raccourci global Ctrl/Cmd+K — posé au montage, retiré au démontage.
  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => {
          const next = !prev;
          if (next) {
            triggerRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }
          return next;
        });
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Réinitialise la recherche à l'ouverture — calque `input.value = '';
  // renderResults('')`.
  useEffect(() => {
    if (open) setQuery("");
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

  useEffect(() => {
    onOpenChange?.(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function activate(item: CommandPaletteItem) {
    setOpen(false);
    item.onSelect();
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
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
    if (event.target === overlayRef.current) setOpen(false);
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
                      {item.icon != null && (
                        <span className="cmd-item-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                      )}
                      <span className="cmd-item-text">{item.label}</span>
                      <span className="cmd-item-shortcut">
                        {item.category ?? ""}
                      </span>
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
