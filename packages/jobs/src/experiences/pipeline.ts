import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dimension, Reason } from "@interview-prep/ai";
import { evidenceVersion, guardRating, rate, type Evidence, type Rating } from "./rating";
import { locate } from "./spans";

// Screen 2 jobs. Every query filters on candidate_id; results returned to Inngest are
// ids and counts only.

export interface ExperienceDeps {
  db: SupabaseClient;
  extract: (cvText: string) => Promise<{ graduate: boolean; experiences: { job_label: string; text: string }[] }>;
  rank: (jobAd: string, experiences: { job: string; text: string }[]) => Promise<{ index: number }[]>;
  score: (experience: string, evidence: Evidence | null) => Promise<{ scores: Record<Dimension, number>; reasons: Reason[] }>;
  modelIds: { extract: string; rank: string; score: string };
  promptVersions: { extract: string; score: string };
}

function fail(what: string, error: { code?: string } | null): never {
  throw new Error(`${what}: ${error?.code ?? "unknown"}`);
}

// experiences.extract: replaces the CV's experiences, unless the candidate has
// already started adding evidence (then a restore does not wipe their work).
export async function extractFromCv(deps: ExperienceDeps, candidateId: string) {
  const { db } = deps;
  const cv = await db.from("cv_text").select("id, redacted_text").eq("candidate_id", candidateId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (cv.error) fail("Could not read CV text", cv.error);
  if (!cv.data) return { outcome: "no_cv" as const, ids: [] as string[] };

  const started = await db.from("evidence").select("id").eq("candidate_id", candidateId).limit(1);
  if (started.error) fail("Could not read evidence", started.error);
  if (started.data.length) return { outcome: "kept" as const, ids: [] as string[] };

  const text: string = cv.data.redacted_text;
  const found = await deps.extract(text);
  const rows = found.experiences.flatMap((e) => {
    const span = locate(text, e.text);
    // Anything the model did not copy from the CV is dropped (AT-04, number guard).
    return span ? [{
      candidate_id: candidateId, job_label: e.job_label.trim(), original_text: text.slice(span[0], span[1]),
      source_type: "cv", source_span: `[${span[0]},${span[1]})`,
      model_id: deps.modelIds.extract, prompt_version: deps.promptVersions.extract,
    }] : [];
  });
  const unique = rows.filter((r, i) => rows.findIndex((o) => o.source_span === r.source_span) === i);

  const cleared = await db.from("experiences").delete().eq("candidate_id", candidateId).eq("source_type", "cv");
  if (cleared.error) fail("Could not clear experiences", cleared.error);
  const inserted = await db.from("experiences").insert(unique).select("id");
  if (inserted.error) fail("Could not save experiences", inserted.error);
  if (found.graduate) await db.from("candidates").update({ persona: "pe1" }).eq("id", candidateId).is("persona", null);
  return { outcome: "extracted" as const, ids: (inserted.data as { id: string }[]).map((r) => r.id) };
}

export function spanStart(span: string | null): number {
  return Number(/^\[(\d+),/.exec(span ?? "")?.[1] ?? Number.MAX_SAFE_INTEGER);
}

// rank_for_role: marks the 8 to 10 experiences that matter most for the latest role.
export async function rankForRole(deps: ExperienceDeps, candidateId: string) {
  const { db } = deps;
  const role = await db.from("target_roles").select("job_ad_text").eq("candidate_id", candidateId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (role.error) fail("Could not read target role", role.error);
  const exps = await db.from("experiences").select("id, job_label, original_text, source_span").eq("candidate_id", candidateId);
  if (exps.error) fail("Could not read experiences", exps.error);
  // In CV order, so the model sees each job's experiences together.
  const list = (exps.data as { id: string; job_label: string; original_text: string; source_span: string | null }[])
    .sort((a, b) => spanStart(a.source_span) - spanStart(b.source_span));
  if (!role.data || !list.length) return { ranked: 0 };

  const ranked = await deps.rank(role.data.job_ad_text, list.map((e) => ({ job: e.job_label, text: e.original_text })));
  const order = [...new Set(ranked.map((r) => r.index).filter((i) => i >= 0 && i < list.length))].slice(0, 10);
  const reset = await db.from("experiences").update({ rank_for_role: null }).eq("candidate_id", candidateId);
  if (reset.error) fail("Could not reset ranking", reset.error);
  for (const [position, index] of order.entries()) {
    const set = await db.from("experiences").update({ rank_for_role: position + 1 })
      .eq("id", list[index]!.id).eq("candidate_id", candidateId);
    if (set.error) fail("Could not save ranking", set.error);
  }
  return { ranked: order.length };
}

// experiences.score: rates one experience with its current evidence, under the rating guard.
export async function scoreOne(deps: ExperienceDeps, candidateId: string, experienceId: string) {
  const { db } = deps;
  const exp = await db.from("experiences").select("original_text").eq("id", experienceId)
    .eq("candidate_id", candidateId).maybeSingle();
  if (exp.error) fail("Could not read experience", exp.error);
  if (!exp.data) return { outcome: "gone" as const };
  const ev = await db.from("evidence").select("*").eq("experience_id", experienceId)
    .eq("candidate_id", candidateId).maybeSingle();
  if (ev.error) fail("Could not read evidence", ev.error);
  const prev = await db.from("scores").select("*").eq("experience_id", experienceId).eq("candidate_id", candidateId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (prev.error) fail("Could not read score", prev.error);

  const evidence = ev.data as Evidence | null;
  const version = evidenceVersion(evidence);
  const previous: Rating | null = prev.data ? {
    scores: prev.data, overall: prev.data.overall, band: prev.data.band, reasons: prev.data.reasons,
    evidenceVersion: prev.data.evidence_version,
  } : null;
  // Scoring runs only when an evidence field has changed (rating guard).
  if (previous && version === previous.evidenceVersion) return { outcome: "unchanged" as const };

  const out = await deps.score(exp.data.original_text, evidence);
  const next = guardRating(previous, rate(out.scores, out.reasons, version));
  if (!next) return { outcome: "discarded" as const };

  const saved = await db.from("scores").insert({
    candidate_id: candidateId, experience_id: experienceId, ...next.scores, overall: next.overall, band: next.band,
    reasons: next.reasons, evidence_version: next.evidenceVersion,
    source_type: version ? "candidate_answer" : "cv", model_id: deps.modelIds.score, prompt_version: deps.promptVersions.score,
  });
  if (saved.error) fail("Could not save score", saved.error);
  return { outcome: "scored" as const, band: next.band };
}
