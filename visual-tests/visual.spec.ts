import { test, expect } from "@playwright/test";

const PAGES = [
  { slug: "fondation", path: "/pages/fondation.html" },
  { slug: "motion", path: "/pages/motion.html" },
  { slug: "composants", path: "/pages/composants.html" },
  { slug: "navigation", path: "/pages/navigation.html" },
  { slug: "formulaires", path: "/pages/formulaires.html" },
  { slug: "data", path: "/pages/data.html" },
  { slug: "templates", path: "/pages/templates.html" },
  { slug: "feedback", path: "/pages/feedback.html" },
  { slug: "divers", path: "/pages/divers.html" },
] as const;

// Matrice complete : 9 pages x 12 projets = 108 baselines (v2.38.0)
// Naming convention : <theme>-<mode>-<viewport> (ex: msyx-dark-desktop, acssi-light-mobile)

type Theme = "msyx" | "acssi" | "nhood";
type Mode = "dark" | "light";

// Parse "<theme>-<mode>-<viewport>" → { theme, mode }
const parseProjectName = (name: string): { theme: Theme; mode: Mode } => {
  const parts = name.split("-");
  return { theme: parts[0] as Theme, mode: parts[1] as Mode };
};

const setThemeAndMode = async (
  page: import("@playwright/test").Page,
  theme: Theme,
  mode: Mode,
) => {
  await page.addInitScript(
    ({ t, m }: { t: string; m: string }) => {
      try {
        localStorage.setItem("msyx-theme", t);
        localStorage.setItem("msyx-mode", m);
      } catch {}
    },
    { t: theme, m: mode },
  );
};

test.describe("Visual regression — full matrix", () => {
  for (const { slug, path } of PAGES) {
    test(`${slug}`, async ({ page }, testInfo) => {
      const { theme, mode } = parseProjectName(testInfo.project.name);
      await setThemeAndMode(page, theme, mode);
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
