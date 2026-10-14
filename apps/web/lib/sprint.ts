import type { SprintItem } from "@interview-prep/jobs";

// What the Step 3 screen needs about one story; nothing else leaves the server.
export interface StoryState {
  id: string; job: string; text: string; complete: boolean; question: string | null; asked: number;
  story: { situation: string | null; action: string | null; result: string | null } | null;
  estimate: { isEstimate: boolean | null; basis: string | null };
  band: SprintItem["band"]; strength: string | null; nextStep: string | null;
}

export function toState(i: SprintItem): StoryState {
  return {
    id: i.id, job: i.job, text: i.text, complete: i.complete, question: i.pending?.question ?? null, asked: i.asked,
    story: i.evidence ? { situation: i.evidence.situation ?? null, action: i.evidence.action ?? null, result: i.evidence.result ?? null } : null,
    estimate: { isEstimate: i.evidence?.is_estimate ?? null, basis: i.evidence?.estimate_basis ?? null },
    band: i.band, strength: i.strength, nextStep: i.nextStep,
  };
}

