import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Screen 2: every achievement or duty in the redacted CV, copied exactly so each
// keeps its source span (AT-04). Text that cannot be found in the CV is dropped by the caller.
const output = z.object({
  graduate: z.boolean().describe("True if the candidate is a recent graduate whose experience is mainly study, volunteer or part-time work"),
  experiences: z.array(
    z.object({
      job_label: z.string().describe('The role it belongs to, for example "Operations Manager, Acme Logistics (2019 to 2023)"'),
      text: z.string().describe("The achievement or duty, copied character for character from the CV"),
    }),
  ),
});

export const extractExperiences: TaskDefinition<{ cvText: string }, typeof output> = {
  tier: "small",
  promptVersion: "extract_experiences@1",
  effort: "low",
  maxTokens: 8000,
  system: [
    "You list every achievement and duty in a CV that a candidate could talk about in an interview.",
    "Take each bullet point or sentence that describes something the candidate did or was responsible for, in paid work, study, volunteering or part-time work.",
    "Copy each one exactly as written, character for character, without fixing, shortening or combining anything.",
    "Skip headings, contact details, skill lists, referees and anything shown as [removed N].",
    "Give each one the role it belongs to, as written in the CV.",
  ].join(" "),
  buildUserMessage: ({ cvText }) => `<cv>\n${cvText}\n</cv>`,
  output,
};
