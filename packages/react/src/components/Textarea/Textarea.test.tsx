import { createRef, useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "jest-axe";
import { Textarea } from "./Textarea";

// Les assertions portent sur les classes et attributs dont dépend le CSS DS
// (forms.css : .input-group, textarea.input, .input-footer, .input-counter,
// .input-counter--over) et sur le contrat a11y (aria-describedby, région live).

const LIMIT = "Limite de caractères atteinte";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Wrapper contrôlé — reflète `value` comme un vrai consumer. */
function Controlled({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Textarea
      label="Notes"
      id="t"
      maxLength={10}
      showCount
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

const live = () => document.querySelector('.sr-only[aria-live="polite"]');
const counter = () => document.querySelector(".input-counter");

describe("Textarea — structure", () => {
  it("rend textarea.input dans .input-group, relié à label.input-label[for]", () => {
    const { container } = render(<Textarea label="Notes" />);
    const group = container.querySelector(".input-group");
    const field = group?.querySelector("textarea.input") as HTMLElement;
    expect(field).toBeInTheDocument();
    const label = screen.getByText("Notes");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("input-label");
    expect(label.getAttribute("for")).toBe(field.id);
    expect(field.id).not.toBe("");
  });

  it("respecte l'id fourni", () => {
    render(<Textarea label="Notes" id="custom-id" />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute("id", "custom-id");
  });

  it("ajoute className sur le conteneur .input-group, pas sur le champ", () => {
    const { container } = render(<Textarea label="Notes" className="mine" />);
    expect(container.querySelector(".input-group")).toHaveClass("mine");
    expect(screen.getByLabelText("Notes")).not.toHaveClass("mine");
  });

  it("transmet rows, maxLength, required et name au textarea natif", () => {
    render(
      <Textarea label="Notes" rows={6} maxLength={50} required name="n" />,
    );
    const field = screen.getByLabelText("Notes");
    expect(field).toHaveAttribute("rows", "6");
    expect(field).toHaveAttribute("maxlength", "50");
    expect(field).toBeRequired();
    expect(field).toHaveAttribute("name", "n");
  });

  it("forwardRef pointe sur le <textarea> natif (ref objet et ref fonction)", () => {
    const objRef = createRef<HTMLTextAreaElement>();
    const fnRef = vi.fn();
    render(
      <>
        <Textarea label="A" ref={objRef} />
        <Textarea label="B" ref={fnRef} />
      </>,
    );
    expect(objRef.current?.tagName).toBe("TEXTAREA");
    expect(fnRef).toHaveBeenCalledWith(screen.getByLabelText("B"));
  });
});

describe("Textarea — états", () => {
  it("hint : .input-hint relié par aria-describedby, enfant direct de .input-group", () => {
    const { container } = render(<Textarea label="Notes" hint="Aide" />);
    const field = screen.getByLabelText("Notes");
    const hint = screen.getByText("Aide");
    expect(hint).toHaveClass("input-hint");
    expect(field).toHaveAttribute("aria-describedby", hint.id);
    expect(hint.parentElement).toBe(container.querySelector(".input-group"));
  });

  it("error : .input-error, aria-invalid, .input-error-msg, sans id d'aide pendant", () => {
    render(<Textarea label="Notes" id="n" hint="Aide" error="Trop court" />);
    const field = screen.getByLabelText("Notes");
    expect(field).toHaveClass("input-error");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const msg = screen.getByText("Trop court");
    expect(msg).toHaveClass("input-error-msg");
    expect(field).toHaveAttribute("aria-describedby", "n-error");
    expect(msg.id).toBe("n-error");
    expect(screen.queryByText("Aide")).toBeNull();
    expect(document.getElementById("n-hint")).toBeNull();
  });

  it(".input-success seulement sans erreur", () => {
    const { rerender } = render(<Textarea label="Notes" success />);
    expect(screen.getByLabelText("Notes")).toHaveClass("input-success");
    rerender(<Textarea label="Notes" success error="Non" />);
    expect(screen.getByLabelText("Notes")).not.toHaveClass("input-success");
    expect(screen.getByLabelText("Notes")).toHaveClass("input-error");
  });

  it(".input-disabled quand le champ est désactivé", () => {
    render(<Textarea label="Notes" disabled />);
    const field = screen.getByLabelText("Notes");
    expect(field).toHaveClass("input-disabled");
    expect(field).toBeDisabled();
  });
});

describe("Textarea — compteur", () => {
  it("sans showCount : ni .input-footer ni .input-counter, même avec maxLength", () => {
    const { container } = render(
      <Textarea label="Notes" hint="Aide" maxLength={2000} />,
    );
    expect(container.querySelector(".input-footer")).toBeNull();
    expect(counter()).toBeNull();
    expect(live()).toBeNull();
  });

  it("showCount sans maxLength : aucun compteur", () => {
    const { container } = render(<Textarea label="Notes" showCount />);
    expect(container.querySelector(".input-footer")).toBeNull();
    expect(counter()).toBeNull();
  });

  it("showCount + maxLength : .input-footer > .input-counter#<id>-counter affiche 0 / 2000", () => {
    const { container } = render(
      <Textarea
        label="Notes"
        id="wish"
        hint="Aide"
        maxLength={2000}
        showCount
      />,
    );
    const c = container.querySelector(".input-footer > .input-counter");
    expect(c).toBeInTheDocument();
    expect(c?.id).toBe("wish-counter");
    expect(c?.textContent).toBe("0 / 2000");
    // aide à gauche dans le même pied, région live toujours montée
    expect(
      container.querySelector(".input-footer > .input-hint"),
    ).toBeInTheDocument();
    expect(live()).toBeInTheDocument();
    // aria-describedby se termine par l'id du compteur
    expect(screen.getByLabelText("Notes")).toHaveAttribute(
      "aria-describedby",
      "wish-hint wish-counter",
    );
  });

  it("avec erreur : l'erreur remplace l'aide dans .input-footer, describedby = error puis counter", () => {
    const { container } = render(
      <Textarea
        label="Notes"
        id="w"
        hint="Aide"
        error="Nope"
        maxLength={20}
        showCount
      />,
    );
    expect(
      container.querySelector(".input-footer > .input-error-msg"),
    ).toBeInTheDocument();
    expect(container.querySelector(".input-footer > .input-hint")).toBeNull();
    expect(screen.getByLabelText("Notes")).toHaveAttribute(
      "aria-describedby",
      "w-error w-counter",
    );
  });

  it("contrôlé : le compteur suit `value` à chaque rendu", () => {
    render(<Controlled initial="abc" />);
    expect(counter()?.textContent).toBe("3 / 10");
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "abcdef" },
    });
    expect(counter()?.textContent).toBe("6 / 10");
  });

  it("non contrôlé : part de defaultValue, suit la frappe, appelle onChange du consommateur une fois", () => {
    const onChange = vi.fn();
    render(
      <Textarea
        label="Notes"
        maxLength={20}
        showCount
        defaultValue="abcd"
        onChange={onChange}
      />,
    );
    expect(counter()?.textContent).toBe("4 / 20");
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "abcdefg" },
    });
    expect(counter()?.textContent).toBe("7 / 20");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it(".input-counter--over apparaît quand la valeur dépasse maxLength, pas à la limite", () => {
    render(<Controlled initial="0123456789" />);
    expect(counter()).not.toHaveClass("input-counter--over");
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "0123456789A" },
    });
    expect(counter()).toHaveClass("input-counter");
    expect(counter()).toHaveClass("input-counter--over");
    expect(counter()?.textContent).toBe("11 / 10");
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "0123" },
    });
    expect(counter()).not.toHaveClass("input-counter--over");
  });

  it("valeur initiale au-delà du maximum : --over dès le premier rendu", () => {
    render(
      <Textarea
        label="Notes"
        maxLength={5}
        showCount
        defaultValue="123456789"
      />,
    );
    expect(counter()).toHaveClass("input-counter--over");
  });
});

describe("Textarea — reset du formulaire (non contrôlé)", () => {
  it("après form.reset(), le compteur revient à la longueur de defaultValue", () => {
    vi.useFakeTimers();
    const { container } = render(
      <form>
        <Textarea
          label="Notes"
          maxLength={50}
          showCount
          defaultValue="abcd"
          name="n"
        />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "abcdefghij" },
    });
    expect(counter()?.textContent).toBe("10 / 50");
    act(() => {
      form.reset();
      vi.runAllTimers();
    });
    expect(counter()?.textContent).toBe("4 / 50");
  });

  it("retire l'écouteur au démontage (aucun setState après unmount)", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container, unmount } = render(
      <form>
        <Textarea label="Notes" maxLength={50} showCount defaultValue="abcd" />
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    const removeSpy = vi.spyOn(form, "removeEventListener");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("reset", expect.any(Function));
    expect(() => {
      form.reset();
      vi.runAllTimers();
    }).not.toThrow();
    errorSpy.mockRestore();
  });
});

describe("Textarea — région live", () => {
  it("vide sous la limite, limitReachedLabel par défaut à count >= maxLength", () => {
    render(<Controlled />);
    expect(live()?.textContent).toBe("");
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "012345678" },
    });
    expect(live()?.textContent).toBe("");
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "0123456789" },
    });
    expect(live()?.textContent).toBe(LIMIT);
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "0123" },
    });
    expect(live()?.textContent).toBe("");
  });

  it("limitReachedLabel est surchargeable", () => {
    render(
      <Textarea
        label="Notes"
        maxLength={3}
        showCount
        defaultValue="abc"
        limitReachedLabel="Limit reached"
      />,
    );
    expect(live()?.textContent).toBe("Limit reached");
  });

  it("n'est pas réécrite à l'identique : même nœud, aucune mutation tant que le texte ne change pas", () => {
    render(<Controlled initial="0123456789" />);
    const node = live() as Element;
    expect(node.textContent).toBe(LIMIT);
    const footer = document.querySelector(".input-footer") as Element;
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((r) => records.push(...r));
    observer.observe(node, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    // count 10 -> 12 -> 15 : toujours >= max, le compteur change mais pas la région live
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "0123456789AB" },
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "0123456789ABCDE" },
    });
    records.push(...observer.takeRecords());
    observer.disconnect();
    expect(counter()?.textContent).toBe("15 / 10");
    expect(live()).toBe(node);
    expect(footer.contains(node)).toBe(true);
    expect(records).toHaveLength(0);
  });
});

describe("Textarea — aria-describedby du consommateur", () => {
  it("est conservé en tête, fusionné avec aide et compteur (pas écrasé)", () => {
    render(
      <Textarea
        label="Notes"
        id="m"
        hint="Aide"
        maxLength={10}
        showCount
        aria-describedby="externe"
      />,
    );
    expect(screen.getByLabelText("Notes")).toHaveAttribute(
      "aria-describedby",
      "externe m-hint m-counter",
    );
  });

  it("seul : conservé tel quel sans aide ni compteur", () => {
    render(<Textarea label="Notes" aria-describedby="externe" />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute(
      "aria-describedby",
      "externe",
    );
  });

  it("absent quand rien à relier", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});

describe("Textarea — a11y (axe-core)", () => {
  it("aucune violation sur le champ complet (aide, compteur, région live)", async () => {
    const { container } = render(
      <Textarea
        label="Notes"
        hint="Aide"
        maxLength={200}
        showCount
        defaultValue="abc"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("aucune violation en erreur avec compteur au-delà de la limite", async () => {
    const { container } = render(
      <Textarea
        label="Notes"
        error="Trop long"
        maxLength={3}
        showCount
        defaultValue="abcdef"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
