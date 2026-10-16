import { redirect } from "next/navigation";
import { BAND_LABEL, beforeAfter, latestScores } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { ActionBar, Page } from "../_ui/shell";
import { Feedback } from "./feedback";

// Step 6, Where you stand (05-phase1-experience.md, revision 2; D-36, AT-11).
export default async function Summary() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const { data: role } = await supabase.from("target_roles").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const [{ data: exps }, { data: scores }, { data: evidence }, { data: expectations }, { data: claims }, { data: given }] = await Promise.all([
    supabase.from("experiences").select("id, original_text, job_label, source_type, rank_for_role"),
    supabase.from("scores").select("experience_id, band, reasons, created_at"),
    supabase.from("evidence").select("experience_id, situation, action, result, is_estimate, estimate_basis"),
    role ? supabase.from("expectations").select("area, status, answer").eq("target_role_id", role.id) : Promise.resolve({ data: [] }),
    supabase.from("probes").select("id").in("trigger", ["vague", "inconsistent", "unlikely", "ownership"]).is("answer", null),
    supabase.from("feedback").select("id").limit(1),
  ]);
  const stories = (exps ?? []).map((e) => ({ id: e.id, text: e.original_text, job: e.job_label, source_type: e.source_type, rank_for_role: e.rank_for_role }));
  const result = beforeAfter(stories, scores ?? []);
  const notFound = (expectations ?? []).filter((e) => e.status === "not_found");
  const gaps = notFound.filter((e) => e.answer === "no").map((e) => e.area);
  // Not sure, or not answered yet, stays open: never counted as a gap (skip guard).
  const questions = notFound.filter((e) => e.answer === "unsure" || e.answer === "unanswered").length + (claims?.length ?? 0);

  const latest = latestScores(scores ?? []);
  const chosen = stories.filter((s) => s.rank_for_role !== null).sort((a, b) => a.rank_for_role! - b.rank_for_role!);
  const told = chosen.map((s) => {
    const ev = (evidence ?? []).find((v) => v.experience_id === s.id);
    const figures = ev?.is_estimate ? ` (estimate, based on ${ev.estimate_basis})` : "";
    return {
      id: s.id, cv: s.text, job: s.job, band: latest.get(s.id)?.band ?? null,
      parts: ev ? [
        ["Situation", ev.situation], ["What you did", ev.action], ["What changed", ev.result ? `${ev.result}${figures}` : null],
      ].filter((p): p is [string, string] => !!p[1]) : [],
    };
  });

  const BANDS = ["interview_ready", "needs_detail", "not_yet_a_story"] as const;
  const n = result.worked || 1;
  const segments = (c: Record<(typeof BANDS)[number], number>) =>
    BANDS.map((b) => (c[b] ? <span key={b} className={`seg-${b}`} style={{ width: `${(c[b] / n) * 100}%` }}>{c[b]}</span> : null));

  return (
    <Page step={6} title="Where do I stand now?" bar={<ActionBar back="/claims" hint="End of the test version" />}>
      <div className="card">
        <h2>{result.now.interview_ready} {result.now.interview_ready === 1 ? "story" : "stories"} ready to tell, {result.now.needs_detail} almost there</h2>
        <p className="muted">
          {result.movedUp
            ? `${result.movedUp} ${result.movedUp === 1 ? "story has" : "stories have"} moved up since you started.`
            : "None has moved up yet. Answering a few questions in Build your stories is the quickest way to strengthen them."}
          {result.addedCount > 0 && ` You also added ${result.addedCount} ${result.addedCount === 1 ? "story" : "stories"} of your own.`}
        </p>
        {result.worked > 0 && (
          <>
            <div className="bars" role="img" aria-label="Your stories when you started and now, by label">
              <div className="bar"><span>When you started</span><div className="track">{segments(result.before)}</div></div>
              <div className="bar"><span>Now</span><div className="track">{segments(result.now)}</div></div>
            </div>
            <div className="legend">
              {BANDS.map((b) => <span key={b}><span className={`swatch ${b}`} />{BAND_LABEL[b]}</span>)}
            </div>
          </>
        )}
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Still open</h3>
          {gaps.length || questions ? (
            <ul style={{ paddingLeft: "1.1rem" }}>
              {gaps.map((g) => <li key={g}>{g} (you said you haven&apos;t done it)</li>)}
              {questions > 0 && <li>{questions} {questions === 1 ? "question" : "questions"} to come back to</li>}
            </ul>
          ) : <p className="muted">Nothing. Everything has an answer.</p>}
        </div>
        <div className="card">
          <h3>What comes next</h3>
          <p>That&apos;s as far as this test version goes. Next, we&apos;ll match your stories to the questions this role is likely to ask, then let you practise them and prepare your cue sheet.</p>
        </div>
      </div>

      <h2>Your stories so far</h2>
      {told.map((t) => (
        <article key={t.id} className="card">
          <div className="spread"><span className="role">{t.job}</span>{t.band && <span className={`label ${t.band}`}>{BAND_LABEL[t.band]}</span>}</div>
          <p className="quote">&ldquo;{t.cv}&rdquo;</p>
          {t.parts.length > 0 && (
            <dl className="star">{t.parts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          )}
        </article>
      ))}

      <section className="card">
        <h2>Two quick questions</h2>
        {given?.length ? <p>Thank you for your feedback.</p> : <Feedback />}
      </section>
    </Page>
  );
}
