import { useEffect, useState } from "react";
import { api, DEMO_CUSTOMER, PLANS, PLAN_STARTER, PLAN_ENTERPRISE, Subscription } from "../api.js";
import { date, shortId } from "../format.js";

export function Subscriptions() {
  const [rows, setRows] = useState<Subscription[]>([]);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // create form
  const [customerId, setCustomerId] = useState(DEMO_CUSTOMER);
  const [planId, setPlanId] = useState(PLAN_ENTERPRISE);
  const [discount, setDiscount] = useState("15");

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await api.listSubscriptions({ status: status || undefined }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      const r = await api.createSubscription({
        customer_id: customerId,
        plan_id: planId,
        discount_pct: discount ? Number(discount) : undefined,
      });
      setMsg(`Created subscription ${shortId(r.id)}`);
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const changePlan = async (sub: Subscription) => {
    const next = sub.plan_id === PLAN_ENTERPRISE ? PLAN_STARTER : PLAN_ENTERPRISE;
    setErr(null);
    setMsg(null);
    try {
      await api.planChange(sub.id, { new_plan_id: next });
      setMsg(`Changed ${shortId(sub.id)} → ${next}`);
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Subscriptions</h2>
        <label className="inline">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">all</option>
            <option value="active">active</option>
            <option value="past_due">past_due</option>
            <option value="canceled">canceled</option>
          </select>
        </label>
      </div>

      <form className="card create" onSubmit={create}>
        <strong>New subscription</strong>
        <input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="customer_id"
        />
        <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={100}
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="discount %"
        />
        <button type="submit">Create</button>
      </form>

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Subscription</th>
              <th>Plan</th>
              <th>Period</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="mono" title={s.id}>
                  {shortId(s.id)}
                </td>
                <td>{s.plan_id}</td>
                <td>
                  {date(s.current_period_start)} → {date(s.current_period_end)}
                </td>
                <td>
                  <span className={`badge ${s.status}`}>{s.status}</span>
                </td>
                <td>
                  <button className="link" onClick={() => changePlan(s)}>
                    switch plan
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No subscriptions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
