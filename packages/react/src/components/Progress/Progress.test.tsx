import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { Progress, ProgressRing } from "./Progress";

afterEach(() => {
  cleanup();
});

describe("Progress (linéaire) — structure & a11y", () => {
  it("rend .progress-bar > .progress-fill", () => {
    render(<Progress value={50} />);
    const bar = document.querySelector(".progress-bar");
    expect(bar).toBeInTheDocument();
    const fill = bar?.querySelector(".progress-fill");
    expect(fill).toBeInTheDocument();
  });

  it("pose role=progressbar + aria-valuenow/valuemin/valuemax TOUJOURS", () => {
    render(<Progress value={92} max={100} />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    expect(bar).toHaveAttribute("role", "progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "92");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("respecte un max custom pour aria-valuemax", () => {
    render(<Progress value={3} max={4} />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
  });

  it("label est posé en aria-label sur la barre", () => {
    render(<Progress value={50} label="Build" />);
    expect(document.querySelector(".progress-bar")).toHaveAttribute(
      "aria-label",
      "Build",
    );
  });
});

describe("Progress (linéaire) — styles inline requis", () => {
  it("pose width:N% inline sur .progress-fill (value/max)", () => {
    render(<Progress value={3} max={4} />);
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("75%");
  });

  it("pose un background inline non vide (défaut DS var(--gradient-1))", () => {
    render(<Progress value={50} />);
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.background).toBeTruthy();
    expect(fill.style.background).toBe("var(--gradient-1)");
  });

  it("respecte un fill personnalisé", () => {
    render(<Progress value={50} fill="var(--gradient-2)" />);
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.background).toBe("var(--gradient-2)");
  });

  it("clamp width à 100% et aria-valuenow à max quand value > max", () => {
    render(<Progress value={150} max={100} />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamp width à 0% et aria-valuenow à 0 quand value < 0", () => {
    render(<Progress value={-20} max={100} />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("override inline de la hauteur du track (number -> px)", () => {
    render(<Progress value={50} height={6} />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    expect(bar.style.height).toBe("6px");
  });

  it("override inline de la hauteur du track (string telle quelle)", () => {
    render(<Progress value={50} height="1rem" />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    expect(bar.style.height).toBe("1rem");
  });
});

describe("Progress (linéaire) — rayures & passthrough", () => {
  it("striped pose .progress-bar-striped sur le BAR, PAS sur le fill (piège de placement)", () => {
    render(<Progress value={65} striped />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    const fill = document.querySelector(".progress-fill") as HTMLElement;
    expect(bar).toHaveClass("progress-bar-striped");
    expect(fill).not.toHaveClass("progress-bar-striped");
  });

  it("sans striped, pas de classe .progress-bar-striped", () => {
    render(<Progress value={65} />);
    expect(document.querySelector(".progress-bar")).not.toHaveClass(
      "progress-bar-striped",
    );
  });

  it("propage className additionnelle et attributs HTML (id) sans casser le role", () => {
    render(<Progress value={50} className="mt-2" id="build-progress" />);
    const bar = document.querySelector(".progress-bar") as HTMLElement;
    expect(bar).toHaveClass("mt-2");
    expect(bar).toHaveAttribute("id", "build-progress");
    expect(bar).toHaveAttribute("role", "progressbar");
  });
});

describe("ProgressRing (circulaire) — structure & a11y", () => {
  it("rend .progress-ring > svg[role=img] avec .bg et .fill", () => {
    render(<ProgressRing value={92} label="Build" />);
    const ring = document.querySelector(".progress-ring");
    expect(ring).toBeInTheDocument();
    const svg = ring?.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(ring?.querySelector("circle.bg")).toBeInTheDocument();
    expect(ring?.querySelector("circle.fill")).toBeInTheDocument();
  });

  it("le <title> porte le label et est lié via aria-labelledby", () => {
    render(<ProgressRing value={92} label="Build — 92%" />);
    const svg = document.querySelector(".progress-ring svg") as SVGElement;
    const labelledby = svg.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    const title = document.getElementById(labelledby as string);
    expect(title?.tagName.toLowerCase()).toBe("title");
    expect(title?.textContent).toBe("Build — 92%");
  });

  it("dimensionne le svg selon size et centre cx/cy à size/2", () => {
    render(<ProgressRing value={50} label="X" size={80} />);
    const svg = document.querySelector(".progress-ring svg") as SVGElement;
    expect(svg).toHaveAttribute("width", "80");
    expect(svg).toHaveAttribute("height", "80");
    const fill = document.querySelector("circle.fill") as SVGElement;
    expect(fill).toHaveAttribute("cx", "40");
    expect(fill).toHaveAttribute("cy", "40");
  });
});

describe("ProgressRing (circulaire) — géométrie porteuse d'état", () => {
  it("dérive r, stroke-dasharray (2πr) et stroke-dashoffset (C·(1-ratio)) [défauts = vanilla]", () => {
    // size 80, strokeWidth 4 -> r = 40 - 4 - 2 = 34 ; C = 2π·34 ≈ 213.63
    render(<ProgressRing value={92} label="Build" />);
    const fill = document.querySelector("circle.fill") as SVGElement;
    expect(fill).toHaveAttribute("r", "34");

    const C = 2 * Math.PI * 34;
    const dasharray = parseFloat(
      fill.getAttribute("stroke-dasharray") as string,
    );
    const dashoffset = parseFloat(
      fill.getAttribute("stroke-dashoffset") as string,
    );
    expect(dasharray).toBeCloseTo(C, 2); // ≈ 213.63
    expect(dashoffset).toBeCloseTo(C * (1 - 0.92), 2); // ≈ 17.09
  });

  it("dérive r depuis size ET strokeWidth custom (pas de hardcode)", () => {
    // size 120, strokeWidth 8 -> r = 60 - 8 - 2 = 50
    render(<ProgressRing value={50} label="X" size={120} strokeWidth={8} />);
    const fill = document.querySelector("circle.fill") as SVGElement;
    expect(fill).toHaveAttribute("r", "50");
    const C = 2 * Math.PI * 50;
    expect(
      parseFloat(fill.getAttribute("stroke-dasharray") as string),
    ).toBeCloseTo(C, 2);
  });

  it("value=0 -> dashoffset = C (anneau vide) ; value>=max -> dashoffset = 0 (anneau plein)", () => {
    const C = 2 * Math.PI * 34;

    const { unmount } = render(<ProgressRing value={0} label="X" />);
    let fill = document.querySelector("circle.fill") as SVGElement;
    expect(
      parseFloat(fill.getAttribute("stroke-dashoffset") as string),
    ).toBeCloseTo(C, 2);
    unmount();

    render(<ProgressRing value={100} max={100} label="X" />);
    fill = document.querySelector("circle.fill") as SVGElement;
    expect(
      parseFloat(fill.getAttribute("stroke-dashoffset") as string),
    ).toBeCloseTo(0, 2);
  });

  it("pose stroke-width inline sur .fill (bat le CSS forcé à 4)", () => {
    render(<ProgressRing value={50} label="X" strokeWidth={8} />);
    const fill = document.querySelector("circle.fill") as SVGElement;
    expect((fill as unknown as HTMLElement).style.strokeWidth).toBe("8");
  });
});

describe("ProgressRing (circulaire) — couleur & valeur", () => {
  it("color personnalisé posé inline en stroke sur .fill", () => {
    render(<ProgressRing value={60} label="Tests" color="var(--deco-violet)" />);
    const fill = document.querySelector("circle.fill") as SVGElement;
    expect((fill as unknown as HTMLElement).style.stroke).toBe(
      "var(--deco-violet)",
    );
  });

  it("sans color, aucun stroke inline (fallback CSS var(--accent))", () => {
    render(<ProgressRing value={60} label="Tests" />);
    const fill = document.querySelector("circle.fill") as SVGElement;
    expect((fill as unknown as HTMLElement).style.stroke).toBe("");
  });

  it("showValue (défaut) affiche .value = pourcentage arrondi", () => {
    render(<ProgressRing value={92} label="Build" />);
    const value = document.querySelector(".progress-ring .value");
    expect(value?.textContent).toBe("92%");
  });

  it("showValue=false ne rend pas .value", () => {
    render(<ProgressRing value={92} label="Build" showValue={false} />);
    expect(document.querySelector(".progress-ring .value")).not.toBeInTheDocument();
  });
});
