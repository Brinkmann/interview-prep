# Phase 1: Candidate Experience

What a candidate sees, does and is asked in the Phase 1 prototype, written for approval by the founder. Phase 1 proves the core of the product: the app scores how strong a candidate's evidence is, then asks smart questions until the evidence is well rounded. The CV is only raw material: the output is evidence the candidate can tell and defend in an interview, never a rewritten CV. Technical build detail follows separately once this is approved.

## Scope and journey

**In Phase 1:** stories US-02, 16, 17, 18, 44, 45 and 46, plus the redaction summary (US-04) built in Phase 0.

**Not yet:** organisation research, question prediction, mock interviews and payments. The job ad is read only lightly in Phase 1, enough to know what the role would expect; full role decoding arrives in Phase 2.

**Worked example used throughout:** a candidate with eight years in logistics operations applying for a Supply Chain Manager role.

| Screen | Candidate's question | What happens |
| --- | --- | --- |
| 1. Start | "Where do I begin?" | Paste the job ad, upload the CV, see what personal details were removed |
| 2. What we found | "Which of my experiences will hold up in an interview?" | Every experience found in the CV, rated for how well it would stand up when told to an interviewer |
| 3. Evidence sprint | "How do I turn these into stories I can tell?" | One achievement at a time, short questions turn duties into outcomes |
| 4. What this role expects | "Am I missing anything?" | Experience the role usually calls for, with a question for each gap |
| 5. Claim checks | "Will my claims hold up?" | Vague, inconsistent or unlikely claims queried before an interviewer does |
| 6. Summary | "Where do I stand now?" | Before and after comparison, open questions, a short feedback request |

The whole journey should take about 30 minutes, and the candidate can stop and return at any point.

## Screen 1: Start

**The candidate sees** two boxes: "Paste the job ad" and "Upload your CV", with one line above them: *"We use these to show you how well your evidence matches this role. We only keep what helps you prepare."* A link opens the full privacy notice.

**After upload** the app shows what it removed:

> *We removed 3 things you don't need for interview preparation: your photo, your date of birth and a line about your health. We haven't stored them. Restore anything we removed by mistake.*

**Rules:** warn if the job ad looks cut off; if the CV cannot be read, say so plainly and suggest a different file type.

## Screen 2: What we found

**The candidate sees** every experience the app found in their CV as a card, grouped by job, each rated for interview readiness: would it hold up if they told it to a panel and were asked follow-up questions?

| Rating | Score | Example card |
| --- | --- | --- |
| Interview-ready | 6 to 7 | "Cut warehouse picking errors from 4% to 0.8% in 9 months by redesigning slotting." Result, baseline, timeframe and your action are all there; this survives follow-up questions. |
| Needs detail | 4 to 5 | "Reduced freight costs significantly by renegotiating carrier contracts." An interviewer will ask "by how much?" and you need the answer ready. |
| Not yet a story | 1 to 3 | "Responsible for a team of 12 in the dispatch centre." A duty, not an outcome; it gives an interviewer nothing to score. |

A headline sits above the cards: *"We found 18 experiences you could use in your interview. 3 are interview-ready, 6 need more detail and 9 are not yet stories. Interviewers can only score what you can prove when asked, so let's build up the ones that matter most for this role."* A button starts the evidence sprint.

**Rules:** reasons use everyday words ("no result", "says 'we' not 'I'", "no timeframe"), never jargon. Ratings are never inflated to encourage.

## Screen 3: Evidence sprint

**The candidate works through** the 8 to 10 achievements that matter most for this role, one at a time, with short questions in this order and only the ones still missing:

1. *What changed because of this?*
2. *From what to what?*
3. *Over what period?*
4. *How do you know? What was it measured by?*
5. *What was your part, and what did the team do?*
6. *Who could confirm it?*

**Worked example:** for "Responsible for a team of 12 in the dispatch centre", the app asks what changed while they led the team. The candidate answers that on-time dispatch improved. The app asks from what to what; the candidate says "about 85% to about 96%". The app then asks: *"Are those exact figures or your estimate?"* The candidate says estimate, and the app asks how they arrived at it. The evidence note now reads: "Led a 12-person dispatch team; on-time dispatch rose from about 85% to about 96% over 18 months (estimate, based on monthly KPI reports)", and it moves from Not yet a story to Needs detail. This note is what the candidate will tell and defend in the interview; the app never rewrites their CV.

**For graduates (PE-1)** the same questions are framed around study, volunteer and part-time work: *"In your club treasurer role, what changed because you were there?"*

**Rules:** the rating updates as the candidate answers; any question can be skipped; skipped is recorded as "not answered", never as "no".

## Screen 4: What this role expects

**The candidate sees** the experience a Supply Chain Manager role would normally call for, each marked as found in their evidence or not found:

| Expected area | Status |
| --- | --- |
| Supplier and carrier management | Found (carrier contract renegotiation) |
| Inventory planning and forecasting | Not found |
| Budget responsibility | Not found |
| Leading teams through change | Found (dispatch team) |
| Systems, such as a WMS or ERP | Not found |

**For each "not found"** the app asks one question:

> *Supply Chain Manager roles usually involve inventory planning or forecasting. Did you do this and leave it off your CV?*

Three answers:

- **Yes:** the app asks for an example and adds it to the evidence sprint.
- **No:** recorded as a gap, to be handled with a prepared answer in Phase 3.
- **Not sure:** kept as an open question for later.

**Rules:** expectations come from the job ad first, then from what similar roles usually require; each is shown with where it came from ("in the ad" or "typical for this role"). The app never treats a missing item as proof of a gap until the candidate answers.

## Screen 5: Claim checks

**The candidate sees** a short list of claims an interviewer might challenge, each with one question:

| Type | Example claim | Question asked |
| --- | --- | --- |
| Vague | "Significantly improved warehouse efficiency" | *By how much, compared with what, and over what period?* |
| Inconsistent | Two roles overlap from March to August 2021 | *Were these roles at the same time, or is one date wrong?* |
| Unlikely | "Cut transport costs by 70%" | *That's an unusually large saving. How was it measured, and what made it possible?* |
| Unclear ownership | "We rolled out a new WMS across three sites" | *What was your personal part in the rollout?* |

**Rules:** the tone is that of a helpful colleague preparing them, never an accusation. An "unlikely" figure is never changed or removed by the app; the candidate either explains the method or edits it themselves.

## Screen 6: Summary

**The candidate sees** where they started and where they are now:

> *When you started: 3 interview-ready, 6 needing detail, 9 not yet stories. Now: 7 interview-ready, 8 needing detail, 3 not yet stories. Two expected areas are still gaps and one question is open. Your interview evidence is ready for the next step: matching it to what this role needs.*

Below it, a two-question feedback request, used for the go or no-go decision: *"How useful were the questions we asked?"* (1 to 5) and *"What would you change?"*

## Rules the app always follows

- Never invents or rounds up a number; estimates are always labelled, with how the candidate arrived at them.
- Never raises a rating without new evidence from the candidate.
- Never treats a skipped question or a missing item as a "no".
- Asks one question at a time, in plain words, and only the questions still needed.
- Honest, not flattering: an experience that would not hold up in an interview is called that, with the reason and the fix.
- Never changes the candidate's words without showing them first.

## Go or no-go test

Phase 1 is tested with about 15 NZ candidates across the five personas. Phase 2 starts only if all four proposed thresholds are met:

| Measure | Proposed threshold |
| --- | --- |
| Usefulness of the questions | At least 70% of testers rate them 4 or 5 out of 5 |
| Evidence improvement | At least half of sprint achievements move up one rating or more |
| Completion | At least 80% of testers finish within 45 minutes |
| Scoring accuracy | The AI-only calibration set passes (D-16) |

## Approval checklist

Approved on 13 October 2026 (D-23). The technical build detail is in `06-phase0-1-build.md`.

- [x] The six screens and their order are right.
- [x] The interview-readiness ratings (Interview-ready, Needs detail, Not yet a story) and their wording are right.
- [x] The evidence sprint questions and their order are right.
- [x] The "What this role expects" questions and three answers are right.
- [x] The claim checks and their tone are right.
- [x] The rules the app always follows are right.
- [x] The go or no-go thresholds are right.
