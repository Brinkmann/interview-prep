import { redirect } from "next/navigation";
import { expectationQuestion } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { KeepFresh } from "../found/keep-fresh";
import { ActionBar, Page } from "../_ui/shell";
import { Spinner } from "../_ui/working";
import { Answer } from "./answer";

// Step 4, Check for gaps (05-phase1-experience.md; D-34, D-38, D-40).
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
  const short = (t: string) => (t.length > 70 ? `${t.slice(0, 70)}…` : t);
  const found = list.filter((e) => e.status === "found").length;
  const open = list.filter((e) => e.status === "not_found" && e.answer === "unanswered");

  return (
    <Page
      step={4}
      title="Am I missing anything?"
      task={[
        "See what this role usually asks for and what your stories already show.",
        "For anything we didn't find, tell us whether you've done it.",
        "Anything you have done is added to your stories.",
      ]}
      bar={<ActionBar back="/sprint" hint={list.length ? `${open.length} still to answer` : "Still working…"} next={{ href: "/claims", text: "Next: prepare for challenges", disabled: !list.length }} />}
    >
      {!list.length ? (
        <>
          <Spinner text={`Working out what ${roleName} role would normally ask for. This usually takes under a minute.`} />
          <KeepFresh />
        </>
      ) : (
        <>
          <div className="card">
            <h2>Your stories already show {found} of the {list.length} things this role usually asks for.</h2>
            <p className="muted">{open.length ? `${open.length} still to answer below.` : "You've answered everything."}</p>
            <div className="tablewrap">
              <table className="table">
                <thead><tr><th>What the role asks for</th><th>From</th><th>In your stories</th></tr></thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id}>
                      <td>{e.area[0]!.toUpperCase() + e.area.slice(1)}</td>
                      <td className="small muted">{e.source === "in_ad" ? "In the ad" : "Typical for this role"}</td>
                      <td>
                        {e.status === "found" ? (
                          <><span className="label yes">{e.answer === "partly" ? "Partly" : "Yes"}</span>{" "}
                            <span className="small muted">{textOf(e.matched_experience_id) ? short(textOf(e.matched_experience_id)!) : ""}</span></>
                        ) : e.answer === "no" ? <span className="label gap">A gap to prepare for</span>
                          : e.answer === "unsure" ? <span className="label open">Open question</span>
                          : <span className="label open">Not found yet</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {open.map((e) => <Answer key={e.id} id={e.id} question={expectationQuestion(e, role.title)} />)}
          {list.some((e) => e.answer === "yes" || e.answer === "partly") && (
            <p className="small muted">The examples you added are waiting in <a href="/sprint">Build your stories</a>.</p>
          )}
        </>
      )}
    </Page>
  );
}
