import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ColorInput, ColorInputProps } from "./ColorInput";

/** Wrapper contrôlé — reflète les mises à jour d'état comme un vrai consumer. */
function ControlledColorInput(
  props: Partial<Omit<ColorInputProps, "value" | "onChange">> & {
    onChange?: ColorInputProps["onChange"];
    initialValue?: string;
  },
) {
  const { initialValue = "#3b82f6", onChange, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return (
    <ColorInput
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const PRESETS = [
  { color: "#22c55e", label: "Vert" },
  { color: "#3b82f6", label: "Bleu" },
  { color: "#f59e0b", label: "Orange" },
  { color: "#ef4444", label: "Rouge" },
];

/** jsdom normalise `background: <hex>` en `rgb(r, g, b)` — convertit pour comparer. */
function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

afterEach(() => {
  cleanup();
});

describe("ColorInput — structure", () => {
  it("rend le markup canonique .input-group/.color-input/input[type=color]/.color-input-value", () => {
    render(<ColorInput value="#3b82f6" onChange={() => {}} />);

    expect(document.querySelector(".input-group")).toBeInTheDocument();
    const wrap = document.querySelector(".color-input");
    expect(wrap).toBeInTheDocument();
    const input = document.querySelector('input[type="color"]');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("#3b82f6");
    const valueLabel = document.querySelector(".color-input-value");
    expect(valueLabel).toBeInTheDocument();
  });

  it("affiche le hex courant en MAJUSCULES dans .color-input-value", () => {
    render(<ColorInput value="#3b82f6" onChange={() => {}} />);
    expect(document.querySelector(".color-input-value")?.textContent).toBe(
      "#3B82F6",
    );
  });

  it("affiche .input-label lié au champ via htmlFor quand label fourni", () => {
    render(
      <ColorInput
        value="#3b82f6"
        onChange={() => {}}
        label="Couleur d'accent"
      />,
    );
    const label = document.querySelector(".input-label");
    const input = document.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement;
    expect(label).toHaveTextContent("Couleur d'accent");
    expect(label).toHaveAttribute("for", input.id);
  });

  it("n'affiche pas .color-input-value quand showValue est false", () => {
    render(
      <ColorInput value="#3b82f6" onChange={() => {}} showValue={false} />,
    );
    expect(document.querySelector(".color-input-value")).not.toBeInTheDocument();
  });

  it("n'affiche pas la rangée de presets quand presets est absent", () => {
    render(<ColorInput value="#3b82f6" onChange={() => {}} />);
    expect(document.querySelector(".color-swatch")).not.toBeInTheDocument();
  });

  it("n'affiche pas la rangée de presets quand presets est un tableau vide", () => {
    render(<ColorInput value="#3b82f6" onChange={() => {}} presets={[]} />);
    expect(document.querySelector(".color-swatch")).not.toBeInTheDocument();
  });
});

describe("ColorInput — changement natif", () => {
  it("appelle onChange avec le hex natif au changement du picker", () => {
    const handleChange = vi.fn();
    render(<ColorInput value="#3b82f6" onChange={handleChange} />);
    const input = document.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "#22c55e" } });

    expect(handleChange).toHaveBeenCalledWith("#22c55e");
  });

  it("reflète la nouvelle valeur en MAJUSCULES après un changement contrôlé", () => {
    render(<ControlledColorInput initialValue="#3b82f6" />);
    const input = document.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "#22c55e" } });

    expect(document.querySelector(".color-input-value")?.textContent).toBe(
      "#22C55E",
    );
  });
});

describe("ColorInput — presets", () => {
  it("rend un .color-swatch par preset avec data-color + aria-label", () => {
    render(
      <ColorInput value="#22c55e" onChange={() => {}} presets={PRESETS} />,
    );
    const swatches = document.querySelectorAll(".color-swatch");
    expect(swatches).toHaveLength(4);
    expect(swatches[0]).toHaveAttribute("data-color", "#22c55e");
    expect(swatches[0]).toHaveAttribute("aria-label", "Vert");
  });

  it("CRITIQUE — chaque .color-swatch porte un style inline background = sa couleur (piège FileUpload .progress-fill)", () => {
    render(
      <ColorInput value="#22c55e" onChange={() => {}} presets={PRESETS} />,
    );
    const swatches = document.querySelectorAll(".color-swatch");
    PRESETS.forEach((preset, index) => {
      const swatch = swatches[index] as HTMLElement;
      expect(swatch.style.background).toBeTruthy();
      expect(swatch.style.background).toBe(hexToRgb(preset.color));
    });
  });

  it("pose aria-pressed=true sur le preset dont la couleur correspond à value (comparaison uppercase)", () => {
    render(
      <ColorInput value="#22c55e" onChange={() => {}} presets={PRESETS} />,
    );
    const swatches = document.querySelectorAll(".color-swatch");
    expect(swatches[0]).toHaveAttribute("aria-pressed", "true");
    expect(swatches[1]).toHaveAttribute("aria-pressed", "false");
    expect(swatches[2]).toHaveAttribute("aria-pressed", "false");
    expect(swatches[3]).toHaveAttribute("aria-pressed", "false");
  });

  it("compare value et preset.color en MAJUSCULES (value en casse mixte matche un preset minuscule)", () => {
    render(
      <ColorInput value="#22C55E" onChange={() => {}} presets={PRESETS} />,
    );
    const swatches = document.querySelectorAll(".color-swatch");
    expect(swatches[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("appelle onChange avec le hex du preset au clic", () => {
    const handleChange = vi.fn();
    render(
      <ColorInput
        value="#22c55e"
        onChange={handleChange}
        presets={PRESETS}
      />,
    );
    const swatches = document.querySelectorAll(".color-swatch");

    fireEvent.click(swatches[1]);

    expect(handleChange).toHaveBeenCalledWith("#3b82f6");
  });

  it("le clic sur un preset met à jour le preset actif (aria-pressed) en mode contrôlé", () => {
    render(<ControlledColorInput initialValue="#22c55e" presets={PRESETS} />);
    const swatches = document.querySelectorAll(".color-swatch");

    fireEvent.click(swatches[1]);

    const swatchesAfter = document.querySelectorAll(".color-swatch");
    expect(swatchesAfter[0]).toHaveAttribute("aria-pressed", "false");
    expect(swatchesAfter[1]).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ColorInput — désactivé", () => {
  it("pose .color-input--disabled sur le wrapper", () => {
    render(<ColorInput value="#3b82f6" onChange={() => {}} disabled />);
    expect(document.querySelector(".color-input")).toHaveClass(
      "color-input--disabled",
    );
  });

  it("pose l'attribut natif disabled sur l'input", () => {
    render(<ColorInput value="#3b82f6" onChange={() => {}} disabled />);
    expect(document.querySelector('input[type="color"]')).toBeDisabled();
  });

  it("désactive aussi les presets natifs", () => {
    render(
      <ColorInput
        value="#22c55e"
        onChange={() => {}}
        presets={PRESETS}
        disabled
      />,
    );
    document.querySelectorAll(".color-swatch").forEach((swatch) => {
      expect(swatch).toBeDisabled();
    });
  });

  it("n'ajoute pas .color-input--disabled par défaut", () => {
    render(<ColorInput value="#3b82f6" onChange={() => {}} />);
    expect(document.querySelector(".color-input")).not.toHaveClass(
      "color-input--disabled",
    );
  });
});

describe("ColorInput — className", () => {
  it("ajoute className sur .color-input (pas sur .input-group)", () => {
    render(
      <ColorInput
        value="#3b82f6"
        onChange={() => {}}
        className="custom-class"
      />,
    );
    expect(document.querySelector(".color-input")).toHaveClass(
      "custom-class",
    );
    expect(document.querySelector(".input-group")).not.toHaveClass(
      "custom-class",
    );
  });
});
