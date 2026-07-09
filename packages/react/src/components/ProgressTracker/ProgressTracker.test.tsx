import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ProgressTracker } from "./ProgressTracker";

// Géométrie miroir du composant (single r=62, multi radii 84/68/52).
const SINGLE_C = 2 * Math.PI * 62;
const targetOffset = (r: number, pct: number) =>
  2 * Math.PI * r * (1 - pct / 100);

const parse = (v: string | null | undefined) => parseFloat(v ?? "");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProgressTracker — anneau simple : structure & a11y", () => {
  it("rend .progress-tracker[role=img] avec aria-label, svg aria-hidden, .pt-track + .pt-fill", () => {
    render(
      <ProgressTracker
        progress={75}
        value="75%"
        label="Complet"
        aria-label="Progression 75%"
        animateOnView={false}
      />,
    );

    const container = document.querySelector(".progress-tracker");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("role", "img");
    expect(container).toHaveAttribute("aria-label", "Progression 75%");

    const svg = container?.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 160 160");

    expect(document.querySelector(".pt-track")).toBeInTheDocument();
    expect(document.querySelector(".pt-fill")).toBeInTheDocument();
  });

  it("rend le centre .progress-tracker-value / .progress-tracker-label", () => {
    render(
      <ProgressTracker
        progress={75}
        value="3/4"
        label="Étapes"
        aria-label="x"
        animateOnView={false}
      />,
    );
    expect(document.querySelector(".progress-tracker-value")?.textContent).toBe(
      "3/4",
    );
    expect(document.querySelector(".progress-tracker-label")?.textContent).toBe(
      "Étapes",
    );
  });

  it("n'émet pas .progress-tracker-center sans value ni label", () => {
    render(<ProgressTracker progress={40} aria-label="x" animateOnView={false} />);
    expect(
      document.querySelector(".progress-tracker-center"),
    ).not.toBeInTheDocument();
  });

  it("size='sm' pose .progress-tracker--sm (absente par défaut)", () => {
    const { rerender } = render(
      <ProgressTracker progress={10} aria-label="x" animateOnView={false} />,
    );
    expect(document.querySelector(".progress-tracker")).not.toHaveClass(
      "progress-tracker--sm",
    );
    rerender(
      <ProgressTracker
        progress={10}
        size="sm"
        aria-label="x"
        animateOnView={false}
      />,
    );
    expect(document.querySelector(".progress-tracker")).toHaveClass(
      "progress-tracker--sm",
    );
  });

  it("propage className sur le conteneur", () => {
    render(
      <ProgressTracker
        progress={10}
        aria-label="x"
        className="mon-tracker"
        animateOnView={false}
      />,
    );
    expect(document.querySelector(".progress-tracker")).toHaveClass(
      "mon-tracker",
    );
  });
});

describe("ProgressTracker — état réel : stroke-dasharray / stroke-dashoffset (styles inline calculés)", () => {
  it("pose stroke-dasharray = circonférence (attribut) et stroke-dashoffset cible = C·(1−pct/100) (style)", () => {
    render(
      <ProgressTracker progress={75} aria-label="x" animateOnView={false} />,
    );
    const fill = document.querySelector(".pt-fill") as SVGCircleElement;

    // dasharray = 2·π·62 (motif = 1 arc) — attribut
    expect(parse(fill.getAttribute("stroke-dasharray"))).toBeCloseTo(
      SINGLE_C,
      3,
    );
    // dashoffset = état de progression réel — style inline
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(
      targetOffset(62, 75),
      3,
    );
  });

  it("pose transform rotate(-90deg) + transform-origin '80px 80px' (démarrage à 12h)", () => {
    render(
      <ProgressTracker progress={50} aria-label="x" animateOnView={false} />,
    );
    const fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(fill.style.transform).toBe("rotate(-90deg)");
    expect(fill.style.transformOrigin).toBe("80px 80px");
  });

  it("progress=0 → anneau vide (dashoffset = circonférence) ; progress=100 → anneau plein (dashoffset = 0)", () => {
    const { rerender } = render(
      <ProgressTracker progress={0} aria-label="x" animateOnView={false} />,
    );
    let fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(SINGLE_C, 3);

    rerender(
      <ProgressTracker progress={100} aria-label="x" animateOnView={false} />,
    );
    fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(0, 3);
  });

  it("clampe les valeurs hors bornes (150 → 100, -20 → 0)", () => {
    const { rerender } = render(
      <ProgressTracker progress={150} aria-label="x" animateOnView={false} />,
    );
    let fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(0, 3);

    rerender(
      <ProgressTracker progress={-20} aria-label="x" animateOnView={false} />,
    );
    fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(SINGLE_C, 3);
  });
});

describe("ProgressTracker — jalons (.pt-step--done/active/pending)", () => {
  it("steps=4/current=3 → 2 done, 1 active, 1 pending (i<current-1 / ===current-1 / sinon)", () => {
    render(
      <ProgressTracker
        progress={75}
        steps={4}
        current={3}
        aria-label="x"
        animateOnView={false}
      />,
    );
    expect(document.querySelectorAll(".pt-step")).toHaveLength(4);
    expect(document.querySelectorAll(".pt-step--done")).toHaveLength(2);
    expect(document.querySelectorAll(".pt-step--active")).toHaveLength(1);
    expect(document.querySelectorAll(".pt-step--pending")).toHaveLength(1);
  });

  it("le premier jalon (i=0) est positionné en haut (cx=80, cy=18) — décalage -90°", () => {
    render(
      <ProgressTracker
        progress={50}
        steps={4}
        current={1}
        aria-label="x"
        animateOnView={false}
      />,
    );
    const first = document.querySelector(".pt-step") as SVGCircleElement;
    expect(parse(first.getAttribute("cx"))).toBeCloseTo(80, 3);
    expect(parse(first.getAttribute("cy"))).toBeCloseTo(18, 3); // 80 - 62
    expect(first.getAttribute("r")).toBe("5");
  });

  it("current=0 → tous les jalons pending", () => {
    render(
      <ProgressTracker
        progress={10}
        steps={3}
        aria-label="x"
        animateOnView={false}
      />,
    );
    expect(document.querySelectorAll(".pt-step--pending")).toHaveLength(3);
    expect(document.querySelectorAll(".pt-step--done")).toHaveLength(0);
    expect(document.querySelectorAll(".pt-step--active")).toHaveLength(0);
  });

  it("steps=0 (défaut) → aucun jalon rendu", () => {
    render(
      <ProgressTracker progress={40} aria-label="x" animateOnView={false} />,
    );
    expect(document.querySelectorAll(".pt-step")).toHaveLength(0);
  });
});

describe("ProgressTracker — variante concentrique (rings)", () => {
  const rings = [
    { label: "Frontend", pct: 82, color: "var(--accent)" },
    { label: "Backend", pct: 55, color: "var(--deco-violet)" },
    { label: "Tests", pct: 34, color: "var(--deco-cyan)" },
  ];

  it("bascule sur .progress-tracker-multi (svg viewBox 200) avec 3 track + 3 fill", () => {
    render(
      <ProgressTracker
        rings={rings}
        aria-label="Progression multi-modules"
        animateOnView={false}
      />,
    );
    const multi = document.querySelector(".progress-tracker-multi");
    expect(multi).toBeInTheDocument();
    expect(multi).toHaveAttribute("role", "img");
    expect(multi).toHaveAttribute("aria-label", "Progression multi-modules");
    expect(multi?.querySelector("svg")).toHaveAttribute("viewBox", "0 0 200 200");
    expect(document.querySelectorAll(".pt-track")).toHaveLength(3);
    expect(document.querySelectorAll(".pt-fill")).toHaveLength(3);
    // pas d'anneau simple en parallèle
    expect(document.querySelector(".progress-tracker")).not.toBeInTheDocument();
  });

  it("chaque fill : rayon 84/68/52, stroke-width 7, stroke inline par anneau, dashoffset cible", () => {
    render(
      <ProgressTracker rings={rings} aria-label="x" animateOnView={false} />,
    );
    const fills = Array.from(
      document.querySelectorAll(".pt-fill"),
    ) as SVGCircleElement[];
    const radii = [84, 68, 52];

    fills.forEach((fill, i) => {
      expect(fill.getAttribute("r")).toBe(String(radii[i]));
      expect(fill.getAttribute("stroke-width")).toBe("7");
      expect(fill.style.stroke).toBe(rings[i].color);
      expect(fill.style.transform).toBe("rotate(-90deg)");
      expect(fill.style.transformOrigin).toBe("100px 100px");
      expect(parse(fill.getAttribute("stroke-dasharray"))).toBeCloseTo(
        2 * Math.PI * radii[i],
        3,
      );
      expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(
        targetOffset(radii[i], rings[i].pct),
        3,
      );
    });
  });

  it("rend la légende avec dot (background inline) + libellé + pourcentage arrondi", () => {
    render(
      <ProgressTracker rings={rings} aria-label="x" animateOnView={false} />,
    );
    const items = document.querySelectorAll(
      ".progress-tracker-multi-legend-item",
    );
    expect(items).toHaveLength(3);

    const dots = Array.from(
      document.querySelectorAll(".progress-tracker-multi-legend-dot"),
    ) as HTMLElement[];
    expect(dots[0].style.background).toBe("var(--accent)");
    expect(dots[1].style.background).toBe("var(--deco-violet)");
    expect(dots[2].style.background).toBe("var(--deco-cyan)");

    const pcts = Array.from(
      document.querySelectorAll(".progress-tracker-multi-legend-pct"),
    ).map((el) => el.textContent);
    expect(pcts).toEqual(["82%", "55%", "34%"]);
  });

  it("legend={false} masque la légende", () => {
    render(
      <ProgressTracker
        rings={rings}
        legend={false}
        aria-label="x"
        animateOnView={false}
      />,
    );
    expect(
      document.querySelector(".progress-tracker-multi-legend"),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll(".pt-fill")).toHaveLength(3);
  });

  it("couleur par défaut var(--accent) quand ring.color omis", () => {
    render(
      <ProgressTracker
        rings={[{ label: "Solo", pct: 50 }]}
        aria-label="x"
        animateOnView={false}
      />,
    );
    const fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(fill.style.stroke).toBe("var(--accent)");
    const dot = document.querySelector(
      ".progress-tracker-multi-legend-dot",
    ) as HTMLElement;
    expect(dot.style.background).toBe("var(--accent)");
  });

  it("clampe à 3 anneaux : un 4e ring est ignoré (limite géométrique DS)", () => {
    render(
      <ProgressTracker
        rings={[...rings, { label: "Docs", pct: 20 }]}
        aria-label="x"
        animateOnView={false}
      />,
    );
    expect(document.querySelectorAll(".pt-fill")).toHaveLength(3);
    expect(
      document.querySelectorAll(".progress-tracker-multi-legend-item"),
    ).toHaveLength(3);
  });
});

describe("ProgressTracker — révélation au scroll (animateOnView)", () => {
  it("animateOnView + IntersectionObserver : caché au montage (dashoffset = C), révélé à l'intersection (dashoffset = cible)", () => {
    const observers: Array<{
      cb: IntersectionObserverCallback;
      el: Element | null;
    }> = [];
    class IOStub {
      cb: IntersectionObserverCallback;
      el: Element | null = null;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
        observers.push(this);
      }
      observe(el: Element) {
        this.el = el;
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", IOStub);

    render(<ProgressTracker progress={75} aria-label="x" />);
    const fill = document.querySelector(".pt-fill") as SVGCircleElement;

    // Phase 1 : caché — offset = circonférence entière
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(SINGLE_C, 3);
    expect(observers).toHaveLength(1);

    // Phase 2 : intersection → révélé
    act(() => {
      observers[0].cb(
        [
          {
            isIntersecting: true,
            target: observers[0].el,
          } as unknown as IntersectionObserverEntry,
        ],
        observers[0] as unknown as IntersectionObserver,
      );
    });
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(
      targetOffset(62, 75),
      3,
    );
  });

  it("sans IntersectionObserver (SSR/jsdom) : révélé immédiatement (fallback)", () => {
    // jsdom n'implémente pas IntersectionObserver → dashoffset direct à la cible
    render(<ProgressTracker progress={60} aria-label="x" />);
    const fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(
      targetOffset(62, 60),
      3,
    );
  });

  it("prefers-reduced-motion : révélé immédiatement sans attendre l'intersection", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    // IntersectionObserver qui ne déclenche jamais — seule la reduced-motion doit révéler
    class IONever {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", IONever);

    render(<ProgressTracker progress={90} aria-label="x" />);
    const fill = document.querySelector(".pt-fill") as SVGCircleElement;
    expect(parse(fill.style.strokeDashoffset)).toBeCloseTo(
      targetOffset(62, 90),
      3,
    );
  });
});
