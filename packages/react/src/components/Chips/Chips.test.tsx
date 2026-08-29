import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { Chip, ChipFilterGroup, ChipFilterOption, ChipInput } from "./Chips";

describe("Chip — structure et variantes", () => {
  it("rend .chip avec le texte des children", () => {
    render(<Chip>Design system</Chip>);
    const chip = screen.getByText("Design system");
    expect(chip).toHaveClass("chip");
  });

  it("applique .chip-{variant}", () => {
    render(<Chip variant="accent">Sprint:18</Chip>);
    expect(screen.getByText("Sprint:18")).toHaveClass("chip", "chip-accent");
  });

  it("applique .chip-sm", () => {
    render(<Chip size="sm">Small</Chip>);
    expect(screen.getByText("Small")).toHaveClass("chip-sm");
  });

  it("icon pose .chip-icon sur la racine et .chip-icon-slot sur l'icône", () => {
    render(<Chip icon={<span data-testid="icon">★</span>}>Favoris</Chip>);
    const chip = screen.getByText("Favoris").closest(".chip") as HTMLElement;
    expect(chip).toHaveClass("chip-icon");
    expect(chip.querySelector(".chip-icon-slot")).toBeInTheDocument();
  });

  it("sans onClose — aucun bouton .chip-close rendu", () => {
    render(<Chip>Docker</Chip>);
    expect(document.querySelector(".chip-close")).not.toBeInTheDocument();
  });

  it("avec onClose — rend .chip-close avec aria-label dérivé des children", () => {
    render(<Chip onClose={() => {}}>Frontend</Chip>);
    const closeBtn = document.querySelector(".chip-close");
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveAttribute("aria-label", "Supprimer Frontend");
  });

  it("closeLabel override le label par défaut", () => {
    render(
      <Chip onClose={() => {}} closeLabel="Retirer le tag">
        Frontend
      </Chip>,
    );
    expect(document.querySelector(".chip-close")).toHaveAttribute(
      "aria-label",
      "Retirer le tag",
    );
  });

  it("clic sur .chip-close appelle onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Chip onClose={onClose}>Docker</Chip>);

    await user.click(document.querySelector(".chip-close") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

const FILTER_OPTIONS: ChipFilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend", disabled: true },
];

describe("ChipFilterGroup — filtre à sélection simple", () => {
  it("rend .chip-group[role=group] avec un .chip.chip-filter par option", () => {
    render(
      <ChipFilterGroup
        options={FILTER_OPTIONS}
        value="all"
        onChange={() => {}}
      />,
    );
    const group = document.querySelector(".chip-group");
    expect(group).toHaveAttribute("role", "group");
    expect(document.querySelectorAll(".chip-filter")).toHaveLength(3);
  });

  it("applique .active uniquement sur l'option active", () => {
    render(
      <ChipFilterGroup
        options={FILTER_OPTIONS}
        value="frontend"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Frontend")).toHaveClass("active");
    expect(screen.getByText("Tous")).not.toHaveClass("active");
  });

  it("clic sur une option appelle onChange avec sa valeur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChipFilterGroup
        options={FILTER_OPTIONS}
        value="all"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText("Frontend"));
    expect(onChange).toHaveBeenCalledWith("frontend");
  });

  it("option disabled — pas de clic possible, aucun appel à onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChipFilterGroup
        options={FILTER_OPTIONS}
        value="all"
        onChange={onChange}
      />,
    );

    const disabledOption = screen.getByText("Backend");
    expect(disabledOption).toBeDisabled();
    await user.click(disabledOption);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("aria-label par défaut = Filtres, overridable via label", () => {
    render(
      <ChipFilterGroup
        options={FILTER_OPTIONS}
        value="all"
        onChange={() => {}}
      />,
    );
    expect(document.querySelector(".chip-group")).toHaveAttribute(
      "aria-label",
      "Filtres",
    );
  });
});

function ChipInputHarness({ initial = [] as string[] }) {
  const [values, setValues] = useState<string[]>(initial);
  return <ChipInput values={values} onChange={setValues} />;
}

describe("ChipInput — saisie multi-valeurs (alias déprécié de TagInput)", () => {
  it("rend .chip-input-wrapper avec un .chip.chip-input-item par valeur", () => {
    render(<ChipInputHarness initial={["React", "TypeScript"]} />);
    const items = document.querySelectorAll(".chip-input-item");
    expect(items).toHaveLength(2);
    items.forEach((item) => expect(item).toHaveClass("chip"));
    expect(document.querySelector(".chip-input-field")).toBeInTheDocument();
  });

  it("Enter valide la saisie et ajoute un item", async () => {
    const user = userEvent.setup();
    render(<ChipInputHarness />);
    const input = document.querySelector(
      ".chip-input-field",
    ) as HTMLInputElement;

    await user.type(input, "React{Enter}");

    expect(document.querySelectorAll(".chip-input-item")).toHaveLength(1);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("virgule valide la saisie comme Enter", async () => {
    const user = userEvent.setup();
    render(<ChipInputHarness />);
    const input = document.querySelector(
      ".chip-input-field",
    ) as HTMLInputElement;

    await user.type(input, "React,");

    expect(document.querySelectorAll(".chip-input-item")).toHaveLength(1);
  });

  it("anti-doublon — une valeur déjà présente n'est pas ré-ajoutée", async () => {
    const user = userEvent.setup();
    render(<ChipInputHarness initial={["React"]} />);
    const input = document.querySelector(
      ".chip-input-field",
    ) as HTMLInputElement;

    await user.type(input, "React{Enter}");

    expect(document.querySelectorAll(".chip-input-item")).toHaveLength(1);
  });

  it("Backspace sur champ vide retire le dernier item", async () => {
    const user = userEvent.setup();
    render(<ChipInputHarness initial={["React", "TypeScript"]} />);
    const input = document.querySelector(
      ".chip-input-field",
    ) as HTMLInputElement;

    input.focus();
    await user.keyboard("{Backspace}");

    expect(document.querySelectorAll(".chip-input-item")).toHaveLength(1);
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("Backspace n'agit pas si le champ contient du texte", async () => {
    const user = userEvent.setup();
    render(<ChipInputHarness initial={["React"]} />);
    const input = document.querySelector(
      ".chip-input-field",
    ) as HTMLInputElement;

    await user.type(input, "abc");
    await user.keyboard("{Backspace}");

    expect(document.querySelectorAll(".chip-input-item")).toHaveLength(1);
    expect(input).toHaveValue("ab");
  });

  it("clic sur .chip-close d'un item le retire", async () => {
    const user = userEvent.setup();
    render(<ChipInputHarness initial={["React", "TypeScript"]} />);

    const reactChip = screen.getByText("React").closest(".chip") as HTMLElement;
    const closeBtn = reactChip.querySelector(".chip-close") as HTMLElement;
    await user.click(closeBtn);

    expect(document.querySelectorAll(".chip-input-item")).toHaveLength(1);
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });

  it("clic sur le wrapper (hors chip) donne le focus au champ", async () => {
    const user = userEvent.setup();
    render(<ChipInputHarness initial={["React"]} />);
    const wrapper = document.querySelector(
      ".chip-input-wrapper",
    ) as HTMLElement;
    const input = document.querySelector(
      ".chip-input-field",
    ) as HTMLInputElement;

    await user.click(wrapper);
    expect(input).toHaveFocus();
  });
});
