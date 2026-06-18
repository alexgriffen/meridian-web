import { useState } from "react";
import { api, DEMO_CUSTOMER } from "../api.js";

export function Usage() {
  const [customerId, setCustomerId] = useState(DEMO_CUSTOMER);
  const [metric, setMetric] = useState("api_calls");
  const [quantity, setQuantity] = useState("42");
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const r = await api.postUsage({
        customer_id: customerId,
        metric,
        quantity: Number(quantity),
      });
      const ts = new Date().toLocaleTimeString();
      setLog((l) => [
        `${ts}  accepted ${r.accepted.length} event(s): ${metric} × ${quantity}`,
        ...l,
      ]);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Post usage</h2>
      </div>

      <form className="card create" onSubmit={submit}>
        <input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="customer_id"
        />
        <input
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          placeholder="metric"
        />
        <input
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="quantity"
        />
        <button type="submit">Send event</button>
      </form>

      <p className="muted">
        Events land in the usage outbox; usage-aggregator rolls them up and
        billing-engine bills them when the period closes.
      </p>

      {err && <p className="error">{err}</p>}

      {log.length > 0 && (
        <pre className="logbox">{log.join("\n")}</pre>
      )}
    </section>
  );
}
