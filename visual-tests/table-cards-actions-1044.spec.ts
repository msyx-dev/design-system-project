/**
 * table-cards-actions-1044.spec.ts — Cellule d'actions de `.table-cards` sur une rangée (#1044).
 *
 * Dès 768px, `.table-cards .table-cards-actions` redevient une cellule de tableau. Sans
 * règle, l'algorithme de tableau `auto` donne à la colonne la largeur du bouton le plus
 * large : les contrôles s'empilent et les libellés longs se coupent DANS le bouton.
 * Correctif (tables.css) : `white-space: nowrap` sur la cellule, marge `--space-sm` entre
 * contrôles voisins, `vertical-align: middle`, et `white-space: normal` sur l'erreur de ligne.
 *
 * Pourquoi un vrai navigateur et pas jsdom : un empilement, un écart, un centrage et un
 * défilement sont des faits de MISE EN PAGE. jsdom ne calcule aucune géométrie.
 *
 * Cas (critères CA1 à CA7 de la spec) :
 *  1. Rangée (768 et 1280px) : deux contrôles d'une même ligne ont le même `top` et la
 *     même hauteur (±1px), aucun libellé coupé (hauteur <= 44,5px).
 *  2. Écart (768 et 1280px) : JSX sans blanc = `--space-sm` résolu (±0,5px) ; vanilla avec
 *     blancs entre 7,5 et 13px ; chaque contrôle tient dans la zone de contenu de sa cellule.
 *  3. Erreur (768 et 1280px) : sous les boutons, dans la cellule, sur plusieurs lignes ;
 *     le `.table-wrap` ne défile pas.
 *  4. Centrage (1280px) : `.btn-icon` et `.btn-sm` voisins ont le même centre vertical (±1px).
 *  5. Cartes inchangées (375 et 767px) : cellule en `flex`, `white-space: normal`, aucune
 *     marge de début sur les contrôles.
 *  6. Démo réelle `pages/data.html` (768 et 1280px) : rangée dans #table-cards-editable,
 *     même hauteur dans #table-cards, aucun `.table-wrap` des deux sections ne défile.
 *  7. Contrat A2 (1280px) : tableau trop large pour son conteneur -> les contrôles restent
 *     sur une rangée ET le `.table-wrap` défile.
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : la largeur est posée par le test.
 *
 * Preuves par mutation (à consigner dans la PR) :
 *  M1 retirer `white-space: nowrap` de `.table-cards .table-cards-actions` -> cas 1, 6, 7
 *     rouges (et le cas 4 « jumeau » de table-cards.spec.ts) ;
 *  M2 retirer la règle `margin-inline-start: var(--space-sm)` -> cas 2 rouge ;
 *  M3 retirer `white-space: normal` de `.table-cards-error` -> cas 3 rouge ;
 *  M4 sortir la règle `nowrap` du bloc `min-width: 768px` -> cas 5 rouge ;
 *  M5 retirer `vertical-align: middle` -> cas 4 rouge.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/table-cards-actions-1044.html";
const DEMO = "/pages/data.html";
const TOL = 0.5;
/** Hauteur max d'un bouton de la variante --editable sur UNE ligne (min-height 44px). */
const ONE_LINE_MAX = 44.5;

type Box = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  h: number;
};

test.describe("table-cards : cellule d'actions sur une rangée (#1044)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  async function open(page: Page, url: string, width: number) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  }

  /** Boîtes des contrôles (enfants directs button / a / [role=button]) d'une cellule d'actions. */
  async function rowControls(page: Page, rowId: string) {
    return page.evaluate((id) => {
      const td = document.querySelector(
        `#${id} .table-cards-actions`,
      ) as HTMLElement;
      const cs = getComputedStyle(td);
      const tr = td.getBoundingClientRect();
      const ctrls = [...td.children].filter((c) =>
        c.matches(':is(button, a, [role="button"])'),
      ) as HTMLElement[];
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
          h: r.height,
        };
      };
      return {
        contentRight: tr.right - parseFloat(cs.paddingRight),
        contentLeft: tr.left + parseFloat(cs.paddingLeft),
        ctrls: ctrls.map(box),
      };
    }, rowId);
  }

  for (const width of [768, 1280]) {
    test(`1. ${width}px : deux contrôles d'une ligne sur une rangée, même hauteur, libellés entiers`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      for (const row of ["r-blancs", "r-jsx", "r-erreur"]) {
        const { ctrls } = await rowControls(page, row);
        expect(ctrls.length, `${row} : deux contrôles`).toBe(2);
        const [a, b] = ctrls as [Box, Box];
        expect(
          Math.abs(b.top - a.top),
          `${row} : même top`,
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(b.h - a.h),
          `${row} : même hauteur`,
        ).toBeLessThanOrEqual(1);
        for (const c of ctrls) {
          expect(c.h, `${row} : libellé sur une ligne`).toBeLessThanOrEqual(
            ONE_LINE_MAX,
          );
        }
      }
    });

    test(`2. ${width}px : écart --space-sm entre contrôles, contrôles dans leur cellule`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      // --space-sm résolu par une sonde indépendante de la règle testée.
      const spaceSm = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.width = "var(--space-sm)";
        document.body.appendChild(probe);
        const w = probe.getBoundingClientRect().width;
        probe.remove();
        return w;
      });
      expect(spaceSm, "--space-sm résolu").toBeGreaterThan(0);

      const jsx = await rowControls(page, "r-jsx");
      const [j1, j2] = jsx.ctrls as [Box, Box];
      expect(
        Math.abs(j2.left - j1.right - spaceSm),
        `JSX sans blanc : écart = --space-sm (${spaceSm}px)`,
      ).toBeLessThanOrEqual(TOL);

      const blancs = await rowControls(page, "r-blancs");
      const [b1, b2] = blancs.ctrls as [Box, Box];
      const gap = b2.left - b1.right;
      expect(gap, "vanilla avec blancs : écart minimal").toBeGreaterThanOrEqual(
        7.5,
      );
      expect(gap, "vanilla avec blancs : écart maximal").toBeLessThanOrEqual(
        13,
      );

      for (const row of ["r-blancs", "r-jsx", "r-erreur", "r-icone"]) {
        const m = await rowControls(page, row);
        for (const c of m.ctrls) {
          expect(
            c.right,
            `${row} : contrôle dans la cellule`,
          ).toBeLessThanOrEqual(m.contentRight + TOL);
        }
      }
    });

    test(`3. ${width}px : l'erreur de ligne revient à la ligne sous les boutons`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      const m = await page.evaluate(() => {
        const td = document.querySelector(
          "#r-erreur .table-cards-actions",
        ) as HTMLElement;
        const err = td.querySelector(".table-cards-error") as HTMLElement;
        const cs = getComputedStyle(td);
        const tr = td.getBoundingClientRect();
        const er = err.getBoundingClientRect();
        const btnBottom = Math.max(
          ...[...td.querySelectorAll(":scope > button")].map(
            (b) => b.getBoundingClientRect().bottom,
          ),
        );
        // Lignes de texte rendues : un rectangle par ligne, regroupés par `top`.
        const range = document.createRange();
        range.selectNodeContents(err);
        const lines = new Set(
          [...range.getClientRects()].map((r) => Math.round(r.top)),
        ).size;
        const wrap = document.getElementById("wrap-rangee") as HTMLElement;
        return {
          len: (err.textContent || "").trim().length,
          errTop: er.top,
          errRight: er.right,
          btnBottom,
          contentRight: tr.right - parseFloat(cs.paddingRight),
          lines,
          scrollWidth: wrap.scrollWidth,
          clientWidth: wrap.clientWidth,
        };
      });
      expect(m.len, "message de plus de 60 caractères").toBeGreaterThan(60);
      expect(m.errTop, "erreur sous les boutons").toBeGreaterThanOrEqual(
        m.btnBottom - TOL,
      );
      expect(m.errRight, "erreur dans la cellule").toBeLessThanOrEqual(
        m.contentRight + TOL,
      );
      expect(m.lines, "l'erreur revient à la ligne").toBeGreaterThan(1);
      expect(m.scrollWidth, "#wrap-rangee ne défile pas").toBeLessThanOrEqual(
        m.clientWidth,
      );
    });
  }

  test("4. 1280px : .btn-icon et .btn-sm voisins centrés verticalement", async ({
    page,
  }) => {
    await open(page, FIXTURE, 1280);
    const m = await page.evaluate(() => {
      const td = document.querySelector(
        "#r-icone .table-cards-actions",
      ) as HTMLElement;
      const mid = (sel: string) => {
        const r = (
          td.querySelector(sel) as HTMLElement
        ).getBoundingClientRect();
        return r.top + r.height / 2;
      };
      return { icon: mid(".btn-icon"), sm: mid(".btn-sm") };
    });
    expect(Math.abs(m.icon - m.sm), "même centre vertical").toBeLessThanOrEqual(
      1,
    );
  });

  for (const width of [375, 767]) {
    test(`5. ${width}px : cartes inchangées (flex, white-space normal, aucune marge)`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      const cells = await page.evaluate(() =>
        [...document.querySelectorAll("td.table-cards-actions")].map((td) => {
          const cs = getComputedStyle(td);
          return {
            display: cs.display,
            whiteSpace: cs.whiteSpace,
            margins: [...td.children]
              .filter((c) => c.matches(':is(button, a, [role="button"])'))
              .map((c) => getComputedStyle(c).marginInlineStart),
          };
        }),
      );
      expect(cells.length, "cellules d'actions mesurées").toBe(5);
      for (const c of cells) {
        expect(c.display, "cellule en flex (carte)").toBe("flex");
        expect(c.whiteSpace, "retour à la ligne permis").toBe("normal");
        expect(c.margins.length).toBeGreaterThan(0);
        for (const mg of c.margins)
          expect(mg, "aucune marge de début").toBe("0px");
      }
    });
  }

  for (const width of [768, 1280]) {
    test(`6. ${width}px : démo pages/data.html, rangée et même hauteur, aucun défilement`, async ({
      page,
    }) => {
      await open(page, DEMO, width);
      const m = await page.evaluate(() => {
        const ctrls = (td: Element) =>
          [...td.children].filter((c) =>
            c.matches(':is(button, a, [role="button"])'),
          ) as HTMLElement[];
        const editableRows = [
          ...document.querySelectorAll(
            "#table-cards-editable td.table-cards-actions",
          ),
        ]
          .map(ctrls)
          .filter((c) => c.length === 2)
          .map(([a, b]) => ({
            label: (a.getAttribute("aria-label") || a.textContent || "").trim(),
            dTop: Math.abs(
              b.getBoundingClientRect().top - a.getBoundingClientRect().top,
            ),
          }));
        const heights = [
          ...document.querySelectorAll("#table-cards td.table-cards-actions"),
        ].flatMap((td) =>
          ctrls(td).map((c) => c.getBoundingClientRect().height),
        );
        const wraps = [
          ...document.querySelectorAll(
            "#table-cards .table-wrap, #table-cards-editable .table-wrap",
          ),
        ].map((w) => ({
          scroll: (w as HTMLElement).scrollWidth,
          client: (w as HTMLElement).clientWidth,
        }));
        return { editableRows, heights, wraps };
      });
      expect(
        m.editableRows.length,
        "lignes à deux boutons (saisie)",
      ).toBeGreaterThanOrEqual(2);
      for (const r of m.editableRows) {
        expect(r.dTop, `${r.label} : rangée`).toBeLessThanOrEqual(1);
      }
      expect(
        m.heights.length,
        "boutons de #table-cards",
      ).toBeGreaterThanOrEqual(3);
      const hMin = Math.min(...m.heights);
      const hMax = Math.max(...m.heights);
      expect(
        hMax - hMin,
        "#table-cards : même hauteur, aucun libellé coupé",
      ).toBeLessThanOrEqual(1);
      expect(m.wraps.length, "au moins un .table-wrap par section").toBeGreaterThanOrEqual(2);
      for (const w of m.wraps) {
        expect(w.scroll, ".table-wrap ne défile pas").toBeLessThanOrEqual(
          w.client,
        );
      }
    });
  }

  test("7. 1280px : tableau trop large -> rangée conservée, le .table-wrap défile (A2)", async ({
    page,
  }) => {
    await open(page, FIXTURE, 1280);
    const m = await rowControls(page, "r-etroit");
    expect(m.ctrls.length, "deux contrôles").toBe(2);
    const [a, b] = m.ctrls as [Box, Box];
    expect(Math.abs(b.top - a.top), "rangée conservée").toBeLessThanOrEqual(1);
    const scroll = await page.evaluate(() => {
      const w = document.getElementById("wrap-etroit") as HTMLElement;
      return { scroll: w.scrollWidth, client: w.clientWidth };
    });
    expect(scroll.scroll, "#wrap-etroit défile").toBeGreaterThan(scroll.client);
  });
});
