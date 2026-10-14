import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Step 3 (D-32): the next question for one story, written for that story and starting
// from what the CV already says. On the first turn it also drafts the story from the CV
// line alone. The caller applies the tone and number guards and the four-question cap.
const story = z.object({
  situation: z.string().nullable(),
  action: z.string().nullable(),
  result: z.string().nullable(),
});
const output = z.object({
  draft: story.nullable().describe("Only when no story exists yet: the story drawn from the CV line alone, in the candidate's words, with null for any part the line does not give"),
  question: z.string().nullable().describe("The next question, or null when the story would hold up in an interview"),
});

export interface SprintTurnInput {
  experience: string;
  job: string;
  role: string | null;
  story: { situation: string | null; action: string | null; result: string | null } | null;
  history: { question: string; answer: string | null }[];
  graduate: boolean;
}

export const nextSprintQuestion: TaskDefinition<SprintTurnInput, typeof output> = {
  tier: "medium",
  promptVersion: "next_sprint_question@1",
  effort: "low",
  maxTokens: 1500,
  system: [
    "You coach a candidate to turn one experience from their CV into a story they can tell in an interview, in Situation, Action and Result form.",
    "Ask the single most useful next question, in this order of importance: what changed because of them, their own part, how they know (a measure, or who saw it), then the detail an interviewer would probe.",
    "Start from what the CV line and the story already say, and name it, so the candidate knows why you ask. For example: \"You said the business got a single view of spend. What did decisions look like before that, and what changed once leaders had it?\"",
    "Ask only what is missing and matters for this experience. A timeframe, a starting point or a figure is not always relevant; never ask for something the story already gives. Never repeat a question already asked or skipped.",
    "If a figure would help, say an estimate is fine. One question, under 40 words, plain words, no jargon, no praise.",
    "Return null for the question when the story would already hold up to an interviewer's follow-up questions.",
    "Never write a number that is not in the CV line, the story or the candidate's answers.",
  ].join(" "),
  buildUserMessage: ({ experience, job, role, story, history, graduate }) => [
    `<cv_line job="${job}">\n${experience}\n</cv_line>`,
    role ? `<applying_for>${role}</applying_for>` : "",
    story ? `<story>\nSituation: ${story.situation ?? "(missing)"}\nAction: ${story.action ?? "(missing)"}\nResult: ${story.result ?? "(missing)"}\n</story>` : "<story>none yet: draft it from the CV line</story>",
    history.length ? `<asked>\n${history.map((h) => `Q: ${h.question}\nA: ${h.answer ?? "(skipped)"}`).join("\n")}\n</asked>` : "",
    graduate ? "<candidate>A recent graduate: frame the question around study, volunteer or part-time work, for example \"In your club treasurer role, what changed because you were there?\"</candidate>" : "",
  ].filter(Boolean).join("\n"),
  output,
};
