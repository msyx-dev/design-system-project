/**
 * header-festive-btn.spec.ts — Le bouton flocon du header n'existe qu'en Noel (#990).
 *
 * Defaut : `nav.js` (`updateFestiveDecor()`) pose `btn.hidden = !isNoel`, mais
 * `.header-notification` (layout.css) declare `display: flex`, qui l'emporte sur
 * le `display: none` de la feuille du navigateur pour `[hidden]` : le bouton
 * restait visible sur tous les themes (meme piege que `.input-group[hidden]`, #705).
 *
 * Pourquoi un vrai navigateur et pas jsdom : c'est un defaut de CASCADE
 * (`display` auteur vs feuille UA). jsdom n'applique pas la cascade de `display`
 * de facon fiable — il laisserait passer le defaut. `toBeHidden()` /
 * `toBeVisible()` de Playwright lisent le rendu reel.
 *
 * Piege du test : `toBeHidden()` passe aussi sur un element ABSENT. Chaque cas
 * asserte donc d'abord que le bouton est dans le DOM (`toHaveCount(1)`) et que
 * l'attribut `hidden` est pose / retire comme `nav.js` le promet — sans quoi un
 * bouton qui ne serait plus injecte ferait passer le test pour la mauvaise raison.
 *
 * Joue dans UN seul projet (`msyx-dark-desktop`) : le theme et le mode sont
 * poses par le test lui-meme (`localStorage` avant le chargement), la matrice
 * des 12 projets le rejouerait 12 fois sans rien couvrir de plus.
 */
import { test, expect, type Page } from "@playwright/test";

const PROJECT = "msyx-dark-desktop";
const PAGE_URL = "/pages/navigation.html";
const BUTTON = "#header-festive-btn";

const THEMES = ["msyx", "acssi", "nhood", "auchan", "noel"] as const;
const MODES = ["dark", "light"] as const;

// Attribut absent = valeur par defaut du DS (msyx / dark), comme dans button-contrast.spec.ts.
const appliedTheme = (page: Page) =>
  page.evaluate(
    () => document.documentElement.getAttribute("data-theme") ?? "msyx",
  );
const appliedMode = (page: Page) =>
  page.evaluate(
    () => document.documentElement.getAttribute("data-mode") ?? "dark",
  );

test.describe("Bouton flocon du header — visible uniquement en Noel (#990)", () => {
  for (const theme of THEMES) {
    for (const mode of MODES) {
      test(`${theme}/${mode} : ${theme === "noel" ? "visible" : "masque"}`, async ({
        page,
      }, testInfo) => {
        test.skip(
          testInfo.project.name !== PROJECT,
          `theme et mode sont poses par le test : un seul projet (${PROJECT})`,
        );

        await page.addInitScript(
          ({ t, m }: { t: string; m: string }) => {
            try {
              localStorage.setItem("msyx-theme", t);
              localStorage.setItem("msyx-mode", m);
            } catch {}
          },
          { t: theme, m: mode },
        );
        await page.goto(PAGE_URL);
        await page.waitForLoadState("networkidle");

        // Garde-fou : le combo demande est bien celui rendu.
        await expect.poll(() => appliedTheme(page)).toBe(theme);
        await expect.poll(() => appliedMode(page)).toBe(mode);

        const btn = page.locator(BUTTON);
        // Le bouton est toujours injecte (nav.js) : `toBeHidden()` seul passerait s'il manquait.
        await expect(btn).toHaveCount(1);

        if (theme === "noel") {
          await expect(btn).not.toHaveAttribute("hidden", /.*/);
          await expect(btn).toBeVisible();
        } else {
          // Prémisse de la regle CSS : l'attribut est bien pose, c'est le rendu qui doit l'honorer.
          await expect(btn).toHaveAttribute("hidden", /.*/);
          await expect(btn).toBeHidden();
          await expect(btn).toHaveCSS("display", "none");
        }
      });
    }
  }

  test("bascule de theme en direct : Noel le montre, un autre theme le masque", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== PROJECT,
      `un seul projet suffit (${PROJECT})`,
    );

    await page.addInitScript(() => {
      try {
        localStorage.setItem("msyx-theme", "msyx");
        localStorage.setItem("msyx-mode", "dark");
      } catch {}
    });
    await page.goto(PAGE_URL);
    await page.waitForLoadState("networkidle");

    const btn = page.locator(BUTTON);
    await expect(btn).toHaveCount(1);
    await expect(btn).toBeHidden();

    // initThemeSwitcher() rappelle updateFestiveDecor() au changement de theme.
    await page.selectOption("#theme-select", "noel");
    await expect.poll(() => appliedTheme(page)).toBe("noel");
    await expect(btn).toBeVisible();

    await page.selectOption("#theme-select", "msyx");
    await expect.poll(() => appliedTheme(page)).toBe("msyx");
    await expect(btn).toBeHidden();
  });
});
