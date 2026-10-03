import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import {
  SegmentedControl,
  SegmentedControlLinkOption,
  SegmentedControlOption,
} from "./SegmentedControl";
import { act } from "@testing-library/react";
import { afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
// ---------------------------------------------------------------------------
// #1016 (T3) — mode « liens » : as="link" -> <nav> + <a href>
// ---------------------------------------------------------------------------

// Hrefs en hash : jsdom implémente les changements de hash, pas la navigation complète (un clic non
// intercepté sur un autre href journalise « Not implemented: navigation »).
const LINK_OPTIONS: SegmentedControlLinkOption[] = [
  { value: "tous", label: "Tous", href: "#tous" },
  { value: "actifs", label: "Actifs", href: "#actifs" },
  { value: "archives", label: "Archives", href: "#archives" },
];

const LINK_OPTIONS_WITH_DISABLED: SegmentedControlLinkOption[] = [
  { value: "tous", label: "Tous", href: "#tous" },
  { value: "recents", label: "Récents", href: "#recents" },
  { value: "archives", label: "Archivés", href: "#archives", disabled: true },
];

/** Clic « brut » : on maîtrise le bouton et les modificateurs, et on lit `defaultPrevented` après coup. */
function click(target: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe("SegmentedControl — mode liens : balisage (#1016)", () => {
  it("rend nav.segmented[aria-label] > a.segmented-item[href], jamais un radiogroup", () => {
    const { container } = render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        label="Filtrer par état"
      />,
    );

    const nav = container.querySelector("nav.segmented");
    expect(nav).not.toBeNull();
    expect(nav).toHaveAttribute("aria-label", "Filtrer par état");
    expect(container.querySelector("div.segmented")).toBeNull();

    const items = container.querySelectorAll(
      "nav.segmented > a.segmented-item",
    );
    expect(items).toHaveLength(3);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    items.forEach((item, i) =>
      expect(item).toHaveAttribute("href", LINK_OPTIONS[i].href),
    );
    // Premier enfant de la <nav> : l'indicateur, caché aux lecteurs d'écran.
    expect(nav!.firstElementChild).toHaveClass("segmented-indicator");
    expect(nav!.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("n'émet ni role, ni aria-checked, ni tabindex (Tab et Entrée sont natifs)", () => {
    const { container } = render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS_WITH_DISABLED}
        value="tous"
        label="Filtrer"
      />,
    );
    expect(container.querySelector("[role]")).toBeNull();
    expect(container.querySelector("[aria-checked]")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });

  it('marque le lien courant .active + aria-current="page" ; les autres n\'ont aucun aria-current', () => {
    const { container } = render(
      <SegmentedControl as="link" options={LINK_OPTIONS} value="actifs" />,
    );
    const items = container.querySelectorAll<HTMLAnchorElement>("a");
    expect(items[1]).toHaveClass("segmented-item", "active");
    expect(items[1]).toHaveAttribute("aria-current", "page");
    for (const other of [items[0], items[2]]) {
      expect(other).toHaveClass("segmented-item");
      expect(other).not.toHaveClass("active");
      expect(other).not.toHaveAttribute("aria-current");
    }
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("value hors options : aucun lien courant, ni .active ni aria-current", () => {
    const { container } = render(
      <SegmentedControl as="link" options={LINK_OPTIONS} value="inconnu" />,
    );
    expect(container.querySelector(".active")).toBeNull();
    expect(container.querySelector("[aria-current]")).toBeNull();
  });

  it('option désactivée : aria-disabled="true", aucun href, jamais courante', () => {
    const { container } = render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS_WITH_DISABLED}
        value="tous"
      />,
    );
    const disabled = screen.getByText("Archivés");
    expect(disabled.tagName).toBe("A");
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    expect(disabled).not.toHaveAttribute("href");
    expect(disabled).not.toHaveAttribute("aria-current");
    expect(disabled).not.toHaveAttribute("tabindex");
    expect(disabled).toHaveClass("segmented-item");
    // Les options activables, elles, gardent leur href et n'ont pas aria-disabled.
    expect(screen.getByText("Récents")).toHaveAttribute("href", "#recents");
    expect(screen.getByText("Récents")).not.toHaveAttribute("aria-disabled");
    expect(container.querySelectorAll("[aria-disabled]")).toHaveLength(1);
  });

  it("une option désactivée désignée par value n'est ni .active ni aria-current", () => {
    const { container } = render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS_WITH_DISABLED}
        value="archives"
      />,
    );
    expect(container.querySelector(".active")).toBeNull();
    expect(container.querySelector("[aria-current]")).toBeNull();
  });

  it("applique size, subtle et className sur la <nav>", () => {
    const { container, rerender } = render(
      <SegmentedControl as="link" options={LINK_OPTIONS} value="tous" />,
    );
    const nav = container.querySelector("nav")!;
    expect(nav.className).toBe("segmented");
    expect(nav).not.toHaveAttribute("aria-label");

    rerender(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        size="sm"
        subtle
        className="ma-classe"
      />,
    );
    expect(nav.className).toBe(
      "segmented segmented--sm segmented--subtle ma-classe",
    );
    rerender(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        size="lg"
      />,
    );
    expect(nav.className).toBe("segmented segmented--lg");
  });

  it('as="button" explicite rend le radiogroup, comme sans `as`', () => {
    const { container } = render(
      <SegmentedControl
        as="button"
        options={OPTIONS}
        value="week"
        onChange={() => {}}
      />,
    );
    expect(container.querySelector("div.segmented")).toHaveAttribute(
      "role",
      "radiogroup",
    );
    expect(container.querySelector("nav")).toBeNull();
  });
});

describe("SegmentedControl — mode liens : interception progressive (#1016, A5)", () => {
  it("clic gauche simple sur un autre lien : preventDefault puis onChange(value)", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        onChange={onChange}
      />,
    );
    const event = click(screen.getByText("Actifs"));
    expect(event.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("actifs");
  });

  it("Entrée au clavier (clic synthétique, button 0) est interceptée comme un clic", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    await user.tab();
    await user.tab();
    expect(screen.getByText("Actifs")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("actifs");
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Meta", { metaKey: true }],
    ["Maj", { shiftKey: true }],
    ["Alt", { altKey: true }],
    ["clic milieu", { button: 1 }],
    ["clic droit", { button: 2 }],
  ])(
    "%s + clic : navigation native, ni preventDefault ni onChange",
    (_, init) => {
      const onChange = vi.fn();
      render(
        <SegmentedControl
          as="link"
          options={LINK_OPTIONS}
          value="tous"
          onChange={onChange}
        />,
      );
      const event = click(screen.getByText("Actifs"), init);
      expect(event.defaultPrevented).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("sans onChange : le clic n'est pas empêché (navigation native)", () => {
    render(<SegmentedControl as="link" options={LINK_OPTIONS} value="tous" />);
    const event = click(screen.getByText("Actifs"));
    expect(event.defaultPrevented).toBe(false);
  });

  it("clic sur le lien courant : onChange n'est pas appelé", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        onChange={onChange}
      />,
    );
    const event = click(screen.getByText("Tous"));
    expect(onChange).not.toHaveBeenCalled();
    // L'appelant a pris la main sur la navigation : recharger la page courante serait surprenant.
    expect(event.defaultPrevented).toBe(true);
  });

  it("un clic déjà traité (defaultPrevented) n'appelle pas onChange", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        onChange={onChange}
      />,
    );
    // Écouteur de capture posé sur la <nav> : il s'exécute avant le gestionnaire React du lien.
    container
      .querySelector("nav")!
      .addEventListener("click", (e) => e.preventDefault(), true);
    click(screen.getByText("Actifs"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("une option désactivée n'appelle jamais onChange", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS_WITH_DISABLED}
        value="tous"
        onChange={onChange}
      />,
    );
    click(screen.getByText("Archivés"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ne capte aucune touche de navigation (pas d'onKeyDown, pas de roving tabindex)", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByText("Tous")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Tous")).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SegmentedControl — mode liens : indicateur (#1016)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeResizeObserver.instances = [];
  });

  it("mesure l'indicateur sur le lien courant, 1re mesure sans transition", () => {
    const { container, rerender } = render(
      <SegmentedControl as="link" options={LINK_OPTIONS} value="tous" />,
    );
    const indicator = container.querySelector<HTMLElement>(
      ".segmented-indicator",
    )!;
    expect(indicator.style.width).not.toBe("");
    expect(indicator.style.transition).toBe("none");
    rerender(
      <SegmentedControl as="link" options={LINK_OPTIONS} value="actifs" />,
    );
    expect(indicator.style.transition).toBe("");
  });

  it("recale par l'écart offsetLeft et suit un ResizeObserver, comme en mode bouton", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { container } = render(
      <SegmentedControl as="link" options={LINK_OPTIONS} value="actifs" />,
    );
    const indicator = container.querySelector<HTMLElement>(
      ".segmented-indicator",
    )!;
    const active = container.querySelector<HTMLElement>("a.active")!;
    Object.defineProperty(indicator, "offsetLeft", {
      value: 3,
      configurable: true,
    });
    Object.defineProperty(active, "offsetLeft", {
      value: 50,
      configurable: true,
    });
    Object.defineProperty(active, "offsetWidth", {
      value: 90,
      configurable: true,
    });
    act(() => FakeResizeObserver.instances[0].fire());
    expect(indicator.style.transform).toBe("translateX(47px)");
    expect(indicator.style.width).toBe("90px");
    // Les liens sont observés, jamais l'indicateur.
    expect(FakeResizeObserver.instances[0].observed).toHaveLength(3);
    expect(FakeResizeObserver.instances[0].observed).not.toContain(indicator);
  });

  it("aucun lien courant : l'indicateur reste sans style (donc masqué par le CSS DS)", () => {
    const { container } = render(
      <SegmentedControl as="link" options={LINK_OPTIONS} value="inconnu" />,
    );
    expect(
      container.querySelector(".segmented-indicator")!.hasAttribute("style"),
    ).toBe(false);
  });

  it("une option désactivée désignée par value ne reçoit pas l'indicateur", () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const { container } = render(
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS_WITH_DISABLED}
        value="archives"
      />,
    );
    expect(
      container.querySelector(".segmented-indicator")!.hasAttribute("style"),
    ).toBe(false);
    // Seuls les 2 liens activables sont observés.
    expect(FakeResizeObserver.instances[0].observed).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Recollement (#1016, critère 9) : le rendu serveur React reproduit le balisage de la vitrine
// `pages/composants.html` #segmented-links, classes, attributs et ordre compris. La vitrine est la
// référence ; si l'un des deux bouge, ce test casse.
// ---------------------------------------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url));

/** Seule normalisation admise : les espaces entre balises (l'indentation de la page). */
const normalize = (html: string) => html.replace(/>\s+</g, "><").trim();

function vitrineNavs(): string[] {
  const page = readFileSync(
    path.resolve(here, "../../../../../pages/composants.html"),
    "utf8",
  );
  const section = page.match(
    /<section id="segmented-links">[\s\S]*?<\/section>/,
  );
  if (!section) throw new Error("section #segmented-links introuvable");
  return (section[0].match(/<nav[\s\S]*?<\/nav>/g) ?? []).map(normalize);
}

describe("SegmentedControl — recollement avec la vitrine #segmented-links (#1016)", () => {
  const navs = vitrineNavs();

  it("la vitrine porte les 3 démos attendues", () => {
    expect(navs).toHaveLength(3);
  });

  it("« Filtrer par état » — Tous/Actifs/Archives, défaut", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        as="link"
        label="Filtrer par état"
        value="tous"
        options={[
          {
            value: "tous",
            label: "Tous",
            href: "?filtre=tous#segmented-links",
          },
          {
            value: "actifs",
            label: "Actifs",
            href: "?filtre=actifs#segmented-links",
          },
          {
            value: "archives",
            label: "Archives",
            href: "?filtre=archives#segmented-links",
          },
        ]}
      />,
    );
    expect(normalize(html)).toBe(navs[0]);
  });

  it("« Afficher la période » — 7j/30j/90j, --subtle", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        as="link"
        subtle
        label="Afficher la période"
        value="7j"
        options={[
          { value: "7j", label: "7j", href: "?periode=7j#segmented-links" },
          { value: "30j", label: "30j", href: "?periode=30j#segmented-links" },
          { value: "90j", label: "90j", href: "?periode=90j#segmented-links" },
        ]}
      />,
    );
    expect(normalize(html)).toBe(navs[1]);
  });

  it("« Filtrer les exports » — Tous/Récents + Archivés désactivé sans href", () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        as="link"
        label="Filtrer les exports"
        value="tous"
        options={[
          {
            value: "tous",
            label: "Tous",
            href: "?export=tous#segmented-links",
          },
          {
            value: "recents",
            label: "Récents",
            href: "?export=recents#segmented-links",
          },
          {
            value: "archives",
            label: "Archivés",
            href: "?export=archives#segmented-links",
            disabled: true,
          },
        ]}
      />,
    );
    expect(normalize(html)).toBe(navs[2]);
  });
});

// ---------------------------------------------------------------------------
// Types (#1016, A4) : union discriminée sur `as`. Vérifié par `tsc --noEmit` (seul contrôle qui type
// les *.test.tsx) ; le corps ne s'exécute que pour garder le fichier vivant côté vitest.
// `@ts-expect-error` est posé juste avant la ligne JSX en cause.
// ---------------------------------------------------------------------------

describe("SegmentedControl — types de l'union discriminée (#1016)", () => {
  it('l\'API existante compile telle quelle ; as="link" exige href ; onChange reste requis hors mode liens', () => {
    // Appelants existants : aucun `as`, `onChange` requis.
    const existing = (
      <SegmentedControl options={OPTIONS} value="week" onChange={() => {}} />
    );
    const explicitButton = (
      <SegmentedControl
        as="button"
        options={OPTIONS}
        value="week"
        onChange={() => {}}
      />
    );
    // Mode liens : `onChange` optionnel, `href` requis sur chaque option.
    const linkNoHandler = (
      <SegmentedControl as="link" options={LINK_OPTIONS} value="tous" />
    );
    const linkWithHandler = (
      <SegmentedControl
        as="link"
        options={LINK_OPTIONS}
        value="tous"
        onChange={(v: string) => void v}
      />
    );
    const linkWithoutHref = (
      // @ts-expect-error — une option sans `href` est refusée en mode liens
      <SegmentedControl as="link" options={OPTIONS} value="week" />
    );
    // @ts-expect-error — `onChange` reste obligatoire hors mode liens (appelants existants)
    const buttonNoHandler = <SegmentedControl options={OPTIONS} value="week" />;
    expect([
      existing,
      explicitButton,
      linkNoHandler,
      linkWithHandler,
      linkWithoutHref,
      buttonNoHandler,
    ]).toHaveLength(6);
  });
});
