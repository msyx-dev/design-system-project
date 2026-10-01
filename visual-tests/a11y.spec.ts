/**
 * a11y.spec.ts — Axe-core dry-run audit
 * DS v2.52.0 — issue #242 ; banc fiabilisé en #976
 *
 * Matrice : 10 pages × 5 thèmes × 2 modes = 100 runs
 * Mode dry-run : ne fait PAS échouer le test sur violation (seule une erreur
 * de run — chargement, titre, axe — fait échouer le test).
 *
 * Aucun état n'est gardé ici : chaque test ATTACHE son résultat (`A11Y_ATTACHMENT`)
 * et le reporter `reporters/a11y-report.ts` (processus du runner, insensible aux
 * redémarrages de worker) produit docs/audit-a11y-<date>.md et
 * test-results-a11y/a11y-runs.json.
 *
 * Banc hermétique : les requêtes hors localhost sont abandonnées (le DS n'a pas de
 * dépendance externe) et le chargement attend `load`, pas `networkidle`.
 */

import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import {
  A11Y_ATTACHMENT,
  type A11yContrast,
  type A11yRun,
} from "./reporters/a11y-report";

// BASE_URL est fourni par playwright.a11y.config.ts via baseURL
// → utiliser des chemins relatifs dans page.goto()

const PAGES = [
  { slug: "fondation", path: "/pages/fondation.html", title: "Fondation" },
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
  {
    slug: "user-feedback",
    path: "/pages/user-feedback.html",
    title: "User Feedback",
  },
  { slug: "overlays", path: "/pages/overlays.html", title: "Overlays" },
  // divers.html : le <title> du <head> est "Avancé — msyx.design" (et non "Divers")
  { slug: "divers", path: "/pages/divers.html", title: "Avancé" },
] as const;

// THEME_CONFIG — tous les thèmes ont dark + light (source : shared/components.js)
const THEME_COMBOS: Array<{ theme: string; mode: string }> = [
  { theme: "msyx", mode: "dark" },
  { theme: "msyx", mode: "light" },
  { theme: "acssi", mode: "dark" },
  { theme: "acssi", mode: "light" },
  { theme: "nhood", mode: "dark" },
  { theme: "nhood", mode: "light" },
  { theme: "auchan", mode: "dark" },
  { theme: "auchan", mode: "light" },
  { theme: "noel", mode: "dark" },
  { theme: "noel", mode: "light" },
];

// ---- Helpers ----

async function setThemeAndMode(
  page: import("@playwright/test").Page,
  theme: string,
  mode: string,
): Promise<void> {
  await page.addInitScript(
    ({ t, m }: { t: string; m: string }) => {
      try {
        localStorage.setItem("msyx-theme", t);
        localStorage.setItem("msyx-mode", m);
      } catch {
        // ignore — contexte sans storage
      }
    },
    { t: theme, m: mode },
  );
}

type AxeNode = Awaited<
  ReturnType<AxeBuilder["analyze"]>
>["violations"][number]["nodes"][number];

// Données de la vérification axe `color-contrast` d'un nœud en violation
// (n.any[id="color-contrast"].data) : couleurs lues, ratio mesuré et attendu.
function pickContrast(n: AxeNode): A11yContrast | undefined {
  const d = n.any.find((c) => c.id === "color-contrast")?.data;
  if (!d) return undefined;
  return {
    fg: d.fgColor,
    bg: d.bgColor,
    ratio: d.contrastRatio,
    expected: d.expectedContrastRatio,
    fontSize: d.fontSize,
    fontWeight: d.fontWeight,
  };
}

// ---- Tests ----

test.describe(`A11y audit — dry-run (${PAGES.length * THEME_COMBOS.length} runs)`, () => {
  test.beforeEach(async ({ page }) => {
    // Banc hermétique : le DS n'a pas de dépendance externe ; une ressource tierce
    // (avatar de démo navigation.html:1003) ne doit ni ralentir ni faire expirer l'audit.
    await page.route(
      (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
      (route) => route.abort(),
    );
  });

  for (const { slug, path: pagePath, title } of PAGES) {
    for (const { theme, mode } of THEME_COMBOS) {
      // Contrat avec le reporter : titre « <slug> [<theme>-<mode>] » (TITLE_RE).
      const runLabel = `${slug} [${theme}-${mode}]`;

      test(runLabel, async ({ page }, testInfo) => {
        await setThemeAndMode(page, theme, mode);

        await page.goto(pagePath, {
          waitUntil: "load",
          timeout: 30_000,
        });

        // Garde-fou anti-régression Bug 1 (#286) : verifie qu'on audite bien
        // la page cible et pas index.html (fallback SPA du flag -s retire).
        // Pattern de titre DS : "<Titre> — msyx.design". Ancre sur "<Titre> —"
        // (et non \b : "Avancé" finit par "é", non-\w → \b ne matche pas).
        await expect(page).toHaveTitle(new RegExp(`^${title} —`));

        // Attente fonts + JS init
        await page
          .waitForFunction(
            () => document.fonts && document.fonts.status === "loaded",
            { timeout: 10_000 },
          )
          .catch(() => {
            // Non-bloquant si fonts ne charge pas
          });
        await page.waitForTimeout(500);

        const run: A11yRun = { page: slug, theme, mode, violations: [] };

        try {
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();

          run.violations = results.violations.map((v) => ({
            id: v.id,
            impact: v.impact ?? null,
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            nodes: v.nodes.map((n) => ({
              html: n.html,
              target: n.target.map((t) =>
                typeof t === "string" ? t : JSON.stringify(t),
              ),
              contrast: v.id === "color-contrast" ? pickContrast(n) : undefined,
            })),
          }));
        } catch (err) {
          run.error = String(err);
          console.warn(`[a11y] Erreur sur ${runLabel}: ${run.error}`);
        }

        // Le reporter (processus du runner) agrège : un attachement par test.
        await testInfo.attach(A11Y_ATTACHMENT, {
          body: JSON.stringify(run),
          contentType: "application/json",
        });

        // Dry-run : on ne fait PAS échouer ici sur violation
        // On log juste le nombre de violations pour visibilité dans le reporter
        if (run.violations.length > 0) {
          console.log(
            `[a11y] ${runLabel}: ${run.violations.length} violation(s) — ` +
              run.violations.map((v) => `${v.id}(${v.impact})`).join(", "),
          );
        }

        // Seule une erreur de run (axe) fait échouer le test
        expect(run.error).toBeUndefined();
      });
    }
  }
});
