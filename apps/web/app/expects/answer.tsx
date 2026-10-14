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
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem 1rem", margin: "1rem 0" }}>
      <p style={{ marginTop: 0 }}><strong>{question}</strong></p>
      {!yes ? (
        <>
          <button type="button" disabled={busy} onClick={() => setYes(true)}>Yes</button>{" "}
          <button type="button" disabled={busy} onClick={() => send("no")}>No</button>{" "}
          <button type="button" disabled={busy} onClick={() => send("unsure")}>Not sure</button>
        </>
      ) : (
        <>
          <label htmlFor={`ex-${id}`}>Give an example. We'll add it to your evidence sprint.</label>
          <textarea id={`ex-${id}`} rows={3} value={example} onChange={(e) => setExample(e.target.value)}
            style={{ display: "block", width: "100%", margin: "0.5rem 0" }} />
          <button type="button" disabled={busy || !example.trim()} onClick={() => send("yes")}>Add to my sprint</button>{" "}
          <button type="button" disabled={busy} onClick={() => setYes(false)}>Back</button>
        </>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
