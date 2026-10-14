import { describe, expect, it } from "vitest";
import { bandDistance, bandFor, overallScore } from "../src/scoring";

describe("Phase 1 scoring rules", () => {
  it("weights outcome 30%, specificity, ownership and credibility 20% each, reasoning 10%", () => {
    expect(overallScore({ outcome_evidence: 7, specificity: 1, ownership: 1, credibility: 1, action_reasoning: 1 })).toBe(3);
    expect(overallScore({ outcome_evidence: 6, specificity: 6, ownership: 6, credibility: 6, action_reasoning: 1 })).toBe(6);
  });

  it("maps 6-7 to Interview-ready, 4-5 to Needs detail, 1-3 to Not yet a story", () => {
    expect([7, 6, 5, 4, 3, 1].map(bandFor)).toEqual([
      "interview_ready", "interview_ready", "needs_detail", "needs_detail", "not_yet_a_story", "not_yet_a_story",
    ]);
  });

  it("measures how many bands apart two ratings are", () => {
    expect(bandDistance("interview_ready", "not_yet_a_story")).toBe(2);
    expect(bandDistance("needs_detail", "needs_detail")).toBe(0);
  });
});
