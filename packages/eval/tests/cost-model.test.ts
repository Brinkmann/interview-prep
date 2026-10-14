import { describe, expect, it } from "vitest";
import { CALLS, costOf, costPerUser, USAGE } from "../src/cost-model";

describe("cost model arithmetic", () => {
  it("prices a call from the list prices", () => {
    // 900 in at $2/M plus 500 out at $10/M on the medium model.
    expect(costOf(CALLS.score!)).toBeCloseTo(0.0068, 6);
  });

  it("totals every line of a user's usage", () => {
    const { lines, total } = costPerUser("free");
    expect(lines).toHaveLength(Object.keys(USAGE.free).length);
    expect(total).toBeCloseTo(lines.reduce((s, l) => s + l.cost, 0), 10);
  });
});
