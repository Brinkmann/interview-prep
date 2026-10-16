"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { ActionBar } from "../_ui/shell";
import { Working } from "../_ui/working";

// Welcome and Step 1, Your role and CV (05-phase1-experience.md; D-29, D-40).

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

// Welcome (D-29): what the app does, what to have ready, how long it takes, then consent.
export function Welcome() {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function accept() {
    const res = await fetch("/api/consent", { method: "POST" });
    if (res.ok) router.refresh();
    else setMessage("Something went wrong. Please try again.");
  }
  return (
    <>
      <p className="lead">
        Interviewers ask for real examples: what you did, what changed because of it, and how you know. Most CVs list the work
        but not the stories behind it. In about 30 minutes we&apos;ll read the job ad, find the experiences in your CV that best show
        what the role needs, and help you turn them into stories you can tell with confidence.
      </p>
      <div className="grid2">
        <div className="card"><h3>Have ready</h3><p>The job ad, copied from the listing, and your CV as a PDF or Word file.</p></div>
        <div className="card"><h3>How it works</h3><p>Six short steps. You can stop at any time and pick up where you left off.</p></div>
      </div>
      <label className="row">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        I have read <a href="/privacy" target="_blank">how we handle my information</a> and I&apos;m happy to continue
      </label>
      {message && <p role="alert" className="alert">{message}</p>}
      <ActionBar hint="About 30 minutes" next={<button type="button" className="btn primary" disabled={!agree} onClick={accept}>Start</button>} />
    </>
  );
}

export function ScreenOne({ candidateId, alreadyDone }: { candidateId: string; alreadyDone: boolean }) {
  const [jobAd, setJobAd] = useState("");
  const [adSaved, setAdSaved] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Removed[] | null>(null);
  const [stage, setStage] = useState(0);

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
    setMessage(null);
    setStage(0);
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
      setStage(s.status === "redacting" ? 1 : s.status === "extracting" ? 0 : stage);
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

  const current = removed?.filter((r) => !r.restored) ?? [];
  const restorable = current.filter((r) => r.excerpt);
  const reading = busy && adSaved && !removed;
  const done = !!removed && adSaved;

  return (
    <>
      <div className={`card${adSaved ? "" : " focus"}`}>
        <h2>1. Paste the job ad</h2>
        <p className="muted small">Copy the full listing, including the duties and requirements. We use it to work out what this role needs.</p>
        <textarea id="ad" aria-label="Job ad" rows={adSaved ? 3 : 8} value={jobAd} disabled={adSaved} onChange={(e) => setJobAd(e.target.value)} />
        {!adSaved && <div className="row"><button type="button" className="btn primary" disabled={busy || !jobAd.trim()} onClick={saveAd}>Save the job ad</button></div>}
        {adSaved && truncated && (
          <p role="alert" className="alert">This job ad looks cut off. If there is more, paste the full ad so we don&apos;t miss anything the role needs.</p>
        )}
        {adSaved && !truncated && <p className="small" style={{ color: "var(--ready)" }}>✓ Saved</p>}
      </div>

      <div className={`card${adSaved && !removed ? " focus" : ""}${adSaved ? "" : " dim"}`}>
        <h2>2. Upload your CV</h2>
        <p className="muted small">PDF or Word. We remove personal details an employer shouldn&apos;t use, and we never keep your original file.</p>
        {!removed && !reading && <input id="cv" aria-label="Your CV" type="file" accept=".pdf,.docx" disabled={busy || !adSaved} onChange={upload} />}
        {reading && <Working steps={["Uploading your CV", "Reading your CV", "Removing personal details"]} current={uploadId ? stage + 1 : 0} />}
        {removed && (
          <div role="status" style={{ display: "grid", gap: "0.5rem" }}>
            <p><b>{removedSentence(current.map((r) => r.category))}</b>{restorable.length > 0 && " Restore anything we removed by mistake."}</p>
            {restorable.length > 0 && (
              <ul>
                {restorable.map((r) => (
                  <li key={r.id}>&ldquo;{r.excerpt}&rdquo; <button type="button" className="btn quiet" onClick={() => restore(r.id)}>Restore</button></li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {message && <p role="status" className="alert">{message}</p>}
      <ActionBar
        hint={done ? "Step 1 done" : alreadyDone ? "You can carry on with the role and CV you gave before" : "Save the job ad and upload your CV to continue"}
        next={{ href: "/found", text: "Next: find your strongest material", disabled: !done && !alreadyDone }}
      />
    </>
  );
}
