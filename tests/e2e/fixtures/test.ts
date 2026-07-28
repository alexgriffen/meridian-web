import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { MockApi } from "./mock-api.js";

export type TabName = "Customers" | "Subscriptions" | "Invoices" | "Usage" | "Rollups";

interface Fixtures {
  mockApi: MockApi;
  app: ConsoleApp;
}

/** Page-object helpers shared by the specs. */
export class ConsoleApp {
  constructor(readonly page: Page) {}

  async open(tab: TabName = "Invoices"): Promise<void> {
    await this.page.goto("/");
    await expect(this.tab("Invoices")).toBeVisible();
    if (tab !== "Invoices") await this.goTo(tab);
  }

  tab(name: TabName): Locator {
    return this.page.locator("nav.tabs").getByRole("button", { name, exact: true });
  }

  goTo(name: TabName): Promise<void> {
    return this.tab(name).click();
  }

  panel(heading: string): Locator {
    return this.page
      .locator("section.panel")
      .filter({ has: this.page.getByRole("heading", { name: heading }) });
  }

  rows(): Locator {
    return this.page.locator("tbody tr");
  }

  tenantInput(): Locator {
    return this.page.locator("label.tenant input");
  }

  error(): Locator {
    return this.page.locator("p.error");
  }

  ok(): Locator {
    return this.page.locator("p.ok");
  }
}

export const test = base.extend<Fixtures>({
  mockApi: async ({ page }, use) => {
    const mock = new MockApi();
    await mock.install(page);
    await use(mock);
  },
  app: async ({ page, mockApi }, use) => {
    void mockApi; // depend on mockApi so interception exists before any navigation
    await use(new ConsoleApp(page));
  },
});

export { expect };
