// Anthropic first-party list prices, US$ per million tokens (checked 14 Oct 2026).
// Used only to estimate cost in job_runs; the provider invoice is the source of truth.
export const MODELS = {
  small: "claude-haiku-5-5",
  medium: "claude-sonnet-5-5",
  large: "claude-opus-5-5",
} as const;

export type Tier = keyof typeof MODELS;
export type ModelId = (typeof MODELS)[Tier];

const PRICES: Record<ModelId, { input: number; output: number; cacheRead: number }> = {
  // Haiku 5.5 prices apply to prompts up to 100K tokens; CV-sized prompts stay well under.
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
};

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

// Cache writes are priced at 1.25x input.
export function estimateCost(model: ModelId, usage: TokenUsage): number {
  const p = PRICES[model];
  const perToken = (rate: number) => rate / 1_000_000;
  return (
    usage.input_tokens * perToken(p.input) +
    (usage.cache_creation_input_tokens ?? 0) * perToken(p.input * 1.25) +
    (usage.cache_read_input_tokens ?? 0) * perToken(p.cacheRead) +
    usage.output_tokens * perToken(p.output)
  );
}
