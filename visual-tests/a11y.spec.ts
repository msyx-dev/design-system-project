/**
 * a11y.spec.ts — Audit axe-core, `color-contrast` bloquant sur MSYX
 * DS v2.52.0 — issue #242 ; banc fiabilisé en #976 ; verrou en #983
 *
 * Matrice 10 pages × 5 thèmes × 2 modes = 100 runs. Bloquant : `BLOCKING_RULES`
 * sur `BLOCKING_COMBOS`, plus la complétude. Le reste est en rapport, produit par
 * `reporters/a11y-report.ts`.
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

// Périmètre bloquant (décision de Mike sur #944, #983). Tout le reste reste en rapport :
// autres règles, autres thèmes, et résultats axe `incomplete` (jamais lus ici).
const BLOCKING_COMBOS: ReadonlyArray<{ theme: string; mode: "dark" | "light" }> = [
  { theme: "msyx", mode: "dark" },
  { theme: "msyx", mode: "light" },
];
const BLOCKING_RULES: readonly string[] = ["color-contrast"];

// Garde de matrice : un combo bloquant absent de THEME_COMBOS donnerait un périmètre vide, donc vert.
for (const c of BLOCKING_COMBOS) {
  if (!THEME_COMBOS.some((t) => t.theme === c.theme && t.mode === c.mode)) {
    throw new Error(
      `[a11y] BLOCKING_COMBOS ${c.theme}-${c.mode} absent de THEME_COMBOS`,
    );
  }
}

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

// Nœuds en violation d'une règle bloquante, sur un combo bloquant ; [] hors périmètre.
function blockingNodes(run: A11yRun): string[] {
  if (!BLOCKING_COMBOS.some((c) => c.theme === run.theme && c.mode === run.mode)) {
    return [];
  }
  return run.violations
    .filter((v) => BLOCKING_RULES.includes(v.id))
    .flatMap((v) =>
      v.nodes.map(
        (n) =>
          `${v.id} ${n.target.join(" ")}` +
          (n.contrast
            ? ` — ${n.contrast.fg} / ${n.contrast.bg} = ${n.contrast.ratio}:1 < ${n.contrast.expected}`
            : ""),
      ),
    );
}

// ---- Tests ----

test.describe(`A11y audit — color-contrast bloquant MSYX (${PAGES.length * THEME_COMBOS.length} runs)`, () => {
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

        // Visibilité dans le reporter : toutes les violations, bloquantes ou non.
        if (run.violations.length > 0) {
          console.log(
            `[a11y] ${runLabel}: ${run.violations.length} violation(s) — ` +
              run.violations.map((v) => `${v.id}(${v.impact})`).join(", "),
          );
        }

        // Complétude : un run en erreur (chargement, titre, axe) fait échouer le test.
        expect(run.error, "[a11y] run en erreur — complétude du banc").toBeUndefined();

        // Bloquant : BLOCKING_RULES sur BLOCKING_COMBOS. Posé APRÈS l'attachement,
        // pour que le reporter reçoive le run même quand le test échoue.
        const blocking = blockingNodes(run);
        expect(
          blocking,
          `[a11y] ${runLabel} — ${blocking.length} nœud(s) ${BLOCKING_RULES.join(", ")} bloquant(s)`,
        ).toEqual([]);
      });
    }
  }
});
