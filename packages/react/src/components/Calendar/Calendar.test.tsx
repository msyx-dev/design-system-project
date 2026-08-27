import { useState } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, fireEvent } from "@testing-library/react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  Calendar,
  CalendarDateRange,
  CalendarReferenceMonth,
} from "./Calendar";

// Horloge figée — "aujourd'hui" = dimanche 8 mars 2026 (2026-03-08).
// Toute assertion `.today`/`aria-current` dépend de cette date fixe.
const TODAY = new Date(2026, 2, 8);
const MARCH_2026: CalendarReferenceMonth = { year: 2026, month: 2 };

function cell(container: HTMLElement, date: string): HTMLElement | null {
  return container.querySelector(`[data-date="${date}"]`);
}

function ControlledCalendarRange(props: {
  referenceMonth?: CalendarReferenceMonth;
  onChange?: (range: { start: Date; end: Date | null }) => void;
  initialValue?: CalendarDateRange;
}) {
  const { referenceMonth, initialValue, onChange } = props;
  const [value, setValue] = useState<CalendarDateRange>(
    initialValue ?? { start: null, end: null },
  );
  return (
    <Calendar
      mode="range"
      referenceMonth={referenceMonth}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function ControlledCalendarSingle(props: {
  referenceMonth?: CalendarReferenceMonth;
  onChange?: (date: Date) => void;
  initialValue?: Date | null;
}) {
  const { referenceMonth, initialValue = null, onChange } = props;
  const [value, setValue] = useState<Date | null>(initialValue);
  return (
    <Calendar
      mode="single"
      referenceMonth={referenceMonth}
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
  it("2 clics valides posent .range-start+.selected / .range-end+.selected simultanément, .range sur l'entre-deux, onChange appelé à chaque clic", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar mode="range" referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-10") as HTMLElement);
    // 1er clic : pas encore de plage complète, MAIS onChange fire quand même
    // — le vanilla `render()` sa grille (retour visuel) à chaque clic, pas
    // seulement au dispatch du CustomEvent (correction post-review #760).
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenNthCalledWith(1, {
      start: expect.any(Date),
      end: null,
    });
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

    expect(onChange).toHaveBeenCalledTimes(2);
    const [{ start, end }] = onChange.mock.calls[1];
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

    expect(onChange).toHaveBeenCalledTimes(2);
    const [{ start, end }] = onChange.mock.calls[1];
    expect((start as Date).getDate()).toBe(12);
    expect((end as Date).getDate()).toBe(12);
  });
});

describe("Calendar — machine range 2-clics : les 3 cas de reset", () => {
  it("cas 1 — clic AVANT start : reset, la nouvelle date devient start, onChange rappelé avec {start, end: null}", () => {
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

    expect(onChange).toHaveBeenCalledTimes(2);
    const [{ start, end }] = onChange.mock.calls[1];
    expect((start as Date).getDate()).toBe(10);
    expect(end).toBeNull();
  });

  it("cas 2 — 3e clic après une plage déjà complète : reset, nouveau start, ancienne plage effacée, onChange rappelé avec {start, end: null}", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Calendar mode="range" referenceMonth={MARCH_2026} onChange={onChange} />,
    );

    fireEvent.click(cell(container, "2026-03-10") as HTMLElement); // start
    fireEvent.click(cell(container, "2026-03-20") as HTMLElement); // end, complet
    expect(onChange).toHaveBeenCalledTimes(2);

    fireEvent.click(cell(container, "2026-03-25") as HTMLElement); // 3e clic → reset

    expect(cell(container, "2026-03-25")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-10")).not.toHaveClass("range-start");
    expect(cell(container, "2026-03-10")).not.toHaveClass("selected");
    expect(cell(container, "2026-03-20")).not.toHaveClass("range-end");
    expect(cell(container, "2026-03-20")).not.toHaveClass("selected");

    expect(onChange).toHaveBeenCalledTimes(3);
    const [{ start, end }] = onChange.mock.calls[2];
    expect((start as Date).getDate()).toBe(25);
    expect(end).toBeNull();
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
    expect(onChange).toHaveBeenCalledTimes(2);
    const [{ start, end }] = onChange.mock.calls[1];
    expect((start as Date).getDate()).toBe(5);
    expect((end as Date).getDate()).toBe(18);
  });

  it("mode contrôlé range : le clic de démarrage seul déclenche onChange({start, end:null}) et se reflète visuellement (.range-start+.selected)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ControlledCalendarRange
        referenceMonth={MARCH_2026}
        onChange={onChange}
      />,
    );
    fireEvent.click(cell(container, "2026-03-10") as HTMLElement);

    expect(onChange).toHaveBeenCalledTimes(1);
    const [{ start, end }] = onChange.mock.calls[0];
    expect((start as Date).getDate()).toBe(10);
    expect(end).toBeNull();

    // `value` mis à jour par le parent (ControlledCalendarRange) → la
    // cellule affiche bien la sélection en cours, PAS uniquement au clic
    // complétant la plage.
    expect(cell(container, "2026-03-10")).toHaveClass(
      "range-start",
      "selected",
    );
  });

  it("mode contrôlé range : les 3 cas de reset répercutent aussi {start, end:null} et se reflètent visuellement", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ControlledCalendarRange
        referenceMonth={MARCH_2026}
        onChange={onChange}
      />,
    );

    // Cas 1 — clic avant start.
    fireEvent.click(cell(container, "2026-03-20") as HTMLElement);
    fireEvent.click(cell(container, "2026-03-10") as HTMLElement);
    expect(cell(container, "2026-03-10")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-20")).not.toHaveClass("range-start");

    // Cas 3 — complète la plage (référence, avant le 3e clic de reset).
    fireEvent.click(cell(container, "2026-03-15") as HTMLElement);
    expect(cell(container, "2026-03-10")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-15")).toHaveClass("range-end", "selected");

    // Cas 2 — 3e clic après plage complète → reset.
    fireEvent.click(cell(container, "2026-03-25") as HTMLElement);
    expect(cell(container, "2026-03-25")).toHaveClass(
      "range-start",
      "selected",
    );
    expect(cell(container, "2026-03-10")).not.toHaveClass("selected");
    expect(cell(container, "2026-03-15")).not.toHaveClass("selected");

    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange.mock.calls[3][0].end).toBeNull();
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

/**
 * #864 — la grille `.cal-grid` (`templates.css`, CSS Grid `repeat(7, 1fr)`)
 * suppose 42 items enfants DIRECTS — calque exact du rendu vanilla, qui pose
 * ses 42 `.cal-day` à plat. Mais le composant React insère un
 * `<div role="row">` par semaine pour l'a11y (l.528-531) : sans
 * `.cal-grid > [role="row"] { display: contents }` dans `templates.css`, ce
 * sont CES lignes qui deviennent les 6 items de la grille — chaque semaine
 * occupe une colonne et ses jours s'y empilent, transposant tout le mois
 * (régression constatée en recette `keepthread` le 27/08/2026 : ce jeudi
 * s'affichait sous `VEN`).
 *
 * jsdom ne calcule aucune mise en page réelle (`getBoundingClientRect` reste
 * à zéro), mais résout correctement les VALEURS de propriété calculées
 * (`getComputedStyle`) depuis une feuille de style chargée en `<style>` — le
 * vrai `templates.css` du repo est injecté ici (jamais dupliqué à la main,
 * pour ne jamais diverger de la source). C'est suffisant pour rejouer
 * MÉCANIQUEMENT la résolution CSS Display Level 3 de `display: contents`
 * (« l'élément est remplacé par ses enfants dans le modèle de boîte, ses
 * enfants deviennent les items du parent grid ») et vérifier quels éléments
 * participeraient réellement à la grille dans un vrai navigateur, sans
 * dépendre d'un moteur de layout complet (Playwright).
 */
function getGridItems(gridEl: Element): Element[] {
  const items: Element[] = [];
  for (const child of Array.from(gridEl.children)) {
    if (getComputedStyle(child).display === "contents") {
      items.push(...getGridItems(child));
    } else {
      items.push(child);
    }
  }
  return items;
}

describe("Calendar — disposition CSS de la grille (#864, régression grille transposée)", () => {
  let styleEl: HTMLStyleElement;

  beforeAll(() => {
    const cssPath = resolve(
      __dirname,
      "../../../../../shared/css/components/templates.css",
    );
    styleEl = document.createElement("style");
    styleEl.textContent = readFileSync(cssPath, "utf-8");
    document.head.appendChild(styleEl);
  });

  afterAll(() => {
    styleEl.remove();
  });

  it('les 6 <div role="row"> passent en display:contents — retirées du flux de la grille, PAS de l\'arbre a11y', () => {
    const { container } = render(
      <Calendar referenceMonth={{ year: 2026, month: 7 }} />,
    ); // août 2026

    const rows = container.querySelectorAll('.cal-grid > [role="row"]');
    expect(rows).toHaveLength(6);
    rows.forEach((row) => {
      expect(getComputedStyle(row).display).toBe("contents");
      // Le rôle reste posé — navigation clavier/lecteur d'écran intacts.
      expect(row).toHaveAttribute("role", "row");
    });
  });

  it("le 27 août 2026 (jeudi) atterrit dans la 4e colonne de la 5e ligne de la grille — pas transposé en colonne", () => {
    const { container } = render(
      <Calendar referenceMonth={{ year: 2026, month: 7 }} />,
    ); // août 2026

    const grid = container.querySelector(".cal-grid") as HTMLElement;
    const items = getGridItems(grid);

    // 42 items DIRECTS attendus (6 semaines × 7 jours) — pas 6 (un par
    // `[role="row"]`), qui serait le symptôme exact de la régression #864 :
    // la grille se placerait alors sur les lignes elles-mêmes.
    expect(items).toHaveLength(42);

    const target = cell(container, "2026-08-27") as HTMLElement;
    const flatIndex = items.indexOf(target);
    expect(flatIndex).toBeGreaterThanOrEqual(0);

    // Colonnes/lignes CSS Grid 0-indexées ici : auto-placement row-major
    // d'une grille `repeat(7, 1fr)` sur les 42 items flattenés ci-dessus.
    const columnIndex = flatIndex % 7; // 0 = lundi … 6 = dimanche
    const rowIndex = Math.floor(flatIndex / 7);

    // Jeudi = 4e jour de la semaine (index 3), 5e ligne du mois (index 4).
    expect(columnIndex).toBe(3);
    expect(rowIndex).toBe(4);
  });
});
