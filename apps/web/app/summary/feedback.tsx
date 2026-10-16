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
    <>
      <p><b>How useful were the questions we asked?</b> <span className="muted small">1 = not useful, 5 = very useful</span></p>
      <div className="scale" role="radiogroup" aria-label="Usefulness from 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={usefulness === n} className={usefulness === n ? "on" : ""} onClick={() => setUsefulness(n)}>{n}</button>
        ))}
      </div>
      <label className="field" htmlFor="comment">What would you change?<textarea id="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
      <div className="row"><button type="button" className="btn primary" disabled={!usefulness} onClick={send}>Send feedback</button></div>
      {message && <p role="alert" className="alert">{message}</p>}
    </>
  );
}
