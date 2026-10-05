/**
 * table-cards-lg-1052.spec.ts — `.table-cards--lg` : cartes jusqu'à 1024px (#1052).
 *
 * Par défaut, `.table-cards` redevient un tableau dès 768px (bp-md). Un tableau de 4 à
 * 6 colonnes n'y tient pas : il défile dans son `.table-wrap` (colonne d'actions invisible
 * sans geste) ou ses champs n'y montrent que quelques caractères. Le modificateur opt-in
 * `.table-cards--lg` garde les cartes jusqu'à 1023px et restaure le tableau dès 1024px
 * (bp-lg). Correctif (tables.css) : les sélecteurs des deux blocs à 768px reçoivent
 * `:where(:not(.table-cards--lg))`, et un bloc `@media (min-width: 1024px)` recopie les
 * mêmes déclarations sous `:where(.table-cards--lg)` — spécificités inchangées.
 *
 * Pourquoi un vrai navigateur et pas jsdom : un seuil de media query, un défilement, une
 * largeur de champ et des boîtes de tableau sont des faits de MISE EN PAGE. jsdom ne
 * calcule aucune géométrie et n'évalue aucune media query.
 *
 * Fixture : visual-tests/fixtures/table-cards-lg-1052.html (réplique du suivi de tirokado,
 * `.page-content--wide` > `.card.card-static` > `.table-wrap`). Chaque tableau `--lg` a un
 * jumeau identique SANS `--lg` (#t-md6, #t-md4).
 *
 * Cas (critères CA1 à CA6 de la spec) :
 *  1. 768px, cartes : cellules de #t-lg6 et #t-lg4 en `block`, leurs wraps ne défilent pas,
 *     la page non plus. Témoin du défaut : #wrap-md6 DÉFILE (sinon la fixture ne reproduit rien).
 *  2. Seuil : #t-lg6 et #t-lg4 en `block` à 1023px, en `table-cell` à 1024px ; #t-md6 en
 *     `table-cell` dès 768px (défaut inchangé).
 *  3. Parité (1024 et 1280px) : chaque boîte table / th / td / contrôle de #t-lg6 et #t-lg4
 *     est égale (±0,5px, relative à l'origine du tableau) à celle de son jumeau sans --lg,
 *     ligne d'ajout du <tfoot> comprise. Garde la duplication des déclarations (A5).
 *  4. Lisibilité dès 1024px : #wrap-lg6 ne défile pas ; chaque champ Nom / E-mail rempli de
 *     #t-lg4 montre au moins 12 caractères de sa valeur.
 *  5. Cartes --lg entre 768 et 1023px (900px) : cellules d'actions en `flex`, contrôles
 *     >= 44 x 44px, champs >= 44px de haut.
 *  6. Démo réelle `pages/data.html#table-cards` (768 et 1280px) : le suivi à 6 colonnes
 *     (« Suivi détaillé des participants », --lg) est en cartes à 768px et en tableau à
 *     1280px, son `.table-wrap` ne défile jamais ; « Participants du tirage » (sans --lg)
 *     reste en `table-cell` à 768px.
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : la largeur est posée par le test.
 *
 * Preuves par mutation (tranche 1, jouées le 2026-10-05, à consigner dans la PR) :
 *  M1 retirer `:where(:not(.table-cards--lg))` du bloc à 768px de TABLE CARDS -> 3 rouges :
 *     cas 1, cas 2 (1023px) et cas 5 (cellule d'actions en table-cell à 900px) ;
 *  M2 supprimer le bloc `@media (min-width: 1024px)` -> 3 rouges : cas 2 (1024px) et cas 3
 *     (1024 et 1280px). Le cas 4 reste vert, et c'est attendu : en cartes aussi le suivi
 *     tient et les champs sont pleine largeur ; il mesure la lisibilité, pas le mode ;
 *  M6 remplacer `:where(:not(.table-cards--lg))` par `:not(.table-cards--lg)` dans le bloc
 *     à 768px de TABLE CARDS -> 2 rouges : cas 3 (1024 et 1280px), paire #t-lg4 / #t-md4,
 *     `padding-block` de la saisie battu par `.table-cards:not(…) td` (0,2,1). Seul ce cas
 *     le voit : table-cards-editable.spec.ts reste vert sous M6 (arbitrage A4).
 * Preuves par mutation (tranche 2, jouées le 2026-10-05) :
 *  M3 `padding` de `td` du bloc à 1024px porté à `0.7rem 1.3rem` -> 3 rouges : cas 3 (1024
 *     et 1280px) et cas 4 (1024px) ;
 *  M4 bloc à `min-width: 1000px` -> 1 rouge : cas 2 (« t-lg6 à 1023px ») ;
 *  M5 retrait des 4 règles `.table-cards--editable:where(.table-cards--lg)` du bloc à 1024px
 *     -> 2 rouges : cas 3 (1024 et 1280px), hauteur du tableau #t-lg4.
 *  Le cas 6 (démo) n'a pas de mutation propre (plafond de 3 par tranche) : il lit le même
 *  mode d'affichage que les cas 1 et 2, prouvés par M1, M2 et M4.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/table-cards-lg-1052.html";
const DEMO = "/pages/data.html";
const TOL = 0.5;
/** Cible tactile minimale (WCAG 2.5.5, DS-PRINCIPLES §3). */
const TARGET = 44;
/** Caractères visibles minimum dans un champ de saisie (spec #1052, CA4). */
const MIN_CHARS = 12;

test.describe("table-cards--lg : cartes jusqu'à 1024px (#1052)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  async function open(page: Page, width: number) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(FIXTURE);
    await page.waitForLoadState("networkidle");
  }

  /**
   * Mode d'un tableau, lu sur ses <td> : `cards` si les cellules de données sont en
   * `block` ET les cellules d'actions en `flex` ; `table` si toutes sont en `table-cell`.
   * `mixed` sinon (les valeurs distinctes sont rendues pour le message).
   */
  async function tableMode(page: Page, tableId: string) {
    return page.evaluate((id) => {
      const uniq = (els: Element[]) => [
        ...new Set(els.map((el) => getComputedStyle(el).display)),
      ];
      const cells = uniq([
        ...document.querySelectorAll(`#${id} td:not(.table-cards-actions)`),
      ]);
      const actions = uniq([
        ...document.querySelectorAll(`#${id} td.table-cards-actions`),
      ]);
      const count = document.querySelectorAll(`#${id} td`).length;
      const is = (a: string[], v: string) => a.length === 1 && a[0] === v;
      const mode =
        is(cells, "block") && is(actions, "flex")
          ? "cards"
          : is(cells, "table-cell") && is(actions, "table-cell")
            ? "table"
            : `mixed (cellules ${cells.join("/")}, actions ${actions.join("/")})`;
      return { count, mode };
    }, tableId);
  }

  /** Défilement horizontal d'un `.table-wrap`. */
  async function wrapScroll(page: Page, wrapId: string) {
    return page.evaluate((id) => {
      const w = document.getElementById(id) as HTMLElement;
      return { scroll: w.scrollWidth, client: w.clientWidth };
    }, wrapId);
  }

  test("1. 768px : les tableaux --lg sont en cartes et ne défilent pas ; le témoin défile", async ({
    page,
  }) => {
    await open(page, 768);
    for (const id of ["t-lg6", "t-lg4"]) {
      const d = await tableMode(page, id);
      expect(d.count, `${id} : des cellules`).toBeGreaterThan(10);
      expect(d.mode, `${id} en cartes à 768px`).toBe("cards");
    }
    for (const id of ["wrap-lg6", "wrap-lg4"]) {
      const s = await wrapScroll(page, id);
      expect(s.scroll, `${id} ne défile pas`).toBeLessThanOrEqual(s.client);
    }
    const docWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(docWidth, "la page ne déborde pas").toBe(768);
    // Témoin : sans --lg, le même tableau est restauré à 768px et défile.
    expect(
      (await tableMode(page, "t-md6")).mode,
      "témoin #t-md6 en tableau à 768px",
    ).toBe("table");
    const witness = await wrapScroll(page, "wrap-md6");
    expect(
      witness.scroll,
      `témoin #wrap-md6 : défile (${witness.scroll} > ${witness.client})`,
    ).toBeGreaterThan(witness.client);
  });

  test("2. seuil : --lg en cartes à 1023px, en tableau à 1024px ; défaut inchangé à 768px", async ({
    page,
  }) => {
    for (const [width, ids, mode] of [
      [1023, ["t-lg6", "t-lg4"], "cards"],
      [1024, ["t-lg6", "t-lg4"], "table"],
      [768, ["t-md6", "t-md4"], "table"],
    ] as const) {
      await open(page, width);
      for (const id of ids) {
        expect((await tableMode(page, id)).mode, `${id} à ${width}px`).toBe(
          mode,
        );
      }
    }
  });

  for (const width of [1024, 1280]) {
    test(`3. ${width}px : chaque tableau --lg a les boîtes de son jumeau sans --lg`, async ({
      page,
    }) => {
      await open(page, width);
      const data = await page.evaluate(() => {
        const boxes = (id: string) => {
          const table = document.getElementById(id) as HTMLElement;
          const o = table.getBoundingClientRect();
          return [
            table,
            ...table.querySelectorAll(
              'caption, th, td, .input, td :is(button, a, [role="button"])',
            ),
          ].map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              txt: (el.textContent || (el as HTMLInputElement).value || "")
                .trim()
                .slice(0, 20),
              x: r.left - o.left,
              y: r.top - o.top,
              w: r.width,
              h: r.height,
            };
          });
        };
        return {
          lg6: boxes("t-lg6"),
          md6: boxes("t-md6"),
          lg4: boxes("t-lg4"),
          md4: boxes("t-md4"),
        };
      });
      for (const [lg, md] of [
        [data.lg6, data.md6],
        [data.lg4, data.md4],
      ] as const) {
        expect(lg.length, "mêmes boîtes à comparer").toBe(md.length);
        expect(lg.length).toBeGreaterThan(20);
        lg.forEach((c, i) => {
          const t = md[i]!;
          const where = `${c.tag} « ${c.txt} » (${width}px)`;
          expect(t.tag, `même élément ${where}`).toBe(c.tag);
          expect(Math.abs(c.x - t.x), `x ${where}`).toBeLessThanOrEqual(TOL);
          expect(Math.abs(c.y - t.y), `y ${where}`).toBeLessThanOrEqual(TOL);
          expect(Math.abs(c.w - t.w), `largeur ${where}`).toBeLessThanOrEqual(
            TOL,
          );
          expect(Math.abs(c.h - t.h), `hauteur ${where}`).toBeLessThanOrEqual(
            TOL,
          );
        });
      }
    });
  }

  test("4. 1024px : le suivi tient sans défiler, chaque champ de saisie montre au moins 12 caractères", async ({
    page,
  }) => {
    await open(page, 1024);
    const s = await wrapScroll(page, "wrap-lg6");
    expect(s.scroll, "#wrap-lg6 ne défile pas").toBeLessThanOrEqual(s.client);

    const fields = await page.evaluate(() => {
      const ctx = document.createElement("canvas").getContext("2d")!;
      const inputs = [
        ...document.querySelectorAll(
          '#t-lg4 tbody .input:is([name="name"], [name="email"])',
        ),
      ] as HTMLInputElement[];
      return inputs.map((input) => {
        const cs = getComputedStyle(input);
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const content =
          input.getBoundingClientRect().width -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight) -
          parseFloat(cs.borderLeftWidth) -
          parseFloat(cs.borderRightWidth);
        let n = 0;
        while (
          n < input.value.length &&
          ctx.measureText(input.value.slice(0, n + 1)).width <= content
        )
          n++;
        return {
          label: input.getAttribute("aria-label"),
          visible: n,
          length: input.value.length,
        };
      });
    });
    expect(fields.length, "champs Nom et E-mail remplis").toBe(6);
    for (const f of fields) {
      expect(
        f.visible,
        `${f.label} : caractères visibles`,
      ).toBeGreaterThanOrEqual(Math.min(MIN_CHARS, f.length));
    }
  });

  test("5. 900px : les cartes --lg gardent leurs cibles de 44px et leur cellule d'actions en flex", async ({
    page,
  }) => {
    await open(page, 900);
    const data = await page.evaluate(() => {
      const actions = [
        ...document.querySelectorAll(
          "#t-lg6 .table-cards-actions, #t-lg4 .table-cards-actions",
        ),
      ] as HTMLElement[];
      const ctrls = [
        ...document.querySelectorAll(
          '#t-lg6 .table-cards-actions :is(button, a, [role="button"]), #t-lg4 .table-cards-actions :is(button, a, [role="button"])',
        ),
      ] as HTMLElement[];
      const inputs = [
        ...document.querySelectorAll("#t-lg4 .input"),
      ] as HTMLElement[];
      const box = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return {
          label: el.getAttribute("aria-label"),
          w: r.width,
          h: r.height,
        };
      };
      return {
        actionDisplays: [
          ...new Set(actions.map((a) => getComputedStyle(a).display)),
        ],
        actionCount: actions.length,
        ctrls: ctrls.map(box),
        inputs: inputs.map(box),
      };
    });
    expect(data.actionCount, "cellules d'actions").toBe(8);
    expect(data.actionDisplays, "cellules d'actions en flex").toEqual(["flex"]);
    expect(data.ctrls.length, "contrôles d'actions").toBeGreaterThan(10);
    for (const c of data.ctrls) {
      expect(c.w, `${c.label} : largeur`).toBeGreaterThanOrEqual(TARGET - TOL);
      expect(c.h, `${c.label} : hauteur`).toBeGreaterThanOrEqual(TARGET - TOL);
    }
    expect(data.inputs.length, "champs de saisie").toBe(8);
    for (const i of data.inputs) {
      expect(i.h, `${i.label} : hauteur`).toBeGreaterThanOrEqual(TARGET - TOL);
    }
  });

  for (const width of [768, 1280]) {
    test(`6. ${width}px : démo pages/data.html, le suivi à 6 colonnes (--lg) ne défile pas`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(DEMO);
      await page.waitForLoadState("networkidle");
      const m = await page.evaluate(() => {
        const measure = (name: string) => {
          const table = document.querySelector(
            `#table-cards table[aria-label="${name}"]`,
          ) as HTMLElement | null;
          if (!table) return null;
          const uniq = (els: Element[]) => [
            ...new Set(els.map((el) => getComputedStyle(el).display)),
          ];
          const wrap = table.closest(".table-wrap") as HTMLElement;
          return {
            lg: table.classList.contains("table-cards--lg"),
            count: table.querySelectorAll("td").length,
            cells: uniq([
              ...table.querySelectorAll("td:not(.table-cards-actions)"),
            ]),
            actions: uniq([...table.querySelectorAll("td.table-cards-actions")]),
            scroll: wrap.scrollWidth,
            client: wrap.clientWidth,
          };
        };
        return {
          lg: measure("Suivi détaillé des participants"),
          md: measure("Participants du tirage"),
        };
      });
      expect(m.lg, "démo « Suivi détaillé des participants »").not.toBeNull();
      expect(m.md, "démo « Participants du tirage »").not.toBeNull();
      const lg = m.lg!;
      const md = m.md!;
      expect(lg.lg, "la démo porte .table-cards--lg").toBe(true);
      expect(lg.count, "6 colonnes x 3 lignes").toBe(18);
      if (width === 768) {
        expect(lg.cells, "suivi --lg en cartes à 768px").toEqual(["block"]);
        expect(lg.actions, "actions du suivi --lg en flex à 768px").toEqual([
          "flex",
        ]);
        // Témoin : le tableau sans --lg de la même section est restauré dès 768px.
        expect(md.cells, "« Participants du tirage » en tableau à 768px").toEqual([
          "table-cell",
        ]);
      } else {
        expect(lg.cells, "suivi --lg en tableau à 1280px").toEqual([
          "table-cell",
        ]);
        expect(lg.actions, "actions du suivi --lg à 1280px").toEqual([
          "table-cell",
        ]);
      }
      expect(
        lg.scroll,
        `le .table-wrap du suivi --lg ne défile pas (${lg.scroll} <= ${lg.client})`,
      ).toBeLessThanOrEqual(lg.client);
    });
  }
});
