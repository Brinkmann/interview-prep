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

// What each label means, shown on every card (D-38).
export const BAND_MEANING: Record<Band, string> = {
  interview_ready: "The result, your part and how you know are all there. It will hold up to follow-up questions.",
  needs_detail: "A real result. One detail an interviewer will ask for is still missing.",
  not_yet_a_story: "Describes the job more than what changed because of you. That is the story to build.",
};

const ORDER: Band[] = ["interview_ready", "needs_detail", "not_yet_a_story"];
const PHRASE: Record<Band, string> = { interview_ready: "ready to tell", needs_detail: "almost there", not_yet_a_story: "worth building" };

// Step 2 headline (05-phase1-experience.md, revision 2; D-38: only labels that apply are named).
export function headline(counts: Record<Band, number>, shown: number, role: string | null): string {
  if (!shown) return "We couldn't find experiences in your CV to work with. Check that it lists what you did in each role, then upload it again.";
  const roleText = role?.trim() ? `a ${role.trim()} role` : "this role";
  if (shown === 1) {
    const band = ORDER.find((b) => counts[b]);
    return `Here is the experience from your CV that best shows what ${roleText} needs` +
      (band ? `. It is ${PHRASE[band]}.` : ".") + " In the next step we'll strengthen it.";
  }
  const parts = ORDER.filter((b) => counts[b]).map((b) => `${counts[b]} ${PHRASE[b]}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `Here are the ${shown} experiences from your CV that best show what ${roleText} needs` +
    (list ? `: ${list}.` : ".") + " In the next step we'll strengthen them, one at a time.";
}
