"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Band = "interview_ready" | "needs_detail" | "not_yet_a_story";
type Item = {
  id: string; job: string; text: string; next: string | null; question: string | null;
  band: Band | null; note: string; hasEvidence: boolean; labelled: boolean | null;
};

const LABEL: Record<Band, string> = { interview_ready: "Interview-ready", needs_detail: "Needs detail", not_yet_a_story: "Not yet a story" };
const FIELD_LABEL: Record<string, string> = {
  outcome: "What changed", baseline: "From", new_value: "To", timeframe: "Over", estimate_basis: "How you know",
  personal_role: "Your part", team_role: "The team's part", verifier: "Who could confirm it",
};
const ERRORS: Record<string, string> = {
  label_numbers: "Are those exact figures or your estimate? Choose one before saving.",
  basis_required: "Say how you arrived at the estimate before saving.",
  empty: "There's nothing to save yet. Add an answer or skip the question.",
  could_not_read: "We couldn't read that answer. Try putting it another way.",
};
const hasNumber = (v: string) => /\d/.test(v);

export function Sprint({ items, graduate }: { items: Item[]; graduate: boolean }) {
  const router = useRouter();
  const open = items.filter((i) => i.next);
  const [currentId, setCurrentId] = useState(open[0]?.id ?? null);
  const current = items.find((i) => i.id === currentId && i.next) ?? open[0] ?? null;
  const [answer, setAnswer] = useState("");
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [isEstimate, setIsEstimate] = useState<boolean | null>(null);
  const [basis, setBasis] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(0);

  // Ratings update in the background after each saved answer.
  useEffect(() => {
    if (!refreshing) return;
    const id = setInterval(() => router.refresh(), 2500);
    const stop = setTimeout(() => setRefreshing(0), 20_000);
    return () => (clearInterval(id), clearTimeout(stop));
  }, [refreshing, router]);

  function reset() {
    setAnswer(""); setFields(null); setIsEstimate(null); setBasis(""); setMessage(null);
  }

  async function send(action: "parse" | "save" | "skip") {
    if (!current) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/sprint", {
      method: "POST",
      body: JSON.stringify({ action, experienceId: current.id, answer, step: current.next, fields, isEstimate, basis }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage(ERRORS[body.error] ?? "Something went wrong. Please try again.");
    if (action === "parse") return setFields(Object.fromEntries(Object.entries(body.fields).filter(([k]) => k in FIELD_LABEL)) as Record<string, string>);
    reset();
    setRefreshing((n) => n + 1);
    router.refresh();
  }

  const needsLabel = fields && current?.labelled === null && Object.values(fields).some(hasNumber);

  return (
    <>
      <p>
        {graduate
          ? "We'll go through the experiences from your study, volunteering and part-time work that matter most for this role, one at a time."
          : "We'll go through the experiences that matter most for this role, one at a time."}{" "}
        Answer what you can. You can skip any question.
      </p>
      <ol>
        {items.map((i) => (
          <li key={i.id} style={{ margin: "0.4rem 0" }}>
            <button type="button" onClick={() => (setCurrentId(i.id), reset())} disabled={!i.next}
              style={{ all: "unset", cursor: i.next ? "pointer" : "default", fontWeight: i.id === current?.id ? 700 : 400 }}>
              {i.text}
            </button>{" "}
            <small>{i.band ? LABEL[i.band] : "Rating…"}{!i.next && " · done"}</small>
          </li>
        ))}
      </ol>

      {current ? (
        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginTop: "1.5rem" }}>
          <p style={{ margin: 0, color: "#555" }}>{current.job}</p>
          <p style={{ marginTop: "0.25rem" }}>“{current.text}”</p>
          {current.hasEvidence && <p><strong>Your evidence so far:</strong> {current.note}</p>}
          <p><strong>{current.band ? LABEL[current.band] : "Rating…"}</strong></p>

          {!fields ? (
            <>
              <label htmlFor="answer"><strong>{current.question}</strong></label>
              <textarea id="answer" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)}
                style={{ display: "block", width: "100%", margin: "0.5rem 0" }} />
              <button type="button" disabled={busy || !answer.trim()} onClick={() => send("parse")}>Next</button>{" "}
              <button type="button" disabled={busy} onClick={() => send("skip")}>Skip this question</button>
            </>
          ) : (
            <>
              <p>Here's what we'll note. Check it's what you meant, change anything that isn't, then save.</p>
              {Object.entries(fields).map(([k, v]) => (
                <label key={k} style={{ display: "block", margin: "0.5rem 0" }}>
                  {FIELD_LABEL[k]}
                  <input value={v} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} style={{ display: "block", width: "100%" }} />
                </label>
              ))}
              {needsLabel && (
                <fieldset style={{ margin: "0.75rem 0" }}>
                  <legend>Are those exact figures or your estimate?</legend>
                  <label><input type="radio" checked={isEstimate === false} onChange={() => setIsEstimate(false)} /> Exact</label>{" "}
                  <label><input type="radio" checked={isEstimate === true} onChange={() => setIsEstimate(true)} /> My estimate</label>
                  {isEstimate && (
                    <label style={{ display: "block", marginTop: "0.5rem" }}>
                      How did you arrive at it?
                      <input value={basis} onChange={(e) => setBasis(e.target.value)} style={{ display: "block", width: "100%" }} />
                    </label>
                  )}
                </fieldset>
              )}
              <button type="button" disabled={busy} onClick={() => send("save")}>Save</button>{" "}
              <button type="button" disabled={busy} onClick={reset}>Change my answer</button>
            </>
          )}
          {message && <p role="alert">{message}</p>}
        </section>
      ) : (
        <section style={{ marginTop: "1.5rem" }}>
          <p>You've been through every experience on the list. Next, let's check what this role usually expects.</p>
          <p><a href="/expects"><strong>What this role expects</strong></a></p>
        </section>
      )}
    </>
  );
}
