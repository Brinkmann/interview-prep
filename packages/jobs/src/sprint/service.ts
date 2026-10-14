import type { SupabaseClient } from "@supabase/supabase-js";
import { numberGuard } from "@interview-prep/ai";
import { EVIDENCE_FIELDS, type Evidence, type EvidenceField } from "../experiences/rating";
import { estimateProblem, isStep, nextStep, questionFor, STEPS, type StepId } from "./questions";

// Screen 3 reads and writes. The web app passes the candidate's own client, so
// every query here also runs under row-level security.

export interface SprintItem {
  id: string; job: string; text: string; rank: number; evidence: Evidence | null;
  skipped: StepId[]; next: StepId | null; question: string | null;
}

export async function sprintItems(db: SupabaseClient): Promise<{ graduate: boolean; items: SprintItem[] }> {
  const [cand, exps, evs, probes] = await Promise.all([
    db.from("candidates").select("persona").maybeSingle(),
    db.from("experiences").select("id, job_label, original_text, rank_for_role").not("rank_for_role", "is", null).order("rank_for_role"),
    db.from("evidence").select("*"),
    db.from("probes").select("target_id, resulting_action").eq("trigger", "missing_field"),
  ]);
  const graduate = cand.data?.persona === "pe1";
  const items = (exps.data ?? []).map((e) => {
    const evidence = (evs.data ?? []).find((v) => v.experience_id === e.id) ?? null;
    const skipped = (probes.data ?? []).filter((p) => p.target_id === e.id && p.resulting_action?.startsWith("skipped:"))
      .map((p) => p.resulting_action!.slice("skipped:".length)).filter(isStep);
    const next = nextStep(evidence, skipped);
    return {
      id: e.id, job: e.job_label, text: e.original_text, rank: e.rank_for_role!, evidence, skipped, next,
      question: next ? questionFor(next, { graduate, job: e.job_label, evidence }) : null,
    };
  });
  return { graduate, items };
}

export type ParsedFields = Partial<Record<EvidenceField, string | null>> & { numbers_labelled: "exact" | "estimate" | "not_said" };

// parse_sprint_answer under the number guard: a number the candidate did not say is rejected.
export async function parseAnswer(
  run: (input: { experience: string; question: string; step: string; answer: string }, check: (out: never) => string | null) => Promise<ParsedFields>,
  item: SprintItem,
  answer: string,
): Promise<ParsedFields> {
  const check = numberGuard([answer, item.text], (out: ParsedFields) =>
    EVIDENCE_FIELDS.map((f) => out[f] ?? "").filter(Boolean) as string[]);
  const out = await run({ experience: item.text, question: item.question ?? "", step: item.next ?? "", answer }, check as never);
  const fields = Object.fromEntries(Object.entries(out).filter(([, v]) => v !== null)) as ParsedFields;
  // If nothing was picked out for the question asked, keep the answer as written.
  const step = STEPS.find((s) => s.id === item.next);
  if (step && !step.fields.some((f) => fields[f])) fields[step.fields[0]] = answer;
  return fields;
}

export interface SaveRequest {
  experienceId: string; step: StepId; question: string; answer: string;
  fields: Partial<Record<EvidenceField, string>>; isEstimate: boolean | null; basis: string | null;
}

export type SaveResult = { ok: true } | { ok: false; error: "label_numbers" | "basis_required" | "not_found" | "empty" | "could_not_save" };

// Saves confirmed fields (edit guard: the candidate has seen and confirmed them).
export async function saveAnswer(db: SupabaseClient, candidateId: string, req: SaveRequest): Promise<SaveResult> {
  const { data: exp } = await db.from("experiences").select("id").eq("id", req.experienceId).maybeSingle();
  if (!exp) return { ok: false, error: "not_found" };
  const fields = Object.fromEntries(EVIDENCE_FIELDS.flatMap((f) => {
    const v = req.fields[f]?.trim();
    return v ? [[f, v]] : [];
  })) as Partial<Record<EvidenceField, string>>;
  if (!Object.keys(fields).length) return { ok: false, error: "empty" };

  const { data: existing } = await db.from("evidence").select("*").eq("experience_id", req.experienceId).maybeSingle();
  // Numbers already labelled stay labelled; new numbers need a label (AT-06).
  const isEstimate = req.isEstimate ?? (existing?.is_estimate as boolean | null) ?? null;
  const basis = fields.estimate_basis ?? req.basis ?? (existing?.estimate_basis as string | null) ?? null;
  const problem = estimateProblem(fields, { isEstimate, basis });
  if (problem) return { ok: false, error: problem };

  const row = {
    ...fields, is_estimate: isEstimate, estimate_basis: basis,
    source_type: "candidate_answer",
  };
  const saved = existing
    ? await db.from("evidence").update(row).eq("id", existing.id)
    : await db.from("evidence").insert({ ...row, candidate_id: candidateId, experience_id: req.experienceId });
  if (saved.error) return { ok: false, error: "could_not_save" };

  await db.from("probes").insert({
    candidate_id: candidateId, trigger: "missing_field", target_id: req.experienceId,
    question: req.question, answer: req.answer, resulting_action: `saved:${req.step}`,
    source_type: "candidate_answer",
  });
  return { ok: true };
}

// Skip guard (AT-05): a skipped question is recorded as not answered, never as "no".
export async function skipStep(db: SupabaseClient, candidateId: string, experienceId: string, step: StepId, question: string) {
  const { data: exp } = await db.from("experiences").select("id").eq("id", experienceId).maybeSingle();
  if (!exp) return { ok: false as const, error: "not_found" as const };
  const { error } = await db.from("probes").insert({
    candidate_id: candidateId, trigger: "missing_field", target_id: experienceId,
    question, answer: null, resulting_action: `skipped:${step}`, source_type: "candidate_answer",
  });
  return error ? { ok: false as const, error: "could_not_save" as const } : { ok: true as const };
}
