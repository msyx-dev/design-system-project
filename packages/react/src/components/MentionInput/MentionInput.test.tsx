import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { MentionInput, MentionInputProps } from "./MentionInput";

afterEach(() => {
  cleanup();
});

/** Wrapper contrôlé minimal pour les tests d'interaction (state réel React). */
function ControlledMentionInput(
  props: Omit<MentionInputProps, "value" | "onChange"> & {
    initialValue?: string;
    onChange?: (value: string) => void;
  },
) {
  const { initialValue = "", onChange, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return (
    <MentionInput
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const SUGGESTIONS = ["Alice Martin", "Bob Durand", "Carla Nguyen"];

function getTextarea() {
  return document.querySelector(
    ".mention-input-wrap textarea",
  ) as HTMLTextAreaElement;
}

function getDropdown() {
  return document.querySelector(".mention-dropdown") as HTMLUListElement;
}

describe("MentionInput — structure", () => {
  it("rend .mention-input-wrap > textarea.input + ul.mention-dropdown[role=listbox]", () => {
    render(
      <MentionInput
        value=""
        onChange={() => {}}
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    expect(document.querySelector(".mention-input-wrap")).toBeInTheDocument();
    const textarea = getTextarea();
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass("input");

    const dropdown = getDropdown();
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveAttribute("role", "listbox");
    expect(dropdown).toHaveAttribute("aria-label", "Suggestions de mention");
  });
});

describe("MentionInput — ARIA sur le textarea", () => {
  it("role=combobox, aria-autocomplete=list, aria-haspopup=listbox, aria-expanded=false, aria-controls", () => {
    render(
      <MentionInput
        value=""
        onChange={() => {}}
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    const textarea = getTextarea();
    expect(textarea).toHaveAttribute("role", "combobox");
    expect(textarea).toHaveAttribute("aria-autocomplete", "list");
    expect(textarea).toHaveAttribute("aria-haspopup", "listbox");
    expect(textarea).toHaveAttribute("aria-expanded", "false");
    expect(textarea).toHaveAttribute("aria-controls", getDropdown().id);
    expect(textarea).toHaveAttribute("aria-label", "Commentaire");
  });
});

describe("MentionInput — classe d'état critique .open (piège n°1)", () => {
  it("ouvre avec .open (PAS .hidden / .mention-dropdown--open / .show / [hidden])", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    const textarea = getTextarea();
    await user.type(textarea, "@al");

    const dropdown = getDropdown();
    expect(dropdown).toHaveClass("open");
    expect(dropdown).not.toHaveClass("hidden");
    expect(dropdown).not.toHaveClass("mention-dropdown--open");
    expect(dropdown).not.toHaveClass("show");
    expect(dropdown).not.toHaveAttribute("hidden");
  });

  it("ferme (Escape) : .open retirée, aria-expanded=false, aria-activedescendant absent", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    const textarea = getTextarea();
    await user.type(textarea, "@al");
    expect(getDropdown()).toHaveClass("open");

    await user.keyboard("{Escape}");

    expect(getDropdown()).not.toHaveClass("open");
    expect(textarea).toHaveAttribute("aria-expanded", "false");
    expect(textarea).not.toHaveAttribute("aria-activedescendant");
  });
});

describe("MentionInput — filtrage", () => {
  it("filtre les suggestions matchant la query", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    await user.type(getTextarea(), "@ar");

    const items = Array.from(document.querySelectorAll(".search-item"));
    expect(items.map((i) => i.textContent)).toEqual([
      "Alice Martin",
      "Carla Nguyen",
    ]);
  });

  it("aucun résultat : .search-no-result avec la query, pas de role", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    await user.type(getTextarea(), "@zzz");

    const noResult = document.querySelector(".search-no-result");
    expect(noResult).toBeInTheDocument();
    expect(noResult?.textContent).toContain("zzz");
    expect(noResult).not.toHaveAttribute("role");
    expect(document.querySelectorAll(".search-item")).toHaveLength(0);
  });
});

describe("MentionInput — highlight & anti-XSS (non-régression V1 vanilla)", () => {
  it("surligne la portion matchée via <mark>", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    await user.type(getTextarea(), "@ali");

    const item = document.querySelector(".search-item") as HTMLElement;
    const mark = item.querySelector("mark");
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent?.toLowerCase()).toBe("ali");
  });

  it("une suggestion contenant du HTML est affichée LITTÉRALEMENT (pas d'exécution, pas d'élément img créé)", async () => {
    const user = userEvent.setup();
    const malicious = "<img src=x onerror=alert(1)>";
    render(
      <ControlledMentionInput
        suggestions={[malicious]}
        ariaLabel="Commentaire"
      />,
    );

    await user.type(getTextarea(), "@img");

    const item = document.querySelector(".search-item") as HTMLElement;
    expect(item).toBeInTheDocument();
    expect(item.querySelector("img")).not.toBeInTheDocument();
    expect(item.textContent).toContain("<img src=x onerror=alert(1)>");
    // Le highlight continue de fonctionner même sur ce texte échappé.
    expect(item.querySelector("mark")).toBeInTheDocument();
  });
});

describe("MentionInput — clavier", () => {
  it("ArrowDown avance .active + aria-selected + aria-activedescendant, ne dépasse pas le dernier", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    await user.type(getTextarea(), "@");
    const items = () => Array.from(document.querySelectorAll(".search-item"));

    await user.keyboard("{ArrowDown}");
    expect(items()[0]).toHaveClass("active");
    expect(items()[0]).toHaveAttribute("aria-selected", "true");
    expect(getTextarea()).toHaveAttribute(
      "aria-activedescendant",
      items()[0].id,
    );

    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(items()[items().length - 1]).toHaveClass("active");
  });

  it("ArrowUp borne à 0 (PAS -1, contrairement à SearchInput)", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    await user.type(getTextarea(), "@");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");

    const items = Array.from(document.querySelectorAll(".search-item"));
    expect(items[0]).toHaveClass("active");
    expect(items[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter avec sélection insère la mention et ferme", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
        onChange={onChange}
        onSelect={onSelect}
      />,
    );

    await user.type(getTextarea(), "@al");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("@Alice Martin ");
    expect(onSelect).toHaveBeenCalledWith("Alice Martin");
    expect(getDropdown()).not.toHaveClass("open");
  });

  it("Enter SANS sélection préalable n'insère rien (retour à la ligne natif)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
        onSelect={onSelect}
      />,
    );

    await user.type(getTextarea(), "@al");
    await user.keyboard("{Enter}");

    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("MentionInput — caret après insertion (piège React contrôlé)", () => {
  it("le caret est repositionné juste après l'espace inséré, pas en fin de texte", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        initialValue="hey @al fin"
        ariaLabel="Commentaire"
        suggestions={SUGGESTIONS}
      />,
    );

    const textarea = getTextarea();
    textarea.focus();
    textarea.setSelectionRange(7, 7);
    fireEvent.select(textarea);
    // Re-déclenche la détection via keyUp (comme le ferait un déplacement de caret) :
    fireEvent.keyUp(textarea, { key: "ArrowLeft" });

    await user.keyboard("{ArrowDown}{Enter}");

    expect(textarea.value).toBe("hey @Alice Martin  fin");
    expect(textarea.selectionStart).toBe(18);
    expect(textarea.selectionStart).not.toBe(textarea.value.length);
  });
});

describe("MentionInput — souris", () => {
  it("mousedown sur un item insère et preventDefault (ne vole pas le focus)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
        onSelect={onSelect}
      />,
    );

    await user.type(getTextarea(), "@bob");

    const item = document.querySelector(".search-item") as HTMLElement;
    const event = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    const dispatched = fireEvent(item, event);

    expect(onSelect).toHaveBeenCalledWith("Bob Durand");
    // fireEvent renvoie `false` quand preventDefault() a été appelé.
    expect(dispatched).toBe(false);
  });
});

describe("MentionInput — blur différé (timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dropdown encore ouvert à t+100ms, fermé à t+150ms", () => {
    render(
      <ControlledMentionInput
        initialValue="@al"
        ariaLabel="Commentaire"
        suggestions={SUGGESTIONS}
      />,
    );
    const textarea = getTextarea();
    textarea.focus();
    textarea.setSelectionRange(3, 3);

    fireEvent.keyUp(textarea, { key: "a" });
    expect(getDropdown()).toHaveClass("open");

    fireEvent.blur(textarea);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(getDropdown()).toHaveClass("open");

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(getDropdown()).not.toHaveClass("open");
  });

  it("démontage avant l'échéance du blur ne lève aucune exception (timer nettoyé)", () => {
    const { unmount } = render(
      <ControlledMentionInput
        initialValue="@al"
        ariaLabel="Commentaire"
        suggestions={SUGGESTIONS}
      />,
    );
    const textarea = getTextarea();
    fireEvent.keyUp(textarea, { key: "a" });
    fireEvent.blur(textarea);

    expect(() => {
      unmount();
      act(() => {
        vi.advanceTimersByTime(150);
      });
    }).not.toThrow();
  });
});

describe("MentionInput — miroir non fuité", () => {
  it("le nombre d'enfants de <body> ne varie pas après ouverture/fermeture (pas de <div> fantôme)", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    const before = document.body.childElementCount;
    await user.type(getTextarea(), "@al");
    const after = document.body.childElementCount;

    expect(after).toBe(before);
    expect(
      document.querySelector('div[style*="-9999px"]'),
    ).not.toBeInTheDocument();
  });
});

describe("MentionInput — positionnement (limite jsdom)", () => {
  it("ul.style.top/left ont la FORME d'une valeur px (jsdom renvoie 0 pour tout offset — la justesse est couverte par mention-core.test.ts)", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
      />,
    );

    await user.type(getTextarea(), "@al");

    const dropdown = getDropdown();
    expect(dropdown.style.top).toMatch(/^-?\d+(\.\d+)?px$/);
    expect(dropdown.style.left).toMatch(/^-?\d+(\.\d+)?px$/);
  });
});

describe("MentionInput — contrat de données", () => {
  it("filter={false} : toutes les suggestions restent affichées malgré la query", async () => {
    const user = userEvent.setup();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
        filter={false}
      />,
    );

    await user.type(getTextarea(), "@zzz");

    expect(document.querySelectorAll(".search-item")).toHaveLength(
      SUGGESTIONS.length,
    );
  });

  it("onQueryChange reçoit la query à l'ouverture puis null à la fermeture", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(
      <ControlledMentionInput
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
        onQueryChange={onQueryChange}
      />,
    );

    await user.type(getTextarea(), "@al");
    expect(onQueryChange).toHaveBeenCalledWith("al");

    await user.keyboard("{Escape}");
    expect(onQueryChange).toHaveBeenCalledWith(null);
  });
});

describe("MentionInput — disabled", () => {
  it("textarea désactivé, la saisie n'ouvre rien", () => {
    render(
      <MentionInput
        value=""
        onChange={() => {}}
        suggestions={SUGGESTIONS}
        ariaLabel="Commentaire"
        disabled
      />,
    );

    expect(getTextarea()).toBeDisabled();
    expect(getDropdown()).not.toHaveClass("open");
  });
});
