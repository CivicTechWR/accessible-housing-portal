import { defineConfig, devices } from "@playwright/test";

import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./e2e/settings.ts";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/test-results",
  fullyParallel: true,
  // `next dev` compiles each route on its first request, which can be slow on a cold CI runner.
  timeout: 120_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "e2e/report", open: "never" }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      grepInvert: /@desktop-only/,
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    // Prepares the isolated review database, then serves the app from .next-review
    // so it can run beside a normal `npm run dev` on port 3000. This is `next dev` because
    // lib/auth.ts requires an HTTPS BETTER_AUTH_URL in production. Playwright never reuses a
    // running server by default, so the database is reset before every run.
    command: `node --conditions=react-server --import tsx e2e/prepare-database.ts && npm run dev -- --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    timeout: 180_000,
    stdout: "pipe",
    env: {
      HOMEHUB_REVIEW: "true",
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: E2E_BASE_URL,
      // Test-only values; the review server never sends mail or runs the email worker.
      BETTER_AUTH_SECRET: "playwright-only-auth-secret-not-for-production-use",
      EMAIL_JOB_SECRET: "playwright-only-email-job-secret-not-for-production",
      EMAIL_TRANSPORT: "capture",
      EMAIL_CAPTURE_DIR: ".review/emails",
      EMAIL_WORKER_ENABLED: "false",
      WALKSCORE_API_KEY: "",
    },
  },
});
