import { expect, test } from "./fixtures/test.js";
import { CUSTOMER_ACME, CUSTOMER_GLOBEX } from "./fixtures/data.js";

test.describe("post usage", () => {
  test("submits the event and logs what the API accepted", async ({ app, mockApi }) => {
    await app.open("Usage");

    const form = app.page.locator("form.create");
    await expect(form.getByPlaceholder("customer_id")).toHaveValue(CUSTOMER_ACME);
    await form.getByRole("button", { name: "Send event" }).click();

    await expect(app.page.locator("pre.logbox")).toContainText(
      "accepted 1 event(s): api_calls × 42"
    );
    expect(mockApi.last("POST /v1/usage")?.body).toMatchObject({
      customer_id: CUSTOMER_ACME,
      metric: "api_calls",
      quantity: 42,
    });
  });

  test("sends edited customer, metric and quantity as typed", async ({ app, mockApi }) => {
    await app.open("Usage");

    const form = app.page.locator("form.create");
    await form.getByPlaceholder("customer_id").fill(CUSTOMER_GLOBEX);
    await form.getByPlaceholder("metric", { exact: true }).fill("storage_gb");
    await form.getByPlaceholder("quantity").fill("7");
    await form.getByRole("button", { name: "Send event" }).click();

    await expect(app.page.locator("pre.logbox")).toContainText("storage_gb × 7");
    expect(mockApi.last("POST /v1/usage")?.body).toMatchObject({
      customer_id: CUSTOMER_GLOBEX,
      metric: "storage_gb",
      quantity: 7,
    });
  });

  test("keeps a newest-first log across repeated submissions", async ({ app, mockApi }) => {
    await app.open("Usage");
    const form = app.page.locator("form.create");
    const send = form.getByRole("button", { name: "Send event" });

    await send.click();
    await expect(app.page.locator("pre.logbox")).toContainText("api_calls × 42");

    await form.getByPlaceholder("metric", { exact: true }).fill("seats");
    await send.click();

    const log = app.page.locator("pre.logbox");
    await expect(log).toContainText("seats × 42");
    const text = (await log.innerText()).split("\n").filter((l) => l.trim().length > 0);
    expect(text).toHaveLength(2);
    expect(text[0]).toContain("seats × 42");
    expect(text[1]).toContain("api_calls × 42");
    expect(mockApi.count("POST /v1/usage")).toBe(2);
  });

  test("a rejected event shows the API error and writes no log entry", async ({ app, mockApi }) => {
    mockApi.fail("POST /v1/usage", 400, "quantity must be non-negative");
    await app.open("Usage");

    await app.page.locator("form.create").getByRole("button", { name: "Send event" }).click();

    await expect(app.error()).toHaveText("quantity must be non-negative");
    await expect(app.page.locator("pre.logbox")).toHaveCount(0);
  });
});
