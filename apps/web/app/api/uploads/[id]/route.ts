import { openExcerpt } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";

// Progress and outcome of one upload, read as the candidate, with each removed line
// while its 24-hour restore hold lasts (D-27).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: upload } = await supabase.from("uploads")
    .select("status, failure_reason, deleted_at").eq("id", id).maybeSingle();
  if (!upload) return Response.json({ error: "not_found" }, { status: 404 });

  type Removed = { id: string; category: string; excerpt: string | null; restored: boolean };
  let removed: Removed[] = [];
  if (upload.status === "redacted") {
    const { data: cv } = await supabase.from("cv_text").select("id").eq("upload_id", id).maybeSingle();
    if (cv) {
      const { data: log } = await supabase.from("redaction_log").select("id, category, restored").eq("cv_text_id", cv.id);
      const { data: holds } = await supabase.from("redaction_holds")
        .select("redaction_log_id, ciphertext, expires_at").in("redaction_log_id", (log ?? []).map((l) => l.id));
      const live = new Map((holds ?? []).filter((h) => new Date(h.expires_at) > new Date()).map((h) => [h.redaction_log_id, h.ciphertext]));
      // The removed text is shown only to its owner, and only while the 24-hour hold lasts.
      removed = (log ?? []).map((l) => ({
        id: l.id, category: l.category, restored: l.restored,
        excerpt: live.has(l.id) ? openExcerpt(live.get(l.id)!) : null,
      }));
    }
  }
  return Response.json({ ...upload, removed });
}
