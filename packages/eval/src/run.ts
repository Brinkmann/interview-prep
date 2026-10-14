// Calibration run: scores every statement in the set with the product task and checks
// the thresholds. Exits non-zero on failure so CI blocks the release.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { bandFor, overallScore, runTask } from "@interview-prep/ai";
import { evaluate, type ExperienceItem } from "./experience-set";
import { inBatches, ledger } from "./ledger";

const FULL_SET = 150;
const path = new URL("../sets/experience-statements.jsonl", import.meta.url);
const items: ExperienceItem[] = existsSync(path)
  ? readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];
if (!items.length) {
  console.log("No calibration set yet: nothing to check. Build it with the 'Build calibration set' workflow.");
  process.exit(0);
}

const book = ledger();
const results = await inBatches(items, 6, async (item) => {
  const out = await runTask("score_experience", { experience: item.statement }, { candidateId: null, job: "eval.run", recordRun: book.recordRun });
  return { id: item.id, target: item.target_band, actual: bandFor(overallScore(out.scores)) };
});

const verdict = evaluate(results);
const { byTask, totalCost } = book.summary();
const report = {
  set: "experience statements",
  ...verdict,
  exactRate: Number(verdict.exactRate.toFixed(3)),
  misses: results.filter((r) => r.target !== r.actual),
  byTask,
  totalCostUsd: Number(totalCost.toFixed(4)),
};
writeFileSync(new URL("../calibration-report.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
// The thresholds become a release gate once the full set exists; until then the run
// reports progress without blocking.
if (items.length < FULL_SET) {
  console.log(`Set has ${items.length} of ${FULL_SET} statements: result reported, not enforced.`);
} else if (!verdict.passed) {
  process.exit(1);
}
