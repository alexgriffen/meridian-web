import { useEffect, useState } from "react";
import { api, Invoice } from "../api.js";
import { date, money } from "../format.js";

export function InvoiceDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setInv(null);
    setErr(null);
    api
      .getInvoice(id)
      .then((r) => live && setInv(r))
      .catch((e) => live && setErr((e as Error).message));
    return () => {
      live = false;
    };
  }, [id]);

  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div className={strong ? "kv strong" : "kv"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>Invoice</h3>
          <button className="link" onClick={onClose}>
            close
          </button>
        </div>

        {err && <p className="error">{err}</p>}
        {!inv && !err && <p className="muted">Loading…</p>}

        {inv && (
          <>
            <div className="amount">
              {money(inv.total_minor, inv.currency)}
              <span className={`badge ${inv.status}`}>{inv.status}</span>
            </div>

            <div className="kv-group">
              {inv.subtotal_minor !== undefined &&
                row("Subtotal", money(inv.subtotal_minor, inv.currency))}
              {inv.tax_minor !== undefined && row("Tax", money(inv.tax_minor, inv.currency))}
              {row("Total", money(inv.total_minor, inv.currency), true)}
            </div>

            <div className="kv-group">
              {row("Invoice ID", <code>{inv.id}</code>)}
              {row("Customer", <code>{inv.customer_id}</code>)}
              {row(
                "Subscription",
                inv.subscription_id ? <code>{inv.subscription_id}</code> : "—"
              )}
              {row("Currency", inv.currency)}
              {row("Created", date(inv.created_at))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
