// Builds or extends the experience statement calibration set.
// Usage: pnpm --filter @interview-prep/eval build-set -- --count 15
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { buildItem, plan } from "./experience-set";
import { inBatches, ledger } from "./ledger";

const SET = new URL("../sets/experience-statements.jsonl", import.meta.url);
mkdirSync(new URL("../sets/", import.meta.url), { recursive: true });
const count = Number(process.argv[process.argv.indexOf("--count") + 1] || 15);
const existing = existsSync(SET) ? readFileSync(SET, "utf8").trim().split("\n").filter(Boolean).length : 0;

const book = ledger();
const specs = plan(count, existing);
let kept = 0;
let dropped = 0;
await inBatches(specs, 4, async (spec) => {
  const item = await buildItem(spec, { recordRun: book.recordRun });
  if (item) {
    appendFileSync(SET, `${JSON.stringify(item)}\n`);
    kept++;
  } else dropped++;
});

const { byTask, totalCost } = book.summary();
console.log(JSON.stringify({ requested: count, kept, droppedAfterTwoAttempts: dropped, setSize: existing + kept, byTask, totalCostUsd: Number(totalCost.toFixed(4)) }, null, 2));
