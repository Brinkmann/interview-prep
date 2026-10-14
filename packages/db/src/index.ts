// Schema, migrations, row-level security policies and typed client.
export { serviceClient, recordJobRun, type JobRunRow } from "./service";

export type CheckResult = "ok" | "missing" | `failed (${string})`;

async function probe(url: string, apiKey: string): Promise<CheckResult> {
  try {
    const res = await fetch(url, { headers: { apikey: apiKey }, cache: "no-store" });
    return res.ok ? "ok" : `failed (HTTP ${res.status})`;
  } catch (err) {
    return `failed (${err instanceof Error ? err.name : "network error"})`;
  }
}

// Confirms the Supabase address and both keys are accepted. Reads no rows.
export async function checkSupabaseConnection(env: {
  url?: string;
  publishableKey?: string;
  secretKey?: string;
}): Promise<{ publishableKey: CheckResult; secretKey: CheckResult }> {
  const base = env.url?.replace(/\/+$/, "");
  return {
    publishableKey:
      base && env.publishableKey
        ? await probe(`${base}/auth/v1/settings`, env.publishableKey)
        : "missing",
    // The admin endpoint only answers to the secret key, so a pass proves it is the right one.
    secretKey:
      base && env.secretKey
        ? await probe(`${base}/auth/v1/admin/users?page=1&per_page=1`, env.secretKey)
        : "missing",
  };
}
