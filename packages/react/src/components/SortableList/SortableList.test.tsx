import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import {
  SortableList,
  SortableListItem,
  resolveMoveModifier,
} from "./SortableList";

const ITEMS: SortableListItem[] = [
  { id: "a", children: "Concevoir la maquette" },
  { id: "b", children: "Intégrer les composants" },
  { id: "c", children: "Écrire les tests" },
  { id: "d", children: "Déployer en production" },
];

beforeEach(() => {
  // jsdom n'implémente PAS setPointerCapture/releasePointerCapture (méthodes
  // absentes) — même précédent que `SplitPane.test.tsx`.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Filet de sécurité : un test de drag tactile interrompu pourrait laisser
  // un clone fantôme dans document.body (il n'est jamais nettoyé par
  // `cleanup()` de RTL, qui ne vide que le container de render). Filtré sur
  // `style.position` (accesseur normalisé) plutôt qu'un match texte brut sur
  // `cssText` — la sérialisation insère un espace après `:` (`"position:
  // fixed"`), fragile à matcher en substring.
  queryPointerClones().forEach((el) => el.remove());
});

/** Clones fantômes de drag tactile encore présents dans `document.body`. */
function queryPointerClones(): HTMLElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>("li[style]"),
  ).filter((el) => el.style.position === "fixed");
}

function ControlledHarness({
  initialItems = ITEMS,
  numbered = false,
}: {
  initialItems?: SortableListItem[];
  numbered?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  return (
    <SortableList
      items={items}
      onReorder={setItems}
      numbered={numbered}
      ariaLabel="Liste réordonnable"
    />
  );
}

describe("SortableList — structure", () => {
  it("rend le markup canonique .sortable-list/.sortable-item/.sortable-handle avec role=listbox/option", () => {
    render(
      <SortableList items={ITEMS} onReorder={() => {}} ariaLabel="Tâches" />,
    );

    const list = document.querySelector(".sortable-list");
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("role", "listbox");
    expect(list).toHaveAttribute("aria-label", "Tâches");

    const items = document.querySelectorAll(".sortable-item");
    expect(items).toHaveLength(4);
    items.forEach((item) => {
      expect(item).toHaveAttribute("role", "option");
      expect(item).toHaveAttribute("draggable", "true");
      expect(item).toHaveAttribute("aria-grabbed", "false");
      expect(item.querySelector(".sortable-handle")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });
  });

  it("pose tabindex=0 sur le premier item uniquement (roving tabindex initial)", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const items = document.querySelectorAll(".sortable-item");
    expect(items[0]).toHaveAttribute("tabindex", "0");
    expect(items[1]).toHaveAttribute("tabindex", "-1");
    expect(items[2]).toHaveAttribute("tabindex", "-1");
    expect(items[3]).toHaveAttribute("tabindex", "-1");
  });

  it("n'ajoute pas .sortable-list--numbered ni .sortable-num par défaut", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    expect(document.querySelector(".sortable-list")).not.toHaveClass(
      "sortable-list--numbered",
    );
    expect(document.querySelector(".sortable-num")).not.toBeInTheDocument();
  });

  it("numbered ajoute .sortable-list--numbered + .sortable-num dérivé de l'index (1-based)", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} numbered />);
    expect(document.querySelector(".sortable-list")).toHaveClass(
      "sortable-list--numbered",
    );
    const nums = Array.from(document.querySelectorAll(".sortable-num")).map(
      (el) => el.textContent,
    );
    expect(nums).toEqual(["1", "2", "3", "4"]);
  });

  it("passe className sur la racine et item.className sur un item", () => {
    const items: SortableListItem[] = [
      { id: "x", children: "X", className: "custom-item" },
      { id: "y", children: "Y" },
    ];
    render(
      <SortableList
        items={items}
        onReorder={() => {}}
        className="custom-list"
      />,
    );
    expect(document.querySelector(".sortable-list")).toHaveClass("custom-list");
    expect(screen.getByText("X").closest(".sortable-item")).toHaveClass(
      "custom-item",
    );
  });

  it("rend une région live .sr-only, aria-live=polite, initialement vide (aucune classe .sortable-live — pas de règle CSS dédiée, #853)", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const live = document.querySelector(".sr-only");
    expect(live).toBeInTheDocument();
    expect(live).not.toHaveClass("sortable-live");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("aria-atomic", "true");
    expect(live?.textContent).toBe("");
  });
});

describe("SortableList — contrôlé (aucun ordre interne)", () => {
  it("un drop n'affecte PAS le DOM tant que le parent ne renvoie pas onReorder", () => {
    const onReorder = vi.fn();
    render(<SortableList items={ITEMS} onReorder={onReorder} />);

    const list = document.querySelector(".sortable-list") as HTMLElement;
    const [itemA, , itemC] = Array.from(
      list.querySelectorAll(".sortable-item"),
    );

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(itemC, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(itemC, { dataTransfer: makeDataTransfer() });

    expect(onReorder).toHaveBeenCalledTimes(1);
    // Ordre DOM inchangé — le composant ne mute jamais `items` lui-même.
    const labelsAfter = Array.from(list.querySelectorAll(".sortable-item")).map(
      (el) => el.textContent,
    );
    expect(labelsAfter).toEqual([
      "⋮⋮Concevoir la maquette",
      "⋮⋮Intégrer les composants",
      "⋮⋮Écrire les tests",
      "⋮⋮Déployer en production",
    ]);
  });
});

describe("SortableList — glisser-déposer souris (HTML5 Drag & Drop)", () => {
  it("dragstart pose .dragging + aria-grabbed=true sur la source", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });

    expect(itemA).toHaveClass("dragging");
    expect(itemA).toHaveAttribute("aria-grabbed", "true");
  });

  it("dragover pose .drag-over UNIQUEMENT sur la cible (pas sur la source)", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const itemC = screen.getByText("Écrire les tests").closest("li")!;

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(itemC, { dataTransfer: makeDataTransfer() });

    expect(itemC).toHaveClass("drag-over");
    expect(itemA).not.toHaveClass("drag-over");
  });

  it("dragleave retire .drag-over de l'item qui le reçoit", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const itemC = screen.getByText("Écrire les tests").closest("li")!;

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(itemC, { dataTransfer: makeDataTransfer() });
    expect(itemC).toHaveClass("drag-over");

    fireEvent.dragLeave(itemC);
    expect(itemC).not.toHaveClass("drag-over");
  });

  it("drop d'un item AVANT la cible appelle onReorder avec la cible passée devant (src<tgt)", () => {
    const onReorder = vi.fn();
    render(<SortableList items={ITEMS} onReorder={onReorder} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const itemC = screen.getByText("Écrire les tests").closest("li")!;

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(itemC, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(itemC, { dataTransfer: makeDataTransfer() });

    expect(onReorder).toHaveBeenCalledWith([
      { id: "b", children: "Intégrer les composants" },
      { id: "c", children: "Écrire les tests" },
      { id: "a", children: "Concevoir la maquette" },
      { id: "d", children: "Déployer en production" },
    ]);
  });

  it("drop d'un item APRÈS la cible appelle onReorder avec la cible passée derrière (src>tgt)", () => {
    const onReorder = vi.fn();
    render(<SortableList items={ITEMS} onReorder={onReorder} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const itemD = screen.getByText("Déployer en production").closest("li")!;

    fireEvent.dragStart(itemD, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(itemA, { dataTransfer: makeDataTransfer() });

    expect(onReorder).toHaveBeenCalledWith([
      { id: "d", children: "Déployer en production" },
      { id: "a", children: "Concevoir la maquette" },
      { id: "b", children: "Intégrer les composants" },
      { id: "c", children: "Écrire les tests" },
    ]);
  });

  it("dragend retire .dragging et .drag-over", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const itemC = screen.getByText("Écrire les tests").closest("li")!;

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(itemC, { dataTransfer: makeDataTransfer() });
    fireEvent.dragEnd(itemA);

    expect(itemA).not.toHaveClass("dragging");
    expect(itemA).toHaveAttribute("aria-grabbed", "false");
    expect(itemC).not.toHaveClass("drag-over");
  });

  it("un drop sur soi-même n'appelle pas onReorder", () => {
    const onReorder = vi.fn();
    render(<SortableList items={ITEMS} onReorder={onReorder} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(itemA, { dataTransfer: makeDataTransfer() });

    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("SortableList — glisser-déposer tactile (Pointer Events)", () => {
  it("pointerdown pointerType=mouse est ignoré (délégué au DnD HTML5)", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const handle = itemA.querySelector(".sortable-handle")!;

    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: "mouse" });

    expect(itemA).not.toHaveClass("dragging");
    expect(queryPointerClones()).toHaveLength(0);
  });

  it("pointerdown pointerType=touch pose .dragging + clone fantôme fixed dans body", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const handle = itemA.querySelector(".sortable-handle")!;
    vi.spyOn(itemA, "getBoundingClientRect").mockReturnValue(
      fakeRect({ top: 0, bottom: 50 }),
    );

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });

    expect(itemA).toHaveClass("dragging");
    expect(itemA).toHaveAttribute("aria-grabbed", "true");
    expect(queryPointerClones()).toHaveLength(1);
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("pointerup tactile sur une autre ligne réordonne et retire le clone", () => {
    const onReorder = vi.fn();
    render(<SortableList items={ITEMS} onReorder={onReorder} />);
    const list = document.querySelector(".sortable-list") as HTMLElement;
    const [itemA, , itemC] = Array.from(
      list.querySelectorAll(".sortable-item"),
    );
    vi.spyOn(itemA, "getBoundingClientRect").mockReturnValue(
      fakeRect({ top: 0, bottom: 50 }),
    );
    vi.spyOn(itemC, "getBoundingClientRect").mockReturnValue(
      fakeRect({ top: 100, bottom: 150 }),
    );

    const handleA = itemA.querySelector(".sortable-handle")!;
    fireEvent.pointerDown(handleA, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(handleA, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 10,
      clientY: 120,
    });
    fireEvent.pointerUp(handleA, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 10,
      clientY: 120,
    });

    expect(onReorder).toHaveBeenCalledWith([
      { id: "b", children: "Intégrer les composants" },
      { id: "c", children: "Écrire les tests" },
      { id: "a", children: "Concevoir la maquette" },
      { id: "d", children: "Déployer en production" },
    ]);
    expect(queryPointerClones()).toHaveLength(0);
    expect(itemA).not.toHaveClass("dragging");
  });

  it("pointercancel tactile nettoie l'état SANS réordonner (ajout défensif au-delà du vanilla)", () => {
    const onReorder = vi.fn();
    render(<SortableList items={ITEMS} onReorder={onReorder} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const handle = itemA.querySelector(".sortable-handle")!;
    vi.spyOn(itemA, "getBoundingClientRect").mockReturnValue(
      fakeRect({ top: 0, bottom: 50 }),
    );

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerCancel(handle, { pointerId: 1, pointerType: "touch" });

    expect(onReorder).not.toHaveBeenCalled();
    expect(itemA).not.toHaveClass("dragging");
    expect(queryPointerClones()).toHaveLength(0);
  });
});

describe("SortableList — navigation clavier (roving tabindex, contrat #836)", () => {
  it("ArrowDown déplace le FOCUS vers l'item suivant sans réordonner", async () => {
    const onReorder = vi.fn();
    const user = userEvent.setup();
    render(<SortableList items={ITEMS} onReorder={onReorder} />);

    const items = document.querySelectorAll(".sortable-item");
    (items[0] as HTMLElement).focus();
    await user.keyboard("{ArrowDown}");

    expect(items[1]).toHaveFocus();
    expect(items[1]).toHaveAttribute("tabindex", "0");
    expect(items[0]).toHaveAttribute("tabindex", "-1");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("ArrowUp déplace le FOCUS vers l'item précédent", async () => {
    const user = userEvent.setup();
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const items = document.querySelectorAll(".sortable-item");
    (items[2] as HTMLElement).focus();
    await user.keyboard("{ArrowUp}");
    expect(items[1]).toHaveFocus();
  });

  it("ArrowUp sur le premier item ne fait rien (pas de bouclage)", async () => {
    const user = userEvent.setup();
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const items = document.querySelectorAll(".sortable-item");
    (items[0] as HTMLElement).focus();
    await user.keyboard("{ArrowUp}");
    expect(items[0]).toHaveFocus();
  });

  it("ArrowDown sur le dernier item ne fait rien (pas de bouclage)", async () => {
    const user = userEvent.setup();
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const items = document.querySelectorAll(".sortable-item");
    (items[3] as HTMLElement).focus();
    await user.keyboard("{ArrowDown}");
    expect(items[3]).toHaveFocus();
  });

  it("End puis Home sautent aux extrémités", async () => {
    const user = userEvent.setup();
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const items = document.querySelectorAll(".sortable-item");
    (items[0] as HTMLElement).focus();

    await user.keyboard("{End}");
    expect(items[3]).toHaveFocus();

    await user.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
  });
});

describe("SortableList — réordonnancement clavier Ctrl+↑/↓ (contrat #836, annonces aria-live)", () => {
  it("Ctrl+ArrowDown déplace l'item d'une position et appelle onReorder (swap adjacent)", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const items = document.querySelectorAll(".sortable-item");
    (items[0] as HTMLElement).focus();

    await user.keyboard("{Control>}{ArrowDown}{/Control}");

    const labels = Array.from(document.querySelectorAll(".sortable-item")).map(
      (el) => el.textContent,
    );
    expect(labels[0]).toBe("⋮⋮Intégrer les composants");
    expect(labels[1]).toBe("⋮⋮Concevoir la maquette");
  });

  it("le focus DOM suit l'item déplacé (même nœud réutilisé, key=id)", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const first = document.querySelectorAll(".sortable-item")[0] as HTMLElement;
    first.focus();

    await user.keyboard("{Control>}{ArrowDown}{/Control}");

    // "Concevoir la maquette" est maintenant en 2e position et garde le focus.
    expect(
      screen.getByText("Concevoir la maquette").closest(".sortable-item"),
    ).toHaveFocus();
  });

  it("Ctrl+ArrowUp sur le premier item ne réordonne pas (borne)", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const items = document.querySelectorAll(".sortable-item");
    (items[0] as HTMLElement).focus();

    await user.keyboard("{Control>}{ArrowUp}{/Control}");

    const labels = Array.from(document.querySelectorAll(".sortable-item")).map(
      (el) => el.textContent,
    );
    expect(labels[0]).toBe("⋮⋮Concevoir la maquette");
  });

  it("Ctrl+ArrowDown sur le dernier item ne réordonne pas (borne)", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const items = document.querySelectorAll(".sortable-item");
    (items[3] as HTMLElement).focus();

    await user.keyboard("{Control>}{ArrowDown}{/Control}");

    const labels = Array.from(document.querySelectorAll(".sortable-item")).map(
      (el) => el.textContent,
    );
    expect(labels[3]).toBe("⋮⋮Déployer en production");
  });

  it("pousse une annonce aria-live avec le libellé et la nouvelle position", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);
    const first = document.querySelectorAll(".sortable-item")[0] as HTMLElement;
    first.focus();

    await user.keyboard("{Control>}{ArrowDown}{/Control}");

    expect(document.querySelector(".sr-only")?.textContent).toBe(
      "Concevoir la maquette déplacé en position 2 sur 4",
    );
  });

  it("l'annonce aria-live exclut la poignée ET le numéro (variante numbered)", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness numbered />);
    const first = document.querySelectorAll(".sortable-item")[0] as HTMLElement;
    first.focus();

    await user.keyboard("{Control>}{ArrowDown}{/Control}");

    expect(document.querySelector(".sr-only")?.textContent).toBe(
      "Concevoir la maquette déplacé en position 2 sur 4",
    );
  });

  it("aucune annonce n'est émise pour un déplacement souris/tactile (parité vanilla : announceMove réservé au clavier)", () => {
    render(<SortableList items={ITEMS} onReorder={() => {}} />);
    const itemA = screen.getByText("Concevoir la maquette").closest("li")!;
    const itemC = screen.getByText("Écrire les tests").closest("li")!;

    fireEvent.dragStart(itemA, { dataTransfer: makeDataTransfer() });
    fireEvent.dragOver(itemC, { dataTransfer: makeDataTransfer() });
    fireEvent.drop(itemC, { dataTransfer: makeDataTransfer() });

    expect(document.querySelector(".sr-only")?.textContent).toBe("");
  });
});

describe("SortableList — a11y (axe-core)", () => {
  it("ne remonte aucune violation WCAG sur la liste simple", async () => {
    const { container } = render(
      <SortableList items={ITEMS} onReorder={() => {}} ariaLabel="Tâches" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ne remonte aucune violation WCAG sur la variante numbered", async () => {
    const { container } = render(
      <SortableList
        items={ITEMS}
        onReorder={() => {}}
        numbered
        ariaLabel="Tâches numérotées"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---- Helpers ----

function makeDataTransfer(): DataTransfer {
  let dropEffect = "none";
  let effectAllowed = "uninitialized";
  return {
    get dropEffect() {
      return dropEffect;
    },
    set dropEffect(v) {
      dropEffect = v;
    },
    get effectAllowed() {
      return effectAllowed;
    },
    set effectAllowed(v) {
      effectAllowed = v;
    },
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: () => {},
    getData: () => "",
    setData: () => {},
    setDragImage: () => {},
  } as DataTransfer;
}

/** Rect factice — utilisé pour piloter `findPointerTarget`/le layout tactile. */
function fakeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 20,
    width: 200,
    height: 20,
    toJSON() {
      return this;
    },
    ...overrides,
  } as DOMRect;
}

// --- Déplacement au clavier sur macOS (#931) ---------------------------------
//
// `Ctrl`+↑/↓ ne PEUT PAS fonctionner sur macOS : Mission Control intercepte la
// combinaison avant le navigateur, l'événement n'atteint jamais la page. Sur la
// plateforme où le raccourci ne passe pas, l'alternative clavier — seule voie
// accessible de ce composant — était donc inopérante.
describe("SortableList — modificateur de déplacement (#931)", () => {
  it("résout vers Alt sur les plateformes Apple, Ctrl ailleurs", () => {
    expect(resolveMoveModifier("auto", "MacIntel")).toBe("alt");
    expect(resolveMoveModifier("auto", "iPhone")).toBe("alt");
    expect(resolveMoveModifier("auto", "Win32")).toBe("ctrl");
    expect(resolveMoveModifier("auto", "Linux x86_64")).toBe("ctrl");
  });

  it("retombe sur Ctrl quand la plateforme est inconnue (défensif, SSR)", () => {
    expect(resolveMoveModifier("auto", "")).toBe("ctrl");
  });

  it("une valeur explicite l'emporte sur la détection", () => {
    expect(resolveMoveModifier("ctrl", "MacIntel")).toBe("ctrl");
    expect(resolveMoveModifier("alt", "Win32")).toBe("alt");
  });

  it('moveModifier="alt" déplace avec Alt+↑ et ignore Ctrl+↑', async () => {
    const onReorder = vi.fn();
    render(
      <SortableList items={ITEMS} onReorder={onReorder} moveModifier="alt" />,
    );
    const first = document.querySelectorAll(".sortable-item")[1] as HTMLElement;
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowUp", ctrlKey: true });
    expect(onReorder).not.toHaveBeenCalled();

    fireEvent.keyDown(first, { key: "ArrowUp", altKey: true });
    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it('moveModifier="ctrl" garde le comportement d\'origine (aucune régression)', () => {
    const onReorder = vi.fn();
    render(
      <SortableList items={ITEMS} onReorder={onReorder} moveModifier="ctrl" />,
    );
    const first = document.querySelectorAll(".sortable-item")[1] as HTMLElement;
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowUp", ctrlKey: true });
    expect(onReorder).toHaveBeenCalledTimes(1);
  });
});
