/**
 * card-floating-panel-clip.spec.ts — Non-régression : panneau flottant
 * (.dropdown-menu / .action-menu) clippé/inatteignable dans une .card (#856)
 *
 * Bug : `.card` (shared/css/components/cards.css) pose `overflow:hidden` +
 * `will-change:transform` + `container-type:inline-size`. Un descendant
 * `position:absolute` est clippé par `overflow:hidden` — comportement CSS
 * standard. Vérifié empiriquement (Playwright, cf. commit du correctif) que
 * `will-change:transform` établit en plus un containing block pour tout
 * descendant `position:fixed` NON déplacé du sous-arbre (au même titre
 * qu'un `transform` réel) — donc un simple `position:absolute -> fixed`
 * SANS déplacer le nœud ne suffit pas. `container-type:inline-size` seul,
 * lui, NE piège PAS `position:fixed` (vérifié aussi, isolé du reste).
 *
 * Repro production : recette KeepThread (2026-08-28) — le menu Actions du
 * panneau de détail d'un Périmètre (un `.card`) était incliquable à la
 * souris. `document.elementFromPoint` résolvait sur `.card`, jamais sur le
 * bouton du menu ; seule la navigation clavier fonctionnait encore
 * (`focus()` n'est pas affecté par le clipping visuel).
 *
 * Ce test capture l'ATTEIGNABILITÉ (un clic réel atteint sa cible), pas
 * seulement la présence DOM : `Locator.click()` de Playwright refuse et
 * time-out si un autre élément intercepte le point cible (actionability
 * check "receives events", basé sur le même hit-test que
 * `document.elementFromPoint`) — c'est exactement le défaut signalé.
 *
 * Fixture dédiée (visual-tests/fixtures/card-floating-panel-clip-856.html) :
 * ni le Dropdown de formulaires.html ni l'ActionMenu de navigation.html ne
 * sont aujourd'hui imbriqués dans une .card sur les pages showcase — aucune
 * page existante ne reproduit le motif signalé.
 */
import { test, expect } from "@playwright/test";

test.describe("Panneau flottant dans .card — non-régression #856", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visual-tests/fixtures/card-floating-panel-clip-856.html");
    await page.waitForLoadState("networkidle");
  });

  test("Dropdown : la dernière option, hors du .card sans correctif, est réellement cliquable", async ({
    page,
  }) => {
    await page.click("#dd-trigger");

    const target = page.locator("#dd-target");
    await expect(target).toHaveText("Astro");

    // Confirmation par hit-test explicite (même méthode que le diagnostic
    // KeepThread) : le point cible doit résoudre sur l'option elle-même (ou
    // un de ses descendants — le <span class="check"> par ex.), jamais sur
    // .card qui l'engloutit quand le panneau reste clippé.
    const hit = await target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const at = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
      return at ? el.contains(at) || at === el : false;
    });
    expect(hit).toBe(true);

    // Preuve décisive : un clic réel doit aboutir (Playwright time-out sinon
    // — actionability "receives events" impossible si .card intercepte).
    await target.click({ timeout: 3000 });
    await expect(page.locator("#dd-value")).toHaveText("Astro");
  });

  test('ActionMenu : "Renommer" dans le menu d\'un Périmètre (.card) est réellement cliquable', async ({
    page,
  }) => {
    await page.click("#am-trigger");

    const rename = page.locator("#am-rename");
    await expect(rename).toHaveText("Renommer");

    const hit = await rename.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const at = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
      return at ? el.contains(at) || at === el : false;
    });
    expect(hit).toBe(true);

    await rename.click({ timeout: 3000 });
    await expect(page.locator("#am-log")).toHaveText("renommer-clique");
  });
});
