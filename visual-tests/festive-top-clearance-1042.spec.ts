/**
 * festive-top-clearance-1042.spec.ts — Les ornements de Noel ne recouvrent plus le titre
 * de page (#1042).
 *
 * Defaut : en theme Noel, la guirlande d'en-tete et ses boules (`.garland--header`,
 * `.ornaments`, festive.css) sont `position: fixed` sous l'en-tete et PEINTES AU-DESSUS du
 * contenu. Les gabarits ne reservaient que `--header-h` : au defilement 0, la boule la plus
 * basse (56 + 62 + 32 = 150px) coupait le surtitre et le titre de page (« Mes ti●ages »
 * chez tirokado). Correctif : `--festive-top-clearance` (festive.css), derivee des tokens
 * `--ornament-{drop,size}-N` (tokens.css), posee sur `:root[data-theme="noel"]:has(.garland--header)`
 * et ajoutee a `--header-h` par `.main`, `.page-content`, `.content-grid` (layout.css) et
 * par `scroll-padding-top` (base.css).
 *
 * Pourquoi un vrai navigateur et pas jsdom : un recouvrement est un fait de MISE EN PAGE
 * (boites reelles, `position: fixed`, tokens resolus). jsdom ne calcule aucune geometrie
 * et laisserait passer le defaut (regle N1).
 *
 * Cas :
 *  (a) recouvrement — chaque gabarit x {375, 768, 1280, 1920}, Noel, defilement 0 : aucun
 *      titre (`h1`/`h2`, `.overline`, `.lead`) ne coupe une boule ni une ampoule visible de
 *      plus de 1px, et le premier titre commence sous la boule la plus basse ;
 *  (b) coherence — le bas mesure de la boule la plus basse = `--header-h` +
 *      `--festive-top-clearance` (sondes CSS) a 1px pres : casse si une constante change
 *      sans l'autre, dans les deux sens ; aucune ampoule ne descend plus bas ;
 *  (c) neige coupee (`msyx-festive=off`) : les boules restent, la reserve aussi ;
 *  (d) temoin hors Noel (msyx) : variable absente, `padding-top` = `--header-h` sur les 4
 *      gabarits et la vitrine, `scroll-padding-top` = `--header-h` + `--space-md` (72px) ;
 *  (e) defilement vers un element en Noel : `scroll-padding-top` = `--header-h` + reserve
 *      + `--space-md`.
 *
 * Garde-fous (sans eux un test passerait pour la mauvaise raison) : theme rendu = celui
 * demande, en-tete present et visible, gabarit trouve, 7 boules visibles, titres mesures,
 * defilement a 0.
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : theme, mode et largeur sont poses par le
 * test lui-meme, la matrice des projets le rejouerait sans rien couvrir de plus.
 *
 * Preuve par mutation (consignee dans le commit et la PR) : retirer la reserve d'un gabarit
 * (layout.css) -> (a) rouge pour ce gabarit ; remettre une chute en px divergente dans
 * nav.js -> (b) rouge ; retirer le 3e terme du `max()` -> (a) et (b) rouges ; retirer la
 * garde `[data-theme="noel"]` -> (d) rouge.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/festive-top-clearance-1042.html";

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const;

// Gabarits de page du DS qui doivent ecarter le titre de la bande des boules.
const GABARITS = [
  {
    name: ".page-content",
    url: `${FIXTURE}?gabarit=page-content`,
    root: ".page-content",
  },
  {
    name: ".page-content--wide",
    url: `${FIXTURE}?gabarit=page-content--wide`,
    root: ".page-content--wide",
  },
  {
    name: ".content-grid",
    url: `${FIXTURE}?gabarit=content-grid`,
    root: ".content-grid",
  },
  { name: ".main (fixture)", url: `${FIXTURE}?gabarit=main`, root: ".main" },
  { name: ".main (feedback.html)", url: "/pages/feedback.html", root: ".main" },
] as const;

// Textes de tete du premier en-tete de page (`<PageHeader>` ou section de la vitrine).
const TITLES = "h1, h2, .overline, .lead, p";
const BALLS = ".ornaments > .ornament";
const BULBS = ".garland--header .garland-bulb";
const ORNAMENT_COUNT = 7;

async function openPage(
  page: Page,
  url: string,
  theme: string,
  viewport: { width: number; height: number },
  opts: { festiveOff?: boolean } = {},
) {
  await page.addInitScript(
    ({ t, off }: { t: string; off: boolean }) => {
      try {
        localStorage.setItem("msyx-theme", t);
        localStorage.setItem("msyx-mode", "dark");
        if (off) localStorage.setItem("msyx-festive", "off");
        else localStorage.removeItem("msyx-festive");
      } catch {}
    },
    { t: theme, off: !!opts.festiveOff },
  );
  await page.setViewportSize(viewport);
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
    .toBe(theme);
  // Garde-fou : en-tete present (le decor pend sous lui).
  await expect(page.locator(".site-header")).toHaveCount(1);
  await expect(page.locator(".site-header")).toBeVisible();
}

type R = { left: number; top: number; right: number; bottom: number };

interface Piece extends R {
  kind: string;
  text: string;
}

interface Measure {
  scrollY: number;
  titles: Piece[];
  balls: R[];
  bulbs: R[];
  overlaps: { title: Piece; piece: R; w: number; h: number }[];
  paddingTop: number;
  scrollPaddingTop: number;
  clearanceProp: string;
}

/**
 * Mesure, au defilement courant, les textes de tete du premier en-tete de page du gabarit
 * et les pieces opaques du decor (boules, ampoules) qui ont une boite visible.
 */
const measure = (page: Page, root: string): Promise<Measure> =>
  page.evaluate(
    ({ root, TITLES, BALLS, BULBS }) => {
      const rootEl = document.querySelector(root) as HTMLElement | null;
      if (!rootEl) throw new Error(`gabarit introuvable : ${root}`);
      const head = rootEl.querySelector(".section-header");
      if (!head) throw new Error(`en-tete de page introuvable dans ${root}`);

      const toR = (r: DOMRect): R => ({
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      });
      const visibleBox = (el: Element): R | null => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (cs.display === "none" || cs.visibility !== "visible") return null;
        if (r.width <= 0 || r.height <= 0) return null;
        return toR(r);
      };

      const titles: Piece[] = [];
      for (const el of Array.from(head.querySelectorAll(TITLES))) {
        const box = visibleBox(el);
        if (!box) continue;
        titles.push({
          kind:
            el.tagName.toLowerCase() + (el.className ? "." + el.className : ""),
          text: (el.textContent ?? "").trim().slice(0, 30),
          ...box,
        });
      }
      const boxes = (sel: string) =>
        Array.from(document.querySelectorAll(sel))
          .map(visibleBox)
          .filter((b): b is R => b !== null);
      const balls = boxes(BALLS);
      const bulbs = boxes(BULBS);

      const overlaps: Measure["overlaps"] = [];
      for (const t of titles) {
        for (const p of [...balls, ...bulbs]) {
          const w = Math.min(t.right, p.right) - Math.max(t.left, p.left);
          const h = Math.min(t.bottom, p.bottom) - Math.max(t.top, p.top);
          // « de plus de 1px » : un contact d'arrondi n'est pas un recouvrement.
          if (w > 1 && h > 1) overlaps.push({ title: t, piece: p, w, h });
        }
      }

      const html = document.documentElement;
      return {
        scrollY: window.scrollY,
        titles,
        balls,
        bulbs,
        overlaps,
        paddingTop: parseFloat(getComputedStyle(rootEl).paddingTop),
        scrollPaddingTop: parseFloat(getComputedStyle(html).scrollPaddingTop),
        clearanceProp: getComputedStyle(html)
          .getPropertyValue("--festive-top-clearance")
          .trim(),
      };
    },
    { root, TITLES, BALLS, BULBS },
  );

/** px calcules d'une expression CSS (token) : sonde posee dans la page, retiree ensuite. */
const cssPx = (page: Page, expr: string): Promise<number> =>
  page.evaluate((e) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;padding-bottom:${e}`;
    document.body.appendChild(probe);
    const px = parseFloat(getComputedStyle(probe).paddingBottom);
    probe.remove();
    return px;
  }, expr);

const lowest = (boxes: R[]) => Math.max(...boxes.map((b) => b.bottom));

test.describe("Decor de Noel — reserve haute sous l'en-tete (#1042)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `theme, mode et largeur sont poses par le test : un seul projet (${PROJECT})`,
    );
  });

  // (a) Recouvrement au defilement 0.
  for (const gabarit of GABARITS) {
    for (const vp of VIEWPORTS) {
      test(`(a) ${gabarit.name} @${vp.width}x${vp.height} : aucun titre coupe par une boule ou une ampoule`, async ({
        page,
      }) => {
        await openPage(page, gabarit.url, "noel", vp);
        const m = await measure(page, gabarit.root);

        expect(m.scrollY, "mesure au defilement 0").toBe(0);
        expect(m.balls.length, "boules visibles").toBe(ORNAMENT_COUNT);
        expect(m.bulbs.length, "ampoules visibles").toBeGreaterThan(0);
        expect(
          m.titles.length,
          "textes de tete mesures",
        ).toBeGreaterThanOrEqual(2);

        // 1. Aucun texte de tete ne coupe une piece opaque du decor de plus de 1px.
        expect(
          m.overlaps,
          "textes de tete sous une boule ou une ampoule",
        ).toEqual([]);

        // 2. Le premier texte de tete commence sous la boule la plus basse : la bande des
        //    boules est reservee sur toute la largeur, pas seulement la ou elles pendent.
        const firstTop = Math.min(...m.titles.map((t) => t.top));
        expect(
          firstTop,
          `haut du premier titre (${firstTop}) >= bas de la boule la plus basse (${lowest(m.balls)})`,
        ).toBeGreaterThanOrEqual(lowest(m.balls) - 1);
      });
    }
  }

  // (b) La reserve suit la geometrie reelle des boules, dans les deux sens.
  for (const vp of VIEWPORTS) {
    test(`(b) @${vp.width}x${vp.height} : bas de la boule la plus basse = --header-h + --festive-top-clearance`, async ({
      page,
    }, testInfo) => {
      await openPage(page, `${FIXTURE}?gabarit=page-content`, "noel", vp);
      const m = await measure(page, ".page-content");
      expect(m.balls.length, "boules visibles").toBe(ORNAMENT_COUNT);

      const headerH = await cssPx(page, "var(--header-h)");
      const clearance = await cssPx(page, "var(--festive-top-clearance, 0px)");
      expect(clearance, "reserve haute posee en Noel").toBeGreaterThan(0);

      const ballsBottom = lowest(m.balls);
      const bulbsBottom = lowest(m.bulbs);
      testInfo.annotations.push({
        type: "mesure",
        description: `header-h=${headerH} reserve=${clearance} bas-boules=${ballsBottom} bas-ampoules=${bulbsBottom} padding-top=${m.paddingTop}`,
      });

      expect(
        Math.abs(ballsBottom - (headerH + clearance)),
        `bas des boules (${ballsBottom}) vs --header-h + reserve (${headerH} + ${clearance})`,
      ).toBeLessThanOrEqual(1);
      expect(
        bulbsBottom,
        `bas des ampoules (${bulbsBottom}) <= --header-h + reserve (${headerH + clearance})`,
      ).toBeLessThanOrEqual(headerH + clearance + 1);
      expect(m.paddingTop).toBeCloseTo(headerH + clearance, 1);
    });
  }

  // (c) Couper la neige ne retire ni les boules ni la reserve.
  test("(c) neige coupee (msyx-festive=off) : boules visibles, reserve conservee", async ({
    page,
  }) => {
    await openPage(
      page,
      `${FIXTURE}?gabarit=page-content`,
      "noel",
      { width: 1280, height: 800 },
      {
        festiveOff: true,
      },
    );
    // Garde-fou : la cle a bien coupe la neige (sinon on rejouerait le cas (a)).
    await expect(page.locator(".snowfall")).toBeHidden();

    const m = await measure(page, ".page-content");
    expect(m.balls.length, "boules visibles neige coupee").toBe(ORNAMENT_COUNT);
    const headerH = await cssPx(page, "var(--header-h)");
    const clearance = await cssPx(page, "var(--festive-top-clearance, 0px)");
    expect(clearance, "reserve haute posee neige coupee").toBeGreaterThan(0);
    expect(m.paddingTop).toBeCloseTo(headerH + clearance, 1);
    expect(m.overlaps).toEqual([]);
  });

  // (d) Temoin hors Noel : rien ne bouge.
  test("(d) temoin msyx : variable absente, padding-top = --header-h, scroll-padding-top = 72px", async ({
    page,
  }) => {
    const pages = [
      ...GABARITS,
      {
        name: ".main (fondation.html)",
        url: "/pages/fondation.html",
        root: ".main",
      },
    ];
    await openPage(page, pages[0].url, "msyx", { width: 1280, height: 800 });
    const headerH = await cssPx(page, "var(--header-h)");
    const scrollPad = await cssPx(
      page,
      "calc(var(--header-h) + var(--space-md))",
    );

    for (const p of pages) {
      await page.goto(p.url);
      await page.waitForLoadState("networkidle");
      // Garde-fou : le decor vanilla est dans le DOM, masque — c'est la garde de theme
      // qui est mise a l'epreuve, pas l'absence de guirlande.
      await expect(page.locator(".garland--header"), p.name).toHaveCount(1);
      await expect(page.locator(".garland--header"), p.name).toBeHidden();

      const m = await measure(page, p.root);
      expect(
        m.clearanceProp,
        `${p.name} : --festive-top-clearance hors Noel`,
      ).toBe("");
      expect(m.paddingTop, `${p.name} : padding-top hors Noel`).toBe(headerH);
      expect(
        m.scrollPaddingTop,
        `${p.name} : scroll-padding-top hors Noel`,
      ).toBe(scrollPad);
    }
    expect(scrollPad, "valeur historique #1039").toBe(72);
  });

  // (e) Defilement vers un element : la cible atterrit sous la bande des boules.
  test("(e) Noel : scroll-padding-top = --header-h + reserve + --space-md", async ({
    page,
  }) => {
    await openPage(page, `${FIXTURE}?gabarit=page-content`, "noel", {
      width: 1280,
      height: 800,
    });
    const m = await measure(page, ".page-content");
    const expected = await cssPx(
      page,
      "calc(var(--header-h) + var(--festive-top-clearance, 0px) + var(--space-md))",
    );
    const clearance = await cssPx(page, "var(--festive-top-clearance, 0px)");
    expect(clearance, "reserve haute posee en Noel").toBeGreaterThan(0);
    expect(m.scrollPaddingTop).toBeCloseTo(expected, 1);
  });
});
