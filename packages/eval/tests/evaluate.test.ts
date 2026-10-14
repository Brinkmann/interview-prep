import { describe, expect, it } from "vitest";
import { evaluate, plan } from "../src/experience-set";

describe("calibration thresholds", () => {
  it("passes at 85% exact band match with nothing more than one band off", () => {
    const r = [...Array(17).fill({ target: "needs_detail", actual: "needs_detail" }), ...Array(3).fill({ target: "needs_detail", actual: "interview_ready" })];
    expect(evaluate(r).passed).toBe(true);
  });

  it("fails below 85%", () => {
    const r = [...Array(16).fill({ target: "needs_detail", actual: "needs_detail" }), ...Array(4).fill({ target: "needs_detail", actual: "interview_ready" })];
    expect(evaluate(r).passed).toBe(false);
  });

  it("fails if any statement is two bands off, however good the rest", () => {
    const r = [...Array(99).fill({ target: "interview_ready", actual: "interview_ready" }), { target: "interview_ready", actual: "not_yet_a_story" }];
    expect(evaluate(r).passed).toBe(false);
  });
});

describe("set plan", () => {
  it("spreads 150 statements evenly across bands, all five personas and at least 10 industries", () => {
    const p = plan(150);
    for (const band of ["interview_ready", "needs_detail", "not_yet_a_story"]) expect(p.filter((s) => s.band === band)).toHaveLength(50);
    expect(new Set(p.map((s) => s.persona)).size).toBe(5);
    expect(new Set(p.map((s) => s.industry)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(p.map((s) => s.id)).size).toBe(150);
  });
});
