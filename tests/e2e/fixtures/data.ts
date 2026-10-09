import type { Customer, Invoice, Rollup, Subscription } from "../../../src/api.js";

export const TENANT_A = "00000000-0000-4000-8000-000000000001";
export const TENANT_B = "00000000-0000-4000-8000-000000000002";
export const CUSTOMER_ACME = "00000000-0000-4000-8000-000000000010";
export const CUSTOMER_GLOBEX = "00000000-0000-4000-8000-000000000011";

export interface Seed {
  customers: Customer[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  rollups: Rollup[];
}

export function seed(): Seed {
  return {
    customers: [
      {
        id: CUSTOMER_ACME,
        email: "billing@acme.test",
        name: "Acme Corp",
        external_id: "acme-1",
        created_at: "2026-01-04T10:15:00.000Z",
      },
      {
        id: CUSTOMER_GLOBEX,
        email: "ap@globex.test",
        name: "Globex Industries",
        created_at: "2026-02-11T08:00:00.000Z",
      },
    ],
    subscriptions: [
      {
        id: "00000000-0000-4000-8000-000000000100",
        customer_id: CUSTOMER_ACME,
        plan_id: "plan_enterprise",
        current_period_start: "2026-07-01T00:00:00.000Z",
        current_period_end: "2026-08-01T00:00:00.000Z",
        status: "active",
      },
      {
        id: "00000000-0000-4000-8000-000000000101",
        customer_id: CUSTOMER_GLOBEX,
        plan_id: "plan_starter",
        current_period_start: "2026-06-15T00:00:00.000Z",
        current_period_end: "2026-07-15T00:00:00.000Z",
        status: "past_due",
      },
    ],
    invoices: [
      {
        id: "00000000-0000-4000-8000-000000000200",
        customer_id: CUSTOMER_ACME,
        subscription_id: "00000000-0000-4000-8000-000000000100",
        subtotal_minor: 420000,
        tax_minor: 34650,
        total_minor: 454650,
        currency: "USD",
        status: "open",
        created_at: "2026-07-01T00:00:05.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000201",
        customer_id: CUSTOMER_GLOBEX,
        subscription_id: null,
        subtotal_minor: 1000,
        tax_minor: 0,
        total_minor: 1000,
        currency: "USD",
        status: "paid",
        created_at: "2026-06-15T00:00:05.000Z",
      },
    ],
    rollups: [
      {
        customer_id: CUSTOMER_ACME,
        metric: "api_calls",
        day: "2026-07-27T00:00:00.000Z",
        total_quantity: 12500,
        updated_at: "2026-07-27T23:59:00.000Z",
      },
      {
        customer_id: CUSTOMER_ACME,
        metric: "seats",
        day: "2026-07-27T00:00:00.000Z",
        total_quantity: 42,
        updated_at: "2026-07-27T23:59:00.000Z",
      },
      {
        customer_id: CUSTOMER_GLOBEX,
        metric: "api_calls",
        day: "2026-07-26T00:00:00.000Z",
        total_quantity: 310,
        updated_at: "2026-07-26T23:59:00.000Z",
      },
    ],
  };
}
