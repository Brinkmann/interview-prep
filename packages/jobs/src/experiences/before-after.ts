import type { Band } from "@interview-prep/ai";
import type { ScoreRow } from "./summary";

// Step 6, Where you stand (D-36, AT-11). "When you started" and "now" cover the same
// stories: the CV experiences chosen for this role, first rating against latest. Stories
// the candidate added are reported separately.
export interface StoryRow { id: string; text: string; source_type: string; rank_for_role: number | null }

const ORDER: Band[] = ["not_yet_a_story", "needs_detail", "interview_ready"];
const empty = (): Record<Band, number> => ({ interview_ready: 0, needs_detail: 0, not_yet_a_story: 0 });

export function beforeAfter(stories: StoryRow[], scores: ScoreRow[]) {
  const first = new Map<string, ScoreRow>();
  const last = new Map<string, ScoreRow>();
  for (const s of scores) {
    if (!first.has(s.experience_id) || s.created_at < first.get(s.experience_id)!.created_at) first.set(s.experience_id, s);
    if (!last.has(s.experience_id) || s.created_at > last.get(s.experience_id)!.created_at) last.set(s.experience_id, s);
  }
  const chosen = stories.filter((s) => s.rank_for_role !== null);
  const fromCv = chosen.filter((s) => s.source_type === "cv");
  const added = chosen.filter((s) => s.source_type !== "cv");
  const before = empty();
  const now = empty();
  const addedNow = empty();
  let movedUp = 0;
  for (const s of fromCv) {
    const a = first.get(s.id);
    const b = last.get(s.id);
    if (!a || !b) continue;
    before[a.band]++;
    now[b.band]++;
    if (ORDER.indexOf(b.band) > ORDER.indexOf(a.band)) movedUp++;
  }
  for (const s of added) {
    const b = last.get(s.id);
    if (b) addedNow[b.band]++;
  }
  // Strongest first: best label, then the role ranking.
  const strongest = chosen.filter((s) => last.get(s.id) && last.get(s.id)!.band !== "not_yet_a_story")
    .sort((x, y) => ORDER.indexOf(last.get(y.id)!.band) - ORDER.indexOf(last.get(x.id)!.band) || x.rank_for_role! - y.rank_for_role!)
    .slice(0, 3);
  return { before, now, added: addedNow, addedCount: added.length, movedUp, strongest, worked: fromCv.length };
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => WORDS[n] ?? String(n);
const stories = (n: number) => `${n} ${n === 1 ? "story" : "stories"}`;

// Approved Step 6 wording (05-phase1-experience.md, revision 2).
export function summaryText(r: ReturnType<typeof beforeAfter>, open: { gaps: string[]; questions: number }): string {
  const now = `You have ${stories(r.now.interview_ready)} ready to tell and ${r.now.needs_detail} almost there`;
  // Only say "up from" when something actually moved up.
  const parts = [r.movedUp
    ? `${now}, up from ${r.before.interview_ready} ready and ${r.before.needs_detail} almost there when you started.`
    : `${now}. None has moved up yet: answering a few questions in Build your stories is the quickest way to strengthen them.`];
  if (r.addedCount) {
    parts.push(`You also added ${word(r.addedCount)} ${r.addedCount === 1 ? "story" : "stories"} of your own.`);
  }
  if (r.strongest.length) parts.push(`Your strongest for this role: ${r.strongest.map((s) => `"${short(s.text)}"`).join(", ")}.`);
  const still: string[] = [];
  if (open.gaps.length) still.push(`${open.gaps.join(" and ")} (you said you haven't done ${open.gaps.length === 1 ? "it" : "them"})`);
  if (open.questions) still.push(`${word(open.questions)} ${open.questions === 1 ? "question" : "questions"} to come back to`);
  if (still.length) parts.push(`Still open: ${still.join("; ")}.`);
  return parts.join(" ");
}

function short(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  return words.length > 8 ? `${words.slice(0, 8).join(" ")}…` : words.join(" ");
}
