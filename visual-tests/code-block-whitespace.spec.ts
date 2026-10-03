/**
 * code-block-whitespace.spec.ts — `.code-block` : lire et copier un exemple de code (#1020)
 *
 * Un `<div class="code-block">` dont le source passe à la ligne SANS `<br>` s'affichait sur une
 * seule ligne (le navigateur replie les sauts de ligne en espaces) et « Copier » copiait cette
 * ligne : `initCopyButtons()` lit `block.innerText` (shared/components.js), qui dépend de
 * `white-space`. 20 blocs de la vitrine étaient dans ce cas. La règle
 * `.code-block:where(:not(pre)) { white-space: pre-wrap; }` (interactive.css) les rend tels
 * qu'ils sont écrits, en gardant le repli des lignes longues voulu par #250.
 *
 * Défaut de RENDU : jsdom n'applique aucune mise en page ni cascade `white-space`, `innerText`
 * y retombe sur `textContent`. La preuve est donc une mesure dans un vrai navigateur, sur les
 * vraies pages de la vitrine — pas sur une fixture, qui ne prouverait que la fixture.
 *
 * Quatre mesures :
 *   1. `getComputedStyle().white-space` (pre-wrap sur un <div>, pre sur un <pre>) ;
 *   2. `innerText` et nombre de lignes VISUELLES (sommets distincts de `Range.getClientRects()`) ;
 *   3. le presse-papiers reçu après un survol puis un clic réels sur le bouton « Copier » ;
 *   4. aucun débordement horizontal d'un <div> à 375 px (le repli des lignes longues tient).
 *
 * TÉMOINS (même page, même run) : un bloc en `<br>` garde ses 6 lignes, un <pre> garde son
 * défilement horizontal. Sans eux, « 35 lignes » ne dirait rien d'un effet de bord.
 *
 * Joué dans UN seul projet (`msyx-dark-desktop`) : le test pose lui-même le viewport et le
 * thème ; les 16 projets de la matrice VR ne couvriraient rien de plus.
 *
 * Preuve par mutation (consignée dans la PR) : règle retirée de interactive.css → les assertions
 * « 35 lignes » (affichage et copie) et `white-space` sont rouges ; règle restaurée → vertes.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 667 },
} as const;

/** Blocs `<div>` sans `<br>` dont le source passe à la ligne, par page (recensement 2026-10-03). */
const BLOCS_A_SAUTS_DE_LIGNE: Record<string, number> = {
  composants: 5,
  "getting-started": 10,
  formulaires: 3,
  feedback: 1,
  divers: 1,
};

async function ouvrir(
  page: Page,
  slug: string,
  viewport: keyof typeof VIEWPORTS,
) {
  await page.setViewportSize(VIEWPORTS[viewport]);
  await page.addInitScript(() => {
    try {
      localStorage.setItem("msyx-theme", "msyx");
      localStorage.setItem("msyx-mode", "dark");
    } catch {}
  });
  await page.goto(`/pages/${slug}.html`, { waitUntil: "networkidle" });
  // Garde-fou : `initCopyButtons()` a bien enveloppé les blocs (sinon le clic ne mesure rien).
  await expect
    .poll(() => page.locator(".code-block-wrap").count())
    .toBeGreaterThan(0);
}

/**
 * Lignes visuelles d'un bloc : sommets distincts des rectangles de ses nœuds (regroupés à
 * moins de 6 px, un `<span>` et un nœud texte d'une même ligne n'ont pas le même sommet au
 * pixel près). Un bloc aplati en donne 1 tant que la ligne tient, plusieurs seulement s'il
 * se replie.
 */
async function lignesVisuelles(page: Page, selecteur: string) {
  return page
    .locator(selecteur)
    .first()
    .evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = [...range.getClientRects()]
        .filter((r) => r.width > 0 || r.height > 0)
        .map((r) => r.top)
        .sort((a, b) => a - b);
      const lignes: number[] = [];
      for (const t of tops) {
        if (!lignes.length || t - lignes[lignes.length - 1] > 6) lignes.push(t);
      }
      return lignes.length;
    });
}

async function lignesTexte(page: Page, selecteur: string) {
  return page
    .locator(selecteur)
    .first()
    .evaluate((el) => (el as HTMLElement).innerText.split("\n").length);
}

test.describe("`.code-block` — lire et copier un exemple (#1020)", () => {
  test.beforeEach(async ({ context }, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      "joué une seule fois : viewport et thème sont posés par le test",
    );
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  for (const viewport of ["desktop", "mobile"] as const) {
    test(`composants#buttons : 35 lignes affichées (${viewport})`, async ({
      page,
    }) => {
      await ouvrir(page, "composants", viewport);
      const bloc = "#buttons .code-block";
      await expect(page.locator(bloc).first()).toBeVisible();

      expect(
        await page
          .locator(bloc)
          .first()
          .evaluate((el) => el.tagName),
        "le bloc mesuré est bien un <div>",
      ).toBe("DIV");
      expect(
        await page
          .locator(bloc)
          .first()
          .evaluate((el) => getComputedStyle(el).whiteSpace),
      ).toBe("pre-wrap");
      expect(await lignesTexte(page, bloc)).toBe(35);
      expect(await lignesVisuelles(page, bloc)).toBeGreaterThanOrEqual(35);
    });

    test(`getting-started#first-steps : 35 lignes affichées (${viewport})`, async ({
      page,
    }) => {
      await ouvrir(page, "getting-started", viewport);
      const bloc = "#first-steps .code-block";
      await expect(page.locator(bloc).first()).toBeVisible();
      expect(await lignesTexte(page, bloc)).toBe(35);
      expect(await lignesVisuelles(page, bloc)).toBeGreaterThanOrEqual(35);
    });
  }

  test("composants#buttons : « Copier » met 35 lignes dans le presse-papiers", async ({
    page,
  }) => {
    await ouvrir(page, "composants", "desktop");
    const enveloppe = page.locator("#buttons .code-block-wrap").first();
    await enveloppe.scrollIntoViewIfNeeded();
    await enveloppe.hover();
    await enveloppe.locator(".copy-btn--inline").click();
    const copie = await page.evaluate(() => navigator.clipboard.readText());
    expect(copie.split("\n").length).toBe(35);
  });

  test("getting-started#first-steps : « Copier » met 35 lignes dans le presse-papiers", async ({
    page,
  }) => {
    await ouvrir(page, "getting-started", "desktop");
    const enveloppe = page.locator("#first-steps .code-block-wrap").first();
    await enveloppe.scrollIntoViewIfNeeded();
    await enveloppe.hover();
    await enveloppe.locator(".copy-btn--inline").click();
    const copie = await page.evaluate(() => navigator.clipboard.readText());
    expect(copie.split("\n").length).toBe(35);
  });

  test("témoin : un bloc en <br> garde ses 6 lignes (divers#code)", async ({
    page,
  }) => {
    await ouvrir(page, "divers", "desktop");
    const bloc = "#code .code-block";
    await expect(page.locator(bloc).first()).toBeVisible();
    expect(await lignesTexte(page, bloc)).toBe(6);
    expect(await lignesVisuelles(page, bloc)).toBe(6);
    expect(
      await page
        .locator(bloc)
        .first()
        .evaluate((el) => getComputedStyle(el).whiteSpace),
    ).toBe("pre-wrap");
  });

  test("témoin : un <pre> garde son white-space natif et défile en mobile (navigation#user-menu)", async ({
    page,
  }) => {
    await ouvrir(page, "navigation", "mobile");
    const pre = page.locator("#user-menu pre.code-block").last();
    await pre.scrollIntoViewIfNeeded();
    await expect(pre).toBeVisible();
    expect(await pre.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe(
      "pre",
    );
    const { scrollWidth, clientWidth } = await pre.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });

  for (const [slug, attendu] of Object.entries(BLOCS_A_SAUTS_DE_LIGNE)) {
    test(`${slug} : ${attendu} bloc(s) à sauts de ligne, sans débordement à 375 px`, async ({
      page,
    }) => {
      await ouvrir(page, slug, "mobile");
      const mesures = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("div.code-block")]
          .filter(
            (b) =>
              !b.querySelector("br") && (b.textContent ?? "").includes("\n"),
          )
          .map((b) => ({
            id: b.closest("section")?.id ?? "?",
            affiche: b.clientWidth > 0,
            scrollWidth: b.scrollWidth,
            clientWidth: b.clientWidth,
            lignes: b.innerText.split("\n").length,
          })),
      );
      // Garde-fou de recensement : un compte qui dérive rend la mesure creuse.
      expect(mesures).toHaveLength(attendu);
      for (const m of mesures) {
        expect(m.affiche, `bloc de #${m.id} mesurable (clientWidth > 0)`).toBe(
          true,
        );
        expect(m.lignes, `bloc de #${m.id} : plusieurs lignes`).toBeGreaterThan(
          1,
        );
        expect(
          m.scrollWidth,
          `bloc de #${m.id} : pas de défilement horizontal`,
        ).toBeLessThanOrEqual(m.clientWidth);
      }
    });
  }
});
