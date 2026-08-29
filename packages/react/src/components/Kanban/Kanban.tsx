import {
  DragEvent as ReactDragEvent,
  HTMLAttributes,
  ReactNode,
  forwardRef,
  useState,
} from "react";

export interface KanbanCardData {
  /** Identifiant stable — clé React ET identité pour le drag & drop. */
  id: string;
  /** `.kanban-card-title`. */
  title: ReactNode;
  /** `.kanban-card-desc`. Omis → pas de description. */
  description?: ReactNode;
  /**
   * `.kanban-card-footer` — contenu libre. Composez `<Chip>`/`<Badge>`/
   * `<Avatar>` déjà portés (calque le markup vanilla : `<span class="tag">` +
   * `<span class="badge badge-*">` + `<div class="avatar avatar-xs">`).
   */
  footer?: ReactNode;
}

export interface KanbanColumnData {
  /** Identifiant stable — clé React ET cible du drop. */
  id: string;
  /** `.kanban-column-title`. */
  title: ReactNode;
  /** Cartes de la colonne, dans l'ordre d'affichage. */
  cards: KanbanCardData[];
}

export interface KanbanCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  /** Pose `.dragging` (`templates.css:13`) — carte en cours de glissement. */
  dragging?: boolean;
}

/**
 * KanbanCard — carte présentationnelle du Design System msyx.fr
 * (`pages/templates.html` #kanban, `components/templates.css`).
 *
 * Émet `.kanban-card(.dragging) > .kanban-card-title + .kanban-card-desc? +
 * .kanban-card-footer?`. Sans logique de drag & drop — reçoit `draggable`/
 * `onDragStart`/`onDragEnd`/`dragging` de son parent (`<KanbanBoard>` les
 * pose ; réutilisée telle quelle, sans drag, par `<SprintBoard>`, #877).
 */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard(
    { title, description, footer, dragging, className, ...rest },
    ref,
  ) {
    const classes = ["kanban-card", dragging ? "dragging" : null, className]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={classes} {...rest}>
        <div className="kanban-card-title">{title}</div>
        {description != null && (
          <div className="kanban-card-desc">{description}</div>
        )}
        {footer != null && <div className="kanban-card-footer">{footer}</div>}
      </div>
    );
  },
);
KanbanCard.displayName = "KanbanCard";

export interface KanbanColumnProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  /** `.kanban-count`. Omis → pas de compteur affiché. */
  count?: ReactNode;
  /** Pose `.drag-over` (`templates.css:14`) — colonne cible survolée. */
  dragOver?: boolean;
  children?: ReactNode;
}

/**
 * KanbanColumn — colonne présentationnelle du Design System msyx.fr
 * (`pages/templates.html` #kanban, `components/templates.css`).
 *
 * Émet `.kanban-column(.drag-over) > .kanban-column-header > (.kanban-column-title
 * + .kanban-count?) + children`. Réutilisée telle quelle par `<SprintBoard>`
 * (racine `.sprint-board` au lieu de `.kanban-board`, mêmes colonnes/cartes
 * — parité vanilla : `initComponents` lie `.kanban-column`/`.kanban-card`
 * globalement, sans distinction de section, #877).
 */
export const KanbanColumn = forwardRef<HTMLDivElement, KanbanColumnProps>(
  function KanbanColumn(
    { title, count, dragOver, className, children, ...rest },
    ref,
  ) {
    const classes = ["kanban-column", dragOver ? "drag-over" : null, className]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={classes} {...rest}>
        <div className="kanban-column-header">
          <span className="kanban-column-title">{title}</span>
          {count != null && <span className="kanban-count">{count}</span>}
        </div>
        {children}
      </div>
    );
  },
);
KanbanColumn.displayName = "KanbanColumn";

export interface KanbanBoardProps {
  /** Colonnes et cartes dans leur ordre courant — aucun état interne. */
  columns: KanbanColumnData[];
  /**
   * Appelé au drop d'une carte sur une autre colonne, avec le tableau
   * `columns` recomputé (carte retirée de la colonne source, ajoutée en FIN
   * de la colonne cible — calque exact `col.appendChild(dragging)` du
   * vanilla, `shared/components.js:337-341`, qui n'insère jamais à une
   * position précise). Le composant est **entièrement contrôlé** : tant que
   * le parent ne répercute pas ce nouvel ordre dans `columns`, l'affichage
   * ne bouge pas (même contrat que `<SortableList>.onReorder`, #853).
   */
  onColumnsChange: (columns: KanbanColumnData[]) => void;
  className?: string;
}

/** Retire `cardId` de sa colonne d'origine et l'ajoute en fin de `toColumnId`. */
function moveCard(
  columns: KanbanColumnData[],
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
): KanbanColumnData[] {
  const source = columns.find((c) => c.id === fromColumnId);
  const card = source?.cards.find((c) => c.id === cardId);
  if (!card) return columns;

  return columns.map((col) => {
    if (col.id === fromColumnId) {
      return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
    }
    if (col.id === toColumnId) {
      return { ...col, cards: [...col.cards, card] };
    }
    return col;
  });
}

/**
 * KanbanBoard — Tableau kanban du Design System msyx.fr (`pages/templates.html`
 * #kanban, calque le bloc « Kanban drag & drop » d'`initComponents` —
 * `shared/components.js:325-342`).
 *
 * Émet `.kanban-board` composant `<KanbanColumn>`/`<KanbanCard>` (voir leur
 * doc respective pour le markup détaillé).
 *
 * **Entièrement contrôlé, aucun ordre interne** — `columns` EST l'ordre
 * affiché. Un drop calcule le nouveau tableau et appelle `onColumnsChange` ;
 * le composant ne mute jamais `columns` lui-même (même contrat que
 * `<SortableList>`, #853). `.kanban-count` de chaque colonne est dérivé de
 * `column.cards.length`, jamais d'un état interne — recalculé à chaque
 * rendu, comme le vanilla le recalcule après chaque drop
 * (`shared/components.js:340`, `cnt = c.querySelectorAll('.kanban-card').length`).
 *
 * **Glisser-déposer — HTML5 Drag & Drop natif** (`draggable`,
 * `dragstart`/`dragend` sur la carte, `dragover`/`dragleave`/`drop` sur la
 * colonne), calque direct du vanilla : `.dragging` sur la source,
 * `.drag-over` sur la colonne cible survolée, `dropEffect = 'move'` posé au
 * `dragover` (`shared/components.js:335`). Le drop **ajoute toujours la
 * carte en fin de la colonne cible** — le vanilla ne calcule aucune position
 * d'insertion (`col.appendChild`), aucune position n'est donc calculée ici
 * non plus (pas de réordonnancement au sein d'une colonne).
 *
 * Aucune logique métier : le composant ne connaît ni le sens d'un statut de
 * colonne, ni la signification d'une carte — il déplace un objet opaque
 * d'un tableau à l'autre, sur notification d'un drop.
 *
 * SSR-safe : aucun accès `window`/`document` au render — uniquement dans les
 * gestionnaires d'événements de glissement (jamais invoqués côté serveur).
 */
export function KanbanBoard({
  columns,
  onColumnsChange,
  className,
}: KanbanBoardProps) {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(
    null,
  );

  function findColumnOfCard(cardId: string): string | null {
    return columns.find((col) => col.cards.some((c) => c.id === cardId))
      ?.id ?? null;
  }

  function handleDragStart(
    e: ReactDragEvent<HTMLDivElement>,
    cardId: string,
  ): void {
    setDraggingCardId(cardId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd(): void {
    setDraggingCardId(null);
    setDragOverColumnId(null);
  }

  function handleColumnDragOver(
    e: ReactDragEvent<HTMLDivElement>,
    columnId: string,
  ): void {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumnId(columnId);
  }

  function handleColumnDragLeave(columnId: string): void {
    setDragOverColumnId((prev) => (prev === columnId ? null : prev));
  }

  function handleDrop(
    e: ReactDragEvent<HTMLDivElement>,
    columnId: string,
  ): void {
    e.preventDefault();
    setDragOverColumnId(null);
    if (draggingCardId == null) return;
    const fromColumnId = findColumnOfCard(draggingCardId);
    if (fromColumnId == null || fromColumnId === columnId) return;
    onColumnsChange(moveCard(columns, draggingCardId, fromColumnId, columnId));
  }

  const classes = ["kanban-board", className].filter(Boolean).join(" ");

  return (
    <div className={classes} tabIndex={0}>
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          title={column.title}
          count={column.cards.length}
          dragOver={dragOverColumnId === column.id}
          onDragOver={(e) => handleColumnDragOver(e, column.id)}
          onDragLeave={() => handleColumnDragLeave(column.id)}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              title={card.title}
              description={card.description}
              footer={card.footer}
              dragging={draggingCardId === card.id}
              draggable
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </KanbanColumn>
      ))}
    </div>
  );
}

KanbanBoard.displayName = "KanbanBoard";
