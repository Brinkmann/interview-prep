// Inngest background job functions. Every job that touches personal data must
// receive and filter on candidate_id (06-phase0-1-build.md, Row-level security).
// Step results are stored by Inngest, so steps return ids and counts only, never content.
import { createHmac } from "node:crypto";
import { Inngest } from "inngest";
import { modelFor, runTask, TASKS } from "@interview-prep/ai";
import { recordJobRun, serviceClient } from "@interview-prep/db";
import { deleteOriginal, extractAndRedact } from "./redaction/pipeline";
import { extractFromCv, rankForRole, scoreOne, type ExperienceDeps } from "./experiences/pipeline";
import { dueCandidates, purgeCandidate } from "./retention/purge";
export { openExcerpt } from "./redaction/hold";
export { adHash, looksTruncated } from "./job-ad";
export { isRemovedMarker } from "./redaction/rules";
export { EVIDENCE_FIELDS, evidenceVersion } from "./experiences/rating";
export { headline, summarise, type Card } from "./experiences/summary";

export const inngest = new Inngest({ id: "interview-prep" });

export const CONNECTION_CHECK_EVENT = "system/connection.check";
export const CV_UPLOADED = "cv/uploaded";
export const CV_REDACTED = "cv/redacted";
export const DELETE_REQUESTED = "candidate/delete.requested";
export const CV_RESTORED = "cv/restored";
export const ROLE_SAVED = "role/saved";
export const EVIDENCE_CHANGED = "evidence/changed";

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

function experienceDeps(candidateId: string, job: string): ExperienceDeps {
  const ctx = { candidateId, job, recordRun: recordJobRun };
  return {
    db: serviceClient(),
    extract: (cvText) => runTask("extract_experiences", { cvText }, ctx),
    rank: async (jobAd, experiences) => (await runTask("rank_for_role", { jobAd, experiences }, ctx)).ranked,
    score: (experience, evidence) => runTask("score_experience", {
      experience,
      evidence: evidence ? Object.fromEntries(Object.entries(evidence).filter(([, v]) => typeof v === "string")) as Record<string, string> : undefined,
    }, ctx),
    modelIds: { extract: modelFor("extract_experiences"), rank: modelFor("rank_for_role"), score: modelFor("score_experience") },
    promptVersions: { extract: TASKS.extract_experiences.promptVersion, score: TASKS.score_experience.promptVersion },
  };
}

// experiences.extract, then rank_for_role and a first rating for every experience (Screen 2).
// A restore re-runs it, as long as the candidate has not started the sprint.
export const experiencesExtract = inngest.createFunction(
  {
    id: "experiences-extract",
    triggers: [{ event: CV_REDACTED }, { event: CV_RESTORED }],
    concurrency: { key: "event.data.candidateId", limit: 1 },
    retries: 3,
  },
  async ({ event, step }) => {
    const { candidateId } = event.data as { candidateId: string };
    const deps = () => experienceDeps(candidateId, "experiences.extract");
    const found = await step.run("extract", () => extractFromCv(deps(), candidateId));
    if (found.outcome !== "extracted") return { outcome: found.outcome };
    await step.run("rank", () => rankForRole(deps(), candidateId));
    await Promise.all(found.ids.map((id) => step.run(`score-${id}`, () => scoreOne(deps(), candidateId, id))));
    return { outcome: found.outcome, experiences: found.ids.length };
  },
);

// A new job ad re-ranks the experiences already found.
export const experiencesRank = inngest.createFunction(
  { id: "experiences-rank", triggers: [{ event: ROLE_SAVED }], concurrency: { key: "event.data.candidateId", limit: 1 } },
  async ({ event, step }) => {
    const { candidateId } = event.data as { candidateId: string };
    return step.run("rank", () => rankForRole(experienceDeps(candidateId, "experiences.rank"), candidateId));
  },
);

// experiences.score when the candidate adds evidence in the sprint (Screen 3).
export const experiencesScore = inngest.createFunction(
  {
    id: "experiences-score",
    triggers: [{ event: EVIDENCE_CHANGED }],
    concurrency: [{ key: "event.data.experienceId", limit: 1 }, { limit: 10 }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { candidateId, experienceId } = event.data as { candidateId: string; experienceId: string };
    return step.run("score", () => scoreOne(experienceDeps(candidateId, "experiences.score"), candidateId, experienceId));
  },
);

// Derived from the service secret so no extra key has to be managed.
function redactionHashKey(): string {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) throw new Error("Supabase service credentials are not configured");
  return createHmac("sha256", secret).update("redaction_log").digest("hex");
}

export const functions = [
  connectionCheck, cvRedact, retentionPurge, holdsExpire, experiencesExtract, experiencesRank, experiencesScore,
];
