import { describe, expect, it } from "vitest";
import { beforeAfter, summaryText } from "../src/experiences/before-after";

describe("Screen 6 before and after (AT-11)", () => {
  it("compares each CV experience's first rating with every experience's latest", () => {
    const exps = [
      { id: "a", source_type: "cv" }, { id: "b", source_type: "cv" }, { id: "c", source_type: "cv" },
      { id: "d", source_type: "candidate_answer" },
    ];
    const s = (experience_id: string, band: "interview_ready" | "needs_detail" | "not_yet_a_story", t: string) =>
      ({ experience_id, band, reasons: [], created_at: `2026-10-14T0${t}:00:00Z` });
    const scores = [
      s("a", "not_yet_a_story", "1"), s("a", "needs_detail", "2"), s("a", "interview_ready", "3"),
      s("b", "needs_detail", "1"),
      s("c", "not_yet_a_story", "1"),
      s("d", "needs_detail", "4"),
    ];
    const r = beforeAfter(exps, scores);
    expect(r.before).toEqual({ interview_ready: 0, needs_detail: 1, not_yet_a_story: 2 });
    expect(r.now).toEqual({ interview_ready: 1, needs_detail: 2, not_yet_a_story: 1 });
    expect(r.movedUp).toBe(1);
    expect(summaryText(r.before, r.now, 2, 1)).toBe(
      "When you started: 0 interview-ready, 1 needing detail, 2 not yet stories. Now: 1 interview-ready, 2 needing detail, 1 not yet a story. " +
      "Two expected areas are still gaps and one question is open. Your interview evidence is ready for the next step: matching it to what this role needs.",
    );
  });
});
