import type { JobRun } from "@interview-prep/ai";

// Records calibration model calls in memory: tokens and cost per task, no content.
export function ledger() {
  const runs: JobRun[] = [];
  return {
    recordRun: async (run: JobRun) => void runs.push(run),
    summary() {
      const byTask = new Map<string, { calls: number; tokensIn: number; tokensOut: number; cost: number }>();
      for (const r of runs) {
        const t = byTask.get(r.task) ?? { calls: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
        t.calls++; t.tokensIn += r.tokens_in; t.tokensOut += r.tokens_out; t.cost += r.cost_estimate;
        byTask.set(r.task, t);
      }
      const total = [...byTask.values()].reduce((s, t) => s + t.cost, 0);
      return { byTask: Object.fromEntries(byTask), totalCost: total };
    },
  };
}

export async function inBatches<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map((it, j) => fn(it, i + j)))));
  }
  return out;
}
