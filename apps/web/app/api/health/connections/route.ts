import { checkAnthropicConnection } from "@interview-prep/ai";
import { checkSupabaseConnection, type CheckResult } from "@interview-prep/db";
import { CONNECTION_CHECK_EVENT, inngest } from "@interview-prep/jobs";

export const dynamic = "force-dynamic";

// Reports whether each service accepts the keys saved in Vercel.
// Returns pass or fail only; never returns a key or any personal data.
export async function GET() {
  const env = process.env;

  const [supabase, anthropic, inngestEvent, sentry] = await Promise.all([
    checkSupabaseConnection({
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      secretKey: env.SUPABASE_SECRET_KEY,
    }),
    checkAnthropicConnection(env.ANTHROPIC_API_KEY),
    checkInngestEvent(),
    checkSentry(),
  ]);

  const checks = {
    supabasePublishableKey: supabase.publishableKey,
    supabaseSecretKey: supabase.secretKey,
    anthropicKey: anthropic,
    inngestEventKey: inngestEvent,
    inngestSigningKey: env.INNGEST_SIGNING_KEY ? "present" : "missing",
    sentryDsn: sentry,
    sentryAuthToken: env.SENTRY_AUTH_TOKEN ? "present" : "missing",
  };

  return Response.json({
    environment: env.VERCEL_ENV ?? "development",
    region: env.VERCEL_REGION ?? "local",
    allPassed: Object.values(checks).every((v) => v === "ok" || v === "present"),
    checks,
  });
}

async function checkInngestEvent(): Promise<CheckResult> {
  if (!process.env.INNGEST_EVENT_KEY) return "missing";
  try {
    await inngest.send({ name: CONNECTION_CHECK_EVENT, data: {} });
    return "ok";
  } catch (err) {
    return `failed (${err instanceof Error ? err.message.slice(0, 80) : "send error"})`;
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
