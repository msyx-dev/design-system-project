/**
 * festive-clearance.spec.ts — Le sapin de Noel ne recouvre plus la fin des pages (#1005).
 *
 * Defaut : `.festive-character` (festive.css) est `position: fixed; bottom: 0`, donc
 * hors flux — il n'ajoute aucune hauteur au document. Aucun gabarit de page ne
 * reservait sa hauteur : defile au maximum, il recouvrait la derniere ligne de
 * contenu, a toutes les largeurs. Correctif : `--festive-clearance` (festive.css,
 * pose en Noel quand le sapin est dans le DOM) consommee en `padding-bottom` par
 * `.main`, `.page-content` et `.content-grid` (layout.css).
 *
 * Pourquoi un vrai navigateur et pas jsdom : un recouvrement est un fait de MISE EN
 * PAGE (boites reelles, `position: fixed`, defilement). jsdom ne calcule aucune
 * geometrie — il laisserait passer le defaut. Ici on defile au maximum et on mesure
 * les boites rendues.
 *
 * Garde-fous du test (sans eux il passerait pour la mauvaise raison) :
 *  - le defilement atteint reellement le bas du document ;
 *  - le sapin existe, est visible et touche le bas de la fenetre ;
 *  - une feuille de contenu est une boite VISIBLE (taille > 0, non rognee par un
 *    ancetre `overflow`, hors `position: fixed` : ce qui ne defile pas n'a rien a
 *    voir avec la reserve de fin de page).
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : theme, mode et largeur sont poses
 * par le test lui-meme (`localStorage` avant le chargement, `setViewportSize`), la
 * matrice des 12 projets le rejouerait 12 fois sans rien couvrir de plus.
 *
 * Preuve par mutation : retirer la consommation de `--festive-clearance` dans
 * layout.css (ou la declaration dans festive.css) rend ces cas rouges.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/festive-clearance-1005.html";

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1600, height: 900 },
] as const;

// Gabarits de page du DS qui doivent reserver la hauteur du sapin.
const GABARITS = [
  { name: ".main", url: "/pages/feedback.html", root: ".main" },
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
] as const;

const TREE = ".festive-character";

// Balancement du sapin (`characterBob`, festive.css) : le sapin peut monter de 7px.
const BOB_PX = 7;

async function openPage(
  page: Page,
  url: string,
  theme: string,
  viewport: { width: number; height: number },
) {
  await page.addInitScript(
    ({ t, m }: { t: string; m: string }) => {
      try {
        localStorage.setItem("msyx-theme", t);
        localStorage.setItem("msyx-mode", m);
      } catch {}
    },
    { t: theme, m: "dark" },
  );
  await page.setViewportSize(viewport);
  // Pas d'animation : le balancement du sapin ne fausse pas la mesure de sa boite.
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
}

/** Defile au maximum et attend que le document ait fini de grandir (sapin, lazy). */
async function scrollToBottom(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          // Le DS declare `scroll-behavior: smooth` : "instant" pour ne pas mesurer en route.
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "instant",
          });
          return Math.abs(
            window.scrollY -
              (document.documentElement.scrollHeight - window.innerHeight),
          );
        }),
      { message: "le defilement atteint le bas du document" },
    )
    .toBeLessThanOrEqual(1);
}

interface Box {
  tag: string;
  cls: string;
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Measure {
  scrollY: number;
  maxScroll: number;
  innerHeight: number;
  tree: { left: number; top: number; right: number; bottom: number } | null;
  treeVisible: boolean;
  leafCount: number;
  lastBottom: number;
  overlapping: Box[];
}

/**
 * Mesure, dans la page defilee au maximum, le sapin et les feuilles de contenu du
 * gabarit. Une feuille = element sans enfant element, dont la boite VISIBLE (rognee
 * par les ancetres `overflow` et la fenetre) a une aire > 0, et qu'aucun ancetre
 * `position: fixed` ne soustrait au defilement.
 */
const measure = (page: Page, root: string, treeSel: string): Promise<Measure> =>
  page.evaluate(
    ({ root, treeSel }) => {
      const rootEl = document.querySelector(root) as HTMLElement | null;
      const treeEl = document.querySelector(treeSel) as HTMLElement | null;
      if (!rootEl) throw new Error(`gabarit introuvable : ${root}`);

      type R = { left: number; top: number; right: number; bottom: number };
      const toR = (r: DOMRect): R => ({
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      });
      const intersect = (a: R, b: R): R => ({
        left: Math.max(a.left, b.left),
        top: Math.max(a.top, b.top),
        right: Math.min(a.right, b.right),
        bottom: Math.min(a.bottom, b.bottom),
      });
      const area = (r: R) =>
        Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);

      const treeRect = treeEl ? toR(treeEl.getBoundingClientRect()) : null;
      const treeStyle = treeEl ? getComputedStyle(treeEl) : null;
      const treeVisible =
        !!treeEl &&
        !!treeRect &&
        area(treeRect) > 0 &&
        treeStyle!.display !== "none" &&
        treeStyle!.visibility === "visible";

      const viewport: R = {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      };

      let leafCount = 0;
      let lastBottom = -Infinity;
      const overlapping: Box[] = [];

      for (const el of Array.from(rootEl.querySelectorAll<HTMLElement>("*"))) {
        if (el.children.length > 0) continue;
        if (getComputedStyle(el).visibility !== "visible") continue;

        let visible = intersect(toR(el.getBoundingClientRect()), viewport);
        let scrolls = true;
        for (
          let anc: HTMLElement | null = el;
          anc && anc !== rootEl.parentElement;
          anc = anc.parentElement
        ) {
          const cs = getComputedStyle(anc);
          if (cs.position === "fixed") {
            scrolls = false;
            break;
          }
          if (
            anc !== el &&
            (cs.overflowX !== "visible" || cs.overflowY !== "visible")
          ) {
            visible = intersect(visible, toR(anc.getBoundingClientRect()));
          }
        }
        if (!scrolls || area(visible) <= 0) continue;

        leafCount += 1;
        lastBottom = Math.max(lastBottom, visible.bottom);
        if (treeRect && area(intersect(visible, treeRect)) > 0) {
          overlapping.push({
            tag: el.tagName.toLowerCase(),
            cls:
              el.className && typeof el.className === "string"
                ? el.className
                : "",
            text: (el.textContent ?? "").trim().slice(0, 40),
            ...visible,
          });
        }
      }

      return {
        scrollY: window.scrollY,
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
        innerHeight: window.innerHeight,
        tree: treeRect,
        treeVisible,
        leafCount,
        lastBottom,
        overlapping,
      };
    },
    { root, treeSel },
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

const paddingBottom = (page: Page, root: string): Promise<number> =>
  page.evaluate(
    (sel) =>
      parseFloat(getComputedStyle(document.querySelector(sel)!).paddingBottom),
    root,
  );

test.describe("Sapin de Noel — reserve de fin de page (#1005)", () => {
  for (const gabarit of GABARITS) {
    for (const vp of VIEWPORTS) {
      test(`${gabarit.name} @${vp.width}x${vp.height} : le sapin ne recouvre aucun contenu en bas de page`, async ({
        page,
      }, testInfo) => {
        test.skip(
          testInfo.project.name !== PROJECT,
          `theme, mode et largeur sont poses par le test : un seul projet (${PROJECT})`,
        );

        await openPage(page, gabarit.url, "noel", vp);
        await scrollToBottom(page);

        const m = await measure(page, gabarit.root, TREE);

        // Garde-fou : la page deborde bien de la fenetre (sinon rien ne defile, rien a prouver).
        expect(
          m.maxScroll,
          "la page est plus haute que la fenetre",
        ).toBeGreaterThan(0);
        expect(Math.abs(m.scrollY - m.maxScroll)).toBeLessThanOrEqual(1);

        // Garde-fou : sans sapin le test passerait pour la mauvaise raison.
        await expect(page.locator(TREE)).toHaveCount(1);
        await expect(page.locator(TREE)).toBeVisible();
        expect(m.treeVisible, "le sapin a une boite visible").toBe(true);
        expect(m.tree, "boite du sapin mesuree").not.toBeNull();
        const tree = m.tree!;
        // Boite collee au bas de la fenetre (`bottom: 0`) : tolerance de 1px d'arrondi.
        expect(Math.abs(tree.bottom - m.innerHeight)).toBeLessThanOrEqual(1);

        // Garde-fou : le gabarit contient du contenu visible mesurable.
        expect(m.leafCount, "feuilles de contenu visibles").toBeGreaterThan(0);

        // 1. Aucune feuille de contenu visible n'intersecte la boite du sapin.
        expect(
          m.overlapping,
          `feuilles de contenu sous le sapin (${JSON.stringify(tree)})`,
        ).toEqual([]);

        // 2. Le bas du dernier contenu finit au-dessus du sapin, balancement compris.
        expect(
          m.lastBottom,
          `bas du dernier contenu (${m.lastBottom}) <= haut du sapin (${tree.top}) - ${BOB_PX}px`,
        ).toBeLessThanOrEqual(tree.top - BOB_PX);
      });
    }
  }

  // Garde du clamp : `--festive-clearance` (festive.css) DOIT suivre la largeur reelle
  // du sapin. Un clamp divergent entre `.festive-character` et la reserve se verrait ici,
  // dans les deux sens (reserve trop courte -> recouvrement ; trop longue -> vide).
  for (const vp of VIEWPORTS) {
    test(`.main @${vp.width}x${vp.height} : la reserve = hauteur du sapin (largeur x 1,5) + --space-lg`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== PROJECT,
        `un seul projet suffit (${PROJECT})`,
      );

      await openPage(page, "/pages/feedback.html", "noel", vp);
      await scrollToBottom(page);

      const treeWidth = await page.evaluate(
        (sel) => document.querySelector(sel)!.getBoundingClientRect().width,
        TREE,
      );
      const spaceLg = await cssPx(page, "var(--space-lg)");
      const padding = await paddingBottom(page, ".main");

      // viewBox du sapin 200 x 300 : hauteur = largeur x 1,5.
      expect(padding).toBeCloseTo(treeWidth * 1.5 + spaceLg, 0);
    });
  }

  test("temoin : hors Noel, aucune reserve (.main = 0, .page-content / .content-grid inchanges)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `un seul projet suffit (${PROJECT})`,
    );

    const vp = { width: 1280, height: 800 };

    await openPage(page, "/pages/feedback.html", "msyx", vp);
    // Le sapin vanilla reste dans le DOM hors Noel, masque : la garde de theme le couvre.
    await expect(page.locator(TREE)).toHaveCount(1);
    await expect(page.locator(TREE)).toBeHidden();
    expect(await paddingBottom(page, ".main")).toBe(0);

    // Hors Noel, `.page-content` et `.content-grid` gardent leur degagement d'origine
    // (breakpoint >= 768px : `--space-2xl` ; le `max()` ne leur ajoute rien).
    const space2xl = await cssPx(page, "var(--space-2xl)");
    for (const gabarit of GABARITS.slice(1)) {
      await page.goto(gabarit.url);
      await page.waitForLoadState("networkidle");
      expect(
        await paddingBottom(page, gabarit.root),
        `${gabarit.name} hors Noel`,
      ).toBe(space2xl);
    }
  });
});
