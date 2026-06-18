// Thin fetch wrapper. Every request is same-origin (`/api/...`) and carries the
// selected tenant as X-Tenant-Id, which the api-gateway trusts in dev/alpha mode.

export const DEFAULT_TENANT = "00000000-0000-4000-8000-000000000001";
export const DEMO_CUSTOMER = "00000000-0000-4000-8000-000000000010";
const TENANT_KEY = "meridian.tenantId";

export function getTenant(): string {
  return localStorage.getItem(TENANT_KEY) ?? DEFAULT_TENANT;
}
export function setTenant(t: string): void {
  localStorage.setItem(TENANT_KEY, t);
}

async function req<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      "x-tenant-id": getTenant(),
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return body as T;
}

const qs = (o: Record<string, string | number | undefined>): string => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

export interface Customer {
  id: string;
  email: string;
  name: string;
  external_id?: string;
  created_at: string;
}
export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  current_period_start: string;
  current_period_end: string;
  status: "active" | "past_due" | "canceled";
}
export interface Invoice {
  id: string;
  customer_id: string;
  subscription_id: string | null;
  subtotal_minor?: number;
  tax_minor?: number;
  total_minor: number;
  currency: string;
  status: "draft" | "open" | "paid" | "void";
  created_at: string;
}

export interface Rollup {
  customer_id: string;
  metric: string;
  day: string;
  total_quantity: number;
  updated_at: string;
}

export const api = {
  listCustomers: (o: { q?: string; email?: string; limit?: number } = {}) =>
    req<{ data: Customer[] }>(`/v1/customers${qs(o)}`).then((r) => r.data),

  listSubscriptions: (o: { status?: string; customer_id?: string; limit?: number } = {}) =>
    req<{ data: Subscription[] }>(`/v1/subscriptions${qs(o)}`).then((r) => r.data),

  createSubscription: (b: { customer_id: string; plan_id: string; discount_pct?: number }) =>
    req<{ id: string }>(`/v1/subscriptions`, { method: "POST", body: JSON.stringify(b) }),

  planChange: (id: string, b: { new_plan_id: string; effective_at?: string }) =>
    req(`/v1/subscriptions/${id}/plan-change`, { method: "POST", body: JSON.stringify(b) }),

  listInvoices: (o: { status?: string; customer_id?: string; limit?: number } = {}) =>
    req<{ data: Invoice[] }>(`/v1/invoices${qs(o)}`).then((r) => r.data),

  getInvoice: (id: string) => req<Invoice>(`/v1/invoices/${id}`),

  listRollups: (o: { customer_id?: string; metric?: string; limit?: number } = {}) =>
    req<{ data: Rollup[] }>(`/v1/usage/rollups${qs(o)}`).then((r) => r.data),

  postUsage: (b: { customer_id: string; metric: string; quantity: number }) =>
    req<{ accepted: string[] }>(`/v1/usage`, { method: "POST", body: JSON.stringify(b) }),
};

export const PLAN_STARTER = "plan_starter";
export const PLAN_ENTERPRISE = "plan_enterprise";
export const PLANS = [PLAN_STARTER, PLAN_ENTERPRISE];
