import { redirect } from "next/navigation";
import { beforeAfter, summaryText } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { Feedback } from "./feedback";

// Screen 6: "Where do I stand now?" (05-phase1-experience.md).
export default async function Summary() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const { data: role } = await supabase.from("target_roles").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const [{ data: exps }, { data: scores }, { data: expectations }, { data: given }] = await Promise.all([
    supabase.from("experiences").select("id, source_type"),
    supabase.from("scores").select("experience_id, band, reasons, created_at"),
    role ? supabase.from("expectations").select("status, answer").eq("target_role_id", role.id) : Promise.resolve({ data: [] }),
    supabase.from("feedback").select("id").limit(1),
  ]);
  const { before, now } = beforeAfter(exps ?? [], scores ?? []);
  const notFound = (expectations ?? []).filter((e) => e.status === "not_found");
  const gaps = notFound.filter((e) => e.answer === "no").length;
  // Not sure, or not answered yet: still open, never counted as a gap (skip guard).
  const open = notFound.filter((e) => e.answer === "unsure" || e.answer === "unanswered").length;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>Where do I stand now?</h1>
      <p>{summaryText(before, now, gaps, open)}</p>
      <p>
        <a href="/found">Your experiences</a> · <a href="/sprint">Evidence sprint</a> · <a href="/expects">What this role expects</a> ·{" "}
        <a href="/claims">Claim checks</a>
      </p>
      <hr style={{ margin: "2rem 0" }} />
      {given?.length ? <p>Thank you for your feedback.</p> : <Feedback />}
    </main>
  );
}
