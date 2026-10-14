export type CheckResult = "ok" | "missing" | `failed (${string})`;

// Confirms the Anthropic key is accepted by listing models. Makes no model call and costs nothing.
export async function checkAnthropicConnection(apiKey?: string): Promise<CheckResult> {
  if (!apiKey) return "missing";
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      cache: "no-store",
    });
    return res.ok ? "ok" : `failed (HTTP ${res.status})`;
  } catch (err) {
    return `failed (${err instanceof Error ? err.name : "network error"})`;
  }
}
