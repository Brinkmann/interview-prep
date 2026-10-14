import type { Band } from "@interview-prep/ai";
import type { ScoreRow } from "./summary";

// Screen 6 (AT-11): "when you started" is each CV experience's first rating; "now" is the
// latest rating of every experience, including ones the candidate added.
export function beforeAfter(experiences: { id: string; source_type: string }[], scores: ScoreRow[]) {
  const first = new Map<string, ScoreRow>();
  const last = new Map<string, ScoreRow>();
  for (const s of scores) {
    if (!first.has(s.experience_id) || s.created_at < first.get(s.experience_id)!.created_at) first.set(s.experience_id, s);
    if (!last.has(s.experience_id) || s.created_at > last.get(s.experience_id)!.created_at) last.set(s.experience_id, s);
  }
  const empty = (): Record<Band, number> => ({ interview_ready: 0, needs_detail: 0, not_yet_a_story: 0 });
  const before = empty();
  const now = empty();
  let movedUp = 0;
  const order: Band[] = ["not_yet_a_story", "needs_detail", "interview_ready"];
  for (const e of experiences) {
    const a = first.get(e.id);
    const b = last.get(e.id);
    if (a && e.source_type === "cv") before[a.band]++;
    if (b) now[b.band]++;
    if (a && b && order.indexOf(b.band) > order.indexOf(a.band)) movedUp++;
  }
  return { before, now, movedUp };
}

function counts(c: Record<Band, number>): string {
  return `${c.interview_ready} interview-ready, ${c.needs_detail} needing detail, ${c.not_yet_a_story} not yet ${c.not_yet_a_story === 1 ? "a story" : "stories"}`;
}

// Approved Screen 6 wording (05-phase1-experience.md).
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function summaryText(before: Record<Band, number>, now: Record<Band, number>, gaps: number, open: number): string {
  const areas = capital(gaps === 1 ? "one expected area is still a gap" : `${word(gaps)} expected areas are still gaps`);
  const questions = open === 1 ? "one question is open" : `${word(open)} questions are open`;
  return `When you started: ${counts(before)}. Now: ${counts(now)}. ${areas} and ${questions}. ` +
    "Your interview evidence is ready for the next step: matching it to what this role needs.";
}
