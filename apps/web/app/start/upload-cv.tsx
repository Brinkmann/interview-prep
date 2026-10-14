"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

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

// Wording approved in 05-phase1-experience.md, Screen 1.
function removedSentence(categories: string[]): string {
  if (!categories.length) return "We didn't find anything to remove.";
  const items = [...new Set(categories.map((c) => PHRASES[c] ?? "a personal detail"))];
  const list = items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0];
  const n = categories.length;
  return `We removed ${n} ${n === 1 ? "thing" : "things"} you don't need for interview preparation: ${list}. We haven't stored ${n === 1 ? "it" : "them"}.`;
}

type Status = { status: string; failure_reason: string | null; removed: string[] };

export function UploadCv({ candidateId }: { candidateId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
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
    const { uploadId } = (await res.json()) as { uploadId: string };

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = (await (await fetch(`/api/uploads/${uploadId}`)).json()) as Status;
      if (s.status === "redacted") {
        setBusy(false);
        return setMessage(removedSentence(s.removed));
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

  return (
    <section>
      <p>We use these to show you how well your evidence matches this role. We only keep what helps you prepare.</p>
      <label htmlFor="cv">Upload your CV</label>
      <input id="cv" type="file" accept=".pdf,.docx" disabled={busy} onChange={upload} style={{ display: "block", margin: "0.5rem 0 1rem" }} />
      {message && <p role="status">{message}</p>}
    </section>
  );
}
