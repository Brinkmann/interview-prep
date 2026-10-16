"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoryState } from "@/lib/sprint";
import { Spinner } from "../_ui/working";

type Story = { situation: string | null; action: string | null; result: string | null };
type Proposal = { story: Story; needsLabel: boolean; suggestedLabel: "exact" | "estimate" | "not_said" };

const LABEL = { interview_ready: "Ready to tell", needs_detail: "Almost there", not_yet_a_story: "Worth building" } as const;
const MEANING = {
  interview_ready: "The result, your part and how you know are all there.",
  needs_detail: "A real result. One detail an interviewer will ask for is still missing.",
  not_yet_a_story: "Describes the job more than what changed because of you.",
} as const;
const PARTS: { key: keyof Story; name: string; missing: string }[] = [
  { key: "situation", name: "Situation", missing: "What was the situation?" },
  { key: "action", name: "What you did", missing: "What did you do yourself?" },
  { key: "result", name: "What changed", missing: "What changed because of it?" },
];
const ERRORS: Record<string, string> = {
  label_numbers: "Is that figure exact, or your estimate? Choose one before saving.",
  basis_required: "Say how you arrived at the estimate before saving.",
  could_not_read: "We couldn't work with that answer. Try putting it another way.",
  empty: "There's nothing to save yet.",
};

function StoryView({ story, edit, onChange }: { story: Story | null; edit?: boolean; onChange?: (s: Story) => void }) {
  return (
    <dl className="story">
      {PARTS.map((p) => (
        <div key={p.key}>
          <dt>{p.name}</dt>
          {edit ? (
            <dd><textarea rows={2} aria-label={p.name} value={story?.[p.key] ?? ""} onChange={(e) => onChange?.({ ...(story as Story), [p.key]: e.target.value })} /></dd>
          ) : story?.[p.key] ? (
            <dd>{story[p.key]}</dd>
          ) : (
            <dd className="missing">{p.missing}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}

export function Sprint({ initial }: { initial: StoryState[] }) {
  const [items, setItems] = useState(initial);
  const firstOpen = initial.find((i) => !i.complete)?.id ?? null;
  const [currentId, setCurrentId] = useState<string | null>(firstOpen);
  const [answer, setAnswer] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editing, setEditing] = useState(false);
  const [isEstimate, setIsEstimate] = useState<boolean | null>(null);
  const [basis, setBasis] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const current = items.find((i) => i.id === currentId) ?? null;
  const position = current ? items.findIndex((i) => i.id === current.id) + 1 : 0;
  const done = items.filter((i) => i.complete).length;

  const update = (item: StoryState) => setItems((all) => all.map((i) => (i.id === item.id ? item : i)));

  const send = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (!currentId) return null;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/sprint", { method: "POST", body: JSON.stringify({ action, experienceId: currentId, ...extra }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(action === "open" && body.error === "could_not_read"
        ? "We couldn't prepare a question for this story just now."
        : ERRORS[body.error] ?? "Something went wrong. Please try again.");
      return null;
    }
    if (body.item) update(body.item);
    return body;
  }, [currentId]);

  // Ask the first question for a story as soon as it is opened.
  useEffect(() => {
    if (current && !current.complete && !current.question && !busy) void send("open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, current?.question, current?.complete]);

  // Labels are refreshed in the background after each saved answer.
  const [refreshing, setRefreshing] = useState(0);
  useEffect(() => {
    if (!refreshing) return;
    const tick = setInterval(async () => {
      const res = await fetch("/api/sprint");
      if (res.ok) setItems((await res.json()).items);
    }, 3000);
    const stop = setTimeout(() => setRefreshing(0), 20_000);
    return () => (clearInterval(tick), clearTimeout(stop));
  }, [refreshing]);

  function reset() {
    setAnswer(""); setProposal(null); setEditing(false); setIsEstimate(null); setBasis(""); setMessage(null);
  }

  function open(id: string) {
    reset();
    setCurrentId(id);
  }

  async function submit() {
    const body = await send("answer", { answer });
    if (!body) return;
    setProposal({ story: body.story, needsLabel: body.needsLabel, suggestedLabel: body.suggestedLabel });
    if (body.needsLabel && body.suggestedLabel !== "not_said") setIsEstimate(body.suggestedLabel === "estimate");
  }

  async function confirm() {
    if (!proposal) return;
    const body = await send("confirm", { answer, story: proposal.story, isEstimate, basis });
    if (!body) return;
    reset();
    setRefreshing((n) => n + 1);
    if (body.item?.complete) moveOn(body.item.id);
  }

  async function skip() {
    const body = await send("skip");
    if (body?.item?.complete) moveOn(body.item.id);
    reset();
  }

  async function finish() {
    const body = await send("finish");
    reset();
    if (body?.item) moveOn(body.item.id);
  }

  function moveOn(fromId: string) {
    const idx = items.findIndex((i) => i.id === fromId);
    const next = [...items.slice(idx + 1), ...items.slice(0, idx)].find((i) => !i.complete && i.id !== fromId);
    setCurrentId(next?.id ?? null);
  }

  return (
    <>
      <details className="card" open={!current}>
        <summary style={{ margin: 0 }}>Your stories: {done} of {items.length} done</summary>
        <ol>
          {items.map((i) => (
            <li key={i.id} style={{ margin: "0.4rem 0" }}>
              <button type="button" className="btn link" style={{ padding: 0, textAlign: "left", fontWeight: i.id === currentId ? 700 : 400 }} onClick={() => open(i.id)}>
                {i.text.length > 90 ? `${i.text.slice(0, 90)}…` : i.text}
              </button>{" "}
              <span className={`label ${i.band ?? "pending"}`}>{i.band ? LABEL[i.band] : "Rating…"}</span>
              {i.complete && <span className="small muted"> · done</span>}
            </li>
          ))}
        </ol>
      </details>

      {current ? (
        <section className="card current">
          <p className="progress">Story {position} of {items.length}</p>
          <p className="muted small" style={{ margin: 0 }}>{current.job}</p>
          <p className="quote"><strong>&ldquo;{current.text}&rdquo;</strong></p>
          <p style={{ margin: "0.25rem 0" }}>
            <span className={`label ${current.band ?? "pending"}`}>{current.band ? LABEL[current.band] : "Rating…"}</span>{" "}
            {current.band && <span className="small muted">{MEANING[current.band]}</span>}
          </p>

          <h2>Your story so far</h2>
          {!proposal && <StoryView story={current.story} />}

          {proposal ? (
            <>
              <p><strong>Did we get this right?</strong></p>
              <StoryView story={proposal.story} edit={editing} onChange={(s) => setProposal({ ...proposal, story: s })} />
              {proposal.needsLabel && (
                <fieldset className="card" style={{ margin: "0.5rem 0" }}>
                  <legend>Is that figure exact, or your estimate?</legend>
                  <label><input type="radio" checked={isEstimate === false} onChange={() => setIsEstimate(false)} /> Exact</label>{" "}
                  <label><input type="radio" checked={isEstimate === true} onChange={() => setIsEstimate(true)} /> My estimate</label>
                  {isEstimate && (
                    <label className="field">How did you arrive at it?<input value={basis} onChange={(e) => setBasis(e.target.value)} /></label>
                  )}
                </fieldset>
              )}
              <div className="actions">
                <button type="button" className="btn primary" disabled={busy} onClick={confirm}>{editing ? "Save my changes" : "Yes, looks right"}</button>
                {!editing && <button type="button" className="btn secondary" disabled={busy} onClick={() => setEditing(true)}>Edit</button>}
                <button type="button" className="btn link" disabled={busy} onClick={() => (setProposal(null), setEditing(false))}>Change my answer</button>
              </div>
            </>
          ) : current.question ? (
            <>
              <label className="field" htmlFor="answer">{current.question}</label>
              <textarea id="answer" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <div className="actions">
                <button type="button" className="btn primary" disabled={busy || !answer.trim()} onClick={submit}>{busy ? "Working…" : "Continue"}</button>
                <button type="button" className="btn secondary" disabled={busy} onClick={skip}>Skip this question</button>
                <button type="button" className="btn secondary" disabled={busy} onClick={finish}>Finish this story</button>
              </div>
              <p className="small muted">
                <b>Skip this question</b> moves past it; skipped questions are not held against you. <b>Finish this story</b> keeps
                what you have and moves on to the next story.
              </p>
            </>
          ) : current.complete ? (
            <p>This story is done.</p>
          ) : (
            message ? (
              <div className="actions"><button type="button" className="btn primary" disabled={busy} onClick={() => send("open")}>Try again</button>
                <button type="button" className="btn secondary" disabled={busy} onClick={finish}>Move to the next story</button></div>
            ) : <Spinner text="Reading your story and preparing a question…" />
          )}
          {message && <p role="alert" className="alert">{message}</p>}
        </section>
      ) : (
        <section className="card">
          <p><strong>You&apos;ve been through every story.</strong> Next, let&apos;s check what this role usually asks for that we haven&apos;t covered yet.</p>
        </section>
      )}

      <p className="next">
        <a className={`btn ${current ? "secondary" : "primary"}`} href="/expects">{current ? "Finish for now: check for gaps" : "Next: check for gaps"}</a>
      </p>
    </>
  );
}
