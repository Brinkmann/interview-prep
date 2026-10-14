import { describe, expect, it } from "vitest";
import { answerClaim, checkClaimsFor, claimQuestion, overlaps, saysWe, type ClaimDeps } from "../src/claims/check";
import { fakeSupabase } from "./fake-supabase";

const now = new Date("2026-10-14T00:00:00Z");

describe("date overlaps (AT-09)", () => {
  it("always flags overlapping roles, and not a same-month handover or a year-only boundary", () => {
    const a = { label: "Warehouse Lead, Acme", start: "2019-03", end: "2021-08" };
    const b = { label: "Dispatch Manager, Bolt", start: "2021-03", end: "present" };
    expect(overlaps([a, b], now)).toEqual([[a, b]]);
    expect(overlaps([{ ...a, end: "2021-03" }, b], now)).toEqual([]);
    expect(overlaps([{ label: "A", start: "2018", end: "2021" }, { label: "B", start: "2021", end: "2023" }], now)).toEqual([]);
    expect(overlaps([{ label: "A", start: "2018", end: "2022" }, { label: "B", start: "2020", end: "2023" }], now)).toHaveLength(1);
    // Dates as a model may write them.
    expect(overlaps([{ label: "A", start: "June 2017", end: "August 2021" }, { label: "B", start: "Mar 2021", end: "Present" }], now)).toHaveLength(1);
    expect(overlaps([{ label: "A", start: "06/2017", end: "2021-8" }, { label: "B", start: "2021-03", end: "current" }], now)).toHaveLength(1);
  });
});

describe("claim checks (AT-09)", () => {
  function setup() {
    const { client, tables } = fakeSupabase(new Map());
    tables.cv_text!.push({ id: "cv1", candidate_id: "c1", redacted_text: "CV", created_at: "2026-10-14T00:00:00Z" });
    tables.experiences!.push(
      { id: "x1", candidate_id: "c1", source_type: "cv", original_text: "We rolled out a new WMS across three sites." },
      { id: "x2", candidate_id: "c1", source_type: "cv", original_text: "Cut transport costs by 70%." },
      { id: "x3", candidate_id: "c1", source_type: "cv", original_text: "Significantly improved warehouse efficiency." },
    );
    const deps: ClaimDeps = {
      db: client,
      jobDates: async () => [
        { label: "Warehouse Lead, Acme", start: "2019-03", end: "2021-08" },
        { label: "Dispatch Manager, Bolt", start: "2021-03", end: "present" },
      ],
      flag: async () => [
        { index: 1, type: "unlikely", figure_noun: "saving" },
        { index: 2, type: "vague", figure_noun: null },
        { index: 0, type: "vague", figure_noun: null }, // already an ownership check
      ],
      modelId: "m", promptVersion: "check_claims@1",
    };
    return { deps, tables, client };
  }

  it("flags each type with one question, and never changes the claim", async () => {
    const { deps, tables } = setup();
    const before = JSON.stringify(tables.experiences);
    expect(await checkClaimsFor(deps, "c1", now)).toEqual({ flagged: 4 });
    expect(tables.probes!.map((p) => [p.trigger, p.target_id, p.question])).toEqual([
      ["inconsistent", "cv1", "Warehouse Lead, Acme (Mar 2019 to Aug 2021) and Dispatch Manager, Bolt (Mar 2021 to present) overlap. Were these roles at the same time, or is one date wrong?"],
      ["ownership", "x1", "What was your personal part in this?"],
      ["unlikely", "x2", "That's an unusually large saving. How was it measured, and what made it possible?"],
      ["vague", "x3", "By how much, compared with what, and over what period?"],
    ]);
    expect(JSON.stringify(tables.experiences)).toBe(before);
    expect(tables.evidence).toHaveLength(0);
  });

  it("records an explanation without altering the figure", async () => {
    const { deps, tables, client } = setup();
    await checkClaimsFor(deps, "c1", now);
    const unlikely = tables.probes!.find((p) => p.trigger === "unlikely")!;
    expect(await answerClaim(client, "c1", { probeId: unlikely.id as string, answer: "Measured against the 2019 freight invoices.", corrected: false }))
      .toMatchObject({ ok: true, experienceId: "x2" });
    expect(unlikely).toMatchObject({ answer: "Measured against the 2019 freight invoices.", resulting_action: "explained" });
    expect(tables.experiences![1]!.original_text).toBe("Cut transport costs by 70%.");
  });

  it("keeps answered checks when checking again", async () => {
    const { deps, tables } = setup();
    await checkClaimsFor(deps, "c1", now);
    tables.probes![0]!.answer = "Both: a part-time contract alongside.";
    await checkClaimsFor(deps, "c1", now);
    expect(tables.probes!.filter((p) => p.trigger === "inconsistent")).toHaveLength(2);
    expect(tables.probes!.filter((p) => p.answer)).toHaveLength(1);
    expect(tables.probes).toHaveLength(5);
  });

  it("treats 'we' without 'I' as an ownership question, and keeps the tone neutral", () => {
    expect(saysWe("We rolled out a new WMS")).toBe(true);
    expect(saysWe("I led our rollout")).toBe(false);
    expect(claimQuestion("unlikely", { noun: "Amazing!!" })).toBe("That's an unusually large figure. How was it measured, and what made it possible?");
  });
});
