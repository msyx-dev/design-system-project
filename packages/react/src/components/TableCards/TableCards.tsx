import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from "react";

export interface TableCardsColumn<T> {
  /** Clé React de `<th>`/`<td>` et accès par défaut `row[key]`. */
  key: string;
  /**
   * Texte de l'en-tête de colonne ET du libellé de carte. `string`, jamais
   * `ReactNode` (contrairement à `DataGrid`) : il est rendu deux fois, dont
   * une en `aria-hidden` — un contenu interactif dupliqué dans une zone
   * `aria-hidden` serait focusable sans être annoncé.
   */
  header: string;
  /** Rendu de cellule. @default `String(row[key] ?? "")` */
  render?: (row: T, rowIndex: number) => ReactNode;
  /** Pas de libellé visible en mode cartes. @default false */
  hideLabel?: boolean;
  /** Cellule d'actions (`.table-cards-actions`) ; implique `hideLabel`. @default false */
  actions?: boolean;
}

export interface TableCardsProps<T> {
  columns: TableCardsColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  /** `<caption>` du tableau (nom accessible). */
  caption?: ReactNode;
  /** Nom accessible du tableau quand il n'y a pas de `caption`. */
  "aria-label"?: string;
  /** Contenu de la ligne unique quand `rows` est vide. @default "Aucun résultat" */
  emptyLabel?: ReactNode;
  /** Classes additionnelles sur `.table-wrap`. */
  className?: string;
  /**
   * Attributs par ligne (point d'extension : état d'erreur, `aria-describedby`…).
   * `role` reste `"row"` : posé après le spread, il n'est pas écrasable.
   */
  getRowProps?: (
    row: T,
    rowIndex: number,
  ) => HTMLAttributes<HTMLTableRowElement>;
  /**
   * Contenu de `<tfoot role="rowgroup">` : des `<tr role="row">` de
   * `<TableCardsCell>` (point d'extension : ligne d'ajout). Absent → pas de
   * `<tfoot>`.
   */
  footer?: ReactNode;
}

export interface TableCardsCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /**
   * Libellé de carte, rendu en `<span class="table-cards-label"
   * aria-hidden="true">` en premier enfant. Absent → aucun libellé.
   */
  label?: string;
  /** Cellule d'actions : ajoute `.table-cards-actions`, ignore `label`. @default false */
  actions?: boolean;
}

/**
 * TableCardsCell — cellule de `TableCards` (`<td role="cell">`).
 *
 * Sert au corps du tableau (via `TableCards`) ET aux lignes du `<tfoot>` que le
 * consommateur compose lui-même (`footer`) : un seul chemin de rendu pour le
 * libellé de carte. `role="cell"` est posé AVANT le spread, un consommateur qui
 * en a besoin d'un autre le surcharge sous sa responsabilité.
 */
export function TableCardsCell({
  label,
  actions = false,
  className,
  children,
  ...rest
}: TableCardsCellProps) {
  const classes =
    [actions ? "table-cards-actions" : null, className]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <td role="cell" {...rest} className={classes}>
      {!actions && label ? (
        <span className="table-cards-label" aria-hidden="true">
          {label}
        </span>
      ) : null}
      {children}
    </td>
  );
}

function defaultCellValue<T>(row: T, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key];
  return value === null || value === undefined ? "" : String(value);
}

/**
 * TableCards — tableau qui se replie en cartes (`data.html` #table-cards, CSS
 * `components/tables.css` bloc TABLE CARDS, #1007).
 *
 * Sous 768 px (`--bp-md`) chaque ligne devient une carte et chaque cellule
 * affiche son libellé ; au-delà, tableau classique. CSS seul, aucun état, aucun
 * tri : le consommateur passe des `rows` déjà triées/filtrées et compose
 * `<Pagination>` à côté si besoin. Pour un tableau triable ou filtrable, utiliser
 * `DataGrid` (qui défile horizontalement sur mobile, inchangé).
 *
 * Émet le markup canonique, identique à la démo vanilla :
 * ```html
 * <div class="table-wrap">
 *   <table class="table-cards" role="table" aria-label="…">
 *     <caption>…</caption>                      <!-- si caption -->
 *     <thead role="rowgroup">
 *       <tr role="row"><th scope="col" role="columnheader">Nom</th>…</tr>
 *     </thead>
 *     <tbody role="rowgroup">
 *       <tr role="row">
 *         <td role="cell"><span class="table-cards-label" aria-hidden="true">Nom</span>Alice</td>
 *         <td role="cell" class="table-cards-actions">…</td>   <!-- sans libellé -->
 *       </tr>
 *     </tbody>
 *     <tfoot role="rowgroup">…</tfoot>          <!-- si footer -->
 *   </table>
 * </div>
 * ```
 *
 * **Pourquoi un nœud `aria-hidden` et pas `td::before { content: … }`** : le
 * contenu généré par CSS entre dans le nom accessible de la cellule, annoncé
 * alors deux fois (« Nom, Nom Alice »). Le `<thead>`, masqué visuellement par le
 * CSS (déclarations de `.sr-only`), reste lu : c'est lui le canal accessible, le
 * libellé visible n'est qu'un doublon de présentation.
 *
 * **Rôles ARIA explicites** : certains moteurs abandonnent la sémantique de
 * tableau quand `display` change. `role="row"` de `<tr>` n'est pas écrasable via
 * `getRowProps`.
 *
 * Aucune donnée consommateur n'est jamais injectée en HTML brut : tout passe par
 * des nœuds React (texte échappé par construction).
 */
export function TableCards<T>({
  columns,
  rows,
  getRowKey,
  caption,
  "aria-label": ariaLabel,
  emptyLabel = "Aucun résultat",
  className,
  getRowProps,
  footer,
}: TableCardsProps<T>) {
  const rootClasses = ["table-wrap", className].filter(Boolean).join(" ");
  return (
    <div className={rootClasses}>
      <table className="table-cards" role="table" aria-label={ariaLabel}>
        {caption ? <caption>{caption}</caption> : null}
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((column) => (
              <th key={column.key} scope="col" role="columnheader">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.length === 0 ? (
            <tr role="row">
              <TableCardsCell colSpan={columns.length}>
                {emptyLabel}
              </TableCardsCell>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex)}
                {...getRowProps?.(row, rowIndex)}
                role="row"
              >
                {columns.map((column) => (
                  <TableCardsCell
                    key={column.key}
                    actions={column.actions}
                    label={
                      column.hideLabel || column.actions
                        ? undefined
                        : column.header
                    }
                  >
                    {column.render
                      ? column.render(row, rowIndex)
                      : defaultCellValue(row, column.key)}
                  </TableCardsCell>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer ? <tfoot role="rowgroup">{footer}</tfoot> : null}
      </table>
    </div>
  );
}
