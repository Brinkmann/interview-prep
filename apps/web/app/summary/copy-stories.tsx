"use client";

import { useState } from "react";

// "Copy my stories" (D-36): the candidate's own stories, to read before the interview.
export function CopyStories({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }
  return (
    <div className="actions">
      <button type="button" className="btn secondary" onClick={copy}>{copied ? "Copied" : "Copy my stories"}</button>
    </div>
  );
}
