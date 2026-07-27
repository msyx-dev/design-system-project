import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { TimePicker } from "./TimePicker";

afterEach(() => {
  cleanup();
});

function hourInput() {
  return document.querySelector(
    '[data-time-part="hh"] .number-input-field',
  ) as HTMLInputElement;
}
function minuteInput() {
  return document.querySelector(
    '[data-time-part="mm"] .number-input-field',
  ) as HTMLInputElement;
}
function hourButtons() {
  return document.querySelectorAll('[data-time-part="hh"] .number-input-btn');
}
function minuteButtons() {
  return document.querySelectorAll('[data-time-part="mm"] .number-input-btn');
}

describe("TimePicker — structure 24h", () => {
  it("rend .time-input-wrap[data-time][data-format=24] sans groupe AM/PM", () => {
    render(<TimePicker format="24" defaultValue="09:30" />);

    const wrap = document.querySelector(".time-input-wrap") as HTMLElement;
    expect(wrap).toBeInTheDocument();
    expect(wrap).toHaveAttribute("data-time", "");
    expect(wrap).toHaveAttribute("data-format", "24");

    expect(document.querySelector('[data-time-part="hh"]')).toBeInTheDocument();
    expect(document.querySelector('[data-time-part="mm"]')).toBeInTheDocument();
    expect(document.querySelector(".time-sep")).toHaveTextContent(":");

    // Pas de groupe AM/PM en 24h
    expect(document.querySelector(".segmented")).not.toBeInTheDocument();
  });

  it("pose les aria-label exacts du vanilla sur les champs heures/minutes", () => {
    render(<TimePicker format="24" defaultValue="09:30" />);
    expect(screen.getByLabelText("Heures")).toBe(hourInput());
    expect(screen.getByLabelText("Minutes")).toBe(minuteInput());
  });

  it("borne hh à 0-23 et mm à 0-59 en 24h", () => {
    render(<TimePicker format="24" defaultValue="09:30" />);
    expect(hourInput()).toHaveAttribute("min", "0");
    expect(hourInput()).toHaveAttribute("max", "23");
    expect(minuteInput()).toHaveAttribute("min", "0");
    expect(minuteInput()).toHaveAttribute("max", "59");
  });
});

describe("TimePicker — structure 12h", () => {
  it("rend le groupe AM/PM en radiogroup avec les libellés vanilla", () => {
    render(<TimePicker format="12" defaultValue="09:30 AM" />);

    const group = document.querySelector(".segmented") as HTMLElement;
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute("role", "radiogroup");
    expect(group).toHaveAttribute("aria-label", "AM ou PM");

    const items = document.querySelectorAll(".segmented-item");
    expect(items).toHaveLength(2);
    items.forEach((item) => expect(item).toHaveAttribute("role", "radio"));
    expect(items[0]).toHaveTextContent("AM");
    expect(items[1]).toHaveTextContent("PM");
  });

  it("borne hh à 1-12 en 12h (mm reste 0-59)", () => {
    render(<TimePicker format="12" defaultValue="09:30 AM" />);
    expect(hourInput()).toHaveAttribute("min", "1");
    expect(hourInput()).toHaveAttribute("max", "12");
    expect(minuteInput()).toHaveAttribute("min", "0");
    expect(minuteInput()).toHaveAttribute("max", "59");
  });
});

describe("TimePicker — bornes réelles (clamp, PAS de wrap-around, vérifié dans initTimePicker)", () => {
  it("24h : hh=23 + incrément reste à 23 (le bouton inc est désactivé, pas de wrap à 0)", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker format="24" defaultValue="23:00" onChange={handleChange} />,
    );
    const [, inc] = hourButtons();
    expect(inc).toBeDisabled();
    fireEvent.click(inc);
    expect(handleChange).not.toHaveBeenCalled();
    expect(hourInput().value).toBe("23");
  });

  it("24h : hh=0 + décrément reste à 0 (le bouton dec est désactivé, pas de wrap à 23)", () => {
    render(<TimePicker format="24" defaultValue="00:30" />);
    const [dec] = hourButtons();
    expect(dec).toBeDisabled();
  });

  it("12h : hh=12 (max) + incrément reste à 12, hh=1 (min) + décrément reste à 1", () => {
    render(<TimePicker format="12" defaultValue="12:00 AM" />);
    const [, inc] = hourButtons();
    expect(inc).toBeDisabled();

    cleanup();
    render(<TimePicker format="12" defaultValue="01:00 AM" />);
    const [dec] = hourButtons();
    expect(dec).toBeDisabled();
  });

  it("mm=55 (step 5) + incrément clampe à 59, PAS de report sur les heures (calque Math.min(max,...))", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker format="24" defaultValue="10:55" onChange={handleChange} />,
    );
    const [, inc] = minuteButtons();
    fireEvent.click(inc);
    expect(handleChange).toHaveBeenCalledWith("10:59");
    expect(hourInput().value).toBe("10"); // heure inchangée — aucun report
  });

  it("mm=59 (max) : le bouton inc est désactivé", () => {
    render(<TimePicker format="24" defaultValue="10:59" />);
    const [, inc] = minuteButtons();
    expect(inc).toBeDisabled();
  });

  it("mm=0 (min) : le bouton dec est désactivé", () => {
    render(<TimePicker format="24" defaultValue="10:00" />);
    const [dec] = minuteButtons();
    expect(dec).toBeDisabled();
  });
});

describe("TimePicker — incrément/décrément normal + onChange formaté", () => {
  it("incrémente l'heure et remonte la valeur formatée HH:MM (24h)", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker format="24" defaultValue="09:30" onChange={handleChange} />,
    );
    const [, inc] = hourButtons();
    fireEvent.click(inc);
    expect(handleChange).toHaveBeenCalledWith("10:30");
    expect(hourInput().value).toBe("10");
  });

  it("décrémente les minutes selon minuteStep par défaut (5)", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker format="24" defaultValue="09:30" onChange={handleChange} />,
    );
    const [dec] = minuteButtons();
    fireEvent.click(dec);
    expect(handleChange).toHaveBeenCalledWith("09:25");
  });

  it("remonte le suffixe AM/PM dans la valeur formatée (12h)", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker
        format="12"
        defaultValue="09:30 AM"
        onChange={handleChange}
      />,
    );
    const [, inc] = hourButtons();
    fireEvent.click(inc);
    expect(handleChange).toHaveBeenCalledWith("10:30 AM");
  });
});

describe("TimePicker — minuteStep configurable", () => {
  it("pose le step configuré sur le champ minutes et l'applique à l'incrément", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker
        format="24"
        defaultValue="09:00"
        minuteStep={15}
        onChange={handleChange}
      />,
    );
    expect(minuteInput()).toHaveAttribute("step", "15");
    const [, inc] = minuteButtons();
    fireEvent.click(inc);
    expect(handleChange).toHaveBeenCalledWith("09:15");
  });
});

describe("TimePicker — bascule AM/PM (#613 : radiogroup/radio, .active EN PLUS de aria-checked)", () => {
  it("AM actif par défaut : .active + aria-checked=true sur AM, l'inverse sur PM", () => {
    render(<TimePicker format="12" defaultValue="09:30 AM" />);
    const [am, pm] = document.querySelectorAll(".segmented-item");
    expect(am).toHaveClass("active");
    expect(am).toHaveAttribute("aria-checked", "true");
    expect(pm).not.toHaveClass("active");
    expect(pm).toHaveAttribute("aria-checked", "false");
  });

  it("clic sur PM bascule .active + aria-checked ET remonte la valeur formatée", () => {
    const handleChange = vi.fn();
    render(
      <TimePicker
        format="12"
        defaultValue="09:30 AM"
        onChange={handleChange}
      />,
    );
    const [am, pm] = document.querySelectorAll(".segmented-item");
    fireEvent.click(pm);

    expect(pm).toHaveClass("active");
    expect(pm).toHaveAttribute("aria-checked", "true");
    expect(am).not.toHaveClass("active");
    expect(am).toHaveAttribute("aria-checked", "false");
    expect(handleChange).toHaveBeenCalledWith("09:30 PM");
  });

  it("roving tabindex : un seul item à tabindex=0 à la fois, suit la sélection", () => {
    render(<TimePicker format="12" defaultValue="09:30 AM" />);
    const [am, pm] = document.querySelectorAll(".segmented-item");
    expect(am).toHaveAttribute("tabindex", "0");
    expect(pm).toHaveAttribute("tabindex", "-1");

    fireEvent.click(pm);
    expect(pm).toHaveAttribute("tabindex", "0");
    expect(am).toHaveAttribute("tabindex", "-1");
  });
});

describe("TimePicker — mode contrôlé (value/onChange)", () => {
  it("n'auto-modifie pas l'affichage tant que le parent ne répercute pas onChange", () => {
    const handleChange = vi.fn();
    render(<TimePicker format="24" value="09:30" onChange={handleChange} />);
    const [, inc] = hourButtons();
    fireEvent.click(inc);

    expect(handleChange).toHaveBeenCalledWith("10:30");
    // Le parent n'a pas encore répercuté onChange → l'affichage reste sur 9
    // (valeur BRUTE du <input type="number">, pas le format zero-paddé qui
    // n'existe que côté `onChange`).
    expect(hourInput().value).toBe("9");
  });

  it("l'affichage suit `value` quand le parent répercute (rerender)", () => {
    const { rerender } = render(<TimePicker format="24" value="09:30" />);
    rerender(<TimePicker format="24" value="11:45" />);
    expect(hourInput().value).toBe("11");
    expect(minuteInput().value).toBe("45");
  });

  it("ignore defaultValue quand value est fourni", () => {
    render(
      <TimePicker
        format="24"
        value="08:00"
        defaultValue="20:00"
        onChange={() => {}}
      />,
    );
    expect(hourInput().value).toBe("8");
  });
});

describe("TimePicker — valeurs par défaut sans defaultValue/value", () => {
  it("24h : 00:00 par défaut", () => {
    render(<TimePicker format="24" />);
    expect(hourInput().value).toBe("0");
    expect(minuteInput().value).toBe("0");
  });

  it("12h : 01:00 AM par défaut (borne min = 1)", () => {
    render(<TimePicker format="12" />);
    expect(hourInput().value).toBe("1");
    const [am] = document.querySelectorAll(".segmented-item");
    expect(am).toHaveClass("active");
  });
});
