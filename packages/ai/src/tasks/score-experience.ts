import { z } from "zod";
import type { TaskDefinition } from "../registry";
import { DIMENSIONS, REASONS } from "../scoring";
import { RUBRIC } from "./rubric";

// Phase 1 task: rates one experience for interview readiness (Screen 2 and 3).
// The model returns dimension scores and reasons only; overall and band are computed
// in code (scoring.ts), and the rating guard is applied by the caller.
const score = z.number().int().min(1).max(7);
const output = z.object({
  scores: z.object(Object.fromEntries(DIMENSIONS.map((d) => [d, score])) as Record<(typeof DIMENSIONS)[number], typeof score>),
  reasons: z.array(z.enum(Object.keys(REASONS) as [keyof typeof REASONS, ...(keyof typeof REASONS)[]])),
});

export const scoreExperience: TaskDefinition<{ experience: string; evidence?: Record<string, string | null> }, typeof output> = {
  tier: "medium",
  promptVersion: "score_experience@1",
  effort: "low",
  maxTokens: 2000,
  system: [
    "You rate how well one experience from a candidate's CV would stand up if told to an interview panel and probed with follow-up questions.",
    RUBRIC,
  ].join("\n\n"),
  buildUserMessage: ({ experience, evidence }) => {
    const extra = evidence
      ? Object.entries(evidence).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "";
    return `<experience>\n${experience}\n</experience>${extra ? `\n<evidence>\n${extra}\n</evidence>` : ""}`;
  },
  output,
};
