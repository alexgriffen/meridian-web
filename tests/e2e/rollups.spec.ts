import { expect, test } from "./fixtures/test.js";
import { CUSTOMER_ACME } from "./fixtures/data.js";
import { shortId } from "../../src/format.js";

test.describe("daily usage rollups", () => {
  test("lists aggregates with day, metric and formatted quantity", async ({ app }) => {
    await app.open("Rollups");

    await expect(app.rows()).toHaveCount(3);
    const row = app.rows().filter({ hasText: "api_calls" }).first();
    await expect(row).toContainText("2026-07-27");
    await expect(row).toContainText(shortId(CUSTOMER_ACME));
    await expect(row).toContainText("12,500");
  });

  test("metric filter is pushed to the API and narrows the table", async ({ app, mockApi }) => {
    await app.open("Rollups");
    await expect(app.rows()).toHaveCount(3);

    await app.page.getByPlaceholder(/filter metric/).fill("seats");

    await expect(app.rows()).toHaveCount(1);
    await expect(app.rows().first()).toContainText("seats");
    await expect.poll(() => mockApi.last("GET /v1/usage/rollups")?.query["metric"]).toBe("seats");
  });

  test("shows the empty state when nothing has been rolled up yet", async ({ app, mockApi }) => {
    mockApi.override("GET /v1/usage/rollups", ({ route }) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"data":[]}' })
    );
    await app.open("Rollups");

    await expect(app.page.getByText(/No rollups yet/)).toBeVisible();
  });

  test("surfaces the API error message", async ({ app, mockApi }) => {
    mockApi.fail("GET /v1/usage/rollups", 500, "rollup query failed");
    await app.open("Rollups");

    await expect(app.error()).toHaveText("rollup query failed");
  });

  test("auto-refresh picks up usage posted from the usage tab", async ({ app }) => {
    await app.open("Usage");
    const form = app.page.locator("form.create");
    await form.getByPlaceholder("metric", { exact: true }).fill("webhooks_sent");
    await form.getByPlaceholder("quantity").fill("9");
    await form.getByRole("button", { name: "Send event" }).click();
    await expect(app.page.locator("pre.logbox")).toContainText("webhooks_sent × 9");

    await app.goTo("Rollups");

    const row = app.rows().filter({ hasText: "webhooks_sent" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("9");
    await expect(row).toContainText(shortId(CUSTOMER_ACME));
  });

  test("turning auto-refresh off stops the polling", async ({ app, mockApi }) => {
    await app.open("Rollups");
    await expect(app.rows()).toHaveCount(3);

    await app.page.getByLabel("auto-refresh").uncheck();
    await app.page.waitForTimeout(500);
    const settled = mockApi.count("GET /v1/usage/rollups");

    await app.page.waitForTimeout(5_000);
    expect(mockApi.count("GET /v1/usage/rollups")).toBe(settled);

    await app.panel("Daily usage rollups").getByRole("button", { name: "Refresh" }).click();
    await expect.poll(() => mockApi.count("GET /v1/usage/rollups")).toBe(settled + 1);
  });
});
