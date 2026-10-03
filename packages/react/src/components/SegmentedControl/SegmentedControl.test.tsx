import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { SegmentedControl, SegmentedControlOption } from "./SegmentedControl";
import { act } from "@testing-library/react";
import { afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const OPTIONS: SegmentedControlOption[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Annee" },
];

const OPTIONS_WITH_DISABLED: SegmentedControlOption[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B", disabled: true },
  { value: "c", label: "C" },
];

describe("SegmentedControl — structure", () => {
  it("rend le markup canonique .segmented/.segmented-item avec role=radiogroup/radio", () => {
    render(
      <SegmentedControl options={OPTIONS} value="week" onChange={() => {}} />,
    );

    const group = document.querySelector(".segmented");
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute("role", "radiogroup");
    expect(group).not.toHaveAttribute("role", "tablist");

    const items = document.querySelectorAll(".segmented-item");
    expect(items).toHaveLength(3);
    items.forEach((item) => expect(item).toHaveAttribute("role", "radio"));
    expect(items[0]).not.toHaveAttribute("aria-pressed");
    expect(items[0]).not.toHaveAttribute("aria-selected");
  });

  it("rend l'indicateur .segmented-indicator", () => {
    render(
      <SegmentedControl options={OPTIONS} value="week" onChange={() => {}} />,
    );
    expect(document.querySelector(".segmented-indicator")).toBeInTheDocument();
  });

  it("applique la classe active + aria-checked uniquement sur l'option sélectionnée", () => {
    render(
      <SegmentedControl options={OPTIONS} value="month" onChange={() => {}} />,
    );

    const activeItem = screen.getByText("Mois").closest("button");
    expect(activeItem).toHaveClass("segmented-item", "active");
    expect(activeItem).toHaveAttribute("aria-checked", "true");

    const inactiveItem = screen.getByText("Semaine").closest("button");
    expect(inactiveItem).toHaveClass("segmented-item");
    expect(inactiveItem).not.toHaveClass("active");
    expect(inactiveItem).toHaveAttribute("aria-checked", "false");
  });

  it("roving tabindex — tabindex=0 sur l'actif, -1 sur les autres", () => {
    render(
      <SegmentedControl options={OPTIONS} value="week" onChange={() => {}} />,
    );

    const activeItem = screen.getByText("Semaine").closest("button");
    const inactiveItem = screen.getByText("Mois").closest("button");

    expect(activeItem).toHaveAttribute("tabindex", "0");
    expect(inactiveItem).toHaveAttribute("tabindex", "-1");
  });

  it("applique aria-label sur le radiogroup via la prop label", () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="week"
        onChange={() => {}}
        label="Vue"
      />,
    );
    expect(document.querySelector(".segmented")).toHaveAttribute(
      "aria-label",
      "Vue",
    );
  });

  it("applique .segmented--sm / .segmented--lg selon la prop size", () => {
    const { rerender } = render(
      <SegmentedControl
        options={OPTIONS}
        value="week"
        onChange={() => {}}
        size="sm"
      />,
    );
    expect(document.querySelector(".segmented")).toHaveClass("segmented--sm");

    rerender(
      <SegmentedControl
        options={OPTIONS}
        value="week"
        onChange={() => {}}
        size="lg"
      />,
    );
    expect(document.querySelector(".segmented")).toHaveClass("segmented--lg");
  });

  it("applique .segmented--subtle via la prop subtle", () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="week"
        onChange={() => {}}
        subtle
      />,
    );
    expect(document.querySelector(".segmented")).toHaveClass(
      "segmented--subtle",
    );
  });

  it("désactive l'option disabled (attribut natif)", () => {
    render(
      <SegmentedControl
        options={OPTIONS_WITH_DISABLED}
        value="a"
        onChange={() => {}}
      />,
    );
    const disabledItem = screen.getByText("B").closest("button");
    expect(disabledItem).toBeDisabled();
  });
});

describe("SegmentedControl — interaction souris", () => {
  it("clic sur une option appelle onChange avec sa valeur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl options={OPTIONS} value="week" onChange={onChange} />,
    );

    await user.click(screen.getByText("Mois"));

    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("clic sur une option disabled n'appelle pas onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={OPTIONS_WITH_DISABLED}
        value="a"
        onChange={onChange}
      />,
    );

    const disabledItem = screen
      .getByText("B")
      .closest("button") as HTMLButtonElement;
    await user.click(disabledItem);
    expect(onChange).not.toHaveBeenCalled();
  });
});

function ControlledHarness({ options }: { options: SegmentedControlOption[] }) {
  const [value, setValue] = useState(options[0].value);
  return (
    <SegmentedControl options={options} value={value} onChange={setValue} />
  );
}

describe("SegmentedControl — navigation clavier WAI-ARIA radiogroup", () => {
  it("ArrowRight déplace la sélection vers l'option suivante et le focus suit", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness options={OPTIONS} />);

    const first = screen.getByText("Semaine").closest("button") as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("Mois").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("ArrowLeft boucle vers la dernière option depuis la première", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness options={OPTIONS} />);

    const first = screen.getByText("Semaine").closest("button") as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByText("Annee").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("ArrowRight boucle vers la première option depuis la dernière", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness options={OPTIONS} />);

    const last = screen.getByText("Annee").closest("button") as HTMLElement;
    last.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("Semaine").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("ArrowDown/ArrowUp fonctionnent comme ArrowRight/ArrowLeft", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness options={OPTIONS} />);

    const first = screen.getByText("Semaine").closest("button") as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("Mois").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("Semaine").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("Home/End sautent au premier/dernier", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness options={OPTIONS} />);

    const first = screen.getByText("Semaine").closest("button") as HTMLElement;
    first.focus();
    await user.keyboard("{End}");
    expect(screen.getByText("Annee").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.keyboard("{Home}");
    expect(screen.getByText("Semaine").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("saute les options disabled lors de la navigation", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness options={OPTIONS_WITH_DISABLED} />);

    const first = screen.getByText("A").closest("button") as HTMLElement;
    first.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("C").closest("button")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("SegmentedControl — garde-fou roving tabindex (#743)", () => {
  it("value ne matche aucune option — la première option non disabled reçoit tabindex=0 sans devenir active", () => {
    render(
      <SegmentedControl
        options={OPTIONS_WITH_DISABLED}
        value="does-not-exist"
        onChange={() => {}}
      />,
    );

    const first = screen.getByText("A").closest("button") as HTMLElement;
    expect(first).toHaveAttribute("tabindex", "0");
    expect(first).toHaveAttribute("aria-checked", "false");
    expect(first).not.toHaveClass("active");

    const disabledOption = screen
      .getByText("B")
      .closest("button") as HTMLElement;
    const last = screen.getByText("C").closest("button") as HTMLElement;
    expect(disabledOption).toHaveAttribute("tabindex", "-1");
    expect(last).toHaveAttribute("tabindex", "-1");
  });

  it("value ne matche aucune option et la première option est disabled — le fallback saute à la première option activable", () => {
    const OPTIONS_FIRST_DISABLED: SegmentedControlOption[] = [
      { value: "a", label: "A", disabled: true },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
    ];
    render(
      <SegmentedControl
        options={OPTIONS_FIRST_DISABLED}
        value="does-not-exist"
        onChange={() => {}}
      />,
    );

    const disabledFirst = screen
      .getByText("A")
      .closest("button") as HTMLElement;
    const firstEnabled = screen.getByText("B").closest("button") as HTMLElement;
    expect(disabledFirst).toHaveAttribute("tabindex", "-1");
    expect(firstEnabled).toHaveAttribute("tabindex", "0");
    expect(firstEnabled).toHaveAttribute("aria-checked", "false");
  });

  it("toutes les options sont disabled — aucun tabindex=0, groupe inerte", () => {
    const ALL_DISABLED: SegmentedControlOption[] = [
      { value: "a", label: "A", disabled: true },
      { value: "b", label: "B", disabled: true },
    ];
    render(
      <SegmentedControl
        options={ALL_DISABLED}
        value="does-not-exist"
        onChange={() => {}}
      />,
    );

    document.querySelectorAll(".segmented-item").forEach((item) => {
      expect(item).toHaveAttribute("tabindex", "-1");
    });
  });
});

// ---------------------------------------------------------------------------
// #1016 — avant la 1re mesure, première mesure sans transition, recalage et
// resynchronisation ResizeObserver (A4 de #1021).
// ---------------------------------------------------------------------------

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnect = vi.fn();
  constructor(public callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  /** Déclenche le rappel comme le ferait le navigateur après un changement de taille. */
  fire() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe("SegmentedControl — avant la 1re mesure (#1016)", () => {
  it("le rendu serveur produit un indicateur SANS attribut style et un item .segmented-item.active", () => {
    // Le CSS DS (navigation.css) tient son repli sur ce marqueur : `.segmented-indicator:not([style*="width"])`.
    const html = renderToStaticMarkup(
      <SegmentedControl options={OPTIONS} value="month" onChange={() => {}} />,
    );
    const host = document.createElement("div");
    host.innerHTML = html;
    const indicator = host.querySelector(".segmented-indicator");
    expect(indicator).not.toBeNull();
    expect(indicator!.hasAttribute("style")).toBe(false);
    const active = host.querySelectorAll(".segmented-item.active");
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe("Mois");
  });
});

describe("SegmentedControl — mesure de l'indicateur (#1016)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.instances = [];
  });

  it("la 1re mesure porte `transition: none`, la suivante non", () => {
    const { container, rerender } = render(
      <SegmentedControl options={OPTIONS} value="week" onChange={() => {}} />,
    );
    const indicator = container.querySelector<HTMLElement>(
      ".segmented-indicator",
    )!;
    // Largeur posée (= mesurée) ET aucune transition : l'aplat d'avant mesure passe la main sans glissade.
    expect(indicator.style.width).not.toBe("");
    expect(indicator.style.transition).toBe("none");

    rerender(
      <SegmentedControl options={OPTIONS} value="month" onChange={() => {}} />,
    );
    // 2e mesure : la transition du CSS DS s'applique de nouveau (aucun `transition` inline).
    expect(indicator.style.transition).toBe("");
    expect(indicator.style.width).not.toBe("");
  });

  it("recale l'indicateur : translateX(item.offsetLeft - indicator.offsetLeft), pas la position absolue", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="month" onChange={() => {}} />,
    );
    const indicator = container.querySelector<HTMLElement>(
      ".segmented-indicator",
    )!;
    const active = container.querySelector<HTMLElement>(
      ".segmented-item.active",
    )!;
    // jsdom ne fait aucune mise en page : on fixe la géométrie. L'indicateur est posé à left: 3px et
    // offsetLeft de l'item compte déjà ces 3 px de padding.
    Object.defineProperty(indicator, "offsetLeft", {
      value: 3,
      configurable: true,
    });
    Object.defineProperty(active, "offsetLeft", {
      value: 50,
      configurable: true,
    });
    act(() => FakeResizeObserver.instances[0].fire());
    expect(indicator.style.transform).toBe("translateX(47px)");
  });

  it("un ResizeObserver déclenché après un changement de taille de l'item actif remet à jour la largeur", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="month" onChange={() => {}} />,
    );
    const indicator = container.querySelector<HTMLElement>(
      ".segmented-indicator",
    )!;
    const active = container.querySelector<HTMLElement>(
      ".segmented-item.active",
    )!;
    expect(FakeResizeObserver.instances).toHaveLength(1);
    // Les items sont observés, jamais l'indicateur : aucune boucle d'observation possible.
    const observed = FakeResizeObserver.instances[0].observed;
    expect(observed).toHaveLength(OPTIONS.length);
    expect(observed).not.toContain(indicator);

    // Swap de police : l'item actif s'élargit sans que value ni options changent.
    Object.defineProperty(active, "offsetWidth", {
      value: 120,
      configurable: true,
    });
    act(() => FakeResizeObserver.instances[0].fire());
    expect(indicator.style.width).toBe("120px");
  });

  it("déconnecte le ResizeObserver au démontage", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { unmount } = render(
      <SegmentedControl options={OPTIONS} value="month" onChange={() => {}} />,
    );
    const observer = FakeResizeObserver.instances[0];
    expect(observer.disconnect).not.toHaveBeenCalled();
    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it("sans ResizeObserver (SSR, jsdom ancien), le composant se monte sans erreur", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    expect(() =>
      render(
        <SegmentedControl options={OPTIONS} value="week" onChange={() => {}} />,
      ),
    ).not.toThrow();
  });
});
