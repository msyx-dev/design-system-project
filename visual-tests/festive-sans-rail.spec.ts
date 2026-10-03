/**
 * festive-sans-rail.spec.ts — Le decor festif n'est decale que si une barre laterale est a l'ecran (#1011).
 *
 * Defaut : `.garland--header` et `.ornaments` (festive.css) se decalaient de
 * `var(--sidebar-w)`, resolu a `:root` (260px), alors que le decor est rendu HORS de
 * `<main>` — `.main--no-rail` (layout.css) ne ramene le token a 0 que sur `<main>`.
 * Un consumer sans rail ni sidebar (tirokado) voyait donc guirlande et boules decalees
 * de 260px vers la droite (a 375px : tassees dans les 115px de droite). Mesure en vrai
 * navigateur : le decalage existait AUSSI sur la vitrine a 375px, ou la sidebar est
 * poussee hors ecran mais `--sidebar-w` reste a 260px (le commentaire de festive.css
 * affirmait le contraire).
 *
 * Correctif : `--festive-inset-start` (festive.css), pose sur `:root` seulement si une
 * barre laterale DS (`.sidebar`, `.rail-sidebar--fixed`) est dans le DOM ET a l'ecran
 * (au-dela de 768px), consommee par `.garland--header` et `.ornaments` (repli 0).
 *
 * Pourquoi un vrai navigateur et pas jsdom : un decalage est un fait de MISE EN PAGE
 * (`position: fixed`, cascade des proprietes personnalisees par element). jsdom ne
 * calcule aucune geometrie — il laisserait passer le defaut.
 *
 * Garde-fous (sans eux le test passerait pour la mauvaise raison) :
 *  - le theme rendu est bien `noel` (sinon le decor est `display: none`) ;
 *  - la guirlande et les boules existent et ont une boite non vide ;
 *  - cas « sans rail » : AUCUNE barre laterale dans le DOM, et `--sidebar-w` vaut bien
 *    260px a `:root` — c'est la condition qui provoquait le defaut ;
 *  - cas « avec sidebar » : la sidebar est bien a l'ecran (ou bien hors ecran, selon le cas).
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : theme, mode et largeur sont poses par
 * le test lui-meme (`localStorage` avant le chargement, `setViewportSize`), la matrice des
 * 12 projets le rejouerait 12 fois sans rien couvrir de plus.
 *
 * Preuve par mutation : retirer le conditionnement de `--festive-inset-start` dans
 * festive.css (le poser inconditionnellement a `var(--sidebar-w)`) rend rouges les cas
 * « sans rail », « rail non fixe » et « sidebar hors ecran » ; les cas « sidebar a
 * l'ecran » restent verts (c'est le comportement inchange).
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/festive-sans-rail-1011.html";
const SHOWCASE = "/pages/feedback.html";

const GARLAND = ".garland--header";
const ORNAMENTS = ".ornaments";
const ORNAMENT = ".ornament";

// Largeur de la sidebar DS (`--sidebar-w`, tokens.css) et du rail deploye (`--rail-w`).
const SIDEBAR_PX = 260;
// Tolerance d'arrondi de la mise en page (sous-pixel).
const EPS = 1;

async function openPage(page: Page, url: string, width: number) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("msyx-theme", "noel");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.setViewportSize({ width, height: 800 });
  // Pas d'animation : le balancement des boules ne fausse pas la mesure de leur boite.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  // Garde-fou : le theme demande est bien celui rendu (attribut absent = msyx).
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.getAttribute("data-theme") ?? "msyx",
      ),
    )
    .toBe("noel");
}

interface Measure {
  innerWidth: number;
  garland: { left: number; right: number; width: number };
  ornaments: { left: number; right: number; width: number };
  ornamentCount: number;
  /** Ecart max entre la position reelle d'une boule et `left: N%` de la fenetre. */
  ornamentMaxDelta: number;
  rootSidebarW: string;
  counts: { sidebar: number; rail: number };
  /** Bord droit de la barre laterale rendue (null si aucune), 0 = hors ecran. */
  barRight: number | null;
}

const measure = (page: Page): Promise<Measure> =>
  page.evaluate(
    ({ garlandSel, ornamentsSel, ornamentSel }) => {
      const box = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`introuvable : ${sel}`);
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      };
      const garland = box(garlandSel);
      const ornaments = box(ornamentsSel);

      // Chaque boule est posee a `left: N%` de son conteneur : si le conteneur est aligne sur
      // la fenetre, N% du conteneur = N% de la fenetre. `offsetLeft` ignore la rotation du
      // balancement, contrairement a getBoundingClientRect.
      let maxDelta = 0;
      const balls = Array.from(
        document.querySelectorAll<HTMLElement>(ornamentSel),
      );
      for (const b of balls) {
        const pct = parseFloat(b.style.left);
        const expected = (pct / 100) * window.innerWidth;
        const actual = ornaments.left + b.offsetLeft;
        maxDelta = Math.max(maxDelta, Math.abs(actual - expected));
      }

      const bar = document.querySelector(".sidebar, .rail-sidebar--fixed");
      return {
        innerWidth: window.innerWidth,
        garland,
        ornaments,
        ornamentCount: balls.length,
        ornamentMaxDelta: maxDelta,
        rootSidebarW: getComputedStyle(document.documentElement)
          .getPropertyValue("--sidebar-w")
          .trim(),
        counts: {
          sidebar: document.querySelectorAll(".sidebar").length,
          rail: document.querySelectorAll(".rail-sidebar").length,
        },
        barRight: bar ? bar.getBoundingClientRect().right : null,
      };
    },
    { garlandSel: GARLAND, ornamentsSel: ORNAMENTS, ornamentSel: ORNAMENT },
  );

/** Garde-fou commun : le decor est la, rendu, avec une boite non vide. */
async function expectDecorRendered(page: Page, m: Measure) {
  await expect(page.locator(GARLAND)).toBeVisible();
  await expect(page.locator(ORNAMENTS)).toHaveCount(1);
  expect(m.garland.width, "la guirlande a une largeur").toBeGreaterThan(0);
  expect(m.ornaments.width, "les boules ont un conteneur").toBeGreaterThan(0);
  expect(m.ornamentCount, "des boules sont rendues").toBeGreaterThan(0);
}

/** Decor cale sur la fenetre entiere : bord gauche a 0, bord droit = largeur de la fenetre. */
function expectAlignedOnWindow(m: Measure) {
  expect(m.garland.left, "bord gauche de la guirlande").toBeCloseTo(0, 0);
  expect(m.garland.right, "bord droit de la guirlande").toBeCloseTo(
    m.innerWidth,
    0,
  );
  expect(m.ornaments.left, "bord gauche des boules").toBeCloseTo(0, 0);
  expect(m.ornaments.right, "bord droit des boules").toBeCloseTo(
    m.innerWidth,
    0,
  );
  expect(
    m.ornamentMaxDelta,
    "chaque boule est a N% de la fenetre",
  ).toBeLessThanOrEqual(EPS);
}

/** Decor decale de la largeur de la barre laterale : il commence a son bord droit. */
function expectOffsetBySidebar(m: Measure) {
  expect(m.garland.left, "bord gauche de la guirlande").toBeCloseTo(
    SIDEBAR_PX,
    0,
  );
  expect(m.garland.right, "bord droit de la guirlande").toBeCloseTo(
    m.innerWidth,
    0,
  );
  expect(m.ornaments.left, "bord gauche des boules").toBeCloseTo(SIDEBAR_PX, 0);
  expect(m.ornaments.right, "bord droit des boules").toBeCloseTo(
    m.innerWidth,
    0,
  );
}

test.describe("Decor festif — decale seulement si une barre laterale est a l'ecran (#1011)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `theme, mode et largeur sont poses par le test : un seul projet (${PROJECT})`,
    );
  });

  // 1. Sans rail ni sidebar : le defaut du ticket.
  for (const width of [375, 768, 1280]) {
    test(`sans rail ni sidebar @${width}px : guirlande et boules alignees sur la fenetre`, async ({
      page,
    }) => {
      await openPage(page, FIXTURE, width);
      const m = await measure(page);

      await expectDecorRendered(page, m);
      // Garde-fou : la fixture est bien SANS barre laterale...
      expect(m.counts, "aucune barre laterale dans le DOM").toEqual({
        sidebar: 0,
        rail: 0,
      });
      // ... et le token vaut bien 260px a `:root` (la condition du defaut).
      expect(m.rootSidebarW, "--sidebar-w a :root").toBe(`${SIDEBAR_PX}px`);

      expectAlignedOnWindow(m);
    });
  }

  // 2. Avec la sidebar DS de la vitrine : decalage inchange a l'ecran, nul hors ecran.
  for (const width of [769, 1280, 1600]) {
    test(`avec sidebar @${width}px : decalage inchange (= largeur de la sidebar)`, async ({
      page,
    }) => {
      await openPage(page, SHOWCASE, width);
      const m = await measure(page);

      await expectDecorRendered(page, m);
      // Garde-fou : la sidebar est rendue ET a l'ecran, de la largeur attendue.
      expect(m.counts.sidebar, "la vitrine rend .sidebar").toBe(1);
      expect(m.barRight, "bord droit de la sidebar").toBeCloseTo(SIDEBAR_PX, 0);

      expectOffsetBySidebar(m);
    });
  }

  for (const width of [375, 768]) {
    test(`avec sidebar @${width}px : sidebar hors ecran, le decor couvre la fenetre`, async ({
      page,
    }) => {
      await openPage(page, SHOWCASE, width);
      const m = await measure(page);

      await expectDecorRendered(page, m);
      // Garde-fou : la sidebar est dans le DOM mais poussee hors ecran (translateX(-100%)).
      expect(m.counts.sidebar, "la vitrine rend .sidebar").toBe(1);
      expect(m.barRight, "sidebar hors ecran").toBeLessThanOrEqual(0);

      expectAlignedOnWindow(m);
    });
  }

  // 3. Rail du package React : seul le rail ancre au bord de l'ecran pousse le decor.
  test("rail fixe @1280px : decor decale de la largeur du rail", async ({
    page,
  }) => {
    await openPage(page, `${FIXTURE}?rail=fixed`, 1280);
    const m = await measure(page);

    await expectDecorRendered(page, m);
    expect(m.counts.rail, "un .rail-sidebar est rendu").toBe(1);
    expect(m.barRight, "bord droit du rail").toBeCloseTo(SIDEBAR_PX, 0);

    expectOffsetBySidebar(m);
  });

  test("rail fixe @375px : rail hors ecran, le decor couvre la fenetre", async ({
    page,
  }) => {
    await openPage(page, `${FIXTURE}?rail=fixed`, 375);
    const m = await measure(page);

    await expectDecorRendered(page, m);
    expect(m.counts.rail, "un .rail-sidebar est rendu").toBe(1);
    expect(m.barRight, "rail hors ecran").toBeLessThanOrEqual(0);

    expectAlignedOnWindow(m);
  });

  test("rail non fixe (dans le flux) @1280px : ne pousse rien, le decor couvre la fenetre", async ({
    page,
  }) => {
    await openPage(page, `${FIXTURE}?rail=inline`, 1280);
    const m = await measure(page);

    await expectDecorRendered(page, m);
    expect(m.counts.rail, "un .rail-sidebar est rendu").toBe(1);
    expect(m.counts.sidebar, "pas de .sidebar").toBe(0);

    expectAlignedOnWindow(m);
  });
});
