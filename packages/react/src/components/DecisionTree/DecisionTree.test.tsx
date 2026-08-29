import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { DecisionTree, DecisionTreeNode } from "./DecisionTree";

afterEach(() => {
  cleanup();
});

const NODES: DecisionTreeNode[] = [
  {
    id: "q1",
    kind: "question",
    content: "Quel type de projet ?",
    connectorAfter: true,
    choices: [
      { id: "c1", label: "Site vitrine", next: "q2a" },
      { id: "c2", label: "Application web", next: "q2b" },
    ],
  },
  {
    id: "q2a",
    kind: "question",
    content: "Besoin d'un CMS ?",
    choices: [
      { id: "c3", label: "Oui", next: "r1" },
      { id: "c4", label: "Non", next: "r2" },
    ],
  },
  {
    id: "q2b",
    kind: "question",
    content: "Quelle stack ?",
    choices: [
      { id: "c5", label: "Next.js", next: "r3" },
      { id: "c6", label: "FastAPI + React", next: "r4" },
    ],
  },
  { id: "r1", kind: "result", content: "WordPress ou Strapi" },
  { id: "r2", kind: "result", content: "HTML/CSS statique + Caddy" },
  { id: "r3", kind: "result", content: "Next.js + Vercel" },
  { id: "r4", kind: "result", content: "FastAPI + React + Docker Compose" },
];

function ControlledTree() {
  const [path, setPath] = useState<string[]>(["q1"]);
  return (
    <DecisionTree
      nodes={NODES}
      path={path}
      onNavigate={(next) => setPath((p) => [...p, next])}
      onReset={() => setPath(["q1"])}
    />
  );
}

describe("DecisionTree — structure", () => {
  it("rend .dtree avec un .dtree-node par nœud", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    expect(document.querySelector(".dtree")).toBeInTheDocument();
    expect(document.querySelectorAll(".dtree-node")).toHaveLength(7);
  });

  it("seul le nœud racine est .active au repos (path=[racine])", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    const q1 =
      document.getElementById("q1") ??
      screen.getByText("Quel type de projet ?").closest(".dtree-node");
    expect(q1).toHaveClass("active");
    document.querySelectorAll(".dtree-node").forEach((node) => {
      if (node !== q1) expect(node).not.toHaveClass("active");
    });
  });

  it("kind question/result pilote dtree-node--question / dtree-node--result + role group/region", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1", "q2a", "r1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    const question = screen
      .getByText("Besoin d'un CMS ?")
      .closest(".dtree-node");
    expect(question).toHaveClass("dtree-node--question");
    expect(question).toHaveAttribute("role", "group");

    const result = screen
      .getByText("WordPress ou Strapi")
      .closest(".dtree-node");
    expect(result).toHaveClass("dtree-node--result");
    expect(result).toHaveAttribute("role", "region");
  });

  it("le bouton reset est toujours rendu, masqué via style.display tant qu'aucun résultat n'est atteint", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    const reset = document.querySelector(".dtree-reset") as HTMLElement;
    expect(reset).toBeInTheDocument();
    expect(reset).toHaveClass("btn-primary");
    expect(reset.style.display).toBe("none");
  });

  it("le bouton reset devient visible (display:'') une fois un nœud résultat atteint", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1", "q2a", "r1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    const reset = document.querySelector(".dtree-reset") as HTMLElement;
    expect(reset.style.display).toBe("");
  });
});

describe("DecisionTree — révélation progressive au clic (contrôlé)", () => {
  it("clic sur un choix appelle onNavigate avec choice.next", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1"]}
        onNavigate={onNavigate}
        onReset={() => {}}
      />,
    );
    await user.click(screen.getByText("Application web"));
    expect(onNavigate).toHaveBeenCalledWith("q2b");
  });

  it("le choix sélectionné porte .selected et disabled ; les autres choix du nœud sont disabled sans .selected", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1", "q2b"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    const selected = screen.getByText("Application web");
    expect(selected).toHaveClass("dtree-choice", "selected");
    expect(selected).toBeDisabled();

    const sibling = screen.getByText("Site vitrine");
    expect(sibling).not.toHaveClass("selected");
    expect(sibling).toBeDisabled();
  });

  it("les choix d'un nœud pas encore répondu restent actifs (non disabled)", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    expect(screen.getByText("Site vitrine")).not.toBeDisabled();
    expect(screen.getByText("Application web")).not.toBeDisabled();
  });

  it("le nœud suivant devient .active après navigation (intégration avec état parent)", async () => {
    const user = userEvent.setup();
    render(<ControlledTree />);
    await user.click(screen.getByText("Application web"));
    const q2b = screen.getByText("Quelle stack ?").closest(".dtree-node");
    expect(q2b).toHaveClass("active");
  });

  it("clic sur un choix déjà répondu (bouton disabled) ne redéclenche pas onNavigate", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1", "q2a"]}
        onNavigate={onNavigate}
        onReset={() => {}}
      />,
    );
    await user.click(screen.getByText("Site vitrine"));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe("DecisionTree — connecteur", () => {
  it("le connecteur est invisible tant que le nœud qui le précède n'a pas été répondu", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    const connector = document.querySelector(".dtree-connector") as HTMLElement;
    expect(connector).toBeInTheDocument();
    expect(connector).not.toHaveClass("visible");
  });

  it("le connecteur devient .visible une fois le nœud précédent répondu", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1", "q2a"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    expect(document.querySelector(".dtree-connector")).toHaveClass("visible");
  });

  it("aucun connecteur rendu pour un nœud sans connectorAfter", () => {
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1", "q2a", "r1"]}
        onNavigate={() => {}}
        onReset={() => {}}
      />,
    );
    // Un seul nœud (q1) déclare connectorAfter → un seul connecteur au total.
    expect(document.querySelectorAll(".dtree-connector")).toHaveLength(1);
  });
});

describe("DecisionTree — réinitialisation", () => {
  it("clic sur reset appelle onReset", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <DecisionTree
        nodes={NODES}
        path={["q1", "q2a", "r1"]}
        onNavigate={() => {}}
        onReset={onReset}
      />,
    );
    await user.click(document.querySelector(".dtree-reset") as HTMLElement);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("intégration : reset ramène au seul nœud racine actif et re-masque le bouton", async () => {
    const user = userEvent.setup();
    render(<ControlledTree />);
    await user.click(screen.getByText("Application web"));
    await user.click(screen.getByText("Next.js"));
    expect(
      (document.querySelector(".dtree-reset") as HTMLElement).style.display,
    ).toBe("");

    await user.click(document.querySelector(".dtree-reset") as HTMLElement);
    expect(
      screen.getByText("Quel type de projet ?").closest(".dtree-node"),
    ).toHaveClass("active");
    expect(document.querySelectorAll(".dtree-node.active")).toHaveLength(1);
    expect(screen.getByText("Application web")).not.toBeDisabled();
  });
});
