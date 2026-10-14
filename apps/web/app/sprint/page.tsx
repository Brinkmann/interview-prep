import { redirect } from "next/navigation";
import { sprintItems } from "@interview-prep/jobs";
import { toState } from "@/lib/sprint";
import { supabaseServer } from "@/lib/supabase/server";
import { Page } from "../_ui/shell";
import { Sprint } from "./sprint";

// Step 3, Build your stories (05-phase1-experience.md, revision 2; D-32, D-33).
export default async function SprintPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/sign-in");
  const { graduate, items } = await sprintItems(supabase);

  return (
    <Page step={3} title="How do I turn these into stories I can tell?">
      {items.length === 0 ? (
        <p>We haven&apos;t picked your experiences for this role yet. <a href="/found">Go back to your strongest material</a>.</p>
      ) : (
        <>
          <p className="lead">
            We&apos;ll take {graduate ? "the experiences from your study, volunteering and part-time work" : "your experiences"} one at a time and build each into a story you can tell:
            the situation, what you did, and what changed. A few questions each, written for that story. Answer what you can and skip the rest.
          </p>
          <Sprint initial={items.map(toState)} />
        </>
      )}
    </Page>
  );
}
