import { z } from "zod";
import type { TaskDefinition } from "../registry";

// Screens 2 and 3: the 8 to 10 experiences that matter most for this role, best first.
const output = z.object({
  ranked: z.array(z.object({ index: z.number().int().min(0), reason: z.string() })),
});

export const rankForRole: TaskDefinition<{ jobAd: string; experiences: { job: string; text: string }[] }, typeof output> = {
  tier: "medium",
  promptVersion: "rank_for_role@1",
  effort: "low",
  maxTokens: 2000,
  system: [
    "You choose which of a candidate's experiences matter most for the role in a job ad, so they can prepare those as interview stories first.",
    "Pick the 8 to 10 experiences (fewer if there are fewer) that best show what this role needs, most important first.",
    "Judge relevance to the role, not how well the experience is currently written.",
    "Return each by its index, with a short reason in plain words.",
  ].join(" "),
  buildUserMessage: ({ jobAd, experiences }) =>
    `<job_ad>\n${jobAd}\n</job_ad>\n<experiences>\n${experiences.map((e, i) => `[${i}] (${e.job}) ${e.text}`).join("\n")}\n</experiences>`,
  output,
};
