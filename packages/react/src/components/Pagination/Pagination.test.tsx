import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pagination, PaginationInfo, getPaginationRange } from "./Pagination";

afterEach(() => {
  cleanup();
});

describe("getPaginationRange — fenêtrage pur", () => {
  it("total <= fenêtre : toutes les pages, aucune ellipsis", () => {
    expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("page proche du début : ellipsis de fin uniquement", () => {
    const r = getPaginationRange(1, 20);
    expect(r[r.length - 1]).toBe(20);
    expect(r).toContain("ellipsis-end");
    expect(r).not.toContain("ellipsis-start");
  });

  it("page proche de la fin : ellipsis de début uniquement", () => {
    const r = getPaginationRange(20, 20);
    expect(r[0]).toBe(1);
    expect(r).toContain("ellipsis-start");
    expect(r).not.toContain("ellipsis-end");
  });

  it("page au milieu : les deux ellipsis, page courante entourée de ses voisins", () => {
    const r = getPaginationRange(10, 20);
    expect(r).toContain("ellipsis-start");
    expect(r).toContain("ellipsis-end");
    expect(r).toContain(9);
    expect(r).toContain(10);
    expect(r).toContain(11);
    expect(r[0]).toBe(1);
    expect(r[r.length - 1]).toBe(20);
  });

  it("total <= 0 : fenêtre vide", () => {
    expect(getPaginationRange(1, 0)).toEqual([]);
  });
});

describe("Pagination — markup et classes", () => {
  it("émet .pagination sur la racine <nav>", () => {
    render(<Pagination page={1} total={5} onPageChange={() => {}} />);
    const nav = document.querySelector("nav.pagination");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("aria-label", "Pagination");
  });

  it("chaque bouton de page émet .page-btn, la page courante ajoute .active + aria-current", () => {
    render(<Pagination page={2} total={3} onPageChange={() => {}} />);
    const btn1 = screen_getPageButton("1");
    const btn2 = screen_getPageButton("2");
    expect(btn1.className).toContain("page-btn");
    expect(btn1.className).not.toContain("active");
    expect(btn2.className).toContain("page-btn");
    expect(btn2.className).toContain("active");
    expect(btn2).toHaveAttribute("aria-current", "page");
    expect(btn1).not.toHaveAttribute("aria-current");
  });

  it("précédent/suivant émettent .page-btn.nav", () => {
    render(<Pagination page={2} total={5} onPageChange={() => {}} />);
    const buttons = Array.from(document.querySelectorAll(".page-btn.nav"));
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute("aria-label", "Page précédente");
    expect(buttons[1]).toHaveAttribute("aria-label", "Page suivante");
  });

  it("précédent désactivé sur la 1re page, suivant désactivé sur la dernière", () => {
    const { rerender } = render(
      <Pagination page={1} total={5} onPageChange={() => {}} />,
    );
    const navButtons = () =>
      Array.from(document.querySelectorAll(".page-btn.nav"));
    expect(navButtons()[0]).toBeDisabled();
    expect(navButtons()[1]).not.toBeDisabled();

    rerender(<Pagination page={5} total={5} onPageChange={() => {}} />);
    expect(navButtons()[0]).not.toBeDisabled();
    expect(navButtons()[1]).toBeDisabled();
  });

  it("une ellipsis émet .page-ellipsis quand la fenêtre en comporte une", () => {
    render(<Pagination page={1} total={20} onPageChange={() => {}} />);
    expect(document.querySelector(".page-ellipsis")).toBeInTheDocument();
  });

  it("aucune .page-ellipsis quand la fenêtre tient sans troncature", () => {
    render(<Pagination page={1} total={5} onPageChange={() => {}} />);
    expect(document.querySelector(".page-ellipsis")).not.toBeInTheDocument();
  });

  it("clic sur un numéro de page appelle onPageChange avec ce numéro", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} total={5} onPageChange={onPageChange} />);
    fireEvent.click(screen_getPageButton("3"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("clic sur suivant/précédent appelle onPageChange avec page±1", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} total={5} onPageChange={onPageChange} />);
    const [prev, next] = Array.from(document.querySelectorAll(".page-btn.nav"));
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(prev);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("className additionnelle est fusionnée", () => {
    render(
      <Pagination
        page={1}
        total={3}
        onPageChange={() => {}}
        className="custom"
      />,
    );
    expect(document.querySelector("nav.pagination.custom")).toBeInTheDocument();
  });
});

describe("PaginationInfo", () => {
  it("émet .pagination-info avec son contenu", () => {
    render(<PaginationInfo>Affichage 1-10 sur 124 résultats</PaginationInfo>);
    const el = document.querySelector(".pagination-info");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("Affichage 1-10 sur 124 résultats");
  });

  it("rendu en <span>", () => {
    render(<PaginationInfo>x</PaginationInfo>);
    expect(document.querySelector(".pagination-info")?.tagName).toBe("SPAN");
  });
});

/** Helper : bouton .page-btn (hors .nav) portant exactement ce texte. */
function screen_getPageButton(label: string): HTMLElement {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".page-btn:not(.nav)"),
  );
  const found = buttons.find((b) => b.textContent === label);
  if (!found) throw new Error(`Bouton de page "${label}" introuvable`);
  return found;
}
