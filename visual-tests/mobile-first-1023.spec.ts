/**
 * mobile-first-1023.spec.ts — deux défauts de cascade révélés par la réécriture mobile-first (#1023)
 *
 * Point 7 — le champ de recherche de `.filter-bar` échappait au repli mobile (arbitrage A9).
 *   `.filter-bar input[type="search"].input` (spécificité 0,3,1) battait la règle mobile
 *   `.filter-bar .filter-bar-search` (0,2,0) : sous 600 px le champ gardait `min-width: 200px`
 *   et `flex: 1 1 240px` dans une colonne flex, donc une base de 240 px EN HAUTEUR.
 *
 * Point 9 — `.progress-tracker--sm svg` : sous 600 px la règle `.progress-tracker svg` (120 px)
 *   écrasait la variante `--sm` (100 px). `--sm` était PLUS GRANDE sur mobile que sur desktop.
 *
 * Ce sont des défauts de rendu : jsdom n'applique aucune mise en page. La preuve est une mesure
 * (`getBoundingClientRect`, `getComputedStyle`) dans un vrai navigateur, aux deux côtés du seuil
 * composant (600 px : le bloc desktop commence à `min-width: 600.02px`).
 *
 * Les TÉMOINS rendent la mesure capable d'échouer : un select voisin donne la hauteur attendue
 * d'un champ (aucun nombre en dur), et l'anneau `.progress-tracker` standard doit rester à 120 px
 * sous le seuil (la règle mobile existe toujours, seule `--sm` en est sortie).
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : la largeur est posée par le test lui-même,
 * les 10 projets de la matrice VR ne couvriraient rien de plus.
 *
 * Preuve par mutation (consignée dans la PR) :
 *   - point 7 : ancienne règle `.filter-bar input[type="search"].input { flex: 1 1 240px; min-width: 200px }`
 *               remise en base → les cas « sous 600 px » sont rouges (hauteur 240 px au lieu de celle d'un select) ;
 *   - point 9 : base `.progress-tracker--sm svg` remise à 120 px → le cas 375 px est rouge ;
 *   - point 9 : règle `--sm` retirée du bloc 600.02px SANS la déplacer après lui
 *               → les cas ≥ 601 px sont rouges (`.progress-tracker svg` à 160 px la rattrape).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const PAGE_FORMULAIRES = "/pages/formulaires.html";
const FIXTURE = "/visual-tests/fixtures/mobile-first-1023.html";

/** Un cran de chaque côté du seuil composant (600 px) + les largeurs de référence. */
const SOUS_LE_SEUIL = [375, 599, 600] as const;
const AU_DESSUS_DU_SEUIL = [601, 768, 1280] as const;

async function ouvrir(page: Page, url: string, largeur: number) {
  await page.setViewportSize({ width: largeur, height: 800 });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("msyx-theme", "msyx");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

type MesureBarre = {
  hauteurRecherche: number;
  hauteurSelect: number;
  largeurRecherche: number;
  largeurBarre: number;
  flexBasis: string;
  minWidth: string;
};

/** Mesure le champ de recherche d'une barre et le premier select de la MÊME barre (témoin). */
async function mesurerBarre(
  page: Page,
  barre: string,
  recherche: string,
): Promise<MesureBarre> {
  return page.evaluate(
    ({ b, r }: { b: string; r: string }) => {
      const barreEl = document.querySelector(b) as HTMLElement;
      const champ = barreEl.querySelector(r) as HTMLElement;
      const select = barreEl.querySelector("select") as HTMLElement;
      const cs = getComputedStyle(champ);
      return {
        hauteurRecherche: champ.getBoundingClientRect().height,
        hauteurSelect: select.getBoundingClientRect().height,
        largeurRecherche: champ.getBoundingClientRect().width,
        largeurBarre: barreEl.clientWidth,
        flexBasis: cs.flexBasis,
        minWidth: cs.minWidth,
      };
    },
    { b: barre, r: recherche },
  );
}

test.describe("point 7 — champ de recherche de .filter-bar (#1023, A9)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      "joué une seule fois : la largeur est posée par le test",
    );
  });

  for (const largeur of SOUS_LE_SEUIL) {
    test(`vitrine, ${largeur} px : le champ .filter-bar-search se replie comme les autres champs`, async ({
      page,
    }) => {
      await ouvrir(page, PAGE_FORMULAIRES, largeur);
      const barres = page.locator("#filter-bar .filter-bar");
      const nombre = await barres.count();
      expect(nombre).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < nombre; i++) {
        const m = await barres.nth(i).evaluate((barre) => {
          const champ = barre.querySelector(
            ".filter-bar-search",
          ) as HTMLElement;
          const select = barre.querySelector("select") as HTMLElement;
          const cs = getComputedStyle(champ);
          return {
            hauteurRecherche: champ.getBoundingClientRect().height,
            hauteurSelect: select.getBoundingClientRect().height,
            largeurRecherche: champ.getBoundingClientRect().width,
            largeurBarre: barre.clientWidth,
            flexBasis: cs.flexBasis,
            minWidth: cs.minWidth,
          };
        });
        // Hauteur d'un champ de formulaire, pas une base de 240 px en colonne (CA11).
        expect(
          Math.abs(m.hauteurRecherche - m.hauteurSelect),
        ).toBeLessThanOrEqual(1);
        expect(m.flexBasis).toBe("auto");
        expect(m.minWidth).toBe("0px");
        // Pleine largeur de la barre, comme les selects.
        expect(
          Math.abs(m.largeurRecherche - m.largeurBarre),
        ).toBeLessThanOrEqual(1);
      }
    });
  }

  for (const largeur of AU_DESSUS_DU_SEUIL) {
    test(`vitrine, ${largeur} px : en ligne, base 240 px et plancher 200 px conservés`, async ({
      page,
    }) => {
      await ouvrir(page, PAGE_FORMULAIRES, largeur);
      const m = await page
        .locator("#filter-bar .filter-bar")
        .first()
        .evaluate((barre) => {
          const champ = barre.querySelector(
            ".filter-bar-search",
          ) as HTMLElement;
          const select = barre.querySelector("select") as HTMLElement;
          const cs = getComputedStyle(champ);
          return {
            hauteurRecherche: champ.getBoundingClientRect().height,
            hauteurSelect: select.getBoundingClientRect().height,
            largeurRecherche: champ.getBoundingClientRect().width,
            flexBasis: cs.flexBasis,
            minWidth: cs.minWidth,
          };
        });
      expect(m.flexBasis).toBe("240px");
      expect(m.minWidth).toBe("200px");
      expect(m.largeurRecherche).toBeGreaterThanOrEqual(200);
      expect(
        Math.abs(m.hauteurRecherche - m.hauteurSelect),
      ).toBeLessThanOrEqual(1);
    });
  }

  for (const largeur of [...SOUS_LE_SEUIL, ...AU_DESSUS_DU_SEUIL]) {
    test(`fixture, ${largeur} px : le champ sans .filter-bar-search suit la même règle`, async ({
      page,
    }) => {
      await ouvrir(page, FIXTURE, largeur);
      const m = await mesurerBarre(
        page,
        "#barre-sans-classe",
        'input[type="search"]',
      );
      expect(
        Math.abs(m.hauteurRecherche - m.hauteurSelect),
      ).toBeLessThanOrEqual(1);
      if (largeur <= 600) {
        expect(m.flexBasis).toBe("auto");
        expect(m.minWidth).toBe("0px");
      } else {
        expect(m.flexBasis).toBe("240px");
        expect(m.minWidth).toBe("200px");
      }
    });
  }
});

test.describe("point 9 — .progress-tracker--sm (#1023)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      "joué une seule fois : la largeur est posée par le test",
    );
  });

  /** Largeur et hauteur rendues du `<svg>` d'un anneau. */
  async function tailleSvg(page: Page, id: string) {
    return page.locator(`#${id} svg`).evaluate((svg) => {
      const r = svg.getBoundingClientRect();
      return { largeur: r.width, hauteur: r.height };
    });
  }

  for (const largeur of [...SOUS_LE_SEUIL, ...AU_DESSUS_DU_SEUIL]) {
    test(`${largeur} px : --sm fait 100 px de côté, plus petit que l'anneau standard`, async ({
      page,
    }) => {
      await ouvrir(page, FIXTURE, largeur);
      const sm = await tailleSvg(page, "anneau-sm");
      const md = await tailleSvg(page, "anneau-md");
      const multi = await tailleSvg(page, "anneau-multi");
      expect(sm).toEqual({ largeur: 100, hauteur: 100 });
      // Témoins : la mesure sait échouer, les autres anneaux gardent leur règle mobile.
      const dessus = largeur > 600;
      expect(md).toEqual({
        largeur: dessus ? 160 : 120,
        hauteur: dessus ? 160 : 120,
      });
      expect(multi).toEqual({
        largeur: dessus ? 200 : 160,
        hauteur: dessus ? 200 : 160,
      });
      expect(sm.largeur).toBeLessThan(md.largeur);
    });
  }
});
