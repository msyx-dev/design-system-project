import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { VersionNotes, ReleaseNote, Highlight } from "./VersionNotes";

const KEY = "ds-test-version-notes";
const LATEST = "2.97.0";

const RELEASES: ReleaseNote[] = [
  {
    version: "2.97.0",
    date: "2026-07-14",
    titre: "Notes de version data-driven",
    highlights: [
      { type: "nouveaute", text: "Composant VersionNotes" },
      { type: "correction", text: "Focus overlay corrigé" },
    ],
  },
  {
    version: "2.96.0",
    date: "2026-07-01",
    titre: "Dogfood header",
    highlights: [{ type: "amelioration", text: "Générateur build" }],
  },
];

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderNotes(
  props: Partial<React.ComponentProps<typeof VersionNotes>> = {},
) {
  return render(
    <VersionNotes
      latestVersion={LATEST}
      storageKey={KEY}
      releases={RELEASES}
      {...props}
    />,
  );
}

describe("VersionNotes — badge & état localStorage", () => {
  it("rend le badge .version-badge avec .version-badge--new quand jamais vu", () => {
    renderNotes();
    const badge = document.querySelector(".version-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("version-badge--new");
  });

  it("N'ajoute PAS .version-badge--new quand la version stockée == latestVersion", () => {
    localStorage.setItem(KEY, LATEST);
    renderNotes();
    expect(document.querySelector(".version-badge")).not.toHaveClass(
      "version-badge--new",
    );
  });

  it("propage className sur le badge", () => {
    renderNotes({ className: "ma-classe" });
    expect(document.querySelector(".version-badge")).toHaveClass(
      "version-badge",
      "ma-classe",
    );
  });

  it("au clic sur le badge : persiste, retire --new et ouvre la modale", async () => {
    const user = userEvent.setup();
    renderNotes();
    const badge = document.querySelector(".version-badge") as HTMLButtonElement;
    const dialog = document.querySelector(
      "dialog.version-notes-dialog",
    ) as HTMLDialogElement;
    expect(badge).toHaveClass("version-badge--new");
    expect(dialog.open).toBe(false);

    await user.click(badge);

    expect(localStorage.getItem(KEY)).toBe(LATEST);
    expect(badge).not.toHaveClass("version-badge--new");
    expect(dialog.open).toBe(true);
  });
});

describe("VersionNotes — modale", () => {
  it("rend <dialog class='version-notes-dialog'> fermé par défaut", () => {
    renderNotes();
    const dialog = document.querySelector(
      "dialog.version-notes-dialog",
    ) as HTMLDialogElement;
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass("modal-dialog", "version-notes-dialog");
    expect(dialog.open).toBe(false);
  });

  it("rend le titre .modal-title « Notes de version »", () => {
    renderNotes();
    const title = document.querySelector(".modal-title");
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent("Notes de version");
  });

  it("rend .version-notes-sub SEULEMENT si subtitle est fourni", () => {
    renderNotes({ subtitle: "Ce qui a changé récemment" });
    const sub = document.querySelector(".version-notes-sub");
    expect(sub).toBeInTheDocument();
    expect(sub).toHaveTextContent("Ce qui a changé récemment");
  });

  it("n'ajoute PAS .version-notes-sub quand subtitle est absent", () => {
    renderNotes();
    expect(
      document.querySelector(".version-notes-sub"),
    ).not.toBeInTheDocument();
  });
});

describe("VersionNotes — timeline", () => {
  it("rend un .timeline-item par release, dans l'ordre fourni", () => {
    renderNotes();
    const items = document.querySelectorAll(".timeline-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("2.97.0");
    expect(items[1]).toHaveTextContent("2.96.0");
  });

  it("pose .timeline-item--latest sur la 1re release UNIQUEMENT", () => {
    renderNotes();
    const latest = document.querySelectorAll(".timeline-item--latest");
    expect(latest).toHaveLength(1);
    expect(latest[0]).toHaveTextContent("2.97.0");
  });

  it("chaque highlight rend un chip .badge badge-* mappé par type", () => {
    renderNotes();
    expect(screen.getByText("Nouveauté")).toHaveClass("badge", "badge-success");
    expect(screen.getByText("Correction")).toHaveClass(
      "badge",
      "badge-warning",
    );
    expect(screen.getByText("Amélioration")).toHaveClass("badge", "badge-info");
  });

  it("mappe le type securite → badge-danger", () => {
    const secNext: Highlight[] = [{ type: "securite", text: "Patch CVE" }];
    renderNotes({ next: secNext });
    expect(screen.getByText("Sécurité")).toHaveClass("badge", "badge-danger");
  });

  it("rend la date via <time dateTime> avec l'ISO", () => {
    renderNotes();
    const time = document.querySelector('time[datetime="2026-07-14"]');
    expect(time).toBeInTheDocument();
  });

  it("rend un <h4> avec le titre quand titre est fourni", () => {
    renderNotes();
    const h4 = document.querySelector(".timeline-content h4");
    expect(h4).toBeInTheDocument();
    expect(h4).toHaveTextContent("Notes de version data-driven");
  });

  it("n'affiche PAS de <h4> quand titre est absent", () => {
    render(
      <VersionNotes
        latestVersion={LATEST}
        storageKey={KEY}
        releases={[
          {
            version: "2.97.0",
            date: "2026-07-14",
            highlights: [{ type: "nouveaute", text: "Sans titre" }],
          },
        ]}
      />,
    );
    expect(
      document.querySelector(".timeline-content h4"),
    ).not.toBeInTheDocument();
    // .timeline-item--latest est posée indépendamment de titre (spec #650)
    expect(document.querySelector(".timeline-item--latest")).toBeInTheDocument();
  });
});

describe("VersionNotes — à venir (next)", () => {
  it("n'affiche pas de .timeline-item--upcoming quand next est absent", () => {
    renderNotes();
    expect(
      document.querySelector(".timeline-item--upcoming"),
    ).not.toBeInTheDocument();
  });

  it("rend .timeline-item--upcoming EN TÊTE quand next est non vide", () => {
    renderNotes({
      next: [{ type: "amelioration", text: "Refonte du header" }],
    });
    const items = document.querySelectorAll(".timeline-item");
    // 1 upcoming + 2 releases
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveClass("timeline-item--upcoming");
    expect(items[0]).toHaveTextContent("À venir");
    expect(items[0]).toHaveTextContent("Refonte du header");
    // l'upcoming n'est jamais --latest
    expect(items[0]).not.toHaveClass("timeline-item--latest");
    // --latest reste posée sur la 1re RELEASE (index suivant), pas sur l'upcoming
    expect(items[1]).toHaveClass("timeline-item--latest");
    expect(items[1]).toHaveTextContent("2.97.0");
  });
});
