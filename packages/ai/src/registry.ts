import type { z } from "zod";
import { MODELS, type ModelId, type Tier } from "./pricing";
import { calibrationScoreStatement, calibrationWriteStatement } from "./tasks/calibration";
import { buildExpectations } from "./tasks/build-expectations";
import { checkClaims, claimsJobDates } from "./tasks/check-claims";
import { extractExperiences } from "./tasks/extract-experiences";
import { parseSprintAnswer } from "./tasks/parse-sprint-answer";
import { rankForRole } from "./tasks/rank-for-role";
import { redactSensitive } from "./tasks/redact-sensitive";
import { scoreExperience } from "./tasks/score-experience";

// One entry per AI task (06-phase0-1-build.md, Model gateway).
// Changing tier, prompt or promptVersion requires a passing calibration run.
export interface TaskDefinition<In, Out extends z.ZodType> {
  tier: Tier;
  promptVersion: string;
  // Sampling temperature cannot be set on the current Claude models; effort is the
  // available control, and scoring and classification tasks use the lowest level.
  effort: "low" | "medium" | "high";
  maxTokens: number;
  system: string;
  buildUserMessage: (input: In) => string;
  output: Out;
}

export const TASKS = {
  redact_sensitive: redactSensitive,
  extract_experiences: extractExperiences,
  rank_for_role: rankForRole,
  score_experience: scoreExperience,
  parse_sprint_answer: parseSprintAnswer,
  build_expectations: buildExpectations,
  claims_job_dates: claimsJobDates,
  check_claims: checkClaims,
  calibration_write_statement: calibrationWriteStatement,
  calibration_score_statement: calibrationScoreStatement,
} as const;

export type TaskName = keyof typeof TASKS;
export type TaskInput<N extends TaskName> = Parameters<(typeof TASKS)[N]["buildUserMessage"]>[0];
export type TaskOutput<N extends TaskName> = z.infer<(typeof TASKS)[N]["output"]>;

export function modelFor(name: TaskName): ModelId {
  return MODELS[TASKS[name].tier];
}
