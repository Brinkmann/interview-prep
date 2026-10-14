import type { Band, Reason } from "@interview-prep/ai";
import { spanStart } from "./pipeline";

// Step 2, Your strongest material (D-30, D-31): the experiences chosen for this role,
// best first, with each one's latest rating and coaching lines. The headline counts are
// computed from exactly these cards, so they always match what is stored (AT-04).
export interface ExperienceRow { id: string; job_label: string; original_text: string; source_span: string | null; rank_for_role: number | null }
export interface ScoreRow {
  experience_id: string; band: Band; reasons: Reason[]; created_at: string;
  strength?: string | null; next_step?: string | null;
}

export interface Card {
  id: string; job: string; text: string; band: Band | null; rank: number | null;
  strength: string | null; nextStep: string | null;
}

// Candidate-facing labels (D-30). Stored band values are unchanged.
export const BAND_LABEL: Record<Band, string> = {
  interview_ready: "Ready to tell",
  needs_detail: "Almost there",
  not_yet_a_story: "Worth building",
};

export function latestScores(scores: ScoreRow[]): Map<string, ScoreRow> {
  const latest = new Map<string, ScoreRow>();
  for (const s of scores) {
    const seen = latest.get(s.experience_id);
    if (!seen || s.created_at > seen.created_at) latest.set(s.experience_id, s);
  }
  return latest;
}

export function strongestMaterial(experiences: ExperienceRow[], scores: ScoreRow[]) {
  const latest = latestScores(scores);
  const card = (e: ExperienceRow): Card => {
    const s = latest.get(e.id);
    return {
      id: e.id, job: e.job_label, text: e.original_text, band: s?.band ?? null, rank: e.rank_for_role,
      strength: s?.strength ?? null, nextStep: s?.next_step ?? null,
    };
  };
  const top = experiences.filter((e) => e.rank_for_role !== null)
    .sort((a, b) => a.rank_for_role! - b.rank_for_role!).map(card);
  const rest = experiences.filter((e) => e.rank_for_role === null)
    .sort((a, b) => spanStart(a.source_span) - spanStart(b.source_span)).map(card);
  const counts = { interview_ready: 0, needs_detail: 0, not_yet_a_story: 0 } satisfies Record<Band, number>;
  for (const c of top) if (c.band) counts[c.band]++;
  return { top, rest, counts, rated: top.filter((c) => c.band).length, total: experiences.length };
}

// Approved Step 2 headline (05-phase1-experience.md, revision 2).
export function headline(counts: Record<Band, number>, shown: number, role: string | null): string {
  if (!shown) return "We couldn't find experiences in your CV to work with. Check that it lists what you did in each role, then upload it again.";
  const roleText = role?.trim() ? `a ${role.trim()} role` : "this role";
  return `Here ${shown === 1 ? "is the experience" : `are the ${shown} experiences`} from your CV that best show what ${roleText} needs. ` +
    `${counts.interview_ready} ${counts.interview_ready === 1 ? "is" : "are"} ready to tell, ` +
    `${counts.needs_detail} ${counts.needs_detail === 1 ? "is" : "are"} almost there and ` +
    `${counts.not_yet_a_story} ${counts.not_yet_a_story === 1 ? "is" : "are"} worth building. ` +
    "In the next step we'll strengthen them, one at a time.";
}
