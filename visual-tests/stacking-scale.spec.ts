/**
 * stacking-scale.spec.ts — L'echelle d'empilement SERVIE est celle de la doctrine (#1043).
 *
 * Defaut : `tokens.css` declarait l'echelle deux fois dans le MEME `:root`. Le bloc
 * doctrinal (#932) posait `--z-sticky: 150` et `--z-modal: 1000`, puis un ancien bloc
 * « Z-index scale » les redeclarait a 100 et 800 — et la derniere declaration gagne.
 * Le tableau §12.1 de docs/DS-PRINCIPLES.md etait donc faux sur deux valeurs, sans
 * qu'aucun controle ne le voie : une lecture du fichier montre 150, le navigateur sert 100.
 *
 * Pourquoi un vrai navigateur : seule la cascade calculee dit quelle declaration gagne.
 * Le test lit `getComputedStyle(document.documentElement)` et le confronte au tableau
 * §12.1, lu dans le Markdown lui-meme (la doc et le CSS ne peuvent plus diverger).
 *
 * Trois gardes :
 *  1. chaque jeton du tableau §12.1 a la valeur servie annoncee (non-vacuite : le
 *     tableau lu contient au moins les 9 jetons de #932, dont --z-sticky et --z-modal) ;
 *  2. `.site-header` passe STRICTEMENT au-dessus de --z-sticky, et de tout ce qui y est
 *     range (guirlande, ornements). L'en-tete forme un contexte d'empilement : ses menus
 *     sont plafonnes a sa valeur. A egalite, ce qui suit dans le DOM est peint dessus ;
 *  3. le sapin (`.festive-character`) est range sous `--z-decor-behind`, negatif (#1043).
 *
 * Limite : les gardes 2 et 3 comparent des z-index calcules. Elles valent parce que
 * l'en-tete, la guirlande, les ornements et le sapin sont tous dans le contexte
 * d'empilement racine (enfants de <body>, aucun ancetre ne cree de contexte). L'ordre
 * de PEINTURE reel du sapin sous le contenu est mesure par festive-under-content.spec.ts.
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : le theme est pose par le test.
 *
 * Preuve par mutation (jouee a l'ecriture, #1043) :
 *  - `--z-sticky: 100;` remis dans l'ancien bloc de tokens.css -> garde 1 rouge ;
 *  - `--z-modal: 800;` remis -> garde 1 rouge ;
 *  - `.site-header { z-index: 150 }` (layout.css) -> garde 2 rouge ;
 *  - `.festive-character { z-index: var(--z-decor) }` (festive.css) -> garde 3 rouge.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/festive-clearance-1005.html";

/** Lit le tableau des jetons de DS-PRINCIPLES §12.1 : [jeton, valeur]. */
function doctrinalScale(): Array<[string, number]> {
  const md = fs.readFileSync(
    path.resolve(__dirname, "..", "docs", "DS-PRINCIPLES.md"),
    "utf8",
  );
  const start = md.indexOf("### 12.1");
  expect(
    start,
    "section §12.1 introuvable dans DS-PRINCIPLES.md",
  ).toBeGreaterThan(-1);
  const end = md.indexOf("\n### ", start + 1);
  const section = md.slice(start, end === -1 ? undefined : end);
  const rows: Array<[string, number]> = [];
  // `| `--z-sticky` | 150 | …`, gras toleres (`| **`--z-floating`** | **2000** | …`).
  const re = /^\|\s*\**`(--z-[a-z-]+)`\**\s*\|\s*\**(-?\d+)\**\s*\|/gm;
  for (const m of section.matchAll(re)) rows.push([m[1], Number(m[2])]);
  return rows;
}

async function openPage(page: Page, theme: string) {
  await page.addInitScript((t: string) => {
    try {
      localStorage.setItem("msyx-theme", t);
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  }, theme);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(FIXTURE);
  await page.waitForLoadState("networkidle");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.getAttribute("data-theme") ?? "msyx",
      ),
    )
    .toBe(theme);
}

/** Valeur calculee d'un jeton sur :root (chaine brute, espaces retires). */
function rootToken(page: Page, name: string) {
  return page.evaluate(
    (n) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
}

/** z-index calcule d'un element (chaine : "auto" ou un entier). */
function zIndexOf(page: Page, selector: string) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el).zIndex : null;
  }, selector);
}

test.describe("Echelle d'empilement servie = doctrine §12.1 (#1043)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `joue une seule fois, dans ${PROJECT}`,
    );
  });

  for (const theme of ["msyx", "noel"]) {
    test(`chaque jeton de §12.1 a la valeur servie annoncee (${theme})`, async ({
      page,
    }) => {
      const scale = doctrinalScale();
      const names = scale.map(([n]) => n);
      // Non-vacuite : le tableau lu n'est pas vide, et porte les deux jetons en cause.
      expect(scale.length).toBeGreaterThanOrEqual(9);
      expect(names).toContain("--z-sticky");
      expect(names).toContain("--z-modal");
      await openPage(page, theme);
      const served: Record<string, string> = {};
      for (const [name] of scale) served[name] = await rootToken(page, name);
      const expected = Object.fromEntries(
        scale.map(([n, v]) => [n, String(v)]),
      );
      expect(served).toEqual(expected);
    });
  }

  test("l'en-tete passe strictement au-dessus de --z-sticky et de ce qui y est range", async ({
    page,
  }) => {
    await openPage(page, "noel");
    const sticky = Number(await rootToken(page, "--z-sticky"));
    expect(Number.isFinite(sticky)).toBe(true);
    const header = await zIndexOf(page, ".site-header");
    expect(header, ".site-header absent ou sans z-index").not.toBeNull();
    expect(Number(header)).toBeGreaterThan(sticky);
    // Les couches du decor rangees en --z-sticky existent (non-vacuite) et restent dessous.
    for (const sel of [".garland--header", ".ornaments"]) {
      const z = await zIndexOf(page, sel);
      expect(z, `${sel} absent du decor Noel`).not.toBeNull();
      expect(Number(z), `${sel} doit rester sous .site-header`).toBeLessThan(
        Number(header),
      );
    }
  });

  test("le sapin est range sous --z-decor-behind, negatif", async ({
    page,
  }) => {
    await openPage(page, "noel");
    const behind = await rootToken(page, "--z-decor-behind");
    expect(Number(behind)).toBeLessThan(0);
    const tree = await zIndexOf(page, ".festive-character");
    expect(tree, "sapin absent du decor Noel").not.toBeNull();
    expect(tree).toBe(behind);
  });
});
/* ===================================================================================
 * #1043, tranche t2 — les z-index LITTERAUX hors doctrine sont ranges dans l'echelle.
 *
 * Contexte : le retrait de la redeclaration (t1) sert --z-sticky a 150 au lieu de 100.
 * Dix surfaces posees en litteral (99, 100, 120, 200, 50) passaient alors SOUS les couches
 * --z-sticky (guirlande, ornements, .section-header--sticky). Elles sont rangees a leur
 * place doctrinale (§12.1). Une seule s'ecarte du tableau de l'amendement n°2 :
 * `.sidebar` / `.rail-sidebar--fixed` en colonne d'app-shell (> 768 px) restent en
 * --z-sticky — en --z-surface-panel (201), la colonne serait peinte PAR-DESSUS le voile
 * d'un drawer plein ecran (--z-surface, 200), donc nette et cliquable derriere lui.
 * Le panneau mobile (<= 768 px) passe bien en --z-surface-panel.
 *
 * Mesure : `document.elementsFromPoint` (ordre de peinture reel, jamais jsdom), aux points
 * ou les deux boites se chevauchent. Non-vacuite : le perdant est bien SOUS le point.
 * La guirlande est `pointer-events: none` : le hit-test l'ignorerait, on la rend
 * temporairement cliquable par une feuille injectee, le temps de la mesure.
 *
 * Preuve par mutation (jouee a l'ecriture, t2) : voir le corps de la PR.
 * =================================================================================== */

/** Sieges des z-index litteraux >= 50 toleres : `fichier relatif a shared/css` -> raison.
 *  Vide : toute surface vit sur un jeton de §12.1. Une entree ajoutee ici se justifie. */
const LITERAL_EXCEPTIONS: Record<string, string> = {};

/** z-index entiers >= 50 d'une feuille, commentaires retires (lignes conservees). */
function literalZ(css: string): Array<{ line: number; value: number }> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  const out: Array<{ line: number; value: number }> = [];
  for (const m of clean.matchAll(/z-index\s*:\s*([^;}!]+)/g)) {
    const v = m[1].trim();
    if (!/^-?\d+$/.test(v) || Number(v) < 50) continue;
    out.push({
      line: clean.slice(0, m.index).split("\n").length,
      value: Number(v),
    });
  }
  return out;
}

function cssFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return cssFiles(p);
    return e.name.endsWith(".css") ? [p] : [];
  });
}

const PE_DECOR =
  ".garland--header, .garland--header * { pointer-events: auto !important; }";

type Pt = { x: number; y: number };

/** Trois points au coeur de l'intersection de deux boites, bornee a la fenetre ; [] si vide. */
function overlapPoints(page: Page, a: string, b: string): Promise<Pt[]> {
  return page.evaluate(
    ([a, b]) => {
      const ea = document.querySelector(a);
      const eb = document.querySelector(b);
      if (!ea || !eb) return [];
      const ra = ea.getBoundingClientRect();
      const rb = eb.getBoundingClientRect();
      const l = Math.max(ra.left, rb.left, 0);
      const r = Math.min(ra.right, rb.right, innerWidth);
      const t = Math.max(ra.top, rb.top, 0);
      const btm = Math.min(ra.bottom, rb.bottom, innerHeight);
      if (r - l < 4 || btm - t < 4) return [];
      const y = Math.round((t + btm) / 2);
      return [0.25, 0.5, 0.75].map((f) => ({
        x: Math.round(l + (r - l) * f),
        y,
      }));
    },
    [a, b],
  );
}

/** Dans la pile `elementsFromPoint`, le premier element de `winner` precede celui de `loser`. */
async function expectAbove(
  page: Page,
  winner: string,
  loser: string,
  pts: Pt[],
  label: string,
) {
  expect(
    pts.length,
    `${label} : ${winner} et ${loser} ne se chevauchent pas — mesure vide`,
  ).toBeGreaterThan(0);
  for (const p of pts) {
    const [w, l] = await page.evaluate(
      ({ p, sels }) => {
        const stack = document.elementsFromPoint(p.x, p.y);
        return sels.map((s) => stack.findIndex((el) => el.closest(s) !== null));
      },
      { p, sels: [winner, loser] },
    );
    expect(
      l,
      `${label} : ${loser} absent sous (${p.x},${p.y})`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      w,
      `${label} : ${winner} absent sous (${p.x},${p.y})`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      w,
      `${label} : ${loser} peint AU-DESSUS de ${winner} en (${p.x},${p.y})`,
    ).toBeLessThan(l);
  }
}

/** Pose un `.section-header--sticky` en tete de `hostSel` (et un split-button ouvert juste avant). */
function injectSticky(
  page: Page,
  hostSel: string,
  id: string,
  withSplit = false,
) {
  return page.evaluate(
    ({ hostSel, id, withSplit }) => {
      const host = document.querySelector(hostSel);
      if (!host) throw new Error(`hote ${hostSel} absent`);
      const mk = (tag: string, cls: string, text = "") => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text) n.textContent = text;
        return n;
      };
      const sec = mk("section", "section-header section-header--sticky");
      sec.id = id;
      sec.append(
        mk("p", "overline", "Pile"),
        mk("h2", "", "En-tete colle de test"),
      );
      host.prepend(sec);
      if (withSplit) {
        const wrap = mk("div", "split-button");
        wrap.id = "t-split";
        const menu = mk("div", "split-button__menu menu open");
        menu.id = "t-split-menu";
        for (const t of ["Dupliquer", "Archiver", "Exporter", "Supprimer"])
          menu.append(mk("button", "menu-item", t));
        wrap.append(
          mk("button", "btn btn-primary", "Enregistrer"),
          mk("button", "btn btn-primary", "v"),
          menu,
        );
        host.prepend(wrap);
      }
    },
    { hostSel, id, withSplit },
  );
}

function injectRail(page: Page, open: boolean) {
  return page.evaluate((open) => {
    const rail = document.createElement("nav");
    rail.className = "rail-sidebar rail-sidebar--fixed" + (open ? " open" : "");
    rail.id = "t-rail";
    rail.setAttribute("aria-label", "Rail de test");
    rail.textContent = "Rail";
    document.body.prepend(rail);
    if (open) {
      const ovl = document.createElement("div");
      ovl.className = "rail-overlay active";
      document.body.append(ovl);
    }
  }, open);
}

async function openThemed(
  page: Page,
  url: string,
  vp: { width: number; height: number },
  header?: object,
) {
  await page.setViewportSize(vp);
  await page.addInitScript((h) => {
    try {
      localStorage.setItem("msyx-theme", "noel");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
    if (h) (window as unknown as { MSYX_HEADER: object }).MSYX_HEADER = h;
  }, header ?? null);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".garland--header")).toHaveCount(1);
  await page.addStyleTag({ content: PE_DECOR });
}

const leftOf = (page: Page, sel: string) =>
  page.evaluate(
    (s) => Math.round(document.querySelector(s)!.getBoundingClientRect().left),
    sel,
  );

test.describe("z-index litteraux ranges dans la doctrine §12.1 (#1043, t2)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `joue une seule fois, dans ${PROJECT}`,
    );
  });

  test("garde statique : aucun z-index litteral >= 50 dans shared/css hors exceptions", () => {
    // Auto-test du detecteur : un litteral compte ; un commentaire, un jeton et 49 non.
    expect(
      literalZ(
        ".a{z-index: 100;} /* z-index: 999 */ .b{z-index:var(--z-floating)} .c{z-index:49}",
      ),
    ).toEqual([{ line: 1, value: 100 }]);
    const root = path.resolve(__dirname, "..", "shared", "css");
    const files = cssFiles(root);
    expect(files.length, "shared/css lu vide").toBeGreaterThan(20);
    let declarations = 0;
    const offenders: string[] = [];
    for (const f of files) {
      const css = fs.readFileSync(f, "utf8");
      declarations += (css.match(/z-index\s*:/g) ?? []).length;
      const rel = path.relative(root, f);
      for (const { line, value } of literalZ(css))
        if (!(rel in LITERAL_EXCEPTIONS))
          offenders.push(`${rel}:${line} z-index: ${value}`);
    }
    expect(
      declarations,
      "trop peu de declarations z-index lues",
    ).toBeGreaterThan(30);
    expect(
      offenders,
      "z-index litteral >= 50 : utiliser un jeton de DS-PRINCIPLES §12.1",
    ).toEqual([]);
  });

  test("mobile 375 : la barre laterale ouverte et son voile passent au-dessus des couches --z-sticky", async ({
    page,
  }) => {
    await openThemed(page, "/pages/composants.html", {
      width: 375,
      height: 812,
    });
    await injectSticky(page, ".main", "t-sticky");
    await page.locator("#header-burger").click();
    await expect(page.locator("#sidebar")).toHaveClass(/\bopen\b/);
    await expect(page.locator("#sidebar-overlay")).toHaveClass(/\bactive\b/);
    await expect.poll(() => leftOf(page, "#sidebar")).toBe(0);
    await expectAbove(
      page,
      "#sidebar",
      "#t-sticky",
      await overlapPoints(page, "#sidebar", "#t-sticky"),
      "sidebar/sticky",
    );
    await expectAbove(
      page,
      "#sidebar",
      ".garland--header",
      await overlapPoints(page, "#sidebar", ".garland--header"),
      "sidebar/guirlande",
    );
    // Hors du panneau, le voile couvre la guirlande ET l'en-tete (choix doctrinal : surface > colle).
    const out = await page.evaluate(() => {
      const s = document.getElementById("sidebar")!.getBoundingClientRect();
      const g = document
        .querySelector(".garland--header")!
        .getBoundingClientRect();
      const x = Math.round((s.right + innerWidth) / 2);
      return [
        { x, y: Math.round((g.top + g.bottom) / 2) },
        { x, y: 20 },
      ];
    });
    await expectAbove(
      page,
      "#sidebar-overlay",
      ".garland--header",
      [out[0]],
      "voile/guirlande",
    );
    await expectAbove(
      page,
      "#sidebar-overlay",
      ".site-header",
      [out[1]],
      "voile/en-tete",
    );
  });

  test("mobile 375 : le rail fixe ouvert passe au-dessus d'un en-tete colle et de la guirlande", async ({
    page,
  }) => {
    await openThemed(
      page,
      "/visual-tests/fixtures/festive-clearance-1005.html",
      { width: 375, height: 812 },
    );
    await injectSticky(page, "#gabarit", "t-sticky");
    await injectRail(page, true);
    await expect.poll(() => leftOf(page, "#t-rail")).toBe(0);
    await expectAbove(
      page,
      "#t-rail",
      "#t-sticky",
      await overlapPoints(page, "#t-rail", "#t-sticky"),
      "rail/sticky",
    );
    await expectAbove(
      page,
      "#t-rail",
      ".garland--header",
      await overlapPoints(page, "#t-rail", ".garland--header"),
      "rail/guirlande",
    );
  });

  test("desktop 1280 : la colonne d'app-shell reste SOUS le voile d'un drawer plein ecran", async ({
    page,
  }) => {
    await openThemed(page, "/pages/composants.html", {
      width: 1280,
      height: 800,
    });
    await injectRail(page, false);
    await page.evaluate(() => {
      const ovl = document.createElement("div");
      ovl.className = "drawer-overlay drawer-overlay--fullscreen open";
      ovl.id = "t-drawer-ovl";
      document.body.append(ovl);
    });
    await expectAbove(
      page,
      "#t-drawer-ovl",
      "#sidebar",
      await overlapPoints(page, "#t-drawer-ovl", "#sidebar"),
      "voile drawer/sidebar",
    );
    await expectAbove(
      page,
      "#t-drawer-ovl",
      "#t-rail",
      await overlapPoints(page, "#t-drawer-ovl", "#t-rail"),
      "voile drawer/rail",
    );
  });

  test("desktop 1280 : le menu d'un split-button ouvert reste visible sur un en-tete colle", async ({
    page,
  }) => {
    await openThemed(
      page,
      "/visual-tests/fixtures/festive-clearance-1005.html",
      { width: 1280, height: 800 },
    );
    // Ordre : split-button PUIS en-tete colle ; le menu ouvert descend sur l'en-tete colle.
    await injectSticky(page, "#gabarit", "t-sticky", true);
    await expectAbove(
      page,
      "#t-split-menu",
      "#t-sticky",
      await overlapPoints(page, "#t-split-menu", "#t-sticky"),
      "split/sticky",
    );
  });

  test("desktop 1280 : le menu de l'en-tete passe au-dessus de l'en-tete colle et de la guirlande", async ({
    page,
  }) => {
    await openThemed(
      page,
      "/visual-tests/fixtures/festive-clearance-1005.html",
      { width: 1280, height: 800 },
      {
        auth: true,
        user: { name: "Test Pile", initials: "TP" },
      },
    );
    await injectSticky(page, "#gabarit", "t-sticky");
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.locator("#header-avatar-btn").click();
    await expect(page.locator("#header-dropdown")).toHaveClass(/\bopen\b/);
    await expectAbove(
      page,
      "#header-dropdown",
      "#t-sticky",
      await overlapPoints(page, "#header-dropdown", "#t-sticky"),
      "menu en-tete/sticky",
    );
    await expectAbove(
      page,
      "#header-dropdown",
      ".garland--header",
      await overlapPoints(page, "#header-dropdown", ".garland--header"),
      "menu en-tete/guirlande",
    );
  });
});
