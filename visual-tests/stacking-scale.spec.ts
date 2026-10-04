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
