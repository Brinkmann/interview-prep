import { describe, expect, it } from "vitest";
import { estimateProblem, evidenceNote, nextStep, questionFor } from "../src/sprint/questions";
import { parseAnswer, saveAnswer, skipStep, type SprintItem } from "../src/sprint/service";
import { fakeSupabase } from "./fake-supabase";

const item: SprintItem = {
  id: "x1", job: "Dispatch Lead, Acme (2020 to 2023)", text: "Responsible for a team of 12 in the dispatch centre.",
  rank: 1, evidence: null, skipped: [], next: "change", question: "From what to what?",
};

describe("sprint order (AT-05)", () => {
  it("asks only missing fields, in the fixed order", () => {
    expect(nextStep(null, [])).toBe("outcome");
    expect(nextStep({ outcome: "On-time dispatch improved" }, [])).toBe("change");
    expect(nextStep({ outcome: "x", baseline: "85%", new_value: "96%", timeframe: "18 months" }, [])).toBe("measure");
    expect(nextStep({ outcome: "x", verifier: "My manager" }, [])).toBe("change");
  });

  it("passes over skipped questions without treating them as answered", () => {
    expect(nextStep({ outcome: "x" }, ["change"])).toBe("timeframe");
    expect(nextStep({ outcome: "x" }, ["change", "timeframe", "measure", "role", "verifier"])).toBeNull();
  });

  it("stores a skipped question as not answered", async () => {
    const { client, tables } = fakeSupabase(new Map());
    tables.experiences!.push({ id: "x1", candidate_id: "c1" });
    await skipStep(client, "c1", "x1", "change", "From what to what?");
    expect(tables.probes).toEqual([expect.objectContaining({ answer: null, resulting_action: "skipped:change", question: "From what to what?" })]);
    expect(tables.evidence).toHaveLength(0);
  });
});

describe("graduate framing (AT-07)", () => {
  it("frames questions around study, volunteer and part-time roles", () => {
    expect(questionFor("outcome", { graduate: true, job: "Club Treasurer, University Tramping Club", evidence: null }))
      .toBe("In your Club Treasurer role, what changed because you were there?");
    expect(questionFor("outcome", { graduate: false, job: "Dispatch Lead", evidence: null })).toBe("What changed because of this?");
  });
});

describe("number and estimate guards (AT-06)", () => {
  it("will not save a number until it is labelled, and an estimate needs a basis", async () => {
    expect(estimateProblem({ baseline: "about 85%" }, { isEstimate: null, basis: null })).toBe("label_numbers");
    expect(estimateProblem({ baseline: "about 85%" }, { isEstimate: true, basis: null })).toBe("basis_required");
    expect(estimateProblem({ baseline: "about 85%" }, { isEstimate: true, basis: "monthly KPI reports" })).toBeNull();
    expect(estimateProblem({ outcome: "fewer complaints" }, { isEstimate: null, basis: null })).toBeNull();

    const { client, tables } = fakeSupabase(new Map());
    tables.experiences!.push({ id: "x1", candidate_id: "c1" });
    const base = { experienceId: "x1", step: "change" as const, question: "From what to what?", answer: "about 85% to about 96%" };
    const fields = { baseline: "about 85%", new_value: "about 96%" };
    expect(await saveAnswer(client, "c1", { ...base, fields, isEstimate: null, basis: null })).toEqual({ ok: false, error: "label_numbers" });
    expect(await saveAnswer(client, "c1", { ...base, fields, isEstimate: true, basis: "" })).toEqual({ ok: false, error: "basis_required" });
    expect(tables.evidence).toHaveLength(0);
    expect(await saveAnswer(client, "c1", { ...base, fields, isEstimate: true, basis: "monthly KPI reports" })).toEqual({ ok: true });
    expect(tables.evidence![0]).toMatchObject({ baseline: "about 85%", is_estimate: true, estimate_basis: "monthly KPI reports" });
  });

  it("rejects a parsed answer containing a number the candidate never gave, then retries", async () => {
    const replies = [
      { baseline: "85%", new_value: "99%", numbers_labelled: "not_said" }, // 99 is invented
      { baseline: "about 85%", new_value: "about 96%", numbers_labelled: "estimate" },
    ];
    let rejected = 0;
    const out = await parseAnswer(async (_input, check) => {
      for (const r of replies) {
        if (check(r as never)) rejected++;
        else return r as never;
      }
      throw new Error("failed");
    }, item, "about 85% to about 96%");
    expect(rejected).toBe(1);
    expect(out).toMatchObject({ baseline: "about 85%", new_value: "about 96%" });
  });
});

describe("evidence note", () => {
  it("assembles the candidate's own words with the estimate label", () => {
    expect(evidenceNote(item.text, {
      personal_role: "Led a 12-person dispatch team", outcome: "on-time dispatch rose", baseline: "about 85%",
      new_value: "about 96%", timeframe: "18 months", is_estimate: true, estimate_basis: "monthly KPI reports",
    })).toBe("Led a 12-person dispatch team; on-time dispatch rose, from about 85% to about 96% over 18 months (estimate, based on monthly KPI reports)");
  });
});
