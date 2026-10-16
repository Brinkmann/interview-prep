"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoryState } from "@/lib/sprint";
import { ActionBar } from "../_ui/shell";
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

function StoryView({ story, before, edit, onChange }: {
  story: Story | null; before?: Story | null; edit?: boolean; onChange?: (s: Story) => void;
}) {
  return (
    <dl className="star">
      {PARTS.map((p) => {
        const value = story?.[p.key];
        // What the candidate's latest answer added is highlighted until they confirm it.
        const fresh = before !== undefined && !!value && value !== (before?.[p.key] ?? null);
        return (
          <div key={p.key}>
            <dt>{p.name}</dt>
            {edit ? (
              <dd><textarea rows={2} aria-label={p.name} value={value ?? ""} onChange={(e) => onChange?.({ ...(story as Story), [p.key]: e.target.value })} /></dd>
            ) : value ? (
              <dd className={fresh ? "new" : ""}>{value}</dd>
            ) : (
              <dd className="missing">{p.missing}</dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

export function Sprint({ initial }: { initial: StoryState[] }) {
  const [items, setItems] = useState(initial);
  const firstOpen = initial.find((i) => !i.complete)?.id ?? null;
  const [currentId, setCurrentId] = useState<string | null>(firstOpen);
  // The story last on screen, kept showing (as done) once every story is complete.
  const [lastId, setLastId] = useState<string | null>(initial.at(-1)?.id ?? null);
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
    setLastId(fromId);
    const idx = items.findIndex((i) => i.id === fromId);
    const next = [...items.slice(idx + 1), ...items.slice(0, idx)].find((i) => !i.complete && i.id !== fromId);
    setCurrentId(next?.id ?? null);
  }

  const shown = current ?? items.find((i) => i.id === lastId) ?? null;
  const shownPos = shown ? items.findIndex((i) => i.id === shown.id) + 1 : 0;

  let work: React.ReactNode = null;
  if (!shown) {
    work = null;
  } else if (shown.complete) {
    work = <p><b>This story is done.</b> You can come back and change it at any time.</p>;
  } else if (proposal) {
    work = (
      <>
        <p><b>Did we get this right?</b> {editing ? "Change anything that isn't what you meant, then save." : "We've added your answer to the story above, highlighted in green."}</p>
        {proposal.needsLabel && (
          <fieldset className="card" style={{ borderStyle: "dashed" }}>
            <legend className="small"><b>Is that figure exact, or your estimate?</b></legend>
            <div className="row">
              <label><input type="radio" checked={isEstimate === false} onChange={() => setIsEstimate(false)} /> Exact</label>
              <label><input type="radio" checked={isEstimate === true} onChange={() => setIsEstimate(true)} /> My estimate</label>
            </div>
            {isEstimate && <label className="field">How did you arrive at it?<input value={basis} onChange={(e) => setBasis(e.target.value)} /></label>}
          </fieldset>
        )}
        <div className="row">
          <button type="button" className="btn primary" disabled={busy} onClick={confirm}>{editing ? "Save my changes" : "Yes, that's right"}</button>
          {!editing && <button type="button" className="btn secondary" disabled={busy} onClick={() => setEditing(true)}>Change it</button>}
          <button type="button" className="btn quiet" disabled={busy} onClick={() => (setProposal(null), setEditing(false))}>Answer again</button>
        </div>
      </>
    );
  } else if (shown.question) {
    work = (
      <>
        <label className="field" htmlFor="answer">{shown.question}<span className="hint">Answer in your own words. A rough figure is fine.</span></label>
        <textarea id="answer" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <div className="spread">
          <button type="button" className="btn primary" disabled={busy || !answer.trim()} onClick={submit}>{busy ? "Adding…" : "Add to my story"}</button>
          <div className="row">
            <button type="button" className="btn quiet" disabled={busy} onClick={skip}>Skip this question</button>
            <button type="button" className="btn quiet" disabled={busy} onClick={finish}>This story is done</button>
          </div>
        </div>
      </>
    );
  } else if (message) {
    work = (
      <div className="row">
        <button type="button" className="btn primary" disabled={busy} onClick={() => send("open")}>Try again</button>
        <button type="button" className="btn secondary" disabled={busy} onClick={finish}>Move to the next story</button>
      </div>
    );
  } else {
    work = <Spinner text="Reading your story and preparing a question…" />;
  }

  const allDone = done === items.length;
  return (
    <>
      <p className="muted small">{done} of {items.length} stories done</p>
      <div className="strip" role="tablist" aria-label="Your stories">
        {items.map((i, n) => (
          <button key={i.id} type="button" role="tab" aria-selected={i.id === shown?.id} className={i.id === shown?.id ? "on" : ""} onClick={() => open(i.id)}>
            <span className={`swatch ${i.band ?? ""}`} />{n + 1}. {i.text.length > 28 ? `${i.text.slice(0, 28)}…` : i.text}{i.complete ? " ✓" : ""}
          </button>
        ))}
      </div>

      {shown ? (
        <section className="card focus">
          <div className="spread">
            <span className="eyebrow">Story {shownPos} of {items.length}</span>
            {shown.band ? <span className={`label ${shown.band}`}>{LABEL[shown.band]}</span> : <span className="label pending">Rating…</span>}
          </div>
          {shown.band && <p className="meaning">{MEANING[shown.band]}</p>}
          <span className="role">{shown.job}</span>
          <p className="quote">From your CV: &ldquo;{shown.text}&rdquo;</p>
          <h3>Your story so far</h3>
          {proposal
            ? <StoryView story={proposal.story} before={shown.story} edit={editing} onChange={(st) => setProposal({ ...proposal, story: st })} />
            : <StoryView story={shown.story} />}
          {work}
          {message && <p role="alert" className="alert">{message}</p>}
        </section>
      ) : null}

      {allDone && (
        <section className="card">
          <p><b>You&apos;ve been through every story.</b> Next, let&apos;s check what this role usually asks for that your stories don&apos;t show yet.</p>
        </section>
      )}

      <ActionBar
        back="/found"
        hint={`${done} of ${items.length} stories done`}
        next={{ href: "/expects", text: allDone ? "Next: check for gaps" : "Finish for now: check for gaps" }}
      />
    </>
  );
}
