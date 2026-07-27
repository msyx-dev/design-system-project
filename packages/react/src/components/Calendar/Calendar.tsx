import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "../../icons/Icon";

export type CalendarMode = "single" | "range";

/** Plage `{start, end}` — les deux bornes sont `null` tant que la sélection n'est pas complète. */
export interface CalendarDateRange {
  start: Date | null;
  end: Date | null;
}

/** Mois affiché — `month` est 0-indexé (convention `Date.getMonth()`, 0 = janvier). */
export interface CalendarReferenceMonth {
  year: number;
  month: number;
}

/** Item de la légende optionnelle (`.cal-legend-item`). */
export interface CalendarLegendItem {
  label: string;
  /** Couleur CSS posée en `style` inline sur `.cal-legend-dot` — cette classe n'a AUCUN `background` par défaut dans le DS (piège capitalisé #628/#760). */
  color: string;
}

interface CalendarSharedProps {
  /** Mois affiché — mode **contrôlé**. Fourni, l'état interne ET `defaultReferenceMonth` sont ignorés : le parent doit répercuter `onReferenceMonthChange`. */
  referenceMonth?: CalendarReferenceMonth;
  /** Mois affiché initial en mode non contrôlé. @default mois courant réel */
  defaultReferenceMonth?: CalendarReferenceMonth;
  /** Appelé à chaque navigation de mois : boutons précédent/suivant, `PageUp`/`PageDown`, ou franchissement de mois via les flèches/`Home`/`End`. */
  onReferenceMonthChange?: (reference: CalendarReferenceMonth) => void;
  /**
   * Légende optionnelle (`.cal-legend` / `.cal-legend-item` / `.cal-legend-dot`).
   * Non émise si absente ou vide — `initCalendar` ne construit lui-même aucune
   * légende ni aucun marqueur `.cal-dots`/`.cal-dot` par jour (markup mort côté
   * JS, uniquement illustré statiquement dans la démo `formulaires.html`) :
   * seule la légende elle-même est portée ici, pas de fonctionnalité
   * "événements par jour" (hors contrat `initCalendar`).
   */
  legend?: CalendarLegendItem[];
  /** `aria-label` du bouton mois précédent (`.cal-prev`). @default "Mois précédent" */
  prevLabel?: string;
  /** `aria-label` du bouton mois suivant (`.cal-next`). @default "Mois suivant" */
  nextLabel?: string;
  /** Classes additionnelles sur `.cal-wrap`. */
  className?: string;
}

export interface CalendarSingleProps extends CalendarSharedProps {
  mode?: "single";
  /** Date sélectionnée — mode **contrôlé**. Fourni (même `null`), l'état interne ET `defaultValue` sont ignorés. */
  value?: Date | null;
  /** Date sélectionnée initiale en mode non contrôlé. @default null */
  defaultValue?: Date | null;
  /** Appelé à chaque sélection valide — calque `calendar:change` → `detail.date`. */
  onChange?: (date: Date) => void;
}

export interface CalendarRangeProps extends CalendarSharedProps {
  mode: "range";
  /** Plage sélectionnée — mode **contrôlé**. Fourni, l'état interne ET `defaultValue` sont ignorés. */
  value?: CalendarDateRange;
  /** Plage sélectionnée initiale en mode non contrôlé. @default `{ start: null, end: null }` */
  defaultValue?: CalendarDateRange;
  /**
   * Appelé à CHAQUE étape de la sélection — 1er clic (`start` seul), clic
   * complétant la plage, OU clic de reset (avant `start`/3e clic) — avec
   * `{ start, end }` où `end` vaut `null` tant que la plage n'est pas
   * complète.
   *
   * Le `CustomEvent('calendar:change')` DOM du vanilla n'est dispatché QUE
   * pour une plage complète (branche `else` finale de `selectDate()`) — MAIS
   * le vanilla `render(viewYear, viewMonth)` la grille (et met à jour
   * `rangeStartEl`/`rangeEndEl`) à **chaque** clic, y compris le 1er :
   * l'absence d'événement DOM ne signifie pas absence de retour visuel,
   * l'état vit dans le composant. En React **contrôlé**, `value` appartient
   * au parent — si `onChange` ne fire qu'à la complétion, le parent ne sait
   * rien du 1er clic et rien ne s'affiche, ce qui romprait la parité
   * visuelle avec le vanilla. `onChange` fire donc à chaque clic pour que le
   * mode contrôlé reste visuellement fidèle ; un consumer qui ne veut que
   * les plages complètes filtre simplement sur `end !== null`.
   */
  onChange?: (range: { start: Date; end: Date | null }) => void;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

const DEFAULT_PREV_LABEL = "Mois précédent";
const DEFAULT_NEXT_LABEL = "Mois suivant";

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const MONTH_NAMES_LOWER = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EMPTY_RANGE: CalendarDateRange = { start: null, end: null };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DD` local (jamais `toISOString`, qui décale en UTC). */
function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isSameDay(
  a: Date | null | undefined,
  b: Date | null | undefined,
): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Strictement ENTRE les deux bornes (exclusif) — calque `isBetween` vanilla. */
function isBetweenExclusive(
  d: Date,
  start: Date | null,
  end: Date | null,
): boolean {
  if (!start || !end) return false;
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
}

/** `"8 mars 2026"` — jour sans zéro de tête, mois en toutes lettres minuscule, année. Calque exact du vanilla. */
function formatAriaLabel(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES_LOWER[d.getMonth()]} ${d.getFullYear()}`;
}

function getCurrentMonthRef(): CalendarReferenceMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

interface GridCell {
  date: Date;
  dateKey: string;
  isOtherMonth: boolean;
}

/**
 * Grille 42 cellules (6 semaines × 7 jours), lundi en 1re colonne — calque
 * exact de l'algorithme `render()` d'`initCalendar` (offset via
 * `(firstDay.getDay() + 6) % 7`).
 */
function buildMonthGrid(year: number, month: number): GridCell[] {
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const nbDays = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: GridCell[] = [];
  for (let cell = 0; cell < 42; cell++) {
    const dayNum = cell - offset + 1;
    let date: Date;
    let isOtherMonth: boolean;

    if (cell < offset) {
      date = new Date(year, month - 1, prevMonthDays - offset + cell + 1);
      isOtherMonth = true;
    } else if (dayNum <= nbDays) {
      date = new Date(year, month, dayNum);
      isOtherMonth = false;
    } else {
      date = new Date(year, month + 1, dayNum - nbDays);
      isOtherMonth = true;
    }

    cells.push({ date, dateKey: formatDateKey(date), isOtherMonth });
  }
  return cells;
}

/**
 * Roving tabindex — cellule qui reçoit `tabIndex=0` : `focusedKey` s'il pointe
 * sur une cellule du mois courant, sinon `.today`, sinon la 1re cellule du
 * mois courant. Calque exact du fallback `render()` vanilla.
 */
function computeTabbableKey(
  cells: GridCell[],
  focusedKey: string | null,
  today: Date,
): string | null {
  if (focusedKey) {
    const focused = cells.find((c) => c.dateKey === focusedKey);
    if (focused && !focused.isOtherMonth) return focusedKey;
  }
  const todayCell = cells.find(
    (c) => !c.isOtherMonth && isSameDay(c.date, today),
  );
  if (todayCell) return todayCell.dateKey;
  const firstCell = cells.find((c) => !c.isOtherMonth);
  return firstCell ? firstCell.dateKey : null;
}

/**
 * Machine 2-clics du mode range — calque exact de `selectDate()` (branche
 * `else`) d'`initCalendar` :
 * - pas de `start`, ou `start`+`end` déjà complets → RESET, `clicked` devient `start`
 * - `clicked` avant `start` → RESET, `clicked` devient `start`
 * - sinon → `clicked` devient `end`, plage complète
 */
function computeNextRange(
  current: CalendarDateRange,
  clicked: Date,
): { next: CalendarDateRange; complete: boolean } {
  const { start, end } = current;
  if (!start || (start && end)) {
    return { next: { start: clicked, end: null }, complete: false };
  }
  if (clicked.getTime() < start.getTime()) {
    return { next: { start: clicked, end: null }, complete: false };
  }
  return { next: { start, end: clicked }, complete: true };
}

/**
 * Calendar — Date-picker INLINE du Design System msyx.fr, modes `single` et
 * `range` (`formulaires.html` #calendar, calque `initCalendar` —
 * `shared/components.js:5151-5424`). Le time-picker (`initTimePicker`) n'est
 * **pas** couvert ici (#761, ticket séparé).
 *
 * Émet le markup canonique (`components/templates.css`) :
 * ```html
 * <div class="cal-wrap">
 *   <div class="cal-header">
 *     <h4 aria-live="polite">Mars 2026</h4>
 *     <div class="cal-nav">
 *       <button class="cal-prev" aria-label="Mois précédent">…</button>
 *       <button class="cal-next" aria-label="Mois suivant">…</button>
 *     </div>
 *   </div>
 *   <div class="cal-weekdays"><span>Lun</span>…</div>
 *   <div class="cal-grid" role="grid">
 *     <div role="row">
 *       <div role="gridcell" class="cal-day other-month" data-date="2026-02-23"
 *            aria-label="23 février 2026" aria-disabled="true" tabindex="-1">23</div>
 *       …
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * **⚠️ Classes d'état — `.range-start`/`.range-end` portent AUSSI `.selected`**
 * (calque exact `classList.add('range-start','selected')` / `'range-end','selected'`).
 * Un wrapper qui n'émettrait que `.range-start` sans `.selected` casserait
 * visuellement les extrémités du range tout en passant des tests ARIA — c'est
 * la classe de bug déjà vécue (`<ActionMenu>` `.open`, `<Graph>`
 * `.graph-node--selected`). Testé explicitement.
 *
 * **Roving tabindex** : une seule cellule à `tabIndex=0` (cf. `computeTabbableKey`) ;
 * le focus est déplacé IMPÉRATIVEMENT via `ref.focus()` (`useLayoutEffect` +
 * `pendingFocusKeyRef`) pour la navigation clavier — jamais en se reposant sur
 * l'ordre du DOM. Le clic, lui, focus nativement la cellule cliquée (tout
 * `.cal-day` porte un `tabIndex`, même `-1`) — iso-vanilla, aucun appel
 * `.focus()` explicite au clic.
 *
 * **Machine range 2-clics** : voir `computeNextRange` — reset si clic avant
 * `start` ou si la plage est déjà complète, sinon complète la plage.
 * `onChange` (range) est appelé à CHAQUE clic (1er clic, complétion, reset)
 * avec `{ start, end }`, `end` valant `null` tant que la plage n'est pas
 * complète — calque du fait que le vanilla `render()` sa grille (retour
 * visuel immédiat) à chaque clic, même si le `CustomEvent('calendar:change')`
 * DOM n'est dispatché QUE pour une plage complète (voir JSDoc
 * `CalendarRangeProps.onChange`).
 *
 * **Clavier** (grille, calque exact) : `←/→/↑/↓` déplacent d'un jour/semaine,
 * `Home`/`End` vont au 1er/dernier jour de la semaine (lundi–dimanche),
 * `PageUp`/`PageDown` changent de mois, `Entrée`/`Espace` sélectionnent la
 * cellule focusée (no-op si `.other-month`). `Échap` et toute autre touche :
 * no-op (iso-vanilla, pas de fermeture — calendrier INLINE, pas de popover).
 *
 * **Légende optionnelle** (`legend`) : `.cal-legend-dot` n'a **aucun**
 * `background` par défaut dans le DS → couleur posée en `style` inline
 * (même piège que `<FileUpload>`). `initCalendar` ne gère lui-même aucun
 * marqueur `.cal-dots`/`.cal-dot` par jour (markup mort côté JS, uniquement
 * illustré statiquement dans la démo) : non porté ici, hors contrat.
 *
 * **Mois affiché** — non contrôlé par défaut (`defaultReferenceMonth`,
 * @default mois courant réel) + contrôlé via `referenceMonth`/`onReferenceMonthChange`
 * (convention alignée sur `<SplitPane ratio>`/`<Accordion openIds>`).
 *
 * SSR-safe : aucun accès `window`/`document` au render (refs et
 * `useLayoutEffect` ne s'exécutent que côté client, après montage).
 */
export function Calendar(props: CalendarProps) {
  const {
    referenceMonth: controlledRef,
    defaultReferenceMonth,
    onReferenceMonthChange,
    legend,
    prevLabel = DEFAULT_PREV_LABEL,
    nextLabel = DEFAULT_NEXT_LABEL,
    className,
  } = props;

  const mode: CalendarMode = props.mode === "range" ? "range" : "single";

  const isRefControlled = controlledRef !== undefined;
  const [internalRef, setInternalRef] = useState<CalendarReferenceMonth>(
    () => defaultReferenceMonth ?? getCurrentMonthRef(),
  );
  const currentRef = isRefControlled
    ? (controlledRef as CalendarReferenceMonth)
    : internalRef;

  const [internalSingle, setInternalSingle] = useState<Date | null>(() =>
    props.mode !== "range" ? (props.defaultValue ?? null) : null,
  );
  const [internalRange, setInternalRange] = useState<CalendarDateRange>(() =>
    props.mode === "range" ? (props.defaultValue ?? EMPTY_RANGE) : EMPTY_RANGE,
  );

  const isSingleControlled =
    props.mode !== "range" && props.value !== undefined;
  const isRangeControlled = props.mode === "range" && props.value !== undefined;

  const currentSingle: Date | null =
    props.mode !== "range"
      ? isSingleControlled
        ? (props.value ?? null)
        : internalSingle
      : null;
  const currentRange: CalendarDateRange =
    props.mode === "range"
      ? isRangeControlled
        ? (props.value ?? EMPTY_RANGE)
        : internalRange
      : EMPTY_RANGE;

  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const pendingFocusKeyRef = useRef<string | null>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useLayoutEffect(() => {
    const key = pendingFocusKeyRef.current;
    if (key) {
      pendingFocusKeyRef.current = null;
      cellRefs.current[key]?.focus();
    }
  });

  const today = new Date();
  const grid = buildMonthGrid(currentRef.year, currentRef.month);
  const weeks: GridCell[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));
  const tabbableKey = computeTabbableKey(grid, focusedKey, today);

  function changeReferenceMonth(next: CalendarReferenceMonth): void {
    if (!isRefControlled) setInternalRef(next);
    onReferenceMonthChange?.(next);
  }

  function selectSingle(date: Date): void {
    if (!isSingleControlled) setInternalSingle(date);
    if (props.mode !== "range") props.onChange?.(date);
  }

  function selectRange(date: Date): void {
    const { next } = computeNextRange(currentRange, date);
    if (!isRangeControlled) setInternalRange(next);
    // `onChange` fire à CHAQUE clic (1er clic, complétion, reset) — voir
    // JSDoc `CalendarRangeProps.onChange` : le vanilla re-render sa grille à
    // chaque clic (retour visuel immédiat), pas seulement au dispatch du
    // `CustomEvent`. `next.start` est toujours défini ici (computeNextRange
    // ne renvoie jamais `start: null`).
    if (props.mode === "range" && next.start) {
      props.onChange?.({ start: next.start, end: next.end });
    }
  }

  function handleSelect(date: Date): void {
    if (mode === "range") selectRange(date);
    else selectSingle(date);
  }

  function handleCellClick(cell: GridCell): void {
    if (cell.isOtherMonth) return;
    setFocusedKey(cell.dateKey);
    handleSelect(cell.date);
  }

  function handlePrevClick(e: ReactMouseEvent<HTMLButtonElement>): void {
    let { year, month } = currentRef;
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    setFocusedKey(null);
    changeReferenceMonth({ year, month });
    e.currentTarget.focus();
  }

  function handleNextClick(e: ReactMouseEvent<HTMLButtonElement>): void {
    let { year, month } = currentRef;
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    setFocusedKey(null);
    changeReferenceMonth({ year, month });
    e.currentTarget.focus();
  }

  function handleGridKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (!tabbableKey) return;
    const parts = tabbableKey.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const cell = grid.find((c) => c.dateKey === tabbableKey);
      if (cell && !cell.isOtherMonth) {
        setFocusedKey(tabbableKey);
        handleSelect(cell.date);
      }
      return;
    }

    let handled = true;
    if (e.key === "ArrowLeft") d.setDate(d.getDate() - 1);
    else if (e.key === "ArrowRight") d.setDate(d.getDate() + 1);
    else if (e.key === "ArrowUp") d.setDate(d.getDate() - 7);
    else if (e.key === "ArrowDown") d.setDate(d.getDate() + 7);
    else if (e.key === "Home") {
      const day = d.getDay();
      d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    } else if (e.key === "End") {
      const day = d.getDay();
      d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
    } else if (e.key === "PageUp") d.setMonth(d.getMonth() - 1);
    else if (e.key === "PageDown") d.setMonth(d.getMonth() + 1);
    else handled = false;

    if (!handled) return; // Échap + touches non gérées : no-op (iso-vanilla)

    e.preventDefault();
    const nextKey = formatDateKey(d);
    setFocusedKey(nextKey);
    pendingFocusKeyRef.current = nextKey;
    if (
      d.getMonth() !== currentRef.month ||
      d.getFullYear() !== currentRef.year
    ) {
      changeReferenceMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  const wrapClasses = ["cal-wrap", className].filter(Boolean).join(" ");

  return (
    <div className={wrapClasses}>
      <div className="cal-header">
        <h4 aria-live="polite">
          {MONTH_NAMES[currentRef.month]} {currentRef.year}
        </h4>
        <div className="cal-nav">
          <button
            type="button"
            className="cal-prev"
            aria-label={prevLabel}
            onClick={handlePrevClick}
          >
            <Icon
              name="chevron-left"
              className="icon icon--sm"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="cal-next"
            aria-label={nextLabel}
            onClick={handleNextClick}
          >
            <Icon
              name="chevron-right"
              className="icon icon--sm"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      <div className="cal-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="cal-grid" role="grid" onKeyDown={handleGridKeyDown}>
        {weeks.map((week, weekIndex) => (
          <div role="row" key={weekIndex}>
            {week.map((cell) => {
              const isToday = !cell.isOtherMonth && isSameDay(cell.date, today);
              const isSelectedSingle =
                mode === "single" &&
                !cell.isOtherMonth &&
                isSameDay(cell.date, currentSingle);
              const isRangeStart =
                mode === "range" &&
                !cell.isOtherMonth &&
                isSameDay(cell.date, currentRange.start);
              const isRangeEnd =
                mode === "range" &&
                !cell.isOtherMonth &&
                isSameDay(cell.date, currentRange.end);
              const isInRange =
                mode === "range" &&
                !cell.isOtherMonth &&
                !isRangeStart &&
                !isRangeEnd &&
                isBetweenExclusive(
                  cell.date,
                  currentRange.start,
                  currentRange.end,
                );

              const dayClasses = ["cal-day"];
              if (cell.isOtherMonth) {
                dayClasses.push("other-month");
              } else {
                if (isToday) dayClasses.push("today");
                if (isSelectedSingle) dayClasses.push("selected");
                if (isRangeStart) dayClasses.push("range-start", "selected");
                else if (isRangeEnd) dayClasses.push("range-end", "selected");
                else if (isInRange) dayClasses.push("range");
              }

              const isSelectedAria =
                isSelectedSingle || isRangeStart || isRangeEnd;
              const isTabbable = cell.dateKey === tabbableKey;

              return (
                <div
                  key={cell.dateKey}
                  ref={(el) => {
                    cellRefs.current[cell.dateKey] = el;
                  }}
                  role="gridcell"
                  className={dayClasses.join(" ")}
                  data-date={cell.dateKey}
                  aria-label={formatAriaLabel(cell.date)}
                  aria-disabled={cell.isOtherMonth ? true : undefined}
                  aria-current={isToday ? "date" : undefined}
                  aria-selected={isSelectedAria ? true : undefined}
                  tabIndex={cell.isOtherMonth ? -1 : isTabbable ? 0 : -1}
                  onClick={() => handleCellClick(cell)}
                >
                  {cell.date.getDate()}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {legend && legend.length > 0 && (
        <div className="cal-legend">
          {legend.map((item, i) => (
            <div className="cal-legend-item" key={`${item.label}-${i}`}>
              <span
                className="cal-legend-dot"
                style={{ background: item.color }}
              />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

Calendar.displayName = "Calendar";
