// Integrity guards (06-phase0-1-build.md) that apply to model output.

// Number guard: every number the model writes must appear in the CV text or a
// candidate answer. Numbers are compared after removing thousands separators.
export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,(?=\d{3}\b)/g, "").replace(/\.0+$/, ""));
}

export function unsupportedNumbers(output: string, sources: string[]): string[] {
  const allowed = new Set(sources.flatMap(numbersIn));
  return [...new Set(numbersIn(output).filter((n) => !allowed.has(n)))];
}

export function numberGuard(sources: string[], fields: (out: never) => string[]) {
  return (out: never): string | null =>
    unsupportedNumbers(fields(out).join("\n"), sources).length ? "output contained a number not in the source" : null;
}

// Tone guard: model phrasing shown to the candidate must not flatter.
const BANNED_PRAISE = /\b(great|excellent|impressive|amazing|fantastic|outstanding|brilliant|well done|strong (?:story|example)|wonderful|superb)\b/i;
export function flatters(text: string): boolean {
  return BANNED_PRAISE.test(text);
}
