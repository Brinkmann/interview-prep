import { redirect } from "next/navigation";
import { headline, summarise, type Card } from "@interview-prep/jobs";
import { REASONS } from "@interview-prep/ai";
import { supabaseServer } from "@/lib/supabase/server";
import { KeepFresh } from "./keep-fresh";

// Screen 2: "Which of my experiences will hold up in an interview?" (05-phase1-experience.md).
// Every read runs as the candidate, under row-level security.

const LABEL = { interview_ready: "Interview-ready", needs_detail: "Needs detail", not_yet_a_story: "Not yet a story" } as const;
const COLOUR = { interview_ready: "#1b6e3a", needs_detail: "#8a5a00", not_yet_a_story: "#9b1c1c" } as const;

// Approved template wording only (tone guard): no praise, the reason and what is missing.
function explanation(card: Card): string {
  if (card.band === "interview_ready" && !card.reasons.length) {
    return "Result, starting point, timeframe and your part are all there; this survives follow-up questions.";
  }
  const why = card.reasons.map((r) => REASONS[r]).join(", ");
  if (card.band === "interview_ready") return `Holds up in an interview. Still worth adding: ${why}.`;
  if (card.band === "needs_detail") return `An interviewer will ask follow-up questions you need answers ready for: ${why || "more detail"}.`;
  return `It gives an interviewer nothing to score yet: ${why || "no result"}.`;
}

export default async function Found() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const [{ data: exps }, { data: scores }, { data: cv }] = await Promise.all([
    supabase.from("experiences").select("id, job_label, original_text, source_span, rank_for_role"),
    supabase.from("scores").select("experience_id, band, reasons, created_at"),
    supabase.from("cv_text").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!cv) redirect("/start");
  const s = summarise(exps ?? [], scores ?? []);
  // Reading normally finishes within a minute; after three, an empty result is final.
  const stillReading = !s.total && Date.now() - new Date(cv.created_at).getTime() < 3 * 60_000;
  const working = stillReading || s.rated < s.total;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>Which of my experiences will hold up in an interview?</h1>
      {working ? (
        <>
          <p role="status">We're reading your CV and rating each experience. This usually takes under a minute.</p>
          <KeepFresh />
        </>
      ) : (
        <>
          <p>{headline(s.counts, s.total)}</p>
          {s.total > 0 && <p><a href="/sprint"><strong>Start the evidence sprint</strong></a></p>}
        </>
      )}
      {s.groups.map((g) => (
        <section key={g.job}>
          <h2 style={{ fontSize: "1.1rem", marginTop: "2rem" }}>{g.job}</h2>
          {g.cards.map((c) => (
            <article key={c.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem 1rem", margin: "0.75rem 0" }}>
              <p style={{ margin: 0 }}>“{c.text}”</p>
              {c.band ? (
                <p style={{ margin: "0.5rem 0 0" }}>
                  <strong style={{ color: COLOUR[c.band] }}>{LABEL[c.band]}.</strong> {explanation(c)}
                  {c.rank && " Matters for this role."}
                </p>
              ) : (
                <p style={{ margin: "0.5rem 0 0", color: "#666" }}>Rating…</p>
              )}
            </article>
          ))}
        </section>
      ))}
      <p style={{ marginTop: "2rem" }}><a href="/start">Back to the start</a></p>
    </main>
  );
}
