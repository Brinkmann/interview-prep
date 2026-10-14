// Shared wording of the Phase 1 rubric (01-master-spec.md, Scoring rubric) for prompts.
// The band anchors are the approved examples (05-phase1-experience.md, Step 2); they keep
// scores honest in both directions: never inflated, never harsher than the evidence warrants.
export const RUBRIC = `Score each dimension from 1 to 7, where 4 meets the standard:
- outcome_evidence: 1-2 no result; 3 a result implied but not stated; 4 a real result stated; 5 a result with a size or a before and after; 6-7 starting point, change, timeframe and how it is known.
- specificity: 1-2 hypothetical, generic or "I usually"; 4 one real piece of work; 5 a named piece of work with concrete details; 6-7 a vivid, time-bound episode.
- ownership: 1-2 "we" throughout or no actor; 4 the candidate's own action is clear (a CV line with an action verb and no "we" counts); 6-7 personal decisions with the boundary with the team stated.
- credibility: 1-2 inflated or unexplained numbers, or nothing checkable; 4 plausible and checkable; 5 a specific figure that fits what was done; 6-7 method clear, estimates labelled, would hold under probing.
- action_reasoning: 1-2 actions without rationale; 4 the action and its purpose are clear; 6-7 every key action has a reason or trade-off.
Anchors for the overall result (weighted: outcome 30%, specificity 20%, ownership 20%, credibility 20%, reasoning 10%):
- 6 to 7, ready to tell: "Cut warehouse picking errors from 4% to 0.8% in 9 months by redesigning slotting." Result, starting point, timeframe and action are all there.
- 4 to 5, almost there: "Reduced freight costs significantly by renegotiating carrier contracts." A real result and action, missing the size or period an interviewer will ask for. A specific figure with the action, such as "reduced external IT spend by NZ$2M a year through supplier renegotiation", is at least here.
- 1 to 3, worth building: "Responsible for a team of 12 in the dispatch centre." A duty, with no result to talk about.
Judge the statement as a CV line: do not mark it down for detail a CV line would not normally carry, such as who could confirm it.
Reasons to give, only the ones that matter most for this statement (at most three): no_result, says_we, no_timeframe, no_baseline, no_measure, duty_not_outcome, unverified, vague_claim.
Judge only what is written. Do not reward length, polish or seniority, and never inflate a score to encourage.`;
