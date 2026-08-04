/**
 * sticky-regression.spec.ts — Non-régression : position:sticky de niveau page (#795)
 * Bug : body{overflow-x:hidden} forçait overflow-y:auto sur body (CSS Overflow §3.5,
 * propagation body→viewport exige html visible sur les 2 axes ; html vaut clip
 * depuis #530) -> body devenait conteneur de défilement -> tout sticky de niveau
 * page était neutralisé chez TOUS les consumers.
 * Repro empirique (issue #795, Playwright/Chromium 1280x800) : élément sticky
 * top:var(--header-h) (56px) qui défile avec la page au lieu de coller.
 * Fixture dédiée (visual-tests/fixtures/sticky-regression.html) : découplée du
 * contenu des pages showcase, ne dépend d'aucune section documentaire.
 */
import { test, expect } from "@playwright/test";

test.describe("Sticky de niveau page — non-régression #795", () => {
  test("un élément position:sticky reste épinglé après scroll", async ({
    page,
  }) => {
    await page.goto("/visual-tests/fixtures/sticky-regression.html");
    await page.waitForLoadState("networkidle");

    const target = page.locator("#sticky-target");
    await expect(target).toBeVisible();

    // Position initiale : sous le filler de 200px, au-dessus du seuil sticky
    const before = await target.evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    expect(before).toBeGreaterThan(56);

    // Scroll jusqu'en bas de page (robuste aux différences de hauteur de viewport
    // entre projets desktop/mobile — pas besoin de calculer un offset exact).
    // behavior:"instant" (#809) : html{scroll-behavior:smooth} (base.css:18) rend
    // sinon ce scroll animé ; c'est la position finale qui est vérifiée, pas
    // l'animation. Un waitForTimeout fixe est une hypothèse sur sa durée — sous
    // charge CI la mesure tombait pendant l'animation (top intermédiaire ~101px
    // au lieu de 56px), d'où le flake intermittent.
    await page.evaluate(() =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      }),
    );

    const after = await target.evaluate((el) => el.getBoundingClientRect().top);

    // Sticky fonctionnel : l'élément reste épinglé près de son offset `top`
    // (56px, var(--header-h)). Sticky cassé (régression #795) : l'élément
    // défile avec la page -> top négatif profond.
    expect(after).toBeGreaterThanOrEqual(50);
    expect(after).toBeLessThanOrEqual(62);
  });
});
