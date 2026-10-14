"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The app never changes a claim: the candidate explains it, or writes their own correction.
export function ClaimAnswer({ id, canCorrect }: { id: string; canCorrect: boolean }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [corrected, setCorrected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/claims", { method: "POST", body: JSON.stringify({ probeId: id, answer, corrected }) });
    setBusy(false);
    if (!res.ok) return setMessage("We couldn't save that. Please try again.");
    router.refresh();
  }

  return (
    <>
      {canCorrect && (
        <p style={{ margin: "0.25rem 0" }}>
          <label><input type="radio" checked={!corrected} onChange={() => setCorrected(false)} /> Explain it</label>{" "}
          <label><input type="radio" checked={corrected} onChange={() => setCorrected(true)} /> Correct it in my own words</label>
        </p>
      )}
      <textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Your answer"
        style={{ display: "block", width: "100%", margin: "0.5rem 0" }} />
      <button type="button" disabled={busy || !answer.trim()} onClick={save}>Save</button>
      {message && <p role="alert">{message}</p>}
    </>
  );
}
