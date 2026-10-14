import type { SupabaseClient } from "@supabase/supabase-js";
import { flatters, numberGuard, numbersIn, type SprintTurnInput } from "@interview-prep/ai";
import { STORY_FIELDS, type Evidence, type Story } from "../experiences/rating";

// Step 3, Build your stories (D-32, D-33). The web app passes the candidate's own client,
// so every query here also runs under row-level security. Model calls are injected.

export const MAX_QUESTIONS = 4;

type Band = "interview_ready" | "needs_detail" | "not_yet_a_story";
interface Probe { id: string; target_id: string; question: string; answer: string | null; resulting_action: string | null; created_at: string }

export interface SprintItem {
  id: string; job: string; text: string; rank: number;
  evidence: Evidence | null; complete: boolean;
  pending: { id: string; question: string } | null;
  history: { question: string; answer: string | null }[];
  asked: number;
  band: Band | null; strength: string | null; nextStep: string | null;
}

export async function sprintItems(db: SupabaseClient): Promise<{ graduate: boolean; role: string | null; items: SprintItem[] }> {
  const [cand, role, exps, evs, probes, scores] = await Promise.all([
    db.from("candidates").select("persona").maybeSingle(),
    db.from("target_roles").select("title").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("experiences").select("id, job_label, original_text, rank_for_role").not("rank_for_role", "is", null).order("rank_for_role"),
    db.from("evidence").select("*"),
    db.from("probes").select("id, target_id, question, answer, resulting_action, created_at").eq("trigger", "missing_field").order("created_at"),
    db.from("scores").select("experience_id, band, strength, next_step, created_at").order("created_at"),
  ]);
  const items = (exps.data ?? []).map((e) => {
    const evidence = ((evs.data ?? []).find((v) => v.experience_id === e.id) ?? null) as Evidence | null;
    const mine = ((probes.data ?? []) as Probe[]).filter((p) => p.target_id === e.id);
    const pending = mine.find((p) => p.resulting_action === "asked");
    const latest = (scores.data ?? []).filter((s) => s.experience_id === e.id).at(-1);
    return {
      id: e.id, job: e.job_label, text: e.original_text, rank: e.rank_for_role!,
      evidence, complete: !!evidence?.complete,
      pending: pending ? { id: pending.id, question: pending.question } : null,
      history: mine.filter((p) => p.resulting_action !== "asked").map((p) => ({ question: p.question, answer: p.answer })),
      asked: mine.length,
      band: (latest?.band ?? null) as Band | null, strength: latest?.strength ?? null, nextStep: latest?.next_step ?? null,
    };
  });
  return { graduate: cand.data?.persona === "pe1", role: role.data?.title ?? null, items };
}

function storyOf(e: Evidence | null): Story | null {
  if (!e) return null;
  return { situation: e.situation ?? null, action: e.action ?? null, result: e.result ?? null };
}

// Everything the candidate has said for this story: the only allowed source of numbers.
function sources(item: SprintItem, extra: string[] = []): string[] {
  const s = storyOf(item.evidence);
  return [item.text, ...(s ? Object.values(s).filter(Boolean) as string[] : []), ...item.history.map((h) => h.answer ?? ""), ...extra];
}

async function saveEvidence(db: SupabaseClient, candidateId: string, item: SprintItem, patch: Record<string, unknown>) {
  return item.evidence
    ? db.from("evidence").update(patch).eq("experience_id", item.id)
    : db.from("evidence").insert({ candidate_id: candidateId, experience_id: item.id, source_type: "cv", ...patch });
}

export type Turn = (input: SprintTurnInput, check: (o: never) => string | null) =>
  Promise<{ draft: Story | null; question: string | null }>;

// The next question for this story, asking at most four (D-32). Returns null when the
// story is complete. A question already waiting is returned as it is.
export async function openStory(
  db: SupabaseClient, candidateId: string, item: SprintItem, ctx: { role: string | null; graduate: boolean }, turn: Turn,
): Promise<{ question: string | null }> {
  if (item.pending) return { question: item.pending.question };
  if (item.complete) return { question: null };
  if (item.asked >= MAX_QUESTIONS) {
    await saveEvidence(db, candidateId, item, { complete: true });
    return { question: null };
  }
  const numbers = numberGuard(sources(item), (o: { question: string | null; draft: Story | null }) =>
    [o.question ?? "", ...Object.values(o.draft ?? {}).map((v) => v ?? "")]);
  // Tone guard on every question shown to the candidate.
  const check = (o: never) => {
    const out = o as { question: string | null };
    return out.question && flatters(out.question) ? "flattering wording" : numbers(o);
  };
  const out = await turn({
    experience: item.text, job: item.job, role: ctx.role, story: storyOf(item.evidence),
    history: item.history, graduate: ctx.graduate,
  }, check);

  if (!item.evidence && out.draft) {
    const drafted = await saveEvidence(db, candidateId, item, { ...out.draft });
    if (drafted.error) throw new Error(`Could not save the story draft: ${drafted.error.code}`);
    item.evidence = { ...out.draft };
  }
  if (!out.question) {
    await saveEvidence(db, candidateId, item, { complete: true });
    return { question: null };
  }
  const asked = await db.from("probes").insert({
    candidate_id: candidateId, trigger: "missing_field", target_id: item.id, question: out.question,
    answer: null, resulting_action: "asked", source_type: "cv",
  });
  if (asked.error) throw new Error(`Could not save the question: ${asked.error.code}`);
  return { question: out.question };
}

export type Parse = (
  input: { experience: string; story: Story | null; question: string; answer: string },
  check: (o: never) => string | null,
) => Promise<Story & { numbers_labelled: "exact" | "estimate" | "not_said" }>;

// The candidate's answer folded into their story, for them to check (edit guard).
// A number the candidate never gave is rejected by the number guard (AT-06).
export async function proposeAnswer(item: SprintItem, answer: string, parse: Parse) {
  if (!item.pending) return { ok: false as const, error: "nothing_to_answer" as const };
  const check = numberGuard(sources(item, [answer]), (o: Story) => STORY_FIELDS.map((f) => o[f] ?? ""));
  const out = await parse({ experience: item.text, story: storyOf(item.evidence), question: item.pending.question, answer }, check as never);
  const story: Story = { situation: out.situation, action: out.action, result: out.result };
  const hasFigures = numbersIn(answer).length > 0;
  return {
    ok: true as const, story,
    // Estimate guard: a figure is labelled exact or estimate before it can be saved.
    needsLabel: hasFigures && item.evidence?.is_estimate == null,
    suggestedLabel: out.numbers_labelled,
  };
}

export type ConfirmError = "nothing_to_answer" | "label_numbers" | "basis_required" | "empty" | "could_not_save";

// Saves the story exactly as the candidate confirmed or edited it.
export async function confirmAnswer(
  db: SupabaseClient, candidateId: string, item: SprintItem,
  req: { answer: string; story: Story; isEstimate: boolean | null; basis: string | null },
): Promise<{ ok: true } | { ok: false; error: ConfirmError }> {
  if (!item.pending) return { ok: false, error: "nothing_to_answer" };
  const story = Object.fromEntries(STORY_FIELDS.map((f) => [f, req.story[f]?.trim() || null])) as Story;
  if (!Object.values(story).some(Boolean)) return { ok: false, error: "empty" };
  const isEstimate = req.isEstimate ?? item.evidence?.is_estimate ?? null;
  const basis = req.basis?.trim() || item.evidence?.estimate_basis || null;
  if (numbersIn(req.answer).length && isEstimate === null) return { ok: false, error: "label_numbers" };
  if (isEstimate && !basis) return { ok: false, error: "basis_required" };

  const saved = await saveEvidence(db, candidateId, item, {
    ...story, is_estimate: isEstimate, estimate_basis: isEstimate ? basis : item.evidence?.estimate_basis ?? null,
    source_type: "candidate_answer",
  });
  if (saved.error) return { ok: false, error: "could_not_save" };
  const answered = await db.from("probes").update({ answer: req.answer.trim().slice(0, 2000), resulting_action: "saved" })
    .eq("id", item.pending.id);
  if (answered.error) return { ok: false, error: "could_not_save" };
  return { ok: true };
}

// Skip guard (AT-05): a skipped question is recorded as not answered, never as "no".
export async function skipQuestion(db: SupabaseClient, item: SprintItem) {
  if (!item.pending) return { ok: false as const, error: "nothing_to_answer" as const };
  const { error } = await db.from("probes").update({ answer: null, resulting_action: "skipped" }).eq("id", item.pending.id);
  return error ? { ok: false as const, error: "could_not_save" as const } : { ok: true as const };
}

// "Finish for now" on one story: it stops asking and keeps what the candidate has.
export async function finishStory(db: SupabaseClient, candidateId: string, item: SprintItem) {
  if (item.pending) await db.from("probes").update({ resulting_action: "skipped" }).eq("id", item.pending.id);
  const { error } = await saveEvidence(db, candidateId, item, { complete: true });
  return error ? { ok: false as const, error: "could_not_save" as const } : { ok: true as const };
}
