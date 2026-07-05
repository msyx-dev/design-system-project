import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { SegmentedControl, SegmentedControlOption } from "./SegmentedControl";

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

    const items = document.querySelectorAll(".segmented-item");
    expect(items).toHaveLength(3);
    items.forEach((item) => expect(item).toHaveAttribute("role", "radio"));
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
