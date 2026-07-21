import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { DataGrid, type DataGridColumn } from "./DataGrid";

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  age: number;
}

const rows: Row[] = [
  { id: "a", name: "Bea", age: 41 },
  { id: "b", name: "Ana", age: 22 },
  { id: "c", name: "Cid", age: 33 },
];

const columns: DataGridColumn<Row>[] = [
  { key: "name", header: "Nom", sortable: true },
  { key: "age", header: "Âge", sortable: true },
  { key: "actions", header: "Actions", stickyEnd: true, render: () => "•" },
];

function getRowKey(row: Row) {
  return row.id;
}

describe("DataGrid — structure canonique", () => {
  it("rend .data-grid-wrap > table.data-grid > thead/tbody/tfoot", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);

    const wrap = document.querySelector(".data-grid-wrap");
    expect(wrap).toBeInTheDocument();

    const table = wrap!.querySelector("table.data-grid");
    expect(table).toBeInTheDocument();
    expect(
      table!.querySelector("thead > tr.data-grid-header-row"),
    ).toBeInTheDocument();
    expect(table!.querySelector("tbody.data-grid-body")).toBeInTheDocument();
    expect(table!.querySelector("tfoot.data-grid-footer")).toBeInTheDocument();
  });

  it("applique .data-grid-sortable + .data-grid-sort-icon uniquement aux colonnes triables", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const headerCells = document.querySelectorAll(".data-grid-header-row th");
    expect(headerCells[0]).toHaveClass("data-grid-sortable");
    expect(
      headerCells[0].querySelector(".data-grid-sort-icon"),
    ).toBeInTheDocument();
    expect(headerCells[2]).not.toHaveClass("data-grid-sortable");
    expect(
      headerCells[2].querySelector(".data-grid-sort-icon"),
    ).not.toBeInTheDocument();
    // jamais de classe non préfixée
    expect(document.querySelector(".sort-icon")).not.toBeInTheDocument();
  });

  it("applique .data-grid-col-sticky-end sur le th ET les td de la colonne pinnée", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const headerCells = document.querySelectorAll(".data-grid-header-row th");
    expect(headerCells[2]).toHaveClass("data-grid-col-sticky-end");
    const stickyTds = document.querySelectorAll(
      ".data-grid-body td.data-grid-col-sticky-end",
    );
    expect(stickyTds).toHaveLength(rows.length);
  });

  it("fusionne className sur .data-grid-wrap", () => {
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        className="ma-grille"
      />,
    );
    const wrap = document.querySelector(".data-grid-wrap");
    expect(wrap).toHaveClass("data-grid-wrap");
    expect(wrap).toHaveClass("ma-grille");
  });

  it("rend <caption> quand fourni", () => {
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        caption="Utilisateurs"
      />,
    );
    expect(
      document.querySelector("table.data-grid > caption"),
    ).toHaveTextContent("Utilisateurs");
  });
});

describe("DataGrid — tri interne (clic)", () => {
  function nameCells() {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        ".data-grid-body tr td:first-child",
      ),
    ).map((td) => td.textContent);
  }

  it("aria-sort initial = none sur les th triables", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const headerCells = document.querySelectorAll(".data-grid-header-row th");
    expect(headerCells[0]).toHaveAttribute("aria-sort", "none");
    expect(headerCells[1]).toHaveAttribute("aria-sort", "none");
  });

  it("1er clic → ascending, trie les lignes croissant (localeCompare fr)", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const nameHeader = document.querySelectorAll(".data-grid-header-row th")[0];
    fireEvent.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(nameCells()).toEqual(["Ana", "Bea", "Cid"]);
  });

  it("2e clic → descending, inverse l'ordre", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const nameHeader = document.querySelectorAll(".data-grid-header-row th")[0];
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    expect(nameCells()).toEqual(["Cid", "Bea", "Ana"]);
  });

  it("3e clic → none, revient à l'ordre original des rows", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const nameHeader = document.querySelectorAll(".data-grid-header-row th")[0];
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    expect(nameCells()).toEqual(["Bea", "Ana", "Cid"]);
  });

  it("cliquer une autre colonne réinitialise aria-sort de la précédente", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const [nameHeader, ageHeader] = document.querySelectorAll(
      ".data-grid-header-row th",
    );
    fireEvent.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(ageHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "none");
    expect(ageHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("tri numérique par comparaison de valeurs (colonne age)", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const ageHeader = document.querySelectorAll(".data-grid-header-row th")[1];
    fireEvent.click(ageHeader);
    const ageCells = Array.from(
      document.querySelectorAll(".data-grid-body tr td:nth-child(2)"),
    ).map((td) => td.textContent);
    expect(ageCells).toEqual(["22", "33", "41"]);
  });

  it("clic sur une colonne non triable n'a aucun effet", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const actionsHeader = document.querySelectorAll(
      ".data-grid-header-row th",
    )[2];
    fireEvent.click(actionsHeader);
    expect(actionsHeader).not.toHaveAttribute("aria-sort");
  });

  it("Enter au clavier sur un th triable déclenche le même cycle que le clic", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const nameHeader = document.querySelectorAll(".data-grid-header-row th")[0];
    fireEvent.keyDown(nameHeader, { key: "Enter" });
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  });
});

describe("DataGrid — états loading / vide", () => {
  it("loading : LOADING_ROW_COUNT lignes squelette + aria-busy sur le wrap", () => {
    render(
      <DataGrid columns={columns} rows={rows} getRowKey={getRowKey} loading />,
    );
    expect(document.querySelector(".data-grid-wrap")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(document.querySelectorAll(".data-grid-body tr")).toHaveLength(5);
    expect(document.querySelectorAll(".skeleton-cell").length).toBeGreaterThan(
      0,
    );
  });

  it("pas de aria-busy quand loading est false", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    expect(document.querySelector(".data-grid-wrap")).not.toHaveAttribute(
      "aria-busy",
    );
  });

  it("vide : une ligne colSpan=columns.length avec emptyLabel par défaut", () => {
    render(<DataGrid columns={columns} rows={[]} getRowKey={getRowKey} />);
    const bodyRows = document.querySelectorAll(".data-grid-body tr");
    expect(bodyRows).toHaveLength(1);
    expect(bodyRows[0].querySelector("td")).toHaveAttribute(
      "colspan",
      String(columns.length),
    );
    expect(bodyRows[0]).toHaveTextContent("Aucun résultat");
  });

  it("vide : emptyLabel custom remplace le défaut", () => {
    render(
      <DataGrid
        columns={columns}
        rows={[]}
        getRowKey={getRowKey}
        emptyLabel="Rien à afficher"
      />,
    );
    expect(document.querySelector(".data-grid-body tr")).toHaveTextContent(
      "Rien à afficher",
    );
  });
});

describe("DataGrid — rendu de cellule", () => {
  it("utilise render(row, rowIndex) quand fourni, sinon row[key]", () => {
    render(<DataGrid columns={columns} rows={rows} getRowKey={getRowKey} />);
    const firstRow = document.querySelectorAll(".data-grid-body tr")[0];
    const cells = firstRow.querySelectorAll("td");
    expect(cells[0]).toHaveTextContent("Bea");
    expect(cells[1]).toHaveTextContent("41");
    expect(cells[2]).toHaveTextContent("•");
  });
});
