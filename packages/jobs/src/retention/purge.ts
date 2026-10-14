import type { SupabaseClient } from "@supabase/supabase-js";
import { CV_BUCKET } from "../redaction/pipeline";

// Tables that hold personal rows. Deleting the sign-in account cascades to all of
// them; they are listed here only to prove nothing is left afterwards.
export const PERSONAL_TABLES = [
  "candidates", "consents", "target_roles", "uploads", "cv_text", "redaction_log", "experiences",
  "evidence", "scores", "expectations", "probes", "feedback", "redaction_holds",
] as const;

// AT-13: removes every personal row and file for one candidate, then proves it.
export async function purgeCandidate(db: SupabaseClient, candidateId: string): Promise<{ files: number }> {
  const files = await db.storage.from(CV_BUCKET).list(candidateId, { limit: 1000 });
  if (files.error) throw new Error("Could not list the candidate's files");
  if (files.data.length) {
    const removed = await db.storage.from(CV_BUCKET).remove(files.data.map((f) => `${candidateId}/${f.name}`));
    if (removed.error) throw new Error("Could not delete the candidate's files");
  }

  // Deleting the account cascades to the candidate record and every personal table.
  const deleted = await db.auth.admin.deleteUser(candidateId);
  if (deleted.error && deleted.error.status !== 404) throw new Error(`Could not delete the account: ${deleted.error.status}`);

  for (const table of PERSONAL_TABLES) {
    const column = table === "candidates" ? "id" : "candidate_id";
    const left = await db.from(table).select("id", { count: "exact", head: true }).eq(column, candidateId);
    if (left.error || left.count) throw new Error(`Personal rows remain in ${table} after purge`);
  }
  const leftFiles = await db.storage.from(CV_BUCKET).list(candidateId);
  if (leftFiles.error || leftFiles.data.length) throw new Error("Files remain in storage after purge");

  return { files: files.data.length };
}

// Candidates whose deletion date has arrived. Ids only.
export async function dueCandidates(db: SupabaseClient, today: string): Promise<string[]> {
  const { data, error } = await db.from("candidates").select("id").lte("retention_until", today).limit(500);
  if (error) throw new Error(`Could not find candidates due for deletion: ${error.code}`);
  return data.map((r) => r.id as string);
}
