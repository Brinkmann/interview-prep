import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Screen 3: turns the candidate's answer to one sprint question into evidence fields.
// The caller applies the number guard: every number must appear in the answer or the CV text.
const field = z.string().nullable().describe("In the candidate's own words, or null if the answer does not say");
const output = z.object({
  outcome: field, baseline: field, new_value: field, timeframe: field, estimate_basis: field,
  personal_role: field, team_role: field, verifier: field,
  numbers_labelled: z.enum(["exact", "estimate", "not_said"]).describe("Whether the candidate said their figures are exact or an estimate"),
});

const STEP_FIELDS: Record<string, string> = {
  outcome: "outcome (what changed because of this)",
  change: "baseline (the starting point) and new_value (where it ended up)",
  timeframe: "timeframe (over what period)",
  measure: "estimate_basis (how they know, or how the figure was measured or estimated)",
  role: "personal_role (what they did themselves) and team_role (what the team did)",
  verifier: "verifier (who could confirm it)",
};

export const parseSprintAnswer: TaskDefinition<{ experience: string; question: string; step: string; answer: string }, typeof output> = {
  tier: "small",
  promptVersion: "parse_sprint_answer@1",
  effort: "low",
  maxTokens: 1500,
  system: [
    "You record a candidate's answer to one interview-preparation question as structured evidence.",
    "Fill only the fields the answer actually supports, mainly the ones the question asked for, keeping the candidate's own words as closely as possible.",
    "Never add, round, convert or invent a number or detail. If the answer gives no figure, leave figures out.",
    'Keep words like "about" or "roughly" that the candidate used.',
  ].join(" "),
  buildUserMessage: ({ experience, question, step, answer }) =>
    `<experience>\n${experience}\n</experience>\n<question asks_for="${STEP_FIELDS[step] ?? step}">\n${question}\n</question>\n<answer>\n${answer}\n</answer>`,
  output,
};
