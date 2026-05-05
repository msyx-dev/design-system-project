import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "visual-tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 800 },
    animations: "disabled",
    caret: "hide",
  },
  expect: {
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: "msyx-dark",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "msyx-light",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx serve -l ${PORT} -s .`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  snapshotPathTemplate: "{testDir}/baseline/{projectName}/{arg}{ext}",
  outputDir: "test-results/",
});
