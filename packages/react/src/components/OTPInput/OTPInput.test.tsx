import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { OTPInput, OTPInputProps } from "./OTPInput";

/** Wrapper contrôlé — reflète les mises à jour d'état comme un vrai consumer. */
function ControlledOTPInput(
  props: Partial<Omit<OTPInputProps, "value" | "onChange">> & {
    onChange?: OTPInputProps["onChange"];
    onComplete?: OTPInputProps["onComplete"];
    initialValue?: string;
  },
) {
  const { initialValue = "", onChange, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return (
    <OTPInput
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

function digits(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll(".otp-digit"));
}

afterEach(() => {
  cleanup();
});

describe("OTPInput — structure", () => {
  it("rend .otp-group avec 6 .otp-digit par défaut", () => {
    render(<OTPInput value="" onChange={() => {}} />);
    expect(document.querySelector(".otp-group")).toBeInTheDocument();
    expect(digits()).toHaveLength(6);
  });

  it("respecte la prop length (4 cases)", () => {
    render(<OTPInput value="" onChange={() => {}} length={4} />);
    expect(digits()).toHaveLength(4);
  });

  it("chaque case a maxlength=1, inputmode=numeric, pattern=[0-9] et le bon aria-label", () => {
    render(<OTPInput value="" onChange={() => {}} length={3} />);
    const inputs = digits();
    inputs.forEach((input, i) => {
      expect(input).toHaveAttribute("maxlength", "1");
      expect(input).toHaveAttribute("inputmode", "numeric");
      expect(input).toHaveAttribute("pattern", "[0-9]");
      expect(input).toHaveAttribute("aria-label", `Chiffre ${i + 1}`);
      expect(input.tagName).toBe("INPUT");
      expect(input).toHaveAttribute("type", "text");
    });
  });

  it("autocomplete = one-time-code UNIQUEMENT sur la 1ère case, off sur les autres", () => {
    render(<OTPInput value="" onChange={() => {}} length={4} />);
    const inputs = digits();
    expect(inputs[0]).toHaveAttribute("autocomplete", "one-time-code");
    expect(inputs[1]).toHaveAttribute("autocomplete", "off");
    expect(inputs[2]).toHaveAttribute("autocomplete", "off");
    expect(inputs[3]).toHaveAttribute("autocomplete", "off");
  });

  it("pose l'aria-label fourni sur .otp-group", () => {
    render(
      <OTPInput value="" onChange={() => {}} ariaLabel="Code à 6 chiffres" />,
    );
    expect(document.querySelector(".otp-group")).toHaveAttribute(
      "aria-label",
      "Code à 6 chiffres",
    );
  });
});

describe("OTPInput — état critique : .otp-digit.filled", () => {
  it("dérive .filled par case depuis value[i] non vide (pré-rempli partiel)", () => {
    render(<OTPInput value="42" onChange={() => {}} length={4} />);
    const inputs = digits();
    expect(inputs[0]).toHaveClass("filled");
    expect(inputs[1]).toHaveClass("filled");
    expect(inputs[2]).not.toHaveClass("filled");
    expect(inputs[3]).not.toHaveClass("filled");
  });

  it("aucune case .filled quand value est vide", () => {
    render(<OTPInput value="" onChange={() => {}} length={4} />);
    digits().forEach((input) => expect(input).not.toHaveClass("filled"));
  });

  it("toutes les cases .filled quand value est complète", () => {
    render(<OTPInput value="1234" onChange={() => {}} length={4} />);
    digits().forEach((input) => expect(input).toHaveClass("filled"));
  });

  it("retire .filled quand la case est effacée (Backspace sur case pleine)", () => {
    const handleChange = vi.fn();
    render(
      <ControlledOTPInput
        initialValue="12"
        length={4}
        onChange={handleChange}
      />,
    );
    const inputs = digits();
    inputs[1].focus();
    fireEvent.keyDown(inputs[1], { key: "Backspace" });

    expect(handleChange).toHaveBeenCalledWith("1");
    const updated = digits();
    expect(updated[0]).toHaveClass("filled");
    expect(updated[1]).not.toHaveClass("filled");
  });
});

describe("OTPInput — saisie et auto-advance", () => {
  it("saisir un chiffre appelle onChange avec la valeur mise à jour et avance le focus", () => {
    const handleChange = vi.fn();
    render(<ControlledOTPInput length={4} onChange={handleChange} />);
    const inputs = digits();

    fireEvent.change(inputs[0], { target: { value: "4" } });

    expect(handleChange).toHaveBeenCalledWith("4");
    expect(document.activeElement).toBe(digits()[1]);
  });

  it("sanitize : ne garde que des chiffres, et le dernier caractère si plusieurs", () => {
    const handleChange = vi.fn();
    render(<ControlledOTPInput length={4} onChange={handleChange} />);
    const inputs = digits();

    fireEvent.change(inputs[0], { target: { value: "a7b" } });

    expect(handleChange).toHaveBeenCalledWith("7");
  });

  it("saisir séquentiellement jusqu'à length déclenche onComplete avec la valeur complète", () => {
    const handleComplete = vi.fn();
    render(
      <ControlledOTPInput length={3} onComplete={handleComplete} />,
    );
    let inputs = digits();

    fireEvent.change(inputs[0], { target: { value: "1" } });
    inputs = digits();
    fireEvent.change(inputs[1], { target: { value: "2" } });
    inputs = digits();
    fireEvent.change(inputs[2], { target: { value: "3" } });

    expect(handleComplete).toHaveBeenCalledWith("123");
  });

  it("n'appelle PAS onComplete tant que toutes les cases ne sont pas remplies", () => {
    const handleComplete = vi.fn();
    render(<ControlledOTPInput length={3} onComplete={handleComplete} />);
    const inputs = digits();

    fireEvent.change(inputs[0], { target: { value: "1" } });

    expect(handleComplete).not.toHaveBeenCalled();
  });
});

describe("OTPInput — Backspace / flèches", () => {
  it("Backspace sur case pleine efface SEULEMENT la case courante, focus reste dessus", () => {
    const handleChange = vi.fn();
    render(
      <ControlledOTPInput
        initialValue="123"
        length={4}
        onChange={handleChange}
      />,
    );
    const inputs = digits();
    inputs[1].focus();

    fireEvent.keyDown(inputs[1], { key: "Backspace" });

    expect(handleChange).toHaveBeenCalledWith("13");
    expect(document.activeElement).toBe(digits()[1]);
  });

  it("Backspace sur case vide efface la case précédente ET y déplace le focus", () => {
    const handleChange = vi.fn();
    render(
      <ControlledOTPInput
        initialValue="12"
        length={4}
        onChange={handleChange}
      />,
    );
    const inputs = digits();
    inputs[2].focus();

    fireEvent.keyDown(inputs[2], { key: "Backspace" });

    expect(handleChange).toHaveBeenCalledWith("1");
    expect(document.activeElement).toBe(digits()[1]);
  });

  it("ArrowLeft/ArrowRight déplacent le focus sans appeler onChange", () => {
    const handleChange = vi.fn();
    render(
      <ControlledOTPInput
        initialValue="12"
        length={4}
        onChange={handleChange}
      />,
    );
    const inputs = digits();
    inputs[1].focus();

    fireEvent.keyDown(inputs[1], { key: "ArrowRight" });
    expect(document.activeElement).toBe(digits()[2]);

    fireEvent.keyDown(digits()[2], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(digits()[1]);

    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe("OTPInput — paste", () => {
  it("distribue le contenu collé et appelle onChange UNE FOIS avec la chaîne complète", () => {
    const handleChange = vi.fn();
    render(<ControlledOTPInput length={6} onChange={handleChange} />);
    const inputs = digits();

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "123456" },
    });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("123456");
  });

  it("paste déclenche onComplete quand toutes les cases sont remplies", () => {
    const handleComplete = vi.fn();
    render(<ControlledOTPInput length={6} onComplete={handleComplete} />);
    const inputs = digits();

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "123456" },
    });

    expect(handleComplete).toHaveBeenCalledWith("123456");
  });

  it("paste filtre les caractères non numériques", () => {
    const handleChange = vi.fn();
    render(<ControlledOTPInput length={4} onChange={handleChange} />);
    const inputs = digits();

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "1a2b3c" },
    });

    expect(handleChange).toHaveBeenCalledWith("123");
  });

  it("paste à un index > 0 distribue à partir de la case courante", () => {
    const handleChange = vi.fn();
    render(
      <ControlledOTPInput
        initialValue="1"
        length={4}
        onChange={handleChange}
      />,
    );
    const inputs = digits();

    fireEvent.paste(inputs[1], {
      clipboardData: { getData: () => "23" },
    });

    expect(handleChange).toHaveBeenCalledWith("123");
  });

  it("paste ignoré (pas d'onChange) quand le presse-papier ne contient aucun chiffre", () => {
    const handleChange = vi.fn();
    render(<ControlledOTPInput length={4} onChange={handleChange} />);
    const inputs = digits();

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "abc" },
    });

    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe("OTPInput — disabled", () => {
  it("pose .otp-group--disabled + aria-disabled=true sur le groupe", () => {
    render(<OTPInput value="" onChange={() => {}} disabled />);
    const group = document.querySelector(".otp-group");
    expect(group).toHaveClass("otp-group--disabled");
    expect(group).toHaveAttribute("aria-disabled", "true");
  });

  it("chaque case porte l'attribut natif disabled", () => {
    render(<OTPInput value="" onChange={() => {}} disabled length={4} />);
    digits().forEach((input) => expect(input).toBeDisabled());
  });

  it("n'a pas .otp-group--disabled ni aria-disabled par défaut", () => {
    render(<OTPInput value="" onChange={() => {}} />);
    const group = document.querySelector(".otp-group");
    expect(group).not.toHaveClass("otp-group--disabled");
    expect(group).not.toHaveAttribute("aria-disabled");
  });

  it("ignore la saisie/backspace/paste quand disabled", () => {
    const handleChange = vi.fn();
    render(
      <OTPInput value="1" onChange={handleChange} disabled length={4} />,
    );
    const inputs = digits();

    fireEvent.change(inputs[0], { target: { value: "9" } });
    fireEvent.keyDown(inputs[0], { key: "Backspace" });
    fireEvent.paste(inputs[0], { clipboardData: { getData: () => "234" } });

    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe("OTPInput — autoFocus", () => {
  it("focus la 1ère case au montage quand autoFocus est vrai", () => {
    render(<OTPInput value="" onChange={() => {}} autoFocus length={4} />);
    expect(document.activeElement).toBe(digits()[0]);
  });

  it("ne focus rien par défaut", () => {
    render(<OTPInput value="" onChange={() => {}} length={4} />);
    expect(document.activeElement).not.toBe(digits()[0]);
  });
});

describe("OTPInput — divergence assumée (trou au milieu collapse)", () => {
  it("effacer une case du milieu collapse le trou au rendu suivant (comme l'export vanilla .join(''))", () => {
    const handleChange = vi.fn();
    render(
      <ControlledOTPInput
        initialValue="1234"
        length={4}
        onChange={handleChange}
      />,
    );
    const inputs = digits();
    inputs[1].focus();

    // Efface la case 2 (valeur "2") — "1234" -> trou en position 1 -> collapse en "134"
    fireEvent.keyDown(inputs[1], { key: "Backspace" });

    expect(handleChange).toHaveBeenCalledWith("134");

    // Au rendu suivant, la case 3 (qui affichait "3") affiche maintenant "3"
    // toujours en position 1... mais la case 4 (qui affichait "4") est
    // remontée en position 2 : c'est la divergence documentée.
    const updated = digits();
    expect(updated[0]).toHaveValue("1");
    expect(updated[1]).toHaveValue("3");
    expect(updated[2]).toHaveValue("4");
    expect(updated[3]).toHaveValue("");
  });
});
