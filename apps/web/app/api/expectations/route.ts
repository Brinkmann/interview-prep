import { answerExpectation, EVIDENCE_CHANGED, inngest } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";

// Screen 4: the candidate's yes, no or not sure to one expected area (AT-08).
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { expectationId, answer, example } = body;
  if (typeof expectationId !== "string" || !["yes", "partly", "no"].includes(answer as string)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const result = await answerExpectation(supabase, auth.user.id, {
    expectationId, answer: answer as "yes" | "partly" | "no", example: typeof example === "string" ? example : null,
  });
  if (!result.ok) return Response.json(result, { status: result.error === "could_not_save" ? 500 : 400 });
  // A new example joins the sprint with its own first rating.
  if (result.addedExperienceId) {
    await inngest.send({ name: EVIDENCE_CHANGED, data: { candidateId: auth.user.id, experienceId: result.addedExperienceId } });
  }
  return Response.json(result);
}
