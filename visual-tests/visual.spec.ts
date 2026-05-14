import { test, expect } from "@playwright/test";

const PAGES = [
  { slug: "fondation", path: "/pages/fondation.html", title: "Fondation" },
  { slug: "motion", path: "/pages/motion.html", title: "Motion" },
  { slug: "composants", path: "/pages/composants.html", title: "Composants" },
  { slug: "navigation", path: "/pages/navigation.html", title: "Navigation" },
  {
    slug: "formulaires",
    path: "/pages/formulaires.html",
    title: "Formulaires",
  },
  { slug: "data", path: "/pages/data.html", title: "Data" },
  { slug: "templates", path: "/pages/templates.html", title: "Templates" },
  { slug: "feedback", path: "/pages/feedback.html", title: "Feedback" },
  // divers.html : le <title> du <head> est "Avancé — msyx.design" (et non "Divers")
  { slug: "divers", path: "/pages/divers.html", title: "Avancé" },
] as const;

// Matrice : 9 pages x 12 projets. Depuis #286, capture PAR SECTION
// (fullPage retiré — hauteur fullPage non déterministe sur pages longues).
// Naming baseline : <slug>__<section-id>.png
// Le titre attendu sert de garde-fou anti-régression Bug 1 (#286) : si le
// harness retombe sur index.html, l'assertion de titre echoue immediatement.

type Theme = "msyx" | "acssi" | "nhood";
type Mode = "dark" | "light";

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

test.describe("Visual regression — full matrix (par section)", () => {
  for (const { slug, path, title } of PAGES) {
    test(`${slug}`, async ({ page }, testInfo) => {
      const { theme, mode } = parseProjectName(testInfo.project.name);
      await setThemeAndMode(page, theme, mode);
      await page.goto(path, { waitUntil: "networkidle" });

      // --- Garde-fou anti-régression Bug 1 (#286) ---
      // index.html a un <title> different : si le flag -s revient ou que
      // serve.json est mal configure, ce test echoue ICI, pas en silence.
      // Pattern de titre DS : "<Titre> — msyx.design". On ancre sur "<Titre> —"
      // (et non \b : "Avancé" finit par "é", non-\w → \b ne matche pas).
      await expect(page).toHaveTitle(new RegExp(`^${title} —`));

      await page.waitForFunction(
        () => document.fonts && document.fonts.status === "loaded",
      );
      // Stabilisation : laisse le scroll-spy + lazy-init JS se poser
      await page.waitForTimeout(300);

      // Énumère toutes les sections de la page (pattern HTML stable :
      // .main > section[id]). Une baseline par section.
      const sectionIds = await page
        .locator(".main > section[id]")
        .evaluateAll((els) => els.map((e) => e.id));

      expect(
        sectionIds.length,
        `${slug} : aucune <section id> trouvée — page mal chargée ?`,
      ).toBeGreaterThan(0);

      for (const sectionId of sectionIds) {
        const section = page.locator(`#${sectionId}`);
        await section.scrollIntoViewIfNeeded();
        await expect(section).toHaveScreenshot(`${slug}__${sectionId}.png`);
      }
    });
  }
});
