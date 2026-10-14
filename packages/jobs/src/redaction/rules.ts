// Step 3 of the pipeline: pattern rules for labelled personal details an employer
// must not use (06-phase0-1-build.md). Rules only fire on labels, so a job title or
// a sentence that mentions these words in passing is left alone.
export type RuleCategory = "date_of_birth" | "age" | "gender" | "marital_status" | "nationality";

const RULES: { category: RuleCategory; pattern: RegExp }[] = [
  { category: "date_of_birth", pattern: /\b(?:date\s+of\s+birth|d\.?\s?o\.?\s?b\.?|birth\s*date|born(?:\s+on)?)\s*[:\-–]?\s*[^\n]{0,40}?\d{4}\b/gi },
  { category: "age", pattern: /\bage(?:d)?\s*[:\-–]?\s*\d{1,2}\b(?:\s*(?:years|yrs)(?:\s+old)?)?/gi },
  { category: "age", pattern: /\b\d{1,2}\s*(?:years|yrs)\s+old\b/gi },
  { category: "gender", pattern: /\b(?:gender|sex)\s*[:\-–]\s*[^\n,;|]{1,30}/gi },
  { category: "marital_status", pattern: /\bmarital\s+status\s*[:\-–]\s*[^\n,;|]{1,30}/gi },
  { category: "nationality", pattern: /\b(?:nationality|citizenship)\s*[:\-–]\s*[^\n,;|]{1,40}/gi },
];

export interface Removal {
  category: string;
  excerpt: string;
  // Placeholder left in the text, so a restore puts the excerpt back where it was (D-27).
  marker: string | null;
}

// Hands out "[removed 1]", "[removed 2]" ... for one CV.
export function markerSequence() {
  let n = 0;
  return () => `[removed ${++n}]`;
}

export function applyRules(text: string, nextMarker: () => string): { text: string; removals: Removal[] } {
  const removals: Removal[] = [];
  let out = text;
  for (const { category, pattern } of RULES) {
    out = out.replace(pattern, (match) => {
      const marker = nextMarker();
      removals.push({ category, excerpt: match.trim(), marker });
      return marker;
    });
  }
  return { text: out, removals };
}

// Removes exact excerpts flagged by the model. Model output can only remove text,
// never add or change it, and a span not found in the CV is ignored.
export function removeExcerpts(
  text: string,
  spans: { category: string; text: string }[],
  nextMarker: () => string,
): { text: string; removals: Removal[] } {
  const removals: Removal[] = [];
  let out = text;
  for (const span of spans) {
    const excerpt = span.text.trim();
    if (!excerpt || !out.includes(excerpt)) continue;
    const marker = nextMarker();
    out = out.split(excerpt).join(marker);
    removals.push({ category: span.category, excerpt, marker });
  }
  return { text: out, removals };
}

export function isRemovedMarker(s: string): boolean {
  return /^\[removed \d+\]$/.test(s);
}
