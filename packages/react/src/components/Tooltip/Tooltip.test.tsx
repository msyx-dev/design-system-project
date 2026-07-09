import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

afterEach(() => {
  cleanup();
});

describe("Tooltip — structure & markup canonique", () => {
  it("rend .tooltip-wrap > déclencheur + span.tooltip[role=tooltip]", () => {
    render(
      <Tooltip content="Info rapide">
        <button>Hover moi</button>
      </Tooltip>,
    );

    const wrap = document.querySelector(".tooltip-wrap");
    expect(wrap).toBeInTheDocument();

    const tip = document.querySelector(".tooltip");
    expect(tip).toBeInTheDocument();
    expect(tip?.tagName).toBe("SPAN");
    expect(tip).toHaveAttribute("role", "tooltip");
    expect(tip).toHaveTextContent("Info rapide");

    // Le déclencheur est bien présent dans le wrap
    const trigger = wrap?.querySelector("button");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Hover moi");
  });

  it("rend un contenu ReactNode riche dans le tip", () => {
    render(
      <Tooltip
        content={
          <>
            Ligne <strong>forte</strong>
          </>
        }
      >
        <button>T</button>
      </Tooltip>,
    );
    const tip = document.querySelector(".tooltip");
    expect(tip?.querySelector("strong")).toHaveTextContent("forte");
  });
});

describe("Tooltip — câblage a11y (aria-describedby / id)", () => {
  it("génère un id (useId) et câble aria-describedby du déclencheur dessus", () => {
    render(
      <Tooltip content="Info">
        <button>Trigger</button>
      </Tooltip>,
    );
    const tip = document.querySelector(".tooltip") as HTMLElement;
    const trigger = document.querySelector("button") as HTMLButtonElement;

    expect(tip.id).toBeTruthy();
    expect(trigger).toHaveAttribute("aria-describedby", tip.id);
  });

  it("respecte un id explicite", () => {
    render(
      <Tooltip content="Info" id="tt-custom">
        <button>Trigger</button>
      </Tooltip>,
    );
    expect(document.querySelector(".tooltip")).toHaveAttribute("id", "tt-custom");
    expect(document.querySelector("button")).toHaveAttribute(
      "aria-describedby",
      "tt-custom",
    );
  });

  it("préserve un aria-describedby déjà posé sur le déclencheur (fusion, pas écrasement)", () => {
    render(
      <Tooltip content="Info" id="tt-x">
        <button aria-describedby="hint-1">Trigger</button>
      </Tooltip>,
    );
    expect(document.querySelector("button")).toHaveAttribute(
      "aria-describedby",
      "hint-1 tt-x",
    );
  });

  it("préserve les props/handlers existants du déclencheur cloné (aria-label)", () => {
    render(
      <Tooltip content="Paramètres" id="tt-s">
        <button aria-label="Paramètres" className="btn-icon">
          x
        </button>
      </Tooltip>,
    );
    const trigger = document.querySelector("button") as HTMLButtonElement;
    expect(trigger).toHaveAttribute("aria-label", "Paramètres");
    expect(trigger).toHaveClass("btn-icon");
    expect(trigger).toHaveAttribute("aria-describedby", "tt-s");
  });
});

describe("Tooltip — variantes de position (classe statique)", () => {
  it("position top (défaut) = base .tooltip SANS aucune classe modifier", () => {
    render(
      <Tooltip content="Position top">
        <button>Top</button>
      </Tooltip>,
    );
    const tip = document.querySelector(".tooltip") as HTMLElement;
    expect(tip).toHaveClass("tooltip");
    expect(tip.className).toBe("tooltip");
    expect(tip).not.toHaveClass("tooltip--top");
    expect(tip).not.toHaveClass("tooltip--bottom");
    expect(tip).not.toHaveClass("tooltip--left");
    expect(tip).not.toHaveClass("tooltip--right");
  });

  it("position bottom ajoute .tooltip--bottom", () => {
    render(
      <Tooltip content="Position bottom" position="bottom">
        <button>Bottom</button>
      </Tooltip>,
    );
    expect(document.querySelector(".tooltip")).toHaveClass("tooltip--bottom");
  });

  it("position left ajoute .tooltip--left", () => {
    render(
      <Tooltip content="Position left" position="left">
        <button>Left</button>
      </Tooltip>,
    );
    expect(document.querySelector(".tooltip")).toHaveClass("tooltip--left");
  });

  it("position right ajoute .tooltip--right", () => {
    render(
      <Tooltip content="Position right" position="right">
        <button>Right</button>
      </Tooltip>,
    );
    expect(document.querySelector(".tooltip")).toHaveClass("tooltip--right");
  });
});

describe("Tooltip — className additionnelle", () => {
  it("fusionne className sur .tooltip-wrap", () => {
    render(
      <Tooltip content="Info" className="mt-2">
        <button>T</button>
      </Tooltip>,
    );
    const wrap = document.querySelector(".tooltip-wrap");
    expect(wrap).toHaveClass("tooltip-wrap");
    expect(wrap).toHaveClass("mt-2");
  });

  it("sans className, .tooltip-wrap ne porte que sa classe de base", () => {
    render(
      <Tooltip content="Info">
        <button>T</button>
      </Tooltip>,
    );
    expect((document.querySelector(".tooltip-wrap") as HTMLElement).className).toBe(
      "tooltip-wrap",
    );
  });
});
