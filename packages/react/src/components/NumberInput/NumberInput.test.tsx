import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { NumberInput } from "./NumberInput";

afterEach(() => {
  cleanup();
});

describe("NumberInput — structure", () => {
  it("rend le markup canonique .number-input-wrap/.number-input-btn/.number-input-field", () => {
    render(<NumberInput value={5} onChange={() => {}} />);

    const wrap = document.querySelector(".number-input-wrap");
    expect(wrap).toBeInTheDocument();
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns).toHaveLength(2);
    const field = document.querySelector(".number-input-field");
    expect(field).toBeInTheDocument();
    expect(field?.tagName).toBe("INPUT");
    expect(field).toHaveAttribute("type", "number");
  });

  it("pose data-action dec/inc sur les boutons dans l'ordre décrément puis incrément", () => {
    render(<NumberInput value={5} onChange={() => {}} />);
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns[0]).toHaveAttribute("data-action", "dec");
    expect(btns[1]).toHaveAttribute("data-action", "inc");
  });

  it("lie le label via aria-label sur le champ", () => {
    render(<NumberInput value={3} onChange={() => {}} label="Quantité" />);
    const input = screen.getByLabelText("Quantité");
    expect(input).toHaveClass("number-input-field");
  });
});

describe("NumberInput — état critique : boutons disabled aux bornes", () => {
  it("désactive le bouton décrément quand value === min", () => {
    render(<NumberInput value={1} min={1} max={99} onChange={() => {}} />);
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns[0]).toBeDisabled();
    expect(btns[1]).not.toBeDisabled();
  });

  it("désactive le bouton incrément quand value === max", () => {
    render(<NumberInput value={99} min={1} max={99} onChange={() => {}} />);
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns[0]).not.toBeDisabled();
    expect(btns[1]).toBeDisabled();
  });

  it("aucun bouton désactivé strictement entre les bornes", () => {
    render(<NumberInput value={50} min={1} max={99} onChange={() => {}} />);
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns[0]).not.toBeDisabled();
    expect(btns[1]).not.toBeDisabled();
  });

  it("sans min/max (non borné), aucun bouton n'est désactivé par les bornes", () => {
    render(<NumberInput value={0} onChange={() => {}} />);
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns[0]).not.toBeDisabled();
    expect(btns[1]).not.toBeDisabled();
  });
});

describe("NumberInput — clics dec/inc", () => {
  it("clic incrément appelle onChange avec value + step", () => {
    const handleChange = vi.fn();
    render(<NumberInput value={5} step={1} onChange={handleChange} />);
    const btns = document.querySelectorAll(".number-input-btn");
    fireEvent.click(btns[1]);
    expect(handleChange).toHaveBeenCalledWith(6);
  });

  it("clic décrément appelle onChange avec value - step", () => {
    const handleChange = vi.fn();
    render(<NumberInput value={5} step={1} onChange={handleChange} />);
    const btns = document.querySelectorAll(".number-input-btn");
    fireEvent.click(btns[0]);
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it("clamp au max : un step qui dépasse max est ramené à max (bouton encore actif avant la borne)", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={97}
        min={1}
        max={99}
        step={5}
        onChange={handleChange}
      />,
    );
    const btns = document.querySelectorAll(".number-input-btn");
    // value=97 < max=99 → bouton incrément encore actif, mais value+step=102 dépasse max
    expect(btns[1]).not.toBeDisabled();
    fireEvent.click(btns[1]);
    expect(handleChange).toHaveBeenCalledWith(99);
  });

  it("clamp au min : un step qui dépasse min est ramené à min (bouton encore actif avant la borne)", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={3}
        min={1}
        max={99}
        step={5}
        onChange={handleChange}
      />,
    );
    const btns = document.querySelectorAll(".number-input-btn");
    // value=3 > min=1 → bouton décrément encore actif, mais value-step=-2 dépasse min
    expect(btns[0]).not.toBeDisabled();
    fireEvent.click(btns[0]);
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it("un bouton désactivé à la borne ne déclenche pas onChange au clic", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={99}
        min={1}
        max={99}
        step={1}
        onChange={handleChange}
      />,
    );
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns[1]).toBeDisabled();
    fireEvent.click(btns[1]);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("arrondit au step configuré", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={20}
        min={-20}
        max={120}
        step={5}
        onChange={handleChange}
      />,
    );
    const btns = document.querySelectorAll(".number-input-btn");
    fireEvent.click(btns[1]);
    expect(handleChange).toHaveBeenCalledWith(25);
  });
});

describe("NumberInput — clavier ArrowUp/ArrowDown", () => {
  it("ArrowUp incrémente de step", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={10}
        step={1}
        onChange={handleChange}
        label="Valeur"
      />,
    );
    const input = screen.getByLabelText("Valeur");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(handleChange).toHaveBeenCalledWith(11);
  });

  it("ArrowDown décrémente de step", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={10}
        step={1}
        onChange={handleChange}
        label="Valeur"
      />,
    );
    const input = screen.getByLabelText("Valeur");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(handleChange).toHaveBeenCalledWith(9);
  });
});

describe("NumberInput — changement direct dans le champ", () => {
  it("re-clampe une saisie directe hors bornes", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={5}
        min={0}
        max={10}
        onChange={handleChange}
        label="Bornée"
      />,
    );
    const input = screen.getByLabelText("Bornée");
    fireEvent.change(input, { target: { value: "999" } });
    expect(handleChange).toHaveBeenCalledWith(10);
  });

  it("saisie directe dans les bornes passe telle quelle (arrondie au step)", () => {
    const handleChange = vi.fn();
    render(
      <NumberInput
        value={5}
        min={0}
        max={10}
        step={1}
        onChange={handleChange}
        label="Bornée"
      />,
    );
    const input = screen.getByLabelText("Bornée");
    fireEvent.change(input, { target: { value: "7" } });
    expect(handleChange).toHaveBeenCalledWith(7);
  });
});

describe("NumberInput — variantes compact / disabled", () => {
  it("pose .number-input--compact quand compact", () => {
    render(<NumberInput value={3} onChange={() => {}} compact />);
    expect(document.querySelector(".number-input-wrap")).toHaveClass(
      "number-input--compact",
    );
  });

  it("n'ajoute pas .number-input--compact par défaut", () => {
    render(<NumberInput value={3} onChange={() => {}} />);
    expect(document.querySelector(".number-input-wrap")).not.toHaveClass(
      "number-input--compact",
    );
  });

  it("pose .number-input--disabled + disabled natif sur le champ et les 2 boutons", () => {
    render(<NumberInput value={3} onChange={() => {}} disabled />);
    expect(document.querySelector(".number-input-wrap")).toHaveClass(
      "number-input--disabled",
    );
    const field = document.querySelector(".number-input-field");
    expect(field).toBeDisabled();
    const btns = document.querySelectorAll(".number-input-btn");
    expect(btns[0]).toBeDisabled();
    expect(btns[1]).toBeDisabled();
  });

  it("n'ajoute pas .number-input--disabled par défaut", () => {
    render(<NumberInput value={3} onChange={() => {}} />);
    expect(document.querySelector(".number-input-wrap")).not.toHaveClass(
      "number-input--disabled",
    );
  });
});

// --- Valeur vide (#860) -----------------------------------------------------
//
// `value: number` forçait une valeur : un champ vidé retombait sur 0 via
// `parseFloat('') || 0`, donc « non renseigné » était inatteignable. C'est ce
// qui rendait une heure facultative obligatoire dès la première saisie.
describe("NumberInput — valeur vide (#860)", () => {
  const field = () =>
    document.querySelector(".number-input-field") as HTMLInputElement;
  const buttons = () => document.querySelectorAll(".number-input-btn");

  it("value={null} rend un champ VIDE (et non 0)", () => {
    render(<NumberInput value={null} onChange={() => {}} min={0} max={23} />);
    expect(field().value).toBe("");
  });

  it("effacer le champ appelle onEmpty, jamais onChange(0)", () => {
    const onChange = vi.fn();
    const onEmpty = vi.fn();
    render(
      <NumberInput value={9} onChange={onChange} onEmpty={onEmpty} min={0} max={23} />,
    );
    fireEvent.change(field(), { target: { value: "" } });
    expect(onEmpty).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("SANS onEmpty, effacer garde le comportement d'avant (aucune régression)", () => {
    const onChange = vi.fn();
    render(<NumberInput value={9} onChange={onChange} min={0} max={23} />);
    fireEvent.change(field(), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("les deux boutons restent actifs sur un champ vide, et amorcent à min", () => {
    const onChange = vi.fn();
    render(<NumberInput value={null} onChange={onChange} min={3} max={23} />);
    const [dec, inc] = Array.from(buttons()) as HTMLButtonElement[];
    // Un champ vide n'est ni au plancher ni au plafond.
    expect(dec.disabled).toBe(false);
    expect(inc.disabled).toBe(false);
    fireEvent.click(inc);
    expect(onChange).toHaveBeenCalledWith(3);
    fireEvent.click(dec);
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("sans borne min, les flèches amorcent à 0 (et non à -Infinity)", () => {
    const onChange = vi.fn();
    render(<NumberInput value={null} onChange={onChange} />);
    const [, inc] = Array.from(buttons()) as HTMLButtonElement[];
    fireEvent.click(inc);
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
