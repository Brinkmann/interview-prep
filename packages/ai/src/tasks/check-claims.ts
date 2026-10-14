import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Screen 5. Date overlaps are found by rule from the job dates read here (small tier);
// vague and unlikely claims are judged by the medium tier. Questions use approved
// templates, so the model never writes to the candidate directly.

const month = z.string().nullable().describe('"YYYY-MM", or "YYYY" when only the year is given; null if not stated');
const datesOutput = z.object({
  jobs: z.array(z.object({
    label: z.string().describe("Role and employer as written"),
    start: month,
    end: month.describe('"present" if current; otherwise as for start'),
  })),
});

export const claimsJobDates: TaskDefinition<{ cvText: string }, typeof datesOutput> = {
  tier: "small",
  promptVersion: "claims_job_dates@2",
  effort: "low",
  maxTokens: 3000,
  system: [
    "You list every job, study, volunteer or part-time role in a CV with its start and end dates, exactly as the CV states them.",
    'For a current role ("to present", "to date", "current") give the end as "present", never null.',
    "Do not guess a date the CV does not give.",
  ].join(" "),
  buildUserMessage: ({ cvText }) => `<cv>\n${cvText}\n</cv>`,
  output: datesOutput,
};

const claimsOutput = z.object({
  flags: z.array(z.object({
    index: z.number().int().min(0),
    type: z.enum(["vague", "unlikely", "ownership"]),
    question: z.string().describe("The question an interviewer would ask about this claim, written for it, under 30 words"),
  })),
});

// D-35: each question is written for its claim and raised only where it fits.
export const checkClaims: TaskDefinition<{ experiences: string[]; ownership: number[] }, typeof claimsOutput> = {
  tier: "medium",
  promptVersion: "check_claims@2",
  effort: "low",
  maxTokens: 3000,
  system: [
    "You spot claims in a candidate's CV that an interviewer is likely to push back on, so the candidate can prepare an answer first.",
    'Flag "vague" only where a claimed improvement has no size and a size would matter, such as "significantly improved efficiency". Do not flag work that is not about a measurable change, such as restructuring roles or advising a client.',
    'Flag "unlikely" where a figure is unusually large for what is described, such as cutting transport costs by 70%.',
    'Flag "ownership" where the claim says "we" and the candidate\'s own part is unclear. Always include the experiences listed as needing an ownership question.',
    "Flag each experience at most once, with its strongest issue. Do not flag plain duties or statements that make no claim.",
    "Write each question as a helpful colleague preparing them, never as an accusation, and specific to that claim: name what it is about. For example: \"What was your own part in rolling out the new WMS?\" or \"That's a large saving. How was it measured, and what made it possible?\" No praise.",
    "Never write a number in a question that is not in that experience.",
  ].join(" "),
  buildUserMessage: ({ experiences, ownership }) =>
    `<experiences>\n${experiences.map((e, i) => `[${i}] ${e}`).join("\n")}\n</experiences>` +
    (ownership.length ? `\n<needs_ownership_question>${ownership.join(", ")}</needs_ownership_question>` : ""),
  output: claimsOutput,
};
