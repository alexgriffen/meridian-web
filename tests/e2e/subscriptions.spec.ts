import { expect, test } from "./fixtures/test.js";
import { CUSTOMER_ACME } from "./fixtures/data.js";
import { shortId } from "../../src/format.js";

const SUB_ENTERPRISE = "00000000-0000-4000-8000-000000000100";
const createForm = "form.create";

test.describe("subscriptions", () => {
  test("lists subscriptions with plan, period and status", async ({ app }) => {
    await app.open("Subscriptions");

    await expect(app.rows()).toHaveCount(2);
    const row = app.rows().filter({ hasText: shortId(SUB_ENTERPRISE) });
    await expect(row).toContainText("plan_enterprise");
    await expect(row.locator("span.badge")).toHaveText("active");
    await expect(app.rows().filter({ hasText: "plan_starter" }).locator("span.badge")).toHaveText(
      "past_due"
    );
  });

  test("status filter is pushed to the API and narrows the table", async ({ app, mockApi }) => {
    await app.open("Subscriptions");
    await expect(app.rows()).toHaveCount(2);

    await app.panel("Subscriptions").getByLabel("Status").selectOption("past_due");

    await expect(app.rows()).toHaveCount(1);
    await expect(app.rows().first()).toContainText("plan_starter");
    expect(mockApi.last("GET /v1/subscriptions")?.query["status"]).toBe("past_due");
  });

  test("creating a subscription submits the form values and refreshes the list", async ({
    app,
    mockApi,
  }) => {
    await app.open("Subscriptions");
    await expect(app.rows()).toHaveCount(2);

    const form = app.page.locator(createForm);
    await form.getByPlaceholder("customer_id").fill(CUSTOMER_ACME);
    await form.locator("select").selectOption("plan_starter");
    await form.getByPlaceholder("discount %").fill("25");
    await form.getByRole("button", { name: "Create" }).click();

    await expect(app.ok()).toContainText("Created subscription");
    await expect(app.rows()).toHaveCount(3);

    const posted = mockApi.last("POST /v1/subscriptions");
    expect(posted?.body).toMatchObject({
      customer_id: CUSTOMER_ACME,
      plan_id: "plan_starter",
      discount_pct: 25,
    });
    expect(mockApi.count("GET /v1/subscriptions")).toBeGreaterThanOrEqual(2);
  });

  test("a rejected creation shows the API error and leaves the list untouched", async ({
    app,
    mockApi,
  }) => {
    await app.open("Subscriptions");
    await expect(app.rows()).toHaveCount(2);

    mockApi.fail("POST /v1/subscriptions", 400, "unknown plan_id");
    await app.page.locator(createForm).getByRole("button", { name: "Create" }).click();

    await expect(app.error()).toHaveText("unknown plan_id");
    await expect(app.ok()).toHaveCount(0);
    await expect(app.rows()).toHaveCount(2);
  });

  test("switching a plan requests the opposite plan and reflects it in the row", async ({
    app,
    mockApi,
  }) => {
    await app.open("Subscriptions");
    const row = app.rows().filter({ hasText: shortId(SUB_ENTERPRISE) });
    await expect(row).toContainText("plan_enterprise");

    await row.getByRole("button", { name: "switch plan" }).click();

    await expect(app.ok()).toContainText(`${shortId(SUB_ENTERPRISE)} → plan_starter`);
    await expect(row).toContainText("plan_starter");

    const posted = mockApi.last("POST /v1/subscriptions/:id/plan-change");
    expect(posted?.path).toBe(`/v1/subscriptions/${SUB_ENTERPRISE}/plan-change`);
    expect(posted?.body).toMatchObject({ new_plan_id: "plan_starter" });
  });

  test("a failed plan change surfaces the error and keeps the current plan", async ({
    app,
    mockApi,
  }) => {
    await app.open("Subscriptions");
    const row = app.rows().filter({ hasText: shortId(SUB_ENTERPRISE) });
    await expect(row).toContainText("plan_enterprise");

    mockApi.fail("POST /v1/subscriptions/:id/plan-change", 409, "proration failed");
    await row.getByRole("button", { name: "switch plan" }).click();

    await expect(app.error()).toHaveText("proration failed");
    await expect(row).toContainText("plan_enterprise");
  });

  test("shows the empty state when the tenant has no subscriptions", async ({ app, mockApi }) => {
    mockApi.override("GET /v1/subscriptions", ({ route }) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"data":[]}' })
    );
    await app.open("Subscriptions");

    await expect(app.page.getByText("No subscriptions.")).toBeVisible();
  });
});
