import { answerClaim } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";

// Screen 5: the candidate explains a claim, or gives their own corrected wording (AT-09).
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });

  const { probeId, answer, corrected, fine } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof probeId !== "string" || typeof answer !== "string") return Response.json({ error: "invalid" }, { status: 400 });
  const result = await answerClaim(supabase, auth.user.id, { probeId, answer, corrected: corrected === true, fine: fine === true });
  return Response.json(result, { status: result.ok ? 200 : result.error === "could_not_save" ? 500 : 400 });
}
