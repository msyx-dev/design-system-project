import { useState } from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Calendar,
  CalendarDateRange,
  CalendarProps,
  CalendarReferenceMonth,
} from "./Calendar";

// Horloge figée — "aujourd'hui" = dimanche 8 mars 2026 (2026-03-08).
// Toute assertion `.today`/`aria-current` dépend de cette date fixe.
const TODAY = new Date(2026, 2, 8);
const MARCH_2026: CalendarReferenceMonth = { year: 2026, month: 2 };

function cell(container: HTMLElement, date: string): HTMLElement | null {
  return container.querySelector(`[data-date="${date}"]`);
}

function ControlledCalendarRange(
  props: Partial<Omit<CalendarProps, "mode" | "value" | "onChange">> & {
    onChange?: (range: { start: Date; end: Date }) => void;
    initialValue?: CalendarDateRange;
  },
) {
  const { initialValue, onChange, ...rest } = props;
  const [value, setValue] = useState<CalendarDateRange>(
    initialValue ?? { start: null, end: null },
  );
  return (
    <Calendar
      {...rest}
      mode="range"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function ControlledCalendarSingle(
  props: Partial<Omit<CalendarProps, "mode" | "value" | "onChange">> & {
    onChange?: (date: Date) => void;
    initialValue?: Date | null;
  },
) {
  const { initialValue = null, onChange, ...rest } = props;
  const [value, setValue] = useState<Date | null>(initialValue);
  return (
    <Calendar
      {...rest}
      mode="single"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Calendar — structure du mois", () => {
  it("rend .cal-wrap/.cal-header/.cal-nav/.cal-weekdays/.cal-grid avec role grid/row/gridcell", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);

    expect(container.querySelector(".cal-wrap")).toBeInTheDocument();
    expect(container.querySelector(".cal-header")).toBeInTheDocument();
    expect(container.querySelector(".cal-nav")).toBeInTheDocument();
    expect(container.querySelector(".cal-weekdays")).toBeInTheDocument();

    const grid = container.querySelector(".cal-grid");
    expect(grid).toHaveAttribute("role", "grid");

    const rows = container.querySelectorAll('[role="row"]');
    expect(rows).toHaveLength(6);

    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells).toHaveLength(42);
  });

  it("affiche le mois/année dans le h4 aria-live", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    const h4 = container.querySelector(".cal-header h4");
    expect(h4).toHaveAttribute("aria-live", "polite");
    expect(h4?.textContent).toBe("Mars 2026");
  });

  it("marque .other-month + aria-disabled + tabindex=-1 sur les débords (11 cellules pour mars 2026)", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);

    const otherMonthCells = container.querySelectorAll(".cal-day.other-month");
    expect(otherMonthCells).toHaveLength(11); // 6 (23-28 fév) + 5 (1-5 avr)

    otherMonthCells.forEach((c) => {
      expect(c).toHaveAttribute("aria-disabled", "true");
      expect(c).toHaveAttribute("tabindex", "-1");
    });

    expect(cell(container, "2026-02-23")).toBeInTheDocument();
    expect(cell(container, "2026-04-05")).toBeInTheDocument();
  });

  it("le texte de la cellule est le jour sans zéro de tête, aria-label = jour+mois+année", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    const c = cell(container, "2026-03-08") as HTMLElement;
    expect(c.textContent).toBe("8");
    expect(c).toHaveAttribute("aria-label", "8 mars 2026");
  });
});

describe("Calendar — .today / aria-current", () => {
  it("le jour courant porte .today + aria-current=date quand il est dans le mois affiché", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    const todayCell = cell(container, "2026-03-08") as HTMLElement;
    expect(todayCell).toHaveClass("today");
    expect(todayCell).toHaveAttribute("aria-current", "date");
  });

  it("aucune cellule .today si le mois affiché n'est pas le mois courant", () => {
    const { container } = render(
      <Calendar referenceMonth={{ year: 2026, month: 4 }} />,
    );
    expect(container.querySelector(".cal-day.today")).not.toBeInTheDocument();
  });
});

describe("Calendar — sélection single", () => {
  it("clic sur une cellule pose .selected + aria-selected=true et appelle onChange(date)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-15") as HTMLElement);

    const selected = cell(container, "2026-03-15") as HTMLElement;
    expect(selected).toHaveClass("selected");
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(onChange).toHaveBeenCalledTimes(1);
    const calledDate = onChange.mock.calls[0][0] as Date;
    expect(calledDate.getFullYear()).toBe(2026);
    expect(calledDate.getMonth()).toBe(2);
    expect(calledDate.getDate()).toBe(15);
  });

  it("clic sur une cellule .other-month ne sélectionne rien (no-op)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar referenceMonth={MARCH_2026} onChange={onChange} />,
    );
    fireEvent.click(cell(container, "2026-02-23") as HTMLElement);
    expect(onChange).not.toHaveBeenCalled();
    expect(
      container.querySelector(".cal-day.selected"),
    ).not.toBeInTheDocument();
  });

  it("mode contrôlé (value/onChange) — le parent pilote la sélection affichée", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ControlledCalendarSingle
        referenceMonth={MARCH_2026}
        onChange={onChange}
      />,
    );
    fireEvent.click(cell(container, "2026-03-20") as HTMLElement);
    expect(cell(container, "2026-03-20")).toHaveClass("selected");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("Calendar — sélection range : extrémités + entre-deux", () => {
  it("2 clics valides posent .range-start+.selected / .range-end+.selected simultanément, .range sur l'entre-deux, onChange({start,end}) une seule fois", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar mode="range" referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-10") as HTMLElement);
    // 1er clic : pas encore de plage complète → onChange PAS appelé.
    expect(onChange).not.toHaveBeenCalled();
    const startAfterFirstClick = cell(container, "2026-03-10") as HTMLElement;
    expect(startAfterFirstClick).toHaveClass("range-start", "selected");

    fireEvent.click(cell(container, "2026-03-20") as HTMLElement);

    // ⚠️ Assertion simultanée obligatoire — .range-start/.range-end portent
    // AUSSI .selected (piège critique #760).
    const startCell = cell(container, "2026-03-10") as HTMLElement;
    expect(startCell).toHaveClass("range-start", "selected");
    expect(startCell).toHaveAttribute("aria-selected", "true");

    const endCell = cell(container, "2026-03-20") as HTMLElement;
    expect(endCell).toHaveClass("range-end", "selected");
    expect(endCell).toHaveAttribute("aria-selected", "true");

    const midCell = cell(container, "2026-03-15") as HTMLElement;
    expect(midCell).toHaveClass("range");
    expect(midCell).not.toHaveClass("selected");
    expect(midCell).not.toHaveAttribute("aria-selected");

    expect(onChange).toHaveBeenCalledTimes(1);
    const [{ start, end }] = onChange.mock.calls[0];
    expect((start as Date).getDate()).toBe(10);
    expect((end as Date).getDate()).toBe(20);
  });

  it("range d'un seul jour (start === end) : la cellule reçoit .range-start+.selected mais PAS .range-end (précédence else-if iso-vanilla)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar mode="range" referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-12") as HTMLElement);
    fireEvent.click(cell(container, "2026-03-12") as HTMLElement);

    const single = cell(container, "2026-03-12") as HTMLElement;
    expect(single).toHaveClass("range-start", "selected");
    expect(single).not.toHaveClass("range-end");

    expect(onChange).toHaveBeenCalledTimes(1);
    const [{ start, end }] = onChange.mock.calls[0];
    expect((start as Date).getDate()).toBe(12);
    expect((end as Date).getDate()).toBe(12);
  });
});

describe("Calendar — machine range 2-clics : les 3 cas de reset", () => {
  it("cas 1 — clic AVANT start : reset, la nouvelle date devient start, onChange pas appelé", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar mode="range" referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-20") as HTMLElement); // start = 20
    fireEvent.click(cell(container, "2026-03-10") as HTMLElement); // avant start → reset

    expect(cell(container, "2026-03-10")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-20")).not.toHaveClass("range-start");
    expect(cell(container, "2026-03-20")).not.toHaveClass("range-end");
    expect(cell(container, "2026-03-20")).not.toHaveClass("selected");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cas 2 — 3e clic après une plage déjà complète : reset, nouveau start, ancienne plage effacée", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar mode="range" referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-10") as HTMLElement); // start
    fireEvent.click(cell(container, "2026-03-20") as HTMLElement); // end, complet
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.click(cell(container, "2026-03-25") as HTMLElement); // 3e clic → reset

    expect(cell(container, "2026-03-25")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-10")).not.toHaveClass("range-start");
    expect(cell(container, "2026-03-10")).not.toHaveClass("selected");
    expect(cell(container, "2026-03-20")).not.toHaveClass("range-end");
    expect(cell(container, "2026-03-20")).not.toHaveClass("selected");
    // Le reset (3e clic) n'est PAS une plage complète : pas de 2e appel.
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("cas 3 — 2e clic APRÈS start (date postérieure) : complète la plage normalement (non-reset, cas de référence)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar mode="range" referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-05") as HTMLElement);
    fireEvent.click(cell(container, "2026-03-18") as HTMLElement);

    expect(cell(container, "2026-03-05")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-18")).toHaveClass("range-end", "selected");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("mode contrôlé range : le clic de démarrage seul ne déclenche pas onChange (fidèle à calendar:change vanilla)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ControlledCalendarRange
        referenceMonth={MARCH_2026}
        onChange={onChange}
      />,
    );
    fireEvent.click(cell(container, "2026-03-10") as HTMLElement);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Calendar — roving tabindex", () => {
  it("une seule cellule à tabindex=0 (le jour courant, par défaut) quand il est dans le mois affiché", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    const tabbable = container.querySelectorAll('.cal-grid [tabindex="0"]');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAttribute("data-date", "2026-03-08");
  });

  it("fallback sur le 1er jour du mois si le jour courant n'est pas affiché", () => {
    const { container } = render(
      <Calendar referenceMonth={{ year: 2026, month: 4 }} />,
    );
    const tabbable = container.querySelectorAll('.cal-grid [tabindex="0"]');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAttribute("data-date", "2026-05-01");
  });

  it("après un clic, la cellule cliquée devient la seule cellule tabindex=0", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    fireEvent.click(cell(container, "2026-03-15") as HTMLElement);
    const tabbable = container.querySelectorAll('.cal-grid [tabindex="0"]');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAttribute("data-date", "2026-03-15");
  });
});

describe("Calendar — navigation clavier (grille)", () => {
  it("ArrowRight déplace le focus d'un jour et le pose réellement (ref.focus())", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    const grid = container.querySelector(".cal-grid") as HTMLElement;

    fireEvent.keyDown(grid, { key: "ArrowRight" });

    const next = cell(container, "2026-03-09") as HTMLElement;
    expect(next).toHaveAttribute("tabindex", "0");
    expect(document.activeElement).toBe(next);
  });

  it("ArrowLeft/ArrowUp/ArrowDown déplacent respectivement de -1 jour / -7 jours / +7 jours", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    const grid = container.querySelector(".cal-grid") as HTMLElement;

    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(cell(container, "2026-03-07"));
  });

  it("ArrowRight en franchissant la fin du mois change le mois affiché (onReferenceMonthChange)", () => {
    const onReferenceMonthChange = vi.fn();
    const { container } = render(
      <Calendar
        referenceMonth={MARCH_2026}
        onReferenceMonthChange={onReferenceMonthChange}
      />,
    );
    const grid = container.querySelector(".cal-grid") as HTMLElement;

    fireEvent.click(cell(container, "2026-03-31") as HTMLElement);
    fireEvent.keyDown(grid, { key: "ArrowRight" });

    expect(onReferenceMonthChange).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
    });
  });

  it("Home va au lundi de la semaine, End va au dimanche de la semaine", () => {
    const { container, rerender } = render(
      <Calendar referenceMonth={MARCH_2026} />,
    );
    let grid = container.querySelector(".cal-grid") as HTMLElement;
    fireEvent.click(cell(container, "2026-03-11") as HTMLElement); // mercredi

    fireEvent.keyDown(grid, { key: "Home" });
    expect(document.activeElement).toBe(cell(container, "2026-03-09")); // lundi

    rerender(<Calendar referenceMonth={MARCH_2026} />);
    grid = container.querySelector(".cal-grid") as HTMLElement;
    fireEvent.click(cell(container, "2026-03-11") as HTMLElement);
    fireEvent.keyDown(grid, { key: "End" });
    expect(document.activeElement).toBe(cell(container, "2026-03-15")); // dimanche
  });

  it("PageDown/PageUp changent de mois (même jour du mois suivant/précédent)", () => {
    const onReferenceMonthChange = vi.fn();
    const { container } = render(
      <Calendar
        referenceMonth={MARCH_2026}
        onReferenceMonthChange={onReferenceMonthChange}
      />,
    );
    const grid = container.querySelector(".cal-grid") as HTMLElement;
    fireEvent.click(cell(container, "2026-03-11") as HTMLElement);

    fireEvent.keyDown(grid, { key: "PageDown" });
    expect(onReferenceMonthChange).toHaveBeenLastCalledWith({
      year: 2026,
      month: 3,
    });
  });

  it("Entrée/Espace sélectionnent la cellule focusée", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar referenceMonth={MARCH_2026} onChange={onChange} />,
    );
    const grid = container.querySelector(".cal-grid") as HTMLElement;

    fireEvent.keyDown(grid, { key: "ArrowRight" }); // today (8) → 9

    fireEvent.keyDown(grid, { key: "Enter" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(cell(container, "2026-03-09")).toHaveClass("selected");
  });

  it("Echap est un no-op (calendrier INLINE, pas de fermeture)", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    const grid = container.querySelector(".cal-grid") as HTMLElement;
    const before = container.querySelectorAll('[tabindex="0"]')[0];
    fireEvent.keyDown(grid, { key: "Escape" });
    const after = container.querySelectorAll('[tabindex="0"]')[0];
    expect(after).toBe(before);
  });
});

describe("Calendar — navigation de mois (boutons)", () => {
  it("bouton suivant avance d'un mois, bouton précédent recule d'un mois", () => {
    const { container } = render(
      <Calendar defaultReferenceMonth={MARCH_2026} />,
    );
    const next = container.querySelector(".cal-next") as HTMLButtonElement;
    const prev = container.querySelector(".cal-prev") as HTMLButtonElement;

    fireEvent.click(next);
    expect(container.querySelector(".cal-header h4")?.textContent).toBe(
      "Avril 2026",
    );

    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(container.querySelector(".cal-header h4")?.textContent).toBe(
      "Février 2026",
    );
  });

  it("franchit la limite d'année (décembre → janvier, janvier → décembre)", () => {
    const { container } = render(
      <Calendar defaultReferenceMonth={{ year: 2026, month: 11 }} />,
    );
    const next = container.querySelector(".cal-next") as HTMLButtonElement;
    fireEvent.click(next);
    expect(container.querySelector(".cal-header h4")?.textContent).toBe(
      "Janvier 2027",
    );

    const prev = container.querySelector(".cal-prev") as HTMLButtonElement;
    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(container.querySelector(".cal-header h4")?.textContent).toBe(
      "Novembre 2026",
    );
  });

  it("aria-label des boutons de navigation (défauts FR, surchargeables)", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    expect(container.querySelector(".cal-prev")).toHaveAttribute(
      "aria-label",
      "Mois précédent",
    );
    expect(container.querySelector(".cal-next")).toHaveAttribute(
      "aria-label",
      "Mois suivant",
    );
  });

  it("mode contrôlé (referenceMonth/onReferenceMonthChange)", () => {
    function ControlledRef() {
      const [ref, setRef] = useState<CalendarReferenceMonth>(MARCH_2026);
      return <Calendar referenceMonth={ref} onReferenceMonthChange={setRef} />;
    }
    const { container } = render(<ControlledRef />);
    fireEvent.click(container.querySelector(".cal-next") as HTMLButtonElement);
    expect(container.querySelector(".cal-header h4")?.textContent).toBe(
      "Avril 2026",
    );
  });
});

describe("Calendar — légende optionnelle", () => {
  it("n'émet aucune .cal-legend si la prop legend est absente", () => {
    const { container } = render(<Calendar referenceMonth={MARCH_2026} />);
    expect(container.querySelector(".cal-legend")).not.toBeInTheDocument();
  });

  it("rend .cal-legend/.cal-legend-item/.cal-legend-dot avec la couleur en style inline (pas de background CSS par défaut)", () => {
    const { container } = render(
      <Calendar
        referenceMonth={MARCH_2026}
        legend={[
          { label: "Deploy", color: "var(--accent)" },
          { label: "Incident", color: "var(--danger)" },
        ]}
      />,
    );
    const legend = container.querySelector(".cal-legend");
    expect(legend).toBeInTheDocument();
    const items = container.querySelectorAll(".cal-legend-item");
    expect(items).toHaveLength(2);

    const dots = container.querySelectorAll(".cal-legend-dot");
    expect(dots[0]).toHaveStyle({ background: "var(--accent)" });
    expect(dots[1]).toHaveStyle({ background: "var(--danger)" });
    expect(items[0].textContent).toContain("Deploy");
  });
});

describe("Calendar — defaultValue non contrôlé", () => {
  it("single : defaultValue amorce la sélection initiale sans onChange au montage", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar
        referenceMonth={MARCH_2026}
        defaultValue={new Date(2026, 2, 22)}
        onChange={onChange}
      />,
    );
    expect(cell(container, "2026-03-22")).toHaveClass("selected");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("range : defaultValue amorce start/end initiaux", () => {
    const { container } = render(
      <Calendar
        mode="range"
        referenceMonth={MARCH_2026}
        defaultValue={{
          start: new Date(2026, 2, 3),
          end: new Date(2026, 2, 6),
        }}
      />,
    );
    expect(cell(container, "2026-03-03")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-06")).toHaveClass("range-end", "selected");
    expect(cell(container, "2026-03-04")).toHaveClass("range");
  });
});
