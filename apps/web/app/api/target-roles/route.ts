import { adHash, looksTruncated } from "@interview-prep/jobs";
import { hasConsented } from "@/lib/consent";
import { supabaseServer } from "@/lib/supabase/server";

// Screen 1: saves the pasted job ad and flags one that looks cut off (AT-03).
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "signed_out" }, { status: 401 });
  if (!(await hasConsented(supabase))) return Response.json({ error: "consent_required" }, { status: 403 });

  const { jobAd } = (await request.json().catch(() => ({}))) as { jobAd?: unknown };
  if (typeof jobAd !== "string" || !jobAd.trim() || jobAd.length > 30_000) {
    return Response.json({ error: "invalid_ad" }, { status: 400 });
  }
  const truncated = looksTruncated(jobAd);
  const { data: role, error } = await supabase.from("target_roles")
    .insert({ candidate_id: data.user.id, job_ad_text: jobAd.trim(), ad_hash: adHash(jobAd), truncation_warning: truncated })
    .select("id").single();
  if (error) return Response.json({ error: "could_not_record" }, { status: 500 });
  return Response.json({ targetRoleId: role.id, truncated });
}
