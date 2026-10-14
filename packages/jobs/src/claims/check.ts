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

export function overlaps(jobs: Job[], now = new Date()): [Job, Job][] {
  // A missing end date counts as "present" only for the most recently started role.
  const starts = jobs.map((j) => toMonth(j.start, "start", now) ?? -1);
  const latest = Math.max(...starts);
  const spans = jobs.map((j, i) => ({
    j, s: toMonth(j.start, "start", now),
    e: toMonth(j.end ?? (starts[i] === latest && latest >= 0 ? "present" : null), "end", now),
  }))
    .filter((x): x is { j: Job; s: number; e: number } => x.s !== null && x.e !== null && x.e >= x.s);
  const out: [Job, Job][] = [];
  for (let a = 0; a < spans.length; a++) {
    for (let b = a + 1; b < spans.length; b++) {
      const A = spans[a]!, B = spans[b]!;
      if (Math.min(A.e, B.e) - Math.max(A.s, B.s) > 0) out.push([A.j, B.j]);
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

// Approved question wording (05-phase1-experience.md), by template (tone guard).
export function claimQuestion(type: ClaimType, detail?: { noun?: string | null; jobs?: [Job, Job] }): string {
  switch (type) {
    case "vague":
      return "By how much, compared with what, and over what period?";
    case "ownership":
      return "What was your personal part in this?";
    case "unlikely": {
      const noun = detail?.noun?.trim().toLowerCase();
      const word = noun && /^[a-z]{3,20}$/.test(noun) ? noun : "figure";
      return `That's an unusually large ${word}. How was it measured, and what made it possible?`;
    }
    case "inconsistent": {
      const [a, b] = detail!.jobs!;
      return `${a.label} (${showDate(a.start)} to ${showDate(a.end)}) and ${b.label} (${showDate(b.start)} to ${showDate(b.end)}) overlap. ` +
        "Were these roles at the same time, or is one date wrong?";
    }
  }
}

export interface ClaimDeps {
  db: SupabaseClient;
  jobDates: (cvText: string) => Promise<Job[]>;
  flag: (experiences: string[]) => Promise<{ index: number; type: "vague" | "unlikely"; figure_noun: string | null }[]>;
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

  for (const pair of overlaps(await deps.jobDates(cv.data.redacted_text), now)) {
    rows.push({ ...base, trigger: "inconsistent", target_id: cv.data.id, question: claimQuestion("inconsistent", { jobs: pair }), source_type: "cv" });
  }
  const flagged = new Set<number>();
  for (const [i, e] of list.entries()) {
    if (saysWe(e.original_text)) {
      flagged.add(i);
      rows.push({ ...base, trigger: "ownership", target_id: e.id, question: claimQuestion("ownership"), source_type: "cv" });
    }
  }
  for (const f of list.length ? await deps.flag(list.map((e) => e.original_text)) : []) {
    const e = list[f.index];
    if (!e || flagged.has(f.index)) continue;
    flagged.add(f.index);
    rows.push({ ...base, trigger: f.type, target_id: e.id, question: claimQuestion(f.type, { noun: f.figure_noun }), source_type: "cv" });
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
  db: SupabaseClient, candidateId: string, req: { probeId: string; answer: string; corrected: boolean },
) {
  const answer = req.answer.trim().slice(0, 2000);
  if (!answer) return { ok: false as const, error: "empty" as const };
  const { data: probe } = await db.from("probes").select("id, trigger, target_id")
    .eq("id", req.probeId).in("trigger", ["vague", "inconsistent", "unlikely", "ownership"]).maybeSingle();
  if (!probe) return { ok: false as const, error: "not_found" as const };
  const updated = await db.from("probes").update({ answer, resulting_action: req.corrected ? "candidate_corrected" : "explained" }).eq("id", probe.id);
  if (updated.error) return { ok: false as const, error: "could_not_save" as const };
  return { ok: true as const, trigger: probe.trigger as ClaimType, experienceId: probe.trigger === "inconsistent" ? null : probe.target_id as string };
}
