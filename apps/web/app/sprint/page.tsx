import { redirect } from "next/navigation";
import { evidenceNote, sprintItems, summarise } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { Sprint } from "./sprint";

// Screen 3: "How do I turn these into stories I can tell?" (05-phase1-experience.md).
export default async function SprintPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const [{ graduate, items }, { data: scores }] = await Promise.all([
    sprintItems(supabase),
    supabase.from("scores").select("experience_id, band, reasons, created_at"),
  ]);
  const { groups } = summarise(
    items.map((i) => ({ id: i.id, job_label: i.job, original_text: i.text, source_span: null, rank_for_role: i.rank })),
    scores ?? [],
  );
  const bands = new Map(groups.flatMap((g) => g.cards.map((c) => [c.id, c.band])));

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>How do I turn these into stories I can tell?</h1>
      {items.length === 0 ? (
        <p>We haven't picked the experiences for this role yet. <a href="/found">Go back to what we found</a>.</p>
      ) : (
        <Sprint
          graduate={graduate}
          items={items.map((i) => ({
            id: i.id, job: i.job, text: i.text, next: i.next, question: i.question,
            band: bands.get(i.id) ?? null, note: evidenceNote(i.text, i.evidence),
            hasEvidence: !!i.evidence, labelled: i.evidence?.is_estimate ?? null,
          }))}
        />
      )}
      <p style={{ marginTop: "2rem" }}><a href="/found">Back to what we found</a></p>
    </main>
  );
}
