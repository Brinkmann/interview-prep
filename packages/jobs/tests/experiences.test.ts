import { describe, expect, it } from "vitest";
import type { Dimension, Reason } from "@interview-prep/ai";
import { extractFromCv, rankForRole, scoreOne, type ExperienceDeps } from "../src/experiences/pipeline";
import { guardRating, rate } from "../src/experiences/rating";
import { locate } from "../src/experiences/spans";
import { fakeSupabase } from "./fake-supabase";

const CV = [
  "Operations Manager, Acme Logistics (2019 to 2023)",
  "- Cut warehouse picking errors from 4% to 0.8% in 9 months by redesigning slotting.",
  "- Responsible for a team of 12 in the dispatch\n  centre.",
  "Date of birth: [removed 1]",
].join("\n");

const all = (n: number) => Object.fromEntries(["outcome_evidence", "specificity", "ownership", "credibility", "action_reasoning"].map((d) => [d, n])) as Record<Dimension, number>;

function setup(scoreAs: number[] = [2, 2, 2]) {
  const { client, tables } = fakeSupabase(new Map());
  tables.cv_text!.push({ id: "cv1", candidate_id: "c1", redacted_text: CV, created_at: "2026-10-14T00:00:00Z" });
  tables.target_roles!.push({ id: "r1", candidate_id: "c1", job_ad_text: "Supply Chain Manager", created_at: "2026-10-14T00:00:00Z" });
  tables.candidates!.push({ id: "c1", persona: undefined });
  const scored: string[] = [];
  const deps: ExperienceDeps = {
    db: client,
    extract: async () => ({
      graduate: false,
      experiences: [
        { job_label: "Operations Manager, Acme Logistics", text: "Cut warehouse picking errors from 4% to 0.8% in 9 months by redesigning slotting." },
        // Line break differs from the CV: still found.
        { job_label: "Operations Manager, Acme Logistics", text: "Responsible for a team of 12 in the dispatch centre." },
        // Not in the CV: dropped.
        { job_label: "Operations Manager, Acme Logistics", text: "Saved $2m by inventing a new process." },
      ],
    }),
    rank: async () => [{ index: 1 }, { index: 0 }, { index: 7 }],
    score: async (experience) => (scored.push(experience), { scores: all(scoreAs.shift() ?? 2), reasons: ["duty_not_outcome" as Reason], strength: null, next_step: "What changed while you led the team?" }),
    modelIds: { extract: "m-small", rank: "m-medium", score: "m-medium" },
    promptVersions: { extract: "extract_experiences@1", score: "score_experience@1" },
  };
  return { deps, tables, scored };
}

describe("experience extraction (AT-04)", () => {
  it("keeps only experiences found in the CV, each with its source span", async () => {
    const { deps, tables } = setup();
    const out = await extractFromCv(deps, "c1");
    expect(out.outcome).toBe("extracted");
    expect(tables.experiences).toHaveLength(2);
    for (const e of tables.experiences!) {
      const [, a, b] = /^\[(\d+),(\d+)\)$/.exec(e.source_span as string)!;
      expect(CV.slice(Number(a), Number(b))).toBe(e.original_text);
    }
    expect(JSON.stringify(tables.experiences)).not.toContain("$2m");
  });

  it("does not replace experiences once the candidate has added evidence", async () => {
    const { deps, tables } = setup();
    await extractFromCv(deps, "c1");
    tables.evidence!.push({ id: "e1", candidate_id: "c1", experience_id: tables.experiences![0]!.id });
    expect((await extractFromCv(deps, "c1")).outcome).toBe("kept");
  });

  it("ranks for the role, ignoring indexes that do not exist", async () => {
    const { deps, tables } = setup();
    await extractFromCv(deps, "c1");
    expect(await rankForRole(deps, "c1")).toMatchObject({ ranked: 2 });
    const ranks = tables.experiences!.map((e) => [e.original_text, e.rank_for_role]);
    expect(ranks.find(([t]) => (t as string).startsWith("Responsible"))![1]).toBe(1);
  });

  it("marks a graduate CV for graduate framing (PE-1)", async () => {
    const { deps, tables } = setup();
    deps.extract = async () => ({ graduate: true, experiences: [] });
    await extractFromCv(deps, "c1");
    expect(tables.candidates![0]!.persona).toBe("pe1");
  });
});

describe("rating guard (AT-10)", () => {
  it("never raises a band without a new evidence field", () => {
    const before = rate(all(3), [], 1);
    expect(guardRating(before, rate(all(6), [], 1))).toBeNull();
    expect(guardRating(before, rate(all(6), [], 2))?.band).toBe("interview_ready");
    expect(guardRating(before, rate(all(2), [], 1))?.band).toBe("not_yet_a_story");
  });

  it("scores only when evidence has changed, and computes the band in code", async () => {
    const { deps, tables, scored } = setup([2, 5]);
    await extractFromCv(deps, "c1");
    const id = tables.experiences![1]!.id as string;
    expect(await scoreOne(deps, "c1", id)).toEqual({ outcome: "scored", band: "not_yet_a_story" });
    expect(await scoreOne(deps, "c1", id)).toEqual({ outcome: "unchanged" });
    tables.evidence!.push({ id: "e1", candidate_id: "c1", experience_id: id, result: "On-time dispatch improved" });
    // The rating only moves once the candidate confirms an answer.
    expect(await scoreOne(deps, "c1", id)).toEqual({ outcome: "unchanged" });
    tables.probes!.push({ id: "p1", candidate_id: "c1", target_id: id, trigger: "missing_field", resulting_action: "saved" });
    expect(await scoreOne(deps, "c1", id)).toEqual({ outcome: "scored", band: "needs_detail" });
    expect(scored).toHaveLength(2);
    expect(tables.scores!.map((s) => s.evidence_version)).toEqual([0, 1]);
    expect(tables.scores![0]!.next_step).toBe("What changed while you led the team?");
  });
});

describe("locate", () => {
  it("finds exact and whitespace-tolerant matches, and nothing else", () => {
    expect(locate("a b\n c", "b c")).toEqual([2, 6]);
    expect(locate("abc", "xyz")).toBeNull();
  });
});

describe("Step 2 strongest material (AT-04)", async () => {
  const { strongestMaterial, headline } = await import("../src/experiences/summary");
  it("leads with the ranked experiences, counts their latest ratings, and keeps the rest collapsed", () => {
    const exps = [
      { id: "a", job_label: "Ops", original_text: "A", source_span: "[50,60)", rank_for_role: 2 },
      { id: "b", job_label: "Ops", original_text: "B", source_span: "[5,10)", rank_for_role: 1 },
      { id: "c", job_label: "Clerk", original_text: "C", source_span: "[100,110)", rank_for_role: null },
    ];
    const scores = [
      { experience_id: "a", band: "not_yet_a_story" as const, reasons: [], created_at: "2026-10-14T01:00:00Z" },
      { experience_id: "a", band: "needs_detail" as const, reasons: [], created_at: "2026-10-14T02:00:00Z", next_step: "Roughly how much?" },
      { experience_id: "b", band: "interview_ready" as const, reasons: [], created_at: "2026-10-14T01:00:00Z" },
      { experience_id: "c", band: "not_yet_a_story" as const, reasons: [], created_at: "2026-10-14T01:00:00Z" },
    ];
    const s = strongestMaterial(exps, scores);
    expect(s.top.map((c) => c.id)).toEqual(["b", "a"]);
    expect(s.rest.map((c) => c.id)).toEqual(["c"]);
    expect(s.top[1]!.nextStep).toBe("Roughly how much?");
    expect(s.counts).toEqual({ interview_ready: 1, needs_detail: 1, not_yet_a_story: 0 });
    for (const band of ["interview_ready", "needs_detail", "not_yet_a_story"] as const) {
      expect(s.top.filter((c) => c.band === band)).toHaveLength(s.counts[band]);
    }
    expect(headline({ interview_ready: 2, needs_detail: 4, not_yet_a_story: 3 }, 9, "Supply Chain Manager")).toBe(
      "Here are the 9 experiences from your CV that best show what a Supply Chain Manager role needs. " +
      "2 are ready to tell, 4 are almost there and 3 are worth building. In the next step we'll strengthen them, one at a time.",
    );
  });
});
