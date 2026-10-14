import { redirect } from "next/navigation";
import { BAND_LABEL, beforeAfter, latestScores, summaryText } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { Page } from "../_ui/shell";
import { CopyStories } from "./copy-stories";
import { Feedback } from "./feedback";

// Step 6, Where you stand (05-phase1-experience.md, revision 2; D-36, AT-11).
export default async function Summary() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const { data: role } = await supabase.from("target_roles").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const [{ data: exps }, { data: scores }, { data: evidence }, { data: expectations }, { data: claims }, { data: given }] = await Promise.all([
    supabase.from("experiences").select("id, original_text, source_type, rank_for_role"),
    supabase.from("scores").select("experience_id, band, reasons, created_at"),
    supabase.from("evidence").select("experience_id, situation, action, result, is_estimate, estimate_basis"),
    role ? supabase.from("expectations").select("area, status, answer").eq("target_role_id", role.id) : Promise.resolve({ data: [] }),
    supabase.from("probes").select("id").in("trigger", ["vague", "inconsistent", "unlikely", "ownership"]).is("answer", null),
    supabase.from("feedback").select("id").limit(1),
  ]);
  const stories = (exps ?? []).map((e) => ({ id: e.id, text: e.original_text, source_type: e.source_type, rank_for_role: e.rank_for_role }));
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
      id: s.id, cv: s.text, band: latest.get(s.id)?.band ?? null,
      parts: ev ? [
        ["Situation", ev.situation], ["What you did", ev.action], ["What changed", ev.result ? `${ev.result}${figures}` : null],
      ].filter((p): p is [string, string] => !!p[1]) : [],
    };
  });

  return (
    <Page step={6} title="Am I ready?">
      <p className="lead">{summaryText(result, { gaps, questions })}</p>

      <h2>Your stories</h2>
      <CopyStories text={told.map((t) => [t.cv, ...t.parts.map(([k, v]) => `${k}: ${v}`)].join("\n")).join("\n\n")} />
      {told.map((t) => (
        <article key={t.id} className="card">
          {t.band && <span className={`label ${t.band}`}>{BAND_LABEL[t.band]}</span>}
          <p className="quote"><strong>&ldquo;{t.cv}&rdquo;</strong></p>
          {t.parts.length > 0 && (
            <dl className="story">
              {t.parts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}
        </article>
      ))}

      <div className="card">
        <p style={{ margin: 0 }}>
          <strong>That&apos;s as far as this test version goes.</strong> Next, we&apos;ll match your stories to the questions this role
          is likely to ask, and let you practise them.
        </p>
      </div>

      <h2>Two quick questions</h2>
      {given?.length ? <p>Thank you for your feedback.</p> : <Feedback />}
    </Page>
  );
}
