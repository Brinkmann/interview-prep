import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { KeepFresh } from "../found/keep-fresh";
import { ClaimAnswer } from "./claim-answer";

// Screen 5: "Will my claims hold up?" (05-phase1-experience.md).
const TYPE = { vague: "Vague", inconsistent: "Inconsistent", unlikely: "Unlikely", ownership: "Unclear ownership" } as const;
type Trigger = keyof typeof TYPE;

export default async function Claims() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const [{ data: probes }, { data: firstFound }, { data: experiences }] = await Promise.all([
    supabase.from("probes").select("id, trigger, target_id, question, answer, resulting_action, created_at")
      .in("trigger", Object.keys(TYPE)).order("created_at"),
    supabase.from("experiences").select("id, original_text, created_at").eq("source_type", "cv").order("created_at").limit(1),
    supabase.from("experiences").select("id, original_text"),
  ]);
  const list = probes ?? [];
  const textOf = (id: string) => (experiences ?? []).find((e) => e.id === id)?.original_text;
  // Checks run a minute or so after experiences are found; after five minutes an empty list is final.
  const since = firstFound?.[0] ? Date.now() - new Date(firstFound[0].created_at).getTime() : 0;
  const waiting = !list.length && since < 5 * 60_000;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>Will my claims hold up?</h1>
      {waiting ? (
        <>
          <p role="status">We're checking your claims the way an interviewer might. This usually takes under a minute.</p>
          <KeepFresh />
        </>
      ) : !list.length ? (
        <p>We didn't find any claims an interviewer is likely to challenge.</p>
      ) : (
        <p>Claims an interviewer might challenge, each with the question they're likely to ask. Answer them here first, while you can check your facts.</p>
      )}
      {list.map((p) => (
        <section key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem 1rem", margin: "1rem 0" }}>
          <p style={{ margin: 0, color: "#555" }}>{TYPE[p.trigger as Trigger]}</p>
          {p.trigger !== "inconsistent" && textOf(p.target_id) && <p style={{ margin: "0.25rem 0" }}>“{textOf(p.target_id)}”</p>}
          <p><strong>{p.question}</strong></p>
          {p.answer ? (
            <p>{p.resulting_action === "candidate_corrected" ? "Your corrected wording: " : "Your answer: "}{p.answer}</p>
          ) : (
            <ClaimAnswer id={p.id} canCorrect={p.trigger !== "ownership"} />
          )}
        </section>
      ))}
      {!waiting && <p style={{ marginTop: "2rem" }}><a href="/summary"><strong>Next: where do I stand now?</strong></a></p>}
    </main>
  );
}
