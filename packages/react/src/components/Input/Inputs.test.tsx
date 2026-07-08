import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { Input } from "./Input";
import { Select } from "./Select";
import { Checkbox } from "./Checkbox";
import { Radio } from "./Radio";
import { Toggle } from "./Toggle";

describe("Input", () => {
  it("rend la classe DS .input", () => {
    render(<Input label="Nom" />);
    expect(screen.getByLabelText("Nom")).toHaveClass("input");
  });

  it("lie le label via htmlFor/id (auto-généré)", () => {
    render(<Input label="Nom du projet" />);
    const input = screen.getByLabelText("Nom du projet");
    const label = screen.getByText("Nom du projet");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("input-label");
    expect(label.getAttribute("for")).toBe(input.id);
  });

  it("utilise l'id fourni si présent, ne le régénère pas", () => {
    render(<Input label="Email" id="custom-id" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "custom-id");
  });

  it("pose aria-invalid et .input-error-msg quand error est fourni", () => {
    render(<Input label="Email" error="Format invalide" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("input-error");
    const msg = screen.getByText("Format invalide");
    expect(msg).toHaveClass("input-error-msg");
    expect(input).toHaveAttribute("aria-describedby", msg.id);
  });

  it("applique .input-success quand success=true et pas d'erreur", () => {
    render(<Input label="Domaine" success />);
    expect(screen.getByLabelText("Domaine")).toHaveClass("input-success");
  });

  it("lie le hint via aria-describedby (.input-hint)", () => {
    render(<Input label="Nom" hint="Minuscules et tirets" />);
    const input = screen.getByLabelText("Nom");
    const hint = screen.getByText("Minuscules et tirets");
    expect(hint).toHaveClass("input-hint");
    expect(input).toHaveAttribute("aria-describedby", hint.id);
  });

  it("hint + error : aria-describedby ne pointe que vers le message d'erreur monté (pas d'idref pendant)", () => {
    render(<Input label="Nom" hint="Minuscules et tirets" error="Requis" />);
    const input = screen.getByLabelText("Nom");
    const errorMsg = screen.getByText("Requis");
    // error masque hint au rendu → le hint n'est pas dans le DOM…
    expect(screen.queryByText("Minuscules et tirets")).toBeNull();
    // …donc aria-describedby ne doit référencer QUE l'id du message d'erreur.
    expect(input).toHaveAttribute("aria-describedby", errorMsg.id);
    expect(input.getAttribute("aria-describedby")).not.toContain("-hint");
  });

  it("rend .input-with-icon + .input-icon quand icon fourni", () => {
    render(<Input label="Rechercher" icon={<span data-testid="ic" />} />);
    expect(document.querySelector(".input-with-icon")).toBeInTheDocument();
    expect(document.querySelector(".input-icon")).toBeInTheDocument();
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });

  it("est contrôlé : value/onChange", () => {
    const onChange = vi.fn();
    render(<Input label="Nom" value="abc" onChange={onChange} />);
    const input = screen.getByLabelText("Nom") as HTMLInputElement;
    expect(input.value).toBe("abc");
    fireEvent.change(input, { target: { value: "abcd" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwardRef vers l'élément input natif", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input label="Nom" ref={ref} />);
    expect(ref.current?.tagName).toBe("INPUT");
  });
});

describe("Select", () => {
  it("rend la classe DS .input sur le select", () => {
    render(
      <Select
        label="Environnement"
        options={[{ value: "prod", label: "Production" }]}
      />,
    );
    expect(screen.getByLabelText("Environnement").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Environnement")).toHaveClass("input");
  });

  it("rend les options fournies via la prop options", () => {
    render(
      <Select
        label="Environnement"
        options={[
          { value: "prod", label: "Production" },
          { value: "staging", label: "Staging" },
        ]}
      />,
    );
    expect(
      screen.getByRole("option", { name: "Production" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Staging" })).toBeInTheDocument();
  });

  it("accepte des children <option> à la place de options", () => {
    render(
      <Select label="Environnement">
        <option value="prod">Production</option>
      </Select>,
    );
    expect(
      screen.getByRole("option", { name: "Production" }),
    ).toBeInTheDocument();
  });

  it("pose aria-invalid + .input-error-msg quand error est fourni", () => {
    render(<Select label="Environnement" error="Requis" options={[]} />);
    const select = screen.getByLabelText("Environnement");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveClass("input-error");
    expect(screen.getByText("Requis")).toHaveClass("input-error-msg");
  });

  it("lie le hint via aria-describedby", () => {
    render(<Select label="Env" hint="Choisir un environnement" options={[]} />);
    const select = screen.getByLabelText("Env");
    const hint = screen.getByText("Choisir un environnement");
    expect(select).toHaveAttribute("aria-describedby", hint.id);
  });

  it("est contrôlé : value/onChange", () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Env"
        value="staging"
        onChange={onChange}
        options={[
          { value: "prod", label: "Production" },
          { value: "staging", label: "Staging" },
        ]}
      />,
    );
    const select = screen.getByLabelText("Env") as HTMLSelectElement;
    expect(select.value).toBe("staging");
    fireEvent.change(select, { target: { value: "prod" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("Checkbox", () => {
  it("rend .checkbox avec input[type=checkbox]", () => {
    render(<Checkbox label="Next.js" />);
    const checkbox = screen.getByLabelText("Next.js") as HTMLInputElement;
    expect(checkbox.type).toBe("checkbox");
    expect(checkbox.closest("label")).toHaveClass("checkbox");
  });

  it("est contrôlé : checked reflété + onChange déclenché", () => {
    const onChange = vi.fn();
    render(<Checkbox label="Next.js" checked onChange={onChange} />);
    const checkbox = screen.getByLabelText("Next.js") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwardRef vers l'input natif", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox label="Next.js" ref={ref} />);
    expect(ref.current?.type).toBe("checkbox");
  });
});

describe("Radio", () => {
  it("rend .radio avec input[type=radio]", () => {
    render(<Radio label="Production" name="env" />);
    const radio = screen.getByLabelText("Production") as HTMLInputElement;
    expect(radio.type).toBe("radio");
    expect(radio.closest("label")).toHaveClass("radio");
  });

  it("reflète checked=true depuis les props (contrôlé)", () => {
    render(<Radio label="Production" name="env" checked onChange={() => {}} />);
    const radio = screen.getByLabelText("Production") as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it("déclenche onChange quand un radio non coché est sélectionné", () => {
    const onChange = vi.fn();
    render(
      <Radio
        label="Production"
        name="env"
        checked={false}
        onChange={onChange}
      />,
    );
    const radio = screen.getByLabelText("Production") as HTMLInputElement;
    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwardRef vers l'input natif", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Radio label="Production" name="env" ref={ref} />);
    expect(ref.current?.type).toBe("radio");
  });
});

describe("Toggle", () => {
  it("rend .toggle + .toggle-slider avec input[type=checkbox]", () => {
    render(<Toggle aria-label="Mode sombre" />);
    const toggle = screen.getByLabelText("Mode sombre") as HTMLInputElement;
    expect(toggle.type).toBe("checkbox");
    expect(toggle.closest("label")).toHaveClass("toggle");
    expect(document.querySelector(".toggle-slider")).toBeInTheDocument();
  });

  it("est contrôlé : checked reflété + onChange déclenché", () => {
    const onChange = vi.fn();
    render(<Toggle aria-label="Mode sombre" checked onChange={onChange} />);
    const toggle = screen.getByLabelText("Mode sombre") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwardRef vers l'input natif", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Toggle aria-label="Mode sombre" ref={ref} />);
    expect(ref.current?.type).toBe("checkbox");
  });
});
