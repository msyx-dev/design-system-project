import { afterEach, describe, it, expect } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { VirtualList } from "./VirtualList";

afterEach(cleanup);

/** Les deux `.virtual-spacer` dans l'ordre DOM : [haut, bas]. */
function spacers() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".virtual-spacer"),
  );
}

function rowIndices() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".virtual-list-row"),
  ).map((r) => r.getAttribute("aria-rowindex"));
}

describe("VirtualList — structure canonique", () => {
  it("rend .virtual-list > .virtual-list-viewport(role=list) > [spacer, ...rows, spacer]", () => {
    render(<VirtualList count={1000} />);

    const root = document.querySelector(".virtual-list");
    expect(root).toBeInTheDocument();

    const viewport = document.querySelector(".virtual-list-viewport");
    expect(viewport).toBeInTheDocument();
    expect(viewport).toHaveAttribute("role", "list");
    expect(viewport).toHaveAttribute("aria-rowcount", "1000");

    // Parité DOM vanilla : viewport > [topSpacer, ...rows, bottomSpacer]
    const children = Array.from(viewport!.children);
    expect(children[0]).toHaveClass("virtual-spacer");
    expect(children[children.length - 1]).toHaveClass("virtual-spacer");
    const rows = children.slice(1, -1);
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r) => expect(r).toHaveClass("virtual-list-row"));
  });

  it("reflète count sur data-vlist-count (racine)", () => {
    render(<VirtualList count={1000} />);
    expect(document.querySelector(".virtual-list")).toHaveAttribute(
      "data-vlist-count",
      "1000",
    );
  });

  it("les deux .virtual-spacer sont aria-hidden", () => {
    render(<VirtualList count={1000} />);
    const [top, bottom] = spacers();
    expect(top).toHaveAttribute("aria-hidden", "true");
    expect(bottom).toHaveAttribute("aria-hidden", "true");
  });

  it("applique ariaLabel sur le viewport quand fourni", () => {
    render(<VirtualList count={10} ariaLabel="Résultats" />);
    expect(document.querySelector(".virtual-list-viewport")).toHaveAttribute(
      "aria-label",
      "Résultats",
    );
  });

  it("fusionne className sur la racine .virtual-list", () => {
    render(<VirtualList count={10} className="ma-liste" />);
    const root = document.querySelector(".virtual-list");
    expect(root).toHaveClass("virtual-list");
    expect(root).toHaveClass("ma-liste");
  });
});

describe("VirtualList — custom props inline (desync token / #440)", () => {
  it("pilote --vlist-row-h / --vlist-height inline sur la racine (défauts)", () => {
    render(<VirtualList count={10} />);
    const root = document.querySelector(".virtual-list") as HTMLElement;
    expect(root.style.getPropertyValue("--vlist-row-h")).toBe("40px");
    expect(root.style.getPropertyValue("--vlist-height")).toBe("400px");
  });

  it("réapplique rowHeight / height custom en custom props inline", () => {
    render(<VirtualList count={10} rowHeight={50} height={500} />);
    const root = document.querySelector(".virtual-list") as HTMLElement;
    expect(root.style.getPropertyValue("--vlist-row-h")).toBe("50px");
    expect(root.style.getPropertyValue("--vlist-height")).toBe("500px");
  });
});

describe("VirtualList — fenêtrage initial (scrollTop=0)", () => {
  // Défauts : rowHeight=40, height=400, overscan=5
  // visibleCount = ceil(400/40) + 2*5 = 10 + 10 = 20
  it("ne monte QUE la fenêtre visible + overscan (20 lignes pour 1000)", () => {
    render(<VirtualList count={1000} />);
    expect(document.querySelectorAll(".virtual-list-row")).toHaveLength(20);
  });

  it("aria-rowindex = index logique 1-based (première fenêtre 1..20)", () => {
    render(<VirtualList count={1000} />);
    const indices = rowIndices();
    expect(indices[0]).toBe("1");
    expect(indices[indices.length - 1]).toBe("20");
  });

  it("PIÈGE inline : spacer haut = 0px, spacer bas = (1000-20)*40 = 39200px", () => {
    render(<VirtualList count={1000} />);
    const [top, bottom] = spacers();
    expect(top).toHaveStyle({ height: "0px" });
    expect(bottom).toHaveStyle({ height: "39200px" });
  });

  it("rendu par défaut : « Élément #N » 1-based", () => {
    render(<VirtualList count={1000} />);
    const firstRow = document.querySelector(".virtual-list-row");
    expect(firstRow).toHaveTextContent("Élément #1");
  });
});

describe("VirtualList — fenêtrage au scroll", () => {
  it("recalcule la fenêtre, les spacers inline et aria-rowindex après scroll", () => {
    render(<VirtualList count={1000} />);
    const viewport = document.querySelector(
      ".virtual-list-viewport",
    ) as HTMLElement;

    // scrollTop = 4000 → first = floor(4000/40)-5 = 95, rowCount = 20
    fireEvent.scroll(viewport, { target: { scrollTop: 4000 } });

    expect(document.querySelectorAll(".virtual-list-row")).toHaveLength(20);
    const indices = rowIndices();
    // aria-rowindex reste l'index LOGIQUE (96..115), pas l'index dans la fenêtre
    expect(indices[0]).toBe("96");
    expect(indices[indices.length - 1]).toBe("115");

    const [top, bottom] = spacers();
    expect(top).toHaveStyle({ height: "3800px" }); // 95 * 40
    expect(bottom).toHaveStyle({ height: "35400px" }); // (1000-95-20) * 40
  });

  it("scroll en bas : clamp de la fenêtre, spacer bas = 0px, dernière ligne = count", () => {
    render(<VirtualList count={1000} />);
    const viewport = document.querySelector(
      ".virtual-list-viewport",
    ) as HTMLElement;

    fireEvent.scroll(viewport, { target: { scrollTop: 999999 } });

    // first clampé à max(0, 1000-20) = 980, rowCount = 20 → lignes 981..1000
    const indices = rowIndices();
    expect(indices[0]).toBe("981");
    expect(indices[indices.length - 1]).toBe("1000");

    const [top, bottom] = spacers();
    expect(top).toHaveStyle({ height: "39200px" }); // 980 * 40
    expect(bottom).toHaveStyle({ height: "0px" }); // plus rien sous la fenêtre
  });
});

describe("VirtualList — render-prop renderRow", () => {
  it("utilise renderRow(index) pour le contenu des lignes (index logique 0-based)", () => {
    render(
      <VirtualList
        count={1000}
        renderRow={(i) => <span className="cell">ligne-{i}</span>}
      />,
    );
    const cells = document.querySelectorAll(".cell");
    expect(cells).toHaveLength(20);
    expect(cells[0]).toHaveTextContent("ligne-0");
    expect(cells[19]).toHaveTextContent("ligne-19");
  });
});

describe("VirtualList — paramètres de fenêtrage custom", () => {
  it("rowHeight/height/overscan pilotent le nombre de lignes et la math des spacers", () => {
    // rowHeight=20, height=200, overscan=2, count=100
    // visibleCount = ceil(200/20) + 2*2 = 10 + 4 = 14
    render(
      <VirtualList count={100} rowHeight={20} height={200} overscan={2} />,
    );
    expect(document.querySelectorAll(".virtual-list-row")).toHaveLength(14);

    const [top, bottom] = spacers();
    expect(top).toHaveStyle({ height: "0px" });
    expect(bottom).toHaveStyle({ height: "1720px" }); // (100-14)*20
  });
});

describe("VirtualList — cas limites", () => {
  it("count plus petit que la fenêtre : monte tout, spacers à 0px", () => {
    render(<VirtualList count={3} />);
    expect(document.querySelectorAll(".virtual-list-row")).toHaveLength(3);
    const [top, bottom] = spacers();
    expect(top).toHaveStyle({ height: "0px" });
    expect(bottom).toHaveStyle({ height: "0px" });
  });

  it("count=0 : aucune ligne, aria-rowcount=0, spacers à 0px", () => {
    render(<VirtualList count={0} />);
    expect(document.querySelectorAll(".virtual-list-row")).toHaveLength(0);
    expect(document.querySelector(".virtual-list-viewport")).toHaveAttribute(
      "aria-rowcount",
      "0",
    );
    const [top, bottom] = spacers();
    expect(top).toHaveStyle({ height: "0px" });
    expect(bottom).toHaveStyle({ height: "0px" });
  });
});

describe("VirtualList — SSR-safe", () => {
  it("renderToStaticMarkup ne jette pas et rend la fenêtre du haut + spacers inline", () => {
    const markup = renderToStaticMarkup(<VirtualList count={1000} />);

    expect(markup).toContain('class="virtual-list"');
    expect(markup).toContain('aria-rowcount="1000"');
    expect(markup).toContain('role="listitem"');
    // spacers à hauteur inline présents dès le rendu serveur (scrollTop=0)
    expect(markup).toContain("height:0px");
    expect(markup).toContain("height:39200px");
    // custom props inline pilotées sur la racine
    expect(markup).toContain("--vlist-row-h:40px");
    expect(markup).toContain("--vlist-height:400px");
  });
});
