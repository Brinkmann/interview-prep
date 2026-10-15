import { redirect } from "next/navigation";
import { BAND_LABEL, BAND_MEANING, headline, strongestMaterial, type Card } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { NextStep, Page } from "../_ui/shell";
import { AddStory } from "./add-story";
import { KeepFresh } from "./keep-fresh";

// Step 2, Your strongest material (05-phase1-experience.md, revision 2; D-30, D-31).
// Every read runs as the candidate, under row-level security.

function CardView({ card }: { card: Card }) {
  return (
    <article className="card">
      <p className="muted small" style={{ margin: 0 }}>{card.job}</p>
      <p className="quote">&ldquo;{card.text}&rdquo;</p>
      {card.band ? (
        <>
          <p style={{ margin: "0.25rem 0" }}>
            <span className={`label ${card.band}`}>{BAND_LABEL[card.band]}</span>{" "}
            <span className="small muted">{BAND_MEANING[card.band]}</span>
          </p>
          {card.strength && <p className="coach"><b>Strong:</b> {card.strength}</p>}
          {card.nextStep && <p className="coach"><b>Next:</b> {card.nextStep}</p>}
        </>
      ) : (
        <span className="label pending">Rating…</span>
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
    <Page step={2} title="What do I have that this role needs?">
      {working ? (
        <>
          <p role="status" className="lead">
            We&apos;re reading your CV and picking out the experiences that best show what this role needs. This usually takes under a minute.
          </p>
          <KeepFresh />
        </>
      ) : (
        <p className="lead">{headline(s.counts, s.top.length, role?.title ?? null)}</p>
      )}

      {s.top.length > 0 && <h2>{s.top.length === 1 ? "Your experience for this role" : "Your experiences for this role"}</h2>}
      {s.top.map((c) => <CardView key={c.id} card={c} />)}

      {s.rest.length > 0 && !working && (
        <details>
          <summary>{s.rest.length} more {s.rest.length === 1 ? "experience" : "experiences"} from your CV</summary>
          <p className="small muted">Add any you&apos;d like to build into a story as well.</p>
          {s.rest.map((c) => (
            <article key={c.id} className="card">
              <p className="muted small" style={{ margin: 0 }}>{c.job}</p>
              <p className="quote">&ldquo;{c.text}&rdquo;</p>
              <AddStory id={c.id} />
            </article>
          ))}
        </details>
      )}

      {!working && s.top.length > 0 && <NextStep href="/sprint">Next: build your stories</NextStep>}
    </Page>
  );
}
