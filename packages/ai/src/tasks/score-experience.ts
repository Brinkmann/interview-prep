import { z } from "zod";
import type { TaskDefinition } from "../registry";
import { DIMENSIONS, REASONS } from "../scoring";
import { RUBRIC } from "./rubric";

// Rates one experience for interview readiness (Steps 2 and 3). The model returns
// dimension scores, reasons and the card's two coaching lines (D-30); overall and band
// are computed in code (scoring.ts), and the rating guard is applied by the caller.
// The caller checks both lines with the tone and number guards.
const score = z.number().int().min(1).max(7);
const output = z.object({
  scores: z.object(Object.fromEntries(DIMENSIONS.map((d) => [d, score])) as Record<(typeof DIMENSIONS)[number], typeof score>),
  reasons: z.array(z.enum(Object.keys(REASONS) as [keyof typeof REASONS, ...(keyof typeof REASONS)[]])),
  strength: z.string().nullable().describe("What is already strong, in under 15 plain words, or null if nothing is yet"),
  next_step: z.string().nullable().describe("The single most useful thing to add for an interview, as a short question to the candidate, or null if nothing is needed"),
});

export const scoreExperience: TaskDefinition<{ experience: string; evidence?: Record<string, string | null> }, typeof output> = {
  tier: "medium",
  promptVersion: "score_experience@2",
  effort: "low",
  maxTokens: 2000,
  system: [
    "You rate how well one experience from a candidate's CV would stand up if told to an interview panel and probed with follow-up questions.",
    RUBRIC,
    [
      "Then write two short lines to the candidate, as a coach preparing them, in plain words:",
      'strength: what is already strong, for example "A clear before and after, and your own action." No praise words such as great or impressive.',
      'next_step: the one thing that would help most in an interview, as a question about this specific experience, for example "Roughly how much did freight costs fall?" Ask only for what matters for this experience; a timeframe or starting point is not always relevant.',
      "Never put a number in either line that is not in the experience or evidence.",
    ].join(" "),
  ].join("\n\n"),
  buildUserMessage: ({ experience, evidence }) => {
    const extra = evidence
      ? Object.entries(evidence).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "";
    return `<experience>\n${experience}\n</experience>${extra ? `\n<evidence>\n${extra}\n</evidence>` : ""}`;
  },
  output,
};
