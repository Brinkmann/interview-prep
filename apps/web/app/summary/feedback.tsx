"use client";

import { useState } from "react";

export function Feedback() {
  const [usefulness, setUsefulness] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    const res = await fetch("/api/feedback", { method: "POST", body: JSON.stringify({ usefulness, comment }) });
    if (!res.ok) return setMessage("We couldn't save that. Please try again.");
    setDone(true);
  }

  if (done) return <p>Thank you for your feedback.</p>;
  return (
    <section>
      <fieldset style={{ border: 0, padding: 0 }}>
        <legend><strong>How useful were the questions we asked?</strong> (1 = not useful, 5 = very useful)</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} style={{ marginRight: "1rem" }}>
            <input type="radio" name="usefulness" checked={usefulness === n} onChange={() => setUsefulness(n)} /> {n}
          </label>
        ))}
      </fieldset>
      <label htmlFor="comment" style={{ display: "block", marginTop: "1rem" }}><strong>What would you change?</strong></label>
      <textarea id="comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
        style={{ display: "block", width: "100%", margin: "0.5rem 0" }} />
      <button type="button" disabled={!usefulness} onClick={send}>Send feedback</button>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
