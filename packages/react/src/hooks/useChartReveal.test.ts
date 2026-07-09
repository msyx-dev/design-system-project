import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChart, useChartReveal, useChartTooltip } from "./useChartReveal";

/**
 * jsdom n'implémente pas `IntersectionObserver`. Mock contrôlable : on capture
 * chaque instance + ses options, et `emit()` déclenche le callback RÉEL du hook
 * (donc le vrai `classList.add('chart-visible')` / `unobserve`) — c'est ce
 * toggle d'état, dont dépend le CSS DS (`data.css:49-50`), qu'on assert.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly callback: IntersectionObserverCallback;
  readonly options?: IntersectionObserverInit;
  readonly observed = new Set<Element>();
  readonly unobserved: Element[] = [];
  disconnected = false;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element): void {
    this.observed.add(el);
  }
  unobserve(el: Element): void {
    this.observed.delete(el);
    this.unobserved.push(el);
  }
  disconnect(): void {
    this.disconnected = true;
    this.observed.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Simule l'entrée (ou non) en viewport de `target`. */
  emit(target: Element, isIntersecting: boolean): void {
    this.callback(
      [{ target, isIntersecting } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }

  static latest(): MockIntersectionObserver {
    const { instances } = MockIntersectionObserver;
    const obs = instances[instances.length - 1];
    if (!obs) throw new Error("Aucun IntersectionObserver instancié");
    return obs;
  }
}

function setIO(value: unknown): void {
  (globalThis as Record<string, unknown>).IntersectionObserver = value;
}

let originalIO: unknown;

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  originalIO = (globalThis as Record<string, unknown>).IntersectionObserver;
  setIO(MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
  setIO(originalIO);
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// useChartReveal — scroll reveal (.chart-visible)
// ---------------------------------------------------------------------------

function RevealHarness(props: { threshold?: number; preVisible?: boolean }) {
  const ref = useChartReveal<HTMLDivElement>(
    props.threshold === undefined ? undefined : { threshold: props.threshold },
  );
  return createElement("div", {
    ref,
    "data-testid": "wrap",
    className: props.preVisible
      ? "chart-wrap chart-animated chart-visible"
      : "chart-wrap chart-animated",
  });
}

describe("useChartReveal — reveal au scroll (.chart-visible)", () => {
  it("n'ajoute pas .chart-visible tant que le wrap n'est pas visible (chart resterait opacity:0)", () => {
    const { getByTestId } = render(createElement(RevealHarness));
    expect(getByTestId("wrap")).not.toHaveClass("chart-visible");
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it("ajoute .chart-visible à l'entrée en viewport puis arrête d'observer (unobserve)", () => {
    const { getByTestId } = render(createElement(RevealHarness));
    const wrap = getByTestId("wrap");
    const obs = MockIntersectionObserver.latest();

    obs.emit(wrap, true);

    expect(wrap).toHaveClass("chart-visible");
    expect(obs.unobserved).toContain(wrap);
  });

  it("n'ajoute PAS .chart-visible pour une entrée non-intersectante", () => {
    const { getByTestId } = render(createElement(RevealHarness));
    const wrap = getByTestId("wrap");

    MockIntersectionObserver.latest().emit(wrap, false);

    expect(wrap).not.toHaveClass("chart-visible");
  });

  it("utilise threshold 0.15 par défaut (fidèle au vanilla components.js:144)", () => {
    render(createElement(RevealHarness));
    expect(MockIntersectionObserver.latest().options?.threshold).toBe(0.15);
  });

  it("propage un threshold personnalisé", () => {
    render(createElement(RevealHarness, { threshold: 0.5 }));
    expect(MockIntersectionObserver.latest().options?.threshold).toBe(0.5);
  });

  it("idempotent : n'observe pas un wrap déjà .chart-visible (rendu statique révélé)", () => {
    const { getByTestId } = render(
      createElement(RevealHarness, { preVisible: true }),
    );
    expect(getByTestId("wrap")).toHaveClass("chart-visible");
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("dégradation SSR/legacy : révèle immédiatement si IntersectionObserver est absent", () => {
    setIO(undefined);
    const { getByTestId } = render(createElement(RevealHarness));
    // Sans révélation immédiate, .chart-animated resterait bloqué opacity:0.
    expect(getByTestId("wrap")).toHaveClass("chart-visible");
  });

  it("déconnecte l'observer au démontage (cleanup listeners)", () => {
    const { unmount } = render(createElement(RevealHarness));
    const obs = MockIntersectionObserver.latest();
    expect(obs.disconnected).toBe(false);

    unmount();

    expect(obs.disconnected).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useChartTooltip — tooltip de survol (.chart-tooltip.visible + styles inline)
// ---------------------------------------------------------------------------

function TooltipHarness(props: { omitValue?: boolean }) {
  const { wrapRef, tooltipRef } = useChartTooltip<HTMLDivElement>();
  return createElement(
    "div",
    { ref: wrapRef, "data-testid": "wrap", className: "chart-wrap" },
    createElement("div", {
      ref: tooltipRef,
      "data-testid": "tooltip",
      className: "chart-tooltip",
    }),
    createElement(
      "svg",
      { viewBox: "0 0 100 100" },
      createElement("rect", {
        "data-testid": "bar",
        className: "chart-bar",
        "data-label": "Jan",
        // data-value omis => l'élément n'est plus un point de donnée valide.
        ...(props.omitValue ? {} : { "data-value": "32k" }),
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      }),
    ),
  );
}

describe("useChartTooltip — tooltip de survol (.chart-tooltip.visible)", () => {
  it("affiche le tooltip (.visible + contenu « label : value ») au survol d'un point de donnée", () => {
    const { getByTestId } = render(createElement(TooltipHarness));
    const bar = getByTestId("bar");
    const tooltip = getByTestId("tooltip");
    expect(tooltip).not.toHaveClass("visible");

    fireEvent.mouseMove(bar, { clientX: 50, clientY: 40 });

    expect(tooltip).toHaveClass("visible");
    expect(tooltip).toHaveTextContent("Jan : 32k");
  });

  it("positionne le tooltip au curseur via styles INLINE (offset +10 / -30, fidèle au vanilla)", () => {
    const { getByTestId } = render(createElement(TooltipHarness));
    const bar = getByTestId("bar");
    const tooltip = getByTestId("tooltip");

    fireEvent.mouseMove(bar, { clientX: 50, clientY: 40 });

    // getBoundingClientRect du wrap = {left:0, top:0} sous jsdom => 50+10 / 40-30.
    expect(tooltip.style.left).toBe("60px");
    expect(tooltip.style.top).toBe("10px");
  });

  it("masque le tooltip à la sortie du wrap (mouseleave)", () => {
    const { getByTestId } = render(createElement(TooltipHarness));
    const bar = getByTestId("bar");
    const wrap = getByTestId("wrap");
    const tooltip = getByTestId("tooltip");

    fireEvent.mouseMove(bar, { clientX: 50, clientY: 40 });
    expect(tooltip).toHaveClass("visible");

    fireEvent.mouseLeave(wrap);

    expect(tooltip).not.toHaveClass("visible");
  });

  it("masque le tooltip au survol d'une zone sans [data-label][data-value]", () => {
    const { getByTestId } = render(createElement(TooltipHarness));
    const bar = getByTestId("bar");
    const wrap = getByTestId("wrap");
    const tooltip = getByTestId("tooltip");

    fireEvent.mouseMove(bar, { clientX: 50, clientY: 40 });
    expect(tooltip).toHaveClass("visible");

    // Survol du wrap lui-même : aucun point de donnée au-dessus du curseur.
    fireEvent.mouseMove(wrap, { clientX: 5, clientY: 5 });

    expect(tooltip).not.toHaveClass("visible");
  });

  it("n'affiche aucun tooltip si data-value manque (early-return vanilla components.js:152)", () => {
    const { getByTestId } = render(
      createElement(TooltipHarness, { omitValue: true }),
    );
    const bar = getByTestId("bar");
    const tooltip = getByTestId("tooltip");

    fireEvent.mouseMove(bar, { clientX: 50, clientY: 40 });

    expect(tooltip).not.toHaveClass("visible");
    expect(tooltip.textContent).toBe("");
  });

  it("retire les listeners au démontage (cleanup)", () => {
    const { getByTestId, unmount } = render(createElement(TooltipHarness));
    const wrap = getByTestId("wrap");
    const removeSpy = vi.spyOn(wrap, "removeEventListener");

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseleave", expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// useChart — combiné reveal + tooltip sur un même wrap
// ---------------------------------------------------------------------------

function ChartHarness(props: { tooltip?: boolean }) {
  const { wrapRef, tooltipRef } = useChart(
    props.tooltip === undefined ? undefined : { tooltip: props.tooltip },
  );
  return createElement(
    "div",
    {
      ref: wrapRef,
      "data-testid": "wrap",
      className: "chart-wrap chart-animated",
    },
    createElement("div", {
      ref: tooltipRef,
      "data-testid": "tooltip",
      className: "chart-tooltip",
    }),
    createElement(
      "svg",
      { viewBox: "0 0 100 100" },
      createElement("rect", {
        "data-testid": "bar",
        className: "chart-bar",
        "data-label": "Mar",
        "data-value": "41k",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      }),
    ),
  );
}

describe("useChart — combiné reveal + tooltip", () => {
  it("révèle (.chart-visible) ET pilote le tooltip par défaut sur le même wrap", () => {
    const { getByTestId } = render(createElement(ChartHarness));
    const wrap = getByTestId("wrap");
    const bar = getByTestId("bar");
    const tooltip = getByTestId("tooltip");

    MockIntersectionObserver.latest().emit(wrap, true);
    expect(wrap).toHaveClass("chart-visible");

    fireEvent.mouseMove(bar, { clientX: 20, clientY: 60 });
    expect(tooltip).toHaveClass("visible");
    expect(tooltip).toHaveTextContent("Mar : 41k");
  });

  it("tooltip:false désactive le tooltip mais conserve le reveal", () => {
    const { getByTestId } = render(
      createElement(ChartHarness, { tooltip: false }),
    );
    const wrap = getByTestId("wrap");
    const bar = getByTestId("bar");
    const tooltip = getByTestId("tooltip");

    MockIntersectionObserver.latest().emit(wrap, true);
    expect(wrap).toHaveClass("chart-visible");

    fireEvent.mouseMove(bar, { clientX: 20, clientY: 60 });
    expect(tooltip).not.toHaveClass("visible");
  });
});
