import { createBdd } from "playwright-bdd";
import { expect, test } from "../fixtures.js";

// Long-running soak scenario (soak.feature). Holds the invoices tab open for
// SOAK_MINUTES and checks every 30s that auto-refresh (every 4s in the app) is
// still landing, the rows are intact, and no error is shown.
//
// SOAK_HANG=1 stalls the invoice API halfway through and then waits for the
// next refresh with no timeout, so the test hangs until Playwright's test
// timeout (SOAK_MINUTES + 2) kills it.
const { When, Then } = createBdd(test);

const CHECK_EVERY_MS = 30_000;

interface SoakStats {
  minutes: number;
  checks: number;
  refreshes: number;
}
const results = new WeakMap<object, SoakStats>();

When(
  "I leave the invoices tab open for the soak duration",
  async ({ app, mockApi, $testInfo }) => {
    const minutes = Number(process.env.SOAK_MINUTES ?? 16);
    const hang = process.env.SOAK_HANG === "1";
    if (!(minutes > 0)) throw new Error(`SOAK_MINUTES must be > 0, got "${process.env.SOAK_MINUTES}"`);
    $testInfo.setTimeout((minutes + 2) * 60_000);

    // count invoice-list responses that actually came back (requests alone keep
    // climbing even when the API is stalled)
    let refreshes = 0;
    app.page.on("response", (res) => {
      if (/\/api\/v1\/invoices(\?|$)/.test(res.url()) && res.ok()) refreshes++;
    });

    const log = (msg: string): void => console.log(`[soak] ${msg}`);
    log(`running for ${minutes} min${hang ? " (SOAK_HANG=1: will stall halfway)" : ""}`);

    const start = Date.now();
    const elapsedMin = (): number => (Date.now() - start) / 60_000;
    let checks = 0;
    let lastLoggedMinute = 0;
    let stalled = false;

    while (elapsedMin() < minutes) {
      const before = refreshes;

      if (hang && !stalled && elapsedMin() >= minutes / 2) {
        stalled = true;
        mockApi.stall("GET /v1/invoices"); // never released
        log(`minute ${elapsedMin().toFixed(1)}: invoice API stalled, waiting for a refresh that will not come`);
        await expect.poll(() => refreshes, { timeout: 0 }).toBeGreaterThan(before);
      }

      await app.page.waitForTimeout(Math.min(CHECK_EVERY_MS, (minutes - elapsedMin()) * 60_000));

      await expect.poll(() => refreshes, { timeout: 15_000 }).toBeGreaterThan(before);
      await expect(app.rows()).toHaveCount(2);
      await expect(app.error()).toHaveCount(0);
      checks++;

      const minute = Math.floor(elapsedMin());
      if (minute > lastLoggedMinute) {
        lastLoggedMinute = minute;
        log(`minute ${minute}/${minutes}: ${refreshes} refreshes, ${checks} checks passed, no errors`);
      }
    }

    results.set(mockApi, { minutes, checks, refreshes });
  }
);

Then("the invoice list kept refreshing without errors", async ({ app, mockApi }) => {
  const stats = results.get(mockApi);
  expect(stats, "soak step did not record results").toBeDefined();
  // the app polls every 4s; allow plenty of slack for a busy machine
  expect(stats!.refreshes).toBeGreaterThanOrEqual(Math.floor((stats!.minutes * 60) / 4 / 2));
  await expect(app.rows()).toHaveCount(2);
  await expect(app.error()).toHaveCount(0);
  console.log(`[soak] done: ${stats!.refreshes} refreshes over ${stats!.minutes} min, ${stats!.checks} checks`);
});
