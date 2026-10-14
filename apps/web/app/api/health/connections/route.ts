import { checkAnthropicConnection, runTask } from "@interview-prep/ai";
import { checkSupabaseConnection, recordJobRun, serviceClient, type CheckResult } from "@interview-prep/db";
import { CONNECTION_CHECK_EVENT, inngest } from "@interview-prep/jobs";

export const dynamic = "force-dynamic";

// Reports whether each service accepts the keys saved in Vercel.
// Returns pass or fail only; never returns a key or any personal data.
export async function GET(request: Request) {
  const env = process.env;
  const wantGateway = new URL(request.url).searchParams.get("gateway") === "1";

  const [supabase, anthropic, jobs, sentry, gateway] = await Promise.all([
    checkSupabaseConnection({
      url: env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
      publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
      secretKey: env.SUPABASE_SECRET_KEY?.trim(),
    }),
    checkAnthropicConnection(env.ANTHROPIC_API_KEY),
    checkInngest(),
    checkSentry(),
    wantGateway ? checkGateway() : Promise.resolve("skipped (add ?gateway=1)" as const),
  ]);

  const checks = {
    supabasePublishableKey: supabase.publishableKey,
    supabaseSecretKey: supabase.secretKey,
    anthropicKey: anthropic,
    inngestEventKey: jobs.eventKey,
    inngestSigningKey: jobs.signingKey,
    inngestJobRoundTrip: jobs.roundTrip,
    sentryDsn: sentry,
    sentryAuthToken: env.SENTRY_AUTH_TOKEN ? "present" : "missing",
    modelGateway: gateway,
  };

  return Response.json({
    environment: env.VERCEL_ENV ?? "development",
    region: env.VERCEL_REGION ?? "local",
    allPassed: Object.values(checks).every((v) => v === "ok" || v === "present" || v.startsWith("skipped")),
    checks,
  });
}

// On the main deployment: re-registers the job endpoint with Inngest (which only succeeds
// with a valid signing key), sends a test event, then waits for Inngest to run the job.
async function checkInngest(): Promise<{
  eventKey: CheckResult;
  signingKey: CheckResult | "skipped (preview)";
  roundTrip: CheckResult | "skipped (preview)";
}> {
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const isMain = process.env.VERCEL_ENV === "production";

  let sync: CheckResult | "skipped (preview)" = "skipped (preview)";
  if (isMain) {
    if (!signingKey || !host) sync = "missing";
    else {
      const res = await fetch(`https://${host}/api/inngest`, { method: "PUT", cache: "no-store" });
      sync = res.ok ? "ok" : `failed (HTTP ${res.status})`;
    }
  }

  if (!process.env.INNGEST_EVENT_KEY) return { eventKey: "missing", signingKey: sync, roundTrip: isMain ? "missing" : sync };
  let eventId: string | undefined;
  try {
    ({ ids: [eventId] } = await inngest.send({ name: CONNECTION_CHECK_EVENT, data: {} }));
  } catch (err) {
    const reason = `failed (${err instanceof Error ? err.message.slice(0, 80) : "send error"})` as const;
    return { eventKey: reason, signingKey: sync, roundTrip: isMain ? reason : sync };
  }
  if (sync !== "ok" || !eventId) return { eventKey: "ok", signingKey: sync, roundTrip: sync };

  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
      headers: { Authorization: `Bearer ${signingKey}` },
      cache: "no-store",
    });
    if (!res.ok) return { eventKey: "ok", signingKey: sync, roundTrip: `failed (runs HTTP ${res.status})` };
    const runs = ((await res.json()) as { data?: { status?: string }[] }).data ?? [];
    const status = runs[0]?.status;
    if (status === "Completed") return { eventKey: "ok", signingKey: sync, roundTrip: "ok" };
    if (status === "Failed" || status === "Cancelled") return { eventKey: "ok", signingKey: sync, roundTrip: `failed (${status})` };
  }
  return { eventKey: "ok", signingKey: sync, roundTrip: "failed (job did not finish in 15s)" };
}

const GATEWAY_JOB = "system.connection_check";
// Synthetic text only. Proves a real model call through runTask, schema validation
// and the job_runs cost record, and that the redaction prompt keeps job titles.
const SYNTHETIC_CV = "Sam Example. Health and Safety Coordinator, 2019 to 2024. I live with asthma.";

async function checkGateway(): Promise<CheckResult | "skipped (ran in the last 10 minutes)"> {
  // Each run makes a paid model call, so a public request can trigger at most one per 10 minutes.
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count, error } = await serviceClient()
    .from("job_runs").select("id", { count: "exact", head: true })
    .eq("job", GATEWAY_JOB).gte("created_at", since);
  if (error) return `failed (job_runs HTTP ${error.code})`;
  if (count) return "skipped (ran in the last 10 minutes)";
  try {
    const out = await runTask("redact_sensitive", { cvText: SYNTHETIC_CV }, {
      candidateId: null, job: GATEWAY_JOB, recordRun: recordJobRun,
    });
    const flagged = out.spans.map((s) => s.text).join(" ");
    if (!/asthma/i.test(flagged)) return "failed (health statement not flagged)";
    if (/Coordinator/i.test(flagged)) return "failed (job title flagged)";
    return "ok";
  } catch (err) {
    return `failed (${err instanceof Error ? err.message.slice(0, 80) : "error"})`;
  }
}

// Posts one test message straight to Sentry and reads its answer, so a wrong DSN shows as failed.
async function checkSentry(): Promise<CheckResult> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "missing";
  try {
    const { username: key, host, pathname } = new URL(dsn);
    const projectId = pathname.replace(/\//g, "");
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const envelope = [
      JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({
        event_id: eventId,
        message: "Connection check",
        level: "info",
        platform: "javascript",
        environment: process.env.VERCEL_ENV ?? "development",
      }),
    ].join("\n");
    const res = await fetch(
      `https://${host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`,
      { method: "POST", body: envelope, cache: "no-store" },
    );
    return res.ok ? "ok" : `failed (HTTP ${res.status})`;
  } catch (err) {
    return `failed (${err instanceof Error ? err.name : "network error"})`;
  }
}
