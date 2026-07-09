import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { VersionBadge } from "./VersionBadge";

const VERSION = "2.95.0";
const KEY = "ds-test-version-seen";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("VersionBadge — structure", () => {
  it("rend un <button class='version-badge'> avec la pastille .version-badge-dot (aria-hidden)", () => {
    render(<VersionBadge version={VERSION} storageKey={KEY} />);

    const badge = document.querySelector(".version-badge");
    expect(badge).toBeInTheDocument();
    expect(badge?.tagName).toBe("BUTTON");
    expect(badge).toHaveAttribute("type", "button");

    const dot = document.querySelector(".version-badge-dot");
    expect(dot).toBeInTheDocument();
    expect(dot?.tagName).toBe("SPAN");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("label par défaut = `v${version}` quand aucun children", () => {
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    expect(document.querySelector(".version-badge")).toHaveTextContent("v2.95.0");
  });

  it("children remplace le label visible", () => {
    render(
      <VersionBadge version={VERSION} storageKey={KEY}>
        Quoi de neuf
      </VersionBadge>,
    );
    expect(document.querySelector(".version-badge")).toHaveTextContent(
      "Quoi de neuf",
    );
  });

  it("propage className et les attributs bouton restants", () => {
    render(
      <VersionBadge
        version={VERSION}
        storageKey={KEY}
        className="ma-classe"
        data-modal-trigger="vn-modal"
      />,
    );
    const badge = document.querySelector(".version-badge");
    expect(badge).toHaveClass("version-badge", "ma-classe");
    expect(badge).toHaveAttribute("data-modal-trigger", "vn-modal");
  });
});

describe("VersionBadge — état .version-badge--new (pastille nouveau)", () => {
  it("pose .version-badge--new quand storageKey est vide (jamais vu)", () => {
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    expect(document.querySelector(".version-badge")).toHaveClass(
      "version-badge--new",
    );
  });

  it("pose .version-badge--new quand la version stockée diffère", () => {
    localStorage.setItem(KEY, "2.90.0");
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    expect(document.querySelector(".version-badge")).toHaveClass(
      "version-badge--new",
    );
  });

  it("N'ajoute PAS .version-badge--new quand la version stockée == version courante", () => {
    localStorage.setItem(KEY, VERSION);
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    expect(document.querySelector(".version-badge")).not.toHaveClass(
      "version-badge--new",
    );
  });

  it("recalcule l'état quand la prop version change (nouvelle release montée)", () => {
    localStorage.setItem(KEY, VERSION);
    const { rerender } = render(
      <VersionBadge version={VERSION} storageKey={KEY} />,
    );
    expect(document.querySelector(".version-badge")).not.toHaveClass(
      "version-badge--new",
    );

    rerender(<VersionBadge version="2.96.0" storageKey={KEY} />);
    expect(document.querySelector(".version-badge")).toHaveClass(
      "version-badge--new",
    );
  });
});

describe("VersionBadge — clic (persistance + reset état)", () => {
  it("au clic : persiste la version dans localStorage, retire .version-badge--new, appelle onOpen", () => {
    const onOpen = vi.fn();
    render(<VersionBadge version={VERSION} storageKey={KEY} onOpen={onOpen} />);

    const badge = document.querySelector(".version-badge") as HTMLButtonElement;
    expect(badge).toHaveClass("version-badge--new");

    fireEvent.click(badge);

    expect(localStorage.getItem(KEY)).toBe(VERSION);
    expect(badge).not.toHaveClass("version-badge--new");
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("le composant reste utilisable sans onOpen (pas de crash au clic)", () => {
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    const badge = document.querySelector(".version-badge") as HTMLButtonElement;
    expect(() => fireEvent.click(badge)).not.toThrow();
    expect(localStorage.getItem(KEY)).toBe(VERSION);
  });
});

describe("VersionBadge — aria-label", () => {
  it("aria-label par défaut = `Notes de version, v${version}` quand déjà vu", () => {
    localStorage.setItem(KEY, VERSION);
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    expect(document.querySelector(".version-badge")).toHaveAttribute(
      "aria-label",
      "Notes de version, v2.95.0",
    );
  });

  it("aria-label augmenté de ', nouveautés disponibles' quand la pastille est active", () => {
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    expect(document.querySelector(".version-badge")).toHaveAttribute(
      "aria-label",
      "Notes de version, v2.95.0, nouveautés disponibles",
    );
  });

  it("réinitialise l'aria-label à la base après le clic", () => {
    render(<VersionBadge version={VERSION} storageKey={KEY} />);
    const badge = document.querySelector(".version-badge") as HTMLButtonElement;
    expect(badge).toHaveAttribute(
      "aria-label",
      "Notes de version, v2.95.0, nouveautés disponibles",
    );

    fireEvent.click(badge);

    expect(badge).toHaveAttribute("aria-label", "Notes de version, v2.95.0");
  });

  it("utilise ariaLabel personnalisé comme base et l'augmente quand nouveau", () => {
    render(
      <VersionBadge
        version={VERSION}
        storageKey={KEY}
        ariaLabel="Voir les notes"
      />,
    );
    expect(document.querySelector(".version-badge")).toHaveAttribute(
      "aria-label",
      "Voir les notes, nouveautés disponibles",
    );
  });

  it("garde indexOf('nouveaut') : ne double-concatène pas si la base contient déjà 'nouveaut'", () => {
    render(
      <VersionBadge
        version={VERSION}
        storageKey={KEY}
        ariaLabel="Voir les nouveautés"
      />,
    );
    expect(document.querySelector(".version-badge")).toHaveAttribute(
      "aria-label",
      "Voir les nouveautés",
    );
  });
});
