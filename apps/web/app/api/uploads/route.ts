import { CV_UPLOADED, inngest } from "@interview-prep/jobs";
import { hasConsented } from "@/lib/consent";
import { supabaseServer } from "@/lib/supabase/server";

// Screen 1: the browser has put the CV in the candidate's private folder; this records
// the upload (as the candidate, under row-level security) and starts cv.redact.
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });
  if (!(await hasConsented(supabase))) return Response.json({ error: "consent_required" }, { status: 403 });

  const { path } = (await request.json().catch(() => ({}))) as { path?: unknown };
  if (typeof path !== "string" || !path.startsWith(`${auth.user.id}/`) || path.includes("..")) {
    return Response.json({ error: "invalid_path" }, { status: 400 });
  }

  const { data, error } = await supabase.from("uploads")
    .insert({ candidate_id: auth.user.id, storage_path: path }).select("id").single();
  if (error) return Response.json({ error: "could_not_record" }, { status: 500 });

  await inngest.send({ name: CV_UPLOADED, data: { candidateId: auth.user.id, uploadId: data.id } });
  return Response.json({ uploadId: data.id });
}
