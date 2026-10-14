import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { estimateCost, runTask, TaskFailedError, type JobRun } from "../src";

const CV = "Jane Citizen. Health and Safety Coordinator. I have type 1 diabetes. Practising Buddhist.";

function fakeClient(replies: string[], stop: Anthropic.StopReason = "end_turn") {
  const requests: Anthropic.MessageCreateParams[] = [];
  const client = {
    messages: {
      create: async (req: Anthropic.MessageCreateParams) => {
        requests.push(req);
        const text = replies.shift() ?? "";
        return {
          id: "msg", type: "message", role: "assistant", model: req.model, stop_reason: stop,
          content: [{ type: "text", text }],
          usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        } as unknown as Anthropic.Message;
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
  return { client, requests };
}

function recorder() {
  const runs: JobRun[] = [];
  return { runs, recordRun: async (r: JobRun) => void runs.push(r) };
}

const valid = JSON.stringify({ spans: [{ category: "health", text: "I have type 1 diabetes." }] });

describe("runTask", () => {
  it("returns validated output and records tokens and cost, with no content", async () => {
    const { client, requests } = fakeClient([valid]);
    const rec = recorder();
    const out = await runTask("redact_sensitive", { cvText: CV }, { candidateId: "c1", job: "cv.redact", client, ...rec });

    expect(out.spans).toEqual([{ category: "health", text: "I have type 1 diabetes." }]);
    expect(requests[0]!.model).toBe("claude-haiku-5-5");
    expect(rec.runs).toHaveLength(1);
    expect(rec.runs[0]).toMatchObject({
      candidate_id: "c1", job: "cv.redact", task: "redact_sensitive", model_id: "claude-haiku-5-5",
      status: "succeeded", tokens_in: 1000, tokens_out: 200,
    });
    expect(rec.runs[0]!.cost_estimate).toBeCloseTo(0.0002, 8);
    // Privacy: nothing from the CV or the model's answer is recorded.
    const recorded = JSON.stringify(rec.runs);
    expect(recorded).not.toContain("diabetes");
    expect(recorded).not.toContain("Jane");
  });

  it("retries invalid output once, then succeeds", async () => {
    const { client } = fakeClient(["not json", valid]);
    const rec = recorder();
    const out = await runTask("redact_sensitive", { cvText: CV }, { candidateId: null, job: "t", client, ...rec });
    expect(out.spans).toHaveLength(1);
    expect(rec.runs.map((r) => r.status)).toEqual(["retried", "succeeded"]);
  });

  it("fails visibly after a second invalid output, without revealing content", async () => {
    const bad = JSON.stringify({ spans: [{ category: "politics", text: "I have type 1 diabetes." }] });
    const { client } = fakeClient([bad, bad]);
    const rec = recorder();
    const err = await runTask("redact_sensitive", { cvText: CV }, { candidateId: null, job: "t", client, ...rec })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TaskFailedError);
    expect((err as Error).message).not.toContain("diabetes");
    expect(rec.runs.map((r) => r.status)).toEqual(["retried", "failed"]);
  });

  it("treats a truncated or refused response as invalid", async () => {
    const { client } = fakeClient([valid, valid], "max_tokens");
    const err = await runTask("redact_sensitive", { cvText: CV }, { candidateId: null, job: "t", client, ...recorder() })
      .catch((e: unknown) => e);
    expect((err as Error).message).toContain("stopped with max_tokens");
  });
});

describe("estimateCost", () => {
  it("prices each tier from the list prices", () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
    expect(estimateCost("claude-haiku-5-5", usage)).toBeCloseTo(0.6);
    expect(estimateCost("claude-sonnet-5-5", usage)).toBeCloseTo(12);
    expect(estimateCost("claude-opus-5-5", usage)).toBeCloseTo(24);
  });
});
