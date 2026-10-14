// AT-12: every cross-candidate read and write attempt fails.
// Signs in as candidate A and attempts every read and write on candidate B's rows,
// on every personal table and on the CV storage bucket. Also checks that signed-out
// visitors see nothing and that system and reference tables are protected.
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Run scripts/local-db.sh or supabase start first.");

const db = new pg.Client({ connectionString: url });

const PERSONAL = [
  "consents", "target_roles", "uploads", "cv_text", "redaction_log", "experiences",
  "evidence", "scores", "expectations", "probes", "feedback",
] as const;
type Personal = (typeof PERSONAL)[number];

type Ids = Record<"candidate" | Personal, string>;

// One valid row per table for a candidate, linked to that candidate's own parents.
function rowFor(table: Personal, cid: string, ids: Partial<Ids>): Record<string, unknown> {
  const prov = { source_type: "cv", model_id: "test", prompt_version: "v0", confidence: 0.9 };
  switch (table) {
    case "consents": return { candidate_id: cid, notice_version: "v1" };
    case "target_roles": return { candidate_id: cid, job_ad_text: "ad", ad_hash: "h" };
    case "uploads": return { candidate_id: cid, storage_path: `${cid}/cv.pdf` };
    case "cv_text": return { candidate_id: cid, upload_id: ids.uploads, redacted_text: "text" };
    case "redaction_log": return { candidate_id: cid, cv_text_id: ids.cv_text, category: "age", excerpt_hash: "h" };
    case "experiences": return { candidate_id: cid, job_label: "job", original_text: "did a thing", ...prov };
    case "evidence": return { candidate_id: cid, experience_id: ids.experiences, outcome: "result", ...prov };
    case "scores": return {
      candidate_id: cid, experience_id: ids.experiences, outcome_evidence: 4, specificity: 4, ownership: 4,
      credibility: 4, action_reasoning: 4, overall: 4, band: "needs_detail", evidence_version: 1, ...prov,
    };
    case "expectations": return {
      candidate_id: cid, target_role_id: ids.target_roles, area: "vendor management", source: "in_ad",
      matched_experience_id: ids.experiences, ...prov,
    };
    case "probes": return {
      candidate_id: cid, trigger: "vague", target_id: ids.experiences ?? randomUUID(), question: "How?", ...prov,
    };
    case "feedback": return { candidate_id: cid, usefulness: 4 };
  }
}

async function insert(client: pg.ClientBase, table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const res = await client.query(
    `insert into public.${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    Object.values(row),
  );
  return res.rows[0].id as string;
}

// Creates a signed-up candidate with one row in every personal table and one stored file.
async function seedCandidate(): Promise<Ids> {
  const id = randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.test`]);
  await db.query("insert into public.candidates (id) values ($1)", [id]);
  const ids: Partial<Ids> = { candidate: id };
  for (const t of PERSONAL) ids[t] = await insert(db, t, rowFor(t, id, ids));
  await db.query(
    "insert into storage.objects (bucket_id, name, owner) values ('cv-uploads', $1, $2)",
    [`${id}/cv.pdf`, id],
  );
  return ids as Ids;
}

// Runs fn as a signed-in candidate (or a signed-out visitor) inside a transaction that is always rolled back.
async function as<T>(who: string | "anon", fn: (c: pg.ClientBase) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    if (who === "anon") {
      await db.query("set local role anon");
      await db.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    } else {
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: who, role: "authenticated" }),
      ]);
    }
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

const rowCount = async (p: Promise<pg.QueryResult>) => (await p).rowCount;

let A: Ids;
let B: Ids;

beforeAll(async () => {
  await db.connect();
  A = await seedCandidate();
  B = await seedCandidate();
});

afterAll(async () => {
  // Supabase blocks direct storage deletes unless this setting is on for the session.
  await db.query("select set_config('storage.allow_delete_query', 'true', false)");
  await db.query("delete from storage.objects where owner = any($1)", [[A.candidate, B.candidate]]);
  await db.query("delete from auth.users where id = any($1)", [[A.candidate, B.candidate]]);
  await db.end();
});

describe("AT-12: candidate A cannot touch candidate B's data", () => {
  describe.each(PERSONAL)("%s", (table) => {
    it("A can read A's own row (control: the test would otherwise pass trivially)", async () => {
      const n = await as(A.candidate, (c) =>
        c.query(`select 1 from public.${table} where candidate_id = $1`, [A.candidate]).then((r) => r.rowCount));
      expect(n).toBe(1);
    });

    it("cannot read B's rows", async () => {
      expect(await as(A.candidate, (c) =>
        rowCount(c.query(`select 1 from public.${table} where candidate_id = $1`, [B.candidate])))).toBe(0);
      expect(await as(A.candidate, (c) =>
        rowCount(c.query(`select 1 from public.${table} where id = $1`, [B[table]])))).toBe(0);
    });

    it("cannot update B's rows", async () => {
      expect(await as(A.candidate, (c) =>
        rowCount(c.query(`update public.${table} set region = 'x' where candidate_id = $1`, [B.candidate])))).toBe(0);
    });

    it("cannot delete B's rows", async () => {
      expect(await as(A.candidate, (c) =>
        rowCount(c.query(`delete from public.${table} where candidate_id = $1`, [B.candidate])))).toBe(0);
    });

    it("cannot insert a row owned by B", async () => {
      await expect(as(A.candidate, (c) => insert(c, table, rowFor(table, B.candidate, B)))).rejects.toThrow();
    });

    it("cannot hand A's own row over to B", async () => {
      await expect(as(A.candidate, (c) =>
        c.query(`update public.${table} set candidate_id = $1 where candidate_id = $2`, [B.candidate, A.candidate]),
      )).rejects.toThrow();
    });

    it("B's row is still intact afterwards", async () => {
      const r = await db.query(`select region from public.${table} where id = $1`, [B[table]]);
      expect(r.rows).toEqual([{ region: "ap-southeast-2" }]);
    });
  });

  // Foreign key checks bypass row-level security, so these prove the (id, candidate_id) links hold.
  it.each([
    ["cv_text", "upload_id", "uploads"],
    ["redaction_log", "cv_text_id", "cv_text"],
    ["evidence", "experience_id", "experiences"],
    ["scores", "experience_id", "experiences"],
    ["expectations", "target_role_id", "target_roles"],
    ["expectations", "matched_experience_id", "experiences"],
  ] as const)("%s: A cannot link A's own row to B's %s", async (table, column, parent) => {
    const row = { ...rowFor(table, A.candidate, A), [column]: B[parent] };
    await expect(as(A.candidate, (c) => insert(c, table, row))).rejects.toThrow();
  });

  describe("candidates", () => {
    it("cannot read, update or delete B's candidate record", async () => {
      expect(await as(A.candidate, (c) =>
        rowCount(c.query("select 1 from public.candidates where id = $1", [B.candidate])))).toBe(0);
      expect(await as(A.candidate, (c) =>
        rowCount(c.query("update public.candidates set persona = 'pe1' where id = $1", [B.candidate])))).toBe(0);
      expect(await as(A.candidate, (c) =>
        rowCount(c.query("delete from public.candidates where id = $1", [B.candidate])))).toBe(0);
    });

    it("cannot create a candidate record for someone else", async () => {
      await expect(as(A.candidate, (c) =>
        c.query("insert into public.candidates (id) values ($1)", [randomUUID()]))).rejects.toThrow();
    });
  });

  describe("CV storage bucket", () => {
    it("cannot list or read B's files", async () => {
      expect(await as(A.candidate, (c) =>
        rowCount(c.query("select 1 from storage.objects where name like $1", [`${B.candidate}/%`])))).toBe(0);
    });

    it("cannot upload into B's folder", async () => {
      await expect(as(A.candidate, (c) =>
        c.query("insert into storage.objects (bucket_id, name, owner) values ('cv-uploads', $1, $2)",
          [`${B.candidate}/planted.pdf`, A.candidate]))).rejects.toThrow();
    });

    // Supabase may refuse direct deletes outright; either way B's file must survive.
    it("cannot delete B's files", async () => {
      const remaining = await as(A.candidate, async (c) => {
        await c.query("savepoint attempt");
        try {
          await c.query("delete from storage.objects where name like $1", [`${B.candidate}/%`]);
        } catch {
          await c.query("rollback to savepoint attempt");
        }
        await c.query("reset role");
        return rowCount(c.query("select 1 from storage.objects where name like $1", [`${B.candidate}/%`]));
      });
      expect(remaining).toBe(1);
    });

    it("can read A's own file (control)", async () => {
      expect(await as(A.candidate, (c) =>
        rowCount(c.query("select 1 from storage.objects where name like $1", [`${A.candidate}/%`])))).toBe(1);
    });
  });
});

describe("Signed-out visitors see nothing", () => {
  it.each([...PERSONAL, "candidates", "job_runs", "occupations"])("%s", async (table) => {
    await expect(as("anon", (c) => c.query(`select 1 from public.${table}`))).rejects.toThrow(/permission denied/);
  });

  it("CV files", async () => {
    expect(await as("anon", (c) => rowCount(c.query("select 1 from storage.objects")))).toBe(0);
  });
});

describe("System and reference tables", () => {
  it("job_runs cannot be read or written by a candidate", async () => {
    await expect(as(A.candidate, (c) => c.query("select 1 from public.job_runs"))).rejects.toThrow(/permission denied/);
    await expect(as(A.candidate, (c) =>
      c.query("insert into public.job_runs (job, status) values ('x', 'started')"))).rejects.toThrow(/permission denied/);
  });

  it("occupations can be read but not written by a candidate", async () => {
    await expect(as(A.candidate, (c) => c.query("select 1 from public.occupations"))).resolves.toBeDefined();
    await expect(as(A.candidate, (c) =>
      c.query("insert into public.occupations (code, scheme, title) values ('1', 'onet', 'x')"))).rejects.toThrow(/permission denied/);
  });
});
