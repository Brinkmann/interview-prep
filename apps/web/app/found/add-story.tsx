"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Moves an experience from the collapsed list into the candidate's stories (D-31).
export function AddStory({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    const res = await fetch("/api/stories", { method: "POST", body: JSON.stringify({ experienceId: id }) });
    setBusy(false);
    if (res.ok) router.refresh();
  }
  return <button type="button" className="btn secondary" disabled={busy} onClick={add}>Add to my stories</button>;
}
