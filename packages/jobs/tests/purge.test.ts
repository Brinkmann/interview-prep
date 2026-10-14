import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { dueCandidates, PERSONAL_TABLES, purgeCandidate } from "../src/retention/purge";

// In-memory stand-in: deleting the account cascades, as the database does.
function fake(opts: { cascade: boolean }) {
  const files = new Set(["c1/a.pdf", "c1/b.docx", "c2/x.pdf"]);
  const rows: Record<string, { id: string; candidate_id?: string }[]> = Object.fromEntries(
    PERSONAL_TABLES.map((t) => [t, t === "candidates" ? [{ id: "c1" }, { id: "c2" }] : [{ id: `${t}-1`, candidate_id: "c1" }, { id: `${t}-2`, candidate_id: "c2" }]]),
  );
  const client = {
    storage: { from: () => ({
      list: async (folder: string) => ({ data: [...files].filter((f) => f.startsWith(`${folder}/`)).map((f) => ({ name: f.split("/")[1] })), error: null }),
      remove: async (paths: string[]) => (paths.forEach((p) => files.delete(p)), { data: [], error: null }),
    }) },
    auth: { admin: { deleteUser: async (id: string) => {
      if (opts.cascade) for (const t of PERSONAL_TABLES) rows[t] = rows[t]!.filter((r) => (t === "candidates" ? r.id : r.candidate_id) !== id);
      return { error: null };
    } } },
    from: (t: string) => ({ select: () => ({ eq: async (col: string, v: string) => ({
      count: rows[t]!.filter((r) => (r as Record<string, string>)[col] === v).length, error: null,
    }) }) }),
  } as unknown as SupabaseClient;
  return { client, files, rows };
}

describe("AT-13: retention purge", () => {
  it("removes every personal row and file for the candidate, and nobody else's", async () => {
    const { client, files, rows } = fake({ cascade: true });
    await expect(purgeCandidate(client, "c1")).resolves.toEqual({ files: 2 });
    expect([...files]).toEqual(["c2/x.pdf"]);
    for (const t of PERSONAL_TABLES) expect(rows[t]!.length, t).toBe(1);
  });

  it("fails loudly if anything personal is left", async () => {
    const { client } = fake({ cascade: false });
    await expect(purgeCandidate(client, "c1")).rejects.toThrow(/remain/);
  });

  it("finds candidates whose deletion date has arrived", async () => {
    const calls: unknown[] = [];
    const client = { from: () => ({ select: () => ({ lte: (_c: string, d: string) => (calls.push(d), {
      limit: async () => ({ data: [{ id: "c1" }], error: null }),
    }) }) }) } as unknown as SupabaseClient;
    expect(await dueCandidates(client, "2026-10-14")).toEqual(["c1"]);
    expect(calls).toEqual(["2026-10-14"]);
  });
});
