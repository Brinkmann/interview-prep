// Phase 1 smoke run: every new AI task once, on a synthetic CV (the worked example),
// against the real models. Checks schemas, integrity guards and wiring, and prices the run.
// Prints pass or fail per check and counts only.
import { numberGuard, runTask, type TaskName } from "@interview-prep/ai";
import { locate, overlaps, parseAnswer, type SprintItem } from "@interview-prep/jobs";
import { ledger } from "./ledger";

const CV = `Alex Example
Supply chain and logistics professional with eight years in operations.

Operations Manager, Harbour Freight Ltd, Auckland (March 2021 to present)
- Cut warehouse picking errors from 4% to 0.8% in 9 months by redesigning slotting.
- Reduced freight costs significantly by renegotiating carrier contracts.
- Responsible for a team of 12 in the dispatch centre.
- We rolled out a new WMS across three sites.

Warehouse Team Leader, Southern Distribution, Christchurch (June 2017 to August 2021)
- Cut transport costs by 70% in one year.
- Significantly improved warehouse efficiency.
- Trained new starters on safe forklift operation.`;

const AD = `Supply Chain Manager
We are looking for a Supply Chain Manager to lead supplier and carrier relationships, own inventory planning and
forecasting, manage a budget of $4m and lead teams through change. Experience with WMS or ERP systems is essential.
Apply by 30 November with your CV and cover letter.`;

const book = ledger();
const ctx = (check?: (o: never) => string | null) => ({ candidateId: null, job: "eval.smoke", recordRun: book.recordRun, check });
const results: { check: string; pass: boolean }[] = [];
const expect = (check: string, pass: boolean) => results.push({ check, pass });
async function attempt<T>(task: TaskName, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    expect(`${task} returned valid output`, false);
    console.error(`${task}: ${(err as Error).message}`);
    return null;
  }
}

const found = await attempt("extract_experiences", () => runTask("extract_experiences", { cvText: CV }, ctx()));
const exps = (found?.experiences ?? []).filter((e) => locate(CV, e.text));
if (found) {
  expect("extract_experiences finds at least 6 of the 7 experiences", exps.length >= 6);
  expect("every extracted experience is found in the CV (AT-04)", exps.length === found.experiences.length);
  expect("an experienced CV is not marked graduate", found.graduate === false);
}

if (exps.length) {
  const ranked = await attempt("rank_for_role", () => runTask("rank_for_role", { jobAd: AD, experiences: exps.map((e) => ({ job: e.job_label, text: e.text })) }, ctx()));
  if (ranked) expect("rank_for_role ranks valid experiences", ranked.ranked.length > 0 && ranked.ranked.every((r) => r.index < exps.length));

  const built = await attempt("build_expectations", () => runTask("build_expectations", {
    jobAd: AD,
    occupations: [{ title: "Logistics Managers", description: "Plan, direct, or coordinate purchasing, warehousing, distribution, forecasting, customer service, or planning services.", tasks: ["Plan, develop, or implement warehouse safety and security programs."], skills: ["Coordination", "Management of Financial Resources"] }],
    experiences: exps.map((e) => e.text),
  }, ctx()));
  if (built) {
    expect("build_expectations gives 5 to 10 areas", built.areas.length >= 5 && built.areas.length <= 10);
    expect("build_expectations labels areas from the ad as in_ad (AT-08)", built.areas.some((a) => a.source === "in_ad"));
  }

  const flags = await attempt("check_claims", () => runTask("check_claims", { experiences: exps.map((e) => e.text) }, ctx()));
  if (flags) {
    const flaggedText = (type: string) => flags.flags.filter((f) => f.type === type).map((f) => exps[f.index]?.text ?? "");
    expect("check_claims flags the 70% cut as unlikely", flaggedText("unlikely").some((t) => t.includes("70%")));
    expect("check_claims flags 'significantly improved' as vague", flaggedText("vague").some((t) => /significantly/i.test(t)));
  }
}

const dates = await attempt("claims_job_dates", () => runTask("claims_job_dates", { cvText: CV }, ctx()));
if (dates) expect("the March to August 2021 overlap is flagged by rule (AT-09)", overlaps(dates.jobs).length === 1);

const item: SprintItem = {
  id: "x", job: "Operations Manager", text: "Responsible for a team of 12 in the dispatch centre.", rank: 1,
  evidence: { outcome: "On-time dispatch improved" }, skipped: [], next: "change", question: "From what to what?",
};
const parsed = await attempt("parse_sprint_answer", () => parseAnswer(
  (input, check) => runTask("parse_sprint_answer", input, ctx(check)), item, "about 85% to about 96%, that's my estimate"));
if (parsed) {
  expect("parse_sprint_answer keeps the candidate's figures", /85/.test(parsed.baseline ?? "") && /96/.test(parsed.new_value ?? ""));
  expect("parse_sprint_answer notices the figures are an estimate", parsed.numbers_labelled === "estimate");
  const guard = numberGuard(["about 85% to about 96%"], (o: { v: string }) => [o.v]);
  expect("the number guard rejects an invented number (AT-06)", guard({ v: "from 85% to 99%" } as never) !== null);
}

const scored = await attempt("score_experience", () => runTask("score_experience", { experience: item.text }, ctx()));
if (scored) expect("score_experience rates a duty low", Object.values(scored.scores).reduce((a, b) => a + b, 0) / 5 < 4);

const { byTask, totalCost } = book.summary();
console.log(JSON.stringify({ results, byTask, totalCostUsd: Number(totalCost.toFixed(4)) }, null, 2));
const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `FAIL: ${failed.length} of ${results.length} checks failed` : `PASS: all ${results.length} checks`);
process.exit(failed.length ? 1 : 0);
