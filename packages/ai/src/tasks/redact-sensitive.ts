import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Redaction step 4 (06-phase0-1-build.md): flag health, ethnicity and religion
// statements in free text so they can be removed before the CV text is stored.
const output = z.object({
  spans: z.array(
    z.object({
      category: z.enum(["health", "ethnicity", "religion"]),
      text: z.string().describe("The exact text to remove, copied character for character from the CV"),
    }),
  ),
});

export const redactSensitive: TaskDefinition<{ cvText: string }, typeof output> = {
  tier: "small",
  promptVersion: "redact_sensitive@1",
  effort: "low",
  maxTokens: 4000,
  system: [
    "You find personal details in a CV that an employer must not use to judge a candidate.",
    "Flag only statements about the candidate's own health or disability, ethnicity or race, and religion or belief.",
    "Do not flag job titles, employers, industries or skills that merely contain such words,",
    'for example "Health and Safety Coordinator", "Mental Health Nurse" or "Catholic Education Office".',
    "Copy each flagged statement exactly as it appears so it can be found and removed.",
    "Return an empty list when there is nothing to flag.",
  ].join(" "),
  buildUserMessage: ({ cvText }) => `<cv>\n${cvText}\n</cv>`,
  output,
};
