import { useEffect, useState } from "react";
import { api, Rollup } from "../api.js";
import { date, shortId } from "../format.js";

export function Rollups() {
  const [rows, setRows] = useState<Rollup[]>([]);
  const [metric, setMetric] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);

  const load = async () => {
    setErr(null);
    try {
      setRows(await api.listRollups({ metric: metric || undefined }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [metric]);

  // usage-aggregator rolls events up on a short cadence — poll so freshly
  // posted usage shows up here without a manual refresh.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [auto, metric]);

  const dayOnly = (iso: string) => (iso.length >= 10 ? iso.slice(0, 10) : iso);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Daily usage rollups</h2>
        <div className="inline">
          <input
            placeholder="filter metric…"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          />
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
              <th>Day</th>
              <th>Customer</th>
              <th>Metric</th>
              <th className="num">Total quantity</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.customer_id}-${r.metric}-${r.day}`}>
                <td>{dayOnly(r.day)}</td>
                <td className="mono" title={r.customer_id}>
                  {shortId(r.customer_id)}
                </td>
                <td>{r.metric}</td>
                <td className="num">{r.total_quantity.toLocaleString()}</td>
                <td>{date(r.updated_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No rollups yet — post usage on the Usage tab; usage-aggregator
                  writes daily aggregates here within a few seconds.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
