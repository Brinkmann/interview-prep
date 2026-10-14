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

  async function save(fine = false) {
    setBusy(true);
    const res = await fetch("/api/claims", { method: "POST", body: JSON.stringify({ probeId: id, answer, corrected, fine }) });
    setBusy(false);
    if (!res.ok) return setMessage("We couldn't save that. Please try again.");
    router.refresh();
  }

  return (
    <>
      {canCorrect && (
        <p className="small" style={{ margin: "0.25rem 0" }}>
          <label><input type="radio" checked={!corrected} onChange={() => setCorrected(false)} /> Answer it</label>{" "}
          <label><input type="radio" checked={corrected} onChange={() => setCorrected(true)} /> Correct it in my own words</label>
        </p>
      )}
      <textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Your answer" />
      <div className="actions">
        <button type="button" className="btn primary" disabled={busy || !answer.trim()} onClick={() => save()}>Save</button>
        <button type="button" className="btn secondary" disabled={busy} onClick={() => save(true)}>This is fine as it is</button>
      </div>
      {message && <p role="alert" className="alert">{message}</p>}
    </>
  );
}
