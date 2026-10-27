import { createBdd } from "playwright-bdd";
import { expect, test, type TabName } from "../fixtures.js";
import { CUSTOMER_ACME, CUSTOMER_GLOBEX, TENANT_A, TENANT_B } from "../../e2e/fixtures/data.js";
import { shortId } from "../../../src/format.js";

// Step definitions for the Gherkin scenarios in ../features. They drive the same
// ConsoleApp page object and in-browser MockApi as the e2e specs, so no backend
// is needed. Step text is matched regardless of keyword, so a step defined with
// Given also serves "Then the ..." lines.
const { Given, When, Then } = createBdd(test);

const CUSTOMERS: Record<string, string> = {
  "Acme Corp": CUSTOMER_ACME,
  "Globex Industries": CUSTOMER_GLOBEX,
};
const TENANTS: Record<string, string> = { A: TENANT_A, B: TENANT_B };

function customerId(name: string): string {
  const id = CUSTOMERS[name];
  if (!id) throw new Error(`unknown customer "${name}"`);
  return id;
}

function tenantId(label: string): string {
  const id = TENANTS[label];
  if (!id) throw new Error(`unknown tenant "${label}"`);
  return id;
}

// --- shared -----------------------------------------------------------------

Given("I am on the {string} tab", async ({ app }, tab: string) => {
  await app.open(tab as TabName);
});

// --- customers --------------------------------------------------------------

Given(/^the directory lists (\d+) customers?$/, async ({ app }, count: string) => {
  await expect(app.rows()).toHaveCount(Number(count));
});

When("I search customers for {string}", async ({ app }, query: string) => {
  await app.page.getByPlaceholder(/Search name or email/).fill(query);
  await app.page.getByRole("button", { name: "Search" }).click();
});

Then("the first row shows {string}", async ({ app }, text: string) => {
  await expect(app.rows().first()).toContainText(text);
});

Then("the customer search API was called with {string}", async ({ mockApi }, query: string) => {
  expect(mockApi.last("GET /v1/customers")?.query["q"]).toBe(query);
});

// --- invoices ---------------------------------------------------------------

Given(/^the invoice list shows (\d+) invoices?$/, async ({ app }, count: string) => {
  await expect(app.rows()).toHaveCount(Number(count));
});

When("I filter invoices by status {string}", async ({ app }, status: string) => {
  await app.panel("Invoices").getByLabel("Status").selectOption(status);
});

Then("every invoice has status {string}", async ({ app }, status: string) => {
  const badges = app.rows().locator("span.badge");
  await expect(badges).not.toHaveCount(0);
  for (const badge of await badges.all()) await expect(badge).toHaveText(status);
});

When("I open the invoice for {string}", async ({ app }, customer: string) => {
  await app.rows().filter({ hasText: shortId(customerId(customer)) }).click();
  await expect(app.page.locator("aside.drawer")).toBeVisible();
});

Then("the invoice drawer shows a subtotal of {string}", async ({ app }, amount: string) => {
  await expect(app.page.locator("aside.drawer .kv", { hasText: "Subtotal" })).toContainText(amount);
});

Then("the invoice drawer shows tax of {string}", async ({ app }, amount: string) => {
  await expect(app.page.locator("aside.drawer .kv", { hasText: "Tax" })).toContainText(amount);
});

Then("the invoice drawer shows a total of {string}", async ({ app }, amount: string) => {
  await expect(app.page.locator("aside.drawer .kv.strong", { hasText: "Total" })).toContainText(
    amount
  );
});

// --- subscriptions ----------------------------------------------------------

Given(/^the subscription list shows (\d+) subscriptions?$/, async ({ app }, count: string) => {
  await expect(app.rows()).toHaveCount(Number(count));
});

When(
  "I create a {string} subscription for {string} with a {int}% discount",
  async ({ app }, plan: string, customer: string, discount: number) => {
    const form = app.page.locator("form.create");
    await form.getByPlaceholder("customer_id").fill(customerId(customer));
    await form.locator("select").selectOption(plan);
    await form.getByPlaceholder("discount %").fill(String(discount));
    await form.getByRole("button", { name: "Create" }).click();
  }
);

Then("I see a confirmation that the subscription was created", async ({ app }) => {
  await expect(app.ok()).toContainText("Created subscription");
});

// --- tenancy ----------------------------------------------------------------

const customerLoadsBeforeSwitch = new WeakMap<object, number>();

Given("requests are scoped to tenant {string}", async ({ mockApi }, label: string) => {
  await expect
    .poll(() => mockApi.last("GET /v1/customers")?.headers["x-tenant-id"])
    .toBe(tenantId(label));
});

When("I switch to tenant {string}", async ({ app, mockApi }, label: string) => {
  customerLoadsBeforeSwitch.set(mockApi, mockApi.count("GET /v1/customers"));
  await app.tenantInput().fill(tenantId(label));
});

Then("the customer directory is reloaded", async ({ mockApi }) => {
  const before = customerLoadsBeforeSwitch.get(mockApi) ?? 0;
  await expect.poll(() => mockApi.count("GET /v1/customers")).toBeGreaterThan(before);
});
