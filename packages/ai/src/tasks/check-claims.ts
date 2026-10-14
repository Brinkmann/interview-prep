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
    type: z.enum(["vague", "unlikely"]),
    figure_noun: z.string().nullable().describe('For unlikely: one plain word for what the figure is, such as "saving", "increase" or "reduction"'),
  })),
});

export const checkClaims: TaskDefinition<{ experiences: string[] }, typeof claimsOutput> = {
  tier: "medium",
  promptVersion: "check_claims@1",
  effort: "low",
  maxTokens: 2000,
  system: [
    "You spot claims in a candidate's CV that an interviewer is likely to challenge, so the candidate can prepare an answer first.",
    'Flag "vague" where a claimed improvement has no size, baseline or period, such as "significantly improved efficiency".',
    'Flag "unlikely" where a figure is unusually large for what is described, such as cutting transport costs by 70%.',
    "Do not flag plain duties or statements that make no claim. Flag each experience at most once, with its strongest issue.",
  ].join(" "),
  buildUserMessage: ({ experiences }) => `<experiences>\n${experiences.map((e, i) => `[${i}] ${e}`).join("\n")}\n</experiences>`,
  output: claimsOutput,
};
