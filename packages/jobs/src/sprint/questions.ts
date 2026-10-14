import { numbersIn } from "@interview-prep/ai";
import type { Evidence, EvidenceField } from "../experiences/rating";

// Screen 3: the fixed question order (06-phase0-1-build.md). Only missing fields are asked,
// and a skipped question is never asked again but stays "not answered" (AT-05).
export const STEPS = [
  { id: "outcome", fields: ["outcome"] },
  { id: "change", fields: ["baseline", "new_value"] },
  { id: "timeframe", fields: ["timeframe"] },
  { id: "measure", fields: ["estimate_basis"] },
  { id: "role", fields: ["personal_role", "team_role"] },
  { id: "verifier", fields: ["verifier"] },
] as const satisfies readonly { id: string; fields: readonly EvidenceField[] }[];
export type StepId = (typeof STEPS)[number]["id"];

export function isStep(id: unknown): id is StepId {
  return STEPS.some((s) => s.id === id);
}

const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0;

// A step is answered when any of its fields is filled. Skipped steps are passed over.
export function nextStep(evidence: Evidence | null, skipped: StepId[]): StepId | null {
  for (const step of STEPS) {
    if (skipped.includes(step.id)) continue;
    if (!step.fields.some((f) => filled(evidence?.[f]))) return step.id;
  }
  return null;
}

// Approved wording (05-phase1-experience.md), with study, volunteer and part-time
// framing for graduates (PE-1, AT-07). Templates only: no model phrasing (tone guard).
export function questionFor(step: StepId, ctx: { graduate: boolean; job: string; evidence: Evidence | null }): string {
  const { graduate, job, evidence } = ctx;
  switch (step) {
    case "outcome":
      return graduate ? `In your ${roleName(job)} role, what changed because you were there?` : "What changed because of this?";
    case "change":
      return "From what to what?";
    case "timeframe":
      return "Over what period?";
    case "measure":
      return evidence?.is_estimate ? "How did you arrive at that estimate?" : "How do you know? What was it measured by?";
    case "role":
      return graduate
        ? `What was your part, and what did others in the ${roleName(job)} role or team do?`
        : "What was your part, and what did the team do?";
    case "verifier":
      return graduate ? "Who could confirm it, such as a lecturer, coordinator or manager?" : "Who could confirm it?";
  }
}

function roleName(job: string): string {
  return job.split(/[,(]/)[0]!.trim() || "that";
}

// Estimate guard (AT-06): a number cannot be saved until it is labelled exact or
// estimate, and an estimate needs a basis.
export function estimateProblem(fields: Partial<Record<EvidenceField, string | null>>, label: { isEstimate: boolean | null; basis: string | null }): "label_numbers" | "basis_required" | null {
  const hasNumber = Object.values(fields).some((v) => typeof v === "string" && numbersIn(v).length > 0);
  if (hasNumber && label.isEstimate === null) return "label_numbers";
  if (label.isEstimate && !filled(label.basis)) return "basis_required";
  return null;
}

// The evidence note the candidate will tell and defend: their own words, assembled
// by template, never rewritten (edit guard: shown before it is saved).
export function evidenceNote(experience: string, e: Evidence | null): string {
  if (!e) return experience;
  const parts: string[] = [];
  if (filled(e.personal_role)) parts.push(e.personal_role!.trim());
  let result = filled(e.outcome) ? e.outcome!.trim() : "";
  if (filled(e.baseline) || filled(e.new_value)) {
    result += `${result ? ", " : ""}from ${e.baseline?.trim() || "?"} to ${e.new_value?.trim() || "?"}`;
  }
  if (filled(e.timeframe)) result += `${result ? " " : ""}over ${e.timeframe!.trim()}`;
  if (result) parts.push(result);
  if (filled(e.team_role)) parts.push(`team: ${e.team_role!.trim()}`);
  let note = parts.length ? parts.join("; ") : experience;
  const basis = filled(e.estimate_basis) ? e.estimate_basis!.trim() : "";
  if (e.is_estimate === true) note += ` (estimate${basis ? `, based on ${basis}` : ""})`;
  else if (basis) note += ` (measured by ${basis})`;
  if (filled(e.verifier)) note += `. Confirmable by ${e.verifier!.trim()}`;
  return note;
}
