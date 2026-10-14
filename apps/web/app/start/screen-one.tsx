"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// Screen 1 (05-phase1-experience.md): job ad, CV, and what was removed.

const PHRASES: Record<string, string> = {
  photo: "your photo",
  date_of_birth: "your date of birth",
  age: "your age",
  gender: "your gender",
  marital_status: "your marital status",
  nationality: "your nationality",
  health: "a line about your health",
  ethnicity: "a line about your ethnicity",
  religion: "a line about your religion",
};

type Removed = { id: string; category: string; excerpt: string | null; restored: boolean };
type Status = { status: string; failure_reason: string | null; removed: Removed[] };

function removedSentence(categories: string[]): string {
  if (!categories.length) return "We didn't find anything you need to remove for interview preparation.";
  const items = [...new Set(categories.map((c) => PHRASES[c] ?? "a personal detail"))];
  const list = items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0];
  const n = categories.length;
  // D-27: removed lines are held for 24 hours, so "We haven't stored them" became this (founder approved).
  return `We removed ${n} ${n === 1 ? "thing" : "things"} you don't need for interview preparation: ${list}. We don't use ${n === 1 ? "it" : "them"}, and we delete ${n === 1 ? "it" : "them"} within 24 hours.`;
}

export function ScreenOne({ candidateId, consented: initiallyConsented }: { candidateId: string; consented: boolean }) {
  const [consented, setConsented] = useState(initiallyConsented);
  const [agree, setAgree] = useState(false);
  const [jobAd, setJobAd] = useState("");
  const [adSaved, setAdSaved] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Removed[] | null>(null);

  async function accept() {
    const res = await fetch("/api/consent", { method: "POST" });
    if (res.ok) setConsented(true);
    else setMessage("Something went wrong. Please try again.");
  }

  async function saveAd() {
    setBusy(true);
    const res = await fetch("/api/target-roles", { method: "POST", body: JSON.stringify({ jobAd }) });
    setBusy(false);
    if (!res.ok) return setMessage("We couldn't save that job ad. Please try again.");
    const body = (await res.json()) as { truncated: boolean };
    setTruncated(body.truncated);
    setAdSaved(true);
  }

  async function refresh(id: string): Promise<Status> {
    return (await (await fetch(`/api/uploads/${id}`)).json()) as Status;
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setRemoved(null);
    setMessage("Reading your CV…");
    const ext = file.name.toLowerCase().split(".").pop();
    const path = `${candidateId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseBrowser().storage.from("cv-uploads").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return setMessage("We couldn't upload that file. Upload your CV as a PDF or a Word (.docx) document under 10 MB.");
    }
    const res = await fetch("/api/uploads", { method: "POST", body: JSON.stringify({ path }) });
    if (!res.ok) {
      setBusy(false);
      return setMessage("Something went wrong saving your upload. Please try again.");
    }
    const { uploadId: id } = (await res.json()) as { uploadId: string };
    setUploadId(id);

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await refresh(id);
      if (s.status === "redacted") {
        setBusy(false);
        setMessage(null);
        return setRemoved(s.removed);
      }
      if (s.status === "failed") {
        setBusy(false);
        return setMessage(
          s.failure_reason === "processing_error"
            ? "Something went wrong reading your CV. Please try again."
            : "We couldn't read this file. Try saving your CV as a PDF or a Word (.docx) document and upload it again.",
        );
      }
    }
    setBusy(false);
    setMessage("This is taking longer than usual. Refresh the page in a minute to see the result.");
  }

  async function restore(logId: string) {
    const res = await fetch("/api/restore", { method: "POST", body: JSON.stringify({ logId }) });
    if (!res.ok) return setMessage("That can no longer be restored: we delete removed text after 24 hours.");
    if (uploadId) setRemoved((await refresh(uploadId)).removed);
  }

  // Welcome (D-29): what the app does, what to have ready, how long it takes, then consent.
  if (!consented) {
    return (
      <section>
        <p className="lead">
          Interviewers ask for real examples: what you did, what changed because of it, and how you know. Most CVs list the
          work but not the stories behind it. In about 30 minutes we&apos;ll:
        </p>
        <ol>
          <li>read the job ad to see what this role needs,</li>
          <li>find the experiences in your CV that best show it,</li>
          <li>help you turn the most important ones into stories you can tell with confidence,</li>
          <li>check for gaps and for claims an interviewer is likely to question.</li>
        </ol>
        <div className="card">
          <p><strong>Have ready:</strong> the job ad (copied from the listing) and your CV (PDF or Word).</p>
          <p className="muted small">You can stop at any time and come back.</p>
        </div>
        <p>Before you start, please read <a href="/privacy" target="_blank">how we handle your information</a>.</p>
        <label>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I have read it and I&apos;m happy to continue
        </label>
        <div className="actions"><button type="button" className="btn primary" disabled={!agree} onClick={accept}>Start</button></div>
        {message && <p role="alert" className="alert">{message}</p>}
      </section>
    );
  }

  const current = removed?.filter((r) => !r.restored) ?? [];
  const restorable = current.filter((r) => r.excerpt);

  return (
    <section>
      <div className={`card${adSaved ? "" : " current"}`}>
        <h2 style={{ marginTop: 0 }}>1. Paste the job ad</h2>
        <p className="muted small">Copy the full listing, including the duties and requirements. We use it to work out what this role needs.</p>
        <textarea id="ad" aria-label="Job ad" rows={adSaved ? 4 : 10} value={jobAd} disabled={adSaved} onChange={(e) => setJobAd(e.target.value)} />
        {!adSaved && (
          <div className="actions"><button type="button" className="btn primary" disabled={busy || !jobAd.trim()} onClick={saveAd}>Save the job ad</button></div>
        )}
        {adSaved && truncated && (
          <p role="alert" className="alert">This job ad looks cut off. If there is more, paste the full ad so we don&apos;t miss anything the role needs.</p>
        )}
        {adSaved && !truncated && <p className="small muted">Saved.</p>}
      </div>

      <div className={`card${adSaved && !removed ? " current" : ""}`} style={{ opacity: adSaved ? 1 : 0.55 }}>
        <h2 style={{ marginTop: 0 }}>2. Upload your CV</h2>
        <p className="muted small">PDF or Word. We use it to find the experiences that show what you bring.</p>
        <input id="cv" aria-label="Your CV" type="file" accept=".pdf,.docx" disabled={busy || !adSaved} onChange={upload} />
        <p className="small muted">We remove personal details an employer shouldn&apos;t use, and we never keep your original file.</p>

        {removed && (
          <div role="status">
            <p>
              {removedSentence(current.map((r) => r.category))}
              {restorable.length > 0 && " Restore anything we removed by mistake."}
            </p>
            {restorable.length > 0 && (
              <ul>
                {restorable.map((r) => (
                  <li key={r.id}>
                    &ldquo;{r.excerpt}&rdquo; <button type="button" className="btn link" onClick={() => restore(r.id)}>Restore</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {removed && adSaved && <p className="next"><a className="btn primary" href="/found">Next: find your strongest material</a></p>}
    </section>
  );
}
