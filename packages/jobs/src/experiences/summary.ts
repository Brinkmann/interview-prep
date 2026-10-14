import type { Band, Reason } from "@interview-prep/ai";
import { spanStart } from "./pipeline";

// Screen 2: experiences grouped by job with their latest rating. The headline counts
// are computed from exactly these ratings, so they always match what is stored (AT-04).
export interface ExperienceRow { id: string; job_label: string; original_text: string; source_span: string | null; rank_for_role: number | null }
export interface ScoreRow { experience_id: string; band: Band; reasons: Reason[]; created_at: string }

export interface Card { id: string; text: string; band: Band | null; reasons: Reason[]; rank: number | null }

export function summarise(experiences: ExperienceRow[], scores: ScoreRow[]) {
  const latest = new Map<string, ScoreRow>();
  for (const s of scores) {
    const seen = latest.get(s.experience_id);
    if (!seen || s.created_at > seen.created_at) latest.set(s.experience_id, s);
  }
  const groups: { job: string; cards: Card[] }[] = [];
  for (const e of [...experiences].sort((a, b) => spanStart(a.source_span) - spanStart(b.source_span))) {
    const s = latest.get(e.id);
    const card = { id: e.id, text: e.original_text, band: s?.band ?? null, reasons: s?.reasons ?? [], rank: e.rank_for_role };
    const group = groups.find((g) => g.job === e.job_label);
    if (group) group.cards.push(card);
    else groups.push({ job: e.job_label, cards: [card] });
  }
  const counts = { interview_ready: 0, needs_detail: 0, not_yet_a_story: 0 } satisfies Record<Band, number>;
  for (const s of latest.values()) counts[s.band]++;
  return { groups, counts, total: experiences.length, rated: latest.size };
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

// Approved Screen 2 headline wording (05-phase1-experience.md).
export function headline(counts: Record<Band, number>, total: number): string {
  if (!total) return "We couldn't find any experiences in your CV. Check that it lists what you did in each role, then upload it again.";
  return `We found ${plural(total, "experience", "experiences")} you could use in your interview. ` +
    `${counts.interview_ready} ${counts.interview_ready === 1 ? "is" : "are"} interview-ready, ` +
    `${counts.needs_detail} ${counts.needs_detail === 1 ? "needs" : "need"} more detail and ` +
    `${counts.not_yet_a_story} ${counts.not_yet_a_story === 1 ? "is not yet a story" : "are not yet stories"}. ` +
    "Interviewers can only score what you can prove when asked, so let's build up the ones that matter most for this role.";
}
