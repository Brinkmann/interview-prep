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
    <Page
      step={3}
      title="Build your stories"
      task={[
        "Answer the question for the story on screen. Each answer is added to your story.",
        "When a story is done, we move you to the next one automatically.",
        "Use the strip of stories to jump between them at any time.",
      ]}
    >
      {items.length === 0 ? (
        <p>We haven&apos;t picked your experiences for this role yet. <a href="/found">Go back to your strongest material</a>.</p>
      ) : (
        <>
          {graduate && <p className="muted">We&apos;ll focus on your study, volunteering and part-time work.</p>}
          <Sprint initial={items.map(toState)} />
        </>
      )}
    </Page>
  );
}
