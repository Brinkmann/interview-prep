import { runTask, TaskFailedError } from "@interview-prep/ai";
import { recordJobRun } from "@interview-prep/db";
import {
  confirmAnswer, EVIDENCE_CHANGED, finishStory, inngest, openStory, proposeAnswer, skipQuestion, sprintItems,
} from "@interview-prep/jobs";
import { toState } from "@/lib/sprint";
import { supabaseServer } from "@/lib/supabase/server";

// Step 3, Build your stories (D-32, D-33). Every read and write runs as the candidate,
// under row-level security; model calls go through runTask with the guards applied.

async function signedIn() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, candidateId: data.user.id } : null;
}

export async function GET() {
  const auth = await signedIn();
  if (!auth) return Response.json({ error: "signed_out" }, { status: 401 });
  const { items } = await sprintItems(auth.supabase);
  return Response.json({ items: items.map(toState) });
}

export async function POST(request: Request) {
  const auth = await signedIn();
  if (!auth) return Response.json({ error: "signed_out" }, { status: 401 });
  const { supabase, candidateId } = auth;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { action, experienceId } = body;
  if (typeof experienceId !== "string") return Response.json({ error: "invalid" }, { status: 400 });

  const load = async () => {
    const all = await sprintItems(supabase);
    return { ...all, item: all.items.find((i) => i.id === experienceId) };
  };
  let { item, role, graduate } = await load();
  if (!item) return Response.json({ error: "not_found" }, { status: 404 });
  const ctx = { candidateId, job: "sprint", recordRun: recordJobRun };
  const ask = async () => {
    await openStory(supabase, candidateId, item!, { role, graduate }, (input, check) =>
      runTask("next_sprint_question", input, { ...ctx, check }));
    ({ item } = await load());
  };

  try {
    if (action === "open") {
      await ask();
    } else if (action === "answer") {
      const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 2000) : "";
      if (!answer) return Response.json({ error: "empty" }, { status: 400 });
      const proposal = await proposeAnswer(item, answer, (input, check) => runTask("parse_sprint_answer", input, { ...ctx, check }));
      return Response.json(proposal, { status: proposal.ok ? 200 : 409 });
    } else if (action === "confirm") {
      const answer = typeof body.answer === "string" ? body.answer.trim() : "";
      const s = (body.story ?? {}) as Record<string, unknown>;
      const text = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : null);
      const result = await confirmAnswer(supabase, candidateId, item, {
        answer, story: { situation: text("situation"), action: text("action"), result: text("result") },
        isEstimate: body.isEstimate === true ? true : body.isEstimate === false ? false : null,
        basis: typeof body.basis === "string" ? body.basis : null,
      });
      if (!result.ok) return Response.json(result, { status: result.error === "could_not_save" ? 500 : 400 });
      // The rating is refreshed in the background, under the rating guard.
      await inngest.send({ name: EVIDENCE_CHANGED, data: { candidateId, experienceId: item.id } });
      ({ item } = await load());
      await ask();
    } else if (action === "skip") {
      const result = await skipQuestion(supabase, item);
      if (!result.ok) return Response.json(result, { status: 409 });
      ({ item } = await load());
      await ask();
    } else if (action === "finish") {
      await finishStory(supabase, candidateId, item);
      ({ item } = await load());
    } else {
      return Response.json({ error: "invalid" }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof TaskFailedError) return Response.json({ error: "could_not_read" }, { status: 502 });
    throw err;
  }
  return Response.json({ item: toState(item!) });
}
