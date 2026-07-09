import {
  CSSProperties,
  ReactNode,
  UIEvent,
  useMemo,
  useRef,
  useState,
} from "react";

export interface VirtualListProps {
  /**
   * Nombre total logique d'éléments (= `data-vlist-count` du vanilla). Le
   * consumer fournit des données déjà triées/filtrées ; la fenêtre est dérivée
   * de ce total, pas d'un tableau interne.
   */
  count: number;
  /**
   * Rendu d'une ligne par index logique 0-based → `ReactNode`. Remplace
   * l'anti-pattern global `window.__vlistRenderRow` du vanilla par une
   * render-prop idiomatique.
   * @default (i) => `Élément #${i + 1}` (calque exact du fallback vanilla)
   */
  renderRow?: (index: number) => ReactNode;
  /**
   * Hauteur de ligne fixe (px). Appliquée en `--vlist-row-h` inline sur la
   * racine ET utilisée pour la math de fenêtrage — les deux DOIVENT rester
   * synchrones (le vanilla les lisait via `getComputedStyle`, le port les
   * PILOTE).
   * @default 40
   */
  rowHeight?: number;
  /**
   * Hauteur du viewport scrollable (px). Appliquée en `--vlist-height` inline
   * sur la racine (le CSS `.virtual-list-viewport { height: var(--vlist-height) }`
   * la consomme).
   * @default 400
   */
  height?: number;
  /** Lignes rendues hors fenêtre visible (haut + bas). @default 5 */
  overscan?: number;
  /** Classes additionnelles sur `.virtual-list`. */
  className?: string;
  /** `aria-label` du viewport (`role="list"`) si pas de libellé externe. */
  ariaLabel?: string;
}

/** Fallback déterministe identique au vanilla (`renderRowContent`,
 * `components.js:6193-6198`) — référence stable pour la mémoïsation. */
const defaultRenderRow = (index: number): ReactNode => `Élément #${index + 1}`;

/**
 * VirtualList — Liste fenêtrée (windowing) du Design System msyx.fr
 * (`data.html` #virtual-list, calque `initVirtualList` —
 * `shared/components.js:6173-6268`, CSS `components/virtual-list.css`).
 *
 * Seules les lignes visibles (+ overscan) sont montées dans le DOM, quel que
 * soit `count`. Couche de PRÉSENTATION pure : le consumer fournit des données
 * déjà triées/filtrées via `count` + `renderRow(index)`.
 *
 * Émet le markup canonique :
 * ```html
 * <div class="virtual-list" data-vlist-count="1000"
 *      style="--vlist-row-h:40px;--vlist-height:400px">
 *   <div class="virtual-list-viewport" role="list" aria-rowcount="1000">
 *     <div class="virtual-spacer" aria-hidden="true" style="height:0px"></div>
 *     <div class="virtual-list-rows">
 *       <div class="virtual-list-row" role="listitem" aria-rowindex="1">…</div>
 *       …
 *     </div>
 *     <div class="virtual-spacer" aria-hidden="true" style="height:39200px"></div>
 *   </div>
 * </div>
 * ```
 *
 * **Contrôlé côté data** : `count` + `renderRow` passthrough, aucun état de
 * données interne. Seul `scrollTop` est interne (flux de scroll légitime).
 *
 * **Styles inline requis (piège type FileUpload `.progress-fill` / #612)** :
 * - la hauteur des deux `.virtual-spacer` est posée EN INLINE
 *   (`height: {n}px`) — le CSS ne fournit QUE `width:100%`. Sans ces hauteurs
 *   le scroll s'effondre et le fenêtrage casse ;
 * - `--vlist-row-h` / `--vlist-height` sont réappliqués en custom props inline
 *   sur la racine pour que la math JS (prop `rowHeight`) et le rendu CSS ne
 *   divergent JAMAIS du défaut token `:root`.
 *
 * **Fenêtrage** (calque `render()`, `components.js:6222-6254`) :
 * `visibleCount = ceil(height / rowHeight) + 2 × overscan` ;
 * `first = floor(scrollTop / rowHeight) - overscan` (clamp ≥ 0, puis clamp
 * haut `count - visibleCount`) ; `rowCount = min(visibleCount, count - first)`.
 * Spacer haut = `first × rowHeight`, spacer bas =
 * `max(0, count - first - rowCount) × rowHeight`.
 *
 * **A11y** (choix DS actuel, répliqué tel quel — cf. risques de la fiche) :
 * `role="list"` + `aria-rowcount` = total logique sur le viewport ;
 * `role="listitem"` + `aria-rowindex` = index logique 1-based sur chaque ligne
 * rendue (PAS l'index dans la fenêtre) ; spacers `aria-hidden`.
 *
 * **Contrainte assumée** : hauteur de ligne FIXE uniquement (pas de rows à
 * hauteur variable), comme le vanilla.
 *
 * SSR-safe : premier rendu = fenêtre du haut (`scrollTop = 0`), aucun accès
 * `window`/`document` au render ; le scrollTop est lu côté client dans le
 * handler `onScroll`.
 */
export function VirtualList({
  count,
  renderRow = defaultRenderRow,
  rowHeight = 40,
  height = 400,
  overscan = 5,
  className,
  ariaLabel,
}: VirtualListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const total = Math.max(0, Math.floor(count) || 0);

  const frame = useMemo(() => {
    const visibleCount = Math.ceil(height / rowHeight) + 2 * overscan;
    let first = Math.floor(scrollTop / rowHeight) - overscan;
    if (first < 0) first = 0;
    if (first + visibleCount > total) {
      first = Math.max(0, total - visibleCount);
    }
    let rowCount = Math.min(visibleCount, total - first);
    if (rowCount < 0) rowCount = 0;
    return {
      first,
      rowCount,
      topHeight: first * rowHeight,
      bottomHeight: Math.max(0, total - first - rowCount) * rowHeight,
    };
  }, [scrollTop, total, rowHeight, height, overscan]);

  const rows = useMemo(() => {
    const items: ReactNode[] = [];
    for (let i = frame.first; i < frame.first + frame.rowCount; i++) {
      items.push(
        <div
          key={i}
          className="virtual-list-row"
          role="listitem"
          aria-rowindex={i + 1}
        >
          {renderRow(i)}
        </div>,
      );
    }
    return items;
  }, [frame.first, frame.rowCount, renderRow]);

  const rootStyle = {
    "--vlist-row-h": `${rowHeight}px`,
    "--vlist-height": `${height}px`,
  } as CSSProperties;

  const rootClasses = ["virtual-list", className].filter(Boolean).join(" ");

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    setScrollTop(event.currentTarget.scrollTop);
  }

  return (
    <div className={rootClasses} data-vlist-count={total} style={rootStyle}>
      <div
        ref={viewportRef}
        className="virtual-list-viewport"
        role="list"
        aria-rowcount={total}
        aria-label={ariaLabel}
        onScroll={handleScroll}
      >
        <div
          className="virtual-spacer"
          aria-hidden="true"
          style={{ height: `${frame.topHeight}px` }}
        />
        {rows}
        <div
          className="virtual-spacer"
          aria-hidden="true"
          style={{ height: `${frame.bottomHeight}px` }}
        />
      </div>
    </div>
  );
}

VirtualList.displayName = "VirtualList";
