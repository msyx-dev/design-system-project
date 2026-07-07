import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  Dropdown,
  DropdownOption,
  DropdownMultiProps,
  DropdownSingleProps,
} from "./Dropdown";

const OPTIONS: DropdownOption[] = [
  { value: "next", label: "Next.js" },
  { value: "nuxt", label: "Nuxt.js" },
  { value: "svelte", label: "SvelteKit", disabled: true },
  { value: "remix", label: "Remix" },
];

/** Wrapper contrôlé single — reflète les mises à jour d'état comme un vrai consumer. */
function ControlledSingle(
  props: Partial<Omit<DropdownSingleProps, "value" | "onChange">> & {
    onChange?: DropdownSingleProps["onChange"];
    initialValue?: string;
  },
) {
  const { initialValue = "", onChange, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return (
    <Dropdown
      options={OPTIONS}
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

/** Wrapper contrôlé multi. */
function ControlledMulti(
  props: Partial<Omit<DropdownMultiProps, "value" | "onChange" | "multi">> & {
    onChange?: DropdownMultiProps["onChange"];
    initialValue?: string[];
  },
) {
  const { initialValue = [], onChange, ...rest } = props;
  const [value, setValue] = useState<string[]>(initialValue);
  return (
    <Dropdown
      options={OPTIONS}
      multi
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("Dropdown — structure & markup", () => {
  it("rend .dropdown/.dropdown-trigger/.dropdown-value fermé par défaut, menu absent", () => {
    render(
      <Dropdown
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        placeholder="Choisir..."
      />,
    );

    const wrap = document.querySelector(".dropdown");
    expect(wrap).toBeInTheDocument();
    expect(wrap).not.toHaveAttribute("data-multi");

    const trigger = document.querySelector(".dropdown-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toHaveClass("open");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector(".dropdown-value")).toHaveTextContent(
      "Choisir...",
    );

    expect(document.querySelector(".dropdown-menu")).not.toBeInTheDocument();
  });

  it('data-multi="true" posé sur .dropdown en mode multi', () => {
    render(<ControlledMulti />);
    expect(document.querySelector(".dropdown")).toHaveAttribute(
      "data-multi",
      "true",
    );
  });

  it("affiche le libellé de l'option sélectionnée en mode single", () => {
    render(
      <Dropdown
        options={OPTIONS}
        value="nuxt"
        onChange={vi.fn()}
        placeholder="Choisir..."
      />,
    );
    expect(document.querySelector(".dropdown-value")).toHaveTextContent(
      "Nuxt.js",
    );
  });
});

describe("Dropdown — ouverture / fermeture (classes d'état)", () => {
  it("clic sur le trigger ouvre le menu : .dropdown-menu.open + .dropdown-trigger.open", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} />);

    const trigger = document.querySelector(".dropdown-trigger") as HTMLElement;
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveClass("open");

    const menu = document.querySelector(".dropdown-menu");
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveClass("open");
    expect(menu).toHaveAttribute("role", "listbox");
  });

  it("re-clic sur le trigger referme le menu (toggle) — .open retiré", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} />);

    const trigger = document.querySelector(".dropdown-trigger") as HTMLElement;
    await user.click(trigger);
    expect(document.querySelector(".dropdown-menu")).toBeInTheDocument();

    await user.click(trigger);
    expect(document.querySelector(".dropdown-menu")).not.toBeInTheDocument();
    expect(trigger).not.toHaveClass("open");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("clic à l'extérieur ferme le menu", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Dropdown options={OPTIONS} value="" onChange={vi.fn()} />
        <button type="button">Ailleurs</button>
      </div>,
    );

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    expect(document.querySelector(".dropdown-menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ailleurs" }));
    expect(document.querySelector(".dropdown-menu")).not.toBeInTheDocument();
  });

  it("Echap ferme le menu et restaure le focus sur le trigger", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} />);

    const trigger = document.querySelector(".dropdown-trigger") as HTMLElement;
    await user.click(trigger);
    expect(document.querySelector(".dropdown-menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(document.querySelector(".dropdown-menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("Dropdown — sélection single", () => {
  it("clic sur une option appelle onChange avec la bonne valeur et ferme le menu", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Dropdown options={OPTIONS} value="" onChange={onChange} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    await user.click(screen.getByText("Nuxt.js"));

    expect(onChange).toHaveBeenCalledWith("nuxt");
    expect(document.querySelector(".dropdown-menu")).not.toBeInTheDocument();
  });

  it("l'option sélectionnée porte .selected + .check visible (contrôlé via wrapper)", async () => {
    const user = userEvent.setup();
    render(<ControlledSingle />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    await user.click(screen.getByText("Next.js"));

    // Réouverture pour inspecter l'état après le re-render contrôlé.
    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );

    const options = Array.from(document.querySelectorAll(".dropdown-option"));
    const nextOption = options.find((o) => o.textContent?.includes("Next.js"));
    expect(nextOption).toHaveClass("selected");
    expect(nextOption).toHaveAttribute("aria-selected", "true");
    expect(nextOption?.querySelector(".check")).toBeInTheDocument();

    const nuxtOption = options.find((o) => o.textContent?.includes("Nuxt.js"));
    expect(nuxtOption).not.toHaveClass("selected");
    expect(nuxtOption).toHaveAttribute("aria-selected", "false");
  });

  it("option disabled : clic n'appelle pas onChange, aria-disabled présent", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Dropdown options={OPTIONS} value="" onChange={onChange} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    const disabledOption = screen
      .getByText("SvelteKit")
      .closest(".dropdown-option") as HTMLElement;
    expect(disabledOption).toHaveAttribute("aria-disabled", "true");

    await user.click(disabledOption);
    expect(onChange).not.toHaveBeenCalled();
    // Le menu reste ouvert (sélection refusée, pas de fermeture).
    expect(document.querySelector(".dropdown-menu")).toBeInTheDocument();
  });
});

describe("Dropdown — sélection multi", () => {
  it("mode multi : sélectionner une option ne ferme PAS le menu", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Dropdown options={OPTIONS} multi value={[]} onChange={onChange} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    await user.click(screen.getByText("Next.js"));

    expect(onChange).toHaveBeenCalledWith(["next"]);
    expect(document.querySelector(".dropdown-menu")).toBeInTheDocument();
  });

  it("mode multi : re-clic sur une option déjà sélectionnée la retire (toggle)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Dropdown
        options={OPTIONS}
        multi
        value={["next", "remix"]}
        onChange={onChange}
      />,
    );

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    await user.click(screen.getByText("Next.js"));

    expect(onChange).toHaveBeenCalledWith(["remix"]);
  });

  it("mode multi : options sélectionnées portent .selected simultanément", async () => {
    const user = userEvent.setup();
    render(<ControlledMulti initialValue={["next", "remix"]} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );

    const options = Array.from(document.querySelectorAll(".dropdown-option"));
    const next = options.find((o) => o.textContent?.includes("Next.js"));
    const remix = options.find((o) => o.textContent?.includes("Remix"));
    const nuxt = options.find((o) => o.textContent?.includes("Nuxt.js"));

    expect(next).toHaveClass("selected");
    expect(remix).toHaveClass("selected");
    expect(nuxt).not.toHaveClass("selected");
  });
});

describe("Dropdown — a11y & navigation clavier", () => {
  it("aria-expanded reflète l'état ouvert/fermé", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} />);
    const trigger = document.querySelector(".dropdown-trigger") as HTMLElement;

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("ouverture pose le focus sur la 1ère option activable (non-searchable)", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );

    expect(
      screen.getByText("Next.js").closest(".dropdown-option"),
    ).toHaveFocus();
  });

  it("ArrowDown/ArrowUp déplacent le focus entre options en bouclant, sautent disabled", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    expect(
      screen.getByText("Next.js").closest(".dropdown-option"),
    ).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByText("Nuxt.js").closest(".dropdown-option"),
    ).toHaveFocus();

    // SvelteKit est disabled → sauté.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("Remix").closest(".dropdown-option")).toHaveFocus();

    // Boucle : retour au premier.
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByText("Next.js").closest(".dropdown-option"),
    ).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("Remix").closest(".dropdown-option")).toHaveFocus();
  });

  it("Home/End sautent au premier/dernier option activable", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    await user.keyboard("{End}");
    expect(screen.getByText("Remix").closest(".dropdown-option")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(
      screen.getByText("Next.js").closest(".dropdown-option"),
    ).toHaveFocus();
  });

  it("Enter sur une option focusée la sélectionne", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Dropdown options={OPTIONS} value="" onChange={onChange} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("nuxt");
  });

  it("aria-selected reflète la sélection sur chaque option à l'ouverture", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="nuxt" onChange={vi.fn()} />);

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );

    const menuOptions = Array.from(
      document.querySelectorAll(".dropdown-menu .dropdown-option"),
    );
    const nuxtOption = menuOptions.find((o) =>
      o.textContent?.includes("Nuxt.js"),
    );
    const nextOption = menuOptions.find((o) =>
      o.textContent?.includes("Next.js"),
    );
    expect(nuxtOption).toHaveAttribute("aria-selected", "true");
    expect(nextOption).toHaveAttribute("aria-selected", "false");
  });
});

describe("Dropdown — searchable", () => {
  it("rend .dropdown-search avec input, focus posé dessus à l'ouverture", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown options={OPTIONS} value="" onChange={vi.fn()} searchable />,
    );

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );

    const input = document.querySelector(
      ".dropdown-search input",
    ) as HTMLElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("filtre les options sur le libellé (insensible à la casse)", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown options={OPTIONS} value="" onChange={vi.fn()} searchable />,
    );

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    const input = document.querySelector(
      ".dropdown-search input",
    ) as HTMLElement;
    await user.type(input, "next");

    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.queryByText("Nuxt.js")).not.toBeInTheDocument();
    expect(screen.queryByText("Remix")).not.toBeInTheDocument();
  });

  it("ArrowDown depuis la recherche déplace le focus vers la 1ère option", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown options={OPTIONS} value="" onChange={vi.fn()} searchable />,
    );

    await user.click(
      document.querySelector(".dropdown-trigger") as HTMLElement,
    );
    const input = document.querySelector(
      ".dropdown-search input",
    ) as HTMLElement;
    expect(input).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByText("Next.js").closest(".dropdown-option"),
    ).toHaveFocus();
  });
});
