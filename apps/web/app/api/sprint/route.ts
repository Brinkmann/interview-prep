import { runTask, TaskFailedError } from "@interview-prep/ai";
import { recordJobRun } from "@interview-prep/db";
import { EVIDENCE_CHANGED, inngest, isStep, parseAnswer, saveAnswer, skipStep, sprintItems } from "@interview-prep/jobs";
import { supabaseServer } from "@/lib/supabase/server";

// Screen 3: one sprint answer at a time. "parse" turns the answer into evidence fields
// for the candidate to check; "save" stores what they confirmed; "skip" records the
// question as not answered. Every read and write runs as the candidate.
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "signed_out" }, { status: 401 });
  const candidateId = auth.user.id;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { action, experienceId } = body;
  if (typeof experienceId !== "string") return Response.json({ error: "invalid" }, { status: 400 });

  // The question is always worked out on the server, from what is still missing.
  const { items } = await sprintItems(supabase);
  const item = items.find((i) => i.id === experienceId);
  if (!item || !item.next || !item.question) return Response.json({ error: "nothing_to_ask" }, { status: 409 });

  if (action === "skip") {
    const result = await skipStep(supabase, candidateId, item.id, item.next, item.question);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  }

  const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 2000) : "";
  if (!answer) return Response.json({ error: "empty" }, { status: 400 });

  if (action === "parse") {
    try {
      const fields = await parseAnswer(
        (input, check) => runTask("parse_sprint_answer", input, { candidateId, job: "sprint.parse", recordRun: recordJobRun, check }),
        item, answer,
      );
      return Response.json({ step: item.next, fields });
    } catch (err) {
      if (err instanceof TaskFailedError) return Response.json({ error: "could_not_read" }, { status: 502 });
      throw err;
    }
  }

  if (action === "save") {
    if (body.step !== item.next || !isStep(body.step)) return Response.json({ error: "stale" }, { status: 409 });
    const fields = typeof body.fields === "object" && body.fields ? body.fields as Record<string, string> : {};
    const isEstimate = body.isEstimate === true ? true : body.isEstimate === false ? false : null;
    const basis = typeof body.basis === "string" ? body.basis : null;
    const result = await saveAnswer(supabase, candidateId, {
      experienceId: item.id, step: item.next, question: item.question, answer, fields, isEstimate, basis,
    });
    if (!result.ok) return Response.json(result, { status: result.error === "could_not_save" ? 500 : 400 });
    await inngest.send({ name: EVIDENCE_CHANGED, data: { candidateId, experienceId: item.id } });
    return Response.json(result);
  }
  return Response.json({ error: "invalid" }, { status: 400 });
}
