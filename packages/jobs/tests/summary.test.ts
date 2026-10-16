import { describe, expect, it } from "vitest";
import { beforeAfter, summaryText } from "../src/experiences/before-after";

describe("Step 6 where you stand (AT-11)", () => {
  it("compares the same stories before and now, and reports added stories separately", () => {
    const stories = [
      { id: "a", text: "Cut picking errors by redesigning slotting.", source_type: "cv", rank_for_role: 1 },
      { id: "b", text: "Renegotiated carrier contracts.", source_type: "cv", rank_for_role: 2 },
      { id: "c", text: "Led the dispatch team.", source_type: "cv", rank_for_role: 3 },
      { id: "d", text: "Ran the stocktake process.", source_type: "candidate_answer", rank_for_role: 4 },
      { id: "e", text: "Not chosen for this role.", source_type: "cv", rank_for_role: null },
    ];
    const s = (experience_id: string, band: "interview_ready" | "needs_detail" | "not_yet_a_story", t: string) =>
      ({ experience_id, band, reasons: [], created_at: `2026-10-14T0${t}:00:00Z` });
    const scores = [
      s("a", "not_yet_a_story", "1"), s("a", "interview_ready", "3"),
      s("b", "needs_detail", "1"),
      s("c", "not_yet_a_story", "1"),
      s("d", "needs_detail", "4"),
      s("e", "not_yet_a_story", "1"),
    ];
    const r = beforeAfter(stories, scores);
    expect(r.before).toEqual({ interview_ready: 0, needs_detail: 1, not_yet_a_story: 2 });
    expect(r.now).toEqual({ interview_ready: 1, needs_detail: 1, not_yet_a_story: 1 });
    // Like with like: both counts cover the same three CV stories.
    expect(Object.values(r.before).reduce((a, b) => a + b)).toBe(Object.values(r.now).reduce((a, b) => a + b));
    expect(r.addedCount).toBe(1);
    expect(r.movedUp).toBe(1);
    expect(summaryText(r, { gaps: ["inventory planning"], questions: 1 })).toBe(
      "You have 1 story ready to tell and 1 almost there, up from 0 ready and 1 almost there when you started. " +
      "You also added one story of your own. " +
      "Your strongest for this role: \"Cut picking errors by redesigning slotting.\", \"Renegotiated carrier contracts.\", \"Ran the stocktake process.\". " +
      "Still open: inventory planning (you said you haven't done it); one question to come back to.",
    );
  });

  it("does not say 'up from' when nothing has moved", () => {
    const r = beforeAfter(
      [{ id: "a", text: "A.", source_type: "cv", rank_for_role: 1 }],
      [{ experience_id: "a", band: "needs_detail" as const, reasons: [], created_at: "2026-10-14T01:00:00Z" }],
    );
    expect(summaryText(r, { gaps: [], questions: 0 })).toBe(
      "You have 0 stories ready to tell and 1 almost there. None has moved up yet: answering a few questions in Build your stories is the quickest way to strengthen them. " +
      "Your strongest for this role: \"A.\".",
    );
  });
});
