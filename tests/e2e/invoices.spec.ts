import { expect, test } from "./fixtures/test.js";
import { CUSTOMER_ACME } from "./fixtures/data.js";
import { money, shortId } from "../../src/format.js";

const INVOICE_OPEN = "00000000-0000-4000-8000-000000000200";
const INVOICE_PAID = "00000000-0000-4000-8000-000000000201";
const SUB_ENTERPRISE = "00000000-0000-4000-8000-000000000100";

test.describe("invoices list", () => {
  test("lists invoices with formatted totals and status badges", async ({ app }) => {
    await app.open();

    await expect(app.rows()).toHaveCount(2);
    const row = app.rows().filter({ hasText: shortId(INVOICE_OPEN) });
    await expect(row).toContainText(money(454650, "USD"));
    await expect(row).toContainText(shortId(CUSTOMER_ACME));
    await expect(row.locator("span.badge")).toHaveText("open");
  });

  test("status filter is pushed to the API and narrows the table", async ({ app, mockApi }) => {
    await app.open();
    await expect(app.rows()).toHaveCount(2);

    await app.panel("Invoices").getByLabel("Status").selectOption("paid");

    await expect(app.rows()).toHaveCount(1);
    await expect(app.rows().first().locator("span.badge")).toHaveText("paid");
    await expect
      .poll(() => mockApi.last("GET /v1/invoices")?.query["status"])
      .toBe("paid");
  });

  test("shows the empty state when no invoices have been generated", async ({ app, mockApi }) => {
    mockApi.override("GET /v1/invoices", ({ route }) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"data":[]}' })
    );
    await app.open();

    await expect(app.page.getByText(/No invoices yet/)).toBeVisible();
  });

  test("surfaces the API error message", async ({ app, mockApi }) => {
    mockApi.fail("GET /v1/invoices", 500, "invoice query failed");
    await app.open();

    await expect(app.error()).toHaveText("invoice query failed");
  });
});

test.describe("invoices refresh", () => {
  test("auto-refresh keeps polling the invoice list", async ({ app, mockApi }) => {
    await app.open();
    await expect(app.rows()).toHaveCount(2);

    await expect(app.page.getByLabel("auto-refresh")).toBeChecked();
    await expect
      .poll(() => mockApi.count("GET /v1/invoices"), { timeout: 15_000, intervals: [500] })
      .toBeGreaterThanOrEqual(3);
  });

  test("turning auto-refresh off stops the polling, and Refresh still reloads once", async ({
    app,
    mockApi,
  }) => {
    await app.open();
    await expect(app.rows()).toHaveCount(2);

    await app.page.getByLabel("auto-refresh").uncheck();
    await app.page.waitForTimeout(500);
    const settled = mockApi.count("GET /v1/invoices");

    await app.page.waitForTimeout(5_000);
    expect(mockApi.count("GET /v1/invoices")).toBe(settled);

    await app.panel("Invoices").getByRole("button", { name: "Refresh" }).click();
    await expect.poll(() => mockApi.count("GET /v1/invoices")).toBe(settled + 1);
  });
});

test.describe("invoice detail drawer", () => {
  test("opening a row shows the subtotal / tax / total breakdown", async ({ app, mockApi }) => {
    await app.open();
    await app.rows().filter({ hasText: shortId(INVOICE_OPEN) }).click();

    const drawer = app.page.locator("aside.drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.locator(".amount")).toContainText(money(454650, "USD"));
    await expect(drawer.locator(".amount .badge")).toHaveText("open");

    await expect(drawer.locator(".kv", { hasText: "Subtotal" })).toContainText(
      money(420000, "USD")
    );
    await expect(drawer.locator(".kv", { hasText: "Tax" })).toContainText(money(34650, "USD"));
    await expect(drawer.locator(".kv.strong", { hasText: "Total" })).toContainText(
      money(454650, "USD")
    );
    await expect(drawer.getByText(INVOICE_OPEN)).toBeVisible();
    await expect(drawer.getByText(CUSTOMER_ACME)).toBeVisible();
    await expect(drawer.getByText(SUB_ENTERPRISE)).toBeVisible();

    expect(mockApi.last("GET /v1/invoices/:id")?.path).toBe(`/v1/invoices/${INVOICE_OPEN}`);
  });

  test("an invoice without a subscription renders a placeholder instead", async ({ app }) => {
    await app.open();
    await app.rows().filter({ hasText: shortId(INVOICE_PAID) }).click();

    const drawer = app.page.locator("aside.drawer");
    await expect(drawer.locator(".kv", { hasText: "Subscription" })).toContainText("—");
  });

  test("the drawer closes from the close control and from the backdrop", async ({ app }) => {
    await app.open();
    const drawer = app.page.locator("aside.drawer");

    await app.rows().first().click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "close" }).click();
    await expect(drawer).toHaveCount(0);

    await app.rows().first().click();
    await expect(drawer).toBeVisible();
    await app.page.locator(".drawer-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(drawer).toHaveCount(0);
  });

  test("shows a loading state and then the invoice", async ({ app, mockApi }) => {
    const release = mockApi.stall("GET /v1/invoices/:id");
    await app.open();

    await app.rows().filter({ hasText: shortId(INVOICE_OPEN) }).click();
    const drawer = app.page.locator("aside.drawer");
    await expect(drawer.getByText("Loading…")).toBeVisible();

    release();
    await expect(drawer.locator(".amount")).toContainText(money(454650, "USD"));
  });

  test("surfaces an error when the invoice cannot be loaded", async ({ app, mockApi }) => {
    mockApi.fail("GET /v1/invoices/:id", 404, "not found");
    await app.open();

    await app.rows().first().click();
    const drawer = app.page.locator("aside.drawer");
    await expect(drawer.locator("p.error")).toHaveText("not found");
    await expect(drawer.locator(".amount")).toHaveCount(0);
  });
});
