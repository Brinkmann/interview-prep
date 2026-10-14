"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// One question for one area not found: yes (with an example), no, or not sure.
export function Answer({ id, question }: { id: string; question: string }) {
  const router = useRouter();
  const [yes, setYes] = useState(false);
  const [example, setExample] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function send(answer: "yes" | "no" | "unsure") {
    setBusy(true);
    const res = await fetch("/api/expectations", { method: "POST", body: JSON.stringify({ expectationId: id, answer, example }) });
    setBusy(false);
    if (!res.ok) return setMessage("We couldn't save that. Please try again.");
    router.refresh();
  }

  return (
    <section className="card">
      <p style={{ marginTop: 0 }}><strong>{question}</strong></p>
      {!yes ? (
        <div className="actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={() => setYes(true)}>Yes, I have</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => send("no")}>No, I haven&apos;t</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => send("unsure")}>Not sure</button>
        </div>
      ) : (
        <>
          <label className="field" htmlFor={`ex-${id}`}>
            Give a short example.<span className="hint">We&apos;ll add it to your stories so you can build it out.</span>
          </label>
          <textarea id={`ex-${id}`} rows={3} value={example} onChange={(e) => setExample(e.target.value)} />
          <div className="actions">
            <button type="button" className="btn primary" disabled={busy || !example.trim()} onClick={() => send("yes")}>Add to my stories</button>
            <button type="button" className="btn link" disabled={busy} onClick={() => setYes(false)}>Back</button>
          </div>
        </>
      )}
      {message && <p role="alert" className="alert">{message}</p>}
    </section>
  );
}
