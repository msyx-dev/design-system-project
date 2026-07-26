import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { JsonViewer, JsonViewerProps } from "./JsonViewer";

afterEach(() => {
  cleanup();
});

/** Le `.json-node` racine — celui directement enfant du wrapper `role="tree"`. */
function rootNode(): HTMLElement {
  return document.querySelector('[role="tree"] > .json-node') as HTMLElement;
}

/** Le `.json-node` dont le `.json-key` affiche `"<key>"` (guillemets inclus,
 * calque exact du vanilla — voir JsonViewer.tsx). */
function nodeByKey(key: string): HTMLElement {
  const keyEl = Array.from(
    document.querySelectorAll<HTMLElement>(".json-key"),
  ).find((el) => el.textContent === `"${key}"`);
  if (!keyEl) throw new Error(`Clé introuvable : ${key}`);
  return keyEl.closest(".json-node") as HTMLElement;
}

/** Wrapper contrôlé sur l'expansion — reflète `onExpandedChange`, comme un vrai consumer. */
function ControlledJsonViewer(
  props: Partial<Omit<JsonViewerProps, "expandedPaths">> & {
    data: unknown;
    initialExpandedPaths?: string[];
  },
) {
  const { data, initialExpandedPaths = [], onExpandedChange, ...rest } = props;
  const [expanded, setExpanded] = useState<string[]>(initialExpandedPaths);
  return (
    <JsonViewer
      {...rest}
      data={data}
      expandedPaths={expanded}
      onExpandedChange={(next, node) => {
        setExpanded(next);
        onExpandedChange?.(next, node);
      }}
    />
  );
}

describe("JsonViewer — rendu des 6 types de valeur", () => {
  it("objet imbriqué : .json-node--expandable + accolades + résumé de clés", () => {
    render(<JsonViewer data={{ settings: { theme: "dark" } }} />);
    const settings = nodeByKey("settings");
    expect(settings).toHaveClass("json-node--expandable");
    // .json-punct couvre AUSSI le séparateur ": " (clé/valeur) — l'accolade
    // ouvrante est donc le 2e .json-punct de la ligne, pas le 1er.
    const punct = settings.querySelectorAll(":scope > .json-row .json-punct");
    expect(punct[0].textContent).toBe(": ");
    expect(punct[1].textContent).toBe("{");
    expect(punct[2].textContent).toBe("}");
    expect(
      settings.querySelector(":scope > .json-row .json-preview")?.textContent,
    ).toBe("… 1 clé");
  });

  it('tableau : entrées indexées quotées ("0", "1"…) comme des clés d\'objet — calque exact du vanilla', () => {
    render(<JsonViewer data={{ roles: ["admin", "editor"] }} />);
    const roles = nodeByKey("roles");
    expect(roles).toHaveClass("json-node--expandable");
    expect(
      roles.querySelector(":scope > .json-row .json-preview")?.textContent,
    ).toBe("… 2 éléments");
    const idx0 = nodeByKey("0");
    expect(idx0.querySelector(".json-string")?.textContent).toBe('"admin"');
    const idx1 = nodeByKey("1");
    expect(idx1.querySelector(".json-string")?.textContent).toBe('"editor"');
  });

  it("string : .json-string entre guillemets littéraux", () => {
    render(<JsonViewer data={{ name: "Alice Martin" }} />);
    expect(nodeByKey("name").querySelector(".json-string")?.textContent).toBe(
      '"Alice Martin"',
    );
  });

  it("number : .json-number, valeur brute (sans guillemets)", () => {
    render(<JsonViewer data={{ id: 4821 }} />);
    expect(nodeByKey("id").querySelector(".json-number")?.textContent).toBe(
      "4821",
    );
  });

  it("boolean : .json-boolean", () => {
    render(<JsonViewer data={{ active: true }} />);
    expect(
      nodeByKey("active").querySelector(".json-boolean")?.textContent,
    ).toBe("true");
  });

  it('null : .json-null affiche toujours le texte littéral "null"', () => {
    render(<JsonViewer data={{ avatar: null }} />);
    expect(nodeByKey("avatar").querySelector(".json-null")?.textContent).toBe(
      "null",
    );
  });

  it("racine sans clé : pas de .json-key ni .json-punct ':' sur le nœud racine", () => {
    render(<JsonViewer data={{ id: 1 }} />);
    const root = rootNode();
    expect(root.querySelector(":scope > .json-row > .json-key")).toBeNull();
  });
});

describe("JsonViewer — expansion : .open sur .json-node (PARENT), .json-children reste 'open' EN DUR", () => {
  it("par défaut (profondeur Infinity), tout est ouvert : .open + aria-expanded=true", () => {
    render(<JsonViewer data={{ settings: { theme: "dark" } }} />);
    const settings = nodeByKey("settings");
    expect(settings).toHaveClass("open");
    expect(settings).toHaveAttribute("aria-expanded", "true");
  });

  it("clic sur la ligne replie : .open RETIRÉ du .json-node + aria-expanded=false", () => {
    render(<JsonViewer data={{ settings: { theme: "dark" } }} />);
    const settings = nodeByKey("settings");
    const row = settings.querySelector(":scope > .json-row") as HTMLElement;

    fireEvent.click(row);

    // Assertion critique : la classe d'ÉTAT RÉELLE qui pilote le CSS
    // (`.json-node:not(.open) > .json-children { max-height: 0 }`), pas
    // seulement l'attribut ARIA — cf. incident <ActionMenu> (.open non émis
    // = composant visuellement mort malgré un aria-expanded correct).
    expect(settings).not.toHaveClass("open");
    expect(settings).toHaveAttribute("aria-expanded", "false");
  });

  it("le .json-children de ce même nœud garde SA classe 'open' littérale même replié (elle n'est jamais togglée — le CSS masque via le parent, pas via cette classe)", () => {
    render(<JsonViewer data={{ settings: { theme: "dark" } }} />);
    const settings = nodeByKey("settings");
    const row = settings.querySelector(":scope > .json-row") as HTMLElement;

    fireEvent.click(row);

    expect(settings).not.toHaveClass("open");
    const children = settings.querySelector(
      ":scope > .json-children",
    ) as HTMLElement;
    expect(children).toHaveClass("open");
  });

  it("un second clic ré-ouvre : .open repositionné sur .json-node + aria-expanded=true", () => {
    render(<JsonViewer data={{ settings: { theme: "dark" } }} />);
    const settings = nodeByKey("settings");
    const row = settings.querySelector(":scope > .json-row") as HTMLElement;

    fireEvent.click(row);
    fireEvent.click(row);

    expect(settings).toHaveClass("open");
    expect(settings).toHaveAttribute("aria-expanded", "true");
  });

  it("les feuilles n'ont jamais .open ni aria-expanded", () => {
    render(<JsonViewer data={{ name: "Alice" }} />);
    const name = nodeByKey("name");
    expect(name).toHaveClass("json-node--leaf");
    expect(name).not.toHaveClass("open");
    expect(name).not.toHaveAttribute("aria-expanded");
  });

  it("clic sur une feuille ne fait rien (pas de handler, pas de bascule d'un ancêtre)", () => {
    render(<JsonViewer data={{ settings: { theme: "dark" } }} />);
    const settings = nodeByKey("settings");
    const theme = nodeByKey("theme");
    const row = theme.querySelector(":scope > .json-row") as HTMLElement;

    fireEvent.click(row);

    expect(settings).toHaveClass("open"); // inchangé
  });
});

describe("JsonViewer — profondeur initiale (defaultExpandedDepth)", () => {
  const nested = { a: { b: { c: 1 } } };

  it("depth=0 : même la racine est repliée", () => {
    render(<JsonViewer data={nested} defaultExpandedDepth={0} />);
    expect(rootNode()).not.toHaveClass("open");
  });

  it("depth=1 : racine ouverte, son enfant repliée", () => {
    render(<JsonViewer data={nested} defaultExpandedDepth={1} />);
    expect(rootNode()).toHaveClass("open");
    expect(nodeByKey("a")).not.toHaveClass("open");
  });

  it("depth=2 : racine + 1er niveau ouverts, 2e niveau replié", () => {
    render(<JsonViewer data={nested} defaultExpandedDepth={2} />);
    expect(rootNode()).toHaveClass("open");
    expect(nodeByKey("a")).toHaveClass("open");
    expect(nodeByKey("b")).not.toHaveClass("open");
  });

  it("défaut (Infinity) : tout est ouvert, calque du vanilla sans troncature", () => {
    render(<JsonViewer data={nested} />);
    expect(rootNode()).toHaveClass("open");
    expect(nodeByKey("a")).toHaveClass("open");
    expect(nodeByKey("b")).toHaveClass("open");
  });
});

describe("JsonViewer — donnée invalide (.json-viewer-error)", () => {
  it("référence circulaire (non sérialisable) affiche .json-viewer-error, aucun arbre rendu", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    render(<JsonViewer data={circular} />);

    expect(document.querySelector(".json-viewer-error")).toBeInTheDocument();
    expect(document.querySelector(".json-viewer-error")?.textContent).toMatch(
      /^JSON invalide : /,
    );
    expect(document.querySelector('[role="tree"]')).toBeNull();
    expect(document.querySelector(".json-viewer-toolbar")).toBeNull();
  });

  it("data=undefined affiche .json-viewer-error", () => {
    render(<JsonViewer data={undefined} />);
    expect(document.querySelector(".json-viewer-error")).toBeInTheDocument();
  });

  it("BigInt (non sérialisable en JSON) affiche .json-viewer-error", () => {
    render(<JsonViewer data={{ big: BigInt(10) }} />);
    expect(document.querySelector(".json-viewer-error")).toBeInTheDocument();
  });

  it("une donnée valide n'affiche jamais .json-viewer-error", () => {
    render(<JsonViewer data={{ id: 1 }} />);
    expect(document.querySelector(".json-viewer-error")).toBeNull();
  });
});

describe("JsonViewer — toolbar « Tout déplier » / « Tout replier »", () => {
  const nested = { a: { b: { c: 1 } } };

  it("affichée par défaut avec les deux boutons (.json-viewer-toolbar, .btn-ghost.btn-sm)", () => {
    render(<JsonViewer data={nested} />);
    expect(document.querySelector(".json-viewer-toolbar")).toBeInTheDocument();
    expect(screen.getByText("Tout déplier")).toHaveClass("btn-ghost", "btn-sm");
    expect(screen.getByText("Tout replier")).toHaveClass("btn-ghost", "btn-sm");
  });

  it("toolbar={false} la masque entièrement", () => {
    render(<JsonViewer data={nested} toolbar={false} />);
    expect(document.querySelector(".json-viewer-toolbar")).toBeNull();
  });

  it("« Tout replier » ferme tout SAUF la racine (calque exact du vanilla)", () => {
    render(<JsonViewer data={nested} />);
    fireEvent.click(screen.getByText("Tout replier"));

    expect(rootNode()).toHaveClass("open");
    expect(nodeByKey("a")).not.toHaveClass("open");
    expect(nodeByKey("b")).not.toHaveClass("open");
  });

  it("« Tout déplier » après « Tout replier » rouvre tous les nœuds expandables", () => {
    render(<JsonViewer data={nested} />);
    fireEvent.click(screen.getByText("Tout replier"));
    fireEvent.click(screen.getByText("Tout déplier"));

    expect(rootNode()).toHaveClass("open");
    expect(nodeByKey("a")).toHaveClass("open");
    expect(nodeByKey("b")).toHaveClass("open");
  });
});

describe("JsonViewer — expansion contrôlée (expandedPaths / onExpandedChange)", () => {
  it("expandedPaths=[] : tout replié malgré la profondeur par défaut Infinity", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} expandedPaths={[]} />);
    expect(rootNode()).not.toHaveClass("open");
  });

  it("onExpandedChange reçoit (expandedPaths, node) ; le wrapper contrôlé répercute l'état", () => {
    const onExpandedChange = vi.fn();
    render(
      <ControlledJsonViewer
        data={{ a: { b: 1 } }}
        initialExpandedPaths={[]}
        onExpandedChange={onExpandedChange}
      />,
    );
    const root = rootNode();

    fireEvent.click(root.querySelector(":scope > .json-row") as HTMLElement);

    expect(onExpandedChange).toHaveBeenCalledWith(["$"], {
      path: "$",
      value: { a: { b: 1 } },
    });
    expect(rootNode()).toHaveClass("open");
  });
});

describe("JsonViewer — navigation clavier (WAI-ARIA Tree, roving tabindex — présente dans le vanilla, components.js:6223-6307)", () => {
  it("un seul .json-node a tabindex=0 au montage (la racine)", () => {
    render(<JsonViewer data={{ a: 1, b: 2 }} />);
    const root = rootNode();
    expect(root).toHaveAttribute("tabindex", "0");
    const others = Array.from(document.querySelectorAll(".json-node")).filter(
      (n) => n !== root,
    );
    others.forEach((n) => expect(n).toHaveAttribute("tabindex", "-1"));
  });

  it("ArrowDown déplace tabindex=0 vers le nœud suivant en ordre document", () => {
    render(<JsonViewer data={{ a: 1, b: 2 }} />);
    const root = rootNode();

    fireEvent.keyDown(root, { key: "ArrowDown" });

    expect(nodeByKey("a")).toHaveAttribute("tabindex", "0");
    expect(root).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowRight sur un nœud fermé le déplie SANS déplacer le focus", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} defaultExpandedDepth={1} />);
    const root = rootNode();
    fireEvent.keyDown(root, { key: "ArrowDown" }); // focus -> a
    const a = nodeByKey("a");
    expect(a).not.toHaveClass("open");

    fireEvent.keyDown(a, { key: "ArrowRight" });

    expect(a).toHaveClass("open");
    expect(a).toHaveAttribute("tabindex", "0");
  });

  it("ArrowRight sur un nœud déjà ouvert descend au premier enfant", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} />); // tout ouvert par défaut
    const root = rootNode();
    fireEvent.keyDown(root, { key: "ArrowDown" }); // focus -> a
    const a = nodeByKey("a");

    fireEvent.keyDown(a, { key: "ArrowRight" });

    expect(nodeByKey("b")).toHaveAttribute("tabindex", "0");
  });

  it("ArrowLeft sur un nœud ouvert le replie SANS déplacer le focus", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} />);
    const root = rootNode();
    fireEvent.keyDown(root, { key: "ArrowDown" }); // focus -> a (ouvert)
    const a = nodeByKey("a");
    expect(a).toHaveClass("open");

    fireEvent.keyDown(a, { key: "ArrowLeft" });

    expect(a).not.toHaveClass("open");
    expect(a).toHaveAttribute("tabindex", "0");
  });

  it("ArrowLeft sur une feuille remonte le focus au parent", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} />);
    const root = rootNode();
    fireEvent.keyDown(root, { key: "ArrowDown" }); // -> a
    fireEvent.keyDown(nodeByKey("a"), { key: "ArrowDown" }); // -> b (feuille)
    const b = nodeByKey("b");
    expect(b).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(b, { key: "ArrowLeft" });

    expect(nodeByKey("a")).toHaveAttribute("tabindex", "0");
  });

  it("Home/End déplacent le focus au premier/dernier nœud en ordre document", () => {
    render(<JsonViewer data={{ a: 1, b: 2, c: 3 }} />);
    const root = rootNode();

    fireEvent.keyDown(root, { key: "End" });
    expect(nodeByKey("c")).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(nodeByKey("c"), { key: "Home" });
    expect(root).toHaveAttribute("tabindex", "0");
  });

  it("Entrée bascule un nœud expandable sans déplacer le focus", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} />);
    const root = rootNode();
    expect(root).toHaveClass("open");

    fireEvent.keyDown(root, { key: "Enter" });

    expect(root).not.toHaveClass("open");
    expect(root).toHaveAttribute("tabindex", "0");
  });

  it("Espace bascule un nœud expandable", () => {
    render(<JsonViewer data={{ a: { b: 1 } }} />);
    const root = rootNode();

    fireEvent.keyDown(root, { key: " " });

    expect(root).not.toHaveClass("open");
  });

  it("traverse aussi un sous-arbre visuellement replié — parité exacte du vanilla (isVisible() y est du code mort, cf. JSDoc du composant)", () => {
    render(
      <JsonViewer data={{ a: { b: 1 }, c: 2 }} defaultExpandedDepth={1} />,
    );
    const root = rootNode();
    fireEvent.keyDown(root, { key: "ArrowDown" }); // -> a
    const a = nodeByKey("a");
    expect(a).not.toHaveClass("open"); // replié visuellement (profondeur 1)

    fireEvent.keyDown(a, { key: "ArrowDown" }); // -> b, malgré le repli visuel de "a"

    expect(nodeByKey("b")).toHaveAttribute("tabindex", "0");
  });
});
