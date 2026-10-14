import { NOTICE_VERSION } from "@/lib/privacy";
import { supabaseServer } from "@/lib/supabase/server";

// Records that the candidate accepted the current privacy notice (consents table).
export async function POST() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "signed_out" }, { status: 401 });
  const { error } = await supabase.from("consents").insert({ candidate_id: data.user.id, notice_version: NOTICE_VERSION });
  if (error) return Response.json({ error: "could_not_record" }, { status: 500 });
  return Response.json({ ok: true });
}
