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
 *   CA2 — à 375 px, sur les mêmes pages et la fixture, chaque `.btn-*` (7 variantes), `.btn-sm`,
 *         `.btn-xs`, `.btn-lg`, `.input`, `.dropdown-trigger`, `.checkbox` et `.radio` visible fait
 *         44 px de haut au moins ; chaque `.btn-sm`/`.btn-xs` 44 px de large au moins (la fixture
 *         porte des libellés courts : « OK », « + »). Plancher de contrôles mesurés.
 *   CA3 — `pages/data.html` `#table-cards` : les actions hors `.btn-icon` font 44×44 en mode
 *         tableau (1280 px, cellule en `table-cell` : garde) comme en mode cartes (375 px).
 *   CA4 — fixture : balayage `elementFromPoint` au pas de 0,5 px. Chaque `.chip-close` est
 *         atteint sur 44 px au moins le long de ses deux médianes (tolérance d'un pas), garde sa
 *         taille visuelle de 17,6 px, et aucun point d'une puce B n'est résolu vers la croix d'une
 *         puce A. Garde : chaque groupe de puces passe à la ligne (sinon pas de rangée voisine).
 *   CA6 — à 1280 px, au pointeur fin (contexte par défaut du projet), les dimensions mesurées
 *         sur `main` le 2026-10-05 n'ont pas bougé.
 *
 * Joué dans UN seul projet (`msyx-dark-mobile`) : ni le thème ni le mode ne changent une
 * police ou une boîte. Chaque cas pose son propre viewport.
 *
 * Preuve par mutation (tranche 1, jouée le 2026-10-05, consignée dans le commit puis dans la PR) :
 *   (a) `.input` retiré du bloc coarse de police de `forms.css` → CA1 rouge (54 champs, 21
 *       signatures à 14,4 px : `input.input`, `select.input`, `textarea.input`…) ;
 *   (b) règle `:where(…)` retirée → CA1 rouge (10 champs sans classe à 13,33 px, dans
 *       `.date-input-wrap` et `.number-input-wrap`) ;
 *   (i) `(pointer: coarse)` → `(min-width: 1px)` dans `forms.css` → CA6 rouge (`.input` à 16 px
 *       au bureau).
 *
 * Preuve par mutation (tranche 2, jouée le 2026-10-05) :
 *   (c) + min-height de `.input`/`.dropdown-trigger` : bloc coarse de `buttons.css` neutralisé ET
 *       règle `.input, .dropdown-trigger { min-height }` retirée de `forms.css` → CA2 rouge
 *       (127 fautifs : `.btn-sm` 29,38 px, `.btn-xs` 32 px de haut et 32,38 px de large,
 *       `.btn-primary` 41 px, `select.input` 43 px, `input.input` 34,78 px) ;
 *   (d) + (e) : bloc coarse de `tables.css` neutralisé ET `.chip-close::after` retiré → CA3 rouge
 *       (« Copier le lien » à 29,38 px de haut à 1280 px : la restauration 768 bat le bloc des
 *       boutons) et CA4 rouge (18 zones de 18×18,5 px) ;
 *   (f) `row-gap` de `.chip-group:has(.chip-close)` retiré → CA4 rouge (12 recouvrements entre
 *       rangées de `.chip-sm`, ex. « Alpha ← croix de Epsilon » ; zones amputées à 32,5 px).
 *       Puces par défaut : aucun point de leur boîte n'est capté par une voisine (7 px de débord
 *       contre 8 px de gap, comme la spec le calculait), mais leurs zones se chevauchent dans
 *       l'interstice (amputées à 40 px de haut) : le cas de zone rougit aussi pour elles.
 *
 * Hors portée, signalé à part (annotation du rapport) : les champs dont la police est écrite en
 * style inline. Au 2026-10-05, 4 démos natives de `composants.html` (« Reset natif » et
 * « Disabled global », 13,6 px). La CSS du DS ne peut pas les battre sans `!important`, que la
 * spec interdit : c'est la démo qu'il faut corriger, pas la règle.
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
/** Fixture : puces fermables qui passent à la ligne, boutons `.btn-xs`/`.btn-sm` à libellé court. */
const FIXTURE = "/visual-tests/fixtures/touch-targets-1051.html";
/** CA2 — hauteur ≥ 44 px : les 7 variantes, les tailles, les champs et les cases. */
const SEL_HAUTEUR = [
  ".btn-primary",
  ".btn-secondary",
  ".btn-ghost",
  ".btn-danger",
  ".btn-success",
  ".btn-warning",
  ".btn-outline-danger",
  ".btn-sm",
  ".btn-xs",
  ".btn-lg",
  ".input",
  ".dropdown-trigger",
  ".checkbox",
  ".radio",
].join(", ");
/** CA2 — largeur ≥ 44 px : les tailles qui descendraient en dessous avec un libellé court. */
const SEL_LARGEUR = ".btn-sm, .btn-xs";
/** Plancher de contrôles mesurés en hauteur (CA2), toutes pages confondues. */
const CA2_FLOOR = 150;

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

  test("CA2. 375 px : boutons, champs et cases font 44 px de haut, .btn-sm/.btn-xs 44 px de large", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const fautifs: string[] = [];
    let hauteurs = 0;
    let largeurs = 0;
    for (const url of [...PAGES, FIXTURE]) {
      await ouvrir(page, url, 375);
      expect(
        (await pointeur(page)).coarse,
        `${url} : l'émulation tactile n'est pas active (pointer: coarse faux)`,
      ).toBe(true);
      const boites = await page.evaluate(
        ({ haut, large }) => {
          const visibles = (sel: string) =>
            [...document.querySelectorAll<HTMLElement>(sel)]
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
                w: el.getBoundingClientRect().width,
                h: el.getBoundingClientRect().height,
              }));
          return { haut: visibles(haut), large: visibles(large) };
        },
        { haut: SEL_HAUTEUR, large: SEL_LARGEUR },
      );
      hauteurs += boites.haut.length;
      largeurs += boites.large.length;
      for (const b of boites.haut)
        if (b.h < TARGET - 0.01)
          fautifs.push(`${url} / ${b.sig} / hauteur ${b.h.toFixed(2)}px`);
      for (const b of boites.large)
        if (b.w < TARGET - 0.01)
          fautifs.push(`${url} / ${b.sig} / largeur ${b.w.toFixed(2)}px`);
    }
    console.log(
      `[touch-targets-1051 CA2] ${hauteurs} hauteurs et ${largeurs} largeurs mesurées, ${fautifs.length} fautifs`,
    );
    expect(
      hauteurs,
      `plancher : ${CA2_FLOOR} contrôles mesurés au moins (sinon le test passe à vide)`,
    ).toBeGreaterThanOrEqual(CA2_FLOOR);
    expect(
      largeurs,
      "plancher : les 7 boutons courts de la fixture au moins",
    ).toBeGreaterThanOrEqual(7);
    expect([...new Set(fautifs)], `cibles sous ${TARGET}px`).toEqual([]);
  });

  test("CA3. Tableau en cartes : actions à 44×44 en mode tableau (1280 px) comme en cartes (375 px)", async ({
    page,
  }) => {
    for (const [width, mode] of [
      [1280, "table-cell"],
      [375, "flex"],
    ] as const) {
      await ouvrir(page, "/pages/data.html", width);
      expect((await pointeur(page)).coarse, "pointer: coarse actif").toBe(true);
      const mesure = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            '#table-cards .table-cards-actions :is(button, a, [role="button"]):not(.btn-icon)',
          ),
        ].map((el) => ({
          label: el.getAttribute("aria-label") ?? el.textContent?.trim(),
          cell: getComputedStyle(el.closest(".table-cards-actions")!).display,
          w: el.getBoundingClientRect().width,
          h: el.getBoundingClientRect().height,
        })),
      );
      expect(
        mesure.length,
        `${width}px : au moins 3 actions mesurées`,
      ).toBeGreaterThanOrEqual(3);
      for (const m of mesure) {
        // Garde : sans elle, le cas « mode tableau » passerait en mode cartes (44 px depuis #1008).
        expect(m.cell, `${width}px : cellule d'actions en ${mode}`).toBe(mode);
        expect(
          m.h,
          `${width}px / ${m.label} : ${m.h}px de haut`,
        ).toBeGreaterThanOrEqual(TARGET - 0.01);
        expect(
          m.w,
          `${width}px / ${m.label} : ${m.w}px de large`,
        ).toBeGreaterThanOrEqual(TARGET - 0.01);
      }
    }
  });

  test("CA4. Croix des puces : zone de 44 px, aucun recouvrement entre puces", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await ouvrir(page, FIXTURE, 375);
    expect((await pointeur(page)).coarse, "pointer: coarse actif").toBe(true);
    const r = await page.evaluate((target) => {
      const PAS = 0.5;
      const nom = (chip: Element) => chip.textContent!.replace("×", "").trim();
      const croixEn = (x: number, y: number) =>
        document.elementFromPoint(x, y)?.closest(".chip-close") ?? null;
      const zones: string[] = [];
      const boites: string[] = [];
      const recouvrements = new Set<string>();
      const rangees: Record<string, number> = {};
      for (const groupe of document.querySelectorAll(".chip-group")) {
        rangees[groupe.id] = new Set(
          [...groupe.querySelectorAll(".chip")].map((c) =>
            Math.round(c.getBoundingClientRect().top),
          ),
        ).size;
      }
      for (const close of document.querySelectorAll<HTMLElement>(".chip-close")) {
        const chip = close.closest(".chip")!;
        const b = close.getBoundingClientRect();
        // Taille VISUELLE inchangée : la zone vient du ::after, pas d'une boîte agrandie.
        if (Math.abs(b.width - 17.6) > 1 || Math.abs(b.height - 17.6) > 1)
          boites.push(`${nom(chip)} : ${b.width}×${b.height}`);
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        // Étendue contiguë autour du centre, sur les deux médianes de la croix, au pas de 0,5 px.
        const etendue = (dx: number, dy: number) => {
          let n = 0;
          while (
            n < 200 &&
            croixEn(cx + dx * (n + 1) * PAS, cy + dy * (n + 1) * PAS) === close
          )
            n++;
          return n * PAS;
        };
        const largeur = etendue(-1, 0) + etendue(1, 0) + PAS;
        const hauteur = etendue(0, -1) + etendue(0, 1) + PAS;
        if (largeur < target - PAS || hauteur < target - PAS)
          zones.push(`${nom(chip)} : zone ${largeur}×${hauteur}`);
      }
      // Aucun point d'une puce B (croix comprise) ne doit être résolu vers la croix d'une puce A.
      for (const chip of document.querySelectorAll<HTMLElement>(".chip")) {
        const c = chip.getBoundingClientRect();
        for (let y = c.top + PAS / 2; y < c.bottom; y += PAS)
          for (let x = c.left + PAS / 2; x < c.right; x += PAS) {
            const croix = croixEn(x, y);
            if (croix && !chip.contains(croix))
              recouvrements.add(
                `${nom(chip)} ← croix de ${nom(croix.closest(".chip")!)}`,
              );
          }
      }
      return {
        zones,
        boites,
        recouvrements: [...recouvrements],
        rangees,
        n: document.querySelectorAll(".chip-close").length,
      };
    }, TARGET);
    console.log(
      `[touch-targets-1051 CA4] ${r.n} croix, rangées ${JSON.stringify(r.rangees)}`,
    );
    expect(r.n, "18 croix dans la fixture").toBe(18);
    // Garde : sans passage à la ligne, le recouvrement entre rangées ne serait jamais éprouvé.
    expect(
      r.rangees["chips-defaut"],
      "puces par défaut sur 2 rangées au moins",
    ).toBeGreaterThanOrEqual(2);
    expect(
      r.rangees["chips-sm"],
      "puces .chip-sm sur 2 rangées au moins",
    ).toBeGreaterThanOrEqual(2);
    expect.soft(
      r.boites,
      ".chip-close garde sa taille visuelle de 17,6×17,6 (±1)",
    ).toEqual([]);
    expect.soft(r.zones, `zone de chaque croix ≥ ${TARGET}px (pas de 0,5 px)`).toEqual(
      [],
    );
    expect(
      r.recouvrements,
      "aucune croix ne capte le toucher d'une autre puce",
    ).toEqual([]);
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
