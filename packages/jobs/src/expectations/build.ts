import type { SupabaseClient } from "@supabase/supabase-js";

// expectations.build (Screen 4). Runs after experiences are found and whenever a new job
// ad is saved. Queries filter on candidate_id; returns counts only.

export interface Occupation { id: string; title: string; description: string; tasks: string[]; skills: string[] }

export interface ExpectationDeps {
  db: SupabaseClient;
  matchOccupations: (query: string) => Promise<Occupation[]>;
  build: (input: { jobAd: string; occupations: Occupation[]; experiences: string[] }) => Promise<{
    title: string; occupation_index: number | null;
    areas: { area: string; source: "in_ad" | "typical"; matched_experience_index: number | null }[];
  }>;
  modelId: string; promptVersion: string;
}

// The search uses the ad's opening line, which is usually the job title.
export function titleGuess(jobAd: string): string {
  const line = jobAd.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 2 && l.length <= 100);
  return (line ?? jobAd.slice(0, 100)).replace(/[^\p{L}\p{N}\s&/-]/gu, " ");
}

export async function buildForRole(deps: ExpectationDeps, candidateId: string) {
  const { db } = deps;
  const role = await db.from("target_roles").select("id, job_ad_text").eq("candidate_id", candidateId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (role.error) throw new Error(`Could not read target role: ${role.error.code}`);
  if (!role.data) return { built: 0, reason: "no_role" };
  const roleId = role.data.id as string;

  const existing = await db.from("expectations").select("id, answer").eq("candidate_id", candidateId).eq("target_role_id", role.data.id);
  if (existing.error) throw new Error(`Could not read expectations: ${existing.error.code}`);
  // Once the candidate has answered, the list is theirs: it is not rebuilt underneath them.
  if ((existing.data ?? []).some((e) => e.answer !== "unanswered")) return { built: 0, reason: "answered" };

  const exps = await db.from("experiences").select("id, original_text").eq("candidate_id", candidateId);
  if (exps.error) throw new Error(`Could not read experiences: ${exps.error.code}`);
  const list = exps.data as { id: string; original_text: string }[];

  const occupations = await deps.matchOccupations(titleGuess(role.data.job_ad_text));
  const out = await deps.build({ jobAd: role.data.job_ad_text, occupations, experiences: list.map((e) => e.original_text) });
  const occupation = out.occupation_index !== null ? occupations[out.occupation_index] : undefined;

  const seen = new Set<string>();
  const rows = out.areas.flatMap((a) => {
    const area = a.area.trim().replace(/\.$/, "");
    const key = area.toLowerCase();
    if (!area || seen.has(key)) return [];
    seen.add(key);
    // "Typical" only stands when it comes from a reference occupation; otherwise it is the ad's.
    const source = a.source === "typical" && !occupation ? "in_ad" : a.source;
    const match = a.matched_experience_index !== null ? list[a.matched_experience_index] : undefined;
    return [{
      candidate_id: candidateId, target_role_id: roleId, area, source,
      status: match ? "found" : "not_found", matched_experience_id: match?.id ?? null,
      source_type: source === "in_ad" ? "job_ad" : "reference", model_id: deps.modelId, prompt_version: deps.promptVersion,
    }];
  }).slice(0, 10);

  await db.from("target_roles").update({ title: out.title.trim().slice(0, 200) }).eq("id", role.data.id).eq("candidate_id", candidateId);
  const cleared = await db.from("expectations").delete().eq("candidate_id", candidateId).eq("target_role_id", role.data.id);
  if (cleared.error) throw new Error(`Could not clear expectations: ${cleared.error.code}`);
  const saved = await db.from("expectations").insert(rows);
  if (saved.error) throw new Error(`Could not save expectations: ${saved.error.code}`);
  return { built: rows.length, occupation: occupation?.id ?? null };
}
