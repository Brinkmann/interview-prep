import { supabaseServer } from "@/lib/supabase/server";

// Progress and outcome of one upload, read as the candidate. Returns categories only:
// what was removed is never stored, so it cannot be shown.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: upload } = await supabase.from("uploads")
    .select("status, failure_reason, deleted_at").eq("id", id).maybeSingle();
  if (!upload) return Response.json({ error: "not_found" }, { status: 404 });

  let removed: string[] = [];
  if (upload.status === "redacted") {
    const { data: cv } = await supabase.from("cv_text").select("id").eq("upload_id", id).maybeSingle();
    if (cv) {
      const { data: log } = await supabase.from("redaction_log").select("category").eq("cv_text_id", cv.id);
      removed = (log ?? []).map((l) => l.category as string);
    }
  }
  return Response.json({ ...upload, removed });
}
