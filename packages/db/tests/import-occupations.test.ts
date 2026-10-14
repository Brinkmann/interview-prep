import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadOnet } from "../scripts/import-occupations";

describe("O*NET import", () => {
  it("joins titles, core tasks and skills ranked by importance", () => {
    const rows = loadOnet(join(import.meta.dirname, "fixtures/onet"));
    const pm = rows.find((r) => r.code === "11-9199.00")!;
    expect(pm.title).toBe("Project Management Specialists");
    expect(pm.tasks).toEqual(["Plan project schedules."]);
    expect(pm.skills).toEqual(["Coordination", "Speaking"]);
    expect(rows).toHaveLength(2);
  });
});
