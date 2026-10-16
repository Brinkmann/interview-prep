import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { KeepFresh } from "../found/keep-fresh";
import { ActionBar, Page } from "../_ui/shell";
import { Spinner } from "../_ui/working";
import { ClaimAnswer } from "./claim-answer";

// Step 5, Prepare for challenges (05-phase1-experience.md; D-35, D-38, D-40).
const TYPE = { vague: "Needs a figure", inconsistent: "Dates", unlikely: "Unusually large", ownership: "Your part" } as const;
type Trigger = keyof typeof TYPE;
const DONE: Record<string, string> = {
  explained: "Answer saved", candidate_corrected: "Correction saved", confirmed_fine: "Marked as fine as it is",
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
  const exp = (id: string) => (experiences ?? []).find((e) => e.id === id);
  // Checks run a minute or so after experiences are found; after five minutes an empty list is final.
  const firstFound = (experiences ?? []).find((e) => e.source_type === "cv");
  const since = firstFound ? Date.now() - new Date(firstFound.created_at).getTime() : Infinity;
  const waiting = !list.length && since < 5 * 60_000;
  const left = list.filter((p) => !p.answer).length;
  const firstOpen = list.find((p) => !p.answer)?.id;

  return (
    <Page
      step={5}
      title="What will an interviewer push back on?"
      task={[
        "Read each claim and the question an interviewer is likely to ask about it.",
        "Answer it now while you can check your facts, or mark it as fine as it is.",
        "Nothing in your CV is changed.",
      ]}
      bar={<ActionBar back="/expects" hint={waiting ? "Still working…" : `${left} still to handle`} next={{ href: "/summary", text: "Next: where you stand", disabled: waiting }} />}
    >
      {waiting ? (
        <>
          <Spinner text="Reading your claims the way an interviewer might. This usually takes under a minute." />
          <KeepFresh />
        </>
      ) : !list.length ? (
        <p className="lead">We didn&apos;t find any claims an interviewer is likely to push back on.</p>
      ) : (
        <p className="muted">{list.length - left} of {list.length} handled.</p>
      )}
      {list.map((p) => {
        const e = exp(p.target_id);
        return (
          <section key={p.id} className={`card${p.id === firstOpen ? " focus" : ""}`}>
            <div className="spread">
              <span className="eyebrow">{TYPE[p.trigger as Trigger]}</span>
              <span className="role">{p.trigger === "inconsistent" ? "Your job dates" : e?.job_label}</span>
            </div>
            {p.trigger !== "inconsistent" && e && (
              <p><span className="muted small">From your CV</span><br /><b>&ldquo;{e.original_text}&rdquo;</b></p>
            )}
            <p className="note"><span className="muted small">An interviewer might ask</span><br />{p.question}</p>
            {p.answer ? (
              <p className="small" style={{ color: "var(--ready)" }}>
                ✓ {DONE[p.resulting_action ?? ""] ?? "Answer saved"}{p.resulting_action !== "confirmed_fine" ? `: ${p.answer}` : ""}
              </p>
            ) : (
              <ClaimAnswer id={p.id} />
            )}
          </section>
        );
      })}
    </Page>
  );
}
