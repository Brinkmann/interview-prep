"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The app never changes a claim: the candidate explains it, or writes their own correction.
export function ClaimAnswer({ id }: { id: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(fine: boolean) {
    setBusy(true);
    const res = await fetch("/api/claims", { method: "POST", body: JSON.stringify({ probeId: id, answer: fine ? "" : answer, corrected: false, fine }) });
    setBusy(false);
    if (!res.ok) return setMessage("We couldn't save that. Please try again.");
    router.refresh();
  }

  // Two clear choices (D-38): the claim stands as written, or the candidate answers or corrects it.
  return (
    <>
      <label className="field" htmlFor={`claim-${id}`}>
        Your answer<span className="hint">How you would answer, or the claim corrected in your own words.</span>
      </label>
      <textarea id={`claim-${id}`} rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <div className="row">
        <button type="button" className="btn primary" disabled={busy || !answer.trim()} onClick={() => save(false)}>Save my answer</button>
        <span className="small muted">or</span>
        <button type="button" className="btn secondary" disabled={busy} onClick={() => save(true)}>This claim is fine as it is</button>
      </div>
      {message && <p role="alert" className="alert">{message}</p>}
    </>
  );
}
