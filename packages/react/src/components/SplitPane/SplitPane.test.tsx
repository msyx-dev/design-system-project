import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { SplitPane } from "./SplitPane";

/** Rect factice pour un `.split-pane` de 200x100 (utilisé par les tests de drag). */
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
  // jsdom n'implémente PAS setPointerCapture/releasePointerCapture (méthodes
  // absentes, pas seulement no-op) — cf. test-setup.ts pour un précédent
  // similaire (getScreenCTM). On les pose comme spies fraîches par test.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("SplitPane — structure", () => {
  it("rend le markup canonique .split-pane/.split-panel x2/.split-gutter", () => {
    render(<SplitPane first="Liste" second="Détail" />);

    const pane = document.querySelector(".split-pane");
    expect(pane).toBeInTheDocument();
    const panels = document.querySelectorAll(".split-panel");
    expect(panels).toHaveLength(2);
    expect(panels[1]).toHaveClass("split-panel--fluid");
    expect(panels[0]).not.toHaveClass("split-panel--fluid");

    const gutter = document.querySelector(".split-gutter");
    expect(gutter).toBeInTheDocument();
    expect(gutter).toHaveAttribute("role", "separator");
    expect(gutter).toHaveAttribute("tabindex", "0");
  });

  it("n'ajoute pas .split-pane--vertical par défaut (horizontal)", () => {
    render(<SplitPane first="A" second="B" />);
    expect(document.querySelector(".split-pane")).not.toHaveClass(
      "split-pane--vertical",
    );
  });

  it("ajoute .split-pane--vertical quand orientation='vertical'", () => {
    render(<SplitPane first="A" second="B" orientation="vertical" />);
    expect(document.querySelector(".split-pane")).toHaveClass(
      "split-pane--vertical",
    );
  });

  it("passe className/firstClassName/secondClassName", () => {
    render(
      <SplitPane
        first="A"
        second="B"
        className="custom-pane"
        firstClassName="custom-first"
        secondClassName="custom-second"
      />,
    );
    expect(document.querySelector(".split-pane")).toHaveClass("custom-pane");
    const panels = document.querySelectorAll(".split-panel");
    expect(panels[0]).toHaveClass("custom-first");
    expect(panels[1]).toHaveClass("custom-second");
  });

  it("ne pose pas aria-label sur le gutter par défaut (iso-vanilla)", () => {
    render(<SplitPane first="A" second="B" />);
    expect(document.querySelector(".split-gutter")).not.toHaveAttribute(
      "aria-label",
    );
  });

  it("pose aria-label sur le gutter si gutterAriaLabel fourni (amélioration opt-in)", () => {
    render(<SplitPane first="A" second="B" gutterAriaLabel="Redimensionner" />);
    expect(document.querySelector(".split-gutter")).toHaveAttribute(
      "aria-label",
      "Redimensionner",
    );
  });
});

describe("SplitPane — flexBasis (dimensionnement, seul le 1er panneau piloté)", () => {
  it("applique flexBasis: 50% par défaut (ratio initial par défaut)", () => {
    render(<SplitPane first="A" second="B" />);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("50%");
  });

  it("le second panneau (.split-panel--fluid) n'a AUCUN flexBasis inline", () => {
    render(<SplitPane first="A" second="B" defaultRatio={30} />);
    const second = document.querySelectorAll(".split-panel")[1] as HTMLElement;
    expect(second.style.flexBasis).toBe("");
  });

  it("applique defaultRatio quand fourni", () => {
    render(<SplitPane first="A" second="B" defaultRatio={30} />);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("30%");
  });

  it("clampe defaultRatio en dessous de min (15 par défaut)", () => {
    render(<SplitPane first="A" second="B" defaultRatio={5} />);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("15%");
  });

  it("clampe defaultRatio au dessus de max (85 par défaut)", () => {
    render(<SplitPane first="A" second="B" defaultRatio={95} />);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("85%");
  });

  it("respecte min/max personnalisés", () => {
    render(
      <SplitPane first="A" second="B" defaultRatio={10} min={20} max={80} />,
    );
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("20%");
  });
});

describe("SplitPane — ARIA du gutter", () => {
  it("pose aria-valuemin/aria-valuemax depuis min/max", () => {
    render(<SplitPane first="A" second="B" min={20} max={80} />);
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    expect(gutter).toHaveAttribute("aria-valuemin", "20");
    expect(gutter).toHaveAttribute("aria-valuemax", "80");
  });

  it("pose aria-valuenow arrondi", () => {
    render(<SplitPane first="A" second="B" defaultRatio={33.6} />);
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    expect(gutter).toHaveAttribute("aria-valuenow", "34");
  });

  // ⚠️ Piège volontaire vérifié explicitement (cf. JSDoc du composant) :
  // aria-orientation décrit l'orientation du SÉPARATEUR, pas celle du split.
  // Un split HORIZONTAL (panneaux côte à côte) a un séparateur VERTICAL, et
  // inversement. NE PAS "corriger" ce test en inversant l'assertion.
  it("aria-orientation='vertical' pour un split horizontal (défaut) — piège volontaire", () => {
    render(<SplitPane first="A" second="B" orientation="horizontal" />);
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    expect(gutter).toHaveAttribute("aria-orientation", "vertical");
  });

  it("aria-orientation='horizontal' pour un split vertical — piège volontaire", () => {
    render(<SplitPane first="A" second="B" orientation="vertical" />);
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    expect(gutter).toHaveAttribute("aria-orientation", "horizontal");
  });
});

describe("SplitPane — clavier (non contrôlé)", () => {
  it("ArrowRight incrémente le ratio de 2 (horizontal)", () => {
    const handleResize = vi.fn();
    render(
      <SplitPane
        first="A"
        second="B"
        defaultRatio={50}
        onResize={handleResize}
      />,
    );
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    fireEvent.keyDown(gutter, { key: "ArrowRight" });

    expect(handleResize).toHaveBeenCalledWith(52);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("52%");
    expect(gutter).toHaveAttribute("aria-valuenow", "52");
  });

  it("ArrowLeft décrémente le ratio de 2 (horizontal)", () => {
    render(<SplitPane first="A" second="B" defaultRatio={50} />);
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    fireEvent.keyDown(gutter, { key: "ArrowLeft" });
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("48%");
  });

  it("ArrowUp/ArrowDown pilotent le ratio en orientation vertical (pas ArrowLeft/ArrowRight)", () => {
    render(
      <SplitPane
        first="A"
        second="B"
        orientation="vertical"
        defaultRatio={50}
      />,
    );
    const gutter = document.querySelector(".split-gutter") as HTMLElement;

    fireEvent.keyDown(gutter, { key: "ArrowRight" });
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("50%"); // ArrowRight ignoré en vertical

    fireEvent.keyDown(gutter, { key: "ArrowDown" });
    expect(first.style.flexBasis).toBe("52%");

    fireEvent.keyDown(gutter, { key: "ArrowUp" });
    expect(first.style.flexBasis).toBe("50%");
  });

  it("Home ramène au min", () => {
    render(
      <SplitPane first="A" second="B" defaultRatio={50} min={15} max={85} />,
    );
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    fireEvent.keyDown(gutter, { key: "Home" });
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("15%");
  });

  it("End ramène au max", () => {
    render(
      <SplitPane first="A" second="B" defaultRatio={50} min={15} max={85} />,
    );
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    fireEvent.keyDown(gutter, { key: "End" });
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("85%");
  });

  it("clampe au max — des ArrowRight répétés ne dépassent pas max", () => {
    render(
      <SplitPane first="A" second="B" defaultRatio={84} min={15} max={85} />,
    );
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    fireEvent.keyDown(gutter, { key: "ArrowRight" });
    fireEvent.keyDown(gutter, { key: "ArrowRight" });
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("85%");
  });
});

describe("SplitPane — drag (Pointer Events, réimplémentation React)", () => {
  it("pose .split-pane--dragging au pointerdown et le retire au pointerup", () => {
    render(<SplitPane first="A" second="B" />);
    const pane = document.querySelector(".split-pane") as HTMLElement;
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue(fakeRect());

    expect(pane).not.toHaveClass("split-pane--dragging");

    fireEvent.pointerDown(gutter, { pointerId: 1, clientX: 100, clientY: 50 });
    expect(pane).toHaveClass("split-pane--dragging");
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(1);

    fireEvent.pointerUp(gutter, { pointerId: 1, clientX: 100, clientY: 50 });
    expect(pane).not.toHaveClass("split-pane--dragging");
    expect(Element.prototype.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it("retire .split-pane--dragging au pointercancel", () => {
    render(<SplitPane first="A" second="B" />);
    const pane = document.querySelector(".split-pane") as HTMLElement;
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue(fakeRect());

    fireEvent.pointerDown(gutter, { pointerId: 1, clientX: 100, clientY: 50 });
    expect(pane).toHaveClass("split-pane--dragging");

    fireEvent.pointerCancel(gutter, { pointerId: 1 });
    expect(pane).not.toHaveClass("split-pane--dragging");
  });

  it("recalcule le ratio depuis la position du pointeur (axe horizontal)", () => {
    const handleResize = vi.fn();
    render(<SplitPane first="A" second="B" onResize={handleResize} />);
    const pane = document.querySelector(".split-pane") as HTMLElement;
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    // rect 200x100 : clientX=150 → (150-0)/200 * 100 = 75%
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue(fakeRect());

    fireEvent.pointerDown(gutter, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(gutter, { pointerId: 1, clientX: 150, clientY: 50 });

    expect(handleResize).toHaveBeenCalledWith(75);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("75%");
  });

  it("recalcule le ratio depuis la position du pointeur (axe vertical, orientation='vertical')", () => {
    const handleResize = vi.fn();
    render(
      <SplitPane
        first="A"
        second="B"
        orientation="vertical"
        onResize={handleResize}
      />,
    );
    const pane = document.querySelector(".split-pane") as HTMLElement;
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    // rect 200x100 : clientY=25 → (25-0)/100 * 100 = 25%
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue(fakeRect());

    fireEvent.pointerDown(gutter, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(gutter, { pointerId: 1, clientX: 100, clientY: 25 });

    expect(handleResize).toHaveBeenCalledWith(25);
  });

  it("clampe le ratio pendant le drag (dépassement au delà de max)", () => {
    render(<SplitPane first="A" second="B" min={15} max={85} />);
    const pane = document.querySelector(".split-pane") as HTMLElement;
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue(fakeRect());

    fireEvent.pointerDown(gutter, { pointerId: 1, clientX: 190, clientY: 50 });
    // clientX=200 → 100% brut, clampé à 85%
    fireEvent.pointerMove(gutter, { pointerId: 1, clientX: 200, clientY: 50 });

    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("85%");
  });

  it("ignore un pointermove d'un pointerId différent de celui qui a démarré le drag", () => {
    const handleResize = vi.fn();
    render(<SplitPane first="A" second="B" onResize={handleResize} />);
    const pane = document.querySelector(".split-pane") as HTMLElement;
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue(fakeRect());

    fireEvent.pointerDown(gutter, { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(gutter, { pointerId: 2, clientX: 150, clientY: 50 });

    expect(handleResize).not.toHaveBeenCalled();
  });
});

describe("SplitPane — mode contrôlé (ratio/onResize)", () => {
  it("ignore defaultRatio quand ratio est fourni, et n'auto-modifie pas flexBasis au clavier", () => {
    const handleResize = vi.fn();
    render(
      <SplitPane
        first="A"
        second="B"
        ratio={40}
        defaultRatio={70}
        onResize={handleResize}
      />,
    );
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("40%");

    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    fireEvent.keyDown(gutter, { key: "ArrowRight" });

    // Le parent n'a pas encore répercuté onResize → flexBasis reste piloté par `ratio`.
    expect(first.style.flexBasis).toBe("40%");
    expect(handleResize).toHaveBeenCalledWith(42);
  });

  it("flexBasis suit `ratio` quand le parent répercute onResize (rerender)", () => {
    const { rerender } = render(<SplitPane first="A" second="B" ratio={40} />);
    rerender(<SplitPane first="A" second="B" ratio={60} />);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("60%");
  });
});

describe("SplitPane — persistance (persistKey / localStorage)", () => {
  it("restaure le ratio persisté au montage (non contrôlé)", () => {
    localStorage.setItem("ds-test-split", "70");
    render(<SplitPane first="A" second="B" persistKey="ds-test-split" />);
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("70%");
  });

  it("clampe la valeur restaurée hors bornes", () => {
    localStorage.setItem("ds-test-split-oob", "5");
    render(
      <SplitPane
        first="A"
        second="B"
        persistKey="ds-test-split-oob"
        min={15}
        max={85}
      />,
    );
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("15%");
  });

  it("ignore une valeur persistée non numérique (fallback defaultRatio)", () => {
    localStorage.setItem("ds-test-split-nan", "not-a-number");
    render(
      <SplitPane
        first="A"
        second="B"
        persistKey="ds-test-split-nan"
        defaultRatio={40}
      />,
    );
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("40%");
  });

  it("n'écrit PAS localStorage lors de la restauration initiale (persist:false, iso-vanilla)", () => {
    localStorage.setItem("ds-test-split-write", "60");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<SplitPane first="A" second="B" persistKey="ds-test-split-write" />);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("écrit localStorage à chaque déplacement (clavier)", () => {
    render(<SplitPane first="A" second="B" persistKey="ds-test-split-move" />);
    const gutter = document.querySelector(".split-gutter") as HTMLElement;
    fireEvent.keyDown(gutter, { key: "ArrowRight" });
    expect(localStorage.getItem("ds-test-split-move")).toBe("52");
  });

  it("mode contrôlé : n'utilise pas la restauration persistKey (le parent pilote ratio)", () => {
    localStorage.setItem("ds-test-split-ctrl", "70");
    render(
      <SplitPane
        first="A"
        second="B"
        ratio={40}
        persistKey="ds-test-split-ctrl"
      />,
    );
    const first = document.querySelectorAll(".split-panel")[0] as HTMLElement;
    expect(first.style.flexBasis).toBe("40%");
  });
});
