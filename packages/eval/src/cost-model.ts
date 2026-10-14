import { estimateCost, MODELS, type Tier } from "@interview-prep/ai";

// AI cost per user (04-architecture.md, Cost model), priced from the current list
// prices in packages/ai/src/pricing.ts. Token counts are per call and include
// thinking tokens, which are billed as output. Phase 1 tasks are checked against
// measured calls where they exist; later-phase tasks are estimates to revisit when built.

export interface Call {
  task: string;
  tier: Tier;
  tokensIn: number;
  tokensOut: number;
  measured?: boolean;
}

export const CALLS: Record<string, Call> = {
  redact: { task: "CV redaction (step 4)", tier: "small", tokensIn: 3_000, tokensOut: 400 },
  extract: { task: "Extract experiences", tier: "small", tokensIn: 3_500, tokensOut: 3_000 },
  rank: { task: "Rank experiences for the role", tier: "medium", tokensIn: 3_500, tokensOut: 1_000 },
  // Measured 14 Oct 2026: 14 calls averaged 1,221 in and 82 out at low effort.
  score: { task: "Score one experience", tier: "medium", tokensIn: 1_250, tokensOut: 100, measured: true },
  probe: { task: "Ask and parse one probe", tier: "small", tokensIn: 1_200, tokensOut: 400 },
  expectations: { task: "Build role expectations", tier: "medium", tokensIn: 3_500, tokensOut: 1_500 },
  claims: { task: "Check claims", tier: "medium", tokensIn: 3_500, tokensOut: 1_200 },
  decode: { task: "Decode the role", tier: "medium", tokensIn: 4_000, tokensOut: 2_000 },
  briefCard: { task: "Organisation brief card (cache miss)", tier: "medium", tokensIn: 6_000, tokensOut: 1_500 },
  mockTurn: { task: "Mock interview turn (text)", tier: "medium", tokensIn: 3_000, tokensOut: 500 },
  answerScore: { task: "Score one mock answer", tier: "medium", tokensIn: 2_000, tokensOut: 700 },
  drill: { task: "Mark one drill card", tier: "small", tokensIn: 900, tokensOut: 250 },
  synthesis: { task: "Large-model synthesis document", tier: "large", tokensIn: 12_000, tokensOut: 4_000 },
};

// Usage from the architecture table. Organisation cards come mostly from the shared
// cache; one in three is assumed to be a cache miss that this user pays for.
const CACHE_MISS = 1 / 3;
export const USAGE: Record<"free" | "sprint", Partial<Record<keyof typeof CALLS, number>>> = {
  free: {
    redact: 1, extract: 1, rank: 1, score: 25, probe: 3, expectations: 1, claims: 1,
    decode: 1, briefCard: 3 * CACHE_MISS, mockTurn: 5, answerScore: 5, drill: 10,
  },
  sprint: {
    redact: 1, extract: 1, rank: 1, score: 25 + 15, probe: 30, expectations: 1, claims: 1,
    decode: 2, briefCard: 12 * CACHE_MISS, mockTurn: 6 * 8, answerScore: 60, drill: 150, synthesis: 3,
  },
};

export function costOf(call: Call): number {
  return estimateCost(MODELS[call.tier], { input_tokens: call.tokensIn, output_tokens: call.tokensOut });
}

export function costPerUser(tier: "free" | "sprint") {
  const lines = Object.entries(USAGE[tier]).map(([key, count]) => {
    const call = CALLS[key]!;
    return { task: call.task, model: MODELS[call.tier], calls: count!, cost: costOf(call) * count! };
  });
  return { lines, total: lines.reduce((s, l) => s + l.cost, 0) };
}

export const CEILINGS = { free: 0.3, sprint: 8 } as const;
