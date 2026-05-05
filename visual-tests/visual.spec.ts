import { test, expect } from "@playwright/test";

const PAGES = [
  { slug: "fondation", path: "/pages/fondation.html" },
  { slug: "composants", path: "/pages/composants.html" },
  { slug: "navigation", path: "/pages/navigation.html" },
  { slug: "formulaires", path: "/pages/formulaires.html" },
  { slug: "data", path: "/pages/data.html" },
  { slug: "templates", path: "/pages/templates.html" },
  { slug: "feedback", path: "/pages/feedback.html" },
  { slug: "divers", path: "/pages/divers.html" },
] as const;

// La matrice mode dark/light est geree via Playwright `projects[]` (msyx-dark, msyx-light)
// -> 8 pages x 2 projets = 16 baselines.

const setMode = async (
  page: import("@playwright/test").Page,
  mode: "dark" | "light",
) => {
  await page.addInitScript((m: string) => {
    try {
      localStorage.setItem("msyx-theme", "msyx");
      localStorage.setItem("msyx-mode", m);
    } catch {}
  }, mode);
};

test.describe("Visual regression — msyx", () => {
  for (const { slug, path } of PAGES) {
    test(`${slug}`, async ({ page }, testInfo) => {
      const mode = testInfo.project.name.endsWith("-light") ? "light" : "dark";
      await setMode(page, mode);
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForFunction(
        () => document.fonts && document.fonts.status === "loaded",
      );
      // Stabilisation : laisse le scroll-spy + lazy-init JS se poser
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`${slug}.png`, {
        fullPage: true,
      });
    });
  }
});
