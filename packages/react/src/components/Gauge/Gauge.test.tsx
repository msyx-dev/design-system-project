import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Gauge } from "./Gauge";

const ARC_LENGTH = Math.PI * 40;

/** Offset attendu pour un pourcentage donné (calque `initGauges`). */
function expectedOffset(pct: number): number {
  return ARC_LENGTH * (1 - pct / 100);
}

function getFill(): SVGPathElement {
  return document.querySelector(".gauge-fill") as unknown as SVGPathElement;
}

afterEach(() => {
  cleanup();
});

describe("Gauge — structure & markup canonique", () => {
  it("rend .gauge (role=img + aria-label), svg[viewBox] aria-hidden, .gauge-track, .gauge-fill, .gauge-value", () => {
    render(<Gauge value={72} ariaLabel="Performance — 72%" />);

    const gauge = document.querySelector(".gauge");
    expect(gauge).toBeInTheDocument();
    expect(gauge).toHaveAttribute("role", "img");
    expect(gauge).toHaveAttribute("aria-label", "Performance — 72%");

    const svg = gauge?.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 100 60");
    expect(svg).toHaveAttribute("aria-hidden", "true");

    const track = document.querySelector(".gauge-track");
    expect(track).toBeInTheDocument();
    expect(track).toHaveAttribute("d", "M 10 55 A 40 40 0 0 1 90 55");

    const fill = getFill();
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveAttribute("d", "M 10 55 A 40 40 0 0 1 90 55");

    expect(document.querySelector(".gauge-value")).toBeInTheDocument();
  });

  it("le <title> SVG vaut ariaLabel par défaut, et title override sinon", () => {
    const { rerender } = render(
      <Gauge value={72} ariaLabel="Performance — 72%" />,
    );
    expect(document.querySelector("svg title")?.textContent).toBe(
      "Performance — 72%",
    );

    rerender(<Gauge value={72} ariaLabel="A11y name" title="Tooltip perso" />);
    expect(document.querySelector("svg title")?.textContent).toBe(
      "Tooltip perso",
    );
  });

  it("passe className additionnelle sur .gauge sans écraser .gauge", () => {
    render(<Gauge value={50} ariaLabel="x" className="extra-class" />);
    const gauge = document.querySelector(".gauge");
    expect(gauge).toHaveClass("gauge");
    expect(gauge).toHaveClass("extra-class");
  });
});

describe("Gauge — piège .progress-fill : styles inline calculés sur .gauge-fill", () => {
  it("pose strokeDasharray = ARC_LENGTH (absent du CSS)", () => {
    render(<Gauge value={72} ariaLabel="x" />);
    expect(parseFloat(getFill().style.strokeDasharray)).toBeCloseTo(
      ARC_LENGTH,
      3,
    );
  });

  it("pose strokeDashoffset = ARC_LENGTH * (1 - pct/100) — la proportion réelle", () => {
    render(<Gauge value={72} max={100} ariaLabel="x" />);
    expect(parseFloat(getFill().style.strokeDashoffset)).toBeCloseTo(
      expectedOffset(72),
      2,
    );
  });

  it("respecte max : value/max pilote l'offset (36/60 → 60%)", () => {
    render(<Gauge value={36} max={60} ariaLabel="x" />);
    expect(parseFloat(getFill().style.strokeDashoffset)).toBeCloseTo(
      expectedOffset(60),
      2,
    );
  });

  it("clamp au-dessus de max → 100% (offset 0)", () => {
    render(<Gauge value={200} max={100} ariaLabel="x" />);
    expect(parseFloat(getFill().style.strokeDashoffset)).toBeCloseTo(0, 5);
  });

  it("clamp en dessous de 0 → 0% (offset = ARC_LENGTH)", () => {
    render(<Gauge value={-10} max={100} ariaLabel="x" />);
    expect(parseFloat(getFill().style.strokeDashoffset)).toBeCloseTo(
      ARC_LENGTH,
      3,
    );
  });

  it("max <= 0 ne produit ni NaN ni Infinity (offset fini = ARC_LENGTH)", () => {
    render(<Gauge value={50} max={0} ariaLabel="x" />);
    const off = parseFloat(getFill().style.strokeDashoffset);
    expect(Number.isFinite(off)).toBe(true);
    expect(off).toBeCloseTo(ARC_LENGTH, 3);
  });
});

describe("Gauge — seuils colorés : stroke inline (override var(--accent))", () => {
  it("sans thresholds : aucun stroke inline (défaut CSS var(--accent))", () => {
    render(<Gauge value={72} ariaLabel="x" />);
    expect(getFill().style.stroke).toBe("");
  });

  it("pct <= low → var(--danger)", () => {
    render(<Gauge value={28} thresholds={[30, 70]} ariaLabel="x" />);
    expect(getFill().style.stroke).toBe("var(--danger)");
  });

  it("low < pct <= high → var(--warning)", () => {
    render(<Gauge value={45} thresholds={[30, 70]} ariaLabel="x" />);
    expect(getFill().style.stroke).toBe("var(--warning)");
  });

  it("pct > high → var(--success)", () => {
    render(<Gauge value={92} thresholds={[30, 70]} ariaLabel="x" />);
    expect(getFill().style.stroke).toBe("var(--success)");
  });

  it("pct exactement = low → danger (borne <=)", () => {
    render(<Gauge value={30} thresholds={[30, 70]} ariaLabel="x" />);
    expect(getFill().style.stroke).toBe("var(--danger)");
  });

  it("pct exactement = high → warning (borne <=)", () => {
    render(<Gauge value={70} thresholds={[30, 70]} ariaLabel="x" />);
    expect(getFill().style.stroke).toBe("var(--warning)");
  });
});

describe("Gauge — texte central .gauge-value", () => {
  it("dérive `${Math.round(pct)}%` par défaut", () => {
    render(<Gauge value={72} max={100} ariaLabel="x" />);
    expect(document.querySelector(".gauge-value")?.textContent).toBe("72%");
  });

  it("arrondit le pourcentage (2/3 → 67%)", () => {
    render(<Gauge value={2} max={3} ariaLabel="x" />);
    expect(document.querySelector(".gauge-value")?.textContent).toBe("67%");
  });

  it("valueText override remplace le pourcentage dérivé", () => {
    render(<Gauge value={2} max={3} valueText="2/3" ariaLabel="x" />);
    expect(document.querySelector(".gauge-value")?.textContent).toBe("2/3");
  });
});

describe("Gauge — variante mini & label", () => {
  it("mini pose .gauge--mini", () => {
    render(<Gauge value={92} mini ariaLabel="x" />);
    expect(document.querySelector(".gauge")).toHaveClass("gauge--mini");
  });

  it("sans mini, pas de .gauge--mini", () => {
    render(<Gauge value={92} ariaLabel="x" />);
    expect(document.querySelector(".gauge")).not.toHaveClass("gauge--mini");
  });

  it("rend .gauge-label quand label fourni", () => {
    render(<Gauge value={72} label="Performance" ariaLabel="x" />);
    const lbl = document.querySelector(".gauge-label");
    expect(lbl).toBeInTheDocument();
    expect(lbl?.textContent).toBe("Performance");
  });

  it("n'ajoute pas .gauge-label sans label", () => {
    render(<Gauge value={72} ariaLabel="x" />);
    expect(document.querySelector(".gauge-label")).not.toBeInTheDocument();
  });
});

describe("Gauge — animation au montage (offset caché → cible)", () => {
  it("animate par défaut : après montage, l'offset a convergé vers la cible", () => {
    // render() flush les effets passifs (act) → l'offset final est observable.
    render(<Gauge value={72} ariaLabel="x" />);
    expect(parseFloat(getFill().style.strokeDashoffset)).toBeCloseTo(
      expectedOffset(72),
      2,
    );
  });

  it("animate={false} : offset posé directement à la cible", () => {
    render(<Gauge value={45} animate={false} ariaLabel="x" />);
    expect(parseFloat(getFill().style.strokeDashoffset)).toBeCloseTo(
      expectedOffset(45),
      2,
    );
  });
});
