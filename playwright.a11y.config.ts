/**
 * playwright.a11y.config.ts
 * Config Playwright dédiée au dry-run axe-core (issue #242).
 * Séparée de playwright.config.ts pour ne pas multiplier les 12 projets VR.
 * Un seul projet Chromium desktop — la matrice thème×mode est gérée en interne par a11y.spec.ts.
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = 3001;

export default defineConfig({
  testDir: "visual-tests",
  testMatch: "**/a11y.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-a11y", open: "never" }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "off",
    animations: "disabled",
    viewport: { width: 1280, height: 800 },
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Serveur statique = `http-server` (#286) — voir playwright.config.ts
    // pour le détail (flag `-s` SPA + instabilité `serve` sous charge).
    command: `npx http-server -p ${PORT} -c-1 --silent .`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  outputDir: "test-results-a11y/",
});
