import { useEffect, useState } from "react";
import { api, Invoice } from "../api.js";
import { date, money, shortId } from "../format.js";
import { InvoiceDetail } from "./InvoiceDetail.js";

export function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      setRows(await api.listInvoices({ status: status || undefined }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [status]);

  // Invoices appear when billing-engine closes a period — poll so the demo loop
  // shows them landing live.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [auto, status]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Invoices</h2>
        <div className="inline">
          <label className="inline">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">all</option>
              <option value="draft">draft</option>
              <option value="open">open</option>
              <option value="paid">paid</option>
              <option value="void">void</option>
            </select>
          </label>
          <label className="inline check">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            auto-refresh
          </label>
          <button onClick={load}>Refresh</button>
        </div>
      </div>

      {err && <p className="error">{err}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th className="num">Total</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} className="clickable" onClick={() => setSelected(inv.id)}>
                <td className="mono" title={inv.id}>
                  {shortId(inv.id)}
                </td>
                <td className="mono" title={inv.customer_id}>
                  {shortId(inv.customer_id)}
                </td>
                <td className="num">{money(inv.total_minor, inv.currency)}</td>
                <td>
                  <span className={`badge ${inv.status}`}>{inv.status}</span>
                </td>
                <td>{date(inv.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No invoices yet — post usage and wait for the billing cycle to close.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {selected && <InvoiceDetail id={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
