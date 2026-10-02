/**
 * table-cards.spec.ts — Tableau « lignes -> cartes » (#1007).
 *
 * `.table-cards` (tables.css) replie un tableau en cartes sous 768px (une ligne = une
 * carte, chaque cellule affiche son libelle) et restaure le tableau classique au-dela.
 *
 * Pourquoi un vrai navigateur et pas jsdom : un debordement, une restauration de
 * `display: table-*` et une taille de cible sont des faits de MISE EN PAGE. jsdom ne
 * calcule aucune geometrie : il laisserait passer le defaut. On mesure les boites rendues.
 *
 * Cas (criteres C1 a C5 de la spec) :
 *  1. 375px, fixture : le document ne defile pas, le `.table-wrap` ne defile pas, chaque
 *     cellule tient dans le wrapper, libelles visibles, `thead` masque (<= 1px), cibles
 *     tactiles de la cellule d'actions >= 44px.
 *  2. 375px, `pages/data.html#table-cards` : idem sur la demo reelle (e-mail long compris).
 *  3. A11y sans double annonce : le nom de la cellule ne contient pas le libelle
 *     (`aria-hidden`), l'en-tete de colonne reste expose, le tableau est nomme.
 *  4. 768 et 1280px : les boites de chaque th/td/caption du tableau `.table-cards` sont
 *     celles de son JUMEAU sans la classe (relativement a l'origine du tableau), a 0,5px.
 *  5. Seuil : 767px -> `display: block`, 768px -> `table-cell`.
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : la largeur est posee par le test
 * (`setViewportSize`), la matrice des 12 projets le rejouerait 12 fois sans rien couvrir.
 *
 * Preuves par mutation (a consigner dans la PR) :
 *  M1 retirer le bloc cartes (mobile) -> cas 1 et 2 rouges ;
 *  M2 retirer `aria-hidden` des libelles de la demo -> cas 3 rouge ;
 *  M3 changer le `padding` restaure a min-width: 768px -> cas 4 rouge ;
 *  M4 seuil a 760px -> cas 5 rouge ;
 *  M5 retirer la regle 44px des cibles -> cibles tactiles rouges (cas 1 et 2) ;
 *  M6 retirer la restauration de `min-height` a 768px -> cas 4 rouge.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/table-cards-1007.html";
const DEMO = "/pages/data.html";
const TOL = 0.5;
const TARGET = 44;

test.describe("table-cards (#1007)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de mise en page, jouee une seule fois (${PROJECT})`,
    );
  });

  async function open(page: Page, url: string, width: number) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  }

  /** Mesures communes du mode cartes : `scope` = racine du tableau (fixture ou demo). */
  async function measureCards(page: Page, scope: string, width: number) {
    const m = await page.evaluate(
      ({ scope }) => {
        const root = document.querySelector(scope) as HTMLElement;
        const wrap = root.querySelector(".table-wrap") as HTMLElement;
        const wr = wrap.getBoundingClientRect();
        const tds = [...root.querySelectorAll("td")] as HTMLElement[];
        const labels = [
          ...root.querySelectorAll(".table-cards-label"),
        ] as HTMLElement[];
        const thead = root.querySelector("thead") as HTMLElement;
        const tr = thead.getBoundingClientRect();
        const targets = [
          ...root.querySelectorAll(
            ".table-cards-actions :is(button, a, [role='button'])",
          ),
        ] as HTMLElement[];
        return {
          docScrollWidth: document.documentElement.scrollWidth,
          wrapScroll: wrap.scrollWidth,
          wrapClient: wrap.clientWidth,
          wrapRight: wr.right,
          cellCount: tds.length,
          overflowing: tds.filter(
            (td) => td.getBoundingClientRect().right > wr.right + 0.5,
          ).length,
          tdDisplays: [
            ...new Set(tds.map((td) => getComputedStyle(td).display)),
          ],
          labelCount: labels.length,
          labelWidths: labels.map((l) => l.getBoundingClientRect().width),
          theadW: tr.width,
          theadH: tr.height,
          targetCount: targets.length,
          targetSizes: targets.map((t) => {
            const r = t.getBoundingClientRect();
            return {
              w: r.width,
              h: r.height,
              txt: (t.textContent || "").trim(),
            };
          }),
        };
      },
      { scope },
    );

    // Garde-fous : on mesure bien des cartes (sans eux le test passerait pour la mauvaise raison).
    expect(m.cellCount, "des cellules mesurees").toBeGreaterThan(0);
    expect(m.tdDisplays).toContain("block");
    expect(m.labelCount, "des libelles").toBeGreaterThan(0);
    expect(m.targetCount, "des cibles tactiles").toBeGreaterThan(0);

    expect(m.docScrollWidth, "le document ne defile pas horizontalement").toBe(
      width,
    );
    expect(m.wrapScroll, "le wrapper ne defile pas").toBeLessThanOrEqual(
      m.wrapClient,
    );
    expect(m.wrapRight, "le wrapper tient dans la fenetre").toBeLessThanOrEqual(
      width + TOL,
    );
    expect(m.overflowing, "aucune cellule ne depasse le wrapper").toBe(0);
    for (const w of m.labelWidths)
      expect(w, "libelle visible").toBeGreaterThan(0);
    expect(m.theadW, "thead masque a l'ecran (largeur)").toBeLessThanOrEqual(1);
    expect(m.theadH, "thead masque a l'ecran (hauteur)").toBeLessThanOrEqual(1);
    for (const t of m.targetSizes) {
      expect(t.w, `cible « ${t.txt} » >= 44px de large`).toBeGreaterThanOrEqual(
        TARGET - TOL,
      );
      expect(t.h, `cible « ${t.txt} » >= 44px de haut`).toBeGreaterThanOrEqual(
        TARGET - TOL,
      );
    }
  }

  test("1. 375px, fixture : pas de debordement, cartes lisibles, cibles >= 44px", async ({
    page,
  }) => {
    await open(page, FIXTURE, 375);
    await measureCards(page, "#cards-wrap", 375);
  });

  test("2. 375px, data.html#table-cards : la demo ne deborde pas", async ({
    page,
  }) => {
    await open(page, DEMO, 375);
    await measureCards(page, "#table-cards .demo-box", 375);
    // L'e-mail long sans point de coupure naturel tient dans le wrapper.
    const longCell = page.locator("#table-cards td", {
      hasText: "association-des-familles-exemple.fr",
    });
    await expect(longCell).toHaveCount(1);
    const fits = await longCell.evaluate((td) => {
      const wrap = td.closest(".table-wrap") as HTMLElement;
      return (
        td.getBoundingClientRect().right <=
        wrap.getBoundingClientRect().right + 0.5
      );
    });
    expect(fits, "la cellule de l'e-mail long tient dans le wrapper").toBe(
      true,
    );
  });

  test("3. a11y : aucun libelle annonce deux fois a 375px", async ({
    page,
  }) => {
    await open(page, DEMO, 375);
    const demo = page.locator("#table-cards");
    // Le nom de la cellule ne contient pas le libelle « Nom » (aria-hidden) : exact:true echoue sinon.
    await expect(
      demo.getByRole("cell", { name: "Alice Martin", exact: true }),
    ).toHaveCount(1);
    // L'en-tete de colonne (thead masque a l'ecran) reste expose : c'est le canal du libelle.
    await expect(
      demo.getByRole("columnheader", { name: "Nom", exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("table", { name: "Participants du tirage" }),
    ).toHaveCount(1);
  });

  for (const width of [768, 1280]) {
    test(`4. ${width}px : le tableau restaure a les boites de son jumeau`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      const data = await page.evaluate(() => {
        const boxes = (id: string) => {
          const table = document.getElementById(id) as HTMLElement;
          const o = table.getBoundingClientRect();
          return [table, ...table.querySelectorAll("caption, th, td")].map(
            (el) => {
              const r = el.getBoundingClientRect();
              return {
                tag: el.tagName,
                txt: (el.textContent || "").trim().slice(0, 20),
                x: r.left - o.left,
                y: r.top - o.top,
                w: r.width,
                h: r.height,
              };
            },
          );
        };
        const labels = [
          ...document.querySelectorAll("#cards .table-cards-label"),
        ] as HTMLElement[];
        return {
          cards: boxes("cards"),
          twin: boxes("twin"),
          labelDisplays: [
            ...new Set(labels.map((l) => getComputedStyle(l).display)),
          ],
          labelCount: labels.length,
        };
      });
      expect(data.labelCount, "des libelles a masquer").toBeGreaterThan(0);
      expect(data.labelDisplays, "libelles en display: none").toEqual(["none"]);
      expect(data.cards.length, "memes boites a comparer").toBe(
        data.twin.length,
      );
      expect(data.cards.length).toBeGreaterThan(10);
      data.cards.forEach((c, i) => {
        const t = data.twin[i];
        const where = `${c.tag} « ${c.txt} » (${width}px)`;
        expect(Math.abs(c.x - t.x), `x ${where}`).toBeLessThanOrEqual(TOL);
        expect(Math.abs(c.y - t.y), `y ${where}`).toBeLessThanOrEqual(TOL);
        expect(Math.abs(c.w - t.w), `largeur ${where}`).toBeLessThanOrEqual(
          TOL,
        );
        expect(Math.abs(c.h - t.h), `hauteur ${where}`).toBeLessThanOrEqual(
          TOL,
        );
      });
    });
  }

  test("5. seuil : 767px = bloc, 768px = cellule de tableau", async ({
    page,
  }) => {
    const displayAt = async (width: number) => {
      await open(page, FIXTURE, width);
      return page.evaluate(
        () => getComputedStyle(document.querySelector("#cards td")!).display,
      );
    };
    expect(await displayAt(767)).toBe("block");
    expect(await displayAt(768)).toBe("table-cell");
  });
});
