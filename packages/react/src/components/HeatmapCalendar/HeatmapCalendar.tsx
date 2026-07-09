import {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** Une cellule-source : une date (`YYYY-MM-DD`) et sa valeur numérique. */
export interface HeatmapCell {
  /** Date au format `YYYY-MM-DD` (parse local, pas de décalage UTC). */
  date: string;
  /** Valeur d'intensité — binnée en 5 paliers (0..4) via `levelFor`. */
  value: number;
}

export interface HeatmapCalendarProps {
  /**
   * Données — remplace les cellules-source `[data-date][data-value]` ET
   * l'attribut `data-cells` du vanilla : source unique en prop. Contrôlé par
   * les données ; aucun état interne pour la donnée métier.
   *
   * En cas de dates dupliquées, la **dernière** valeur écrase (comme le
   * `valueByDate` du vanilla). Le parent doit fournir des dates uniques.
   */
  cells: HeatmapCell[];
  /** `aria-label` du `role="group"` de la grille. @default "Calendrier heatmap" */
  ariaLabel?: string;
  /** Libellé de gauche de la légende. @default "Moins" */
  legendLess?: string;
  /** Libellé de droite de la légende. @default "Plus" */
  legendMore?: string;
  /** 7 libellés Lun..Dim (1 sur 2 affiché, index impairs). @default FR */
  dayLabels?: string[];
  /**
   * 12 libellés de mois (Janvier..Décembre). Alimente le formatage de date de
   * l'`aria-label` et du tooltip. @default FR
   *
   * NB : le vanilla ne rend **aucune rangée de mois** (`.heatmap-months` /
   * `.heatmap-month-label` sont du CSS mort) — ce port n'en rend pas non plus
   * (parité). `monthLabels` sert uniquement au formatage des dates.
   */
  monthLabels?: string[];
  /**
   * Formate l'`aria-label` de chaque cellule.
   * @default `(cell, date) => "<jour> <mois> <année> : <value>"`
   */
  formatCellLabel?: (cell: HeatmapCell, date: Date) => string;
  /** Classes additionnelles sur `.heatmap-cal`. */
  className?: string;
  /** Appelé quand une cellule reçoit le focus (parité event `heatmap:hover`). */
  onCellFocus?: (cell: HeatmapCell) => void;
}

const DEFAULT_DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DEFAULT_MONTH_LABELS = [
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

/** Parse `YYYY-MM-DD` en Date locale (évite le décalage UTC de `new Date(str)`). */
function parseDate(str: string): Date {
  const parts = String(str).split("-").map(Number);
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

/** Sérialise une Date en `YYYY-MM-DD`. */
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Lundi=0 .. Dimanche=6 (alignement ISO). */
function isoDow(d: Date): number {
  const dow = d.getDay();
  return dow === 0 ? 6 : dow - 1;
}

/** Binning trivial : 4 seuils réguliers (quartiles) dérivés du max des valeurs. */
function levelFor(value: number, max: number): number {
  if (!value || value <= 0) return 0;
  if (max <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** useLayoutEffect côté client, useEffect côté serveur (SSR-safe, no warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const MS_PER_DAY = 86400000;

interface InternalCell {
  key: string;
  date: Date;
  week: number;
  row: number;
  isPadding: boolean;
  value: number;
  level: number;
}

interface HeatmapModel {
  cells: InternalCell[];
  validKeys: Set<string>;
  lastValidKey: string | null;
  firstKey: string;
  lastKey: string;
  totalWeeks: number;
}

/**
 * HeatmapCalendar — Grille type « contributions » du Design System msyx.fr
 * (`data.html` #heatmap-calendar, calque `initHeatmapCalendar` —
 * `shared/components.js:5926-6170`).
 *
 * Émet le markup canonique `.heatmap-cal` (`components/heatmap-calendar.css`) :
 * `.heatmap-cal-scroll > .heatmap-cal-inner > (.heatmap-body [.heatmap-day-labels
 * + .heatmap-grid] + .heatmap-legend)`, plus un tooltip `.heatmap-tooltip`
 * porté sur `document.body` (portal).
 *
 * **Contrôlé par les données** (`cells`) — l'état interne se limite au tooltip
 * (visible + contenu + position) et à l'index du roving-tabindex. Le binning
 * `levelFor` (quartiles du max), l'alignement `gridStart` sur le lundi et le
 * placement explicite `grid-column`/`grid-row` par cellule sont conservés à
 * l'identique du vanilla.
 *
 * **Styles inline load-bearing** (absents du CSS, DOIVENT être posés inline) :
 * - `.heatmap-grid` → `grid-template-columns: repeat(N, 12px)` (N = totalWeeks) ;
 * - chaque `.heatmap-cell` → `grid-column` (n° de semaine) + `grid-row` (jour) ;
 * - cellules de remplissage (avant la 1ʳᵉ date) → `visibility: hidden` ;
 * - `.heatmap-tooltip` → `left`/`top` px (position:fixed au curseur, flip
 *   anti-débordement viewport).
 *
 * **Piège invisible-class** : le tooltip n'apparaît QUE si `.heatmap-tooltip`
 * reçoit la classe `.visible` (CSS de base `display:none`). Posée au
 * mouseenter/focus, retirée au mouseleave/blur (équivalent `.open`
 * d'`ActionMenu` #612).
 *
 * **Attribut d'état `data-level`** : sans `data-level="0..4"` sur chaque
 * cellule, toutes les cases restent des carrés bordés sans fond (heatmap
 * invisible). Calculé par `levelFor(value, max)`.
 *
 * **Clavier (roving-tabindex)** : une seule cellule valide porte `tabindex=0`
 * (dernière date au montage). Flèches (←/↑ = jour −1, →/↓ = jour +1, navigation
 * LINÉAIRE par date comme le vanilla, PAS 2D), Home/End = première/dernière
 * date valide. La cellule cible reçoit `tabindex=0` et `.focus()`.
 *
 * SSR-safe : aucun accès `window`/`document` au render (portal guardé,
 * mesures/positions uniquement dans effets et handlers).
 */
export function HeatmapCalendar({
  cells,
  ariaLabel = "Calendrier heatmap",
  legendLess = "Moins",
  legendMore = "Plus",
  dayLabels = DEFAULT_DAY_LABELS,
  monthLabels = DEFAULT_MONTH_LABELS,
  formatCellLabel,
  className,
  onCellFocus,
}: HeatmapCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<{
    clientX: number | null;
    clientY: number | null;
    rect: DOMRect;
  } | null>(null);
  const shouldFocusRef = useRef(false);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [tip, setTip] = useState<{
    visible: boolean;
    title: string;
    value: string;
  }>({ visible: false, title: "", value: "" });

  const fmtDateLabel = (d: Date): string =>
    `${d.getDate()} ${monthLabels[d.getMonth()] ?? ""} ${d.getFullYear()}`;

  const cellLabel = (cell: InternalCell): string => {
    const payload: HeatmapCell = { date: cell.key, value: cell.value };
    if (formatCellLabel) return formatCellLabel(payload, cell.date);
    return `${fmtDateLabel(cell.date)} : ${cell.value}`;
  };

  // ─── Modèle géométrique (dépend uniquement des données) ────────────────
  const model = useMemo<HeatmapModel | null>(() => {
    if (!cells || cells.length === 0) return null;

    const valueByDate: Record<string, number> = {};
    const keys: string[] = [];
    for (const c of cells) {
      const v = Number.isFinite(c.value) ? c.value : 0;
      if (!(c.date in valueByDate)) keys.push(c.date);
      valueByDate[c.date] = v; // dernière valeur écrase
    }

    let maxValue = 0;
    for (const k of keys) if (valueByDate[k] > maxValue) maxValue = valueByDate[k];

    const sorted = [...keys].sort(
      (a, b) => parseDate(a).getTime() - parseDate(b).getTime(),
    );
    const firstDate = parseDate(sorted[0]);
    const lastDate = parseDate(sorted[sorted.length - 1]);

    // Aligne le début de grille sur le lundi de la semaine du firstDate.
    const gridStart = new Date(firstDate);
    gridStart.setDate(gridStart.getDate() - isoDow(gridStart));

    const totalDays =
      Math.round((lastDate.getTime() - gridStart.getTime()) / MS_PER_DAY) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);

    const internal: InternalCell[] = [];
    const validKeys = new Set<string>();
    let lastValidKey: string | null = null;

    for (let d = 0; d < totalDays; d++) {
      const cur = new Date(gridStart);
      cur.setDate(cur.getDate() + d);
      const key = fmtDate(cur);
      const week = Math.floor(d / 7) + 1;
      const row = isoDow(cur) + 1;
      const isPadding = cur < firstDate || cur > lastDate;

      if (isPadding) {
        internal.push({
          key,
          date: cur,
          week,
          row,
          isPadding: true,
          value: 0,
          level: 0,
        });
      } else {
        const value = key in valueByDate ? valueByDate[key] : 0;
        internal.push({
          key,
          date: cur,
          week,
          row,
          isPadding: false,
          value,
          level: levelFor(value, maxValue),
        });
        validKeys.add(key);
        lastValidKey = key;
      }
    }

    return {
      cells: internal,
      validKeys,
      lastValidKey,
      firstKey: sorted[0],
      lastKey: sorted[sorted.length - 1],
      totalWeeks,
    };
  }, [cells]);

  // Cellule active (tabindex=0) : la sélection courante si encore valide,
  // sinon la dernière date valide (comportement initial du vanilla).
  const activeKey =
    activeDate && model?.validKeys.has(activeDate)
      ? activeDate
      : (model?.lastValidKey ?? null);

  // ─── Focus programmatique après navigation clavier ─────────────────────
  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    if (!activeDate) return;
    const el = gridRef.current?.querySelector<HTMLElement>(
      `.heatmap-cell[data-date="${activeDate}"]`,
    );
    el?.focus();
  }, [activeDate]);

  // ─── Positionnement du tooltip (mesure la taille réelle, flip viewport) ──
  function positionTooltip() {
    const tt = tooltipRef.current;
    const a = anchorRef.current;
    if (!tt || !a) return;
    const rect = a.rect;
    let x = a.clientX != null ? a.clientX + 14 : rect.right + 8;
    let y = a.clientY != null ? a.clientY - 10 : rect.top - 8;
    const tw = tt.offsetWidth || 160;
    const th = tt.offsetHeight || 48;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    if (x + tw > vw - 8) x = rect.left - tw - 8;
    if (y + th > vh - 8) y = rect.top - th - 8;
    if (y < 8) y = rect.bottom + 8;
    tt.style.left = `${x}px`;
    tt.style.top = `${y}px`;
  }

  useIsoLayoutEffect(() => {
    if (tip.visible) positionTooltip();
    // positionTooltip lit anchorRef/tooltipRef (refs) — pas de dép. supplémentaire
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip]);

  function openTooltip(
    cell: InternalCell,
    e: MouseEvent<HTMLDivElement> | FocusEvent<HTMLDivElement>,
    hasMouse: boolean,
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouse = e as MouseEvent<HTMLDivElement>;
    anchorRef.current = {
      clientX: hasMouse ? mouse.clientX : null,
      clientY: hasMouse ? mouse.clientY : null,
      rect,
    };
    setTip({ visible: true, title: fmtDateLabel(cell.date), value: String(cell.value) });
  }

  function moveTooltip(e: MouseEvent<HTMLDivElement>) {
    anchorRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      rect: e.currentTarget.getBoundingClientRect(),
    };
    positionTooltip();
  }

  function hideTooltip() {
    setTip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }

  // ─── Navigation clavier (roving tabindex, flèches, Home/End) ───────────
  function handleGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!model || !activeKey) return;
    const d2 = parseDate(activeKey);
    let handled = false;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        d2.setDate(d2.getDate() - 1);
        handled = true;
        break;
      case "ArrowRight":
      case "ArrowDown":
        d2.setDate(d2.getDate() + 1);
        handled = true;
        break;
      case "Home":
        d2.setTime(parseDate(model.firstKey).getTime());
        handled = true;
        break;
      case "End":
        d2.setTime(parseDate(model.lastKey).getTime());
        handled = true;
        break;
      default:
        return;
    }

    if (!handled) return;
    e.preventDefault();
    const nextKey = fmtDate(d2);
    if (!model.validKeys.has(nextKey)) return;
    shouldFocusRef.current = true;
    setActiveDate(nextKey);
  }

  const rootClasses = ["heatmap-cal", className].filter(Boolean).join(" ");

  if (!model) {
    return <div className={rootClasses} />;
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${model.totalWeeks}, 12px)`,
  };

  const portalTarget =
    typeof document !== "undefined" ? document.body : null;

  return (
    <div className={rootClasses}>
      <div className="heatmap-cal-scroll">
        <div className="heatmap-cal-inner">
          <div className="heatmap-body">
            <div className="heatmap-day-labels">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className="heatmap-day-label">
                  {i % 2 === 1 ? dayLabels[i] : ""}
                </span>
              ))}
            </div>
            <div
              ref={gridRef}
              className="heatmap-grid"
              role="group"
              aria-label={ariaLabel}
              style={gridStyle}
              onKeyDown={handleGridKeyDown}
            >
              {model.cells.map((cell) => {
                const placement: CSSProperties = {
                  gridColumn: String(cell.week),
                  gridRow: String(cell.row),
                };
                if (cell.isPadding) {
                  return (
                    <div
                      key={cell.key}
                      className="heatmap-cell"
                      data-date={cell.key}
                      aria-hidden="true"
                      tabIndex={-1}
                      style={{ ...placement, visibility: "hidden" }}
                    />
                  );
                }
                return (
                  <div
                    key={cell.key}
                    className="heatmap-cell"
                    data-date={cell.key}
                    data-level={cell.level}
                    data-value={cell.value}
                    role="img"
                    aria-label={cellLabel(cell)}
                    tabIndex={cell.key === activeKey ? 0 : -1}
                    style={placement}
                    onMouseEnter={(e) => openTooltip(cell, e, true)}
                    onMouseMove={moveTooltip}
                    onMouseLeave={hideTooltip}
                    onFocus={(e) => {
                      openTooltip(cell, e, false);
                      onCellFocus?.({ date: cell.key, value: cell.value });
                    }}
                    onBlur={hideTooltip}
                  />
                );
              })}
            </div>
          </div>

          <div className="heatmap-legend">
            <span>{legendLess}</span>
            <span className="heatmap-legend-cells">
              {[0, 1, 2, 3, 4].map((lvl) => (
                <span
                  key={lvl}
                  className="heatmap-cell"
                  data-level={lvl}
                  aria-hidden="true"
                />
              ))}
            </span>
            <span>{legendMore}</span>
          </div>
        </div>
      </div>

      {portalTarget &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`heatmap-tooltip${tip.visible ? " visible" : ""}`}
            aria-hidden="true"
          >
            <div className="heatmap-tooltip-title">{tip.title}</div>
            <div className="heatmap-tooltip-value">{tip.value}</div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}

HeatmapCalendar.displayName = "HeatmapCalendar";
