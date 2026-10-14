import { bandFor, BAND_ORDER, DIMENSIONS, overallScore, type Band, type Dimension, type Reason } from "@interview-prep/ai";

// Evidence fields gathered in the sprint, in the fixed question order (06-phase0-1-build.md).
export const EVIDENCE_FIELDS = [
  "outcome", "baseline", "new_value", "timeframe", "estimate_basis", "personal_role", "team_role", "verifier",
] as const;
export type EvidenceField = (typeof EVIDENCE_FIELDS)[number];
export type Evidence = Partial<Record<EvidenceField, string | null>> & { is_estimate?: boolean | null };

// The evidence version is the number of evidence fields the candidate has supplied,
// so it rises only when a new field arrives.
export function evidenceVersion(evidence: Evidence | null | undefined): number {
  if (!evidence) return 0;
  return EVIDENCE_FIELDS.filter((f) => (evidence[f] ?? "").toString().trim()).length;
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

// Rating guard (AT-10): a higher band without a new evidence field is discarded.
// A lower or equal band is always kept: ratings are never inflated.
export function guardRating(previous: Rating | null, next: Rating): Rating | null {
  if (!previous) return next;
  const higher = BAND_ORDER.indexOf(next.band) > BAND_ORDER.indexOf(previous.band);
  if (higher && next.evidenceVersion <= previous.evidenceVersion) return null;
  return next;
}

export { DIMENSIONS };
