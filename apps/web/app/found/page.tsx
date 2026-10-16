import { redirect } from "next/navigation";
import { BAND_LABEL, BAND_MEANING, headline, strongestMaterial, type Card } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { ActionBar, Page } from "../_ui/shell";
import { Working } from "../_ui/working";
import { StoryChoice } from "./add-story";
import { KeepFresh } from "./keep-fresh";

// Step 2, Your strongest material (05-phase1-experience.md; D-30, D-31, D-40): a decision.
// Every read runs as the candidate, under row-level security.

function CardView({ card }: { card: Card }) {
  return (
    <article className="card">
      <div className="spread"><span className="role">{card.job}</span><StoryChoice id={card.id} action="remove" /></div>
      <p className="quote">&ldquo;{card.text}&rdquo;</p>
      {card.band ? (
        <>
          <div className="row"><span className={`label ${card.band}`}>{BAND_LABEL[card.band]}</span><span className="meaning">{BAND_MEANING[card.band]}</span></div>
          <div className="coach">
            {card.strength && <p><b>Strong:</b> {card.strength}</p>}
            {card.nextStep && <p><b>Next:</b> {card.nextStep}</p>}
          </div>
        </>
      ) : (
        <div className="row"><span className="spinner" aria-hidden /><span className="small muted">Rating…</span></div>
      )}
    </article>
  );
}

export default async function Found() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const [{ data: exps }, { data: scores }, { data: cv }, { data: role }] = await Promise.all([
    supabase.from("experiences").select("id, job_label, original_text, source_span, rank_for_role"),
    supabase.from("scores").select("experience_id, band, reasons, strength, next_step, created_at"),
    supabase.from("cv_text").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("target_roles").select("title").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!cv) redirect("/start");
  const s = strongestMaterial(exps ?? [], scores ?? []);
  // Reading normally finishes within a minute; after three, an empty result is final.
  const stillReading = !s.top.length && Date.now() - new Date(cv.created_at).getTime() < 3 * 60_000;
  const working = stillReading || s.rated < s.top.length;

  return (
    <Page
      step={2}
      title="What do I have that this role needs?"
      task={[
        "Look through the experiences we picked for this role.",
        "Remove any you'd rather not use, and add any we missed from the list further down.",
        "When the list looks right, continue to build your stories.",
      ]}
      bar={<ActionBar back="/start" hint={working ? "Still working…" : `${s.top.length} stories chosen`} next={{ href: "/sprint", text: "Next: build your stories", disabled: working || !s.top.length }} />}
    >
      {stillReading ? (
        <>
          <Working steps={["Reading your CV", "Finding your experiences", "Choosing the ones that matter for this role", "Rating each one"]} current={!s.total ? 1 : 2} />
          <KeepFresh />
        </>
      ) : (
        <>
          {working && (
            <>
              <Working steps={["Reading your CV", "Finding your experiences", "Choosing the ones that matter for this role", "Rating each one"]} current={3} detail={`${s.rated} of ${s.top.length}`} />
              <KeepFresh />
            </>
          )}
          {!working && <p className="lead">{headline(s.counts, s.top.length, role?.title ?? null)}</p>}
          <h2>{s.top.length === 1 ? "Your story for this role" : "Your stories for this role"}</h2>
          {s.top.map((c) => <CardView key={c.id} card={c} />)}
          {s.rest.length > 0 && (
            <>
              <h2>More from your CV</h2>
              <p className="muted">These didn&apos;t make our list for this role. Add any you think an interviewer should hear about.</p>
              {s.rest.map((c) => (
                <article key={c.id} className="card">
                  <span className="role">{c.job}</span>
                  <p>&ldquo;{c.text}&rdquo;</p>
                  <div className="row"><StoryChoice id={c.id} action="add" /></div>
                </article>
              ))}
            </>
          )}
        </>
      )}
    </Page>
  );
}
