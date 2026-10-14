import { z } from "zod";
import type { TaskDefinition } from "../registry";
import { DIMENSIONS, REASONS, type Band } from "../scoring";
import { RUBRIC } from "./rubric";

// Calibration set tasks (D-16): development only, never used on candidate data.

const BAND_SPEC: Record<Band, string> = {
  interview_ready:
    "Interview-ready (overall 6 to 7): a concrete result with a starting point, the new value, a timeframe and the candidate's own action, stated in the first person.",
  needs_detail:
    "Needs detail (overall 4 to 5): a real result is claimed but one or two of magnitude, starting point, timeframe or personal role are missing, so an interviewer would ask 'by how much?' or 'what did you do?'.",
  not_yet_a_story:
    "Not yet a story (overall 1 to 3): a duty, responsibility or vague claim with no result an interviewer could score.",
};

const writeOutput = z.object({ job_label: z.string(), statement: z.string() });

export const calibrationWriteStatement: TaskDefinition<
  { band: Band; persona: string; industry: string; variation: string },
  typeof writeOutput
> = {
  tier: "large",
  promptVersion: "calibration_write_statement@1",
  effort: "medium",
  maxTokens: 4000,
  system: [
    "You write realistic CV experience statements for a scoring calibration set. Each statement must sit squarely inside the requested level, not on its edge.",
    "Write one to three sentences as they would appear in a real CV. Use a fictional employer. Never include names of real people, dates of birth or other personal details.",
    "Level definitions:",
    ...Object.values(BAND_SPEC),
    RUBRIC,
  ].join("\n"),
  buildUserMessage: ({ band, persona, industry, variation }) =>
    `Level: ${BAND_SPEC[band]}\nCandidate type: ${persona}\nIndustry: ${industry}\nMake it different from typical examples in this way: ${variation}`,
  output: writeOutput,
};

const score = z.number().int().min(1).max(7);
const scoreOutput = z.object({
  scores: z.object(Object.fromEntries(DIMENSIONS.map((d) => [d, score])) as Record<(typeof DIMENSIONS)[number], typeof score>),
  reasons: z.array(z.enum(Object.keys(REASONS) as [keyof typeof REASONS, ...(keyof typeof REASONS)[]])),
});

// The independent check: scores a statement without knowing its intended level.
export const calibrationScoreStatement: TaskDefinition<{ statement: string }, typeof scoreOutput> = {
  tier: "large",
  promptVersion: "calibration_score_statement@1",
  effort: "low",
  maxTokens: 4000,
  system: [
    "You are an experienced interview panel chair. Rate how well this CV experience statement would stand up if told to a panel and probed.",
    RUBRIC,
  ].join("\n\n"),
  buildUserMessage: ({ statement }) => `<statement>\n${statement}\n</statement>`,
  output: scoreOutput,
};
