import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { estimateCost } from "./pricing";
import { modelFor, TASKS, type TaskInput, type TaskName, type TaskOutput } from "./registry";

// Everything recorded per call. Deliberately holds no prompt or response content.
export interface JobRun {
  candidate_id: string | null;
  job: string;
  task: TaskName;
  model_id: string;
  status: "succeeded" | "failed" | "retried";
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
  duration_ms: number;
}

export interface RunContext {
  candidateId: string | null;
  job: string;
  recordRun: (run: JobRun) => Promise<void>;
  client?: Pick<Anthropic, "messages">;
  // Integrity guard applied after schema validation; a returned reason rejects the
  // output and it is retried once, like invalid output (for example the number guard).
  check?: (output: never) => string | null;
}

export class TaskFailedError extends Error {
  constructor(task: TaskName, reason: string) {
    // Reason only, never model output: it can contain CV text.
    super(`Task ${task} failed: ${reason}`);
    this.name = "TaskFailedError";
  }
}

let defaultClient: Anthropic | undefined;

// The only way any part of the platform calls a model (CLAUDE.md rule 4).
// Output is validated against the task's schema; invalid output is retried once,
// then the task fails visibly.
function parseOutput<S extends z.ZodType>(
  response: Anthropic.Message,
  schema: S,
): { ok: true; data: z.infer<S> } | { ok: false; reason: string } {
  if (response.stop_reason !== "end_turn") return { ok: false, reason: `stopped with ${response.stop_reason}` };
  const text = response.content.find((b) => b.type === "text")?.text;
  if (text === undefined) return { ok: false, reason: "no text in response" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: "output was not valid JSON" };
  }
  const result = schema.safeParse(json);
  return result.success ? { ok: true, data: result.data } : { ok: false, reason: "output did not match schema" };
}

export async function runTask<N extends TaskName>(
  name: N,
  input: TaskInput<N>,
  ctx: RunContext,
): Promise<TaskOutput<N>> {
  const task = TASKS[name];
  const model = modelFor(name);
  const client = ctx.client ?? (defaultClient ??= new Anthropic());

  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    const finalAttempt = attempt === 2;
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: task.maxTokens,
        system: task.system,
        messages: [{ role: "user", content: task.buildUserMessage(input as never) }],
        output_config: { effort: task.effort, format: zodOutputFormat(task.output) },
      });
    } catch (err) {
      // The SDK has already retried rate limits, overloads and network errors.
      if (!(err instanceof Anthropic.APIError)) throw err;
      await ctx.recordRun({
        candidate_id: ctx.candidateId, job: ctx.job, task: name, model_id: model,
        status: finalAttempt ? "failed" : "retried", tokens_in: 0, tokens_out: 0, cost_estimate: 0,
        duration_ms: Date.now() - started,
      });
      if (finalAttempt) throw new TaskFailedError(name, `API error ${err.status ?? "unknown"}`);
      continue;
    }

    let parsed = parseOutput(response, task.output);
    if (parsed.ok && ctx.check) {
      const rejected = ctx.check(parsed.data as never);
      if (rejected) parsed = { ok: false, reason: rejected };
    }
    await ctx.recordRun({
      candidate_id: ctx.candidateId,
      job: ctx.job,
      task: name,
      model_id: model,
      status: parsed.ok ? "succeeded" : finalAttempt ? "failed" : "retried",
      tokens_in: response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
      cost_estimate: estimateCost(model, response.usage),
      duration_ms: Date.now() - started,
    });
    if (parsed.ok) return parsed.data as TaskOutput<N>;
    if (finalAttempt) throw new TaskFailedError(name, parsed.reason);
  }
  throw new TaskFailedError(name, "unreachable");
}
