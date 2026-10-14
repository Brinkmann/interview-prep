import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sealExcerpt } from "./hold";
import { applyRules, markerSequence, removeExcerpts, type Removal } from "./rules";
import { formatFromPath, parseCv, UnreadableCvError } from "./parse";

export const CV_BUCKET = "cv-uploads";

export interface RedactDeps {
  db: SupabaseClient;
  // Redaction step 4, through the model gateway.
  flagSensitive: (cvText: string) => Promise<{ category: string; text: string }[]>;
  hashKey: string;
  // Encrypts an excerpt for the 24-hour restore hold (D-27).
  seal?: (plain: string) => string;
}

export type RedactResult =
  | { outcome: "redacted"; cvTextId: string; removed: number }
  | { outcome: "unreadable" | "unsupported_type" };

// A keyed hash, so the log can confirm a restored excerpt without anyone being able
// to guess what was removed by hashing likely values.
export function excerptHash(key: string, excerpt: string): string {
  return createHmac("sha256", key).update(excerpt).digest("hex");
}

// Steps 2 to 6 of the upload pipeline (06-phase0-1-build.md). Returns only ids and
// counts: nothing from the CV leaves this function except into cv_text.
export async function extractAndRedact(
  deps: RedactDeps,
  candidateId: string,
  uploadId: string,
): Promise<RedactResult> {
  const { db } = deps;
  const upload = await db.from("uploads").select("storage_path")
    .eq("id", uploadId).eq("candidate_id", candidateId).single();
  if (upload.error) throw new Error(`Upload not found: ${upload.error.code}`);
  const path: string = upload.data.storage_path;

  const format = formatFromPath(path);
  if (!format) return markFailed(db, candidateId, uploadId, "unsupported_type");

  await setStatus(db, candidateId, uploadId, "extracting");
  const file = await db.storage.from(CV_BUCKET).download(path);
  if (file.error) throw new Error("Could not download the CV file");

  let parsed;
  try {
    parsed = await parseCv(new Uint8Array(await file.data.arrayBuffer()), format);
  } catch (err) {
    if (err instanceof UnreadableCvError) return markFailed(db, candidateId, uploadId, "unreadable");
    throw err;
  }

  await setStatus(db, candidateId, uploadId, "redacting");
  const nextMarker = markerSequence();
  const rules = applyRules(parsed.text, nextMarker);
  const model = removeExcerpts(rules.text, await deps.flagSensitive(rules.text), nextMarker);
  const removals: Removal[] = [
    ...Array.from({ length: parsed.imageCount }, () => ({ category: "photo", excerpt: "embedded image", marker: null })),
    ...rules.removals,
    ...model.removals,
  ];

  // A retry replaces any earlier attempt for this upload; the log cascades with it.
  await db.from("cv_text").delete().eq("upload_id", uploadId).eq("candidate_id", candidateId);
  const saved = await db.from("cv_text")
    .insert({ candidate_id: candidateId, upload_id: uploadId, redacted_text: model.text })
    .select("id").single();
  if (saved.error) throw new Error(`Could not save CV text: ${saved.error.code}`);

  if (removals.length) {
    const log = await db.from("redaction_log").insert(removals.map((r) => ({
      candidate_id: candidateId,
      cv_text_id: saved.data.id,
      category: r.category,
      excerpt_hash: excerptHash(deps.hashKey, r.excerpt),
      marker: r.marker,
      model_id: model.removals.includes(r) ? "claude-haiku-5-5" : null,
      prompt_version: model.removals.includes(r) ? "redact_sensitive@1" : null,
    }))).select("id, marker");
    if (log.error) throw new Error(`Could not save redaction log: ${log.error.code}`);

    // Text removals are held encrypted for 24 hours so a mistake can be restored.
    const seal = deps.seal ?? sealExcerpt;
    const byMarker = new Map(removals.filter((r) => r.marker).map((r) => [r.marker!, r.excerpt]));
    const holds = (log.data as { id: string; marker: string | null }[])
      .filter((row) => row.marker && byMarker.has(row.marker))
      .map((row) => ({ candidate_id: candidateId, redaction_log_id: row.id, ciphertext: seal(byMarker.get(row.marker!)!) }));
    if (holds.length) {
      const held = await db.from("redaction_holds").insert(holds);
      if (held.error) throw new Error(`Could not save restore holds: ${held.error.code}`);
    }
  }

  await setStatus(db, candidateId, uploadId, "redacted");
  return { outcome: "redacted", cvTextId: saved.data.id, removed: removals.length };
}

// Step 7: the original file must be gone. Throws (and the job fails loudly) otherwise.
export async function deleteOriginal(db: SupabaseClient, candidateId: string, uploadId: string): Promise<void> {
  const upload = await db.from("uploads").select("storage_path")
    .eq("id", uploadId).eq("candidate_id", candidateId).single();
  if (upload.error) throw new Error(`Upload not found: ${upload.error.code}`);
  const path: string = upload.data.storage_path;

  const removed = await db.storage.from(CV_BUCKET).remove([path]);
  if (removed.error) throw new Error("Original CV could not be deleted");
  const folder = path.split("/").slice(0, -1).join("/");
  const left = await db.storage.from(CV_BUCKET).list(folder, { search: path.split("/").pop() });
  if (left.error || left.data.some((f) => `${folder}/${f.name}` === path)) {
    throw new Error("Original CV is still in storage after deletion");
  }

  const done = await db.from("uploads").update({ deleted_at: new Date().toISOString() })
    .eq("id", uploadId).eq("candidate_id", candidateId);
  if (done.error) throw new Error(`Could not record deletion: ${done.error.code}`);
}

async function setStatus(db: SupabaseClient, candidateId: string, uploadId: string, status: string) {
  const r = await db.from("uploads").update({ status }).eq("id", uploadId).eq("candidate_id", candidateId);
  if (r.error) throw new Error(`Could not update upload status: ${r.error.code}`);
}

async function markFailed(
  db: SupabaseClient, candidateId: string, uploadId: string, reason: "unreadable" | "unsupported_type",
): Promise<RedactResult> {
  const r = await db.from("uploads").update({ status: "failed", failure_reason: reason })
    .eq("id", uploadId).eq("candidate_id", candidateId);
  if (r.error) throw new Error(`Could not update upload status: ${r.error.code}`);
  return { outcome: reason };
}
