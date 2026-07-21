import { KeyboardEvent, ReactNode, useMemo, useState } from "react";

export interface DataGridColumn<T> {
  /** Clé de colonne — sert de clé React de `<th>`/`<td>` et d'accès par défaut `row[key]`. */
  key: string;
  header: ReactNode;
  /** Colonne triable au clic (calque `.data-grid-sortable` vanilla). @default false */
  sortable?: boolean;
  /** Colonne pinnée (`.data-grid-col-sticky-end` sur `th` ET `td`). @default false */
  stickyEnd?: boolean;
  /** Rendu de cellule custom. @default row[key] converti en chaîne */
  render?: (row: T, rowIndex: number) => ReactNode;
  /** Clé de tri custom (courbe: comparateur numérique si les 2 valeurs sont des nombres, sinon `localeCompare('fr')`). @default row[key] */
  sortAccessor?: (row: T) => string | number;
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  /** Affiche `LOADING_ROW_COUNT` lignes squelette + `aria-busy="true"` sur `.data-grid-wrap`. @default false */
  loading?: boolean;
  /** Contenu affiché quand `rows` est vide (hors loading). @default "Aucun résultat" */
  emptyLabel?: ReactNode;
  /** `<caption>` a11y du tableau. */
  caption?: ReactNode;
  /** Classes additionnelles sur `.data-grid-wrap`. */
  className?: string;
}

type SortDir = "asc" | "desc" | "none";
interface SortState {
  key: string | null;
  dir: SortDir;
}

const SORT_ICON: Record<SortDir, string> = { none: "↕", asc: "↑", desc: "↓" };
const ARIA_SORT: Record<SortDir, "ascending" | "descending" | "none"> = {
  none: "none",
  asc: "ascending",
  desc: "descending",
};
/** Cycle exact du vanilla (`initDataGrids`, `components.js:1017`) : none→asc→desc→none. */
const NEXT_DIR: Record<SortDir, SortDir> = {
  none: "asc",
  asc: "desc",
  desc: "none",
};

/** Nombre de lignes squelette rendues pendant `loading` (pas de prop dédiée dans ce MVP). */
const LOADING_ROW_COUNT = 5;

function defaultSortAccessor<T>(row: T, key: string): string | number {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" ? value : String(value ?? "");
}

function defaultCellValue<T>(row: T, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key];
  return value === null || value === undefined ? "" : String(value);
}

/**
 * DataGrid — Tableau de données triable du Design System msyx.fr
 * (`data.html` #data-grid, calque `initDataGrids` — `shared/components.js:897-1059`,
 * CSS `components/tables.css`).
 *
 * Couche de PRÉSENTATION générique typée : le consumer fournit `columns` + `rows`
 * déjà filtrées côté data — pas de filter-row ni de pagination dans ce port MVP
 * (cf. contrat #696, la filter-row vanilla est optionnelle/hors scope ici).
 *
 * Émet le markup canonique :
 * ```html
 * <div class="data-grid-wrap">
 *   <table class="data-grid">
 *     <thead>
 *       <tr class="data-grid-header-row">
 *         <th class="data-grid-sortable" aria-sort="none">Nom
 *           <span class="data-grid-sort-icon">↕</span>
 *         </th>
 *         <th class="data-grid-col-sticky-end">Actions</th>
 *       </tr>
 *     </thead>
 *     <tbody class="data-grid-body">…</tbody>
 *     <tfoot class="data-grid-footer">…</tfoot>
 *   </table>
 * </div>
 * ```
 *
 * **Convention canonique** : jamais de classe non préfixée (`.data-grid-sort-icon`,
 * PAS `.sort-icon`).
 *
 * **Tri** : un seul état de tri actif à la fois — cliquer un `th` `.data-grid-sortable`
 * cycle `aria-sort` `none → ascending → descending → none` (calque exact du vanilla,
 * y compris la réinitialisation des autres colonnes). Comparateur : numérique si
 * `sortAccessor`/valeur par défaut renvoie un nombre des deux côtés, sinon
 * `localeCompare('fr')`. Clic ET clavier (`Enter`/`Espace`, `tabIndex=0` sur les
 * `th` triables) — le vanilla n'écoute que le clic, ce port ajoute le clavier en
 * plus (a11y baseline DS-PRINCIPLES), sans rien retirer du comportement calqué.
 *
 * **États** : `loading` → `LOADING_ROW_COUNT` lignes squelette (`.skeleton-cell`,
 * réutilise le token shimmer existant de `feedback.css`) + `aria-busy="true"` sur
 * `.data-grid-wrap` (le CSS DS gère déjà l'opacité + `pointer-events:none`,
 * `tables.css:47`) ; vide (`rows.length === 0`, hors loading) → une ligne
 * `colSpan={columns.length}` avec `emptyLabel`.
 *
 * **Footer** : `tfoot.data-grid-footer` toujours émis (structure canonique) —
 * ce MVP n'a pas de prop dédiée, il résume le nombre de lignes affichées.
 */
export function DataGrid<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  emptyLabel = "Aucun résultat",
  caption,
  className,
}: DataGridProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: null, dir: "none" });

  const sortedRows = useMemo(() => {
    if (!sort.key || sort.dir === "none") return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column || !column.sortable) return rows;
    const accessor =
      column.sortAccessor ?? ((row: T) => defaultSortAccessor(row, column.key));
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const av = accessor(a.row);
        const bv = accessor(b.row);
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "fr");
        return sort.dir === "asc" ? cmp : -cmp;
      })
      .map((entry) => entry.row);
  }, [rows, sort, columns]);

  function cycleSort(column: DataGridColumn<T>) {
    if (!column.sortable) return;
    setSort((current) => {
      const currentDir = current.key === column.key ? current.dir : "none";
      const nextDir = NEXT_DIR[currentDir];
      return { key: nextDir === "none" ? null : column.key, dir: nextDir };
    });
  }

  function handleHeaderKeyDown(
    event: KeyboardEvent<HTMLTableCellElement>,
    column: DataGridColumn<T>,
  ) {
    if (!column.sortable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cycleSort(column);
    }
  }

  const rootClasses = ["data-grid-wrap", className].filter(Boolean).join(" ");
  const colCount = columns.length;
  const isEmpty = !loading && sortedRows.length === 0;

  return (
    <div className={rootClasses} aria-busy={loading || undefined}>
      <table className="data-grid">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr className="data-grid-header-row">
            {columns.map((column) => {
              const dir = sort.key === column.key ? sort.dir : "none";
              const thClasses =
                [
                  column.sortable ? "data-grid-sortable" : null,
                  column.stickyEnd ? "data-grid-col-sticky-end" : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined;
              return (
                <th
                  key={column.key}
                  className={thClasses}
                  aria-sort={column.sortable ? ARIA_SORT[dir] : undefined}
                  tabIndex={column.sortable ? 0 : undefined}
                  onClick={
                    column.sortable ? () => cycleSort(column) : undefined
                  }
                  onKeyDown={
                    column.sortable
                      ? (event) => handleHeaderKeyDown(event, column)
                      : undefined
                  }
                >
                  {column.header}
                  {column.sortable ? (
                    <span className="data-grid-sort-icon" aria-hidden="true">
                      {SORT_ICON[dir]}
                    </span>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="data-grid-body">
          {loading ? (
            Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      column.stickyEnd ? "data-grid-col-sticky-end" : undefined
                    }
                  >
                    <div className="skeleton-cell" />
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={colCount}>{emptyLabel}</td>
            </tr>
          ) : (
            sortedRows.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      column.stickyEnd ? "data-grid-col-sticky-end" : undefined
                    }
                  >
                    {column.render
                      ? column.render(row, rowIndex)
                      : defaultCellValue(row, column.key)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="data-grid-footer">
          <tr>
            <td colSpan={colCount}>
              {loading
                ? "Chargement…"
                : `${sortedRows.length} ${sortedRows.length > 1 ? "lignes" : "ligne"}`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

DataGrid.displayName = "DataGrid";
