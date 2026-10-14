import type { SupabaseClient } from "@supabase/supabase-js";

// Screen 4 answers (AT-08). Yes adds the candidate's example to the evidence sprint;
// no records a gap; not sure keeps it as an open question. Nothing else changes status:
// a missing item is not a gap until the candidate says so.

export type ExpectationAnswer = "yes" | "no" | "unsure";

// Approved wording, by template (tone guard, D-34).
export function expectationQuestion(e: { area: string; source: string }, title: string | null): string {
  const role = title?.trim() ? `${title.trim()} roles` : "Roles like this";
  return e.source === "in_ad"
    ? `This role asks for ${e.area}. Have you done this?`
    : `${role} usually involve ${e.area}. Have you done this?`;
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

// The verdict that opens Step 4 (D-34).
export function expectationVerdict(rows: { status: string; answer: string }[]): string {
  const total = rows.length;
  const found = rows.filter((r) => r.status === "found").length;
  const missing = rows.filter((r) => r.status !== "found");
  const unanswered = missing.filter((r) => r.answer === "unanswered").length;
  const head = `This role usually asks for ${total} ${total === 1 ? "thing" : "things"}. Your stories already show ${found}.`;
  if (!missing.length) return `${head} Nothing is missing.`;
  if (!unanswered) return `${head} You've answered for the ${word(missing.length)} we didn't find.`;
  return `${head} ${capital(word(missing.length))} we didn't find${missing.length === 1 ? " is" : " are"} below. ` +
    `If you've done ${missing.length === 1 ? "it" : "them"}, tell us and we'll add ${missing.length === 1 ? "it" : "them"} to your stories.`;
}

export async function answerExpectation(
  db: SupabaseClient, candidateId: string,
  req: { expectationId: string; answer: ExpectationAnswer; example?: string | null },
): Promise<{ ok: true; addedExperienceId: string | null } | { ok: false; error: "not_found" | "example_required" | "could_not_save" }> {
  const { data: exp } = await db.from("expectations").select("id, area, source, target_role_id, status")
    .eq("id", req.expectationId).maybeSingle();
  if (!exp) return { ok: false, error: "not_found" };
  const { data: role } = await db.from("target_roles").select("title").eq("id", exp.target_role_id).maybeSingle();
  const question = expectationQuestion(exp, role?.title ?? null);

  let addedExperienceId: string | null = null;
  if (req.answer === "yes") {
    const example = req.example?.trim();
    if (!example) return { ok: false, error: "example_required" };
    // Joins the sprint after the experiences already chosen for this role.
    const { data: ranked } = await db.from("experiences").select("rank_for_role").not("rank_for_role", "is", null)
      .order("rank_for_role", { ascending: false }).limit(1);
    const nextRank = ((ranked?.[0]?.rank_for_role as number | undefined) ?? 0) + 1;
    const added = await db.from("experiences").insert({
      candidate_id: candidateId, job_label: `Added by you: ${exp.area}`, original_text: example.slice(0, 2000),
      rank_for_role: nextRank, source_type: "candidate_answer",
    }).select("id").single();
    if (added.error) return { ok: false, error: "could_not_save" };
    addedExperienceId = added.data.id as string;
  }

  const updated = await db.from("expectations").update({
    answer: req.answer,
    ...(addedExperienceId ? { status: "found", matched_experience_id: addedExperienceId } : {}),
  }).eq("id", exp.id);
  if (updated.error) return { ok: false, error: "could_not_save" };

  await db.from("probes").insert({
    candidate_id: candidateId, trigger: "expectation", target_id: exp.id, question,
    answer: req.answer === "yes" ? req.example?.trim() ?? "yes" : req.answer,
    resulting_action: req.answer === "yes" ? "added_to_sprint" : req.answer === "no" ? "gap_recorded" : "left_open",
    source_type: "candidate_answer",
  });
  return { ok: true, addedExperienceId };
}
