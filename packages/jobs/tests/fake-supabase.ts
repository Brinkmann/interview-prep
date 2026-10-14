import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

// Just enough of the Supabase client for the pipeline's calls, kept in memory.
export function fakeSupabase(files: Map<string, Uint8Array>) {
  const tables: Record<string, Row[]> = new Proxy({ uploads: [], cv_text: [], redaction_log: [], redaction_holds: [] } as Record<string, Row[]>, {
    get: (t, k: string) => (t[k] ??= []),
  });
  let nextId = 1;

  function query(table: string) {
    const filters: [string, unknown][] = [];
    let op: "select" | "update" | "delete" | "insert" = "select";
    let patch: Row = {};
    let inserted: Row[] = [];
    let limit = Infinity;
    let sort: [string, boolean] | null = null;
    const rows = () => {
      const found = tables[table]!.filter((r) => filters.every(([k, v]) => r[k] === v));
      if (sort) {
        const [k, asc] = sort;
        found.sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : String(a[k]) > String(b[k]) ? 1 : 0) * (asc ? 1 : -1));
      }
      return op === "select" ? found.slice(0, limit) : found;
    };
    const run = () => {
      if (op === "update") rows().forEach((r) => Object.assign(r, patch));
      if (op === "delete") {
        const gone = new Set(rows());
        tables[table] = tables[table]!.filter((r) => !gone.has(r));
        if (table === "cv_text") tables.redaction_log = tables.redaction_log!.filter((l) => !gone.has(
          [...gone].find((g) => g.id === l.cv_text_id)!));
      }
      return { data: op === "insert" ? inserted : rows(), error: null };
    };
    const q: any = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      is: (k: string, v: unknown) => (filters.push([k, v ?? undefined]), q),
      order: (k: string, o?: { ascending?: boolean }) => ((sort = [k, o?.ascending ?? true]), q),
      limit: (n: number) => ((limit = n), q),
      maybeSingle: async () => {
        const { data } = run();
        return { data: data[0] ?? null, error: null };
      },
      update: (p: Row) => ((op = "update"), (patch = p), q),
      delete: () => ((op = "delete"), q),
      insert: (r: Row | Row[]) => {
        op = "insert";
        inserted = (Array.isArray(r) ? r : [r]).map((x) => ({ id: `id-${nextId++}`, created_at: new Date(Date.now() + nextId).toISOString(), ...x }));
        tables[table]!.push(...inserted);
        return q;
      },
      single: async () => {
        const { data } = run();
        return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: "PGRST116" } };
      },
      then: (resolve: (v: unknown) => void) => resolve(run()),
    };
    return q;
  }

  const client = {
    from: query,
    storage: {
      from: () => ({
        download: async (path: string) => files.has(path)
          ? { data: new Blob([files.get(path)! as BlobPart]), error: null }
          : { data: null, error: { message: "not found" } },
        remove: async (paths: string[]) => (paths.forEach((p) => files.delete(p)), { data: [], error: null }),
        list: async (folder: string) => ({
          data: [...files.keys()].filter((k) => k.startsWith(`${folder}/`)).map((k) => ({ name: k.slice(folder.length + 1) })),
          error: null,
        }),
      }),
    },
  } as unknown as SupabaseClient;

  return { client, tables };
}
