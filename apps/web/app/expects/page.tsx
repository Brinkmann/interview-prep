import { redirect } from "next/navigation";
import { expectationQuestion, expectationVerdict } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { KeepFresh } from "../found/keep-fresh";
import { NextStep, Page } from "../_ui/shell";
import { Answer } from "./answer";
import { Spinner } from "../_ui/working";

// Step 4, Check for gaps (05-phase1-experience.md, revision 2; D-34).
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
  const roleName = role.title?.trim() ? `a ${role.title.trim()}` : "this";
  const short = (t: string) => (t.length > 80 ? `${t.slice(0, 80)}…` : t);
  const open = list.filter((e) => e.status === "not_found" && e.answer === "unanswered");

  return (
    <Page step={4} title="Am I missing anything?">
      {!list.length ? (
        <>
          <Spinner text={`Working out what ${roleName} role would normally ask for. This usually takes under a minute.`} />
          <KeepFresh />
        </>
      ) : (
        <>
          <p className="lead">{expectationVerdict(list)}</p>
          <table className="plain">
            <thead><tr><th>What the role asks for</th><th>Where it comes from</th><th>In your stories?</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>{e.area[0]!.toUpperCase() + e.area.slice(1)}</td>
                  <td className="small">{e.source === "in_ad" ? "In the ad" : "Typical for this role"}</td>
                  <td className="small">
                    {e.status === "found"
                      ? <>{e.answer === "partly" ? "Partly" : "Yes"}{textOf(e.matched_experience_id) ? `: ${short(textOf(e.matched_experience_id)!)}` : ""}</>
                      : e.answer === "no" ? "A gap to prepare for"
                      : e.answer === "unsure" ? "Open question"
                      : "Not found"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {open.map((e) => <Answer key={e.id} id={e.id} question={expectationQuestion(e, role.title)} />)}
          {list.some((e) => e.answer === "yes") && (
            <p className="small">The examples you added are waiting in <a href="/sprint">Build your stories</a>.</p>
          )}
          <NextStep href="/claims">Next: prepare for challenges</NextStep>
        </>
      )}
    </Page>
  );
}
