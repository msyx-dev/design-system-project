import { HTMLAttributes, ReactNode, useMemo } from "react";

/**
 * Un item de fenêtrage : un numéro de page ou un marqueur d'ellipsis.
 * Deux marqueurs distincts (`ellipsis-start`/`ellipsis-end`) pour garder des
 * clés React stables même quand les deux apparaissent simultanément
 * (fenêtrage à deux ellipsis, ex. page 6/12).
 */
export type PaginationRangeItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Construit la fenêtre de pages à afficher (fonction pure, testable en
 * isolation — cf. DoD #873 « implique une logique de fenêtrage, garde-la
 * simple et testée »). Algorithme borné classique (bornes + voisins autour
 * de la page courante + ellipsis dans les trous), 1-indexé.
 *
 * @param page          page courante (1-indexée)
 * @param total         nombre total de pages
 * @param siblingCount  pages voisines affichées de chaque côté de `page`
 * @param boundaryCount pages affichées au début et à la fin
 */
export function getPaginationRange(
  page: number,
  total: number,
  siblingCount = 1,
  boundaryCount = 1,
): PaginationRangeItem[] {
  if (total <= 0) return [];

  const range = (start: number, end: number): number[] => {
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  };

  // Tout tient sans ellipsis : bornes×2 + voisins×2 + page courante + 2 ellipsis potentielles.
  const totalPageNumbers = boundaryCount * 2 + siblingCount * 2 + 3;
  if (totalPageNumbers >= total) {
    return range(1, total);
  }

  const leftSiblingIndex = Math.max(page - siblingCount, boundaryCount + 2);
  const rightSiblingIndex = Math.min(
    page + siblingCount,
    total - boundaryCount - 1,
  );

  const showLeftEllipsis = leftSiblingIndex > boundaryCount + 2;
  const showRightEllipsis = rightSiblingIndex < total - boundaryCount - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = boundaryCount + siblingCount * 2 + 2;
    return [
      ...range(1, leftItemCount),
      "ellipsis-end",
      ...range(total - boundaryCount + 1, total),
    ];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = boundaryCount + siblingCount * 2 + 2;
    return [
      ...range(1, boundaryCount),
      "ellipsis-start",
      ...range(total - rightItemCount + 1, total),
    ];
  }

  // showLeftEllipsis && showRightEllipsis
  return [
    ...range(1, boundaryCount),
    "ellipsis-start",
    ...range(leftSiblingIndex, rightSiblingIndex),
    "ellipsis-end",
    ...range(total - boundaryCount + 1, total),
  ];
}

export interface PaginationProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> {
  /** Page courante, 1-indexée (composant entièrement contrôlé). */
  page: number;
  /** Nombre total de pages. */
  total: number;
  /** Appelé au clic sur un numéro de page ou sur précédent/suivant. */
  onPageChange: (page: number) => void;
  /** Pages voisines affichées de chaque côté de `page`. @default 1 */
  siblingCount?: number;
  /** Pages affichées au début et à la fin. @default 1 */
  boundaryCount?: number;
  /** Contenu du bouton précédent. @default "←" */
  prevLabel?: ReactNode;
  /** Contenu du bouton suivant. @default "→" */
  nextLabel?: ReactNode;
  /** `aria-label` du bouton précédent (icône seule par défaut). */
  prevAriaLabel?: string;
  /** `aria-label` du bouton suivant (icône seule par défaut). */
  nextAriaLabel?: string;
}

/**
 * `Pagination` — Design System msyx.fr (`pages/feedback.html` #pagination,
 * réutilisé par `data.html` #server-data-grid via `.data-grid-pagination`).
 *
 * Émet `.pagination > .page-btn(.nav)(.active) / .page-ellipsis`.
 *
 * **Racine `<nav aria-label>`** plutôt que le `<div>` de la démo simple de
 * `feedback.html` : l'entrée `example` du registre ET l'usage réel du même
 * composant dans `data.html` (`<nav class="pagination data-grid-pagination"
 * role="navigation" aria-label="Pagination">`) utilisent tous deux `<nav>`
 * — plus accessible (repère de navigation) et cohérent avec la réutilisation
 * prévue par le lot 8 (pagination serveur du `DataGrid`). CSS neutre : les
 * règles ciblent les classes, pas le tag.
 *
 * **`.nav` sur précédent/suivant** : présent sur les TROIS démos vanilla
 * (`feedback.html:392,398,406,412,419,421`), qu'ils portent une icône ou un
 * libellé texte — toujours appliqué ici, quel que soit `prevLabel`/`nextLabel`.
 *
 * **Fenêtrage contrôlé par `siblingCount`/`boundaryCount`** (cf.
 * `getPaginationRange`, fonction pure testée séparément) : conçu pour être
 * réutilisé tel quel par la pagination serveur du `DataGrid` (lot 8, #873).
 *
 * **Composant contrôlé** : aucun état interne, `page` piloté par le parent.
 */
export function Pagination({
  page,
  total,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  prevLabel = "←",
  nextLabel = "→",
  prevAriaLabel = "Page précédente",
  nextAriaLabel = "Page suivante",
  className,
  "aria-label": ariaLabel,
  ...rest
}: PaginationProps) {
  const items = useMemo(
    () => getPaginationRange(page, total, siblingCount, boundaryCount),
    [page, total, siblingCount, boundaryCount],
  );

  const classes = ["pagination", className].filter(Boolean).join(" ");

  return (
    <nav className={classes} aria-label={ariaLabel ?? "Pagination"} {...rest}>
      <button
        type="button"
        className="page-btn nav"
        aria-label={prevAriaLabel}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {prevLabel}
      </button>
      {items.map((item) =>
        item === "ellipsis-start" || item === "ellipsis-end" ? (
          <span key={item} className="page-ellipsis">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={["page-btn", item === page && "active"]
              .filter(Boolean)
              .join(" ")}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className="page-btn nav"
        aria-label={nextAriaLabel}
        disabled={page >= total}
        onClick={() => onPageChange(page + 1)}
      >
        {nextLabel}
      </button>
    </nav>
  );
}
Pagination.displayName = "Pagination";

export interface PaginationInfoProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/**
 * `PaginationInfo` — Émet `.pagination-info` (`feedback.html:404`, ex.
 * « Affichage 1-10 sur 124 résultats »). Slot texte libre : le formatage du
 * décompte reste au consumer (déjà réutilisé par `.data-grid-server-info`
 * dans `data.html:1278`).
 */
export function PaginationInfo({
  className,
  children,
  ...rest
}: PaginationInfoProps) {
  const classes = ["pagination-info", className].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
PaginationInfo.displayName = "PaginationInfo";
