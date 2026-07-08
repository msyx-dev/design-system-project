import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { PasswordInput, PasswordInputProps } from "./PasswordInput";

/** Wrapper contrôlé — reflète l'état "revealed" comme un vrai consumer. */
function ControlledPasswordInput(
  props: Partial<Omit<PasswordInputProps, "revealed" | "onRevealedChange">> & {
    onRevealedChange?: PasswordInputProps["onRevealedChange"];
    initialRevealed?: boolean;
  },
) {
  const { initialRevealed = false, onRevealedChange, ...rest } = props;
  const [revealed, setRevealed] = useState(initialRevealed);
  return (
    <PasswordInput
      {...rest}
      revealed={revealed}
      onRevealedChange={(next) => {
        setRevealed(next);
        onRevealedChange?.(next);
      }}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe("PasswordInput — structure", () => {
  it("rend .password-field > input.input + button.password-toggle", () => {
    render(<PasswordInput />);
    const field = document.querySelector(".password-field");
    expect(field).toBeInTheDocument();
    const input = field?.querySelector("input.input");
    const toggle = field?.querySelector("button.password-toggle");
    expect(input).toBeInTheDocument();
    expect(toggle).toBeInTheDocument();
  });

  it("monte les DEUX <svg> .password-toggle-on/.password-toggle-off avec les hrefs sprite corrects", () => {
    render(<PasswordInput />);
    const onIcon = document.querySelector(".password-toggle-on use");
    const offIcon = document.querySelector(".password-toggle-off use");
    expect(document.querySelector(".password-toggle-on")).toBeInTheDocument();
    expect(document.querySelector(".password-toggle-off")).toBeInTheDocument();
    expect(onIcon).toHaveAttribute(
      "href",
      "/shared/icons/sprite.svg#i-eye",
    );
    expect(offIcon).toHaveAttribute(
      "href",
      "/shared/icons/sprite.svg#i-eye-off",
    );
  });

  it("l'input démarre en type=password et le bouton en aria-pressed=false", () => {
    render(<PasswordInput />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;
    expect(input).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("aria-label", "Afficher le mot de passe");
  });

  it("lie label/for et aria-controls du bouton vers l'id de l'input", () => {
    render(<PasswordInput label="Mot de passe" id="pwd-test" />);
    const label = document.querySelector(".input-label");
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;
    expect(label).toHaveTextContent("Mot de passe");
    expect(label).toHaveAttribute("for", "pwd-test");
    expect(input.id).toBe("pwd-test");
    expect(toggle).toHaveAttribute("aria-controls", "pwd-test");
  });

  it("génère un id via useId si absent", () => {
    render(<PasswordInput label="Mot de passe" />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    expect(input.id).toBeTruthy();
  });
});

describe("PasswordInput — bascule non contrôlée", () => {
  it("le clic bascule aria-pressed à true, le type à text, et le label à hideLabel", () => {
    render(<PasswordInput />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-label", "Masquer le mot de passe");
  });

  it("un second clic revient à aria-pressed=false, type=password, revealLabel", () => {
    render(<PasswordInput />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(input).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-label", "Afficher le mot de passe");
  });

  it("appelle onRevealedChange avec le nouvel état même en mode non contrôlé", () => {
    const handleRevealedChange = vi.fn();
    render(<PasswordInput onRevealedChange={handleRevealedChange} />);
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);

    expect(handleRevealedChange).toHaveBeenCalledWith(true);
  });

  it("respecte defaultRevealed=true à l'initialisation", () => {
    render(<PasswordInput defaultRevealed />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;
    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("PasswordInput — mode contrôlé (revealed/onRevealedChange)", () => {
  it("reflète la prop revealed fournie par le parent", () => {
    render(<ControlledPasswordInput initialRevealed />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;
    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("le clic appelle onRevealedChange et le parent contrôlé met à jour le rendu", () => {
    const handleRevealedChange = vi.fn();
    render(
      <ControlledPasswordInput onRevealedChange={handleRevealedChange} />,
    );
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);

    expect(handleRevealedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(input).toHaveAttribute("type", "text");
  });

  it("sans mise à jour du parent (revealed figé), l'état affiché ne change pas", () => {
    // Composant contrôlé "figé" : le parent ne relaie pas la prop après clic.
    const handleRevealedChange = vi.fn();
    render(
      <PasswordInput revealed={false} onRevealedChange={handleRevealedChange} />,
    );
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);

    expect(handleRevealedChange).toHaveBeenCalledWith(true);
    // revealed prop toujours false (le parent factice ne l'a pas relayé) : le
    // rendu reste calé sur la prop, pas sur un état interne fantôme.
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("PasswordInput — disabled", () => {
  it("disabled propage au champ natif ET au bouton toggle", () => {
    render(<PasswordInput disabled />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;
    expect(input).toBeDisabled();
    expect(toggle).toBeDisabled();
  });

  it("non disabled par défaut", () => {
    render(<PasswordInput />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const toggle = document.querySelector(
      ".password-toggle",
    ) as HTMLButtonElement;
    expect(input).not.toBeDisabled();
    expect(toggle).not.toBeDisabled();
  });
});

describe("PasswordInput — hint / error", () => {
  it("affiche .input-hint lié via aria-describedby quand hint fourni", () => {
    render(<PasswordInput hint="8 caractères minimum" id="pwd-hint" />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const hint = document.querySelector(".input-hint");
    expect(hint).toHaveTextContent("8 caractères minimum");
    expect(input).toHaveAttribute("aria-describedby", "pwd-hint-hint");
  });

  it("error remplace le hint par .input-error-msg + input-error + aria-invalid", () => {
    render(<PasswordInput error="Mot de passe trop court" id="pwd-error" />);
    const input = document.querySelector("input.input") as HTMLInputElement;
    const errorMsg = document.querySelector(".input-error-msg");
    expect(errorMsg).toHaveTextContent("Mot de passe trop court");
    expect(document.querySelector(".input-hint")).not.toBeInTheDocument();
    expect(input).toHaveClass("input-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "pwd-error-error");
  });
});

describe("PasswordInput — passthrough natif", () => {
  it("propage value/onChange comme un input standard", () => {
    const handleChange = vi.fn();
    render(
      <PasswordInput
        value="Sup3rSecret!"
        onChange={handleChange}
        placeholder="••••••••"
      />,
    );
    const input = document.querySelector("input.input") as HTMLInputElement;
    expect(input.value).toBe("Sup3rSecret!");
    expect(input).toHaveAttribute("placeholder", "••••••••");

    fireEvent.change(input, { target: { value: "AutreValeur" } });
    expect(handleChange).toHaveBeenCalled();
  });
});
