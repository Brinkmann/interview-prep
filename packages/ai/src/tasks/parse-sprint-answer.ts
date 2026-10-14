import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Step 3: folds the candidate's answer into their story. The candidate sees the result
// with "Did we get this right?" before anything is saved (edit guard). The caller applies
// the number guard: every number must be in the CV line, the story or the answers.
const output = z.object({
  situation: z.string().nullable(),
  action: z.string().nullable(),
  result: z.string().nullable(),
  numbers_labelled: z.enum(["exact", "estimate", "not_said"]).describe("Whether the candidate said the figures in this answer are exact or an estimate"),
});

export const parseSprintAnswer: TaskDefinition<{
  experience: string;
  story: { situation: string | null; action: string | null; result: string | null } | null;
  question: string;
  answer: string;
}, typeof output> = {
  tier: "medium",
  promptVersion: "parse_sprint_answer@2",
  effort: "low",
  maxTokens: 2000,
  system: [
    "You update a candidate's interview story, in Situation, Action and Result form, with their answer to one question.",
    "Keep the candidate's own words as closely as possible. Add what the answer gives to the right part; keep everything already in the story unless the answer corrects it.",
    "Write in the first person, as the candidate would tell it. One or two sentences per part.",
    'Never add, round, convert or invent a number or a detail. Keep words like "about" or "roughly" that the candidate used.',
    "Leave a part null if neither the story nor the answer gives it.",
  ].join(" "),
  buildUserMessage: ({ experience, story, question, answer }) => [
    `<cv_line>\n${experience}\n</cv_line>`,
    `<story>\nSituation: ${story?.situation ?? "(missing)"}\nAction: ${story?.action ?? "(missing)"}\nResult: ${story?.result ?? "(missing)"}\n</story>`,
    `<question>${question}</question>`,
    `<answer>\n${answer}\n</answer>`,
  ].join("\n"),
  output,
};
