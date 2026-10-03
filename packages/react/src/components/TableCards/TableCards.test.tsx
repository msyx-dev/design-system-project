import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import {
  TableCards,
  TableCardsCell,
  type TableCardsColumn,
} from "./TableCards";

// Les assertions portent sur les classes et la structure dont dépend le CSS DS
// (tables.css, bloc TABLE CARDS : `.table-wrap`, `.table-cards`, sélecteurs
// `.table-cards thead|tbody|tfoot|tr|td`, `.table-cards .table-cards-label`,
// `.table-cards .table-cards-actions`) et sur le contrat a11y (libellé
// `aria-hidden`, en-têtes exposés, rôles explicites). jsdom n'applique aucune
// mise en page : le recouvrement et le seuil 768 px sont mesurés en vrai
// navigateur par `visual-tests/table-cards.spec.ts`.

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  email: string;
}

const rows: Row[] = [
  { id: "a", name: "Alice", email: "alice@exemple.fr" },
  { id: "b", name: "Bastien", email: "bastien@exemple.fr" },
];

const columns: TableCardsColumn<Row>[] = [
  { key: "name", header: "Nom" },
  { key: "email", header: "E-mail" },
  {
    key: "actions",
    header: "Actions",
    actions: true,
    render: (row) => <button type="button">Copier {row.name}</button>,
  },
];

const getRowKey = (row: Row) => row.id;

function renderTable(
  props: Partial<Parameters<typeof TableCards<Row>>[0]> = {},
) {
  return render(
    <TableCards
      columns={columns}
      rows={rows}
      getRowKey={getRowKey}
      aria-label="Participants"
      {...props}
    />,
  );
}

describe("TableCards — structure et classes dont dépend le CSS", () => {
  it("rend .table-wrap > table.table-cards[role=table] > thead/tbody[role=rowgroup]", () => {
    const { container } = renderTable();
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap).toHaveClass("table-wrap");
    const table = wrap.querySelector(":scope > table.table-cards");
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute("role", "table");
    const thead = table!.querySelector(":scope > thead");
    const tbody = table!.querySelector(":scope > tbody");
    expect(thead).toHaveAttribute("role", "rowgroup");
    expect(tbody).toHaveAttribute("role", "rowgroup");
  });

  it("les th portent scope=col, role=columnheader et le texte de header", () => {
    const { container } = renderTable();
    const ths = Array.from(container.querySelectorAll("thead th"));
    expect(ths.map((th) => th.textContent)).toEqual([
      "Nom",
      "E-mail",
      "Actions",
    ]);
    for (const th of ths) {
      expect(th).toHaveAttribute("scope", "col");
      expect(th).toHaveAttribute("role", "columnheader");
    }
  });

  it("chaque ligne est un tr[role=row] de tbody, chaque cellule un td[role=cell]", () => {
    const { container } = renderTable();
    const trs = container.querySelectorAll("tbody > tr");
    expect(trs).toHaveLength(2);
    for (const tr of Array.from(trs)) {
      expect(tr).toHaveAttribute("role", "row");
      const tds = tr.querySelectorAll(":scope > td");
      expect(tds).toHaveLength(3);
      for (const td of Array.from(tds)) {
        expect(td).toHaveAttribute("role", "cell");
      }
    }
  });

  it("ajoute className sur .table-wrap sans perdre la classe de base", () => {
    const { container } = renderTable({ className: "ma-classe" });
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap).toHaveClass("table-wrap", "ma-classe");
    expect(wrap.querySelector("table")).not.toHaveClass("ma-classe");
  });

  it("n'émet ni data-label ni ::before : aucun attribut data-label dans le markup", () => {
    const { container } = renderTable();
    expect(container.querySelector("[data-label]")).toBeNull();
  });
});

describe("TableCards — libellés de carte", () => {
  it("une cellule de données commence par span.table-cards-label[aria-hidden=true] = header", () => {
    const { container } = renderTable();
    const row = container.querySelector("tbody > tr") as HTMLElement;
    const [nameCell, emailCell] = Array.from(row.querySelectorAll("td"));
    const nameLabel = nameCell.firstElementChild as HTMLElement;
    expect(nameLabel.tagName).toBe("SPAN");
    expect(nameLabel).toHaveClass("table-cards-label");
    expect(nameLabel).toHaveAttribute("aria-hidden", "true");
    expect(nameLabel.textContent).toBe("Nom");
    const emailLabel = emailCell.firstElementChild as HTMLElement;
    expect(emailLabel).toHaveClass("table-cards-label");
    expect(emailLabel.textContent).toBe("E-mail");
  });

  it("le libellé est le PREMIER enfant, suivi de la valeur", () => {
    const { container } = renderTable();
    const td = container.querySelector("tbody td") as HTMLElement;
    expect(td.childNodes).toHaveLength(2);
    expect((td.childNodes[0] as HTMLElement).className).toBe(
      "table-cards-label",
    );
    expect(td.childNodes[1].textContent).toBe("Alice");
  });

  it("le nom accessible de la cellule exclut le libellé (pas de double annonce)", () => {
    renderTable();
    expect(
      screen.getByRole("cell", { name: "Alice" }),
    ).toBeInTheDocument();
    // « Nom Alice » (libellé + valeur) ne doit PAS être un nom de cellule.
    expect(screen.queryByRole("cell", { name: "Nom Alice" })).toBeNull();
    expect(
      screen.getByRole("cell", { name: "alice@exemple.fr" }),
    ).toBeInTheDocument();
  });

  it("l'en-tête de colonne reste exposé (canal accessible)", () => {
    renderTable();
    expect(
      screen.getByRole("columnheader", { name: "Nom" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "E-mail" }),
    ).toBeInTheDocument();
  });

  it("hideLabel : aucun libellé dans les cellules de la colonne", () => {
    const { container } = renderTable({
      columns: [
        { key: "name", header: "Nom", hideLabel: true },
        { key: "email", header: "E-mail" },
      ],
    });
    const row = container.querySelector("tbody > tr") as HTMLElement;
    const [nameCell, emailCell] = Array.from(row.querySelectorAll("td"));
    expect(nameCell.querySelector(".table-cards-label")).toBeNull();
    expect(emailCell.querySelector(".table-cards-label")).not.toBeNull();
    // L'en-tête, lui, reste dans le thead.
    expect(
      screen.getByRole("columnheader", { name: "Nom" }),
    ).toBeInTheDocument();
  });

  it("actions : td.table-cards-actions, aucun libellé, rendu de la colonne", () => {
    const { container } = renderTable();
    const row = container.querySelector("tbody > tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    const actionsCell = cells[2];
    expect(actionsCell).toHaveClass("table-cards-actions");
    expect(actionsCell.querySelector(".table-cards-label")).toBeNull();
    expect(
      within(actionsCell).getByRole("button", { name: "Copier Alice" }),
    ).toBeInTheDocument();
    // Les cellules de données ne portent pas la classe d'actions.
    expect(cells[0]).not.toHaveClass("table-cards-actions");
    expect(cells[1]).not.toHaveClass("table-cards-actions");
  });

  it("render reçoit (row, rowIndex) ; sans render, row[key] converti en texte", () => {
    const seen: Array<[string, number]> = [];
    const { container } = renderTable({
      columns: [
        {
          key: "name",
          header: "Nom",
          render: (row, index) => {
            seen.push([row.name, index]);
            return `#${index} ${row.name}`;
          },
        },
        { key: "missing", header: "Absent" },
      ],
    });
    expect(seen).toEqual([
      ["Alice", 0],
      ["Bastien", 1],
    ]);
    const cells = container.querySelectorAll("tbody tr:first-child td");
    expect(cells[0].textContent).toBe("Nom#0 Alice");
    // Valeur absente → cellule vide (libellé seul), jamais « undefined ».
    expect(cells[1].textContent).toBe("Absent");
  });
});

describe("TableCards — nom accessible, vide, extension", () => {
  it("aria-label est posé sur le <table>", () => {
    renderTable();
    expect(
      screen.getByRole("table", { name: "Participants" }),
    ).toBeInTheDocument();
  });

  it("caption est rendue en <caption> et nomme le tableau", () => {
    const { container } = renderTable({
      caption: "Participants du tirage",
      "aria-label": undefined,
    });
    const caption = container.querySelector("table > caption");
    expect(caption).toHaveTextContent("Participants du tirage");
    expect(
      screen.getByRole("table", { name: "Participants du tirage" }),
    ).toBeInTheDocument();
  });

  it("sans caption, pas de <caption>", () => {
    const { container } = renderTable();
    expect(container.querySelector("caption")).toBeNull();
  });

  it("rows=[] : une seule ligne, td[colspan=columns.length], « Aucun résultat » par défaut", () => {
    const { container } = renderTable({ rows: [] });
    const trs = container.querySelectorAll("tbody > tr");
    expect(trs).toHaveLength(1);
    const td = trs[0].querySelector("td") as HTMLElement;
    expect(td).toHaveAttribute("colspan", String(columns.length));
    expect(td).toHaveTextContent("Aucun résultat");
    expect(td.querySelector(".table-cards-label")).toBeNull();
  });

  it("emptyLabel personnalise le contenu de la ligne vide", () => {
    const { container } = renderTable({
      rows: [],
      emptyLabel: <em>Personne pour l'instant</em>,
    });
    const td = container.querySelector("tbody td") as HTMLElement;
    expect(td.querySelector("em")).toHaveTextContent("Personne pour l'instant");
  });

  it("getRowProps : attributs posés sur le <tr> avec (row, rowIndex)", () => {
    const { container } = renderTable({
      getRowProps: (row, index) => ({
        id: `row-${row.id}`,
        "aria-describedby": `err-${index}`,
        className: "ligne-erreur",
      }),
    });
    const trs = container.querySelectorAll("tbody > tr");
    expect(trs[0]).toHaveAttribute("id", "row-a");
    expect(trs[0]).toHaveAttribute("aria-describedby", "err-0");
    expect(trs[0]).toHaveClass("ligne-erreur");
    expect(trs[1]).toHaveAttribute("id", "row-b");
    expect(trs[1]).toHaveAttribute("aria-describedby", "err-1");
  });

  it('getRowProps ne peut pas écraser role="row"', () => {
    const { container } = renderTable({
      getRowProps: () => ({ role: "presentation" }),
    });
    for (const tr of Array.from(container.querySelectorAll("tbody > tr"))) {
      expect(tr).toHaveAttribute("role", "row");
    }
  });

  it("footer : contenu dans <tfoot role=rowgroup>, après le tbody", () => {
    const { container } = renderTable({
      footer: (
        <tr role="row">
          <TableCardsCell label="Nom" colSpan={2}>
            Ajouter
          </TableCardsCell>
        </tr>
      ),
    });
    const tfoot = container.querySelector("table > tfoot") as HTMLElement;
    expect(tfoot).toHaveAttribute("role", "rowgroup");
    expect(tfoot.previousElementSibling?.tagName).toBe("TBODY");
    expect(tfoot.querySelector("tr[role=row] > td[role=cell]")).not.toBeNull();
    expect(
      tfoot.querySelector("td > .table-cards-label[aria-hidden=true]"),
    ).toHaveTextContent("Nom");
  });

  it("sans footer, pas de <tfoot>", () => {
    const { container } = renderTable();
    expect(container.querySelector("tfoot")).toBeNull();
  });

  it("aucune donnée consommateur n'est interprétée comme HTML (texte échappé)", () => {
    const hostile = '<img src="x" onerror="alert(1)">';
    const { container } = renderTable({
      rows: [{ id: "x", name: hostile, email: "x@exemple.fr" }],
      columns: [{ key: "name", header: "<b>Nom</b>" }],
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("th b")).toBeNull();
    expect(container.querySelector("th")?.textContent).toBe("<b>Nom</b>");
    expect(container.querySelector("tbody td")?.textContent).toBe(
      `<b>Nom</b>${hostile}`,
    );
  });
});

describe("TableCardsCell — seule", () => {
  function renderCell(node: ReactNode) {
    return render(
      <table>
        <tbody>
          <tr>{node}</tr>
        </tbody>
      </table>,
    );
  }

  it("rend td[role=cell] avec libellé aria-hidden en premier enfant", () => {
    const { container } = renderCell(
      <TableCardsCell label="Statut">Ouvert</TableCardsCell>,
    );
    const td = container.querySelector("td") as HTMLElement;
    expect(td).toHaveAttribute("role", "cell");
    const label = td.firstElementChild as HTMLElement;
    expect(label).toHaveClass("table-cards-label");
    expect(label).toHaveAttribute("aria-hidden", "true");
    expect(label).toHaveTextContent("Statut");
    expect(td.lastChild?.textContent).toBe("Ouvert");
  });

  it("sans label, aucun libellé", () => {
    const { container } = renderCell(<TableCardsCell>Ouvert</TableCardsCell>);
    expect(container.querySelector(".table-cards-label")).toBeNull();
  });

  it("actions : ajoute .table-cards-actions et ignore label", () => {
    const { container } = renderCell(
      <TableCardsCell actions label="Actions">
        <button type="button">Go</button>
      </TableCardsCell>,
    );
    const td = container.querySelector("td") as HTMLElement;
    expect(td).toHaveClass("table-cards-actions");
    expect(td.querySelector(".table-cards-label")).toBeNull();
  });

  it("passe les attributs de <td> (colSpan, id) et fusionne className", () => {
    const { container } = renderCell(
      <TableCardsCell actions colSpan={3} id="c1" className="extra">
        x
      </TableCardsCell>,
    );
    const td = container.querySelector("td") as HTMLElement;
    expect(td).toHaveAttribute("colspan", "3");
    expect(td).toHaveAttribute("id", "c1");
    expect(td).toHaveClass("table-cards-actions", "extra");
  });

  it("className seul : pas de classe d'actions", () => {
    const { container } = renderCell(
      <TableCardsCell className="extra">x</TableCardsCell>,
    );
    const td = container.querySelector("td") as HTMLElement;
    expect(td).toHaveClass("extra");
    expect(td).not.toHaveClass("table-cards-actions");
  });
});

describe("TableCards — accessibilité (axe)", () => {
  it("n'a aucune violation axe (avec caption, actions et footer)", async () => {
    const { container } = render(
      <TableCards
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        caption="Participants du tirage"
        footer={
          <tr role="row">
            <TableCardsCell colSpan={3}>2 participants</TableCardsCell>
          </tr>
        }
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("n'a aucune violation axe à l'état vide", async () => {
    const { container } = renderTable({ rows: [] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
