import type { Page, Route } from "@playwright/test";
import { seed, type Seed } from "./data.js";

// In-browser stand-in for the public REST API. The console only ever talks to
// `/api/*` on its own origin, so intercepting that prefix gives us the whole
// backend surface without Postgres, the api-gateway, or the workers.

export interface RecordedRequest {
  method: string;
  path: string;
  url: string;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

export interface MockContext {
  route: Route;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  state: Seed;
  request: RecordedRequest;
}

export type MockHandler = (ctx: MockContext) => void | Promise<void>;

interface RouteEntry {
  method: string;
  pattern: string;
  regex: RegExp;
  keys: string[];
  handler: MockHandler;
}

function compile(pattern: string): { method: string; regex: RegExp; keys: string[] } {
  const [method = "GET", rawPath = "/"] = pattern.trim().split(/\s+/, 2);
  const keys: string[] = [];
  const source = rawPath
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { method: method.toUpperCase(), regex: new RegExp(`^${source}$`), keys };
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const contains = (haystack: string, needle: string): boolean =>
  haystack.toLowerCase().includes(needle.toLowerCase());

export class MockApi {
  readonly requests: RecordedRequest[] = [];
  readonly state: Seed = seed();

  private readonly overrides: RouteEntry[] = [];
  private readonly defaults: RouteEntry[] = [];
  private createdCount = 0;

  constructor() {
    this.registerDefaults();
  }

  async install(page: Page): Promise<void> {
    await page.route("**/api/**", (route: Route) => this.handle(route));
  }

  /** Replace the response for a route, e.g. `override("GET /v1/invoices", ...)`. */
  override(pattern: string, handler: MockHandler): void {
    const { method, regex, keys } = compile(pattern);
    this.overrides.unshift({ method, pattern, regex, keys, handler });
  }

  /** Make a route respond with an API-shaped error body. */
  fail(pattern: string, status = 500, error = "internal error"): void {
    this.override(pattern, ({ route }) => json(route, status, { error }));
  }

  /** Hold a route open (to observe loading states); call the result to release it. */
  stall(pattern: string): () => void {
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.override(pattern, async (ctx) => {
      await gate;
      await this.dispatch(this.defaults, ctx.request, ctx.route);
    });
    return () => release();
  }

  /** Requests recorded so far that match a pattern, oldest first. */
  matching(pattern: string): RecordedRequest[] {
    const { method, regex } = compile(pattern);
    return this.requests.filter((r) => r.method === method && regex.test(r.path));
  }

  count(pattern: string): number {
    return this.matching(pattern).length;
  }

  last(pattern: string): RecordedRequest | undefined {
    return this.matching(pattern).at(-1);
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const raw = request.postData();
    let body: unknown = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }

    const recorded: RecordedRequest = {
      method: request.method().toUpperCase(),
      path,
      url: request.url(),
      query: Object.fromEntries(url.searchParams.entries()),
      body,
      headers: await request.allHeaders(),
    };
    this.requests.push(recorded);

    if (await this.dispatch(this.overrides, recorded, route)) return;
    if (await this.dispatch(this.defaults, recorded, route)) return;
    await json(route, 404, { error: `no mock for ${recorded.method} ${path}` });
  }

  private async dispatch(
    table: RouteEntry[],
    request: RecordedRequest,
    route: Route
  ): Promise<boolean> {
    for (const entry of table) {
      if (entry.method !== request.method) continue;
      const match = entry.regex.exec(request.path);
      if (!match) continue;
      const params: Record<string, string> = {};
      entry.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1] ?? "");
      });
      await entry.handler({
        route,
        params,
        query: request.query,
        body: request.body,
        state: this.state,
        request,
      });
      return true;
    }
    return false;
  }

  private register(pattern: string, handler: MockHandler): void {
    const { method, regex, keys } = compile(pattern);
    this.defaults.push({ method, pattern, regex, keys, handler });
  }

  private nextId(prefix: string): string {
    this.createdCount += 1;
    return `00000000-0000-4000-8000-${prefix}${String(this.createdCount).padStart(10, "0")}`;
  }

  private registerDefaults(): void {
    this.register("GET /v1/customers", ({ route, query, state }) => {
      let rows = state.customers;
      const q = query["q"];
      const email = query["email"];
      if (q) rows = rows.filter((c) => contains(c.name, q) || contains(c.email, q));
      if (email) rows = rows.filter((c) => c.email === email);
      return json(route, 200, { data: rows });
    });

    this.register("GET /v1/subscriptions", ({ route, query, state }) => {
      let rows = state.subscriptions;
      const status = query["status"];
      const customerId = query["customer_id"];
      if (status) rows = rows.filter((s) => s.status === status);
      if (customerId) rows = rows.filter((s) => s.customer_id === customerId);
      return json(route, 200, { data: rows });
    });

    this.register("POST /v1/subscriptions", ({ route, body, state }) => {
      if (!body?.customer_id || !body?.plan_id) {
        return json(route, 400, { error: "customer_id and plan_id are required" });
      }
      const id = this.nextId("01");
      state.subscriptions = [
        {
          id,
          customer_id: body.customer_id,
          plan_id: body.plan_id,
          current_period_start: "2026-07-28T00:00:00.000Z",
          current_period_end: "2026-08-27T00:00:00.000Z",
          status: "active",
        },
        ...state.subscriptions,
      ];
      return json(route, 201, { id });
    });

    this.register("POST /v1/subscriptions/:id/plan-change", ({ route, params, body, state }) => {
      const sub = state.subscriptions.find((s) => s.id === params["id"]);
      if (!sub) return json(route, 404, { error: "not found" });
      if (!body?.new_plan_id) return json(route, 400, { error: "new_plan_id is required" });
      sub.plan_id = body.new_plan_id;
      return json(route, 200, { subscription_id: sub.id, plan_id: sub.plan_id });
    });

    this.register("GET /v1/invoices", ({ route, query, state }) => {
      let rows = state.invoices;
      const status = query["status"];
      const customerId = query["customer_id"];
      if (status) rows = rows.filter((i) => i.status === status);
      if (customerId) rows = rows.filter((i) => i.customer_id === customerId);
      return json(route, 200, { data: rows });
    });

    this.register("GET /v1/invoices/:id", ({ route, params, state }) => {
      const invoice = state.invoices.find((i) => i.id === params["id"]);
      if (!invoice) return json(route, 404, { error: "not found" });
      return json(route, 200, invoice);
    });

    this.register("GET /v1/usage/rollups", ({ route, query, state }) => {
      let rows = state.rollups;
      const metric = query["metric"];
      const customerId = query["customer_id"];
      if (metric) rows = rows.filter((r) => r.metric === metric);
      if (customerId) rows = rows.filter((r) => r.customer_id === customerId);
      return json(route, 200, { data: rows });
    });

    this.register("POST /v1/usage", ({ route, body, state }) => {
      const events: any[] = Array.isArray(body?.events) ? body.events : [body];
      for (const e of events) {
        if (!e?.customer_id || !e?.metric || typeof e.quantity !== "number") {
          return json(route, 400, { error: "invalid usage event" });
        }
      }
      const accepted = events.map(() => this.nextId("02"));
      for (const e of events) {
        const day = "2026-07-28T00:00:00.000Z";
        const existing = state.rollups.find(
          (r) => r.customer_id === e.customer_id && r.metric === e.metric && r.day === day
        );
        if (existing) {
          existing.total_quantity += e.quantity;
          existing.updated_at = "2026-07-28T12:00:00.000Z";
        } else {
          state.rollups = [
            {
              customer_id: e.customer_id,
              metric: e.metric,
              day,
              total_quantity: e.quantity,
              updated_at: "2026-07-28T12:00:00.000Z",
            },
            ...state.rollups,
          ];
        }
      }
      return json(route, 202, { accepted });
    });
  }
}
