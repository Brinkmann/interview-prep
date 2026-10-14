import type { SupabaseClient } from "@supabase/supabase-js";

// claims.check (Screen 5, AT-09). Date overlaps are always found by rule; "we" claims always
// get an ownership question by rule; vague and unlikely claims come from the model.
// Nothing here changes the candidate's text: each flag is a question only.

export type ClaimType = "vague" | "inconsistent" | "unlikely" | "ownership";
export interface Job { label: string; start: string | null; end: string | null }

// Months since year 0.
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Accepts "2021-03", "2021-3", "March 2021", "Mar 2021", "03/2021", "2021" and "present".
export function toMonth(value: string | null, edge: "start" | "end", now: Date): number | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (/^(present|current|now|to date|ongoing)$/.test(v)) return now.getFullYear() * 12 + now.getMonth();
  let m = /^(\d{4})[-/.](\d{1,2})$/.exec(v);
  if (m) return Number(m[1]) * 12 + Number(m[2]) - 1;
  m = /^(\d{1,2})[-/.](\d{4})$/.exec(v);
  if (m) return Number(m[2]) * 12 + Number(m[1]) - 1;
  m = /^([a-z]+)\.?,?\s+(\d{4})$/.exec(v);
  if (m) {
    const month = MONTH_NAMES.indexOf(m[1]!.slice(0, 3));
    if (month >= 0) return Number(m[2]) * 12 + month;
  }
  m = /^(\d{4})$/.exec(v);
  // A year alone is read narrowly (start in December, end in January), so only clear overlaps are flagged.
  if (m) return Number(m[1]) * 12 + (edge === "start" ? 11 : 0);
  return null;
}

function overlapRange(a: Job, b: Job, now: Date): [number, number] | null {
  const pair = overlapSpans([a, b], now);
  return pair.length ? pair[0]!.range : null;
}

export function overlaps(jobs: Job[], now = new Date()): [Job, Job][] {
  return overlapSpans(jobs, now).map((o) => o.jobs);
}

function overlapSpans(jobs: Job[], now: Date): { jobs: [Job, Job]; range: [number, number] }[] {
  // A missing end date counts as "present" only for the most recently started role.
  const starts = jobs.map((j) => toMonth(j.start, "start", now) ?? -1);
  const latest = Math.max(...starts);
  const spans = jobs.map((j, i) => ({
    j, s: toMonth(j.start, "start", now),
    e: toMonth(j.end ?? (starts[i] === latest && latest >= 0 ? "present" : null), "end", now),
  }))
    .filter((x): x is { j: Job; s: number; e: number } => x.s !== null && x.e !== null && x.e >= x.s);
  const out: { jobs: [Job, Job]; range: [number, number] }[] = [];
  for (let a = 0; a < spans.length; a++) {
    for (let b = a + 1; b < spans.length; b++) {
      const A = spans[a]!, B = spans[b]!;
      const start = Math.max(A.s, B.s);
      const end = Math.min(A.e, B.e);
      if (end - start > 0) out.push({ jobs: [A.j, B.j], range: [start, end] });
    }
  }
  return out;
}

export function saysWe(text: string): boolean {
  return /\b(we|our|us)\b/i.test(text) && !/\bI\b/.test(text);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function showDate(v: string | null): string {
  if (!v) return "?";
  if (/^(present|current|now|to date|ongoing)$/i.test(v.trim())) return "present";
  const m = /^(\d{4})-(\d{1,2})$/.exec(v.trim());
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : v;
}

function fromMonth(m: number): string {
  return `${MONTHS[m % 12]} ${Math.floor(m / 12)}`;
}

// The date question is built by rule from the dates (AT-09); the others are written by
// the model for each claim (D-35). The ownership fallback keeps AT-09 when the model omits one.
export function datesQuestion(a: Job, b: Job, now = new Date()): string {
  const range = overlapRange(a, b, now);
  const when = range ? ` from ${fromMonth(range[0])} to ${fromMonth(range[1])}` : "";
  return `Your roles at ${a.label} and ${b.label} overlap${when}. Did you hold both at once, or is one date out?`;
}

export const OWNERSHIP_FALLBACK = "What was your own part in this?";

export interface ClaimDeps {
  db: SupabaseClient;
  jobDates: (cvText: string) => Promise<Job[]>;
  // Questions come back already checked by the tone and number guards.
  flag: (experiences: string[], ownership: number[]) => Promise<{ index: number; type: "vague" | "unlikely" | "ownership"; question: string }[]>;
  modelId: string; promptVersion: string;
}

export async function checkClaimsFor(deps: ClaimDeps, candidateId: string, now = new Date()) {
  const { db } = deps;
  const cv = await db.from("cv_text").select("id, redacted_text").eq("candidate_id", candidateId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (cv.error) throw new Error(`Could not read CV text: ${cv.error.code}`);
  if (!cv.data) return { flagged: 0 };
  const exps = await db.from("experiences").select("id, original_text").eq("candidate_id", candidateId).eq("source_type", "cv");
  if (exps.error) throw new Error(`Could not read experiences: ${exps.error.code}`);
  const list = exps.data as { id: string; original_text: string }[];

  const rows: Record<string, unknown>[] = [];
  const base = { candidate_id: candidateId, answer: null, resulting_action: null, model_id: deps.modelId, prompt_version: deps.promptVersion };

  for (const [a, b] of overlaps(await deps.jobDates(cv.data.redacted_text), now)) {
    rows.push({ ...base, trigger: "inconsistent", target_id: cv.data.id, question: datesQuestion(a, b, now), source_type: "cv" });
  }
  // "We" without "I" always gets an ownership question (AT-09).
  const ownership = list.flatMap((e, i) => (saysWe(e.original_text) ? [i] : []));
  const flags = list.length ? await deps.flag(list.map((e) => e.original_text), ownership) : [];
  const flagged = new Set<number>();
  for (const i of ownership) {
    const written = flags.find((f) => f.index === i && f.type === "ownership");
    flagged.add(i);
    rows.push({ ...base, trigger: "ownership", target_id: list[i]!.id, question: written?.question ?? OWNERSHIP_FALLBACK, source_type: "cv" });
  }
  for (const f of flags) {
    const e = list[f.index];
    if (!e || flagged.has(f.index)) continue;
    flagged.add(f.index);
    rows.push({ ...base, trigger: f.type, target_id: e.id, question: f.question, source_type: "cv" });
  }

  // Unanswered checks are replaced; answered ones are the candidate's and stay.
  for (const trigger of ["vague", "inconsistent", "unlikely", "ownership"]) {
    const cleared = await db.from("probes").delete().eq("candidate_id", candidateId).eq("trigger", trigger).is("answer", null);
    if (cleared.error) throw new Error(`Could not clear claim checks: ${cleared.error.code}`);
  }
  if (rows.length) {
    const saved = await db.from("probes").insert(rows);
    if (saved.error) throw new Error(`Could not save claim checks: ${saved.error.code}`);
  }
  return { flagged: rows.length };
}

// The candidate's reply: an explanation, or their own corrected wording. The app never
// edits the claim itself (AT-09); a correction is kept as the candidate's evidence.
export async function answerClaim(
  db: SupabaseClient, candidateId: string, req: { probeId: string; answer: string; corrected: boolean; fine?: boolean },
) {
  // "This is fine as it is" (D-35) is the candidate's answer too.
  const answer = req.fine ? "This is fine as it is." : req.answer.trim().slice(0, 2000);
  if (!answer) return { ok: false as const, error: "empty" as const };
  const { data: probe } = await db.from("probes").select("id, trigger, target_id")
    .eq("id", req.probeId).in("trigger", ["vague", "inconsistent", "unlikely", "ownership"]).maybeSingle();
  if (!probe) return { ok: false as const, error: "not_found" as const };
  const updated = await db.from("probes").update({ answer, resulting_action: req.fine ? "confirmed_fine" : req.corrected ? "candidate_corrected" : "explained" }).eq("id", probe.id);
  if (updated.error) return { ok: false as const, error: "could_not_save" as const };
  return { ok: true as const, trigger: probe.trigger as ClaimType, experienceId: probe.trigger === "inconsistent" ? null : probe.target_id as string };
}
