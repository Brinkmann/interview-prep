import type { z } from "zod";
import { MODELS, type ModelId, type Tier } from "./pricing";
import { redactSensitive } from "./tasks/redact-sensitive";

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
} as const;

export type TaskName = keyof typeof TASKS;
export type TaskInput<N extends TaskName> = Parameters<(typeof TASKS)[N]["buildUserMessage"]>[0];
export type TaskOutput<N extends TaskName> = z.infer<(typeof TASKS)[N]["output"]>;

export function modelFor(name: TaskName): ModelId {
  return MODELS[TASKS[name].tier];
}
