import { defineConfig, devices } from "@playwright/test";

// Functional browser tests for the billing console. Every `/api/*` call is
// intercepted in the browser (see tests/e2e/fixtures/mock-api.ts), so the suite
// runs against the real SPA without Postgres or an api-gateway behind it.
process.env.TZ = "UTC";

const PORT = Number(process.env.WEB_PORT ?? 5173);
const BASE_URL = process.env.WEB_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        // annotates the GitHub Actions run (and the PR diff) with failures
        ["github"],
        ["list"],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["html", { open: "never" }],
      ]
    : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "en-US",
    timezoneId: "UTC",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.WEB_BASE_URL
    ? undefined
    : {
        command: `vite --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
