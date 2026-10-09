import { expect, test } from "./fixtures/test.js";
import { CUSTOMER_ACME } from "./fixtures/data.js";
import { shortId } from "../../src/format.js";

const searchBox = /Search name or email/;

test.describe("customer directory", () => {
  test("lists the tenant's customers on open", async ({ app }) => {
    await app.open("Customers");

    await expect(app.rows()).toHaveCount(2);
    const acme = app.rows().first();
    await expect(acme).toContainText("Acme Corp");
    await expect(acme).toContainText("billing@acme.test");
    await expect(acme.locator("td.mono")).toHaveText(shortId(CUSTOMER_ACME));
    await expect(acme.locator("td.mono")).toHaveAttribute("title", CUSTOMER_ACME);
  });

  test("search sends the query to the API and narrows the table", async ({ app, mockApi }) => {
    await app.open("Customers");
    await expect(app.rows()).toHaveCount(2);

    await app.page.getByPlaceholder(searchBox).fill("globex");
    await app.page.getByRole("button", { name: "Search" }).click();

    await expect(app.rows()).toHaveCount(1);
    await expect(app.rows().first()).toContainText("Globex Industries");
    expect(mockApi.last("GET /v1/customers")?.query["q"]).toBe("globex");
  });

  test("a search with no matches shows the empty state", async ({ app }) => {
    await app.open("Customers");

    await app.page.getByPlaceholder(searchBox).fill("nobody-here");
    await app.page.getByRole("button", { name: "Search" }).click();

    await expect(app.page.getByText("No customers.")).toBeVisible();
  });

  test("shows a loading indicator while the directory is in flight", async ({ app, mockApi }) => {
    const release = mockApi.stall("GET /v1/customers");
    await app.open("Customers");

    await expect(app.panel("Customers").getByText("Loading…")).toBeVisible();
    await expect(app.page.locator("table")).toHaveCount(0);

    release();
    await expect(app.rows()).toHaveCount(2);
  });

  test("surfaces the API error message and no rows", async ({ app, mockApi }) => {
    mockApi.fail("GET /v1/customers", 503, "customer directory unavailable");
    await app.open("Customers");

    await expect(app.error()).toHaveText("customer directory unavailable");
    await expect(app.page.getByText("No customers.")).toBeVisible();
  });
});
