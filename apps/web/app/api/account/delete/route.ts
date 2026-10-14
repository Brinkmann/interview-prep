import { DELETE_REQUESTED, inngest } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";

// US-06: delete everything now. Runs the same purge job as the retention date.
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.redirect(new URL("/sign-in", request.url), 303);

  await inngest.send({ name: DELETE_REQUESTED, data: { candidateId: data.user.id } });
  await supabase.auth.signOut();
  return Response.redirect(new URL("/sign-in?deleted=1", request.url), 303);
}
