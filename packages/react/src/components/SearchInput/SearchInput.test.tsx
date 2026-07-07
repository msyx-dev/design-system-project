import {
  act,
  fireEvent,
  render,
  screen,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { SearchInput, SearchInputProps } from "./SearchInput";

afterEach(() => {
  cleanup();
});

/** Wrapper contrôlé minimal pour les tests d'interaction (state réel React). */
function ControlledSearchInput(
  props: Omit<SearchInputProps, "value" | "onChange"> & {
    initialValue?: string;
    onChange?: (value: string) => void;
  },
) {
  const { initialValue = "", onChange, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return (
    <SearchInput
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const SUGGESTIONS = ["Button", "Badge", "Breadcrumbs", "Chip"];

describe("SearchInput — structure", () => {
  it("rend le markup canonique .search-input-wrap/.search-icon/.search-input/.search-clear", () => {
    render(<SearchInput value="" onChange={() => {}} />);

    expect(document.querySelector(".search-input-wrap")).toBeInTheDocument();
    expect(document.querySelector(".search-icon")).toBeInTheDocument();
    const input = document.querySelector(".search-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "search");
    expect(document.querySelector(".search-clear")).toBeInTheDocument();
  });

  it("variante simple (sans suggestions) : role=search, pas de .search-suggestions", () => {
    render(<SearchInput value="" onChange={() => {}} />);

    const wrap = document.querySelector(".search-input-wrap");
    expect(wrap).toHaveAttribute("role", "search");
    expect(wrap).not.toHaveAttribute("aria-haspopup");
    expect(
      document.querySelector(".search-suggestions"),
    ).not.toBeInTheDocument();
  });

  it("compact ajoute .search-compact", () => {
    render(<SearchInput value="" onChange={() => {}} compact />);
    expect(document.querySelector(".search-input-wrap")).toHaveClass(
      "search-compact",
    );
  });

  it("avec suggestions : role=combobox, aria-haspopup=listbox, aria-expanded=false par défaut", () => {
    render(
      <SearchInput value="" onChange={() => {}} suggestions={SUGGESTIONS} />,
    );
    const wrap = document.querySelector(".search-input-wrap");
    expect(wrap).toHaveAttribute("role", "combobox");
    expect(wrap).toHaveAttribute("aria-haspopup", "listbox");
    expect(wrap).toHaveAttribute("aria-expanded", "false");
    expect(wrap).toHaveClass("search-with-suggestions");
  });
});

describe("SearchInput — .search-clear (état critique)", () => {
  it("a .hidden quand value est vide", () => {
    render(<SearchInput value="" onChange={() => {}} />);
    expect(document.querySelector(".search-clear")).toHaveClass("hidden");
  });

  it("n'a PAS .hidden quand value est non vide", () => {
    render(<SearchInput value="Button" onChange={() => {}} />);
    expect(document.querySelector(".search-clear")).not.toHaveClass("hidden");
  });

  it("onChange au tapé", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledSearchInput onChange={onChange} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "abc");

    expect(onChange).toHaveBeenCalledWith("a");
    expect(onChange).toHaveBeenCalledWith("ab");
    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("onClear au clic clear : vide la valeur et appelle onClear", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ControlledSearchInput initialValue="Button" onClear={onClear} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    expect(input.value).toBe("Button");

    await user.click(document.querySelector(".search-clear") as HTMLElement);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("");
    expect(document.querySelector(".search-clear")).toHaveClass("hidden");
  });
});

describe("SearchInput — suggestions : ouverture/fermeture et panneau", () => {
  it("saisie non vide ouvre .search-suggestions (sans .hidden) et aria-expanded=true", async () => {
    const user = userEvent.setup();
    render(<ControlledSearchInput suggestions={SUGGESTIONS} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "Bu");

    const list = document.querySelector(".search-suggestions");
    expect(list).not.toHaveClass("hidden");
    expect(document.querySelector(".search-input-wrap")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("effacer la saisie referme le panneau (.hidden revient, aria-expanded=false)", async () => {
    const user = userEvent.setup();
    render(
      <ControlledSearchInput initialValue="Bu" suggestions={SUGGESTIONS} />,
    );

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.click(input);
    await user.clear(input);

    const list = document.querySelector(".search-suggestions");
    expect(list).toHaveClass("hidden");
    expect(document.querySelector(".search-input-wrap")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("filtre les suggestions (insensible à la casse) et affiche .search-item par résultat", async () => {
    const user = userEvent.setup();
    render(<ControlledSearchInput suggestions={SUGGESTIONS} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "b");

    const items = Array.from(document.querySelectorAll(".search-item"));
    expect(items.map((i) => i.textContent)).toEqual([
      "Button",
      "Badge",
      "Breadcrumbs",
    ]);
    items.forEach((item) => {
      expect(item).toHaveAttribute("role", "option");
    });
  });

  it("aucun résultat : affiche .search-no-result avec la requête", async () => {
    const user = userEvent.setup();
    render(<ControlledSearchInput suggestions={SUGGESTIONS} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "zzz");

    const noResult = document.querySelector(".search-no-result");
    expect(noResult).toBeInTheDocument();
    expect(noResult?.textContent).toContain("zzz");
    expect(document.querySelectorAll(".search-item")).toHaveLength(0);
  });

  it("surligne la portion correspondante via <mark>", async () => {
    const user = userEvent.setup();
    render(<ControlledSearchInput suggestions={SUGGESTIONS} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "but");

    const item = document.querySelector(".search-item") as HTMLElement;
    const mark = item.querySelector("mark");
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent?.toLowerCase()).toBe("but");
  });

  it("suggestions objets {value,label} : label custom (ReactNode) rendu sans mark", async () => {
    const user = userEvent.setup();
    render(
      <ControlledSearchInput
        suggestions={[
          {
            value: "btn",
            label: <strong data-testid="custom-label">Bouton custom</strong>,
          },
        ]}
      />,
    );

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "b");

    expect(screen.getByTestId("custom-label")).toBeInTheDocument();
    expect(document.querySelector(".search-item mark")).not.toBeInTheDocument();
  });
});

describe("SearchInput — navigation clavier", () => {
  it("ArrowDown pose .active + aria-selected sur l'item suivant, ArrowUp recule", async () => {
    const user = userEvent.setup();
    render(<ControlledSearchInput suggestions={SUGGESTIONS} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "b");

    const items = () => Array.from(document.querySelectorAll(".search-item"));

    await user.keyboard("{ArrowDown}");
    expect(items()[0]).toHaveClass("active");
    expect(items()[0]).toHaveAttribute("aria-selected", "true");
    expect(items()[1]).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{ArrowDown}");
    expect(items()[1]).toHaveClass("active");
    expect(items()[0]).not.toHaveClass("active");

    await user.keyboard("{ArrowUp}");
    expect(items()[0]).toHaveClass("active");
  });

  it("Enter sur l'item actif appelle onSelect/onChange et ferme le panneau", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ControlledSearchInput suggestions={SUGGESTIONS} onSelect={onSelect} />,
    );

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "b");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith("Button");
    expect(input.value).toBe("Button");
    expect(document.querySelector(".search-suggestions")).toHaveClass("hidden");
  });

  it("clic (mousedown) sur une suggestion appelle onSelect/onChange", async () => {
    const onSelect = vi.fn();
    render(
      <ControlledSearchInput suggestions={SUGGESTIONS} onSelect={onSelect} />,
    );

    const input = document.querySelector(".search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "bad" } });

    const item = document.querySelector(".search-item") as HTMLElement;
    fireEvent.mouseDown(item);

    expect(onSelect).toHaveBeenCalledWith("Badge");
    expect(input.value).toBe("Badge");
  });

  it("Escape ferme le panneau et retire le focus de l'input", async () => {
    const user = userEvent.setup();
    render(<ControlledSearchInput suggestions={SUGGESTIONS} />);

    const input = document.querySelector(".search-input") as HTMLInputElement;
    await user.type(input, "b");
    expect(document.querySelector(".search-suggestions")).not.toHaveClass(
      "hidden",
    );

    await user.keyboard("{Escape}");

    expect(document.querySelector(".search-suggestions")).toHaveClass("hidden");
    expect(document.querySelector(".search-input-wrap")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(input).not.toHaveFocus();
  });
});

describe("SearchInput — blur différé (timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blur ferme le panneau après 150ms (pas immédiatement)", () => {
    render(
      <ControlledSearchInput initialValue="Bu" suggestions={SUGGESTIONS} />,
    );

    const input = document.querySelector(".search-input") as HTMLInputElement;
    fireEvent.focus(input);
    expect(document.querySelector(".search-suggestions")).not.toHaveClass(
      "hidden",
    );

    fireEvent.blur(input);
    // Immédiatement après le blur, le panneau reste ouvert (délai volontaire).
    expect(document.querySelector(".search-suggestions")).not.toHaveClass(
      "hidden",
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(document.querySelector(".search-suggestions")).toHaveClass("hidden");
  });

  it("focus avec valeur non vide réouvre le panneau", () => {
    render(
      <ControlledSearchInput initialValue="Bu" suggestions={SUGGESTIONS} />,
    );
    const input = document.querySelector(".search-input") as HTMLInputElement;

    fireEvent.focus(input);
    expect(document.querySelector(".search-suggestions")).not.toHaveClass(
      "hidden",
    );

    fireEvent.blur(input);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(document.querySelector(".search-suggestions")).toHaveClass("hidden");

    fireEvent.focus(input);
    expect(document.querySelector(".search-suggestions")).not.toHaveClass(
      "hidden",
    );
  });
});

describe("SearchInput — disabled", () => {
  it("pose disabled sur .search-input et .search-clear", () => {
    render(<SearchInput value="x" onChange={() => {}} disabled />);
    expect(document.querySelector(".search-input")).toBeDisabled();
    expect(document.querySelector(".search-clear")).toBeDisabled();
  });
});
