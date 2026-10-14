import { createHash } from "node:crypto";

// Screen 1 rule (AT-03): warn when a pasted job ad looks cut off, so the candidate
// can paste the rest before the app reads too little of the role.
export function looksTruncated(ad: string): boolean {
  const text = ad.trim();
  if (text.length < 400) return true;
  const last = text.split("\n").filter((l) => l.trim()).pop()!.trim();
  if (/(\.\.\.|…)$/.test(last)) return true;
  if (/^(read more|show more|see more|view more|more\b)/i.test(last)) return true;
  // A final line that stops mid-sentence: no closing punctuation and ends on a word
  // that cannot end a sentence.
  if (/\b(and|or|the|a|an|to|of|with|for|in|on|our|your|we|you|is|are|will)$/i.test(last)) return true;
  return false;
}

export function adHash(ad: string): string {
  return createHash("sha256").update(ad.trim().replace(/\s+/g, " ")).digest("hex");
}
