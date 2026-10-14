// Phase 1 scoring rules (06-phase0-1-build.md, Scoring rules), enforced in code so the
// model can only supply dimension scores, never the overall rating or band.
export const DIMENSIONS = ["outcome_evidence", "specificity", "ownership", "credibility", "action_reasoning"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const WEIGHTS: Record<Dimension, number> = {
  outcome_evidence: 0.3,
  specificity: 0.2,
  ownership: 0.2,
  credibility: 0.2,
  action_reasoning: 0.1,
};

export const REASONS = {
  no_result: "no result",
  says_we: "says 'we' not 'I'",
  no_timeframe: "no timeframe",
  no_baseline: "no starting point",
  no_measure: "not measured",
  duty_not_outcome: "a duty, not an outcome",
  unverified: "no one named who could confirm it",
  vague_claim: "too vague to score",
} as const;
export type Reason = keyof typeof REASONS;

export type Band = "interview_ready" | "needs_detail" | "not_yet_a_story";

export function overallScore(scores: Record<Dimension, number>): number {
  const weighted = DIMENSIONS.reduce((sum, d) => sum + scores[d] * WEIGHTS[d], 0);
  return Math.round(weighted);
}

export function bandFor(overall: number): Band {
  return overall >= 6 ? "interview_ready" : overall >= 4 ? "needs_detail" : "not_yet_a_story";
}

export const BAND_ORDER: Band[] = ["not_yet_a_story", "needs_detail", "interview_ready"];
export function bandDistance(a: Band, b: Band): number {
  return Math.abs(BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));
}
