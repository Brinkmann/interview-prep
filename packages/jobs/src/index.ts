// Inngest background job functions. Every job that touches personal data must
// receive and filter on candidate_id (06-phase0-1-build.md, Row-level security).
// Step results are stored by Inngest, so steps return ids and counts only, never content.
import { createHmac } from "node:crypto";
import { Inngest } from "inngest";
import { runTask } from "@interview-prep/ai";
import { recordJobRun, serviceClient } from "@interview-prep/db";
import { deleteOriginal, extractAndRedact } from "./redaction/pipeline";
import { dueCandidates, purgeCandidate } from "./retention/purge";
export { openExcerpt } from "./redaction/hold";
export { adHash, looksTruncated } from "./job-ad";
export { isRemovedMarker } from "./redaction/rules";

export const inngest = new Inngest({ id: "interview-prep" });

export const CONNECTION_CHECK_EVENT = "system/connection.check";
export const CV_UPLOADED = "cv/uploaded";
export const CV_REDACTED = "cv/redacted";
export const DELETE_REQUESTED = "candidate/delete.requested";

// Proves the round trip: the website sends an event, Inngest calls back into
// the website to run this function. Carries no personal data.
export const connectionCheck = inngest.createFunction(
  { id: "system-connection-check", triggers: [{ event: CONNECTION_CHECK_EVENT }] },
  async ({ event, step }) => {
    return step.run("acknowledge", () => ({ received: event.name }));
  },
);

// cv.redact: one durable workflow per upload, one at a time per candidate.
export const cvRedact = inngest.createFunction(
  {
    id: "cv-redact",
    triggers: [{ event: CV_UPLOADED }],
    concurrency: { key: "event.data.candidateId", limit: 1 },
    retries: 3,
    onFailure: async ({ event }) => {
      const { candidateId, uploadId } = event.data.event.data as { candidateId: string; uploadId: string };
      await serviceClient().from("uploads").update({ status: "failed", failure_reason: "processing_error" })
        .eq("id", uploadId).eq("candidate_id", candidateId);
    },
  },
  async ({ event, step }) => {
    const { candidateId, uploadId } = event.data as { candidateId: string; uploadId: string };

    const result = await step.run("extract-and-redact", () =>
      extractAndRedact(
        {
          db: serviceClient(),
          hashKey: redactionHashKey(),
          flagSensitive: async (cvText) =>
            (await runTask("redact_sensitive", { cvText }, { candidateId, job: "cv.redact", recordRun: recordJobRun })).spans,
        },
        candidateId,
        uploadId,
      ),
    );

    // The original is deleted whatever the outcome, including unreadable files.
    await step.run("delete-original", () => deleteOriginal(serviceClient(), candidateId, uploadId));

    if (result.outcome === "redacted") {
      await step.sendEvent("hand-off", { name: CV_REDACTED, data: { candidateId, cvTextId: result.cvTextId } });
    }
    return result;
  },
);

// retention.purge: daily for candidates past their deletion date, and immediately on
// a delete request (US-06, AT-13). A single run at a time.
export const retentionPurge = inngest.createFunction(
  {
    id: "retention-purge",
    triggers: [{ cron: "TZ=Pacific/Auckland 0 3 * * *" }, { event: DELETE_REQUESTED }],
    concurrency: { limit: 1 },
    retries: 5,
  },
  async ({ event, step }) => {
    const ids = event.name === DELETE_REQUESTED
      ? [(event.data as { candidateId: string }).candidateId]
      : await step.run("find-due", () => dueCandidates(serviceClient(), new Date().toISOString().slice(0, 10)));
    for (const id of ids) {
      await step.run(`purge-${id}`, () => purgeCandidate(serviceClient(), id));
    }
    return { purged: ids.length };
  },
);

// D-27: removed text is held for 24 hours only. Runs hourly; expired holds are deleted.
export const holdsExpire = inngest.createFunction(
  { id: "holds-expire", triggers: [{ cron: "0 * * * *" }], concurrency: { limit: 1 } },
  async ({ step }) =>
    step.run("delete-expired", async () => {
      const { error, count } = await serviceClient().from("redaction_holds")
        .delete({ count: "exact" }).lte("expires_at", new Date().toISOString());
      if (error) throw new Error(`Could not delete expired holds: ${error.code}`);
      return { deleted: count ?? 0 };
    }),
);

// Derived from the service secret so no extra key has to be managed.
function redactionHashKey(): string {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) throw new Error("Supabase service credentials are not configured");
  return createHmac("sha256", secret).update("redaction_log").digest("hex");
}

export const functions = [connectionCheck, cvRedact, retentionPurge, holdsExpire];
