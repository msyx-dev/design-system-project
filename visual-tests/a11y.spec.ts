/**
 * a11y.spec.ts — Axe-core dry-run audit
 * DS v2.52.0 — issue #242
 *
 * Matrice : 9 pages × 3 thèmes × 2 modes = 54 runs
 * Mode dry-run : ne fait PAS échouer le test sur violation.
 * Produit docs/audit-a11y-2026-05-09.md après tous les runs.
 */

import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import * as fs from "fs";
import * as path from "path";

// BASE_URL est fourni par playwright.a11y.config.ts via baseURL
// → utiliser des chemins relatifs dans page.goto()

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

// THEME_CONFIG — tous les thèmes ont dark + light (source : shared/components.js)
const THEME_COMBOS: Array<{ theme: string; mode: string }> = [
  { theme: "msyx", mode: "dark" },
  { theme: "msyx", mode: "light" },
  { theme: "acssi", mode: "dark" },
  { theme: "acssi", mode: "light" },
  { theme: "nhood", mode: "dark" },
  { theme: "nhood", mode: "light" },
];

// --- Buffer des résultats pour le rapport afterAll ---
interface RunResult {
  page: string;
  theme: string;
  mode: string;
  violations: AxeViolation[];
  error?: string;
}

interface AxeViolation {
  id: string;
  impact: string | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{ html: string; target: string[] }>;
}

const allResults: RunResult[] = [];

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

// ---- Tests ----

test.describe("A11y audit — dry-run (54 runs)", () => {
  for (const { slug, path: pagePath, title } of PAGES) {
    for (const { theme, mode } of THEME_COMBOS) {
      const runLabel = `${slug} [${theme}-${mode}]`;

      test(runLabel, async ({ page }) => {
        await setThemeAndMode(page, theme, mode);

        await page.goto(pagePath, {
          waitUntil: "networkidle",
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

        let violations: AxeViolation[] = [];
        let runError: string | undefined;

        try {
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();

          violations = results.violations.map((v) => ({
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
            })),
          }));
        } catch (err) {
          runError = String(err);
          console.warn(`[a11y] Erreur sur ${runLabel}: ${runError}`);
        }

        allResults.push({
          page: slug,
          theme,
          mode,
          violations,
          error: runError,
        });

        // Dry-run : on ne fait PAS échouer ici
        // On log juste le nombre de violations pour visibilité dans le reporter
        if (violations.length > 0) {
          console.log(
            `[a11y] ${runLabel}: ${violations.length} violation(s) — ` +
              violations.map((v) => `${v.id}(${v.impact})`).join(", "),
          );
        }

        // Assertion soft : toujours passer (dry-run)
        expect(runError).toBeUndefined();
      });
    }
  }
});

// ---- Rapport afterAll ----

test.afterAll(async () => {
  // --- Calculs ---
  const totalRuns = allResults.length;
  const totalViolations = allResults.reduce(
    (sum, r) => sum + r.violations.length,
    0,
  );
  const totalNodes = allResults.reduce(
    (sum, r) => sum + r.violations.reduce((s2, v) => s2 + v.nodes.length, 0),
    0,
  );
  const errors = allResults.filter((r) => r.error);

  // --- Agrégat par règle ---
  const ruleMap = new Map<
    string,
    { count: number; nodeCount: number; impact: string | null; help: string }
  >();
  for (const run of allResults) {
    for (const v of run.violations) {
      const existing = ruleMap.get(v.id);
      if (existing) {
        existing.count += 1;
        existing.nodeCount += v.nodes.length;
      } else {
        ruleMap.set(v.id, {
          count: 1,
          nodeCount: v.nodes.length,
          impact: v.impact,
          help: v.help,
        });
      }
    }
  }

  // Tri par count décroissant
  const sortedRules = [...ruleMap.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );

  // --- Comptage par sévérité ---
  const severityCount: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    unknown: 0,
  };
  for (const run of allResults) {
    for (const v of run.violations) {
      const key = v.impact ?? "unknown";
      severityCount[key] = (severityCount[key] ?? 0) + 1;
    }
  }

  // --- Génération Markdown ---
  const lines: string[] = [];

  const reportDate = new Date().toISOString().slice(0, 10);
  lines.push("# Audit A11y — Design System MSYX");
  lines.push("");
  lines.push(`**Date** : ${reportDate}`);
  lines.push(
    "**Version DS** : v2.56.1 (issue #286 — régénération sur vrai contenu)",
  );
  lines.push(
    "**Scope** : WCAG 2.0 A/AA + WCAG 2.1 AA (`wcag2a`, `wcag2aa`, `wcag21aa`)",
  );
  lines.push("**Outil** : `@axe-core/playwright` v4.x (Deque axe-core)");
  lines.push("**Mode** : Dry-run — aucun test ne fail sur violation");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Résumé exécutif");
  lines.push("");
  lines.push(`| Métrique | Valeur |`);
  lines.push(`|---|---|`);
  lines.push(`| Runs exécutés | ${totalRuns} / 54 |`);
  lines.push(`| Erreurs de run | ${errors.length} |`);
  lines.push(`| Règles violées (instances) | ${totalViolations} |`);
  lines.push(`| Noeuds HTML impactés | ${totalNodes} |`);
  lines.push(`| Règles distinctes violées | ${ruleMap.size} |`);
  lines.push("");
  lines.push("### Violations par sévérité");
  lines.push("");
  lines.push(`| Sévérité | Count |`);
  lines.push(`|---|---|`);
  for (const [sev, count] of Object.entries(severityCount)) {
    if (count > 0) {
      lines.push(`| ${sev} | ${count} |`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Tableau par règle");
  lines.push("");
  lines.push("| Règle (id) | Sévérité | Runs touchés | Noeuds | Description |");
  lines.push("|---|---|---|---|---|");
  for (const [ruleId, info] of sortedRules) {
    lines.push(
      `| \`${ruleId}\` | ${info.impact ?? "unknown"} | ${info.count} | ${info.nodeCount} | ${info.help} |`,
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Détail par run");
  lines.push("");

  // Groupe par page
  const pageOrder = PAGES.map((p) => p.slug);
  for (const slug of pageOrder) {
    const pageRuns = allResults.filter((r) => r.page === slug);
    if (pageRuns.length === 0) continue;

    const pageViolationCount = pageRuns.reduce(
      (s, r) => s + r.violations.length,
      0,
    );
    lines.push(
      `### Page : \`${slug}\` — ${pageViolationCount} violation(s) sur ${pageRuns.length} runs`,
    );
    lines.push("");

    for (const run of pageRuns) {
      const runId = `${run.theme}-${run.mode}`;
      lines.push(`#### ${runId}`);
      lines.push("");

      if (run.error) {
        lines.push(`> **Erreur de run** : \`${run.error}\``);
        lines.push("");
        continue;
      }

      if (run.violations.length === 0) {
        lines.push("Aucune violation WCAG 2.0/2.1 A/AA détectée.");
        lines.push("");
        continue;
      }

      lines.push(`${run.violations.length} violation(s) :`);
      lines.push("");

      for (const v of run.violations) {
        lines.push(`**\`${v.id}\`** — impact : **${v.impact ?? "unknown"}**`);
        lines.push("");
        lines.push(`${v.help}`);
        lines.push(`_Réf : ${v.helpUrl}_`);
        lines.push("");

        if (v.nodes.length > 0) {
          lines.push(`Noeuds impactés (${v.nodes.length}) :`);
          lines.push("");
          for (const node of v.nodes.slice(0, 5)) {
            // Limiter à 5 noeuds par règle pour lisibilité
            const selector = node.target.join(" > ");
            lines.push(`- \`${selector}\``);
            const htmlSnippet = node.html.replace(/\n/g, " ").substring(0, 120);
            lines.push(`  \`\`\`html`);
            lines.push(`  ${htmlSnippet}`);
            lines.push(`  \`\`\``);
          }
          if (v.nodes.length > 5) {
            lines.push(`  _(… +${v.nodes.length - 5} noeuds non affichés)_`);
          }
          lines.push("");
        }
      }
    }
  }

  if (errors.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Erreurs de run");
    lines.push("");
    for (const r of errors) {
      lines.push(`- **${r.page} [${r.theme}-${r.mode}]** : \`${r.error}\``);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push(
    "- Ce rapport est un **dry-run**. Aucune correction n'a été appliquée.",
  );
  lines.push(
    "- Limites d'affichage : 5 noeuds max par règle par run (rapport concis).",
  );
  lines.push(
    "- Prochaine étape : créer issue #238-fix avec estimation basée sur ce rapport.",
  );
  lines.push(
    "- `color-contrast` peut varier selon le rendu GPU/OS — vérifier manuellement les cas limites.",
  );
  lines.push("");

  // --- Écriture fichier ---
  const reportFile = `audit-a11y-${reportDate}.md`;
  const reportPath = path.resolve(__dirname, `../docs/${reportFile}`);
  const content = lines.join("\n");

  fs.writeFileSync(reportPath, content, "utf8");

  console.log(`\n[a11y] Rapport écrit : docs/${reportFile}`);
  console.log(
    `[a11y] ${totalRuns} runs — ${totalViolations} violations — ${ruleMap.size} règles distinctes`,
  );
  console.log(`[a11y] Sévérités :`, severityCount);
});
