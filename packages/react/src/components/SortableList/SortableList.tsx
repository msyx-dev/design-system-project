import {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useRef,
  useState,
} from "react";

export type SortableListItemId = string | number;

export interface SortableListItem {
  /** Identifiant stable — clé React ET identité pour le drag/drop/clavier. */
  id: SortableListItemId;
  /** Contenu libre de la ligne (après la poignée, et le numéro si `numbered`). */
  children: ReactNode;
  /** Classes additionnelles sur ce `.sortable-item`. */
  className?: string;
}

export interface SortableListProps {
  /** Items dans leur ordre courant — le composant ne maintient AUCUN ordre interne. */
  items: SortableListItem[];
  /**
   * Appelé avec le tableau réordonné (souris, tactile ou clavier). Le
   * composant est **entièrement contrôlé** : tant que le parent ne
   * répercute pas ce nouvel ordre dans `items`, l'affichage ne bouge pas.
   */
  onReorder: (items: SortableListItem[]) => void;
  /**
   * Active la numérotation automatique (`.sortable-list--numbered` +
   * `.sortable-num`). Le numéro est dérivé de la position dans `items`
   * (`index + 1`) — jamais un état interne, jamais désynchronisable.
   */
  numbered?: boolean;
  /** `aria-label` de la racine `role="listbox"`. */
  ariaLabel?: string;
  /**
   * Contenu de la poignée `.sortable-handle` (`aria-hidden`, décoratif).
   * @default "⋮⋮" (glyphe utilisé par `pages/composants.html#sortable-list`)
   */
  handle?: ReactNode;
  /** Classes additionnelles sur la racine `.sortable-list`. */
  className?: string;
}

const DEFAULT_HANDLE = "⋮⋮";

/** Déplace l'item d'index `from` à l'index `to`, sans muter `list`. */
function moveInArray<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list;
  }
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Libellé accessible d'un item : le texte de la ligne MOINS la poignée
 * (décorative) et le numéro (déjà porté par l'annonce de position) — calque
 * exact d'`itemLabel()` (`shared/components.js:3670-3677`, #836).
 */
function extractLabel(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelector(".sortable-handle")?.remove();
  clone.querySelector(".sortable-num")?.remove();
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * SortableList — Liste réordonnable du Design System msyx.fr
 * (`composants.html` #sortable-list, calque `initSortableLists` —
 * `shared/components.js:3488-3751`, contrat clavier hérité tel quel de #836).
 *
 * Émet le markup canonique `.sortable-list` (`components/lists.css:75-121`) :
 * ```html
 * <ul class="sortable-list" role="listbox" aria-label="...">
 *   <li class="sortable-item" role="option" draggable="true" aria-grabbed="false" tabindex="0">
 *     <span class="sortable-handle" aria-hidden="true">⋮⋮</span>
 *     <span class="sortable-num">1</span>  <!-- si numbered -->
 *     …children…
 *   </li>
 * </ul>
 * <div class="sortable-live sr-only" aria-live="polite" aria-atomic="true">…</div>
 * ```
 *
 * **Contrôlé, aucun ordre interne** — `items` EST l'ordre affiché. Une
 * réorganisation (souris, tactile, clavier) ne fait QUE calculer le tableau
 * cible et appeler `onReorder` ; le composant ne mute jamais `items` lui-même
 * et ne rend rien tant que le parent ne renvoie pas le nouvel ordre. La
 * numérotation (`numbered`) découle directement de l'index dans `items` —
 * contrairement au vanilla qui réécrit `textContent` après chaque
 * insertion DOM, ici React s'en charge par simple re-render.
 *
 * **Glisser-déposer souris — HTML5 Drag & Drop natif** (`draggable`,
 * `dragstart`/`dragover`/`dragleave`/`drop`/`dragend`), calque direct du
 * vanilla : `.dragging` sur la source, `.drag-over` sur la cible survolée,
 * `aria-grabbed` togglé pendant le drag (déprécié ARIA 1.1, conservé pour
 * non-régression — même choix que le vanilla, cf. commentaire #836 dans
 * `components.js`). Un drop calcule le nouvel ordre par
 * `moveInArray(items, srcIdx, tgtIdx)`, mathématiquement identique à la
 * séquence `insertBefore` du vanilla.
 *
 * **Glisser-déposer tactile — Pointer Events, réimplémenté** (comme
 * `<SplitPane>`, `window.__pointerDrag()` n'étant pas importable côté
 * React) : `setPointerCapture` sur la poignée au `pointerdown` (`pointerType
 * !== 'mouse'`, la souris reste gérée par le DnD HTML5 ci-dessus), clone DOM
 * fantôme (`cloneNode` de l'item réel, `position:fixed`, `pointer-events:none`)
 * suivant le doigt, cible recalculée à chaque `pointermove` depuis
 * `getBoundingClientRect()` de chaque item (même heuristique clientY que le
 * vanilla). `onPointerCancel` est géré en plus du vanilla (best-effort,
 * nettoie l'état sans réordonner si un geste système interrompt le drag —
 * ajout défensif, aucun comportement du chemin nominal n'est modifié).
 *
 * **Réordonnancement clavier — contrat IDENTIQUE à #836, ne pas diverger** :
 * roving tabindex (`0` sur un seul item à la fois, `-1` sinon) ; ↑/↓
 * déplacent le FOCUS (parcours, ne réordonnent rien) ; `Home`/`End` aux
 * extrémités ; **`Ctrl`+↑/↓ déplace l'ITEM lui-même** d'une position
 * (adjacente), en conservant le focus dessus, et pousse une annonce
 * `aria-live="polite"` (`.sortable-live.sr-only`) — même gabarit de message
 * que le vanilla : `"<label> déplacé en position N sur M"`. **Aucune
 * annonce n'est émise pour le drag souris/tactile** (parité exacte : dans
 * `initSortableLists`, `announceMove()` n'est appelée QUE par `moveItem()`,
 * jamais par les chemins `drop`/`pointerup`).
 *
 * **Persistance du focus DOM pendant un `Ctrl`+↑/↓** : `key={item.id}` sur
 * chaque `<li>` garantit que React réutilise le MÊME nœud DOM après
 * réordonnancement (juste repositionné dans l'arbre) — le focus survit sans
 * appel `.focus()` supplémentaire après le nouveau rendu, à la différence du
 * vanilla qui doit refocaliser explicitement après son `insertBefore` impératif.
 *
 * **Garde-fou roving tabindex** (même motif que `<SegmentedControl>`, #743) :
 * si l'item focalisé sort de `items` (suppression externe), le premier item
 * restant récupère `tabIndex={0}` sans voler le focus DOM réel.
 *
 * SSR-safe : aucun accès `window`/`document` au render — uniquement dans les
 * gestionnaires d'événements pointeur (jamais invoqués côté serveur).
 */
export function SortableList({
  items,
  onReorder,
  numbered = false,
  ariaLabel,
  handle = DEFAULT_HANDLE,
  className,
}: SortableListProps) {
  const [draggingId, setDraggingId] = useState<SortableListItemId | null>(null);
  const [dragOverId, setDragOverId] = useState<SortableListItemId | null>(null);
  const [focusedId, setFocusedId] = useState<SortableListItemId | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const itemRefs = useRef<Record<SortableListItemId, HTMLLIElement | null>>({});
  const pointerDragIdRef = useRef<SortableListItemId | null>(null);
  const pointerOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerCloneRef = useRef<HTMLElement | null>(null);

  const hasFocusedMatch = items.some((item) => item.id === focusedId);
  const effectiveFocusedId = hasFocusedMatch
    ? focusedId
    : (items[0]?.id ?? null);

  function findPointerTarget(
    clientY: number,
    excludeId: SortableListItemId,
  ): SortableListItemId | null {
    let target: SortableListItemId | null = null;
    for (const item of items) {
      if (item.id === excludeId) continue;
      const el = itemRefs.current[item.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        target = item.id;
      }
    }
    return target;
  }

  function reorderTo(
    srcId: SortableListItemId,
    tgtId: SortableListItemId,
  ): void {
    const srcIdx = items.findIndex((item) => item.id === srcId);
    const tgtIdx = items.findIndex((item) => item.id === tgtId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    onReorder(moveInArray(items, srcIdx, tgtIdx));
  }

  // ─── HTML5 Drag & Drop (souris) ──────────────────────────────────────────
  function handleDragStart(
    e: ReactDragEvent<HTMLLIElement>,
    id: SortableListItemId,
  ): void {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd(): void {
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragOver(
    e: ReactDragEvent<HTMLLIElement>,
    id: SortableListItemId,
  ): void {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id === draggingId) return;
    setDragOverId(id);
  }

  function handleDragLeave(id: SortableListItemId): void {
    setDragOverId((prev) => (prev === id ? null : prev));
  }

  function handleDrop(
    e: ReactDragEvent<HTMLLIElement>,
    id: SortableListItemId,
  ): void {
    e.preventDefault();
    setDragOverId(null);
    if (draggingId == null || id === draggingId) return;
    reorderTo(draggingId, id);
  }

  // ─── Pointer Events (tactile) ────────────────────────────────────────────
  function handlePointerDown(
    e: ReactPointerEvent<HTMLSpanElement>,
    id: SortableListItemId,
  ): void {
    if (e.pointerType === "mouse") return; // souris → DnD HTML5 ci-dessus
    e.preventDefault();
    const itemEl = itemRefs.current[id];
    if (!itemEl) return;

    pointerDragIdRef.current = id;
    setDraggingId(id);

    const rect = itemEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    pointerOffsetRef.current = { x: offsetX, y: offsetY };

    const clone = itemEl.cloneNode(true) as HTMLElement;
    clone.style.cssText = [
      "position:fixed",
      "pointer-events:none",
      "z-index:9999",
      `width:${rect.width}px`,
      "opacity:0.85",
      `left:${e.clientX - offsetX}px`,
      `top:${e.clientY - offsetY}px`,
      "transition:none",
    ].join(";");
    document.body.appendChild(clone);
    pointerCloneRef.current = clone;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* déjà capturé ou non supporté — best-effort */
    }
  }

  function handlePointerMove(
    e: ReactPointerEvent<HTMLSpanElement>,
    id: SortableListItemId,
  ): void {
    if (pointerDragIdRef.current !== id) return;
    const clone = pointerCloneRef.current;
    if (clone) {
      clone.style.left = `${e.clientX - pointerOffsetRef.current.x}px`;
      clone.style.top = `${e.clientY - pointerOffsetRef.current.y}px`;
    }
    setDragOverId(findPointerTarget(e.clientY, id));
  }

  function endPointerDrag(
    e: ReactPointerEvent<HTMLSpanElement>,
    id: SortableListItemId,
    shouldReorder: boolean,
  ): void {
    if (pointerDragIdRef.current !== id) return;

    if (pointerCloneRef.current) {
      pointerCloneRef.current.remove();
      pointerCloneRef.current = null;
    }

    if (shouldReorder) {
      const target = findPointerTarget(e.clientY, id);
      if (target != null) reorderTo(id, target);
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* déjà relâché — best-effort */
    }

    pointerDragIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }

  // ─── Clavier — roving tabindex + Ctrl+↑/↓ (#836, contrat inchangé) ───────
  function focusItemAt(index: number): void {
    const target = items[index];
    if (!target) return;
    setFocusedId(target.id);
    itemRefs.current[target.id]?.focus();
  }

  function announceMove(id: SortableListItemId, targetIdx: number): void {
    const el = itemRefs.current[id];
    const label = el ? extractLabel(el) : "";
    setLiveMessage(
      `${label ? `${label} déplacé` : "Élément déplacé"} en position ${targetIdx + 1} sur ${items.length}`,
    );
  }

  function moveByKeyboard(idx: number, dir: -1 | 1): void {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const moving = items[idx];
    onReorder(moveInArray(items, idx, targetIdx));
    setFocusedId(moving.id);
    announceMove(moving.id, targetIdx);
  }

  function handleKeyDown(
    e: ReactKeyboardEvent<HTMLLIElement>,
    id: SortableListItemId,
  ): void {
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return;

    if (e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      moveByKeyboard(idx, e.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (idx < items.length - 1) focusItemAt(idx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx > 0) focusItemAt(idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (items.length) focusItemAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (items.length) focusItemAt(items.length - 1);
    }
  }

  const listClasses = [
    "sortable-list",
    numbered ? "sortable-list--numbered" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <ul className={listClasses} role="listbox" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const itemClasses = [
            "sortable-item",
            draggingId === item.id ? "dragging" : null,
            dragOverId === item.id ? "drag-over" : null,
            item.className,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li
              key={item.id}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              className={itemClasses}
              role="option"
              draggable
              aria-grabbed={draggingId === item.id}
              tabIndex={effectiveFocusedId === item.id ? 0 : -1}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={() => handleDragLeave(item.id)}
              onDrop={(e) => handleDrop(e, item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
            >
              <span
                className="sortable-handle"
                aria-hidden="true"
                onPointerDown={(e) => handlePointerDown(e, item.id)}
                onPointerMove={(e) => handlePointerMove(e, item.id)}
                onPointerUp={(e) => endPointerDrag(e, item.id, true)}
                onPointerCancel={(e) => endPointerDrag(e, item.id, false)}
              >
                {handle}
              </span>
              {numbered && <span className="sortable-num">{index + 1}</span>}
              {item.children}
            </li>
          );
        })}
      </ul>
      <div
        className="sortable-live sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </div>
    </>
  );
}

SortableList.displayName = "SortableList";
