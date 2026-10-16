import { redirect } from "next/navigation";
import { hasConsented } from "@/lib/consent";
import { supabaseServer } from "@/lib/supabase/server";
import { DeleteData } from "./delete-data";
import { Page } from "../_ui/shell";
import { ScreenOne, Welcome } from "./screen-one";

export default async function Start() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  // Created automatically on first sign-in; readable only by this candidate.
  const { data: candidate } = await supabase.from("candidates").select("id, retention_until").maybeSingle();
  if (!candidate) redirect("/sign-in");

  const consented = await hasConsented(supabase);
  if (!consented) {
    return (
      <Page step={null} title="Get ready for your interview, using what you've already done">
        <Welcome />
      </Page>
    );
  }
  // Picking up where they left off: a saved role and CV text mean Step 1 is done.
  const [{ data: role }, { data: cv }] = await Promise.all([
    supabase.from("target_roles").select("id").limit(1).maybeSingle(),
    supabase.from("cv_text").select("id").limit(1).maybeSingle(),
  ]);
  const alreadyDone = !!role && !!cv;

  return (
    <Page
      step={1}
      title="Your role and CV"
      task={alreadyDone
        ? ["You've already given a job ad and CV. Continue with them using the button at the bottom.", "Or paste a new job ad and upload a CV below to start again with a different role."]
        : ["Paste the job ad and save it.", "Upload your CV.", "Check what we removed, then continue."]}
    >
      <ScreenOne candidateId={data.user.id} alreadyDone={alreadyDone} />
      <details className="card">
        <summary>Your account and data</summary>
        <p className="small muted">
          Signed in as {data.user.email}. We delete everything you give us on{" "}
          {new Date(candidate.retention_until).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
        <DeleteData />
        <form action="/auth/sign-out" method="post"><button type="submit" className="btn quiet">Sign out</button></form>
      </details>
    </Page>
  );
}
