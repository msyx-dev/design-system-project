import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RiskMatrix, RiskItem } from "./RiskMatrix";

/** Sélecteur d'un vrai dot (hors badge overflow) par préfixe d'aria-label. */
function dotByLabel(label: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(
    `.risk-dot[aria-label^="${label}"]`,
  );
  if (!el) throw new Error(`dot introuvable: ${label}`);
  return el;
}

function cellOf(dot: HTMLElement): HTMLElement {
  const cell = dot.closest<HTMLElement>(".risk-cell");
  if (!cell) throw new Error("cellule parente introuvable");
  return cell;
}

const SAMPLE: RiskItem[] = [
  {
    prob: 5,
    impact: 5,
    label: "Panne totale",
    level: "critical",
    owner: "CTO",
    detail: "Plan de reprise activé.",
  },
  { prob: 1, impact: 1, label: "Risque mineur", level: "low" },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RiskMatrix — structure", () => {
  it("rend le shell canonique (.risk-matrix / -wrap / axes / .risk-grid)", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    expect(document.querySelector(".risk-matrix")).toBeInTheDocument();
    expect(document.querySelector(".risk-matrix-wrap")).toBeInTheDocument();
    expect(document.querySelector(".risk-matrix-inner")).toBeInTheDocument();
    expect(document.querySelector(".risk-grid")).toBeInTheDocument();
    expect(document.querySelector(".risk-axis-y")?.textContent).toContain(
      "Probabilité",
    );
    expect(document.querySelector(".risk-axis-x")?.textContent).toContain(
      "Impact",
    );
  });

  it("génère size×size cellules + les libellés d'axes + le coin", () => {
    render(<RiskMatrix risks={SAMPLE} size={5} />);
    expect(document.querySelectorAll(".risk-cell")).toHaveLength(25);
    expect(document.querySelectorAll(".risk-row-label")).toHaveLength(5);
    expect(document.querySelectorAll(".risk-col-label")).toHaveLength(5);
  });

  it("expose data-size sur le conteneur et respecte size=3", () => {
    render(<RiskMatrix risks={[]} size={3} />);
    expect(document.querySelector(".risk-matrix")).toHaveAttribute(
      "data-size",
      "3",
    );
    expect(document.querySelectorAll(".risk-cell")).toHaveLength(9);
  });

  it("labels d'axes personnalisables", () => {
    render(<RiskMatrix risks={[]} labelX="Gravité" labelY="Fréquence" />);
    expect(document.querySelector(".risk-axis-x")?.textContent).toContain(
      "Gravité",
    );
    expect(document.querySelector(".risk-axis-y")?.textContent).toContain(
      "Fréquence",
    );
  });

  it("applique .risk-matrix-compact et className additionnel", () => {
    render(<RiskMatrix risks={[]} compact className="ma-classe" />);
    const root = document.querySelector(".risk-matrix");
    expect(root).toHaveClass("risk-matrix-compact");
    expect(root).toHaveClass("ma-classe");
  });
});

describe("RiskMatrix — styles inline indispensables (piège .progress-fill)", () => {
  it(".risk-grid porte grid-template-columns/rows inline dérivés de size", () => {
    render(<RiskMatrix risks={SAMPLE} size={5} />);
    const grid = document.querySelector(".risk-grid") as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain("24px");
    expect(grid.style.gridTemplateColumns).toContain("repeat(5, 1fr)");
    expect(grid.style.gridTemplateRows).toContain("repeat(5, 1fr)");
    expect(grid.style.gridTemplateRows).toContain("24px");
  });

  it("place chaque cellule via grid-column/grid-row inline avec INVERSION d'axe Y", () => {
    render(<RiskMatrix risks={SAMPLE} size={5} />);
    // prob=5,impact=5 ⇒ ligne 1 (haut), colonne 6 (impact 5 → col+1)
    const crit = cellOf(dotByLabel("Panne totale"));
    expect(crit.style.gridRow).toBe("1");
    expect(crit.style.gridColumn).toBe("6");
    // prob=1,impact=1 ⇒ ligne 5 (bas), colonne 2
    const low = cellOf(dotByLabel("Risque mineur"));
    expect(low.style.gridRow).toBe("5");
    expect(low.style.gridColumn).toBe("2");
  });

  it("dots en collision (idx>0) et badge overflow reçoivent margin-left:-8px inline", () => {
    const collide: RiskItem[] = [
      { prob: 3, impact: 4, label: "Risque A", level: "high" },
      { prob: 3, impact: 4, label: "Risque B", level: "high" },
      { prob: 3, impact: 4, label: "Risque C", level: "medium" },
      { prob: 3, impact: 4, label: "Risque D", level: "low" },
    ];
    render(<RiskMatrix risks={collide} size={5} />);
    // 3 dots max + 1 badge overflow
    const cell = cellOf(dotByLabel("Risque A"));
    const dots = cell.querySelectorAll<HTMLElement>(
      ".risk-dot:not(.risk-dot-overflow)",
    );
    expect(dots).toHaveLength(3);
    // premier dot : pas d'offset ; suivants : -8px
    expect(dots[0].style.marginLeft).toBe("");
    expect(dots[1].style.marginLeft).toBe("-8px");
    expect(dots[2].style.marginLeft).toBe("-8px");
    const overflow = cell.querySelector<HTMLElement>(".risk-dot-overflow");
    expect(overflow).toBeInTheDocument();
    expect(overflow?.textContent).toBe("+1");
    expect(overflow?.style.marginLeft).toBe("-8px");
    expect(overflow).toHaveAttribute("aria-hidden", "true");
  });

  it("maxDotsPerCell personnalise le seuil d'overflow", () => {
    const collide: RiskItem[] = [
      { prob: 2, impact: 2, label: "Un", level: "low" },
      { prob: 2, impact: 2, label: "Deux", level: "low" },
      { prob: 2, impact: 2, label: "Trois", level: "low" },
    ];
    render(<RiskMatrix risks={collide} size={5} maxDotsPerCell={2} />);
    const cell = cellOf(dotByLabel("Un"));
    expect(
      cell.querySelectorAll(".risk-dot:not(.risk-dot-overflow)"),
    ).toHaveLength(2);
    expect(cell.querySelector(".risk-dot-overflow")?.textContent).toBe("+1");
  });
});

describe("RiskMatrix — data-score calculé (seuils 0.16/0.36/0.64)", () => {
  it("pose data-score sur CHAQUE cellule selon prob×impact/size²", () => {
    // 5×5 (maxScore 25) : score 4→low(0.16), 9→medium(0.36), 16→high(0.64), 25→critical
    const risks: RiskItem[] = [
      { prob: 2, impact: 2, label: "Score4 low", level: "low" }, // 4/25 = 0.16
      { prob: 3, impact: 3, label: "Score9 medium", level: "medium" }, // 9/25 = 0.36
      { prob: 4, impact: 4, label: "Score16 high", level: "high" }, // 16/25 = 0.64
      { prob: 5, impact: 5, label: "Score25 critical", level: "critical" }, // 25/25 = 1
    ];
    render(<RiskMatrix risks={risks} size={5} />);
    expect(cellOf(dotByLabel("Score4 low"))).toHaveAttribute(
      "data-score",
      "low",
    );
    expect(cellOf(dotByLabel("Score9 medium"))).toHaveAttribute(
      "data-score",
      "medium",
    );
    expect(cellOf(dotByLabel("Score16 high"))).toHaveAttribute(
      "data-score",
      "high",
    );
    expect(cellOf(dotByLabel("Score25 critical"))).toHaveAttribute(
      "data-score",
      "critical",
    );
  });
});

describe("RiskMatrix — dots (data-level, aria-label, initiales)", () => {
  it("pose data-level depuis RiskItem.level, défaut 'medium' si absent", () => {
    const risks: RiskItem[] = [
      { prob: 4, impact: 4, label: "Explicit high", level: "high" },
      { prob: 2, impact: 2, label: "Sans niveau" }, // pas de level
    ];
    render(<RiskMatrix risks={risks} size={5} />);
    expect(dotByLabel("Explicit high")).toHaveAttribute("data-level", "high");
    expect(dotByLabel("Sans niveau")).toHaveAttribute("data-level", "medium");
  });

  it("aria-label = '<label> — niveau <libellé FR>' et role=button + tabindex", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    const dot = dotByLabel("Panne totale");
    expect(dot).toHaveAttribute("aria-label", "Panne totale — niveau Critique");
    expect(dot).toHaveAttribute("role", "button");
    expect(dot).toHaveAttribute("tabindex", "0");
  });

  it("affiche les initiales (2 mots → 1re lettre de chaque ; 1 mot → 2 premières)", () => {
    const risks: RiskItem[] = [
      { prob: 3, impact: 3, label: "Panne serveur", level: "medium" },
      { prob: 1, impact: 1, label: "Solo", level: "low" },
    ];
    render(<RiskMatrix risks={risks} size={5} />);
    expect(dotByLabel("Panne serveur").textContent).toBe("PS");
    expect(dotByLabel("Solo").textContent).toBe("SO");
  });
});

describe("RiskMatrix — reveal (état .risk-dot-hidden → .risk-dot-visible)", () => {
  it("dots naissent .risk-dot-hidden puis basculent .risk-dot-visible en cascade", () => {
    render(<RiskMatrix risks={SAMPLE} animate />);
    const dot = dotByLabel("Panne totale");
    // avant écoulement des timers : état initial pré-animation
    expect(dot).toHaveClass("risk-dot-hidden");
    expect(dot).not.toHaveClass("risk-dot-visible");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(dot).toHaveClass("risk-dot-visible");
    expect(dot).not.toHaveClass("risk-dot-hidden");
  });

  it("animate={false} : dots visibles immédiatement, jamais .risk-dot-hidden", () => {
    render(<RiskMatrix risks={SAMPLE} animate={false} />);
    const dot = dotByLabel("Panne totale");
    expect(dot).not.toHaveClass("risk-dot-hidden");
    expect(dot).not.toHaveClass("risk-dot-visible");
  });

  it("nettoie les timers au démontage (pas d'erreur si on avance après unmount)", () => {
    const { unmount } = render(<RiskMatrix risks={SAMPLE} animate />);
    unmount();
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(1000);
      }),
    ).not.toThrow();
  });
});

describe("RiskMatrix — tooltip (état .risk-tooltip.visible + position inline)", () => {
  it("le tooltip existe mais reste sans .visible tant qu'aucun survol", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    const tt = document.querySelector(".risk-tooltip");
    expect(tt).toBeInTheDocument();
    expect(tt).not.toHaveClass("visible");
  });

  it("mouseEnter ajoute .visible + contenu (titre, badge de niveau, owner, hint)", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    fireEvent.mouseEnter(dotByLabel("Panne totale"), {
      clientX: 100,
      clientY: 100,
    });
    const tt = document.querySelector(".risk-tooltip") as HTMLElement;
    expect(tt).toHaveClass("visible");
    expect(tt.querySelector(".risk-tooltip-title")?.textContent).toBe(
      "Panne totale",
    );
    const badge = tt.querySelector(".risk-tooltip-badge");
    expect(badge).toHaveClass("critical");
    expect(badge?.textContent).toBe("Critique");
    expect(tt.querySelector(".risk-tooltip-owner")?.textContent).toBe("CTO");
    expect(tt.querySelector(".risk-tooltip-hint")).toBeInTheDocument();
  });

  it("positionne le tooltip inline (left/top) au curseur + décalage", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    fireEvent.mouseEnter(dotByLabel("Panne totale"), {
      clientX: 100,
      clientY: 100,
    });
    const tt = document.querySelector(".risk-tooltip") as HTMLElement;
    // x = clientX + 14 ; y = clientY - 10 (pas de recadrage, loin des bords)
    expect(tt.style.left).toBe("114px");
    expect(tt.style.top).toBe("90px");
  });

  it("recadre le tooltip près des bords droit/bas du viewport (clamp)", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    // jsdom : innerWidth 1024, innerHeight 768 ; largeur repli 200, hauteur 80
    fireEvent.mouseEnter(dotByLabel("Panne totale"), {
      clientX: 1000,
      clientY: 760,
    });
    const tt = document.querySelector(".risk-tooltip") as HTMLElement;
    // flip X : 1000 - 200 - 14 = 786 ; flip Y : 760 - 80 - 10 = 670
    expect(tt.style.left).toBe("786px");
    expect(tt.style.top).toBe("670px");
  });

  it("mouseLeave retire .visible", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    const dot = dotByLabel("Panne totale");
    fireEvent.mouseEnter(dot, { clientX: 100, clientY: 100 });
    expect(document.querySelector(".risk-tooltip")).toHaveClass("visible");
    fireEvent.mouseLeave(dot);
    expect(document.querySelector(".risk-tooltip")).not.toHaveClass("visible");
  });

  it("focus clavier affiche le tooltip (ancré au dot, pas de NaN)", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    fireEvent.focus(dotByLabel("Panne totale"));
    const tt = document.querySelector(".risk-tooltip") as HTMLElement;
    expect(tt).toHaveClass("visible");
    expect(tt.querySelector(".risk-tooltip-title")?.textContent).toBe(
      "Panne totale",
    );
    expect(tt.style.left).toMatch(/px$/);
  });

  it("n'affiche pas de .risk-tooltip-owner quand owner est absent", () => {
    render(
      <RiskMatrix
        risks={[{ prob: 2, impact: 2, label: "Sans owner", level: "low" }]}
      />,
    );
    fireEvent.mouseEnter(dotByLabel("Sans owner"), { clientX: 50, clientY: 50 });
    const tt = document.querySelector(".risk-tooltip") as HTMLElement;
    expect(tt).toHaveClass("visible");
    expect(tt.querySelector(".risk-tooltip-owner")).not.toBeInTheDocument();
  });
});

describe("RiskMatrix — détail au clic (Modal interne vs onRiskClick)", () => {
  it("sans onRiskClick : le clic ouvre le Modal interne avec la table de détail", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    const dialog = document.querySelector(".modal-dialog");
    expect(dialog).not.toHaveAttribute("open");

    fireEvent.click(dotByLabel("Panne totale"));

    expect(dialog).toHaveAttribute("open");
    const body = document.querySelector(".modal-body") as HTMLElement;
    expect(body.textContent).toContain("Probabilité");
    expect(body.textContent).toContain("5 / 5");
    expect(body.textContent).toContain("Plan de reprise activé.");
    // badge de niveau réutilisé dans le corps du modal
    expect(body.querySelector(".risk-tooltip-badge")).toHaveClass("critical");
  });

  it("le corps du Modal porte les styles inline répliqués du vanilla (td padding)", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    fireEvent.click(dotByLabel("Panne totale"));
    const td = document.querySelector(".modal-body td") as HTMLElement;
    expect(td.style.padding).toBe("0.4rem 0.6rem");
    const table = document.querySelector(".modal-body table") as HTMLElement;
    expect(table.style.width).toBe("100%");
  });

  it("le titre du Modal = label du risque cliqué", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    fireEvent.click(dotByLabel("Panne totale"));
    expect(document.querySelector(".modal-header")?.textContent).toContain(
      "Panne totale",
    );
  });

  it("bouton Fermer referme le Modal interne", () => {
    render(<RiskMatrix risks={SAMPLE} />);
    fireEvent.click(dotByLabel("Panne totale"));
    expect(document.querySelector(".modal-dialog")).toHaveAttribute("open");
    const fermer = document.querySelector(
      ".modal-actions button",
    ) as HTMLButtonElement;
    expect(fermer.textContent).toBe("Fermer");
    fireEvent.click(fermer);
    expect(document.querySelector(".modal-dialog")).not.toHaveAttribute("open");
  });

  it("avec onRiskClick : le clic délègue et NE rend PAS de Modal interne", () => {
    const onRiskClick = vi.fn();
    render(<RiskMatrix risks={SAMPLE} onRiskClick={onRiskClick} />);

    fireEvent.click(dotByLabel("Panne totale"));

    expect(onRiskClick).toHaveBeenCalledTimes(1);
    expect(onRiskClick).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Panne totale", prob: 5, impact: 5 }),
    );
    expect(document.querySelector(".modal-dialog")).not.toBeInTheDocument();
  });

  it("clavier Enter et Espace activent le dot (comme le clic)", () => {
    const onRiskClick = vi.fn();
    render(<RiskMatrix risks={SAMPLE} onRiskClick={onRiskClick} />);
    const dot = dotByLabel("Panne totale");

    fireEvent.keyDown(dot, { key: "Enter" });
    expect(onRiskClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(dot, { key: " " });
    expect(onRiskClick).toHaveBeenCalledTimes(2);
  });

  it("une autre touche n'active pas le dot", () => {
    const onRiskClick = vi.fn();
    render(<RiskMatrix risks={SAMPLE} onRiskClick={onRiskClick} />);
    fireEvent.keyDown(dotByLabel("Panne totale"), { key: "a" });
    expect(onRiskClick).not.toHaveBeenCalled();
  });
});
