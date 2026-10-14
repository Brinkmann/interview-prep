import { supabaseServer } from "@/lib/supabase/server";

// Screen 6: the two-question feedback used for the go or no-go decision (D-28).
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });

  const { usefulness, comment } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!Number.isInteger(usefulness) || (usefulness as number) < 1 || (usefulness as number) > 5) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const { error } = await supabase.from("feedback").insert({
    candidate_id: auth.user.id, usefulness, comment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 4000) : null,
  });
  return error ? Response.json({ error: "could_not_save" }, { status: 500 }) : Response.json({ ok: true });
}
