import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

// Server-side only. Bypasses row-level security, so every query a job makes must
// still filter on candidate_id (06-phase0-1-build.md, Row-level security).
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  return (client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

export interface JobRunRow {
  candidate_id: string | null;
  job: string;
  task: string | null;
  model_id: string | null;
  status: "started" | "succeeded" | "failed" | "retried";
  tokens_in: number | null;
  tokens_out: number | null;
  cost_estimate: number | null;
  duration_ms: number | null;
}

// Cost and reliability record. Holds no personal content by construction.
export async function recordJobRun(row: JobRunRow): Promise<void> {
  const { error } = await serviceClient().from("job_runs").insert(row);
  if (error) throw new Error(`Could not record job run: ${error.code}`);
}
