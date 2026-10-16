import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { KeepFresh } from "../found/keep-fresh";
import { NextStep, Page } from "../_ui/shell";
import { ClaimAnswer } from "./claim-answer";
import { Spinner } from "../_ui/working";

// Step 5, Prepare for challenges (05-phase1-experience.md, revision 2; D-35).
const TYPE = { vague: "Needs a figure", inconsistent: "Dates", unlikely: "Unusually large", ownership: "Your part" } as const;
type Trigger = keyof typeof TYPE;
const DONE: Record<string, string> = {
  explained: "Your answer", candidate_corrected: "Your corrected wording", confirmed_fine: "You marked this as fine as it is",
};

export default async function Claims() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const [{ data: probes }, { data: experiences }] = await Promise.all([
    supabase.from("probes").select("id, trigger, target_id, question, answer, resulting_action, created_at")
      .in("trigger", Object.keys(TYPE)).order("created_at"),
    supabase.from("experiences").select("id, original_text, job_label, source_type, created_at").order("created_at"),
  ]);
  const list = probes ?? [];
  const textOf = (id: string) => (experiences ?? []).find((e) => e.id === id)?.original_text;
  const roleOf = (id: string) => (experiences ?? []).find((e) => e.id === id)?.job_label;
  // Checks run a minute or so after experiences are found; after five minutes an empty list is final.
  const firstFound = (experiences ?? []).find((e) => e.source_type === "cv");
  const since = firstFound ? Date.now() - new Date(firstFound.created_at).getTime() : Infinity;
  const waiting = !list.length && since < 5 * 60_000;

  return (
    <Page step={5} title="What will an interviewer push back on?">
      {waiting ? (
        <>
          <Spinner text="Reading your claims the way an interviewer might. This usually takes under a minute." />
          <KeepFresh />
        </>
      ) : !list.length ? (
        <p className="lead">We didn&apos;t find any claims an interviewer is likely to push back on.</p>
      ) : (
        <p className="lead">
          These are the claims an interviewer is most likely to question. Answer them here, while you can check your facts,
          or mark any that are fine as they are.
        </p>
      )}
      {list.map((p) => (
        <section key={p.id} className="card">
          <p className="small muted" style={{ margin: 0 }}>
            {TYPE[p.trigger as Trigger]}{p.trigger !== "inconsistent" && roleOf(p.target_id) ? ` · ${roleOf(p.target_id)}` : ""}
          </p>
          <p><b>From your CV:</b> {p.trigger === "inconsistent" ? "your job dates" : <>&ldquo;{textOf(p.target_id)}&rdquo;</>}</p>
          <p><b>An interviewer might ask:</b> <em>{p.question}</em></p>
          {p.answer ? (
            <p className="story" style={{ margin: 0 }}><b>{DONE[p.resulting_action ?? ""] ?? "Your answer"}</b>{p.resulting_action === "confirmed_fine" ? "." : `: ${p.answer}`}</p>
          ) : (
            <ClaimAnswer id={p.id} />
          )}
        </section>
      ))}
      {!waiting && <NextStep href="/summary">Next: where you stand</NextStep>}
    </Page>
  );
}
