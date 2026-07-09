import { useState } from "react";
import { api } from "../api.js";

export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErr("Please fill in your name, email, and a message.");
      return;
    }
    setSending(true);
    try {
      await api.sendContact({ name, email, message });
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Contact us</h2>
      </div>

      <p className="muted">
        Questions about billing, invoices, or your subscription? Send us a note
        and the Meridian support team will get back to you.
      </p>

      <form className="card create" onSubmit={submit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          rows={5}
        />
        <button type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>

      {err && <p className="error">{err}</p>}

      {sent && (
        <p className="muted">
          Thanks — your message has been received. We'll reply to you by email
          shortly.
        </p>
      )}

      <p className="muted">
        Prefer email? Reach us directly at{" "}
        <a href="mailto:alex@alexgriffen.com">alex@alexgriffen.com</a>.
      </p>
    </section>
  );
}
