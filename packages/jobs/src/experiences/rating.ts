import { bandFor, BAND_ORDER, DIMENSIONS, overallScore, type Band, type Dimension, type Reason } from "@interview-prep/ai";

// The story the candidate builds in Step 3 (D-33), in Situation, Action and Result form,
// plus the estimate label (estimate guard).
export const STORY_FIELDS = ["situation", "action", "result"] as const;
export type StoryField = (typeof STORY_FIELDS)[number];
export type Story = Record<StoryField, string | null>;
export type Evidence = Partial<Story> & { is_estimate?: boolean | null; estimate_basis?: string | null; complete?: boolean | null };

// What the scorer sees: the story and its estimate label, nothing else from the row.
export function storyForScoring(evidence: Evidence | null): Record<string, string> | undefined {
  if (!evidence) return undefined;
  const out: Record<string, string> = {};
  for (const f of STORY_FIELDS) if (evidence[f]?.trim()) out[f] = evidence[f]!.trim();
  if (evidence.is_estimate && evidence.estimate_basis) out.figures = `estimate, based on ${evidence.estimate_basis}`;
  else if (evidence.is_estimate === false) out.figures = "exact";
  return Object.keys(out).length ? out : undefined;
}

export interface Rating {
  scores: Record<Dimension, number>;
  overall: number;
  band: Band;
  reasons: Reason[];
  evidenceVersion: number;
}

export function rate(scores: Record<Dimension, number>, reasons: Reason[], version: number): Rating {
  const overall = overallScore(scores);
  return { scores, overall, band: bandFor(overall), reasons: [...new Set(reasons)], evidenceVersion: version };
}

// Rating guard (AT-10): the evidence version counts the answers the candidate has
// confirmed, so it rises only with something new from them. A higher band without
// a new answer is discarded.
// A lower or equal band is always kept: ratings are never inflated.
export function guardRating(previous: Rating | null, next: Rating): Rating | null {
  if (!previous) return next;
  const higher = BAND_ORDER.indexOf(next.band) > BAND_ORDER.indexOf(previous.band);
  if (higher && next.evidenceVersion <= previous.evidenceVersion) return null;
  return next;
}

export { DIMENSIONS };
