import { describe, expect, it } from "vitest";
import { answerExpectation, expectationQuestion, expectationVerdict } from "../src/expectations/answer";
import { buildForRole, titleGuess, type ExpectationDeps } from "../src/expectations/build";
import { fakeSupabase } from "./fake-supabase";

function setup() {
  const { client, tables } = fakeSupabase(new Map());
  tables.target_roles!.push({ id: "r1", candidate_id: "c1", job_ad_text: "Supply Chain Manager\nWe need someone to own carrier contracts and our WMS.", created_at: "2026-10-14T00:00:00Z" });
  tables.experiences!.push(
    { id: "x1", candidate_id: "c1", original_text: "Renegotiated carrier contracts.", rank_for_role: 1 },
    { id: "x2", candidate_id: "c1", original_text: "Led the dispatch team.", rank_for_role: 2 },
  );
  const deps: ExpectationDeps = {
    db: client,
    matchOccupations: async () => [{ id: "o1", title: "Logistics Managers", description: "", tasks: [], skills: [] }],
    build: async () => ({
      title: "Supply Chain Manager", occupation_index: 0,
      areas: [
        { area: "supplier and carrier management", source: "in_ad", matched_experience_index: 0 },
        { area: "systems, such as a WMS or ERP", source: "in_ad", matched_experience_index: null },
        { area: "inventory planning or forecasting", source: "typical", matched_experience_index: null },
        { area: "Inventory planning or forecasting.", source: "typical", matched_experience_index: null },
      ],
    }),
    modelId: "m", promptVersion: "build_expectations@1",
  };
  return { deps, tables, client };
}

describe("what this role expects (AT-08)", () => {
  it("labels each area in_ad or typical and starts every unmatched one as not found and unanswered", async () => {
    const { deps, tables } = setup();
    expect(await buildForRole(deps, "c1")).toMatchObject({ built: 3 });
    expect(tables.expectations!.map((e) => [e.area, e.source, e.status, e.answer ?? "unanswered"])).toEqual([
      ["supplier and carrier management", "in_ad", "found", "unanswered"],
      ["systems, such as a WMS or ERP", "in_ad", "not_found", "unanswered"],
      ["inventory planning or forecasting", "typical", "not_found", "unanswered"],
    ]);
    expect(tables.target_roles![0]!.title).toBe("Supply Chain Manager");
  });

  it("does not call an area typical without a reference occupation", async () => {
    const { deps, tables } = setup();
    deps.matchOccupations = async () => [];
    deps.build = async () => ({ title: "X", occupation_index: null, areas: [{ area: "budgets", source: "typical", matched_experience_index: null }] });
    await buildForRole(deps, "c1");
    expect(tables.expectations![0]!.source).toBe("in_ad");
  });

  it("yes or partly adds the example to the stories, no records a gap (D-38)", async () => {
    const { deps, tables, client } = setup();
    await buildForRole(deps, "c1");
    const [, wms, inventory] = tables.expectations!;
    for (const e of tables.expectations!) e.answer ??= "unanswered";

    expect(await answerExpectation(client, "c1", { expectationId: wms!.id as string, answer: "yes" })).toEqual({ ok: false, error: "example_required" });
    const yes = await answerExpectation(client, "c1", { expectationId: wms!.id as string, answer: "yes", example: "Ran the Manhattan WMS upgrade at two sites." });
    expect(yes.ok).toBe(true);
    const added = tables.experiences!.find((x) => x.source_type === "candidate_answer")!;
    expect(added).toMatchObject({ rank_for_role: 3, original_text: "Ran the Manhattan WMS upgrade at two sites." });
    expect(wms).toMatchObject({ answer: "yes", status: "found", matched_experience_id: added.id });

    await answerExpectation(client, "c1", { expectationId: inventory!.id as string, answer: "no" });
    expect(inventory).toMatchObject({ answer: "no", status: "not_found" });
    const gapProbe = tables.probes!.find((p) => p.target_id === inventory!.id)!;
    expect(gapProbe).toMatchObject({ trigger: "expectation", resulting_action: "gap_recorded" });
    expect(gapProbe.question).toBe("Supply Chain Manager roles usually involve inventory planning or forecasting. Have you done this?");

    const [supplier] = tables.expectations!;
    expect(await answerExpectation(client, "c1", { expectationId: supplier!.id as string, answer: "partly" })).toEqual({ ok: false, error: "example_required" });
    await answerExpectation(client, "c1", { expectationId: supplier!.id as string, answer: "partly", example: "Managed two carrier contracts as a stand-in." });
    expect(supplier).toMatchObject({ answer: "partly", status: "found" });
    expect(tables.experiences!.filter((x) => x.source_type === "candidate_answer")).toHaveLength(2);
  });

  it("is not rebuilt once the candidate has answered", async () => {
    const { deps, tables } = setup();
    await buildForRole(deps, "c1");
    tables.expectations![0]!.answer = "no";
    expect(await buildForRole(deps, "c1")).toMatchObject({ built: 0, reason: "answered" });
  });

  it("opens with a verdict (D-34)", () => {
    const rows = [
      { status: "found", answer: "unanswered" }, { status: "found", answer: "unanswered" },
      { status: "not_found", answer: "unanswered" }, { status: "not_found", answer: "no" },
    ];
    expect(expectationVerdict(rows)).toBe(
      "This role usually asks for 4 things. Your stories already show 2. Two we didn't find are below. If you've done them, tell us and we'll add them to your stories.",
    );
  });

  it("asks in the approved words", () => {
    expect(expectationQuestion({ area: "budget responsibility", source: "in_ad" }, "Supply Chain Manager"))
      .toBe("This role asks for budget responsibility. Have you done this?");
    expect(titleGuess("Senior Project Manager (Digital) – Wellington\nAbout us")).toContain("Senior Project Manager");
  });
});
