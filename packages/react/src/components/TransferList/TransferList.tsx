import { KeyboardEvent, useMemo, useRef, useState } from "react";

export interface TransferListItem {
  /** Identifiant stable — clé React + modèle de sélection/partition. */
  id: string;
  /** Libellé affiché dans l'option. */
  label: string;
}

export type TransferDirection = "right" | "left" | "all-right" | "all-left";

export interface TransferListProps {
  /**
   * Ensemble complet des items (pool source). La partition
   * disponible/assigné est dérivée de `assigned` (id -> présent ou non).
   */
  items: TransferListItem[];
  /** ids actuellement dans le panneau « assignés » — pilote la partition. */
  assigned: string[];
  /** Appelé avec le tableau d'ids assignés mis à jour après un transfert. */
  onChange: (assignedIds: string[]) => void;
  /** Titre du panneau source. @default "Disponibles" */
  sourceTitle?: string;
  /** Titre du panneau cible. @default "Assignés" */
  targetTitle?: string;
  /** Affiche le champ `.transfer-search` par panneau. @default true */
  searchable?: boolean;
  /**
   * Texte du placeholder `.transfer-empty` affiché quand un panneau est
   * vide. Le vanilla ne l'émet jamais (`initTransferList` laisse le
   * `.transfer-body` vide) — ici c'est une amélioration opt-in : absent
   * (défaut), le comportement reste identique au vanilla (corps vide).
   */
  emptyLabel?: string;
  /** Calque du `CustomEvent transfer:change` du vanilla. */
  onTransfer?: (event: { direction: TransferDirection; count: number }) => void;
  /** Classes additionnelles sur `.transfer-list`. */
  className?: string;
}

function matchesQuery(label: string, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return label.toLowerCase().includes(trimmed);
}

/**
 * TransferList — Double liste avec transfert du Design System msyx.fr
 * (`formulaires.html` #transfer-list, calque `initTransferList` —
 * `shared/components.js:5123-5292`).
 *
 * Émet le markup canonique `.transfer-list` (`components/transfer-list.css`) :
 * 2 `.transfer-panel` (source puis cible) + colonne `.transfer-actions`
 * (4 boutons `right`/`left`/`all-right`/`all-left`) + région `aria-live`.
 *
 * **Contrôlé, modèle par id** : le vanilla identifie ses options par
 * `textContent` (deux libellés identiques seraient confondus au clic/au
 * transfert). Divergence assumée : le wrapper impose un `id` stable par
 * item (`items: {id,label}[]`), sert de clé React et de modèle de
 * sélection/partition. La partition est dérivée de `assigned` (ids côté
 * « assignés » — tout le reste est « disponible »), et `onChange` livre le
 * tableau d'ids assignés mis à jour (pas les items complets).
 *
 * **États critiques** :
 * - `.transfer-option.selected` (+ `aria-selected`) — sélection en attente
 *   de transfert, posée au clic ou Entrée/Espace. Équivalent du `.open`
 *   manquant d'`<ActionMenu>` (#612) : sans elle la sélection et les
 *   compteurs sont muets.
 * - `.transfer-option.hidden` — filtrée par la recherche du panneau
 *   (substring, insensible casse, sur `label`). La navigation clavier
 *   ↑/↓ ne parcourt QUE les options non masquées (requête DOM
 *   `.transfer-body` la plus proche, comme le vanilla `visibleOptions()`).
 * - `.transfer-empty` — définie en CSS/registre mais JAMAIS émise par le
 *   vanilla. Ici rendue uniquement si `emptyLabel` est fourni ET le
 *   panneau est vide (0 item, indépendamment du filtre) : amélioration
 *   opt-in, parité stricte par défaut (corps vide sans `emptyLabel`).
 *
 * **Asymétrie move-all vs move-selected** (`components.js:5222-5254`) :
 * les boutons `all-right`/`all-left` déplacent TOUS les items du panneau,
 * y compris ceux masqués par le filtre — ils ignorent la query et la
 * sélection. Les boutons `right`/`left` ne déplacent que les items
 * `selected` du panneau correspondant. Dans les deux cas, les ids
 * déplacés sont retirés de l'état de sélection interne (comme
 * `option.classList.remove('selected')` du vanilla).
 *
 * **Annonces `aria-live`** : reproduit le trick `announce()` du vanilla
 * (vide `textContent`, force un reflow via `offsetHeight`, puis
 * re-affecte) via un ref direct sur la région — sinon un lecteur d'écran
 * ne ré-annonce pas deux transferts au message identique.
 *
 * **a11y — rôle** : chaque option porte `role="option"` + `tabIndex={0}`
 * + `aria-selected`, comme le vanilla. Aucun `role="listbox"` n'est posé
 * sur `.transfer-body` (le vanilla ne le fait pas non plus) : parité
 * stricte conservée, arbitrage ARIA #613 en attente pour une éventuelle
 * amélioration ultérieure.
 *
 * SSR-safe : toute lecture DOM (navigation clavier, région live) se fait
 * dans des gestionnaires d'événements déclenchés côté client.
 */
export function TransferList({
  items,
  assigned,
  onChange,
  sourceTitle = "Disponibles",
  targetTitle = "Assignés",
  searchable = true,
  emptyLabel,
  onTransfer,
  className,
}: TransferListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceQuery, setSourceQuery] = useState("");
  const [targetQuery, setTargetQuery] = useState("");
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const assignedIdSet = useMemo(() => new Set(assigned), [assigned]);

  const availableItems = useMemo(
    () => items.filter((item) => !assignedIdSet.has(item.id)),
    [items, assignedIdSet],
  );

  const assignedItems = useMemo(
    () =>
      assigned
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is TransferListItem => Boolean(item)),
    [assigned, items],
  );

  const availableSelectedCount = availableItems.filter((item) =>
    selected.has(item.id),
  ).length;
  const assignedSelectedCount = assignedItems.filter((item) =>
    selected.has(item.id),
  ).length;

  function announce(message: string) {
    const el = liveRegionRef.current;
    if (!el) return;
    el.textContent = "";
    void el.offsetHeight;
    el.textContent = message;
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function commitTransfer(direction: TransferDirection, movedIds: string[]) {
    if (movedIds.length === 0) return;
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      movedIds.forEach((id) => next.delete(id));
      return next;
    });
    const movedSet = new Set(movedIds);
    const goingRight = direction === "right" || direction === "all-right";
    const nextAssigned = goingRight
      ? [...assigned, ...movedIds]
      : assigned.filter((id) => !movedSet.has(id));
    onChange(nextAssigned);
    onTransfer?.({ direction, count: movedIds.length });
    const destinationTitle = goingRight ? targetTitle : sourceTitle;
    announce(`${movedIds.length} élément(s) déplacé(s) vers ${destinationTitle}.`);
  }

  function handleMoveSelected(direction: "right" | "left") {
    const fromItems = direction === "right" ? availableItems : assignedItems;
    const movedIds = fromItems
      .filter((item) => selected.has(item.id))
      .map((item) => item.id);
    commitTransfer(direction, movedIds);
  }

  function handleMoveAll(direction: "all-right" | "all-left") {
    const fromItems = direction === "all-right" ? availableItems : assignedItems;
    const movedIds = fromItems.map((item) => item.id);
    commitTransfer(direction, movedIds);
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    id: string,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSelect(id);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const body = event.currentTarget.closest(".transfer-body");
    if (!body) return;
    const options = Array.from(
      body.querySelectorAll<HTMLElement>(".transfer-option:not(.hidden)"),
    );
    const idx = options.indexOf(event.currentTarget);
    event.preventDefault();
    const target = event.key === "ArrowDown" ? options[idx + 1] : options[idx - 1];
    target?.focus();
  }

  function renderOption(item: TransferListItem, query: string) {
    const isSelected = selected.has(item.id);
    const isHidden = !matchesQuery(item.label, query);
    const optionClasses = [
      "transfer-option",
      isSelected ? "selected" : null,
      isHidden ? "hidden" : null,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div
        key={item.id}
        role="option"
        tabIndex={0}
        aria-selected={isSelected}
        className={optionClasses}
        onClick={() => toggleSelect(item.id)}
        onKeyDown={(event) => handleOptionKeyDown(event, item.id)}
      >
        {item.label}
      </div>
    );
  }

  const wrapClasses = ["transfer-list", className].filter(Boolean).join(" ");

  return (
    <div className={wrapClasses}>
      <div className="transfer-panel">
        <div className="transfer-panel-header">
          <span className="transfer-panel-title">{sourceTitle}</span>
          <span className="transfer-count">
            {availableSelectedCount} / {availableItems.length}
          </span>
        </div>
        {searchable && (
          <div className="transfer-search">
            <input
              type="text"
              className="input"
              placeholder="Filtrer..."
              value={sourceQuery}
              onChange={(event) => setSourceQuery(event.target.value)}
            />
          </div>
        )}
        <div className="transfer-body">
          {availableItems.length === 0 && emptyLabel ? (
            <div className="transfer-empty">{emptyLabel}</div>
          ) : (
            availableItems.map((item) => renderOption(item, sourceQuery))
          )}
        </div>
      </div>

      <div className="transfer-actions">
        <button
          type="button"
          className="btn-icon"
          aria-label="Transférer la sélection à droite"
          onClick={() => handleMoveSelected("right")}
        >
          <svg className="icon" aria-hidden="true">
            <use href="/shared/icons/sprite.svg#i-chevron-right" />
          </svg>
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Transférer la sélection à gauche"
          onClick={() => handleMoveSelected("left")}
        >
          <svg className="icon" aria-hidden="true">
            <use href="/shared/icons/sprite.svg#i-chevron-left" />
          </svg>
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Transférer tout à droite"
          onClick={() => handleMoveAll("all-right")}
        >
          »
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Transférer tout à gauche"
          onClick={() => handleMoveAll("all-left")}
        >
          «
        </button>
      </div>

      <div className="transfer-panel">
        <div className="transfer-panel-header">
          <span className="transfer-panel-title">{targetTitle}</span>
          <span className="transfer-count">
            {assignedSelectedCount} / {assignedItems.length}
          </span>
        </div>
        {searchable && (
          <div className="transfer-search">
            <input
              type="text"
              className="input"
              placeholder="Filtrer..."
              value={targetQuery}
              onChange={(event) => setTargetQuery(event.target.value)}
            />
          </div>
        )}
        <div className="transfer-body">
          {assignedItems.length === 0 && emptyLabel ? (
            <div className="transfer-empty">{emptyLabel}</div>
          ) : (
            assignedItems.map((item) => renderOption(item, targetQuery))
          )}
        </div>
      </div>

      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        ref={liveRegionRef}
      />
    </div>
  );
}

TransferList.displayName = "TransferList";
