"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Step 2 is a decision (D-40): add an experience to the stories, or take one out.
export function StoryChoice({ id, action }: { id: string; action: "add" | "remove" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await fetch("/api/stories", { method: action === "add" ? "POST" : "DELETE", body: JSON.stringify({ experienceId: id }) });
    setBusy(false);
    if (res.ok) router.refresh();
  }
  return action === "add"
    ? <button type="button" className="btn secondary" disabled={busy} onClick={go}>Add to my stories</button>
    : <button type="button" className="btn quiet small" disabled={busy} onClick={go}>Remove</button>;
}
