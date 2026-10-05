/**
 * touch-targets-1051.spec.ts — contrôles tactiles sous pointeur grossier (#1051)
 *
 * Sur téléphone, Safari iOS zoome la page dès qu'on touche un champ dont la police fait moins
 * de 16 px. Sous `@media (pointer: coarse)`, chaque champ du DS passe donc à 16 px au moins
 * (`--input-font-size-touch`), et les cibles tactiles à 44 px (`--touch-target`). Au pointeur
 * fin (souris), rien ne change.
 *
 * Défaut de MISE EN PAGE et de calcul de style : jsdom n'applique ni les media queries de
 * pointeur ni la géométrie, la preuve se fait dans un vrai navigateur (règle N1). Émulation
 * tactile = `hasTouch` + `isMobile` : Chromium passe alors `(pointer: coarse)` à vrai. Chaque
 * cas tactile le vérifie avant de mesurer (sinon le test passerait à vide au pointeur fin).
 *
 * Cas (critères d'acceptation de la spec #1051) :
 *   CA1 — à 375 px, sur `site.html` et chaque `pages/*.html`, aucun champ visible (`input`
 *         hors cases, radios, curseurs, fichiers, couleurs, boutons ; `select` ; `textarea` ;
 *         `[contenteditable="true"]`) n'a une police calculée inférieure à 16 px. Le test liste
 *         chaque fautif (`page / signature / taille`) et impose un plancher de champs mesurés
 *         pour ne jamais passer à vide.
 *   CA2 (partiel, tranche 1) — à 375 px, chaque `.input` et `.dropdown-trigger` visible fait
 *         44 px de haut au moins. Boutons, `.checkbox` et `.radio` : tranche 2.
 *   CA6 — à 1280 px, au pointeur fin (contexte par défaut du projet), les dimensions mesurées
 *         sur `main` le 2026-10-05 n'ont pas bougé.
 *
 * Joué dans UN seul projet (`msyx-dark-mobile`) : ni le thème ni le mode ne changent une
 * police ou une boîte. Chaque cas pose son propre viewport.
 *
 * Preuve par mutation (tranche 1, consignée dans le commit puis dans la PR) :
 *   (a) `.input` retiré du bloc coarse de police de `forms.css` → CA1 rouge (14,4 px) ;
 *   (b) règle `:where(…)` retirée → CA1 rouge sur les champs sans classe (13,3 px) ;
 *   (i) `(pointer: coarse)` → `(min-width: 1px)` dans `forms.css` → CA6 rouge (`.input` à 16 px).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-mobile";
const TARGET = 44;
const FONT_MIN = 16;
/** Plancher de champs mesurés sur l'ensemble des pages : le test ne doit jamais passer à vide. */
const FIELDS_FLOOR = 150;
/** Hauteur de `.input` au pointeur fin, relevée sur `main` (86b50e8) avant #1051. */
const INPUT_H = 43;

const PAGES = [
  "/site.html",
  ...fs
    .readdirSync(path.resolve(__dirname, "..", "pages"))
    .filter((f) => f.endsWith(".html"))
    .sort()
    .map((f) => `/pages/${f}`),
];

async function ouvrir(page: Page, url: string, width: number) {
  await page.setViewportSize({ width, height: 667 });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("msyx-theme", "msyx");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

async function pointeur(page: Page) {
  return page.evaluate(() => ({
    coarse: matchMedia("(pointer: coarse)").matches,
    fine: matchMedia("(pointer: fine)").matches,
  }));
}

type Champ = { sig: string; size: number; inline: boolean };

/** Police calculée de chaque champ visible de la page. */
async function champs(page: Page): Promise<Champ[]> {
  return page.evaluate(() => {
    const EXCLUS = new Set([
      "checkbox",
      "radio",
      "range",
      "file",
      "color",
      "hidden",
      "submit",
      "button",
      "reset",
      "image",
    ]);
    const out: { sig: string; size: number; inline: boolean }[] = [];
    const els = document.querySelectorAll<HTMLElement>(
      'input, select, textarea, [contenteditable="true"]',
    );
    for (const el of els) {
      if (el instanceof HTMLInputElement && EXCLUS.has(el.type)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (!el.checkVisibility({ checkOpacity: true, visibilityProperty: true }))
        continue;
      const type = el instanceof HTMLInputElement ? `[${el.type}]` : "";
      const cls = [...el.classList].map((c) => `.${c}`).join("");
      const parent = el.parentElement?.classList[0];
      out.push({
        sig: `${el.tagName.toLowerCase()}${type}${cls}${cls ? "" : parent ? ` (dans .${parent})` : ""}`,
        size: parseFloat(getComputedStyle(el).fontSize),
        // Police posée par l'attribut `style` : hors de portée d'une feuille de style sans
        // !important (que la spec interdit). Signalé à part, jamais compté comme conforme.
        inline: el.style.fontSize !== "",
      });
    }
    return out;
  });
}

test.describe("Pointeur grossier — champs à 16 px, cibles à 44 px (#1051)", () => {
  test.use({ hasTouch: true, isMobile: true });

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de style et de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  test("CA1. 375 px : aucun champ visible n'a une police < 16 px", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const fautifs: string[] = [];
    const horsPortee: string[] = [];
    let mesures = 0;
    for (const url of PAGES) {
      await ouvrir(page, url, 375);
      expect(
        (await pointeur(page)).coarse,
        `${url} : l'émulation tactile n'est pas active (pointer: coarse faux)`,
      ).toBe(true);
      const liste = await champs(page);
      for (const c of liste) {
        const ligne = `${url} / ${c.sig} / ${c.size}px`;
        if (c.inline) {
          if (c.size < FONT_MIN - 0.01) horsPortee.push(ligne);
          continue;
        }
        mesures++;
        if (c.size < FONT_MIN - 0.01) fautifs.push(ligne);
      }
    }
    console.log(
      `[touch-targets-1051 CA1] ${mesures} champs mesurés sur ${PAGES.length} pages, ${fautifs.length} fautifs`,
    );
    // Démos de la vitrine dont la police est écrite en style inline : la CSS du DS ne peut pas
    // les corriger. Listées dans le rapport pour rester visibles, jamais ajoutées aux conformes.
    if (horsPortee.length)
      test.info().annotations.push({
        type: "hors portée de la CSS DS (font-size inline)",
        description: horsPortee.join("\n"),
      });
    console.log(
      `[touch-targets-1051 CA1] ${horsPortee.length} champs à police inline (hors portée) :\n${horsPortee.join("\n")}`,
    );
    expect(
      mesures,
      `plancher : ${FIELDS_FLOOR} champs mesurés au moins (sinon le test passe à vide)`,
    ).toBeGreaterThanOrEqual(FIELDS_FLOOR);
    expect(
      [...new Set(fautifs)],
      `champs sous ${FONT_MIN}px (zoom iOS au focus)`,
    ).toEqual([]);
  });

  test("CA2 (tranche 1). 375 px : .input et .dropdown-trigger font 44 px de haut", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const fautifs: string[] = [];
    let mesures = 0;
    for (const url of [
      "/pages/formulaires.html",
      "/pages/user-feedback.html",
    ]) {
      await ouvrir(page, url, 375);
      expect((await pointeur(page)).coarse, "pointer: coarse actif").toBe(true);
      const boites = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".input, .dropdown-trigger")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.height > 0 &&
              el.checkVisibility({
                checkOpacity: true,
                visibilityProperty: true,
              })
            );
          })
          .map((el) => ({
            sig: `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`,
            h: el.getBoundingClientRect().height,
          })),
      );
      mesures += boites.length;
      for (const b of boites) {
        if (b.h < TARGET - 0.01)
          fautifs.push(`${url} / ${b.sig} / ${b.h.toFixed(2)}px`);
      }
    }
    expect(
      mesures,
      "au moins 20 champs .input/.dropdown-trigger mesurés",
    ).toBeGreaterThanOrEqual(20);
    expect([...new Set(fautifs)], `boîtes sous ${TARGET}px de haut`).toEqual(
      [],
    );
  });
});

test.describe("Pointeur fin — rien ne change au bureau (#1051)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `mesure de style et de mise en page, jouée une seule fois (${PROJECT})`,
    );
  });

  /** Boîte et police du premier élément visible qui correspond au sélecteur. */
  async function premier(page: Page, selecteur: string) {
    return page.evaluate((sel) => {
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && el.checkVisibility())
          return {
            w: r.width,
            h: r.height,
            font: parseFloat(getComputedStyle(el).fontSize),
          };
      }
      return null;
    }, selecteur);
  }

  test("CA6. 1280 px au pointeur fin : boutons, champs, puces et en-tête inchangés", async ({
    page,
  }) => {
    await ouvrir(page, "/pages/composants.html", 1280);
    const p = await pointeur(page);
    expect(p, "contexte de bureau : pointer fine, pas coarse").toEqual({
      coarse: false,
      fine: true,
    });

    const btnSm = await premier(page, ".btn-sm");
    expect(btnSm, ".btn-sm présent").not.toBeNull();
    expect(Math.abs(btnSm!.h - 29.4), `.btn-sm : 29,4 px de haut (±1), mesuré ${btnSm!.h}`).toBeLessThanOrEqual(1);

    const chip = await premier(page, ".chip-close");
    expect(chip, ".chip-close présent").not.toBeNull();
    expect(Math.abs(chip!.w - 17.6), `.chip-close : 17,6 px de large (±1), mesuré ${chip!.w}`).toBeLessThanOrEqual(1);
    expect(Math.abs(chip!.h - 17.6), `.chip-close : 17,6 px de haut (±1), mesuré ${chip!.h}`).toBeLessThanOrEqual(1);

    const notif = await premier(page, ".site-header .header-notification");
    expect(notif, ".header-notification présent").not.toBeNull();
    expect([notif!.w, notif!.h], ".header-notification : 34×34").toEqual([
      34, 34,
    ]);

    const mode = await premier(page, ".site-header .mode-switch");
    expect(mode, ".site-header .mode-switch présent").not.toBeNull();
    expect([mode!.w, mode!.h], ".site-header .mode-switch : 60×36").toEqual([
      60, 36,
    ]);

    await ouvrir(page, "/pages/formulaires.html", 1280);
    const input = await premier(page, 'input[type="text"].input');
    expect(input, 'input[type="text"].input présent').not.toBeNull();
    expect(Math.abs(input!.font - 14.4), `.input : police 14,4 px (±0,1), mesuré ${input!.font}`).toBeLessThanOrEqual(0.1);
    expect(Math.abs(input!.h - INPUT_H), `.input : ${INPUT_H} px de haut (±1), mesuré ${input!.h}`).toBeLessThanOrEqual(1);
  });
});
