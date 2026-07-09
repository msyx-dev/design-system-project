import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { HeatmapCalendar, HeatmapCell } from "./HeatmapCalendar";

/**
 * Jeu de données de référence (math validée hors-test) :
 *   firstDate 2026-05-06 (mercredi, isoDow=2) → gridStart 2026-05-04 (lundi)
 *   lastDate  2026-05-13 (mercredi) → totalDays 10 → totalWeeks 2 → max 12
 *
 *   2026-05-04  col1 row1  PADDING
 *   2026-05-05  col1 row2  PADDING
 *   2026-05-06  col1 row3  level1 val3
 *   2026-05-07  col1 row4  level2 val6
 *   2026-05-08  col1 row5  level3 val9
 *   2026-05-09  col1 row6  level0 val0
 *   2026-05-10  col1 row7  level0 val0
 *   2026-05-11  col2 row1  level1 val1
 *   2026-05-12  col2 row2  level0 val0
 *   2026-05-13  col2 row3  level4 val12   ← dernière cellule valide (tabindex=0 initial)
 */
const DATA: HeatmapCell[] = [
  { date: "2026-05-06", value: 3 },
  { date: "2026-05-07", value: 6 },
  { date: "2026-05-08", value: 9 },
  { date: "2026-05-11", value: 1 },
  { date: "2026-05-13", value: 12 },
];

const getGrid = () =>
  document.querySelector(".heatmap-grid") as HTMLDivElement;
const cellByDate = (date: string) =>
  getGrid().querySelector(`.heatmap-cell[data-date="${date}"]`) as HTMLElement;
const activeCell = () =>
  getGrid().querySelector('.heatmap-cell[tabindex="0"]') as HTMLElement;

afterEach(cleanup);

describe("HeatmapCalendar — structure", () => {
  it("rend le markup canonique .heatmap-cal-scroll/-inner/-body/-day-labels/-grid/-legend", () => {
    render(<HeatmapCalendar cells={DATA} />);

    expect(document.querySelector(".heatmap-cal")).toBeInTheDocument();
    expect(document.querySelector(".heatmap-cal-scroll")).toBeInTheDocument();
    expect(document.querySelector(".heatmap-cal-inner")).toBeInTheDocument();
    expect(document.querySelector(".heatmap-body")).toBeInTheDocument();
    expect(document.querySelector(".heatmap-day-labels")).toBeInTheDocument();
    expect(document.querySelectorAll(".heatmap-day-label")).toHaveLength(7);
    expect(document.querySelector(".heatmap-grid")).toBeInTheDocument();
    expect(document.querySelector(".heatmap-legend")).toBeInTheDocument();
  });

  it("la grille contient 10 cellules (2 padding + 8 valides) et la légende 5", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    expect(grid.querySelectorAll(".heatmap-cell")).toHaveLength(10);
    expect(grid.querySelectorAll('.heatmap-cell[role="img"]')).toHaveLength(8);
    expect(
      grid.querySelectorAll('.heatmap-cell[aria-hidden="true"]'),
    ).toHaveLength(2);
    expect(
      document.querySelectorAll(".heatmap-legend-cells .heatmap-cell"),
    ).toHaveLength(5);
  });

  it("n'affiche que 1 libellé de jour sur 2 (index impairs Mar/Jeu/Sam)", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const labels = document.querySelectorAll(".heatmap-day-label");
    expect(labels[0].textContent).toBe("");
    expect(labels[1].textContent).toBe("Mar");
    expect(labels[3].textContent).toBe("Jeu");
    expect(labels[5].textContent).toBe("Sam");
  });

  it("cells vide → .heatmap-cal présent mais aucune grille ni tooltip (parité vanilla early-return)", () => {
    render(<HeatmapCalendar cells={[]} />);
    expect(document.querySelector(".heatmap-cal")).toBeInTheDocument();
    expect(document.querySelector(".heatmap-grid")).not.toBeInTheDocument();
    expect(document.querySelector(".heatmap-tooltip")).not.toBeInTheDocument();
  });

  it("applique className sur .heatmap-cal", () => {
    render(<HeatmapCalendar cells={DATA} className="my-hm" />);
    expect(document.querySelector(".heatmap-cal")).toHaveClass("my-hm");
  });
});

describe("HeatmapCalendar — styles inline load-bearing (absents du CSS)", () => {
  it(".heatmap-grid pose grid-template-columns: repeat(totalWeeks, 12px) inline", () => {
    render(<HeatmapCalendar cells={DATA} />);
    // totalWeeks = 2
    expect(getGrid().style.gridTemplateColumns).toBe("repeat(2, 12px)");
  });

  it("chaque cellule pose grid-column (semaine) + grid-row (jour) inline", () => {
    render(<HeatmapCalendar cells={DATA} />);

    // 2026-05-06 : semaine 1, mercredi → row 3
    expect(cellByDate("2026-05-06").style.gridColumn).toBe("1");
    expect(cellByDate("2026-05-06").style.gridRow).toBe("3");

    // 2026-05-11 : semaine 2, lundi → row 1
    expect(cellByDate("2026-05-11").style.gridColumn).toBe("2");
    expect(cellByDate("2026-05-11").style.gridRow).toBe("1");

    // 2026-05-13 : semaine 2, mercredi → row 3
    expect(cellByDate("2026-05-13").style.gridColumn).toBe("2");
    expect(cellByDate("2026-05-13").style.gridRow).toBe("3");
  });

  it("les cellules de remplissage (hors plage) posent visibility:hidden + aria-hidden + tabindex=-1", () => {
    render(<HeatmapCalendar cells={DATA} />);

    const padding = getGrid().querySelectorAll<HTMLElement>(
      '.heatmap-cell[aria-hidden="true"]',
    );
    expect(padding).toHaveLength(2);
    padding.forEach((cell) => {
      expect(cell.style.visibility).toBe("hidden");
      expect(cell).toHaveAttribute("tabindex", "-1");
      expect(cell).not.toHaveAttribute("data-level");
    });

    // Placement conservé sur le padding (2026-05-04 = col1 row1)
    const pad0 = cellByDate("2026-05-04");
    expect(pad0.style.gridColumn).toBe("1");
    expect(pad0.style.gridRow).toBe("1");
  });
});

describe("HeatmapCalendar — data-level (binning quartiles du max)", () => {
  it("pose data-level 0..4 dérivé de value/max sur chaque cellule valide", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const level = (d: string) => cellByDate(d).getAttribute("data-level");

    expect(level("2026-05-06")).toBe("1"); // 3/12 = 0.25
    expect(level("2026-05-07")).toBe("2"); // 6/12 = 0.5
    expect(level("2026-05-08")).toBe("3"); // 9/12 = 0.75
    expect(level("2026-05-09")).toBe("0"); // 0
    expect(level("2026-05-11")).toBe("1"); // 1/12 ≈ 0.083
    expect(level("2026-05-13")).toBe("4"); // 12/12 = 1
  });

  it("pose data-value (String) sur chaque cellule valide", () => {
    render(<HeatmapCalendar cells={DATA} />);
    expect(cellByDate("2026-05-08")).toHaveAttribute("data-value", "9");
    expect(cellByDate("2026-05-09")).toHaveAttribute("data-value", "0");
  });

  it("dates dupliquées : la dernière valeur écrase (comme valueByDate du vanilla)", () => {
    render(
      <HeatmapCalendar
        cells={[
          { date: "2026-05-06", value: 1 },
          { date: "2026-05-06", value: 9 },
          { date: "2026-05-07", value: 9 },
        ]}
      />,
    );
    // 05-06 retient 9 → 9/9 = 1 → level 4
    expect(cellByDate("2026-05-06")).toHaveAttribute("data-value", "9");
    expect(cellByDate("2026-05-06")).toHaveAttribute("data-level", "4");
  });
});

describe("HeatmapCalendar — tooltip : classe d'état .visible (piège invisible-class)", () => {
  it("mouseenter ajoute .heatmap-tooltip.visible + pose left/top inline ; mouseleave la retire", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const cell = cellByDate("2026-05-06");
    const tooltip = document.querySelector(".heatmap-tooltip") as HTMLElement;

    // Base : présent mais NON visible (CSS display:none tant que .visible absente)
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).not.toHaveClass("visible");

    fireEvent.mouseEnter(cell, { clientX: 100, clientY: 100 });

    expect(tooltip).toHaveClass("visible");
    expect(tooltip.querySelector(".heatmap-tooltip-title")?.textContent).toBe(
      "6 Mai 2026",
    );
    expect(tooltip.querySelector(".heatmap-tooltip-value")?.textContent).toBe(
      "3",
    );
    // Position:fixed positionnée dynamiquement (inline, absente du CSS)
    expect(tooltip.style.left).toMatch(/^\d+px$/);
    expect(tooltip.style.top).toMatch(/^\d+px$/);

    fireEvent.mouseLeave(cell);
    expect(tooltip).not.toHaveClass("visible");
  });

  it("mousemove repositionne le tooltip (left/top mis à jour)", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const cell = cellByDate("2026-05-06");
    const tooltip = document.querySelector(".heatmap-tooltip") as HTMLElement;

    fireEvent.mouseEnter(cell, { clientX: 40, clientY: 40 });
    fireEvent.mouseMove(cell, { clientX: 200, clientY: 200 });

    expect(tooltip).toHaveClass("visible");
    // clientX 200 + 14 = 214px
    expect(tooltip.style.left).toBe("214px");
  });

  it("focus ouvre le tooltip + appelle onCellFocus ; blur le referme", () => {
    const onCellFocus = vi.fn();
    render(<HeatmapCalendar cells={DATA} onCellFocus={onCellFocus} />);
    const cell = cellByDate("2026-05-08");
    const tooltip = document.querySelector(".heatmap-tooltip") as HTMLElement;

    fireEvent.focus(cell);

    expect(tooltip).toHaveClass("visible");
    expect(onCellFocus).toHaveBeenCalledWith({ date: "2026-05-08", value: 9 });

    fireEvent.blur(cell);
    expect(tooltip).not.toHaveClass("visible");
  });

  it("le tooltip est porté dans document.body (portal), hors de .heatmap-cal", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const cal = document.querySelector(".heatmap-cal") as HTMLElement;

    expect(cal.querySelector(".heatmap-tooltip")).toBeNull();
    expect(document.body.querySelector(".heatmap-tooltip")).toBeInTheDocument();
  });
});

describe("HeatmapCalendar — roving tabindex + navigation clavier", () => {
  it("une seule cellule porte tabindex=0 au montage = la dernière date valide", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    expect(grid.querySelectorAll('.heatmap-cell[tabindex="0"]')).toHaveLength(1);
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-13");
  });

  it("ArrowLeft déplace le tabindex=0 d'un jour en arrière et focus la cellule", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    fireEvent.keyDown(grid, { key: "ArrowLeft" });

    const active = activeCell();
    expect(active).toHaveAttribute("data-date", "2026-05-12");
    expect(grid.querySelectorAll('.heatmap-cell[tabindex="0"]')).toHaveLength(1);
    expect(document.activeElement).toBe(active);
    // Ancienne cellule repassée à -1
    expect(cellByDate("2026-05-13")).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowUp se comporte comme ArrowLeft (−1 jour, navigation LINÉAIRE par date, pas 2D)", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    fireEvent.keyDown(grid, { key: "ArrowUp" });
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-12");
  });

  it("ArrowRight/ArrowDown avancent d'un jour", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    fireEvent.keyDown(grid, { key: "Home" }); // → 2026-05-06
    fireEvent.keyDown(grid, { key: "ArrowRight" }); // → 2026-05-07
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-07");

    fireEvent.keyDown(grid, { key: "ArrowDown" }); // → 2026-05-08
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-08");
  });

  it("Home va à la première date valide, End à la dernière", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    fireEvent.keyDown(grid, { key: "Home" });
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-06");

    fireEvent.keyDown(grid, { key: "End" });
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-13");
  });

  it("ne franchit pas les bornes : ArrowLeft sur la première date valide ne bouge pas", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    fireEvent.keyDown(grid, { key: "Home" }); // 2026-05-06 (padding avant = 05-05 hors plage)
    fireEvent.keyDown(grid, { key: "ArrowLeft" }); // 05-05 non valide → no-op
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-06");
  });

  it("ArrowRight sur la dernière date valide ne bouge pas (hors plage)", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    fireEvent.keyDown(grid, { key: "ArrowRight" }); // depuis 05-13 → 05-14 hors plage
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-13");
  });

  it("une touche non gérée ne modifie pas la cellule active", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const grid = getGrid();

    fireEvent.keyDown(grid, { key: "a" });
    expect(activeCell()).toHaveAttribute("data-date", "2026-05-13");
  });
});

describe("HeatmapCalendar — accessibilité & i18n", () => {
  it("la grille porte role=group + aria-label (défaut FR, surchargé par ariaLabel)", () => {
    render(<HeatmapCalendar cells={DATA} />);
    expect(getGrid()).toHaveAttribute("role", "group");
    expect(getGrid()).toHaveAttribute("aria-label", "Calendrier heatmap");

    cleanup();
    render(<HeatmapCalendar cells={DATA} ariaLabel="Activité 2026" />);
    expect(getGrid()).toHaveAttribute("aria-label", "Activité 2026");
  });

  it("chaque cellule valide porte role=img + aria-label '<date> : <value>'", () => {
    render(<HeatmapCalendar cells={DATA} />);
    const cell = cellByDate("2026-05-06");
    expect(cell).toHaveAttribute("role", "img");
    expect(cell).toHaveAttribute("aria-label", "6 Mai 2026 : 3");
  });

  it("formatCellLabel personnalise l'aria-label des cellules", () => {
    render(
      <HeatmapCalendar
        cells={DATA}
        formatCellLabel={(cell) => `${cell.date}=${cell.value}`}
      />,
    );
    expect(cellByDate("2026-05-06")).toHaveAttribute(
      "aria-label",
      "2026-05-06=3",
    );
  });

  it("les cellules de légende sont aria-hidden", () => {
    render(<HeatmapCalendar cells={DATA} />);
    document
      .querySelectorAll(".heatmap-legend-cells .heatmap-cell")
      .forEach((c) => expect(c).toHaveAttribute("aria-hidden", "true"));
  });

  it("légende : libellés Moins/Plus par défaut, surchargeables", () => {
    render(<HeatmapCalendar cells={DATA} legendLess="Low" legendMore="High" />);
    const legend = document.querySelector(".heatmap-legend") as HTMLElement;
    expect(legend.textContent).toContain("Low");
    expect(legend.textContent).toContain("High");
  });

  it("dayLabels personnalise les libellés de jour", () => {
    render(
      <HeatmapCalendar
        cells={DATA}
        dayLabels={["L", "Ma", "Me", "J", "V", "S", "D"]}
      />,
    );
    const labels = document.querySelectorAll(".heatmap-day-label");
    expect(labels[1].textContent).toBe("Ma");
    expect(labels[3].textContent).toBe("J");
  });
});
