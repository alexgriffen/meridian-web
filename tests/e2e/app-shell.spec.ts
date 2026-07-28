import { expect, test } from "./fixtures/test.js";
import { TENANT_A, TENANT_B } from "./fixtures/data.js";

test.describe("console shell", () => {
  test("opens on the invoices tab", async ({ app, mockApi }) => {
    await app.open();

    await expect(app.tab("Invoices")).toHaveClass(/active/);
    await expect(app.panel("Invoices")).toBeVisible();
    expect(mockApi.count("GET /v1/invoices")).toBeGreaterThanOrEqual(1);
  });

  test("each tab renders its own panel and loads its own data", async ({ app, mockApi }) => {
    await app.open();

    await app.goTo("Customers");
    await expect(app.panel("Customers")).toBeVisible();
    await expect.poll(() => mockApi.count("GET /v1/customers")).toBeGreaterThanOrEqual(1);

    await app.goTo("Subscriptions");
    await expect(app.panel("Subscriptions")).toBeVisible();
    await expect.poll(() => mockApi.count("GET /v1/subscriptions")).toBeGreaterThanOrEqual(1);

    await app.goTo("Usage");
    await expect(app.panel("Post usage")).toBeVisible();

    await app.goTo("Rollups");
    await expect(app.panel("Daily usage rollups")).toBeVisible();
    await expect.poll(() => mockApi.count("GET /v1/usage/rollups")).toBeGreaterThanOrEqual(1);

    await expect(app.tab("Rollups")).toHaveClass(/active/);
    await expect(app.tab("Invoices")).not.toHaveClass(/active/);
  });

  test("every API call carries the selected tenant", async ({ app, mockApi }) => {
    await app.open("Customers");
    await expect.poll(() => mockApi.count("GET /v1/customers")).toBeGreaterThanOrEqual(1);

    expect(mockApi.requests.length).toBeGreaterThan(0);
    for (const req of mockApi.requests) {
      expect(req.headers["x-tenant-id"]).toBe(TENANT_A);
    }
  });

  test("switching tenant re-scopes subsequent requests and refetches", async ({
    app,
    mockApi,
  }) => {
    await app.open("Customers");
    await expect.poll(() => mockApi.count("GET /v1/customers")).toBeGreaterThanOrEqual(1);
    const before = mockApi.count("GET /v1/customers");

    await app.tenantInput().fill(TENANT_B);

    await expect.poll(() => mockApi.count("GET /v1/customers")).toBeGreaterThan(before);
    expect(mockApi.last("GET /v1/customers")?.headers["x-tenant-id"]).toBe(TENANT_B);
  });

  test("tenant selection survives a reload and can be reset", async ({ app, mockApi }) => {
    await app.open("Customers");
    await app.tenantInput().fill(TENANT_B);
    await expect.poll(() => mockApi.last("GET /v1/customers")?.headers["x-tenant-id"]).toBe(
      TENANT_B
    );

    await app.page.reload();
    await expect(app.tenantInput()).toHaveValue(TENANT_B);

    const resetLink = app.page.getByRole("button", { name: "reset" });
    await expect(resetLink).toBeVisible();
    await resetLink.click();

    await expect(app.tenantInput()).toHaveValue(TENANT_A);
    await expect(resetLink).toBeHidden();
    await expect
      .poll(() => mockApi.last("GET /v1/invoices")?.headers["x-tenant-id"])
      .toBe(TENANT_A);
  });
});
