import { describe, expect, it } from "vitest";
import { confirmAnswer, finishStory, MAX_QUESTIONS, openStory, proposeAnswer, skipQuestion, sprintItems, type Turn } from "../src/sprint/service";
import { fakeSupabase } from "./fake-supabase";

const CV_LINE = "Responsible for a team of 12 in the dispatch centre.";

function setup(questions: (string | null)[] = ["While you led the dispatch team, what improved because of how you ran it?"]) {
  const { client, tables } = fakeSupabase(new Map());
  tables.candidates!.push({ id: "c1", persona: null });
  tables.experiences!.push({ id: "x1", candidate_id: "c1", job_label: "Dispatch Lead", original_text: CV_LINE, rank_for_role: 1 });
  const seen: Parameters<Turn>[0][] = [];
  const turn: Turn = async (input, check) => {
    seen.push(input);
    const out = { draft: input.story ? null : { situation: "A 12-person dispatch team.", action: null, result: null }, question: questions.shift() ?? null };
    const rejected = check(out as never);
    if (rejected) throw new Error(rejected);
    return out;
  };
  const item = async () => (await sprintItems(client)).items[0]!;
  return { client, tables, turn, item, seen };
}

describe("building a story (AT-05)", () => {
  it("drafts the story from the CV line and asks one question written for it", async () => {
    const { client, tables, turn, item } = setup();
    expect(await openStory(client, "c1", await item(), { role: null, graduate: false }, turn))
      .toEqual({ question: "While you led the dispatch team, what improved because of how you ran it?" });
    expect(tables.evidence![0]).toMatchObject({ situation: "A 12-person dispatch team.", source_type: "cv" });
    expect(tables.probes![0]).toMatchObject({ resulting_action: "asked", answer: null });
    // Opening again returns the waiting question rather than asking another.
    expect((await openStory(client, "c1", await item(), { role: null, graduate: false }, turn)).question).toContain("dispatch team");
    expect(tables.probes).toHaveLength(1);
  });

  it("asks at most four questions per story, then marks it complete", async () => {
    const { client, tables, turn, item } = setup(["First?", "Second?", "Third?", "Fourth?", "Fifth?"]);
    for (let i = 0; i < MAX_QUESTIONS; i++) {
      await openStory(client, "c1", await item(), { role: null, graduate: false }, turn);
      await skipQuestion(client, await item());
    }
    expect(await openStory(client, "c1", await item(), { role: null, graduate: false }, turn)).toEqual({ question: null });
    expect(tables.probes).toHaveLength(4);
    expect(tables.evidence![0]!.complete).toBe(true);
  });

  it("stores a skipped question as not answered and passes it on so it is not asked again", async () => {
    const { client, tables, turn, item, seen } = setup(["First?", "Second?"]);
    await openStory(client, "c1", await item(), { role: null, graduate: false }, turn);
    await skipQuestion(client, await item());
    expect(tables.probes![0]).toMatchObject({ answer: null, resulting_action: "skipped" });
    await openStory(client, "c1", await item(), { role: null, graduate: false }, turn);
    expect(seen[1]!.history).toEqual([{ question: "First?", answer: null }]);
  });

  it("completes the story when the coach has nothing more to ask, or the candidate finishes", async () => {
    const { client, tables, turn, item } = setup([null]);
    expect(await openStory(client, "c1", await item(), { role: null, graduate: false }, turn)).toEqual({ question: null });
    expect(tables.evidence![0]!.complete).toBe(true);
    const other = setup(["First?"]);
    await openStory(other.client, "c1", await other.item(), { role: null, graduate: false }, other.turn);
    await finishStory(other.client, "c1", await other.item());
    expect(other.tables.evidence![0]!.complete).toBe(true);
    expect(other.tables.probes![0]!.resulting_action).toBe("skipped");
  });

  it("rejects a flattering question (tone guard)", async () => {
    const { client, turn, item } = setup(["Great work! What changed?"]);
    await expect(openStory(client, "c1", await item(), { role: null, graduate: false }, turn)).rejects.toThrow("flattering");
  });
});

describe("graduate framing (AT-07)", () => {
  it("tells the coach the candidate is a graduate", async () => {
    const { client, tables, turn, item, seen } = setup();
    tables.candidates![0]!.persona = "pe1";
    const { graduate } = await sprintItems(client);
    await openStory(client, "c1", await item(), { role: null, graduate }, turn);
    expect(seen[0]!.graduate).toBe(true);
  });
});

describe("number and estimate guards (AT-06)", () => {
  it("rejects a parsed story with a number the candidate never gave", async () => {
    const { client, turn, item } = setup();
    await openStory(client, "c1", await item(), { role: null, graduate: false }, turn);
    let rejected = 0;
    const replies = [
      { situation: null, action: null, result: "On-time dispatch rose from 85% to 99%.", numbers_labelled: "estimate" as const },
      { situation: null, action: null, result: "On-time dispatch rose from about 85% to about 96%.", numbers_labelled: "estimate" as const },
    ];
    const out = await proposeAnswer(await item(), "about 85% to about 96%, my estimate", async (_i, check) => {
      for (const r of replies) {
        if (check(r as never)) rejected++;
        else return r;
      }
      throw new Error("failed");
    });
    expect(rejected).toBe(1);
    expect(out).toMatchObject({ ok: true, needsLabel: true, suggestedLabel: "estimate" });
  });

  it("will not save a figure until it is labelled, and an estimate needs a basis", async () => {
    const { client, tables, turn, item } = setup();
    await openStory(client, "c1", await item(), { role: null, graduate: false }, turn);
    const req = {
      answer: "about 85% to about 96% over 18 months",
      story: { situation: "A 12-person dispatch team.", action: null, result: "On-time dispatch rose from about 85% to about 96% over 18 months." },
    };
    expect(await confirmAnswer(client, "c1", await item(), { ...req, isEstimate: null, basis: null })).toEqual({ ok: false, error: "label_numbers" });
    expect(await confirmAnswer(client, "c1", await item(), { ...req, isEstimate: true, basis: "" })).toEqual({ ok: false, error: "basis_required" });
    expect(await confirmAnswer(client, "c1", await item(), { ...req, isEstimate: true, basis: "monthly KPI reports" })).toEqual({ ok: true });
    expect(tables.evidence![0]).toMatchObject({ result: req.story.result, is_estimate: true, estimate_basis: "monthly KPI reports" });
    expect(tables.probes![0]).toMatchObject({ answer: req.answer, resulting_action: "saved" });
  });
});
