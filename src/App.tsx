import { useState } from "react";
import { DEFAULT_TENANT, getTenant, setTenant } from "./api.js";
import { Customers } from "./components/Customers.js";
import { Subscriptions } from "./components/Subscriptions.js";
import { Invoices } from "./components/Invoices.js";
import { Usage } from "./components/Usage.js";

const TABS = ["Customers", "Subscriptions", "Invoices", "Usage"] as const;
type Tab = (typeof TABS)[number];

export function App() {
  const [tab, setTab] = useState<Tab>("Invoices");
  const [tenant, setTenantState] = useState(getTenant());

  const onTenant = (v: string) => {
    setTenantState(v);
    setTenant(v);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◳</span> Meridian
          <span className="brand-sub">Billing Console</span>
        </div>
        <label className="tenant">
          <span>Tenant</span>
          <input
            value={tenant}
            onChange={(e) => onTenant(e.target.value)}
            spellCheck={false}
          />
          {tenant !== DEFAULT_TENANT && (
            <button className="link" onClick={() => onTenant(DEFAULT_TENANT)}>
              reset
            </button>
          )}
        </label>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? "tab active" : "tab"}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="content">
        {/* key=tenant forces a refetch when the tenant changes */}
        {tab === "Customers" && <Customers key={tenant} />}
        {tab === "Subscriptions" && <Subscriptions key={tenant} />}
        {tab === "Invoices" && <Invoices key={tenant} />}
        {tab === "Usage" && <Usage key={tenant} />}
      </main>
    </div>
  );
}
