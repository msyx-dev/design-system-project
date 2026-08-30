import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Icon, IconName } from "./Icon";

afterEach(cleanup);

const ALL_NAMES: IconName[] = [
  "chevron-left",
  "chevron-right",
  "chevron-down",
  "check",
  "upload",
  "file",
  "folder",
  "eye",
  "eye-off",
  "message-circle",
  "sun",
  "moon",
  "bell",
  "search",
  "layers",
  "home",
  "square-check",
  "alert-triangle",
  "clock",
  "edit",
  "info",
  "settings",
];

describe("Icon — primitif inline auto-contenu (#713)", () => {
  it("rend un <svg class='icon' viewBox='0 0 24 24' data-icon> par défaut", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("icon");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("data-icon", "check");
  });

  it("inline les paths du glyphe et n'émet JAMAIS de <use>", () => {
    const { container } = render(<Icon name="check" aria-hidden="true" />);
    expect(container.querySelector("path")).not.toBeNull();
    expect(container.querySelector("use")).toBeNull();
  });

  it("pose fill=none/stroke=currentColor en attributs (auto-contenu)", () => {
    const { container } = render(<Icon name="sun" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
  });

  it("surcharge className (ex. mode-switch-icon) sans perdre le glyphe", () => {
    const { container } = render(
      <Icon name="sun" className="mode-switch-icon mode-switch-icon--sun" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("mode-switch-icon");
    expect(svg).not.toHaveClass("icon");
    expect(svg?.querySelector("path")).not.toBeNull();
  });

  it("passe-plat aria-hidden / width / height", () => {
    const { container } = render(
      <Icon name="file" aria-hidden="true" width={18} height={18} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "18");
  });

  it("chaque glyphe (13) rend au moins un enfant SVG, sans <use>", () => {
    ALL_NAMES.forEach((name) => {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector(`svg[data-icon="${name}"]`);
      expect(svg?.querySelector("path, circle")).not.toBeNull();
      expect(svg?.querySelector("use")).toBeNull();
      unmount();
    });
  });

  it("rend le glyphe bell (2 paths, sans <use>)", () => {
    const { container } = render(<Icon name="bell" />);
    const svg = container.querySelector('svg[data-icon="bell"]');
    expect(svg?.querySelectorAll("path").length).toBe(2);
    expect(container.querySelector("use")).toBeNull();
  });

  it("rend le glyphe chevron-down (#600 — caret du SplitButton, 1 path, sans <use>)", () => {
    const { container } = render(<Icon name="chevron-down" />);
    const svg = container.querySelector('svg[data-icon="chevron-down"]');
    const paths = svg?.querySelectorAll("path");
    expect(paths?.length).toBe(1);
    // Copie fidèle de shared/icons/sprite.svg:8 (symbol i-chevron-down).
    expect(paths?.[0]).toHaveAttribute("d", "m6 9 6 6 6-6");
    expect(container.querySelector("use")).toBeNull();
  });
});

// --- Garde-fou anti-divergence (#921) ---------------------------------------
//
// <Icon> n'utilise PAS <use> : il INLINE une copie des tracés du sprite. Deux
// dérives sont donc possibles, et aucune ne se voit à la compilation :
//   1. un nom typé dans `IconName` sans entrée dans `ICON_CHILDREN` -> carré
//      vide en production ;
//   2. un tracé recopié qui s'écarte du sprite -> l'icône React et l'icône
//      vanilla ne dessinent plus la même chose.
// Le critère d'acceptation de l'issue demandait un « <use> résolu dans le
// sprite » ; ça ne correspond pas à l'implémentation. On vérifie donc plus
// fort : chaque glyphe rendu est comparé, attribut par attribut, au <symbol>
// correspondant du VRAI sprite.
const __dirname_ = path.dirname(fileURLToPath(import.meta.url));
const SPRITE = readFileSync(
  path.resolve(__dirname_, "../../../../shared/icons/sprite.svg"),
  "utf8",
);
const ICON_SOURCE = readFileSync(
  path.resolve(__dirname_, "./Icon.tsx"),
  "utf8",
);

/** Signature d'un glyphe : la suite de ses formes et de leurs attributs géométriques, normalisée. */
function shapesOf(markup: string): string[] {
  const shapes: string[] = [];
  const re = /<(path|circle|rect|line|polyline|polygon)\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markup)) !== null) {
    const attrs = [...m[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)]
      .filter(([, key]) => key !== "className" && key !== "class")
      .map(([, key, val]) => `${key}=${val.replace(/\s+/g, " ").trim()}`)
      .sort()
      .join(" ");
    shapes.push(`${m[1]} ${attrs}`);
  }
  return shapes;
}

describe("Icon — fidélité au sprite (#921)", () => {
  it("ALL_NAMES couvre exactement les clés de ICON_CHILDREN (le test ne peut pas dériver en silence)", () => {
    const body = ICON_SOURCE.slice(
      ICON_SOURCE.indexOf("const ICON_CHILDREN"),
      ICON_SOURCE.indexOf("\n};", ICON_SOURCE.indexOf("const ICON_CHILDREN")),
    );
    const keys = [...body.matchAll(/^ {2}"?([a-z-]+)"?:/gm)].map((m) => m[1]);
    expect([...keys].sort()).toEqual([...ALL_NAMES].sort());
  });

  it.each(ALL_NAMES)("%s dessine exactement le glyphe du sprite", (name) => {
    const symbol = new RegExp(
      `<symbol id="i-${name}"[^>]*>([\\s\\S]*?)</symbol>`,
    ).exec(SPRITE);
    // Un nom exposé par <Icon> DOIT exister dans le sprite : sinon les deux
    // technos ne montrent pas la même icône.
    expect(symbol, `glyphe i-${name} absent du sprite`).not.toBeNull();

    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector(`svg[data-icon="${name}"]`);
    expect(svg).not.toBeNull();
    expect(shapesOf(svg!.innerHTML)).toEqual(shapesOf(symbol![1]));
  });
});
