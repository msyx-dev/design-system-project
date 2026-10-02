import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "../SiteHeader/SiteHeader";
import { ThemeSwitcher } from "../ThemeSwitcher/ThemeSwitcher";
import { FestiveDecor, FestiveSnowToggle } from "./FestiveDecor";

const KEY = "msyx-festive";
const html = document.documentElement;

function setTheme(theme: string | null) {
  if (theme === null) html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", theme);
}

beforeEach(() => {
  window.localStorage.clear();
  setTheme("noel");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setTheme(null);
  html.removeAttribute("data-mode");
  window.localStorage.clear();
});

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(path.resolve(here, rel), "utf8");
/** Source SANS commentaires : les en-têtes expliquent les pièges en citant ce qu'ils interdisent. */
const readCode = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("FestiveDecor — rendu conditionné au thème Noël", () => {
  it.each([null, "msyx", "acssi", "nhood", "auchan"])(
    "ne rend RIEN pour data-theme=%s (décor ni bouton)",
    (theme) => {
      setTheme(theme);
      const { container } = render(
        <>
          <FestiveDecor />
          <FestiveSnowToggle />
        </>,
      );
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("rend guirlande (14 ampoules), 7 ornements, givre, sapin et neige sous noel", () => {
    const { container } = render(<FestiveDecor />);
    expect(container.querySelector(".snowfall")).not.toBeNull();
    expect(
      container.querySelectorAll(".garland.garland--header .garland-bulb"),
    ).toHaveLength(14);
    expect(container.querySelectorAll(".ornaments .ornament")).toHaveLength(7);
    expect(container.querySelector(".frost")).not.toBeNull();
    expect(container.querySelector(".festive-character svg")).not.toBeNull();
  });

  it("couleurs d'ornements = tokens du thème, jamais de valeur en dur", () => {
    const { container } = render(<FestiveDecor />);
    const colors = [
      ...container.querySelectorAll<HTMLElement>(".ornament"),
    ].map((el) => el.style.getPropertyValue("--ornament-color"));
    expect(colors).toHaveLength(7);
    colors.forEach((c) => expect(c).toMatch(/^var\(--[a-z-]+\)$/));
    expect(new Set(colors).size).toBe(6);
  });

  it("aria-hidden=true sur TOUT le décor, et aucun nœud DOM par flocon", () => {
    const { container } = render(<FestiveDecor />);
    const layers = [...container.children];
    expect(layers.length).toBeGreaterThanOrEqual(5);
    layers.forEach((layer) =>
      expect(layer).toHaveAttribute("aria-hidden", "true"),
    );
    expect(container.querySelector(".snowfall")?.children).toHaveLength(0);
  });

  it("réagit EN DIRECT au changement de thème posé par le ThemeSwitcher (sans rechargement)", async () => {
    setTheme(null);
    const user = userEvent.setup();
    const { container } = render(
      <>
        <ThemeSwitcher />
        <FestiveDecor />
      </>,
    );
    expect(container.querySelector(".garland")).toBeNull();
    await user.selectOptions(screen.getByRole("combobox"), "noel");
    expect(await screen.findByRole("combobox")).toHaveValue("noel");
    expect(container.querySelector(".garland")).not.toBeNull();
    await user.selectOptions(screen.getByRole("combobox"), "acssi");
    expect(container.querySelector(".garland")).toBeNull();
    expect(container.querySelector(".festive-character")).toBeNull();
  });

  it("réagit aussi à un data-theme posé directement sur <html> (consommateur, script anti-FOUC)", async () => {
    setTheme("msyx");
    const { container } = render(<FestiveDecor />);
    expect(container).toBeEmptyDOMElement();
    await act(async () => setTheme("noel"));
    expect(container.querySelector(".garland")).not.toBeNull();
    await act(async () => setTheme("nhood"));
    expect(container).toBeEmptyDOMElement();
  });

  it("n'écrit PAS data-theme (lecture seule) : un noel fixe survit à un msyx-theme périmé", () => {
    window.localStorage.setItem("msyx-theme", "msyx");
    render(<FestiveDecor />);
    expect(html.getAttribute("data-theme")).toBe("noel");
  });

  it("snow={false} : décor statique seulement, aucune neige", () => {
    const { container } = render(<FestiveDecor snow={false} />);
    expect(container.querySelector(".snowfall")).toBeNull();
    expect(container.querySelector(".garland")).not.toBeNull();
  });

  it("n'a aucun axe violation (décor + bouton)", async () => {
    const { container } = render(
      <>
        <FestiveSnowToggle />
        <FestiveDecor />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Piège 1 — glyphe snowflake reporté dans <Icon>, jamais <use href> vers le sprite", () => {
  it("le bouton flocon inline le glyphe (12 paths) et n'émet aucun <use>", () => {
    const { container } = render(<FestiveSnowToggle />);
    const svg = container.querySelector('svg[data-icon="snowflake"]');
    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll("path")).toHaveLength(12);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("use")).toBeNull();
  });

  it("aucun <use> ni chemin absolu vers le sprite dans tout le décor", () => {
    const { container } = render(
      <>
        <FestiveSnowToggle />
        <FestiveDecor />
      </>,
    );
    expect(container.querySelector("use")).toBeNull();
    expect(container.innerHTML).not.toContain("sprite.svg");
    expect(readCode("./FestiveDecor.tsx")).not.toMatch(/<use\b/);
    expect(readCode("./TreeNoel.tsx")).not.toMatch(/<use\b/);
  });
});

describe("Piège 2 — le sapin est du SVG inline en JSX natif", () => {
  it("un <svg> inline dans le DOM, aucun <img>, aucun <object>", () => {
    const { container } = render(<FestiveDecor />);
    const tree = container.querySelector(".festive-character");
    expect(tree?.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img, object, embed")).toBeNull();
  });

  it('le <svg> du sapin ne porte pas height="auto" (ni aucune longueur invalide) — #993', () => {
    const { container } = render(<FestiveDecor />);
    const svg = container.querySelector(".festive-character svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("height")).not.toBe("auto");
    // Longueur SVG valide : absent (le viewBox donne le ratio) ou nombre + unité.
    for (const attr of ["width", "height"]) {
      const value = svg?.getAttribute(attr) ?? null;
      expect(value === null || /^\d+(\.\d+)?(px|em|rem|%)?$/.test(value)).toBe(
        true,
      );
    }
  });

  it("11 lumières .tree-lights peintes par les tokens du thème (donc thémables/animables par le CSS)", () => {
    const { container } = render(<FestiveDecor />);
    const lights = container.querySelectorAll(".tree-lights circle");
    expect(lights).toHaveLength(11);
    lights.forEach((c) =>
      expect(c.getAttribute("fill")).toMatch(
        /^var\(--[a-z-]+, #[0-9a-f]{6}\)$/,
      ),
    );
  });

  it("aucun dangerouslySetInnerHTML : JSX natif (recul par rapport au vanilla sinon)", () => {
    expect(read("./FestiveDecor.tsx")).not.toMatch(
      /dangerouslySetInnerHTML\s*[=:]/,
    );
    expect(read("./TreeNoel.tsx")).not.toMatch(
      /dangerouslySetInnerHTML\s*[=:]/,
    );
  });
});

describe("Piège 3 — id SVG préfixés par useId(), deux instances distinctes", () => {
  it("deux <FestiveDecor> montés ensemble : aucun id en commun, chaque url(#…) pointe dans SON svg", () => {
    const { container } = render(
      <>
        <FestiveDecor />
        <FestiveDecor />
      </>,
    );
    const svgs = [...container.querySelectorAll("svg")].filter((s) =>
      s.closest(".festive-character"),
    );
    expect(svgs).toHaveLength(2);

    const idsOf = (svg: SVGElement) =>
      [...svg.querySelectorAll("[id]")].map((el) => el.id);
    const [a, b] = svgs.map(idsOf);
    expect(a).toHaveLength(4);
    expect(b).toHaveLength(4);
    expect(a.filter((id) => b.includes(id))).toEqual([]);

    // unicité dans TOUT le document
    const all = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(all).size).toBe(all.length);

    svgs.forEach((svg) => {
      const own = new Set(idsOf(svg));
      const refs = [...svg.querySelectorAll("*")]
        .map((el) => el.getAttribute("fill")?.match(/^url\(#(.+)\)$/)?.[1])
        .filter((id): id is string => Boolean(id));
      expect(refs.length).toBeGreaterThan(10);
      refs.forEach((id) => expect(own.has(id)).toBe(true));
    });
  });

  it("les id restent des identifiants sûrs pour url(#…) (pas de ':' de useId)", () => {
    const { container } = render(<FestiveDecor />);
    [...container.querySelectorAll("svg [id]")].forEach((el) =>
      expect(el.id).toMatch(/^[A-Za-z][A-Za-z0-9_-]*$/),
    );
  });
});

describe("Piège 4 — msyx-festive : seule la valeur littérale 'off' coupe la neige (parité nav.js)", () => {
  it.each([
    [null, true],
    ["on", true],
    ["off", false],
    ["OFF", true],
    ["false", true],
    ["0", true],
    ["", true],
  ])("clé = %j → neige visible : %s", (value, visible) => {
    if (value !== null) window.localStorage.setItem(KEY, value);
    const { container } = render(<FestiveDecor />);
    expect(container.querySelector(".snowfall") !== null).toBe(visible);
    // les éléments statiques ne dépendent JAMAIS de la clé
    expect(container.querySelector(".garland")).not.toBeNull();
    expect(container.querySelector(".festive-character")).not.toBeNull();
  });

  it("localStorage.getItem qui lève : neige ON par défaut, pas de crash", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { container } = render(
      <>
        <FestiveSnowToggle />
        <FestiveDecor />
      </>,
    );
    expect(container.querySelector(".snowfall")).not.toBeNull();
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("le clic écrit 'off' puis 'on' (comme nav.js), jamais autre chose", () => {
    render(<FestiveSnowToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(window.localStorage.getItem(KEY)).toBe("off");
    fireEvent.click(screen.getByRole("button"));
    expect(window.localStorage.getItem(KEY)).toBe("on");
  });

  it("localStorage.setItem qui lève : le bouton fonctionne quand même (WCAG 2.2.2)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { container } = render(
      <>
        <FestiveSnowToggle />
        <FestiveDecor />
      </>,
    );
    expect(container.querySelector(".snowfall")).not.toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(container.querySelector(".snowfall")).toBeNull();
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    // repli mémoire : on rend la main au storage (même module, tests suivants)
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
  });

  it("parité avec la référence : nav.js lit toujours getItem('msyx-festive') === 'off'", () => {
    const nav = readFileSync(
      path.resolve(here, "../../../../../shared/nav.js"),
      "utf8",
    );
    expect(nav).toMatch(/localStorage\.getItem\('msyx-festive'\) === 'off'/);
    expect(nav).not.toMatch(/localStorage\.getItem\('msyx-festive'\) === 'on'/);
  });
});

describe("Bouton flocon — aria-pressed + aria-label (WCAG 2.2.2)", () => {
  it("neige active : pressed=true, « Arrêter la neige »", () => {
    render(<FestiveSnowToggle />);
    const btn = screen.getByRole("button", { name: "Arrêter la neige" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveClass("header-notification");
  });

  it("clic : neige coupée, pressed=false, « Faire tomber la neige » ; re-clic : reprend", () => {
    const { container } = render(
      <>
        <FestiveSnowToggle />
        <FestiveDecor />
      </>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(container.querySelector(".snowfall")).toBeNull();
    const btn = screen.getByRole("button", { name: "Faire tomber la neige" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(container.querySelector(".snowfall")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Arrêter la neige" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("état déjà 'off' au montage : bouton pressed=false", () => {
    window.localStorage.setItem(KEY, "off");
    render(<FestiveSnowToggle />);
    expect(
      screen.getByRole("button", { name: "Faire tomber la neige" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

describe("SiteHeader — slot festif", () => {
  it("festive : bouton flocon dans .header-user-zone, décor FRÈRE du <header> (pas enfant : backdrop-filter)", () => {
    const { container } = render(<SiteHeader festive identity={null} />);
    const header = container.querySelector("header.site-header");
    expect(header).not.toBeNull();
    expect(
      header?.querySelector(".header-user-zone button[aria-pressed]"),
    ).not.toBeNull();
    // le décor est rendu, mais HORS du header
    expect(container.querySelector(".garland")).not.toBeNull();
    expect(
      header?.querySelector(
        ".garland, .ornaments, .snowfall, .frost, .festive-character",
      ),
    ).toBeNull();
    expect(header?.parentElement).toBe(container);
  });

  it("sans la prop festive : rien de festif, même sous noel", () => {
    const { container } = render(<SiteHeader identity={null} />);
    expect(
      container.querySelector(".garland, .snowfall, .ornaments"),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /neige/i })).toBeNull();
  });

  it("festive hors noel : rien de festif", () => {
    setTheme("acssi");
    const { container } = render(<SiteHeader festive identity={null} />);
    expect(container.querySelector(".garland, .snowfall")).toBeNull();
    expect(screen.queryByRole("button", { name: /neige/i })).toBeNull();
  });
});
