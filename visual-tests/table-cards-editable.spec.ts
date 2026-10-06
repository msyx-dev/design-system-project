/**
 * table-cards-editable.spec.ts — Tableau de saisie sur `.table-cards` (#1008).
 *
 * `.table-cards--editable` (tables.css) met des champs et des actions en cellule d'un
 * tableau qui se replie en cartes sous 768px. Formulaire de ligne = `<form id hidden>`
 * vide dans la cellule d'actions ; champs et bouton d'envoi y sont rattachés par `form=`.
 *
 * Pourquoi un vrai navigateur et pas jsdom : un débordement, une cible tactile, une colonne
 * qui bouge à l'apparition d'une erreur et la portée d'un formulaire rattaché par `form=`
 * sont des faits de MISE EN PAGE et de navigateur. jsdom ne calcule aucune géométrie.
 *
 * Cas (critères C1 à C6 et C9 de la spec) :
 *  1. 375px, erreurs affichées : rien ne déborde, aucun bouton hors écran ni recouvert.
 *  2. Cibles >= 44 x 44 px (champs et boutons d'action), à 375 et 1280px.
 *  3. Tabulation Nom, E-mail, actions, ligne suivante... jusqu'à la ligne d'ajout.
 *  4. Formulaire de ligne : association, envoi et validation natifs limités à la ligne.
 *  5. 1280px : l'apparition d'une erreur ne bouge ni colonnes ni boutons.
 *  6. Ligne d'ajout distincte (fond + bordure haute pointillée).
 *  7. Noms accessibles uniques, commençant par l'en-tête ; erreurs reliées (aria-describedby).
 *  8. Vitrine pages/data.html#table-cards-editable à 375px : pas de défilement, un envoi ne navigue pas.
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : la largeur est posée par le test.
 *
 * Preuves par mutation (à consigner dans la PR) :
 *  M1 retirer la règle 44px (champs ET boutons) -> cas 2 rouge ;
 *  M2 retirer `width: 0; min-width: 100%` des messages -> cas 5 rouge ;
 *  M3 retirer `form="p3"` d'un champ de la ligne 3 (fixture) -> cas 4 rouge ;
 *  M4 retirer `vertical-align: top` -> cas 5 rouge ;
 *  M5 retirer le fond de `.table-cards-add-row` -> cas 6 rouge.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/table-cards-editable-1008.html";
const DEMO = "/pages/data.html";
const TOL = 0.5;
const TARGET = 44;

test.describe("table-cards-editable (#1008)", () => {
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

  const SEQUENCE = [
    "Nom de Alice Martin",
    "E-mail de Alice Martin",
    "Enregistrer Alice Martin",
    "Retirer Alice Martin",
    "Nom de Jean-Baptiste Dupont",
    "E-mail de Jean-Baptiste Dupont",
    "Enregistrer Jean-Baptiste Dupont",
    "Retirer Jean-Baptiste Dupont",
    "Nom de Bastien Leroy",
    "E-mail de Bastien Leroy",
    "Enregistrer Bastien Leroy",
    "Retirer Bastien Leroy",
    "Nom du nouveau participant",
    "E-mail du nouveau participant",
    "Ajouter",
  ];

  test("1. 375px, erreurs affichées : rien ne déborde, aucun bouton hors écran ni recouvert", async ({
    page,
  }) => {
    await open(page, FIXTURE, 375);
    const m = await page.evaluate(() => {
      const wrap = document.getElementById("wrap") as HTMLElement;
      const wr = wrap.getBoundingClientRect();
      const btns = [
        ...document.querySelectorAll(
          "tr:is(#row-p2, #row-new) .table-cards-actions button",
        ),
      ] as HTMLElement[];
      const msgs = [
        ...document.querySelectorAll(".input-error-msg, .table-cards-error"),
      ] as HTMLElement[];
      const shown = (el: Element) =>
        (el as HTMLElement).getBoundingClientRect().width > 0;
      return {
        docScrollWidth: document.documentElement.scrollWidth,
        wrapScroll: wrap.scrollWidth,
        wrapClient: wrap.clientWidth,
        msgCount: msgs.filter(shown).length,
        msgOut: msgs.filter((e) => {
          const r = e.getBoundingClientRect();
          return r.left < wr.left - 0.5 || r.right > wr.right + 0.5;
        }).length,
        btns: btns.map((b) => {
          b.scrollIntoView({ block: "center", behavior: "instant" });
          const r = b.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return {
            txt: (b.textContent || "").trim(),
            left: r.left,
            right: r.right,
            covered: !(hit === b || (hit && b.contains(hit))),
          };
        }),
      };
    });
    expect(m.msgCount, "des messages d'erreur visibles").toBeGreaterThanOrEqual(
      3,
    );
    expect(m.btns.length, "des boutons mesurés").toBeGreaterThanOrEqual(3);
    expect(m.docScrollWidth, "le document ne défile pas").toBe(375);
    expect(m.wrapScroll, "le wrapper ne défile pas").toBeLessThanOrEqual(
      m.wrapClient,
    );
    expect(m.msgOut, "chaque message tient dans le wrapper").toBe(0);
    for (const b of m.btns) {
      expect(
        b.left,
        `« ${b.txt} » dans la fenêtre (gauche)`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        b.right,
        `« ${b.txt} » dans la fenêtre (droite)`,
      ).toBeLessThanOrEqual(375);
      expect(b.covered, `« ${b.txt} » atteignable (non recouvert)`).toBe(false);
    }
  });

  for (const width of [375, 1280]) {
    test(`2. ${width}px : champs et boutons d'action >= 44 x 44 px`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      const sizes = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            "#t .input, #t .table-cards-actions button",
          ),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            w: r.width,
            h: r.height,
            name:
              el.getAttribute("aria-label") || (el.textContent || "").trim(),
          };
        }),
      );
      expect(sizes.length, "des cibles mesurées").toBeGreaterThanOrEqual(15);
      for (const s of sizes) {
        expect(s.w, `« ${s.name} » >= 44px de large`).toBeGreaterThanOrEqual(
          TARGET - TOL,
        );
        expect(s.h, `« ${s.name} » >= 44px de haut`).toBeGreaterThanOrEqual(
          TARGET - TOL,
        );
      }
    });

    test(`3. ${width}px : tabulation Nom, E-mail, actions, ligne suivante, jusqu'à l'ajout`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      await page
        .getByRole("textbox", { name: SEQUENCE[0], exact: true })
        .focus();
      const seen: string[] = [];
      for (let i = 0; i < SEQUENCE.length; i++) {
        seen.push(
          await page.evaluate(() => {
            const a = document.activeElement as HTMLElement;
            return a.getAttribute("aria-label") || (a.textContent || "").trim();
          }),
        );
        if (i < SEQUENCE.length - 1) await page.keyboard.press("Tab");
      }
      expect(seen).toEqual(SEQUENCE);
    });

    test(`6. ${width}px : la ligne d'ajout est distincte (fond + bordure pointillée)`, async ({
      page,
    }) => {
      await open(page, FIXTURE, width);
      const s = await page.evaluate(() => {
        const add = document.getElementById("row-new") as HTMLElement;
        const body = document.getElementById("row-p3") as HTMLElement;
        const border = add.querySelector("td") as HTMLElement;
        const cs = (el: Element, p: string) =>
          getComputedStyle(el).getPropertyValue(p);
        return {
          addBg: cs(add, "background-color"),
          bodyBg: cs(body, "background-color"),
          // en cartes la bordure est sur le <tr>, en tableau sur ses <td> (bordures fusionnées)
          borderStyle: width375()
            ? cs(add, "border-top-style")
            : cs(border, "border-top-style"),
        };
        function width375() {
          return window.innerWidth < 768;
        }
      });
      expect(s.addBg, "fond de la ligne d'ajout").not.toBe(s.bodyBg);
      expect(s.borderStyle, "bordure haute pointillée").toBe("dashed");
    });
  }

  test("4. formulaire de ligne : association, envoi et validation limités à la ligne", async ({
    page,
  }) => {
    await open(page, FIXTURE, 1280);
    // Écouteurs posés PAR LE TEST (jamais par le DS) : envois bloqués, invalid tracés.
    await page.evaluate(() => {
      const w = window as unknown as { __log: unknown[] };
      w.__log = [];
      document.addEventListener(
        "submit",
        (e) => {
          e.preventDefault();
          const f = e.target as HTMLFormElement;
          w.__log.push({
            type: "submit",
            form: f.id,
            data: Object.fromEntries(
              new FormData(f) as unknown as Iterable<[string, string]>,
            ),
          });
        },
        true,
      );
      document.addEventListener(
        "invalid",
        (e) =>
          w.__log.push({
            type: "invalid",
            field: (e.target as HTMLElement).getAttribute("aria-label"),
          }),
        true,
      );
    });
    const log = () =>
      page.evaluate(() => (window as unknown as { __log: unknown[] }).__log);

    // form.elements de chaque formulaire = les champs de SA ligne, rien d'une autre.
    const owners = await page.evaluate(() =>
      ["p1", "p2", "p3", "pnew"].map((id) => {
        const f = document.getElementById(id) as HTMLFormElement;
        const row = f.closest("tr");
        return {
          id,
          n: f.elements.length,
          foreign: [...f.elements].filter((el) => el.closest("tr") !== row)
            .length,
          names: [...f.elements].map((el) => (el as HTMLInputElement).name),
        };
      }),
    );
    for (const o of owners) {
      expect(o.foreign, `${o.id} : aucun élément d'une autre ligne`).toBe(0);
      expect(o.n, `${o.id} : ses champs, son champ caché et son bouton`).toBe(
        o.id === "pnew" ? 3 : 4,
      );
    }
    expect(owners[1].names).toEqual(["name", "email", "participantId", ""]);

    // Entrée dans le Nom de la ligne 3 : un seul submit, sur le formulaire de la ligne 3.
    await page
      .getByRole("textbox", { name: "Nom de Bastien Leroy", exact: true })
      .press("Enter");
    expect(await log()).toEqual([
      {
        type: "submit",
        form: "p3",
        data: {
          name: "Bastien Leroy",
          email: "bastien.leroy@exemple.fr",
          participantId: "p3",
        },
      },
    ]);

    // Nom de la ligne 1 vidé puis « Enregistrer » L1 : invalid sur ce seul champ, focus dessus, aucun envoi.
    await page.evaluate(
      () => ((window as unknown as { __log: unknown[] }).__log.length = 0),
    );
    await page
      .getByRole("textbox", { name: "Nom de Alice Martin", exact: true })
      .fill("");
    await page
      .getByRole("button", { name: "Enregistrer Alice Martin", exact: true })
      .click();
    expect(await log()).toEqual([
      { type: "invalid", field: "Nom de Alice Martin" },
    ]);
    expect(
      await page.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      ),
    ).toBe("Nom de Alice Martin");

    // « Enregistrer » L3 ensuite : envoi de la ligne 3 malgré la ligne 1 invalide.
    await page.evaluate(
      () => ((window as unknown as { __log: unknown[] }).__log.length = 0),
    );
    await page
      .getByRole("button", { name: "Enregistrer Bastien Leroy", exact: true })
      .click();
    const after = (await log()) as { type: string; form: string }[];
    expect(after.map((e) => `${e.type}:${e.form}`)).toEqual(["submit:p3"]);
  });

  test("5. 1280px : l'apparition d'une erreur ne bouge ni les colonnes ni les boutons", async ({
    page,
  }) => {
    await open(page, FIXTURE, 1280);
    const measure = () =>
      page.evaluate(() => ({
        th: [...document.querySelectorAll("#t thead th")].map(
          (th) => th.getBoundingClientRect().width,
        ),
        btnTop: [
          ...document.querySelectorAll("#row-p2 .table-cards-actions button"),
        ].map((b) => b.getBoundingClientRect().top),
      }));
    const setErrors = (hidden: boolean) =>
      page.evaluate(
        (h) =>
          document
            .querySelectorAll("[data-err]")
            .forEach((e) => ((e as HTMLElement).hidden = h)),
        hidden,
      );
    await setErrors(false);
    const shown = await measure();
    await setErrors(true);
    const masked = await measure();
    expect(shown.th.length).toBe(3);
    expect(shown.btnTop.length).toBe(2);
    shown.th.forEach((w, i) =>
      expect(
        Math.abs(w - masked.th[i]),
        `largeur de la colonne ${i + 1}`,
      ).toBeLessThanOrEqual(TOL),
    );
    shown.btnTop.forEach((t, i) =>
      expect(
        Math.abs(t - masked.btnTop[i]),
        `haut du bouton ${i + 1} de la ligne en erreur`,
      ).toBeLessThanOrEqual(TOL),
    );
  });

  /** Noms accessibles et erreurs reliées d'un tableau de saisie (fixture ou démo). */
  async function checkNames(page: Page, scope: string) {
    const data = await page.evaluate((scope) => {
      const out: {
        name: string;
        header: string;
        unique: boolean;
        describedOk: boolean | null;
      }[] = [];
      for (const table of document.querySelectorAll(
        `${scope} table.table-cards--editable`,
      )) {
        const heads = [...table.querySelectorAll("thead th")].map((th) =>
          (th.textContent || "").trim(),
        );
        const inputs = [
          ...table.querySelectorAll("input:not([type=hidden])"),
        ] as HTMLInputElement[];
        const names = inputs.map((i) => i.getAttribute("aria-label") || "");
        for (const input of inputs) {
          const td = input.closest("td") as HTMLTableCellElement;
          const name = input.getAttribute("aria-label") || "";
          let describedOk: boolean | null = null;
          if (input.getAttribute("aria-invalid") === "true") {
            const target = document.getElementById(
              input.getAttribute("aria-describedby") || "",
            );
            describedOk =
              !!target &&
              (target.textContent || "").trim().length > 0 &&
              target.closest("tr") === input.closest("tr");
          }
          out.push({
            name,
            header: heads[td.cellIndex],
            unique: names.filter((n) => n === name).length === 1,
            describedOk,
          });
        }
      }
      return out;
    }, scope);
    expect(data.length, "des champs mesurés").toBeGreaterThanOrEqual(2);
    for (const d of data) {
      expect(d.name.length, "nom accessible non vide").toBeGreaterThan(0);
      expect(d.unique, `nom « ${d.name} » unique dans le tableau`).toBe(true);
      expect(
        d.name.startsWith(d.header),
        `« ${d.name} » commence par l'en-tête « ${d.header} » (WCAG 2.5.3)`,
      ).toBe(true);
      if (d.describedOk !== null)
        expect(
          d.describedOk,
          `« ${d.name} » : aria-describedby vers un message non vide de la même ligne`,
        ).toBe(true);
    }
  }

  test("7. noms accessibles uniques, commençant par l'en-tête ; erreurs reliées (fixture)", async ({
    page,
  }) => {
    await open(page, FIXTURE, 1280);
    await checkNames(page, "#wrap");
    for (const n of SEQUENCE.filter((s) => /^(Nom|E-mail)/.test(s))) {
      await expect(
        page.getByRole("textbox", { name: n, exact: true }),
        n,
      ).toHaveCount(1);
    }
  });

  test("8. vitrine data.html#table-cards-editable à 375px : pas de défilement, un envoi ne navigue pas", async ({
    page,
  }) => {
    await open(page, DEMO, 375);
    const m = await page.evaluate(() => {
      const wraps = [
        ...document.querySelectorAll("#table-cards-editable .table-wrap"),
      ] as HTMLElement[];
      return {
        count: wraps.length,
        docScrollWidth: document.documentElement.scrollWidth,
        scroll: wraps.map((w) => w.scrollWidth <= w.clientWidth),
        btnOut: [
          ...document.querySelectorAll(
            "#table-cards-editable .table-cards-actions button",
          ),
        ].filter((b) => {
          const r = b.getBoundingClientRect();
          return r.left < 0 || r.right > 375;
        }).length,
      };
    });
    expect(m.count, "les 3 démos (#1061 : carte compacte)").toBe(3);
    expect(m.docScrollWidth).toBe(375);
    expect(m.scroll, "wrappers sans défilement").toEqual([true, true, true]);
    expect(m.btnOut, "boutons dans la fenêtre").toBe(0);
    await checkNames(page, "#table-cards-editable");
    const before = page.url();
    const save = page.getByRole("button", {
      name: "Enregistrer Alice Martin",
      exact: true,
    });
    await save.scrollIntoViewIfNeeded();
    await save.click();
    await page.waitForTimeout(150);
    expect(page.url(), "un envoi de la vitrine ne navigue pas").toBe(before);
  });
});
