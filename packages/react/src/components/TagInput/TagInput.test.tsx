import { useState } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { TagInput, TagInputProps } from "./TagInput";

/** Wrapper contrôlé — reflète les mises à jour d'état comme un vrai consumer. */
function ControlledTagInput(
  props: Partial<Omit<TagInputProps, "values" | "onChange">> & {
    onChange?: TagInputProps["onChange"];
    initialValues?: string[];
  },
) {
  const { initialValues = [], onChange, ...rest } = props;
  const [values, setValues] = useState(initialValues);
  return (
    <TagInput
      {...rest}
      values={values}
      onChange={(next) => {
        setValues(next);
        onChange?.(next);
      }}
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TagInput — structure", () => {
  it("rend le markup canonique .tag-input-wrap/.tag-item/.tag-close/.tag-input-field", () => {
    render(<TagInput values={["Design", "Frontend"]} onChange={() => {}} />);

    expect(document.querySelector(".tag-input-wrap")).toBeInTheDocument();
    expect(document.querySelectorAll(".tag-item")).toHaveLength(2);
    expect(document.querySelectorAll(".tag-close")).toHaveLength(2);
    const field = document.querySelector(".tag-input-field");
    expect(field).toBeInTheDocument();
    expect(field?.tagName).toBe("INPUT");
    expect(field).toHaveAttribute("type", "text");
  });

  it("le bouton .tag-close porte l'aria-label 'Supprimer <valeur>'", () => {
    render(<TagInput values={["Design"]} onChange={() => {}} />);
    const closeBtn = document.querySelector(".tag-close");
    expect(closeBtn).toHaveAttribute("aria-label", "Supprimer Design");
  });

  it("affiche .tag-input-label lié au champ via htmlFor quand label fourni", () => {
    render(<TagInput values={[]} onChange={() => {}} label="Technologies" />);
    const label = document.querySelector(".tag-input-label");
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;
    expect(label).toHaveTextContent("Technologies");
    expect(label).toHaveAttribute("for", input.id);
  });

  it("pose data-max sur le wrap quand max est défini", () => {
    render(<TagInput values={[]} onChange={() => {}} max={5} />);
    expect(document.querySelector(".tag-input-wrap")).toHaveAttribute(
      "data-max",
      "5",
    );
  });
});

describe("TagInput — ajout de tags (Enter / virgule)", () => {
  it("Enter crée un tag et vide le champ", () => {
    const handleChange = vi.fn();
    render(<ControlledTagInput onChange={handleChange} />);
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleChange).toHaveBeenCalledWith(["react"]);
    expect(document.querySelectorAll(".tag-item")).toHaveLength(1);
    expect(
      (document.querySelector(".tag-input-field") as HTMLInputElement).value,
    ).toBe("");
  });

  it("touche virgule crée un tag", () => {
    const handleChange = vi.fn();
    render(<ControlledTagInput onChange={handleChange} />);
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "svelte" } });
    fireEvent.keyDown(input, { key: "," });

    expect(handleChange).toHaveBeenCalledWith(["svelte"]);
  });

  it("virgule tapée dans le champ crée un tag (géré via l'event input, cas mobile)", () => {
    const handleChange = vi.fn();
    render(<ControlledTagInput onChange={handleChange} />);
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "vue," } });

    expect(handleChange).toHaveBeenCalledWith(["vue"]);
    expect(
      (document.querySelector(".tag-input-field") as HTMLInputElement).value,
    ).toBe("");
  });

  it("anti-doublon : n'ajoute pas un tag déjà présent", () => {
    const handleChange = vi.fn();
    render(
      <ControlledTagInput initialValues={["react"]} onChange={handleChange} />,
    );
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".tag-item")).toHaveLength(1);
  });

  it("respecte max : n'ajoute pas de tag au-delà de la limite", () => {
    const handleChange = vi.fn();
    render(
      <ControlledTagInput
        initialValues={["a", "b"]}
        max={2}
        onChange={handleChange}
      />,
    );
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "c" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".tag-item")).toHaveLength(2);
  });
});

describe("TagInput — Backspace retire le dernier tag", () => {
  it("Backspace sur champ vide programme le retrait du dernier tag", () => {
    const handleChange = vi.fn();
    render(
      <ControlledTagInput initialValues={["a", "b"]} onChange={handleChange} />,
    );
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    fireEvent.keyDown(input, { key: "Backspace" });

    // Retrait différé : pas d'onChange immédiat, tag encore présent avec .tag-item--removing
    expect(handleChange).not.toHaveBeenCalled();
    const tags = document.querySelectorAll(".tag-item");
    expect(tags).toHaveLength(2);
    expect(tags[1]).toHaveClass("tag-item--removing");

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(handleChange).toHaveBeenCalledWith(["a"]);
  });

  it("Backspace sur champ non vide ne retire aucun tag", () => {
    const handleChange = vi.fn();
    render(
      <ControlledTagInput initialValues={["a", "b"]} onChange={handleChange} />,
    );
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "partiel" } });

    fireEvent.keyDown(input, { key: "Backspace" });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(handleChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".tag-item")).toHaveLength(2);
  });
});

describe("TagInput — état critique : .tag-item--removing", () => {
  it("pose .tag-item--removing sur le tag cliqué pendant la transition, puis appelle onChange après 150ms", () => {
    const handleChange = vi.fn();
    render(
      <ControlledTagInput
        initialValues={["Design", "Frontend"]}
        onChange={handleChange}
      />,
    );
    const closeButtons = document.querySelectorAll(".tag-close");

    fireEvent.click(closeButtons[0]);

    const tags = document.querySelectorAll(".tag-item");
    expect(tags[0]).toHaveClass("tag-item--removing");
    expect(tags[1]).not.toHaveClass("tag-item--removing");
    expect(handleChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(handleChange).toHaveBeenCalledWith(["Frontend"]);
  });

  it("avant l'écoulement des 150ms, le tag n'est pas retiré du DOM", () => {
    render(<ControlledTagInput initialValues={["Design"]} />);
    const closeBtn = document.querySelector(".tag-close") as HTMLButtonElement;

    fireEvent.click(closeBtn);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(document.querySelectorAll(".tag-item")).toHaveLength(1);
  });

  it("nettoie les timers de suppression au démontage (pas d'appel onChange après unmount)", () => {
    const handleChange = vi.fn();
    const { unmount } = render(
      <ControlledTagInput initialValues={["a"]} onChange={handleChange} />,
    );
    const closeBtn = document.querySelector(".tag-close") as HTMLButtonElement;
    fireEvent.click(closeBtn);

    unmount();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe("TagInput — limite atteinte", () => {
  it("désactive le champ + placeholder 'Limite atteinte' + .tag-input-limit = count/max", () => {
    render(<TagInput values={["a", "b"]} max={2} onChange={() => {}} />);
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    expect(input).toBeDisabled();
    expect(input.placeholder).toBe("Limite atteinte");
    expect(document.querySelector(".tag-input-limit")?.textContent).toBe("2/2");
  });

  it("sous la limite, .tag-input-limit affiche count/max sans désactiver le champ", () => {
    render(<TagInput values={["a"]} max={2} onChange={() => {}} />);
    const input = document.querySelector(
      ".tag-input-field",
    ) as HTMLInputElement;

    expect(input).not.toBeDisabled();
    expect(input.placeholder).not.toBe("Limite atteinte");
    expect(document.querySelector(".tag-input-limit")?.textContent).toBe("1/2");
  });

  it("sans max, .tag-input-limit n'est pas rendu", () => {
    render(<TagInput values={["a"]} onChange={() => {}} />);
    expect(document.querySelector(".tag-input-limit")).not.toBeInTheDocument();
  });
});

describe("TagInput — variantes disabled / error", () => {
  it("pose .tag-input-wrap--disabled quand disabled", () => {
    render(<TagInput values={[]} onChange={() => {}} disabled />);
    expect(document.querySelector(".tag-input-wrap")).toHaveClass(
      "tag-input-wrap--disabled",
    );
  });

  it("disabled : les tags existants n'ont pas de bouton .tag-close", () => {
    render(
      <TagInput
        values={["production", "staging"]}
        onChange={() => {}}
        disabled
      />,
    );
    expect(document.querySelectorAll(".tag-item")).toHaveLength(2);
    expect(document.querySelectorAll(".tag-close")).toHaveLength(0);
  });

  it("disabled : le champ natif est disabled", () => {
    render(<TagInput values={[]} onChange={() => {}} disabled />);
    expect(document.querySelector(".tag-input-field")).toBeDisabled();
  });

  it("pose .tag-input-wrap--error quand error est truthy (booléen)", () => {
    render(<TagInput values={[]} onChange={() => {}} error />);
    expect(document.querySelector(".tag-input-wrap")).toHaveClass(
      "tag-input-wrap--error",
    );
  });

  it("error sous forme de chaîne affiche le message dans .tag-input-hint--error", () => {
    render(<TagInput values={[]} onChange={() => {}} error="Champ requis" />);
    const hint = document.querySelector(".tag-input-hint");
    expect(hint).toHaveClass("tag-input-hint--error");
    expect(hint?.textContent).toBe("Champ requis");
  });

  it("affiche le hint normal (non erreur) quand fourni", () => {
    render(
      <TagInput values={[]} onChange={() => {}} hint="Aide contextuelle" />,
    );
    const hint = document.querySelector(".tag-input-hint");
    expect(hint).not.toHaveClass("tag-input-hint--error");
    expect(hint?.textContent).toBe("Aide contextuelle");
  });

  it("n'ajoute .tag-input-wrap--disabled/--error par défaut", () => {
    render(<TagInput values={[]} onChange={() => {}} />);
    const wrap = document.querySelector(".tag-input-wrap");
    expect(wrap).not.toHaveClass("tag-input-wrap--disabled");
    expect(wrap).not.toHaveClass("tag-input-wrap--error");
  });
});
