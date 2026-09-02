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

/**
 * #855 besoin 1 — motif combobox créatif. Avant, `filteredOptions.map(...)` ne
 * rendait rien de plus quand la liste filtrée était vide : aucun slot pour
 * proposer la création de la valeur saisie. Demandé par keepthread#18/#19/#20
 * (création de Périmètre / Acteur / Contexte à la volée depuis le sélecteur).
 */
describe("Dropdown — entrée de création (#855)", () => {
  const openAndType = async (query: string, extra: Partial<DropdownSingleProps> = {}) => {
    const user = userEvent.setup();
    render(
      <Dropdown
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        searchable
        {...extra}
      />,
    );
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    await user.type(
      document.querySelector(".dropdown-search input") as HTMLElement,
      query,
    );
    return user;
  };

  it("sans onCreateOption, une recherche sans résultat ne rend RIEN de plus (rétrocompatibilité)", async () => {
    await openAndType("zzzz");
    expect(document.querySelectorAll(".dropdown-option")).toHaveLength(0);
    expect(document.querySelector(".dropdown-create")).toBeNull();
  });

  it("avec onCreateOption, rend .dropdown-option.dropdown-create quand le filtre ne retourne rien", async () => {
    await openAndType("Alexandre", { onCreateOption: vi.fn() });
    const create = document.querySelector(".dropdown-option.dropdown-create");
    expect(create).toBeInTheDocument();
    expect(create).toHaveAttribute("role", "option");
    expect(
      create?.querySelector(".dropdown-create-query")?.textContent,
    ).toBe("Alexandre");
  });

  it("n'apparaît PAS tant que le filtre retourne au moins une option", async () => {
    await openAndType(OPTIONS[0].label as string, { onCreateOption: vi.fn() });
    expect(document.querySelectorAll(".dropdown-option").length).toBeGreaterThan(0);
    expect(document.querySelector(".dropdown-create")).toBeNull();
  });

  it("n'apparaît PAS sur une requête vide (rien à créer)", async () => {
    const user = userEvent.setup();
    render(
      <Dropdown
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        searchable
        onCreateOption={vi.fn()}
      />,
    );
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    expect(document.querySelector(".dropdown-create")).toBeNull();
  });

  it("le clic appelle onCreateOption avec la requête et ferme le menu", async () => {
    const onCreateOption = vi.fn();
    const user = await openAndType("Alexandre Poutrain", { onCreateOption });
    await user.click(document.querySelector(".dropdown-create") as HTMLElement);
    expect(onCreateOption).toHaveBeenCalledWith("Alexandre Poutrain");
    expect(document.querySelector(".dropdown-menu")).toBeNull();
  });

  it("est sélectionnable au CLAVIER comme une option normale (ArrowDown depuis la recherche puis Entrée)", async () => {
    const onCreateOption = vi.fn();
    const user = await openAndType("Alexandre", { onCreateOption });
    await user.keyboard("{ArrowDown}");
    expect(document.querySelector(".dropdown-create")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onCreateOption).toHaveBeenCalledWith("Alexandre");
  });

  it("n'est jamais annoncée sélectionnée et n'écrit pas dans .dropdown-value (c'est une action)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Dropdown
        options={OPTIONS}
        value=""
        onChange={onChange}
        placeholder="Choisir"
        searchable
        onCreateOption={vi.fn()}
      />,
    );
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    await user.type(
      document.querySelector(".dropdown-search input") as HTMLElement,
      "Alexandre",
    );
    const create = document.querySelector(".dropdown-create") as HTMLElement;
    expect(create).toHaveAttribute("aria-selected", "false");
    expect(create).not.toHaveClass("selected");
    await user.click(create);
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector(".dropdown-value")?.textContent).toBe("Choisir");
  });

  it("createOptionLabel remplace le libellé par défaut", async () => {
    await openAndType("Alexandre", {
      onCreateOption: vi.fn(),
      createOptionLabel: (q) => `Créer le périmètre ${q}`,
    });
    expect(
      document.querySelector(".dropdown-create")?.textContent,
    ).toContain("Créer le périmètre Alexandre");
  });

  it("en mode multi aussi, la création ferme le menu (sélection ordinaire non)", async () => {
    const onCreateOption = vi.fn();
    const user = userEvent.setup();
    render(
      <Dropdown
        options={OPTIONS}
        multi
        value={[]}
        onChange={vi.fn()}
        searchable
        onCreateOption={onCreateOption}
      />,
    );
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    await user.type(
      document.querySelector(".dropdown-search input") as HTMLElement,
      "Alexandre",
    );
    await user.click(document.querySelector(".dropdown-create") as HTMLElement);
    expect(onCreateOption).toHaveBeenCalledWith("Alexandre");
    expect(document.querySelector(".dropdown-menu")).toBeNull();
  });
});

/**
 * #855 besoin 2 — recherche contrôlable. `searchQuery` était un état interne
 * non exposé : le parent ne pouvait pas savoir que l'utilisateur avait commencé
 * à taper, donc pas faire varier `options` (favoris et récents tant que le champ
 * est vide, référentiel complet dès la première frappe).
 */
describe("Dropdown — recherche contrôlée (#855)", () => {
  it("sans searchQuery, la recherche reste interne (comportement inchangé)", async () => {
    const user = userEvent.setup();
    render(<Dropdown options={OPTIONS} value="" onChange={vi.fn()} searchable />);
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    const input = document.querySelector(".dropdown-search input") as HTMLInputElement;
    await user.type(input, "ab");
    expect(input.value).toBe("ab");
  });

  it("onSearchChange est notifié à chaque frappe, même en mode non contrôlé", async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Dropdown
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        searchable
        onSearchChange={onSearchChange}
      />,
    );
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    await user.type(
      document.querySelector(".dropdown-search input") as HTMLElement,
      "ab",
    );
    expect(onSearchChange).toHaveBeenLastCalledWith("ab");
  });

  it("en mode contrôlé, la valeur affichée vient du parent — le composant n'écrit jamais seul", async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Dropdown
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        searchable
        searchQuery="fige"
        onSearchChange={onSearchChange}
      />,
    );
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    const input = document.querySelector(".dropdown-search input") as HTMLInputElement;
    expect(input.value).toBe("fige");
    await user.type(input, "x");
    expect(onSearchChange).toHaveBeenCalledWith("figex");
    // Le parent n'ayant pas mis à jour searchQuery, l'affichage ne bouge pas.
    expect(input.value).toBe("fige");
  });

  it("divulgation progressive : le parent fait varier options selon la requête", async () => {
    function ProgressiveDisclosure() {
      const [query, setQuery] = useState("");
      const favorites: DropdownOption[] = [
        { value: "fav", label: "Favori recent" },
      ];
      const referentiel: DropdownOption[] = [
        { value: "ref-1", label: "Zebre du referentiel" },
      ];
      return (
        <Dropdown
          options={query ? referentiel : favorites}
          value=""
          onChange={vi.fn()}
          searchable
          searchQuery={query}
          onSearchChange={setQuery}
        />
      );
    }
    const user = userEvent.setup();
    render(<ProgressiveDisclosure />);
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
    expect(screen.getByText("Favori recent")).toBeInTheDocument();

    await user.type(
      document.querySelector(".dropdown-search input") as HTMLElement,
      "Zebre",
    );
    expect(screen.getByText("Zebre du referentiel")).toBeInTheDocument();
    expect(screen.queryByText("Favori recent")).toBeNull();
  });

  it("à la fermeture, le composant NOTIFIE la remise à zéro au lieu de l'écrire", async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Dropdown
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        searchable
        searchQuery="abc"
        onSearchChange={onSearchChange}
      />,
    );
    const trigger = document.querySelector(".dropdown-trigger") as HTMLElement;
    await user.click(trigger);
    onSearchChange.mockClear();
    await user.click(trigger); // ferme
    expect(onSearchChange).toHaveBeenCalledWith("");
  });
});

// --- Conteneur du portail (#934) ---------------------------------------------
//
// Un <dialog> ouvert par showModal() entre dans le « top layer » : tout ce qui
// est hors de son sous-arbre devient inerte, clic ET focus bloqués, quel que
// soit le z-index. Le panneau porté dans document.body est un FRÈRE du dialog —
// donc inerte. Porté DANS le dialog, il redevient atteignable. C'est un choix
// de CONTENEUR, aucune valeur d'empilement ne peut le remplacer.
describe("Dropdown — conteneur du portail (#934)", () => {
  const openMenu = async () => {
    const user = userEvent.setup();
    await user.click(document.querySelector(".dropdown-trigger") as HTMLElement);
  };

  it("hors dialog, le menu est porté dans document.body (comportement d'origine)", async () => {
    render(<ControlledSingle />);
    await openMenu();
    const menu = document.querySelector(".dropdown-menu") as HTMLElement;
    expect(menu.parentElement).toBe(document.body);
    expect(menu.closest("dialog")).toBeNull();
  });

  it("dans un <dialog open>, le menu est porté DANS le dialog", async () => {
    render(
      <dialog open data-testid="dlg">
        <ControlledSingle />
      </dialog>,
    );
    await openMenu();
    const menu = document.querySelector(".dropdown-menu") as HTMLElement;
    expect(menu.closest("dialog")).not.toBeNull();
    expect(menu.parentElement?.tagName).toBe("DIALOG");
  });

  it("un dialog FERMÉ ne capte pas le portail (il n'est pas dans le top layer)", async () => {
    render(
      <dialog>
        <ControlledSingle />
      </dialog>,
    );
    await openMenu();
    const menu = document.querySelector(".dropdown-menu") as HTMLElement;
    // `dialog[open]` et non `dialog` : un dialog fermé n'inerte rien, et son
    // contenu n'est pas rendu — y porter le menu le rendrait invisible.
    expect(menu.parentElement).toBe(document.body);
  });
});
