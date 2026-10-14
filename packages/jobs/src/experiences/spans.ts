// AT-04: every experience keeps the exact place in the CV text it came from.
// Exact match first; then a match that tolerates differences in spacing and line breaks.
export function locate(cvText: string, text: string): [number, number] | null {
  const exact = cvText.indexOf(text);
  if (exact >= 0) return [exact, exact + text.length];
  const words = text.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length || !words[0]) return null;
  const match = new RegExp(words.join("\\s+")).exec(cvText);
  return match ? [match.index, match.index + match[0].length] : null;
}
