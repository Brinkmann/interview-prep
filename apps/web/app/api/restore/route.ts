import { openExcerpt } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";

// US-04 / D-27: puts back a line that redaction removed by mistake, within 24 hours.
// Every read and write runs as the candidate, under row-level security.
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });

  const { logId } = (await request.json().catch(() => ({}))) as { logId?: unknown };
  if (typeof logId !== "string") return Response.json({ error: "invalid" }, { status: 400 });

  const { data: hold } = await supabase.from("redaction_holds")
    .select("id, ciphertext, expires_at").eq("redaction_log_id", logId).maybeSingle();
  if (!hold || new Date(hold.expires_at) <= new Date()) return Response.json({ error: "expired" }, { status: 410 });

  const { data: log } = await supabase.from("redaction_log").select("cv_text_id, marker").eq("id", logId).single();
  const { data: cv } = await supabase.from("cv_text").select("redacted_text").eq("id", log!.cv_text_id).single();
  if (!log?.marker || !cv) return Response.json({ error: "not_found" }, { status: 404 });

  const restored = (cv.redacted_text as string).split(log.marker).join(openExcerpt(hold.ciphertext));
  const updated = await supabase.from("cv_text").update({ redacted_text: restored }).eq("id", log.cv_text_id);
  if (updated.error) return Response.json({ error: "could_not_restore" }, { status: 500 });
  await supabase.from("redaction_log").update({ restored: true }).eq("id", logId);
  await supabase.from("redaction_holds").delete().eq("id", hold.id);
  return Response.json({ ok: true });
}
