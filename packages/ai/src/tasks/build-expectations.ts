import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Screen 4: what this role would normally call for, from the job ad first and then
// from what similar roles usually require (O*NET or ESCO), matched to the candidate's experiences.
const output = z.object({
  title: z.string().describe("The job title, as in the ad"),
  occupation_index: z.number().int().nullable().describe("The reference occupation that best fits this role, or null if none fits"),
  areas: z.array(z.object({
    area: z.string().describe('A short noun phrase starting in lower case, for example "inventory planning or forecasting"'),
    source: z.enum(["in_ad", "typical"]).describe("in_ad if the ad asks for it; typical if it comes only from what similar roles require"),
    matched_experience_index: z.number().int().nullable().describe("The experience that shows this, or null if none clearly does"),
  })),
});

export interface OccupationProfile { title: string; description: string; tasks: string[]; skills: string[] }

export const buildExpectations: TaskDefinition<
  { jobAd: string; occupations: OccupationProfile[]; experiences: string[] },
  typeof output
> = {
  tier: "medium",
  promptVersion: "build_expectations@1",
  effort: "low",
  maxTokens: 3000,
  system: [
    "You list the experience a role would normally expect a candidate to show, so the candidate can check for gaps before an interview.",
    "Give 5 to 10 areas. Take them from the job ad first; add areas that similar roles usually require only from the reference occupation you pick, and label those typical.",
    "For each area, give the candidate experience that clearly shows it, or null. Do not stretch a match: a missing item is not a gap until the candidate answers, so null is safe.",
    "Use plain words a candidate would use, not jargon.",
  ].join(" "),
  buildUserMessage: ({ jobAd, occupations, experiences }) => [
    `<job_ad>\n${jobAd}\n</job_ad>`,
    `<reference_occupations>\n${occupations.map((o, i) =>
      `[${i}] ${o.title}: ${o.description}\nTasks: ${o.tasks.slice(0, 10).join("; ")}\nSkills: ${o.skills.slice(0, 10).join(", ")}`).join("\n\n") || "none"}\n</reference_occupations>`,
    `<experiences>\n${experiences.map((e, i) => `[${i}] ${e}`).join("\n")}\n</experiences>`,
  ].join("\n"),
  output,
};
