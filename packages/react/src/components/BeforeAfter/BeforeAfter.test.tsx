import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { BeforeAfter } from "./BeforeAfter";

/** Rect factice pour un `.before-after` de 200x100 (tests de drag). */
function fakeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 100,
    width: 200,
    height: 100,
    toJSON() {
      return this;
    },
    ...overrides,
  } as DOMRect;
}

beforeEach(() => {
  // jsdom n'implémente PAS setPointerCapture/releasePointerCapture — cf.
  // SplitPane.test.tsx (#595), précédent similaire.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BeforeAfter — structure", () => {
  it("rend le markup canonique .before-after > .before-after-after + .before-after-before + .before-after-handle", () => {
    render(<BeforeAfter before="Avant" after="Après" />);

    expect(document.querySelector(".before-after")).toBeInTheDocument();
    expect(document.querySelector(".before-after-after")).toHaveTextContent(
      "Après",
    );
    expect(document.querySelector(".before-after-before")).toHaveTextContent(
      "Avant",
    );
    expect(document.querySelector(".before-after-handle")).toBeInTheDocument();
  });

  it("position initiale 50% — clip-path et left calqués sur le CSS par défaut", () => {
    render(<BeforeAfter before="Avant" after="Après" />);
    const before = document.querySelector(
      ".before-after-before",
    ) as HTMLElement;
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    expect(before.style.clipPath).toBe("inset(0 50% 0 0)");
    expect(handle.style.left).toBe("50%");
  });
});

describe("BeforeAfter — contrat clavier #836 (identique à initBeforeAfter)", () => {
  it("role=separator, tabindex=0, aria-orientation=vertical, valuemin/valuemax=5/95", () => {
    render(<BeforeAfter before="Avant" after="Après" />);
    const handle = document.querySelector(".before-after-handle");
    expect(handle).toHaveAttribute("role", "separator");
    expect(handle).toHaveAttribute("tabindex", "0");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuemin", "5");
    expect(handle).toHaveAttribute("aria-valuemax", "95");
    expect(handle).toHaveAttribute("aria-valuenow", "50");
  });

  it("ArrowRight avance de 2 points (step vanilla)", () => {
    const onChange = vi.fn();
    render(<BeforeAfter before="Avant" after="Après" onChange={onChange} />);
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(52);
    expect(handle).toHaveAttribute("aria-valuenow", "52");
  });

  it("ArrowLeft recule de 2 points", () => {
    const onChange = vi.fn();
    render(
      <BeforeAfter
        before="Avant"
        after="Après"
        defaultPercent={50}
        onChange={onChange}
      />,
    );
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith(48);
  });

  it("Home va à MIN (5), End va à MAX (95)", () => {
    const onChange = vi.fn();
    render(<BeforeAfter before="Avant" after="Après" onChange={onChange} />);
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;

    fireEvent.keyDown(handle, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(handle).toHaveAttribute("aria-valuenow", "5");

    fireEvent.keyDown(handle, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(95);
    expect(handle).toHaveAttribute("aria-valuenow", "95");
  });

  it("clampe aux bornes MIN/MAX (ArrowLeft répété ne descend jamais sous 5)", () => {
    const onChange = vi.fn();
    render(
      <BeforeAfter
        before="Avant"
        after="Après"
        defaultPercent={6}
        onChange={onChange}
      />,
    );
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it("les autres touches (ex: Tab) n'appellent pas onChange", () => {
    const onChange = vi.fn();
    render(<BeforeAfter before="Avant" after="Après" onChange={onChange} />);
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    fireEvent.keyDown(handle, { key: "Tab" });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("BeforeAfter — drag (Pointer Events)", () => {
  it("recalcule le pourcentage depuis la position du pointeur", () => {
    const onChange = vi.fn();
    render(<BeforeAfter before="Avant" after="Après" onChange={onChange} />);
    const container = document.querySelector(".before-after") as HTMLElement;
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(fakeRect());

    // rect 200x100 : clientX=150 → (150-0)/200*100 = 75%
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 150, clientY: 50 });

    expect(onChange).toHaveBeenCalledWith(75);
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("clampe le pourcentage pendant le drag au-delà de MAX", () => {
    const onChange = vi.fn();
    render(<BeforeAfter before="Avant" after="Après" onChange={onChange} />);
    const container = document.querySelector(".before-after") as HTMLElement;
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(fakeRect());

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 190, clientY: 50 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 250, clientY: 50 });

    expect(onChange).toHaveBeenLastCalledWith(95);
  });

  it("relâche la capture au pointerup", () => {
    render(<BeforeAfter before="Avant" after="Après" />);
    const container = document.querySelector(".before-after") as HTMLElement;
    const handle = document.querySelector(
      ".before-after-handle",
    ) as HTMLElement;
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(fakeRect());

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 100, clientY: 50 });
    expect(Element.prototype.releasePointerCapture).toHaveBeenCalledWith(1);
  });
});

describe("BeforeAfter — mode contrôlé", () => {
  it("percent contrôlé pilote le rendu, ignore defaultPercent", () => {
    render(
      <BeforeAfter
        before="Avant"
        after="Après"
        percent={30}
        defaultPercent={80}
      />,
    );
    const handle = document.querySelector(".before-after-handle");
    expect(handle).toHaveAttribute("aria-valuenow", "30");
  });
});
