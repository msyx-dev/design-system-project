/**
 * a11y-report.ts — Reporter Playwright de l'audit axe-core (#976).
 *
 * SEUL producteur du rapport Markdown `docs/audit-a11y-<date>.md` et de l'export
 * `test-results-a11y/a11y-runs.json`. Il tourne dans le processus du RUNNER, pas
 * dans un worker : un test qui échoue fait redémarrer le worker (`workers: 1`),
 * mais le runner, lui, voit chaque test — y compris ceux qui échouent AVANT
 * d'auditer (goto, titre…). Un tampon de module + `afterAll` perdait tout ce que
 * les workers précédents avaient accumulé (60 runs rapportés sur 90 en CI).
 *
 * Contrat avec `a11y.spec.ts` :
 *   - chaque test attache son résultat sous le nom `A11Y_ATTACHMENT` (JSON d'un
 *     `A11yRun`) ;
 *   - le titre d'un test est `<slug> [<theme>-<mode>]` (`TITLE_RE`) : c'est ce
 *     qui permet de nommer un run qui n'a pas pu attacher son résultat.
 *
 * Le reporter est déclaré dans `playwright.a11y.config.ts`. Attention : l'option
 * CLI `--reporter=…` REMPLACE les reporters de la config — ne jamais la passer.
 */

import type {
  FullConfig,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

export const A11Y_ATTACHMENT = "axe-run";

/** Données de la vérification axe `color-contrast` d'un nœud en violation. */
export interface A11yContrast {
  fg: string;
  bg: string;
  ratio: number;
  expected: string;
  fontSize: string;
  fontWeight: string;
}

export interface A11yNode {
  html: string;
  target: string[];
  /** Renseigné uniquement pour la règle `color-contrast`. */
  contrast?: A11yContrast;
}

export interface A11yViolation {
  id: string;
  impact: string | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: A11yNode[];
}

export interface A11yRun {
  page: string;
  theme: string;
  mode: string;
  violations: A11yViolation[];
  error?: string;
}

/** Titre de test « <slug> [<theme>-<mode>] » — contrat entre la spec et le reporter. */
const TITLE_RE = /^(\S+) \[([a-z]+)-(dark|light)\]$/;

const ROOT = path.resolve(__dirname, "../..");
const JSON_PATH = path.join(ROOT, "test-results-a11y", "a11y-runs.json");
const NODES_PER_RULE = 5; // limite d'affichage Markdown ; le JSON est exhaustif
const ANSI_RE = /\u001b\[[0-9;]*m/g;

/** Message d'erreur Playwright lisible : sans couleurs ANSI, 3 premières lignes utiles. */
function summarizeError(result: TestResult): string {
  const raw = result.error?.message ?? "";
  const lines = raw
    .replace(ANSI_RE, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  const text = lines.join(" · ").slice(0, 300);
  return text || `statut ${result.status}`;
}

function dsVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    );
    return typeof pkg.version === "string" ? `v${pkg.version}` : "inconnue";
  } catch {
    return "inconnue";
  }
}

export default class A11yReport implements Reporter {
  private runs = new Map<string, A11yRun>(); // clé test.id : un enregistrement par test
  private tests: TestCase[] = [];

  printsToStdio(): boolean {
    return false;
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.tests = suite.allTests();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const att = result.attachments.find(
      (a) => a.name === A11Y_ATTACHMENT && a.body,
    );
    if (att) {
      try {
        this.runs.set(test.id, JSON.parse(att.body!.toString("utf8")));
        return;
      } catch {
        // attachement illisible : traité comme un run en erreur, ci-dessous
      }
    }
    // Échec avant l'audit (goto, titre, expiration…) : le run est quand même rapporté.
    const m = TITLE_RE.exec(test.title);
    this.runs.set(test.id, {
      page: m?.[1] ?? test.title,
      theme: m?.[2] ?? "?",
      mode: m?.[3] ?? "?",
      violations: [],
      error: summarizeError(result),
    });
  }

  onEnd(): void {
    // Ordre de la suite (PAGES × THEME_COMBOS), pas ordre d'arrivée.
    const runs: A11yRun[] = [];
    const missing: TestCase[] = [];
    for (const t of this.tests) {
      const run = this.runs.get(t.id);
      if (run) runs.push(run);
      else missing.push(t);
    }
    const errors = runs.filter((r) => r.error);

    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(runs, null, 2) + "\n", "utf8");

    const reportDate = new Date().toISOString().slice(0, 10);
    const reportFile = `audit-a11y-${reportDate}.md`;
    fs.writeFileSync(
      path.join(ROOT, "docs", reportFile),
      renderMarkdown(runs, errors, missing, this.tests.length, reportDate),
      "utf8",
    );

    console.log(`\n[a11y] Rapport écrit : docs/${reportFile}`);
    console.log("[a11y] Export écrit : test-results-a11y/a11y-runs.json");
    console.log(
      `[a11y] ${runs.length} / ${this.tests.length} runs rapportés — ` +
        `${errors.length} en erreur — ${missing.length} manquants`,
    );
  }
}

function renderMarkdown(
  runs: A11yRun[],
  errors: A11yRun[],
  missing: TestCase[],
  expectedRuns: number,
  reportDate: string,
): string {
  const totalViolations = runs.reduce((s, r) => s + r.violations.length, 0);
  const totalNodes = runs.reduce(
    (s, r) => s + r.violations.reduce((s2, v) => s2 + v.nodes.length, 0),
    0,
  );

  // --- Agrégat par règle ---
  const ruleMap = new Map<
    string,
    { count: number; nodeCount: number; impact: string | null; help: string }
  >();
  for (const run of runs) {
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
  for (const run of runs) {
    for (const v of run.violations) {
      const key = v.impact ?? "unknown";
      severityCount[key] = (severityCount[key] ?? 0) + 1;
    }
  }

  const lines: string[] = [];
  lines.push("# Audit A11y — Design System MSYX");
  lines.push("");
  lines.push(`**Date** : ${reportDate}`);
  lines.push(`**Version DS** : ${dsVersion()} (\`package.json\` racine)`);
  lines.push(
    "**Scope** : WCAG 2.0 A/AA + WCAG 2.1 AA (`wcag2a`, `wcag2aa`, `wcag21aa`)",
  );
  lines.push("**Outil** : `@axe-core/playwright` v4.x (Deque axe-core)");
  lines.push("**Mode** : Dry-run — aucun test ne fail sur violation");
  lines.push(
    "**Producteur** : `visual-tests/reporters/a11y-report.ts` — export exhaustif : `test-results-a11y/a11y-runs.json`",
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Résumé exécutif");
  lines.push("");
  lines.push(`| Métrique | Valeur |`);
  lines.push(`|---|---|`);
  lines.push(`| Runs rapportés | ${runs.length} / ${expectedRuns} |`);
  lines.push(`| Erreurs de run | ${errors.length} |`);
  lines.push(`| Runs manquants | ${missing.length} |`);
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

  // Groupe par page, dans l'ordre d'apparition de la suite
  const pageOrder = [...new Set(runs.map((r) => r.page))];
  for (const slug of pageOrder) {
    const pageRuns = runs.filter((r) => r.page === slug);
    const pageViolationCount = pageRuns.reduce(
      (s, r) => s + r.violations.length,
      0,
    );
    lines.push(
      `### Page : \`${slug}\` — ${pageViolationCount} violation(s) sur ${pageRuns.length} runs`,
    );
    lines.push("");

    for (const run of pageRuns) {
      lines.push(`#### ${run.theme}-${run.mode}`);
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
          for (const node of v.nodes.slice(0, NODES_PER_RULE)) {
            lines.push(`- \`${node.target.join(" > ")}\``);
            const htmlSnippet = node.html.replace(/\n/g, " ").substring(0, 120);
            lines.push(`  \`\`\`html`);
            lines.push(`  ${htmlSnippet}`);
            lines.push(`  \`\`\``);
            if (node.contrast) {
              const c = node.contrast;
              lines.push(
                `  contraste : \`${c.fg}\` / \`${c.bg}\` — ${c.ratio}:1 < ${c.expected} (${c.fontSize}, ${c.fontWeight})`,
              );
            }
          }
          if (v.nodes.length > NODES_PER_RULE) {
            lines.push(
              `  _(… +${v.nodes.length - NODES_PER_RULE} noeuds non affichés)_`,
            );
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

  if (missing.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Runs manquants");
    lines.push("");
    lines.push(
      "Tests présents dans la suite mais jamais terminés (run interrompu) :",
    );
    lines.push("");
    for (const t of missing) {
      lines.push(`- ${t.title}`);
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
    `- Limites d'affichage : ${NODES_PER_RULE} noeuds max par règle par run (rapport concis) ; \`test-results-a11y/a11y-runs.json\` est exhaustif.`,
  );
  lines.push(
    "- `color-contrast` peut varier selon le rendu GPU/OS — vérifier manuellement les cas limites.",
  );
  lines.push("");

  return lines.join("\n");
}
