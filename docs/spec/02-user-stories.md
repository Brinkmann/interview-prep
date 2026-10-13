# User Stories

Forty-seven stories across six epics turn the specification into candidate value. Each story links to the feature requirements (FR) it delivers and carries a MoSCoW priority; the Musts define the first release. The candidate is the only user (D-10).

## Personas

Five candidate types cover any job, industry and market (P10). A public sector applicant is a variant of any of them, not a separate persona.

| ID | Persona | Typical situation | What they need most |
| --- | --- | --- | --- |
| PE-1 | Graduate or early career | Thin work history; screened by one-way video and recruiter calls | Turn academic, volunteer and part-time work into outcome evidence; master timed video |
| PE-2 | Mid-career professional | 5 to 15 years in; moving employer; behavioural and panel interviews | Pick the right stories, prove ownership, handle probing |
| PE-3 | Senior or executive | Director, head of or C-level; panel, board or executive conversations | Organisation-level insight, strategic outcomes, 30-60-90 thinking |
| PE-4 | Contractor | Frequent, short-notice interviews; recruiter screens then a hiring manager | Fast turnaround, reusable evidence, delivery outcomes from comparable engagements |
| PE-5 | Career changer | Moving industry or function; requirements not fully met | Bridge transferable evidence and handle gaps honestly |

## Epic 1: Set up and inputs

| ID | Story | Acceptance criteria | FR | Priority |
| --- | --- | --- | --- | --- |
| US-01 | As a candidate, I want to paste a job ad or upload a job description, so that my preparation targets this exact role. | Accepts pasted text, PDF and DOCX; warns when the ad looks truncated. | FR-01 | Must |
| US-02 | As a candidate, I want to upload my CV, so that the app works from my real history. | Roles, dates and bullets are parsed; parse failures are shown, not hidden. | FR-01, FR-08 | Must |
| US-03 | As a candidate, I want to add my LinkedIn export or PDF, so that evidence missing from my CV is used. | Accepts export and PDF only; date or title conflicts with the CV are flagged. | FR-02 | Should |
| US-04 | As a candidate, I want to see which personal details were removed from my CV and restore any removed by mistake, so that I trust what the app keeps. | Redaction log shown after upload; original file discarded after extraction. | FR-03 | Must |
| US-05 | As a candidate, I want to enter my interview date, stage and formats, including one-way video settings from my invitation, so that the plan fits my real interview. | Date drives the schedule; video think time, answer limit and takes are stored per question. | FR-01, FR-14, FR-23 | Must |
| US-06 | As a candidate, I want to set how long my data is kept and delete it at any time, so that I stay in control of it. | Retention choice at setup; delete removes all objects; default deletion 90 days after the interview. | LR-04, LR-05 | Must |
| US-07 | As a candidate, I want to add the organisation's name and website, so that its research is accurate. | Entity resolved to the legal entity in the job's location; candidate confirms the match. | FR-06 | Should |

## Epic 2: Understand the role and organisation

| ID | Story | Acceptance criteria | FR | Priority |
| --- | --- | --- | --- | --- |
| US-08 | As a candidate, I want to see what the role must deliver and how I will be judged, so that I prepare for the real criteria. | Requirements, success measures, level, criteria and likely formats shown; each cites the ad or is labelled inferred. | FR-04 | Must |
| US-09 | As a candidate, I want to confirm or edit the problem the hire is meant to solve, so that everything downstream rests on the right premise. | Problem hypothesis is editable; edits flow into the matrix and questions. | FR-04 | Must |
| US-10 | As a candidate, I want questions to ask the recruiter, so that I resolve unknowns cheaply before the interview. | At least the vacancy reason, first-six-month priority, format and panel make-up. | FR-04 | Should |
| US-11 | As a candidate, I want to see how this role differs from similar roles, so that I know what will make me stand out. | Differentiation delta shows both directions; available in the free tier. | FR-05 | Should |
| US-12 (PE-3) | As a senior candidate, I want a one-page brief on the part of the organisation I would join, so that I understand its goals, challenges and programmes without wading through a global bio. | Brief scoped by the Scope Card; 8 to 15 dated, sourced cards; stale and reported items labelled. | FR-06, FR-07 | Must |
| US-13 | As a candidate, I want to widen or narrow the research scope with one click, so that the brief fits what I need. | "More global context" and "more team detail" regenerate the Scope Card; excluded topics stay listed. | FR-06 | Could |
| US-14 | As a candidate, I want every claim about the role and organisation marked confirmed, inferred or unknown, so that I never assert a guess in the room. | Fact base visible; unknowns appear as questions to ask. | FR-18 | Must |
| US-15 | As a candidate, I want a brief for each panel role, so that I can pitch my stories to what each listener cares about. | Per role: what they own, what they will test, a cue; titles only, no names stored. | FR-21 | Should |

## Epic 3: Build my evidence

| ID | Story | Acceptance criteria | FR | Priority |
| --- | --- | --- | --- | --- |
| US-16 | As a candidate, I want the app to pull achievements from my CV and score how strong the evidence is, so that I know which stories hold up. | Each bullet split into claim units and scored 1 to 7; activity-only, unquantified and "we" claims flagged. | FR-08 | Must |
| US-17 (PE-1) | As a graduate, I want guided prompts that turn my study, volunteer and part-time work into outcome evidence, so that I can compete despite a short work history. | Evidence sprint covers the top 8 to 10 items in about 15 minutes; prompts by outcome category. | FR-08 | Must |
| US-18 | As a candidate, I want the app never to invent numbers and to label my estimates, so that every figure I use survives "how did you measure that?" | No metric without a source; estimates carry a label and basis. | FR-08 | Must |
| US-19 (PE-4) | As a contractor, I want my achievement inventory kept and reused across applications, so that I can prepare for a short-notice interview fast. | Inventory persists while the candidate chooses to keep it; a new role reuses it without re-entry. | FR-08 | Should |
| US-44 | As a candidate, I want the app to tell me what this role would normally expect to see in my background and ask whether I have it, so that relevant experience I left out is not lost. | Expectation Profile built from role, level and benchmark; each unmatched expectation produces a question; answers: yes (add evidence), no (becomes a gap move), unsure (follow up later). | FR-29 | Must |
| US-45 | As a candidate, I want to be asked for the outcome whenever I have only described duties, so that every story ends in a result. | Activity-only items trigger outcome prompts; no item enters the Story Portfolio without an outcome or an accepted weakness. | FR-08, FR-29 | Must |
| US-46 | As a candidate, I want the app to question claims that are vague, inconsistent or implausible, so that what I say survives probing in the room. | Missing baseline, timeframe, personal role or verifier prompts a question; CV and LinkedIn conflicts are raised; implausible figures ask for the method. | FR-29 | Must |
| US-47 | As a candidate, I want a completeness view showing how well rounded my input is, so that I know where to add more. | Coverage shown per evidence area (outcomes, scale, stakeholders, leadership, technical depth, setbacks); story selection waits until the threshold is met or the candidate overrides it knowingly. | FR-29 | Should |

## Epic 4: Prepare my answers

| ID | Story | Acceptance criteria | FR | Priority |
| --- | --- | --- | --- | --- |
| US-20 | As a candidate, I want a heat map of what the role needs against my evidence, so that I see coverage and gaps at a glance. | Weighted rows, achievement columns, match strength shown by colour. | FR-09 | Must |
| US-21 (PE-2) | As a mid-career candidate, I want the app to recommend 6 to 8 stories that cover every must-have, so that I prepare the right few rather than everything. | Smallest set covering all weight-3 rows at strength 2 or above; each story covers 2 or 3 rows. | FR-09 | Must |
| US-22 (PE-5) | As a career changer, I want a suggested way to handle each requirement I cannot fully meet, so that I answer gaps honestly and confidently. | One gap move per uncovered weight-3 row: bridge, learning plan or honest limitation; candidate picks one. | FR-09 | Must |
| US-23 | As a candidate, I want a 60 to 90 second "why this role, why this organisation, why me" narrative, so that I open strongly. | Cites one organisation priority, one role problem and two pieces of evidence, all sourced. | FR-10 | Must |
| US-24 (PE-3) | As a senior candidate, I want a 30-60-90 day outline grounded in the organisation brief, so that I can show how I would approach the job. | Phrased as hypotheses to validate; linked to inventory cards. | FR-10 | Should |
| US-25 | As a candidate, I want the questions I am most likely to be asked, with why and which story answers each, so that nothing surprises me. | Six question families; at least 70% traced to a criterion or card; probes listed per question. | FR-11 | Must |
| US-26 | As a candidate, I want each story in 60-second, 2-minute and 5-minute versions, so that I can fit any format's time limit. | Three versions per portfolio story; timings checked against speaking rate. | FR-14 | Should |

## Epic 5: Practise

| ID | Story | Acceptance criteria | FR | Priority |
| --- | --- | --- | --- | --- |
| US-27 (PE-2) | As a candidate, I want a mock behavioural or panel interview with AI personas, so that I rehearse under realistic conditions. | 2 to 4 role-based personas, turn-taking, one tough probe; questions from my bank. | FR-14, FR-15 | Must |
| US-28 (PE-1) | As a candidate facing a one-way video interview, I want a simulation using my invitation's settings, so that the timer and retake rules hold no surprises. | Think time, answer limit, takes and no going back match my settings; camera and audio check first. | FR-14 | Must |
| US-29 | As a candidate, I want mocks for recruiter screens, case, presentation, strengths-based, executive or board and AI-interviewer formats, so that I can rehearse whatever format I face. | Each format runs end to end with its own timing and personas. | FR-14 | Should |
| US-30 | As a candidate, I want follow-up probes after my answers, so that I practise adding evidence under questioning. | 2 or 3 probes per answer, aimed at my weakest rubric dimension. | FR-13 | Must |
| US-31 | As a candidate, I want a score with one priority fix and an immediate re-attempt, so that each answer improves straight away. | Rubric scores per dimension; one fix; re-attempt delta shown; delivery metrics non-inferential only. | FR-12, FR-24 | Must |
| US-32 | As a candidate, I want to be warned when I overclaim, bluff or stay generic, so that nothing I say can be exposed in the room. | Overclaims, asserted unknowns and missing organisation specifics flagged in feedback. | FR-19, FR-20 | Should |
| US-33 | As a candidate, I want flashcards where questions I answer badly keep coming back, so that I spend my time on my weak spots. | Score below 5 recycles the card; a card retires after scoring 5 or above in two separate sessions. | FR-16 | Must |
| US-34 | As a candidate, I want to drill at three levels (full answers, message maps, short cue lines), so that my answers become flexible rather than scripted. | Levels selectable; default sequence moves from full answers to cue lines as the date nears. | FR-16 | Should |
| US-35 | As a candidate, I want an exam mixing multiple-choice and free-text questions across themes, so that I know every aspect of the role and its challenges. | At least three themes per session; includes off-script follow-ups. | FR-17 | Could |
| US-36 | As a candidate, I want my practice spaced out up to the interview date, so that I retain what I rehearse. | Sessions at about 1, 3 and 7 days, compressed to fit; none after the interview. | FR-23 | Should |

## Epic 6: Ready on the day and after

| ID | Story | Acceptance criteria | FR | Priority |
| --- | --- | --- | --- | --- |
| US-37 | As a candidate, I want an honest readiness view, so that I know when I am prepared and where I still fall short. | "Ready" shown only when every weight-3 row is covered by a story scoring 5 or above in a timed rehearsal. | FR-25 | Must |
| US-38 | As a candidate, I want a one-page cue card to read just before the interview, so that I walk in with my core messages fresh. | Fits one printed page: core messages, do-not traps, trust anchors, questions to ask. | FR-22 | Must |
| US-39 | As a candidate, I want a one-page interview brief, so that I have the fit narrative, top stories and sourced organisation facts in one place. | Generated from portfolio, narrative and inventory; every organisation fact sourced. | FR-10, FR-22 | Should |
| US-40 | As a candidate, I want to log how the interview went, so that my next round is prepared on what actually happened. | Debrief captures questions, stories used, probes and surprises; next round's bank updated. | FR-27 | Should |
| US-41 | As a candidate, I want to report the outcome if I choose, so that the platform can show whether it works. | Opt-in only; result stored separately from preparation data. | FR-27 | Could |
| US-42 | As a candidate, I want to see how my answers are scored, so that I trust the feedback. | Scoring explainer lists every rubric dimension and delivery metric. | FR-28 | Should |
| US-43 | As a public sector candidate, I want preparation calibrated to my employer's framework and grade, so that questions and scoring match the real panel. | Pack selection switches question templates and rubric descriptors; generic scoring remains available. | FR-26 | Won't (MVP) |

## MVP cut

The first release is the 27 Must stories: one complete loop from inputs to a readiness check, with behavioural or panel mocks and one-way video as the two launch formats.

| Priority | Count | Stories |
| --- | --- | --- |
| Must | 27 | US-01, 02, 04, 05, 06, 08, 09, 12, 14, 16, 17, 18, 20, 21, 22, 23, 25, 27, 28, 30, 31, 33, 37, 38, 44, 45, 46 |
| Should | 16 | US-03, 07, 10, 11, 15, 19, 24, 26, 29, 32, 34, 36, 39, 40, 42, 47 |
| Could | 3 | US-13, 35, 41 |
| Won't (MVP) | 1 | US-43 |

**Next step:** tag each story free or paid to build the commercial model (D-17). Role benchmarking (US-11) is already fixed as free (D-14).
