import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// Matrice complete : 3 themes x 2 modes x 2 viewports = 12 projects
// 12 projects x 9 pages, capture PAR SECTION depuis #286 (v2.56.1)
// → 1 baseline par <section id> de chaque page (voir visual.spec.ts)
const THEMES = ["msyx", "acssi", "nhood"] as const;
const MODES = ["dark", "light"] as const;
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 667 },
] as const;

const projects = THEMES.flatMap((theme) =>
  MODES.flatMap((mode) =>
    VIEWPORTS.map((vp) => ({
      name: `${theme}-${mode}-${vp.name}`,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: vp.width, height: vp.height },
      },
    })),
  ),
);

export default defineConfig({
  testDir: "visual-tests",
  // testMatch RESTREINT (#286) : sans lui, `playwright test` ramassait aussi
  // a11y.spec.ts (sa propre matrice interne de 54 runs) et le relançait 1×
  // par projet VR (12×) — 648 runs a11y parasites + 12 réécritures
  // concurrentes de docs/audit-a11y-<date>.md (rapport corrompu, données
  // partielles selon le worker). a11y.spec.ts a sa config dédiée
  // (playwright.a11y.config.ts) et son script `test:a11y` : il ne doit PAS
  // tourner sous `test:visual`. On garde visual.spec.ts (VR) + modal-focus
  // (smoke a11y rapide, 1 test) qui dépendent de cette config.
  testMatch: ["**/visual.spec.ts", "**/modal-focus.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // viewport retire du use global : chaque project porte le sien
    animations: "disabled",
    caret: "hide",
  },
  expect: {
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixelRatio: 0.01,
    },
  },
  projects,
  webServer: {
    // -s (--single) RETIRÉ : il forçait un fallback SPA vers index.html pour
    // toute route sans extension → le harness testait index.html (issue #286).
    // serve.json à la racine désactive clean-URLs : /pages/x.html servi tel quel.
    command: `npx serve -l ${PORT} .`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  snapshotPathTemplate: "{testDir}/baseline/{projectName}/{arg}{ext}",
  outputDir: "test-results/",
});
