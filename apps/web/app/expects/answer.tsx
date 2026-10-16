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

  const [kind, setKind] = useState<"yes" | "partly">("yes");

  async function send(answer: "yes" | "partly" | "no") {
    setBusy(true);
    const res = await fetch("/api/expectations", { method: "POST", body: JSON.stringify({ expectationId: id, answer, example }) });
    setBusy(false);
    if (!res.ok) return setMessage("We couldn't save that. Please try again.");
    router.refresh();
  }

  return (
    <section className="card">
      <p><strong>{question}</strong></p>
      {!yes ? (
        <div className="row">
          <button type="button" className="btn secondary" disabled={busy} onClick={() => (setKind("yes"), setYes(true))}>Yes, I have</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => (setKind("partly"), setYes(true))}>Partly</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => send("no")}>No, I haven&apos;t</button>
        </div>
      ) : (
        <>
          <label className="field" htmlFor={`ex-${id}`}>
            {kind === "yes" ? "Give a short example." : "Give a short example of what you have done."}
            <span className="hint">We&apos;ll add it to your stories so you can build it out.</span>
          </label>
          <textarea id={`ex-${id}`} rows={3} value={example} onChange={(e) => setExample(e.target.value)} />
          <div className="row">
            <button type="button" className="btn primary" disabled={busy || !example.trim()} onClick={() => send(kind)}>Add to my stories</button>
            <button type="button" className="btn link" disabled={busy} onClick={() => setYes(false)}>Back</button>
          </div>
        </>
      )}
      {message && <p role="alert" className="alert">{message}</p>}
    </section>
  );
}
