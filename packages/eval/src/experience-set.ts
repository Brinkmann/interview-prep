import { bandDistance, bandFor, overallScore, runTask, type Band, type RunContext } from "@interview-prep/ai";

// Calibration set 1 (06-phase0-1-build.md): experience statements written to an explicit
// level, checked by an independent scoring pass, rewritten once on disagreement.

export const BANDS: Band[] = ["interview_ready", "needs_detail", "not_yet_a_story"];
export const PERSONAS = [
  "PE-1 graduate or early career, drawing on study, volunteer or part-time work",
  "PE-2 mid-career professional, 5 to 15 years in",
  "PE-3 senior or executive leader",
  "PE-4 contractor delivering short engagements",
  "PE-5 career changer moving between industries",
];
export const INDUSTRIES = [
  "logistics", "healthcare", "central government", "retail", "construction", "software",
  "education", "banking", "hospitality", "manufacturing", "energy", "not-for-profit",
];
const VARIATIONS = [
  "focus on cost", "focus on quality or error rates", "focus on speed or turnaround", "focus on people or culture",
  "focus on customers", "focus on safety or compliance", "focus on revenue or growth", "focus on a system or process change",
  "written in plain, unpolished language", "includes a percentage", "includes a money amount", "includes a team size",
];

export interface ExperienceItem {
  id: string;
  target_band: Band;
  persona: string;
  industry: string;
  job_label: string;
  statement: string;
  reference_overall: number;
  reference_reasons: string[];
  attempts: number;
}

export function plan(count: number, offset = 0) {
  return Array.from({ length: count }, (_, k) => {
    const i = k + offset;
    return {
      id: `exp-${String(i + 1).padStart(3, "0")}`,
      band: BANDS[i % BANDS.length]!,
      persona: PERSONAS[Math.floor(i / BANDS.length) % PERSONAS.length]!,
      industry: INDUSTRIES[i % INDUSTRIES.length]!,
      variation: VARIATIONS[(i * 7) % VARIATIONS.length]!,
    };
  });
}

type Ctx = Omit<RunContext, "candidateId" | "job">;

export async function buildItem(spec: ReturnType<typeof plan>[number], ctx: Ctx): Promise<ExperienceItem | null> {
  const run = { ...ctx, candidateId: null, job: "eval.build" };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const variation = attempt === 1 ? spec.variation : `${spec.variation}; make the level unmistakable`;
    const written = await runTask("calibration_write_statement", { band: spec.band, persona: spec.persona, industry: spec.industry, variation }, run);
    const scored = await runTask("calibration_score_statement", { statement: written.statement }, run);
    const overall = overallScore(scored.scores);
    if (bandFor(overall) === spec.band) {
      return {
        id: spec.id, target_band: spec.band, persona: spec.persona, industry: spec.industry,
        job_label: written.job_label, statement: written.statement,
        reference_overall: overall, reference_reasons: scored.reasons, attempts: attempt,
      };
    }
  }
  return null;
}

// Thresholds from 06-phase0-1-build.md: at least 85% exact band match, none off by more than one band.
export function evaluate(results: { target: Band; actual: Band }[]) {
  const exact = results.filter((r) => r.target === r.actual).length;
  const farOff = results.filter((r) => bandDistance(r.target, r.actual) > 1).length;
  const exactRate = results.length ? exact / results.length : 0;
  return { total: results.length, exact, exactRate, farOff, passed: results.length > 0 && exactRate >= 0.85 && farOff === 0 };
}
