import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  TransferList,
  TransferListItem,
  TransferListProps,
} from "./TransferList";

const ITEMS: TransferListItem[] = [
  { id: "alice", label: "Alice Martin" },
  { id: "bruno", label: "Bruno Faure" },
  { id: "chloe", label: "Chloé Dubois" },
  { id: "david", label: "David Nguyen" },
];

/** Wrapper contrôlé — reflète les mises à jour d'état comme un vrai consumer. */
function ControlledTransferList(
  props: Partial<Omit<TransferListProps, "assigned" | "onChange">> & {
    onChange?: TransferListProps["onChange"];
    initialAssigned?: string[];
  },
) {
  const { initialAssigned = [], onChange, items = ITEMS, ...rest } = props;
  const [assigned, setAssigned] = useState(initialAssigned);
  return (
    <TransferList
      {...rest}
      items={items}
      assigned={assigned}
      onChange={(next) => {
        setAssigned(next);
        onChange?.(next);
      }}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe("TransferList — structure", () => {
  it("rend le markup canonique .transfer-list/.transfer-panel/.transfer-option/.transfer-actions", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);

    expect(document.querySelector(".transfer-list")).toBeInTheDocument();
    expect(document.querySelectorAll(".transfer-panel")).toHaveLength(2);
    expect(document.querySelector(".transfer-actions")).toBeInTheDocument();
    expect(document.querySelectorAll(".transfer-option")).toHaveLength(4);
  });

  it("répartit les items entre panneau source et panneau cible selon assigned", () => {
    render(
      <TransferList
        items={ITEMS}
        assigned={["bruno"]}
        onChange={() => {}}
      />,
    );
    const panels = document.querySelectorAll(".transfer-panel");
    expect(panels[0].querySelectorAll(".transfer-option")).toHaveLength(3);
    expect(panels[1].querySelectorAll(".transfer-option")).toHaveLength(1);
    expect(panels[1].querySelector(".transfer-option")).toHaveTextContent(
      "Bruno Faure",
    );
  });

  it("pose les titres par défaut Disponibles / Assignés", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const titles = document.querySelectorAll(".transfer-panel-title");
    expect(titles[0]).toHaveTextContent("Disponibles");
    expect(titles[1]).toHaveTextContent("Assignés");
  });

  it("accepte des titres personnalisés via sourceTitle/targetTitle", () => {
    render(
      <TransferList
        items={ITEMS}
        assigned={[]}
        onChange={() => {}}
        sourceTitle="Rôles"
        targetTitle="Membres"
      />,
    );
    const titles = document.querySelectorAll(".transfer-panel-title");
    expect(titles[0]).toHaveTextContent("Rôles");
    expect(titles[1]).toHaveTextContent("Membres");
  });

  it("rend .transfer-search par panneau par défaut (searchable=true)", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    expect(document.querySelectorAll(".transfer-search")).toHaveLength(2);
  });

  it("n'affiche pas .transfer-search quand searchable=false", () => {
    render(
      <TransferList
        items={ITEMS}
        assigned={[]}
        onChange={() => {}}
        searchable={false}
      />,
    );
    expect(document.querySelectorAll(".transfer-search")).toHaveLength(0);
  });
});

describe("TransferList — compteurs .transfer-count", () => {
  it("affiche 'selected / total' par panneau, mis à jour à la sélection", () => {
    render(<TransferList items={ITEMS} assigned={["bruno"]} onChange={() => {}} />);
    const counts = document.querySelectorAll(".transfer-count");
    expect(counts[0]).toHaveTextContent("0 / 3");
    expect(counts[1]).toHaveTextContent("0 / 1");

    const firstOption = document.querySelectorAll(".transfer-option")[0];
    fireEvent.click(firstOption);

    expect(document.querySelectorAll(".transfer-count")[0]).toHaveTextContent(
      "1 / 3",
    );
  });
});

describe("TransferList — sélection au clic/clavier", () => {
  it("le clic sur une option pose .selected + aria-selected='true'", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const option = document.querySelector(".transfer-option") as HTMLElement;

    expect(option).not.toHaveClass("selected");
    expect(option).toHaveAttribute("aria-selected", "false");

    fireEvent.click(option);

    expect(option).toHaveClass("selected");
    expect(option).toHaveAttribute("aria-selected", "true");
  });

  it("un second clic retire .selected (toggle)", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const option = document.querySelector(".transfer-option") as HTMLElement;

    fireEvent.click(option);
    fireEvent.click(option);

    expect(option).not.toHaveClass("selected");
    expect(option).toHaveAttribute("aria-selected", "false");
  });

  it("Enter/Espace sur une option sélectionnée au clavier posent .selected", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const option = document.querySelector(".transfer-option") as HTMLElement;

    fireEvent.keyDown(option, { key: "Enter" });
    expect(option).toHaveClass("selected");

    fireEvent.keyDown(option, { key: " " });
    expect(option).not.toHaveClass("selected");
  });

  it("role=option + tabIndex=0 sur chaque option", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    document.querySelectorAll(".transfer-option").forEach((option) => {
      expect(option).toHaveAttribute("role", "option");
      expect(option).toHaveAttribute("tabindex", "0");
    });
  });

  it("ArrowDown/ArrowUp déplacent le focus entre options visibles du même panneau", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const options = Array.from(
      document.querySelectorAll(".transfer-option"),
    ) as HTMLElement[];

    options[0].focus();
    expect(document.activeElement).toBe(options[0]);

    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);

    fireEvent.keyDown(options[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[0]);
  });
});

describe("TransferList — filtre .transfer-search", () => {
  it("masque (.hidden) les options ne matchant pas la query (substring, insensible casse)", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const input = document.querySelectorAll(".transfer-search input")[0];

    fireEvent.change(input, { target: { value: "bru" } });

    const options = document.querySelectorAll(".transfer-option");
    const hiddenLabels = Array.from(options)
      .filter((o) => o.classList.contains("hidden"))
      .map((o) => o.textContent);
    const visibleLabels = Array.from(options)
      .filter((o) => !o.classList.contains("hidden"))
      .map((o) => o.textContent);

    expect(visibleLabels).toEqual(["Bruno Faure"]);
    expect(hiddenLabels).toEqual(
      expect.arrayContaining(["Alice Martin", "Chloé Dubois", "David Nguyen"]),
    );
  });

  it("le compteur .transfer-count reste basé sur le total (pas filtré)", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const input = document.querySelectorAll(".transfer-search input")[0];

    fireEvent.change(input, { target: { value: "bru" } });

    expect(document.querySelectorAll(".transfer-count")[0]).toHaveTextContent(
      "0 / 4",
    );
  });

  it("vider la query retire .hidden de toutes les options", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const input = document.querySelectorAll(".transfer-search input")[0];

    fireEvent.change(input, { target: { value: "bru" } });
    fireEvent.change(input, { target: { value: "" } });

    document.querySelectorAll(".transfer-option").forEach((option) => {
      expect(option).not.toHaveClass("hidden");
    });
  });
});

describe("TransferList — transfert sélectionné (droite/gauche)", () => {
  it("le bouton droite déplace les options sélectionnées et appelle onChange avec les bons ids", () => {
    const handleChange = vi.fn();
    render(
      <TransferList
        items={ITEMS}
        assigned={[]}
        onChange={handleChange}
      />,
    );
    const options = document.querySelectorAll(".transfer-option");
    fireEvent.click(options[0]); // alice
    fireEvent.click(options[2]); // chloe

    const rightButton = document.querySelector(
      '[aria-label="Transférer la sélection à droite"]',
    ) as HTMLButtonElement;
    fireEvent.click(rightButton);

    expect(handleChange).toHaveBeenCalledWith(["alice", "chloe"]);
  });

  it("après transfert, les options déplacées ne sont plus .selected dans le panneau cible", () => {
    render(<ControlledTransferList />);
    let options = document.querySelectorAll(".transfer-option");
    fireEvent.click(options[0]); // alice

    const rightButton = document.querySelector(
      '[aria-label="Transférer la sélection à droite"]',
    ) as HTMLButtonElement;
    fireEvent.click(rightButton);

    const panels = document.querySelectorAll(".transfer-panel");
    const targetOption = panels[1].querySelector(".transfer-option");
    expect(targetOption).toHaveTextContent("Alice Martin");
    expect(targetOption).not.toHaveClass("selected");
    expect(targetOption).toHaveAttribute("aria-selected", "false");
  });

  it("le bouton gauche déplace les options sélectionnées du panneau assigné vers disponibles", () => {
    const handleChange = vi.fn();
    render(
      <TransferList
        items={ITEMS}
        assigned={["alice", "bruno"]}
        onChange={handleChange}
      />,
    );
    const panels = document.querySelectorAll(".transfer-panel");
    const assignedOptions = panels[1].querySelectorAll(".transfer-option");
    fireEvent.click(assignedOptions[0]); // alice, dans le panneau assigné

    const leftButton = document.querySelector(
      '[aria-label="Transférer la sélection à gauche"]',
    ) as HTMLButtonElement;
    fireEvent.click(leftButton);

    expect(handleChange).toHaveBeenCalledWith(["bruno"]);
  });

  it("sans sélection, le clic sur droite/gauche n'appelle pas onChange", () => {
    const handleChange = vi.fn();
    render(<TransferList items={ITEMS} assigned={[]} onChange={handleChange} />);
    const rightButton = document.querySelector(
      '[aria-label="Transférer la sélection à droite"]',
    ) as HTMLButtonElement;
    fireEvent.click(rightButton);
    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe("TransferList — transfert total (all-right/all-left) ignore le filtre", () => {
  it("all-right déplace TOUTES les options du panneau source, y compris .hidden par le filtre", () => {
    const handleChange = vi.fn();
    render(
      <TransferList items={ITEMS} assigned={[]} onChange={handleChange} />,
    );
    const input = document.querySelectorAll(".transfer-search input")[0];
    fireEvent.change(input, { target: { value: "bru" } }); // ne matche que Bruno

    const allRightButton = document.querySelector(
      '[aria-label="Transférer tout à droite"]',
    ) as HTMLButtonElement;
    fireEvent.click(allRightButton);

    expect(handleChange).toHaveBeenCalledWith([
      "alice",
      "bruno",
      "chloe",
      "david",
    ]);
  });

  it("all-left déplace tout le panneau assigné vers disponibles", () => {
    const handleChange = vi.fn();
    render(
      <TransferList
        items={ITEMS}
        assigned={["alice", "bruno"]}
        onChange={handleChange}
      />,
    );
    const allLeftButton = document.querySelector(
      '[aria-label="Transférer tout à gauche"]',
    ) as HTMLButtonElement;
    fireEvent.click(allLeftButton);

    expect(handleChange).toHaveBeenCalledWith([]);
  });
});

describe("TransferList — onTransfer et annonce aria-live", () => {
  it("appelle onTransfer avec direction et count", () => {
    const handleTransfer = vi.fn();
    render(
      <TransferList
        items={ITEMS}
        assigned={[]}
        onChange={() => {}}
        onTransfer={handleTransfer}
      />,
    );
    const options = document.querySelectorAll(".transfer-option");
    fireEvent.click(options[0]);
    fireEvent.click(options[1]);

    const rightButton = document.querySelector(
      '[aria-label="Transférer la sélection à droite"]',
    ) as HTMLButtonElement;
    fireEvent.click(rightButton);

    expect(handleTransfer).toHaveBeenCalledWith({
      direction: "right",
      count: 2,
    });
  });

  it("annonce le nombre d'éléments déplacés dans la région aria-live", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    const options = document.querySelectorAll(".transfer-option");
    fireEvent.click(options[0]);

    const rightButton = document.querySelector(
      '[aria-label="Transférer la sélection à droite"]',
    ) as HTMLButtonElement;
    fireEvent.click(rightButton);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent(
      "1 élément(s) déplacé(s) vers Assignés.",
    );
  });
});

describe("TransferList — .transfer-empty (opt-in)", () => {
  it("n'affiche pas .transfer-empty par défaut (parité stricte, sans emptyLabel)", () => {
    render(<TransferList items={ITEMS} assigned={[]} onChange={() => {}} />);
    expect(document.querySelector(".transfer-empty")).not.toBeInTheDocument();
  });

  it("affiche .transfer-empty avec emptyLabel quand un panneau est vide", () => {
    render(
      <TransferList
        items={ITEMS}
        assigned={[]}
        onChange={() => {}}
        emptyLabel="Aucun élément"
      />,
    );
    const panels = document.querySelectorAll(".transfer-panel");
    expect(panels[1].querySelector(".transfer-empty")).toHaveTextContent(
      "Aucun élément",
    );
    expect(panels[0].querySelector(".transfer-empty")).not.toBeInTheDocument();
  });

  it("le panneau cible n'affiche plus .transfer-empty une fois un item transféré", () => {
    render(
      <ControlledTransferList emptyLabel="Aucun élément" />,
    );
    let panels = document.querySelectorAll(".transfer-panel");
    expect(panels[1].querySelector(".transfer-empty")).toBeInTheDocument();

    const options = document.querySelectorAll(".transfer-option");
    fireEvent.click(options[0]);
    const rightButton = document.querySelector(
      '[aria-label="Transférer la sélection à droite"]',
    ) as HTMLButtonElement;
    fireEvent.click(rightButton);

    panels = document.querySelectorAll(".transfer-panel");
    expect(panels[1].querySelector(".transfer-empty")).not.toBeInTheDocument();
    expect(panels[1].querySelectorAll(".transfer-option")).toHaveLength(1);
  });
});
