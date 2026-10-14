import { redirect } from "next/navigation";
import { expectationQuestion } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { KeepFresh } from "../found/keep-fresh";
import { Answer } from "./answer";

// Screen 4: "Am I missing anything?" (05-phase1-experience.md).
export default async function Expects() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");

  const { data: role } = await supabase.from("target_roles").select("id, title")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!role) redirect("/start");
  const [{ data: rows }, { data: exps }] = await Promise.all([
    supabase.from("expectations").select("id, area, source, status, answer, matched_experience_id").eq("target_role_id", role.id).order("created_at"),
    supabase.from("experiences").select("id, original_text"),
  ]);
  const list = rows ?? [];
  const textOf = (id: string | null) => (exps ?? []).find((e) => e.id === id)?.original_text;
  const roleName = role.title?.trim() || "this";

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>Am I missing anything?</h1>
      {!list.length ? (
        <>
          <p role="status">We're working out what a {roleName} role would normally call for. This usually takes under a minute.</p>
          <KeepFresh />
        </>
      ) : (
        <>
          <p>The experience a {roleName} role would normally call for, and whether we found it in your evidence.</p>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr><th align="left">Expected area</th><th align="left">Where it comes from</th><th align="left">Status</th></tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #ddd", verticalAlign: "top" }}>
                  <td style={{ padding: "0.5rem 0.5rem 0.5rem 0" }}>{e.area[0]!.toUpperCase() + e.area.slice(1)}</td>
                  <td style={{ padding: "0.5rem" }}>{e.source === "in_ad" ? "In the ad" : "Typical for this role"}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {e.status === "found"
                      ? `Found${textOf(e.matched_experience_id) ? ` (${textOf(e.matched_experience_id)})` : ""}`
                      : "Not found"}
                    {e.status === "not_found" && e.answer === "no" && " · a gap to prepare for"}
                    {e.status === "not_found" && e.answer === "unsure" && " · open question"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.filter((e) => e.status === "not_found" && e.answer === "unanswered").map((e) => (
            <Answer key={e.id} id={e.id} question={expectationQuestion(e, role.title)} />
          ))}
          <p style={{ marginTop: "2rem" }}>
            {list.some((e) => e.answer === "yes") && <><a href="/sprint">Back to the evidence sprint</a> to build up what you added. </>}
            <a href="/claims"><strong>Next: will my claims hold up?</strong></a>
          </p>
        </>
      )}
    </main>
  );
}
