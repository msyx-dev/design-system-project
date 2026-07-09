import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { TreeView, TreeNode, TreeViewProps } from "./TreeView";

afterEach(() => {
  cleanup();
});

/** Arbre de test : une branche dépliée (src) contenant une sous-branche repliée
 * (components) et une feuille (utils.ts), plus une feuille racine (README.md). */
const sampleNodes: TreeNode[] = [
  {
    id: "src",
    label: "src",
    defaultExpanded: true,
    children: [
      {
        id: "components",
        label: "components",
        children: [
          { id: "button", label: "Button.tsx" },
          { id: "modal", label: "Modal.tsx" },
        ],
      },
      { id: "utils", label: "utils.ts" },
    ],
  },
  { id: "readme", label: "README.md" },
];

/** Wrapper contrôlé sur la sélection — reflète onSelect comme un vrai consumer. */
function ControlledTreeView(
  props: Partial<Omit<TreeViewProps, "nodes" | "ariaLabel">> & {
    nodes?: TreeNode[];
    ariaLabel?: string;
    initialSelectedId?: string;
    onSelect?: TreeViewProps["onSelect"];
  },
) {
  const {
    nodes = sampleNodes,
    ariaLabel = "Arbre",
    initialSelectedId,
    onSelect,
    ...rest
  } = props;
  const [selected, setSelected] = useState<string | undefined>(
    initialSelectedId,
  );
  return (
    <TreeView
      {...rest}
      nodes={nodes}
      ariaLabel={ariaLabel}
      selectedId={selected}
      onSelect={(node) => {
        setSelected(node.id);
        onSelect?.(node);
      }}
    />
  );
}

describe("TreeView — structure & markup canonique", () => {
  it("rend la racine <ul.tree role=tree aria-label>", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Structure de projet" />);
    const root = document.querySelector("ul.tree[role='tree']");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-label", "Structure de projet");
  });

  it("une branche est un <li.tree-item.tree-branch role=treeitem> avec .tree-toggle", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    const branch = document.querySelector("li.tree-branch");
    expect(branch).toHaveClass("tree-item");
    expect(branch).toHaveAttribute("role", "treeitem");
    const toggle = branch?.querySelector(":scope > .tree-toggle");
    expect(toggle?.tagName).toBe("BUTTON");
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-label", "Basculer src");
  });

  it("le chevron est un SVG inline <polyline> (PAS le sprite)", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    const chevron = document.querySelector(".tree-toggle .tree-chevron");
    expect(chevron?.tagName.toLowerCase()).toBe("svg");
    expect(chevron?.querySelector("polyline")).toHaveAttribute(
      "points",
      "5 8 8 11 11 8",
    );
    // Le chevron ne doit JAMAIS référencer le sprite.
    expect(chevron?.querySelector("use")).toBeNull();
  });

  it("l'icône dossier d'une branche utilise le sprite #i-folder", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    const folderIcon = document.querySelector(
      ".tree-branch > .tree-toggle > .tree-icon use",
    );
    expect(folderIcon).toHaveAttribute(
      "href",
      "/shared/icons/sprite.svg#i-folder",
    );
  });

  it("une feuille est un <li.tree-item.tree-leaf> avec icône sprite #i-file + .tree-label", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    // README.md est une feuille racine.
    const leaves = Array.from(document.querySelectorAll("li.tree-leaf"));
    const readme = leaves.find(
      (li) => li.querySelector(".tree-label")?.textContent === "README.md",
    );
    expect(readme).toBeTruthy();
    expect(readme).toHaveClass("tree-item");
    expect(readme).toHaveAttribute("role", "treeitem");
    const fileIcon = readme?.querySelector(".tree-icon use");
    expect(fileIcon).toHaveAttribute("href", "/shared/icons/sprite.svg#i-file");
  });

  it("les .tree-children portent role=group et sont récursifs (key=node.id)", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    const groups = document.querySelectorAll("ul.tree-children[role='group']");
    // src contient un groupe ; components (sous-branche) en contient un autre.
    expect(groups.length).toBe(2);
    // Chaque .tree-children porte aussi la classe .tree.
    groups.forEach((g) => expect(g).toHaveClass("tree"));
  });

  it("applique className sur la racine .tree", () => {
    render(
      <TreeView nodes={sampleNodes} ariaLabel="Arbre" className="my-tree" />,
    );
    const root = document.querySelector("ul[role='tree']");
    expect(root).toHaveClass("tree");
    expect(root).toHaveClass("my-tree");
  });

  it("rend l'icône personnalisée à la place du sprite quand fournie", () => {
    const nodes: TreeNode[] = [
      {
        id: "folder",
        label: "dossier",
        icon: <span data-testid="custom-folder">📁</span>,
        children: [
          { id: "leaf", label: "fichier", icon: <span data-testid="custom-file">📄</span> },
        ],
      },
    ];
    render(<TreeView nodes={nodes} ariaLabel="Arbre" />);
    expect(document.querySelector("[data-testid='custom-folder']")).toBeInTheDocument();
    expect(document.querySelector("[data-testid='custom-file']")).toBeInTheDocument();
    // Aucun sprite folder/file quand l'icône est fournie.
    expect(
      document.querySelector("use[href='/shared/icons/sprite.svg#i-folder']"),
    ).toBeNull();
  });
});

describe("TreeView — expansion (double-bind .open + aria-expanded)", () => {
  it("defaultExpanded amorce .open sur le <li.tree-branch> ET le <ul.tree-children>, + aria-expanded=true", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    const src = document.querySelector("li.tree-branch");
    expect(src).toHaveClass("open");
    expect(src).toHaveAttribute("aria-expanded", "true");
    const children = src?.querySelector(":scope > ul.tree-children");
    expect(children).toHaveClass("open");
  });

  it("une branche sans defaultExpanded est repliée : pas de .open sur li ni children, aria-expanded=false", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    // components est la sous-branche repliée par défaut.
    const components = Array.from(
      document.querySelectorAll("li.tree-branch"),
    ).find(
      (li) =>
        li.querySelector(":scope > .tree-toggle .tree-label")?.textContent ===
        "components",
    );
    expect(components).toBeTruthy();
    expect(components).not.toHaveClass("open");
    expect(components).toHaveAttribute("aria-expanded", "false");
    const children = components?.querySelector(":scope > ul.tree-children");
    expect(children).not.toHaveClass("open");
  });

  it("clic sur le toggle d'une branche repliée pose .open sur li ET children + aria-expanded=true (double-bind)", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    const components = Array.from(
      document.querySelectorAll("li.tree-branch"),
    ).find(
      (li) =>
        li.querySelector(":scope > .tree-toggle .tree-label")?.textContent ===
        "components",
    ) as HTMLElement;
    const toggle = components.querySelector(
      ":scope > .tree-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);

    // Les DEUX doivent recevoir .open (calque bug ActionMenu .open #612).
    expect(components).toHaveClass("open");
    expect(components).toHaveAttribute("aria-expanded", "true");
    expect(components.querySelector(":scope > ul.tree-children")).toHaveClass(
      "open",
    );
  });

  it("clic sur une branche dépliée la replie : retire .open des DEUX + aria-expanded=false", () => {
    render(<TreeView nodes={sampleNodes} ariaLabel="Arbre" />);
    const src = document.querySelector("li.tree-branch") as HTMLElement;
    const toggle = src.querySelector(
      ":scope > .tree-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);

    expect(src).not.toHaveClass("open");
    expect(src).toHaveAttribute("aria-expanded", "false");
    expect(src.querySelector(":scope > ul.tree-children")).not.toHaveClass(
      "open",
    );
  });
});

describe("TreeView — sélection (unique par arbre)", () => {
  it("clic sur une feuille pose .selected sur son <li>", () => {
    render(<ControlledTreeView />);
    const readme = Array.from(document.querySelectorAll("li.tree-leaf")).find(
      (li) => li.querySelector(".tree-label")?.textContent === "README.md",
    ) as HTMLElement;

    fireEvent.click(readme);

    expect(readme).toHaveClass("selected");
  });

  it("clic sur le toggle d'une branche déplie ET sélectionne (.selected sur le li.tree-branch)", () => {
    render(<ControlledTreeView />);
    const components = Array.from(
      document.querySelectorAll("li.tree-branch"),
    ).find(
      (li) =>
        li.querySelector(":scope > .tree-toggle .tree-label")?.textContent ===
        "components",
    ) as HTMLElement;
    const toggle = components.querySelector(
      ":scope > .tree-toggle",
    ) as HTMLButtonElement;

    fireEvent.click(toggle);

    // Les deux effets : déplié + sélectionné.
    expect(components).toHaveClass("open");
    expect(components).toHaveClass("selected");
  });

  it("une seule sélection à la fois : sélectionner un autre item purge la précédente", () => {
    render(<ControlledTreeView />);
    const leaves = Array.from(document.querySelectorAll("li.tree-leaf"));
    const utils = leaves.find(
      (li) => li.querySelector(".tree-label")?.textContent === "utils.ts",
    ) as HTMLElement;
    const readme = leaves.find(
      (li) => li.querySelector(".tree-label")?.textContent === "README.md",
    ) as HTMLElement;

    fireEvent.click(utils);
    expect(utils).toHaveClass("selected");

    fireEvent.click(readme);
    expect(readme).toHaveClass("selected");
    // La précédente ne doit plus être sélectionnée.
    const utilsAfter = Array.from(
      document.querySelectorAll("li.tree-leaf"),
    ).find(
      (li) => li.querySelector(".tree-label")?.textContent === "utils.ts",
    ) as HTMLElement;
    expect(utilsAfter).not.toHaveClass("selected");
  });

  it("defaultSelectedId amorce la sélection interne au montage (non contrôlé)", () => {
    render(
      <TreeView
        nodes={sampleNodes}
        ariaLabel="Arbre"
        defaultSelectedId="readme"
      />,
    );
    const readme = Array.from(document.querySelectorAll("li.tree-leaf")).find(
      (li) => li.querySelector(".tree-label")?.textContent === "README.md",
    ) as HTMLElement;
    expect(readme).toHaveClass("selected");
  });

  it("onSelect est appelé avec le nœud cliqué", () => {
    const handleSelect = vi.fn();
    render(
      <TreeView
        nodes={sampleNodes}
        ariaLabel="Arbre"
        onSelect={handleSelect}
      />,
    );
    const readme = Array.from(document.querySelectorAll("li.tree-leaf")).find(
      (li) => li.querySelector(".tree-label")?.textContent === "README.md",
    ) as HTMLElement;

    fireEvent.click(readme);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "readme", label: "README.md" }),
    );
  });
});

describe("TreeView — sélection contrôlée", () => {
  it("selectedId pilote la surbrillance (mode contrôlé)", () => {
    render(
      <TreeView nodes={sampleNodes} ariaLabel="Arbre" selectedId="utils" />,
    );
    const utils = Array.from(document.querySelectorAll("li.tree-leaf")).find(
      (li) => li.querySelector(".tree-label")?.textContent === "utils.ts",
    ) as HTMLElement;
    expect(utils).toHaveClass("selected");
  });

  it("contrôlé : un clic n'altère pas l'état interne mais appelle onSelect", () => {
    const handleSelect = vi.fn();
    render(
      <TreeView
        nodes={sampleNodes}
        ariaLabel="Arbre"
        selectedId="utils"
        onSelect={handleSelect}
      />,
    );
    const readme = Array.from(document.querySelectorAll("li.tree-leaf")).find(
      (li) => li.querySelector(".tree-label")?.textContent === "README.md",
    ) as HTMLElement;

    fireEvent.click(readme);

    // onSelect notifié, mais la sélection reste pilotée par le parent (utils).
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "readme" }),
    );
    expect(readme).not.toHaveClass("selected");
    const utils = Array.from(document.querySelectorAll("li.tree-leaf")).find(
      (li) => li.querySelector(".tree-label")?.textContent === "utils.ts",
    ) as HTMLElement;
    expect(utils).toHaveClass("selected");
  });
});
