/**
 * brand-wordmark.spec.ts — Le wordmark du header reste visible sous 640 px
 * quand il est la SEULE marque (#1009).
 *
 * Defaut : `.brand-wordmark` etait masque sous 640 px (brand.css, et layout.css pour
 * `.site-header`) parce que le DS suppose un pictogramme `.header-logo-img` a cote.
 * Un consommateur sans pictogramme (tirokado : `<Link className="header-logo
 * brand-wordmark">` seul dans le header, ou `<SiteHeader>` React par defaut) n'avait
 * alors AUCUNE marque dans le header sur telephone.
 *
 * Correctif : on ne masque le wordmark que s'il est accompagne d'un pictogramme
 * (`.header-logo:has(.header-logo-img) .brand-wordmark`). Un `.brand-wordmark` HORS
 * de tout `.header-logo` (demos de navigation.html) garde son comportement actuel :
 * masque sous 640 px, ce qui tient la VR a 0 diff.
 *
 * Pourquoi un vrai navigateur et pas jsdom : un masquage est un fait de CASCADE et
 * de MISE EN PAGE (media query, `:has()`, boite rendue). jsdom n'evalue ni l'un ni
 * l'autre — il laisserait passer le defaut. Ici on mesure les boites rendues.
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : la largeur est posee par le test
 * lui-meme (`setViewportSize`), la matrice des 12 projets le rejouerait 12 fois sans
 * rien couvrir de plus.
 *
 * Preuve par mutation : retirer la regle `.header-logo:has(.header-logo-img)
 * .brand-wordmark` (brand.css, layout.css) pour revenir au masquage inconditionnel
 * rend rouges les cas sans pictogramme a 375 px.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const FIXTURE = "/visual-tests/fixtures/brand-wordmark-1009.html";

const MOBILE = { width: 375, height: 667 };
const DESKTOP = { width: 1280, height: 800 };

// `#sans-pictogramme` : `.header-logo.brand-wordmark` (meme element, cas tirokado)
// `#sans-pictogramme-imbrique` : `.header-logo` > `.brand-wordmark` (<SiteHeader> React)
// `#hors-site-header` : comme `#sans-pictogramme`, hors `.site-header` (brand.css seul)
const WORDMARK_SANS_PICTO = {
  "même élément (.header-logo.brand-wordmark, cas tirokado)":
    "#sans-pictogramme .brand-wordmark",
  "imbriqué (.header-logo > .brand-wordmark, <SiteHeader> React)":
    "#sans-pictogramme-imbrique .brand-wordmark",
  "même élément, hors .site-header (seule la règle de brand.css s'applique)":
    "#hors-site-header .brand-wordmark",
} as const;
const WORDMARK_AVEC_PICTO = "#avec-pictogramme .brand-wordmark";
const PICTO = "#avec-pictogramme .header-logo-img";
const WORDMARK_AUTONOME = "#autonome .brand-wordmark";

async function openFixture(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await page.goto(FIXTURE);
  await page.waitForLoadState("networkidle");
}

/** Boite rendue de l'element (null si `display: none`). */
async function box(page: Page, selector: string) {
  return page.locator(selector).boundingBox();
}

test.describe("#1009 — wordmark du header selon la presence d'un pictogramme", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `la largeur est posee par le test : un seul projet (${PROJECT})`,
    );
  });

  test("garde-fou : la fixture charge le DS (sinon les cas passeraient pour la mauvaise raison)", async ({
    page,
  }) => {
    await openFixture(page, MOBILE);
    // Le pictogramme du header standard est une boite visible et non vide.
    await expect(page.locator(PICTO)).toBeVisible();
    const picto = await box(page, PICTO);
    expect(picto!.width).toBeGreaterThan(0);
    expect(picto!.height).toBeGreaterThan(0);
    // Les feuilles du DS s'appliquent : le header est bien en flex (layout.css).
    const display = await page
      .locator("#avec-pictogramme")
      .evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("flex");
  });

  for (const [label, selector] of Object.entries(WORDMARK_SANS_PICTO)) {
    test(`375 px — sans pictogramme, ${label} : la marque est visible`, async ({
      page,
    }) => {
      await openFixture(page, MOBILE);
      const wordmark = page.locator(selector);
      await expect(wordmark).toBeVisible();
      const b = await box(page, selector);
      expect(b, "boite rendue").not.toBeNull();
      expect(b!.width).toBeGreaterThan(0);
      expect(b!.height).toBeGreaterThan(0);
      // Le texte de marque tient dans la fenetre (pas rogne hors ecran).
      expect(b!.x).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.width).toBeLessThanOrEqual(MOBILE.width);
      // Et il ne fait pas deborder la page (#711 : l'overflow du header).
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, "debordement horizontal de la page").toBeLessThanOrEqual(
        0,
      );
    });
  }

  test("375 px — avec pictogramme : le wordmark reste masque, le pictogramme porte la marque", async ({
    page,
  }) => {
    await openFixture(page, MOBILE);
    await expect(page.locator(PICTO)).toBeVisible();
    await expect(page.locator(WORDMARK_AVEC_PICTO)).toBeHidden();
    expect(await box(page, WORDMARK_AVEC_PICTO)).toBeNull();
  });

  test("375 px — wordmark autonome (hors .header-logo) : comportement inchange, masque", async ({
    page,
  }) => {
    await openFixture(page, MOBILE);
    await expect(page.locator(WORDMARK_AUTONOME)).toBeHidden();
  });

  test("1280 px — tous les wordmarks sont visibles", async ({ page }) => {
    await openFixture(page, DESKTOP);
    const selectors = [
      ...Object.values(WORDMARK_SANS_PICTO),
      WORDMARK_AVEC_PICTO,
      WORDMARK_AUTONOME,
    ];
    for (const selector of selectors) {
      await expect(page.locator(selector), selector).toBeVisible();
      const b = await box(page, selector);
      expect(b!.width, `${selector} largeur`).toBeGreaterThan(0);
      expect(b!.height, `${selector} hauteur`).toBeGreaterThan(0);
    }
  });
});
