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
 * de tout `.header-logo` (wordmark autonome) garde son comportement :
 * masque sous 640 px.
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
 *
 * #1022 — frontiere 640 / 641 px. Le masquage de brand.css etait a 639px alors que
 * celui de layout.css (`.site-header`) etait a 640px : a 640 px pile, un wordmark
 * hors `.site-header` restait visible. Les deux sont alignes sur 640px. Les cas
 * "640 px" / "641 px" mesurent cette frontiere HORS `.site-header` (seule la regle de
 * brand.css s'applique). Preuve par mutation : remettre `639px` dans brand.css rend
 * rouge le cas 640 px (le wordmark reste visible), le cas 641 px reste vert.
 * Le `padding` / `gap` du `.site-header` (reecrits mobile-first, layout.css) sont
 * mesures : compacts a 640 et 768 px, enrichis a 769 px (#1051 : avec le burger, ils
 * faisaient deborder l'en-tete entre 641 et 768 px). Pour la meme raison, DANS
 * `.site-header`, le wordmark accompagne d'un pictogramme attend 769 px.
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
// #1022 : `.header-logo` AVEC pictogramme, HORS `.site-header` (brand.css seul).
const WORDMARK_PICTO_HORS_SITE_HEADER =
  "#picto-hors-site-header .brand-wordmark";

// #1022 : le masquage s'arrete a 640 px INCLUS (`max-width: 640px`, complement exact de
// `min-width: 640.02px` pour l'enrichissement du header).
const SEUIL = { width: 640, height: 800 };
const SEUIL_PLUS_1 = { width: 641, height: 800 };

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

  test("640 px — hors .site-header, un wordmark avec pictogramme et un wordmark autonome sont masques (#1022)", async ({
    page,
  }) => {
    await openFixture(page, SEUIL);
    // Garde-fou : la fenetre mesure bien 640 px (sinon la frontiere n'est pas testee).
    expect(await page.evaluate(() => window.innerWidth)).toBe(SEUIL.width);
    // Le pictogramme est la : c'est bien le cas `:has(.header-logo-img)`.
    await expect(
      page.locator("#picto-hors-site-header .header-logo-img"),
    ).toBeVisible();
    await expect(page.locator(WORDMARK_PICTO_HORS_SITE_HEADER)).toBeHidden();
    expect(await box(page, WORDMARK_PICTO_HORS_SITE_HEADER)).toBeNull();
    await expect(page.locator(WORDMARK_AUTONOME)).toBeHidden();
    expect(await box(page, WORDMARK_AUTONOME)).toBeNull();
    // Contre-test : sans pictogramme, la marque reste visible a 640 px (#1009 intact).
    for (const selector of Object.values(WORDMARK_SANS_PICTO)) {
      await expect(page.locator(selector), selector).toBeVisible();
    }
  });

  test("641 px — hors .site-header, un wordmark avec pictogramme et un wordmark autonome sont visibles (#1022)", async ({
    page,
  }) => {
    await openFixture(page, SEUIL_PLUS_1);
    expect(await page.evaluate(() => window.innerWidth)).toBe(
      SEUIL_PLUS_1.width,
    );
    for (const selector of [
      WORDMARK_PICTO_HORS_SITE_HEADER,
      WORDMARK_AUTONOME,
    ]) {
      await expect(page.locator(selector), selector).toBeVisible();
      const b = await box(page, selector);
      expect(b!.width, `${selector} largeur`).toBeGreaterThan(0);
      expect(b!.height, `${selector} hauteur`).toBeGreaterThan(0);
    }
    // #1051 : DANS `.site-header`, le wordmark accompagne d'un pictogramme attend 769 px.
    await expect(page.locator(WORDMARK_AVEC_PICTO)).toBeHidden();
  });

  test("640 / 768 / 769 px — .site-header : padding et gap compacts jusqu'a 768 px, enrichis a 769 px (#1022, #1051)", async ({
    page,
  }) => {
    // Valeurs attendues lues sur les tokens eux-memes (pas de px en dur ici).
    const read = async (viewport: { width: number; height: number }) => {
      await openFixture(page, viewport);
      return page.locator("#avec-pictogramme").evaluate((el) => {
        const probe = (prop: "paddingLeft" | "columnGap", token: string) => {
          const p = document.createElement("div");
          p.style[prop] = `var(${token})`;
          document.body.appendChild(p);
          const v = getComputedStyle(p)[prop];
          p.remove();
          return v;
        };
        const cs = getComputedStyle(el);
        return {
          paddingLeft: cs.paddingLeft,
          paddingRight: cs.paddingRight,
          gap: cs.columnGap,
          md: probe("paddingLeft", "--space-md"),
          lg: probe("paddingLeft", "--space-lg"),
          sm: probe("columnGap", "--space-sm"),
          mdGap: probe("columnGap", "--space-md"),
        };
      });
    };
    const compact = await read(SEUIL);
    expect(compact.paddingLeft).toBe(compact.md);
    expect(compact.paddingRight).toBe(compact.md);
    expect(compact.gap).toBe(compact.sm);
    const compact768 = await read({ width: 768, height: 800 });
    expect(compact768.paddingLeft).toBe(compact768.md);
    expect(compact768.gap).toBe(compact768.sm);
    const rich = await read({ width: 769, height: 800 });
    expect(rich.paddingLeft).toBe(rich.lg);
    expect(rich.paddingRight).toBe(rich.lg);
    expect(rich.gap).toBe(rich.mdGap);
    // Garde-fou : les deux etats different (sinon le test ne prouverait rien).
    expect(rich.paddingLeft).not.toBe(compact.paddingLeft);
  });

  test("1280 px — tous les wordmarks sont visibles", async ({ page }) => {
    await openFixture(page, DESKTOP);
    const selectors = [
      ...Object.values(WORDMARK_SANS_PICTO),
      WORDMARK_AVEC_PICTO,
      WORDMARK_PICTO_HORS_SITE_HEADER,
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
