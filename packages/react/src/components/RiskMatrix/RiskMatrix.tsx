import {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Modal } from "../Modal/Modal";

/** Niveau de gravité d'un risque — pilote la couleur du dot et du badge. */
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskItem {
  /** Clé stable optionnelle (sinon dérivée de la position dans la case). */
  id?: string;
  /** Probabilité 1..size (axe Y). */
  prob: number;
  /** Impact 1..size (axe X). */
  impact: number;
  /** Libellé du risque — sert au tooltip, au modal et aux initiales du dot. */
  label: string;
  /** Niveau de gravité — pilote `data-level` du dot. @default "medium" */
  level?: RiskLevel;
  /** Responsable affiché dans le tooltip et le modal détail. */
  owner?: string;
  /** Description longue affichée dans le modal détail. */
  detail?: string;
}

export interface RiskMatrixProps {
  /** Données pilotant la grille — chaque risque est placé en `(prob, impact)`. */
  risks: RiskItem[];
  /** Taille de la matrice `size × size`. @default 5 */
  size?: 3 | 4 | 5;
  /** Libellé de l'axe X (abscisse, flèche `→` ajoutée). @default "Impact" */
  labelX?: string;
  /** Libellé de l'axe Y (ordonnée, vertical, flèche `↑` ajoutée). @default "Probabilité" */
  labelY?: string;
  /** Variante compacte — pose `.risk-matrix-compact`. */
  compact?: boolean;
  /** Nombre max de dots par case avant le badge `+N` (`.risk-dot-overflow`). @default 3 */
  maxDotsPerCell?: number;
  /** Animation d'apparition (reveal en cascade au scroll). @default true */
  animate?: boolean;
  /**
   * Clic/Enter/Espace sur un dot. Si fourni, l'app compose son propre détail
   * (ex. `<Modal>`). Si absent, un Modal interne (table de détail) s'ouvre.
   */
  onRiskClick?: (risk: RiskItem) => void;
  /** Classes additionnelles sur `.risk-matrix`. */
  className?: string;
}

/** Libellés FR par niveau — réplique `LEVEL_LABELS` (`components.js:3828`). */
const LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  critical: "Critique",
};

const DEFAULT_MAX_DOTS = 3;
const STAGGER_MS = 60;
/** Dimensions de repli du tooltip avant première mesure (calque vanilla). */
const TOOLTIP_FALLBACK_W = 200;
const TOOLTIP_FALLBACK_H = 80;

/**
 * Niveau colorimétrique d'une case — réplique `scoreLevel`
 * (`components.js:3830`). Seuils sur le ratio `score / maxScore`.
 */
function scoreLevel(score: number, maxScore: number): RiskLevel {
  const ratio = score / maxScore;
  if (ratio <= 0.16) return "low";
  if (ratio <= 0.36) return "medium";
  if (ratio <= 0.64) return "high";
  return "critical";
}

/** Initiales d'un dot — réplique `initials` (`components.js:3838`). */
function initials(label: string): string {
  if (!label) return "?";
  const words = label.trim().split(/\s+/);
  if (words.length === 1) return label.slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface BuiltDot {
  key: string;
  risk: RiskItem;
  /** Position dans la case (>0 ⇒ chevauchement `-8px`). */
  posInCell: number;
  /** Index global d'apparition (ordre du reveal en cascade). */
  revealIndex: number;
}

interface BuiltCell {
  row: number;
  col: number;
  score: RiskLevel;
  dots: BuiltDot[];
  overflow: { count: number; revealIndex: number } | null;
}

interface BuiltGrid {
  cells: BuiltCell[];
  rowProbs: number[];
  total: number;
}

/**
 * Construit le modèle de grille à partir des données. Ordre d'itération =
 * ordre du vanilla (ligne par ligne, colonne par colonne, dots dans la case) —
 * garantit un `revealIndex` cohérent avec la cascade d'apparition.
 *
 * Inversion d'axe Y : la ligne de grille `row` (1..size) correspond à
 * `prob = size - row + 1` (prob max en haut, prob 1 en bas), verbatim du
 * vanilla (`components.js:3909`). La colonne `col` (1..size) = `impact`.
 */
function buildGrid(
  risks: RiskItem[],
  size: number,
  maxDots: number,
): BuiltGrid {
  const maxScore = size * size;
  const cellMap = new Map<string, RiskItem[]>();
  risks.forEach((risk) => {
    const key = `${risk.prob}_${risk.impact}`;
    const arr = cellMap.get(key);
    if (arr) arr.push(risk);
    else cellMap.set(key, [risk]);
  });

  const cells: BuiltCell[] = [];
  const rowProbs: number[] = [];
  let revealIndex = 0;

  for (let row = 1; row <= size; row++) {
    const prob = size - row + 1;
    rowProbs.push(prob);
    for (let col = 1; col <= size; col++) {
      const impact = col;
      const score = prob * impact;
      const items = cellMap.get(`${prob}_${impact}`) ?? [];

      const dots: BuiltDot[] = [];
      items.forEach((risk, posInCell) => {
        if (posInCell >= maxDots) return;
        dots.push({
          key: risk.id ?? `${prob}_${impact}_${posInCell}`,
          risk,
          posInCell,
          revealIndex: revealIndex++,
        });
      });

      let overflow: BuiltCell["overflow"] = null;
      if (items.length > maxDots) {
        overflow = { count: items.length - maxDots, revealIndex: revealIndex++ };
      }

      cells.push({ row, col, score: scoreLevel(score, maxScore), dots, overflow });
    }
  }

  return { cells, rowProbs, total: revealIndex };
}

interface TooltipState {
  risk: RiskItem;
  left: number;
  top: number;
}

/** Styles inline du corps du modal détail — calque du vanilla (`components.js:4033`). */
const TD_LABEL: CSSProperties = {
  padding: "0.4rem 0.6rem",
  color: "var(--text-muted)",
};
const TD_LABEL_FIRST: CSSProperties = { ...TD_LABEL, width: "35%" };
const TD_LABEL_TOP: CSSProperties = { ...TD_LABEL, verticalAlign: "top" };
const TD_VALUE: CSSProperties = { padding: "0.4rem 0.6rem" };

/**
 * RiskMatrix — Matrice de risques probabilité × impact du Design System
 * msyx.fr (`pages/data.html` #risk-matrix, port de `initRiskMatrix`
 * `shared/components.js:3827-4099`).
 *
 * Port **data-driven** : là où le vanilla lit puis retire des `.risk-item` du
 * DOM, ce wrapper reçoit un tableau `risks` et génère la grille CSS. Le niveau
 * colorimétrique de chaque case (`data-score`) est **calculé**
 * (`prob × impact` rapporté à `size²`, seuils 0.16/0.36/0.64) ; `data-level`
 * du dot vient de `RiskItem.level` (défaut `medium`).
 *
 * **Styles inline indispensables** (absents du CSS DS, posés côté JS — piège
 * `.progress-fill` #FileUpload) : `.risk-grid` porte `grid-template-columns` /
 * `grid-template-rows` (`24px repeat(size,1fr)` / `repeat(size,1fr) 24px`),
 * chaque `.risk-cell` son `grid-column`/`grid-row` explicites (avec inversion
 * d'axe Y), et les dots en collision leur `margin-left:-8px`. Sans ces styles
 * la grille s'effondre. La prop vestigiale `--i` du vanilla (aucune référence
 * `var(--i)` en CSS) est **volontairement abandonnée**.
 *
 * **Classes d'état** (piège `.open` #ActionMenu / `.visible` #612) :
 * - `.risk-dot-hidden` → `.risk-dot-visible` : l'état hidden (scale 0/opacity
 *   0) est l'état initial, le passage à visible EST l'animation. Reveal en
 *   cascade (stagger 60 ms) via `IntersectionObserver`, avec repli immédiat si
 *   déjà dans le viewport (fix SPA) ou si `IntersectionObserver` est absent
 *   (SSR / jsdom). `animate={false}` rend les dots visibles sans animation.
 * - `.risk-tooltip.visible` : le tooltip (portail sur `document.body`,
 *   `position:fixed`) est `display:none` tant que `.visible` est absent — seul
 *   son ajout le révèle. Il suit le curseur (mouseenter/mousemove) avec
 *   recadrage viewport, et s'ancre au dot au focus clavier (le vanilla
 *   positionnait à `NaN` au focus — corrigé ici).
 *
 * **Détail au clic** : `onRiskClick(risk)` délègue à l'app (qui compose son
 * `<Modal>`). Sans handler, un `<Modal>` interne s'ouvre avec la table de
 * détail (styles inline répliqués). Le bouton no-op « Modifier » du vanilla
 * est abandonné (fallback en lecture seule) ; une app qui veut des actions
 * passe `onRiskClick`.
 *
 * A11y : chaque dot est `role="button"` + `tabIndex=0` + `aria-label`
 * (`« <label> — niveau <niveau> »`), activable clavier (Enter/Espace). Respecte
 * `prefers-reduced-motion` (reveal immédiat sans stagger). Le badge overflow
 * est `aria-hidden`.
 *
 * SSR-safe : aucun accès à `window`/`document`/`IntersectionObserver` au rendu
 * — portail gardé (`typeof document`), reveal et positionnement uniquement dans
 * `useEffect` / gestionnaires d'événements (post-montage). Timers et observer
 * nettoyés au démontage.
 */
export function RiskMatrix({
  risks,
  size = 5,
  labelX = "Impact",
  labelY = "Probabilité",
  compact,
  maxDotsPerCell,
  animate = true,
  onRiskClick,
  className,
}: RiskMatrixProps) {
  const maxDots =
    typeof maxDotsPerCell === "number" && maxDotsPerCell > 0
      ? maxDotsPerCell
      : DEFAULT_MAX_DOTS;

  const { cells, rowProbs, total } = buildGrid(risks, size, maxDots);

  const rootRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [detailRisk, setDetailRisk] = useState<RiskItem | null>(null);

  // Reveal en cascade. Dépend de `total` (nombre stable) et non de l'identité
  // du tableau `risks` : un consumer passant `risks={[...]}` inline ne relance
  // pas l'animation à chaque rendu tant que le nombre de dots ne change pas.
  useEffect(() => {
    if (!animate) return;
    const root = rootRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let observer: IntersectionObserver | null = null;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      if (prefersReducedMotion()) {
        setRevealCount(total);
        return;
      }
      for (let i = 0; i < total; i++) {
        timers.push(
          setTimeout(
            () => setRevealCount((c) => (c > i ? c : i + 1)),
            i * STAGGER_MS,
          ),
        );
      }
    };

    setRevealCount(0);

    if (root && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              start();
              observer?.disconnect();
            }
          });
        },
        { threshold: 0.1 },
      );
      observer.observe(root);
      // Repli SPA : déjà visible au montage ⇒ anime immédiatement.
      const rect = root.getBoundingClientRect();
      if (
        typeof window !== "undefined" &&
        rect.top < window.innerHeight &&
        rect.bottom > 0
      ) {
        start();
        observer.disconnect();
      }
    } else {
      // IntersectionObserver absent (SSR / jsdom / vieux navigateur) ⇒ reveal
      // immédiat en cascade.
      start();
    }

    return () => {
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [animate, total]);

  function computePos(clientX: number, clientY: number): {
    left: number;
    top: number;
  } {
    const tw = tooltipRef.current?.offsetWidth || TOOLTIP_FALLBACK_W;
    const th = tooltipRef.current?.offsetHeight || TOOLTIP_FALLBACK_H;
    const vw = typeof window !== "undefined" ? window.innerWidth : 0;
    const vh = typeof window !== "undefined" ? window.innerHeight : 0;
    let x = clientX + 14;
    let y = clientY - 10;
    if (x + tw > vw - 8) x = clientX - tw - 14;
    if (y + th > vh - 8) y = clientY - th - 10;
    return { left: x, top: y };
  }

  function showTooltipAt(risk: RiskItem, clientX: number, clientY: number) {
    setTooltip({ risk, ...computePos(clientX, clientY) });
  }

  function showTooltipFromElement(risk: RiskItem, el: HTMLElement) {
    // Focus clavier : aucune coordonnée curseur — on ancre au dot (le vanilla
    // positionnait à NaN dans ce cas).
    const rect = el.getBoundingClientRect();
    showTooltipAt(risk, rect.right, rect.top);
  }

  function moveTooltip(clientX: number, clientY: number) {
    setTooltip((prev) =>
      prev ? { ...prev, ...computePos(clientX, clientY) } : prev,
    );
  }

  function hideTooltip() {
    setTooltip(null);
  }

  function activate(risk: RiskItem) {
    hideTooltip();
    if (onRiskClick) onRiskClick(risk);
    else setDetailRisk(risk);
  }

  function handleDotKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    risk: RiskItem,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(risk);
    }
  }

  const rootClasses = ["risk-matrix", compact ? "risk-matrix-compact" : null, className]
    .filter(Boolean)
    .join(" ");

  const gridChildren: ReactNode[] = [];

  // Libellés de ligne (colonne 0).
  rowProbs.forEach((prob, idx) => {
    const row = idx + 1;
    gridChildren.push(
      <div
        key={`rl-${row}`}
        className="risk-row-label"
        style={{ gridColumn: "1", gridRow: String(row) }}
      >
        {prob}
      </div>,
    );
  });

  // Cellules + dots.
  cells.forEach((cell) => {
    gridChildren.push(
      <div
        key={`c-${cell.row}-${cell.col}`}
        className="risk-cell"
        data-score={cell.score}
        style={{ gridColumn: String(cell.col + 1), gridRow: String(cell.row) }}
      >
        {cell.dots.map((dot) => {
          const level = dot.risk.level ?? "medium";
          const revealClass = !animate
            ? null
            : dot.revealIndex < revealCount
              ? "risk-dot-visible"
              : "risk-dot-hidden";
          return (
            <div
              key={dot.key}
              className={["risk-dot", revealClass].filter(Boolean).join(" ")}
              data-level={level}
              role="button"
              tabIndex={0}
              aria-label={`${dot.risk.label} — niveau ${LEVEL_LABELS[level]}`}
              style={dot.posInCell > 0 ? { marginLeft: "-8px" } : undefined}
              onMouseEnter={(e) => showTooltipAt(dot.risk, e.clientX, e.clientY)}
              onMouseMove={(e) => moveTooltip(e.clientX, e.clientY)}
              onMouseLeave={hideTooltip}
              onFocus={(e) => showTooltipFromElement(dot.risk, e.currentTarget)}
              onBlur={hideTooltip}
              onClick={() => activate(dot.risk)}
              onKeyDown={(e) => handleDotKeyDown(e, dot.risk)}
            >
              {initials(dot.risk.label)}
            </div>
          );
        })}
        {cell.overflow && (
          <div
            className={[
              "risk-dot",
              "risk-dot-overflow",
              !animate
                ? null
                : cell.overflow.revealIndex < revealCount
                  ? "risk-dot-visible"
                  : "risk-dot-hidden",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
            style={{ marginLeft: "-8px" }}
          >
            +{cell.overflow.count}
          </div>
        )}
      </div>,
    );
  });

  // Coin vide + libellés de colonne (dernière ligne).
  gridChildren.push(
    <div key="corner" style={{ gridColumn: "1", gridRow: String(size + 1) }} />,
  );
  for (let c = 1; c <= size; c++) {
    gridChildren.push(
      <div
        key={`cl-${c}`}
        className="risk-col-label"
        style={{ gridColumn: String(c + 1), gridRow: String(size + 1) }}
      >
        {c}
      </div>,
    );
  }

  const activeLevel: RiskLevel = tooltip
    ? (tooltip.risk.level ?? "medium")
    : "medium";

  const detailLevel: RiskLevel = detailRisk
    ? (detailRisk.level ?? "medium")
    : "medium";

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <div ref={rootRef} className={rootClasses} data-size={size}>
      <div className="risk-matrix-wrap">
        <div className="risk-axis-y">{labelY} ↑</div>
        <div className="risk-matrix-inner">
          <div
            className="risk-grid"
            style={{
              gridTemplateColumns: `24px repeat(${size}, 1fr)`,
              gridTemplateRows: `repeat(${size}, 1fr) 24px`,
            }}
          >
            {gridChildren}
          </div>
          <div className="risk-axis-x">{labelX} →</div>
        </div>
      </div>

      {portalTarget &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`risk-tooltip${tooltip ? " visible" : ""}`}
            style={tooltip ? { left: tooltip.left, top: tooltip.top } : undefined}
          >
            {tooltip && (
              <>
                <div className="risk-tooltip-title">{tooltip.risk.label}</div>
                <div className="risk-tooltip-row">
                  <span className={`risk-tooltip-badge ${activeLevel}`}>
                    {LEVEL_LABELS[activeLevel]}
                  </span>
                  {tooltip.risk.owner && (
                    <span className="risk-tooltip-owner">{tooltip.risk.owner}</span>
                  )}
                </div>
                <div className="risk-tooltip-hint">Clic pour le détail complet</div>
              </>
            )}
          </div>,
          portalTarget,
        )}

      {!onRiskClick && (
        <Modal
          open={detailRisk !== null}
          onClose={() => setDetailRisk(null)}
          title={detailRisk?.label ?? "Risque"}
          actions={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setDetailRisk(null)}
            >
              Fermer
            </button>
          }
        >
          {detailRisk && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <tbody>
                <tr>
                  <td style={TD_LABEL_FIRST}>Niveau</td>
                  <td style={TD_VALUE}>
                    <span className={`risk-tooltip-badge ${detailLevel}`}>
                      {LEVEL_LABELS[detailLevel]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={TD_LABEL}>Probabilité</td>
                  <td style={TD_VALUE}>
                    {detailRisk.prob} / {size}
                  </td>
                </tr>
                <tr>
                  <td style={TD_LABEL}>Impact</td>
                  <td style={TD_VALUE}>
                    {detailRisk.impact} / {size}
                  </td>
                </tr>
                {detailRisk.owner && (
                  <tr>
                    <td style={TD_LABEL}>Responsable</td>
                    <td style={TD_VALUE}>{detailRisk.owner}</td>
                  </tr>
                )}
                {detailRisk.detail && (
                  <tr>
                    <td style={TD_LABEL_TOP}>Description</td>
                    <td style={TD_VALUE}>{detailRisk.detail}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  );
}

RiskMatrix.displayName = "RiskMatrix";
