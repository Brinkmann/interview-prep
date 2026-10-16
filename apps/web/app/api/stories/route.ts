import { EVIDENCE_CHANGED, inngest } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";

// Step 2: adds an experience from the collapsed list to the candidate's stories, after
// the ones already chosen for this role (D-31). Runs as the candidate, under row-level security.
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });

  const { experienceId } = (await request.json().catch(() => ({}))) as { experienceId?: unknown };
  if (typeof experienceId !== "string") return Response.json({ error: "invalid" }, { status: 400 });

  const { data: last } = await supabase.from("experiences").select("rank_for_role").not("rank_for_role", "is", null)
    .order("rank_for_role", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("experiences").update({ rank_for_role: (last?.rank_for_role ?? 0) + 1 })
    .eq("id", experienceId).is("rank_for_role", null);
  if (error) return Response.json({ error: "could_not_save" }, { status: 500 });
  // Its first rating, in the background.
  await inngest.send({ name: EVIDENCE_CHANGED, data: { candidateId: auth.user.id, experienceId } });
  return Response.json({ ok: true });
}

// Takes an experience out of the candidate's stories; it returns to "More from your CV".
export async function DELETE(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });
  const { experienceId } = (await request.json().catch(() => ({}))) as { experienceId?: unknown };
  if (typeof experienceId !== "string") return Response.json({ error: "invalid" }, { status: 400 });
  const { error } = await supabase.from("experiences").update({ rank_for_role: null }).eq("id", experienceId);
  return error ? Response.json({ error: "could_not_save" }, { status: 500 }) : Response.json({ ok: true });
}
