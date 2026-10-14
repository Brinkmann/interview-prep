import { redirect } from "next/navigation";
import { hasConsented } from "@/lib/consent";
import { supabaseServer } from "@/lib/supabase/server";
import { DeleteData } from "./delete-data";
import { Page } from "../_ui/shell";
import { ScreenOne } from "./screen-one";

export default async function Start() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  // Created automatically on first sign-in; readable only by this candidate.
  const { data: candidate } = await supabase.from("candidates").select("id, retention_until").maybeSingle();
  if (!candidate) redirect("/sign-in");

  const consented = await hasConsented(supabase);
  // Picking up where they left off: a saved role and CV text mean Step 1 is done.
  const [{ data: role }, { data: cv }] = await Promise.all([
    supabase.from("target_roles").select("id").limit(1).maybeSingle(),
    supabase.from("cv_text").select("id").limit(1).maybeSingle(),
  ]);

  return (
    <Page step={consented ? 1 : null} title={consented ? "Your role and CV" : "Get ready for your interview, using what you've already done"}>
      {consented && role && cv && (
        <div className="card">
          <p><strong>You&apos;ve already started.</strong> Carry on where you left off, or add a new job ad and CV below.</p>
          <div className="actions"><a className="btn primary" href="/found">Continue</a></div>
        </div>
      )}
      <ScreenOne candidateId={data.user.id} consented={consented} />

      <hr style={{ margin: "2.5rem 0 1rem", border: 0, borderTop: "1px solid var(--line)" }} />
      <p className="small muted">
        Signed in as {data.user.email}. We delete everything you give us on{" "}
        {new Date(candidate.retention_until).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}.
      </p>
      <DeleteData />
      <form action="/auth/sign-out" method="post">
        <button type="submit" className="btn link">Sign out</button>
      </form>
    </Page>
  );
}
