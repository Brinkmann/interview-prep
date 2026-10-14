# Interview Prep Platform: Master Product Specification

Oct 13, 2026 · Oliver Brinkmann

## Purpose and how to use this spec

This is the single source of truth for the interview prep platform. Every finding, decision and proven practice lives here as a numbered requirement, so nothing survives only in a chat.

**Sources consolidated**

- Report 1: *Outcome-First Interviewing: Evidence, Candidate Playbook and Platform Blueprint* (R1).
- Report 2: *From Job Ad to Mock Interview: A Nine-Stage Interview Preparation Workflow* (R2).
- Decisions agreed in chat on 13 October 2026 (see Decision log).
- Practices proven in the founder's own interview preparation (FP).

**Rules of use**

- Any decision agreed in a chat is added to the Decision log the same day.
- Build work is checked against this spec, not against memory or old chats.
- Every requirement carries an ID, a source and an acceptance test.

**Founder baseline:** the founder's own preparation (BestStart, October 2026) is the example and baseline the practices were proven on, nothing more. No requirement is specific to that organisation, role or panel.

**User stories:** see `02-user-stories.md`.

## Product principles

The platform is an evidence coach: it builds, scores and rehearses the candidate's own verified outcomes against what this role and this part of the organisation need now.

| ID | Principle | Source |
| --- | --- | --- |
| P1 | Outcome evidence over duties. Answers are scored on owned, measured results told as specific stories, not on titles, tasks or traits. | R1 |
| P2 | Preparation only. No live copilot or real-time answer prompting, stated publicly as a trust feature. | R1, R2 |
| P3 | Never invent. No fabricated numbers; estimates only when the candidate labels them; provenance (source, date, confidence) on every extracted item. | R2 |
| P4 | Context-scoped research. Organisational research is scoped to the role's unit, location and level by deterministic rules. | R2, D-03 |
| P5 | Practice with feedback. Every model answer is paired with a rehearsal, scored feedback and a re-attempt. | R2 |
| P6 | Privacy by design. Collect the minimum, strip what preparation does not need, delete by default. | R2, D-06 |
| P7 | Transparent scoring. Publish what the engine measures. Never infer emotion or personality. | R1, R2 |
| P8 | Honest claims. Market better answers, not guaranteed offers or a percentage uplift. | R1, R2 |
| P9 | Format realism. Mocks mirror the real format's timers, retakes, panel make-up and probing. | R1, D-05 |

**P10 Universal scope:** the app serves any job, any industry, any market. Generic job-ad-driven scoring works everywhere from day one; frameworks are optional enhancements, never restrictions (D-18).

**P11 Expect and probe:** the app never assumes the candidate's input is complete or true. It holds an expectation of the detail, coverage and evidence the role calls for, and asks targeted questions wherever the input falls short, until the input is well rounded (D-19).

## End-to-end workflow

Nine stages take the candidate from inputs to readiness. Stages 1 to 4 run in parallel once intake is complete; stages 5 to 8 run in sequence. Each stage has a quality gate before the next one runs (R2).

| Stage | Purpose | Main output | Quality gate |
| --- | --- | --- | --- |
| 0. Intake and consent | Collect inputs lawfully and fix the target role, date and formats | Candidate Context, Interview Event | Ad complete, CV parses, date set (default 10-day plan if none) |
| 1. Role decoding | Model what the hire must deliver and how they will be judged | Role Profile | Every item cites the ad or is labelled inferred; candidate confirms problem hypothesis |
| 2. Similar-roles benchmark | Establish what good looks like and what makes this role different | Role Benchmark | Classification confidence shown; candidate picks when top two codes are close |
| 3. Organisational inventory | Capture the unit's goals, challenges and programmes, scoped to context | Scope Card, Organisational Inventory | Every card dated and sourced; stale and reported items labelled; max 15 cards |
| 4. Achievement inventory | Turn CV and LinkedIn into scored, owned, verifiable evidence | Achievement Inventory | No story below score 4 unless strengthened or accepted; every fact traceable |
| 5. Fit/gap mapping | Choose the stories, fit narrative and Gap Stories | Fit/Gap Matrix, Story Portfolio | Every weight-3 row covered by a story; every unmatched must-have has a Gap Story (D-37); no unsourced organisational claim |
| 6. Question prediction | Predict likely questions per format, with reasons | Question Bank | At least 70% of questions trace to a criterion or inventory card |
| 7. Mock interviews and drills | Rehearse the right stories under realistic conditions | Mock Interview Plan, Drill Deck | Each priority story rehearsed three times; each predicted format simulated once; each gap probe asked by the sceptic persona in at least three mock sessions (D-37) |
| 8. Feedback and readiness | Convert practice into better answers and track readiness | Readiness Dashboard, Interview Brief, Cue Card | Every weight-3 row covered by a story scoring 5 or above, and every unmatched must-have has a Gap Story scoring 5 or above, in a timed rehearsal (D-37) |

**Completeness probing (FR-29)** runs inside Stage 4, before the Fit/Gap Matrix is built, and again whenever a mock or drill exposes missing evidence. It compares what the role should expect with what the candidate has provided, and asks before it assumes.

**Gap Story rule (D-37).** Every unmatched must-have creates a mandatory Gap Story, and readiness is blocked until that story is rehearsed to standard.

- **Must-have detection:** a requirement is a must-have if the ad marks it explicitly ("essential", "required", "must") or the app infers it with confidence (weight 3). The candidate confirms inferred must-haves. They can downgrade one only by giving a reason, and the downgrade is logged.
- **Unmatched test:** no achievement or story matches the requirement at match strength 2 or above with an evidence score of 4 or above (the Stage 4 and Stage 5 thresholds).
- **Elicitation first:** a missing line on the CV is not missing experience. Before a gap is declared, the app runs a targeted evidence sprint on that requirement. Real evidence that turns up goes into the Achievement Inventory and closes the gap.
- **Gap Story structure:** (1) state the gap plainly; (2) name the underlying need the requirement secures, taken from the implied problem in the Role Profile; (3) bridge to the nearest real evidence in the inventory that meets that need; (4) give proof of fast learning from a past episode; (5) close with a short case for why the candidate is still the best fit. The app never supplies evidence: every element traces to the inventory or to a statement from the candidate.
- **No adjacent evidence:** the Gap Story is still required, and the Readiness Dashboard flags the requirement as high risk so the candidate goes in aware of it.
- **Downstream gates:** the Question Bank generates a gap probe for each unmatched must-have; the sceptic persona asks it in at least three mock sessions; readiness requires every weight-3 row covered by a story scoring 5 or above and every unmatched must-have's Gap Story scoring 5 or above in a timed rehearsal.

An honest acknowledgement of the gap is the opening of a Gap Story, never the whole answer.

**Navigation:** mirror the seven practitioner stages in the interface (brief, decode and research, inventory, narrative, rehearse, questions and close, debrief), with the nine technical stages underneath (R2).

## Data model

Seventeen core objects carry the work between stages. Provenance (source, date, confidence) is a mandatory field on every extracted item; it powers the quality gates, guards against hallucination and supports access and deletion requests (R2).

| Object | Key fields | Created in | Used in | Source |
| --- | --- | --- | --- | --- |
| Candidate Context | consents, jurisdiction, retention setting, redaction log | 0 | all | R2, D-06 |
| Interview Event | organisation, role, date, stage, formats, panel titles | 0 | 6, 7, 8 | R2 |
| Role Profile | requirements (weight, must/nice, source span), implied problems, success measures, level, criteria, formats, confidence | 1 | 2, 3, 5, 6 | R2 |
| Role Benchmark | occupation codes and crosswalks, core profile, differentiation delta, pay range (source, date) | 2 | 5, 6, 7 | R2 |
| Scope Card | entity, organisation type, layers L0 to L3 with effort share, recency windows, inclusion triggers, exclusions | 3 | 3 | R2 |
| Organisational Inventory | evidence cards (claim, source, date, layer, reliability, relevance, so-what) | 3 | 5, 6, 7 | R2 |
| Fact Base | each claim about the role or organisation tagged confirmed, strong inference or unknown | 1, 3 | 5, 6, 7, 8 | FP |
| Achievement Inventory | achievements (action, scope, outcome, metric, baseline, ownership, verifier, score, tags, provenance) | 4 | 5, 7, 8 | R1, R2 |
| Fit/Gap Matrix | rows (need, weight, must-have flag and its source: stated, inferred and confirmed, or downgraded with a logged reason), columns (achievements), match strength, Gap Story link and risk flag for each unmatched must-have | 5 | 6, 7, 8 | R2, D-37 |
| Story Portfolio | 6 to 8 stories plus a Gap Story for each unmatched must-have (gap, underlying need, bridge, fast-learning proof, best-fit close, each element's source), rows covered, versions (60 s, 2 min, 5 min), rehearsal scores | 5 | 7, 8 | R1, R2, D-37 |
| Question Bank | question, family, format, rationale, linked rows and stories, probes, scoring criteria, probability | 6 | 7 | R2 |
| Persona | role archetype, priorities, probe style, difficulty | 7 | 7 | R2 |
| Drill Card | question link, drill level, state (in stack or retired), pass count, last score, next due | 7 | 7, 8 | FP, D-07 |
| Mock Interview Plan | sessions, schedule, formats, personas, target stories | 7 | 8 | R2 |
| Feedback Record | per-answer rubric scores, delivery metrics, priority fix, re-attempt delta | 8 | 4, 8 | R2 |
| Expectation Profile | expected evidence areas for this role and level (outcome categories, scale, stakeholders, leadership, technical depth, setbacks), typical properties of the role, required detail per achievement | 1, 2, 4 | 4, 5 | D-19 |
| Probe Question | trigger (missing, vague, inconsistent, implausible), linked expectation or achievement, question, candidate answer (yes and evidence, no, unsure), resulting action | 4, 7, 8 | 4, 5 | D-19 |

## Feature requirements

Twenty-nine requirements define the product. A feature is done only when its acceptance test passes.

| ID | Requirement | Source | Acceptance test |
| --- | --- | --- | --- |
| FR-01 | Intake asks for job ad or job description, CV and LinkedIn profile (near mandatory), plus organisation name and website, interview date and known formats. | D-02, R2 | A plan cannot start without an ad and a CV; missing optional inputs are prompted, not blocked. |
| FR-02 | LinkedIn data only via the candidate's own export or PDF. No scraping, no logging in for the candidate. | R2 | No code path fetches linkedin.com; upload accepts export and PDF only. |
| FR-03 | Automatic redaction on upload of photos, date of birth or age, health, ethnicity, religion and marital status. Candidate sees what was removed and can restore false positives. Original file discarded after extraction. | D-06 | A test CV containing each item stores none of them; the original file is absent after processing. |
| FR-04 | Role decoding extracts requirements, implied problems, success measures, level, assessment criteria and likely formats, each citing a span of the ad or labelled inferred. Outputs questions to ask the recruiter. | R2 | 100% of extracted items carry a span or an inferred label. |
| FR-05 | Role benchmark classifies to O\*NET and ESCO with national crosswalks and computes the differentiation delta. | R2 | Delta lists both items in the ad but not the standard profile, and the reverse. |
| FR-06 | Scope Card generated by deterministic rules before any retrieval, with one-click override (more global context, more team detail). | R2, D-03 | The same inputs produce the same Scope Card; excluded topics are listed. |
| FR-07 | Organisational inventory of 8 to 15 dated evidence cards plus a one-page Org Brief. | R2 | No card lacks a dated source; cards over 24 months are labelled stale. |
| FR-08 | Achievement inventory splits CV bullets into claim units, scores them 1 to 7, flags weak evidence and runs a 15-minute evidence sprint on the top 8 to 10. Never invents numbers. | R1, R2 | Every metric traces to the CV, LinkedIn or a candidate statement; estimates carry a label and basis. |
| FR-09 | Fit/Gap Matrix shown as a heat map, with weights, must-have flags, a story prioritisation rule (6 to 8 stories) and a mandatory Gap Story for each unmatched must-have, built only after a targeted evidence sprint on that requirement (Gap Story rule, D-37). | R2, D-37 | Every unmatched must-have has a Gap Story with all five parts, each traced to the inventory or a candidate statement; a downgraded must-have has a logged reason; a must-have with no adjacent evidence is flagged high risk. |
| FR-10 | Generates the fit narrative (60 to 90 seconds), a 30-60-90 outline phrased as hypotheses, and 5 to 8 questions to ask, each tied to an inventory card. | R2, FP | No organisational claim in the narrative lacks an inventory source. |
| FR-11 | Question bank in six families (criterion, situational, technical, motivation, gap probes, format-specific), ranked by probability times stakes. A gap probe is generated for each unmatched must-have (D-37). | R2, D-37 | At least 70% of questions trace to a criterion or inventory card; every unmatched must-have has a gap probe. |
| FR-12 | Evidence-scoring engine applies the rubric to transcripts, flagging "we" density, missing results, unexplained numbers, situation overload and trait claims. | R1 | Scores on a calibration set of benchmark answers at known levels fall within an agreed tolerance before launch. |
| FR-13 | Probe simulator asks 2 or 3 follow-ups per answer aimed at the weakest rubric dimension. | R1, R2 | Each answer below 5 on ownership or evidence triggers a matching probe. |
| FR-14 | Format simulators for recruiter screen, behavioural, panel, strengths-based, case, presentation, executive or board, AI interviewer and one-way or self-taped video. Video mode takes think time, answer limit, takes and back-navigation from the candidate's invitation. | R1, R2, D-05 | Each format can be run end to end; video timers and retakes match the entered settings. |
| FR-15 | Personas built from role and title only. Candidate-supplied panel names never trigger profiling. | R2 | No persona stores personal data beyond title and function. |
| FR-16 | Drill mode: flashcards from the Question Bank with pass or stay-in marking, three drill levels and missed cards returning in later sessions. See Proven practices. | FP, D-07 | A card scoring below 5 recycles; a card retires only after two passes in separate sessions. |
| FR-17 | Exam mode mixing multiple-choice recall and free-text answers across shuffled themes, including curveballs beyond the prepared material. | FP | A session covers at least three themes and includes unprepared follow-ups. |
| FR-18 | Fact base: every claim about the role or organisation is tagged confirmed, strong inference or unknown. Unknowns become questions to ask, never assertions. | FP | Marking flags any answer that asserts an unknown or inferred item as fact. |
| FR-19 | Honesty guards in marking flag overclaims, bluffing about unfamiliar specifics and inflated CV wording. | FP, R2 | Seeded overclaims in test answers are flagged. |
| FR-20 | Context specificity check: answers should name the organisation's actual systems, programmes and priorities rather than generic categories. | FP | Answers that use only generic terms where the inventory holds a specific name are flagged. |
| FR-21 | Panel brief per panel role: what they own, what they will test, and a cue for the candidate. Built from title and function only; no names or personal notes about panel members are stored (D-12). | FP, R2 | Brief contains no data fetched by the app about named individuals. |
| FR-22 | One-page cue card generated from retired drill cards, fit narrative and fact base: core messages, do-not traps, trust anchors, questions to ask. | FP | Cue card fits one printed page. |
| FR-23 | Spaced re-rehearsal at 1, 3 and 7 days, compressed to fit the interview date. | R2 | Schedule never places a session after the interview date. |
| FR-24 | Delivery metrics limited to timing, words per minute, filler-word rate and answer length. No emotion or personality inference. | R2 | No model outputs affect, emotion or personality labels. |
| FR-25 | Readiness gate: "you're ready" only when every weight-3 row is covered by a story scoring 5 or above, and every unmatched must-have has a Gap Story scoring 5 or above, in a timed rehearsal; each gap probe must have been asked by the sceptic persona in at least three mock sessions (D-37). | R2, D-37 | Message never shows below the threshold. |
| FR-26 | Optional framework packs, added after launch in this order: NZ Leadership Success Profile, APS ILS by classification, UK Success Profiles by grade; corporate values packs later. Packs enhance prediction and scoring but never restrict which jobs, industries or markets the app serves (D-18, P10). | R1 | Rubric descriptors switch with the selected pack and level. |
| FR-27 | Post-interview debrief feeds the next round's question bank, and opt-in outcome reporting measures the platform's own effect. | R1, R2 | Debrief answers appear in the next round's bank. |
| FR-28 | Published scoring explainer. No human reviewers or coaches in the platform (D-10). | R1, R2 | Explainer lists every rubric dimension and delivery metric the engine uses. |
| FR-29 | Completeness probing. The app builds an Expectation Profile from the role, level and benchmark, compares it with the CV, LinkedIn and inventory, and asks targeted questions: outcomes where only duties are given; expected properties of the role that are absent ("this role usually involves vendor management; did you do this and leave it out?"); missing baseline, timeframe, personal role or verifier; conflicts and implausible figures. Each answer either adds evidence, leads to a Gap Story at Stage 5 (D-37), or is marked unsure for follow-up. | D-19, R2 | Every unmatched expectation and every activity-only item produces a question; no item enters the Story Portfolio without an outcome or an accepted weakness; a completeness view shows coverage per evidence area. |

## Proven practices from the founder baseline

These practices worked in the founder's own preparation for a senior programme role in October 2026 (BestStart was the test case). They are written as generic features; nothing here is specific to that organisation, role or panel.

| Practice | How it works | Why it matters | Requirement |
| --- | --- | --- | --- |
| Pass or stay-in drilling | Each question is marked. A pass retires the card; a wrong or partial answer goes back into the stack until it is right. | Effort goes to weak answers, not ones already mastered. | FR-16 |
| Three drill levels | (1) Full answers with detailed marking. (2) Message maps: name the core messages, key words and intent for a given panel member, without full sentences. (3) Burn-in: short memorised lines fired back to cue prompts. | Moves from building answers to flexible recall, so answers sound unscripted under probing. | FR-16 |
| Fact base in three columns | Every claim is tagged confirmed, strong inference or unknown before it is used. | Stops answers resting on guesses. | FR-18 |
| Honesty guards | Marking checks accuracy and flags overclaims, such as an unconfirmed cycle length or a misnamed incumbent tool. | One exposed overclaim damages every other claim. | FR-19 |
| Plain, precise wording | Inflated or fashionable phrasing on the CV and in answers is replaced with what can be defended. | Credibility survives "how do you know?" | FR-19 |
| Name their specifics | Answers name the organisation's own platforms and programmes, not the category. | Separates a candidate who read the job title from one who understood the work. | FR-20 |
| Panel briefs | For each panel role: what they own, what they will test, and a cue. | Lets one story be pitched to each listener's priorities. | FR-21 |
| Exam with curveballs | Mixed multiple-choice and free-text rounds across themes, harder than the prep paper, with off-script follow-ups. | Tests that answers hold when the panel goes off script. | FR-17 |
| Few strong evidence anchors | A small set of best-evidenced stories reused across many questions. | Depth and recall beat breadth. | FR-09 |
| Questions that show the shape | Questions to ask that expose dependencies between workstreams or owners. | Signals experience and pulls the panel onto outcomes. | FR-10 |
| One-page cue card | Core messages, do-not traps and trust anchors on one printed page for the final read. | A last-minute reset without rereading the full pack. | FR-22 |

## Scoring rubric

Each answer is scored 1 to 7 on eleven dimensions, mirroring the UK Civil Service scale so 4 means meets the standard for the level. Delivery carries secondary weight because structured and AI scoring rely mainly on content (R1). Context specificity is added from the founder baseline.

| Dimension | 1 to 2 | 4 | 6 to 7 | Source |
| --- | --- | --- | --- | --- |
| Relevance to competency | Off-topic or trait claim | Clear link to one competency | Hits several descriptors for the stated level | R1 |
| Specificity | Hypothetical or "I usually" | One real episode | Vivid, time-bound episode with concrete details | R1 |
| Ownership | "We" throughout | Some "I" actions | Clear personal decisions, boundary with team stated | R1 |
| Action reasoning | Actions without rationale | Some reasons | Every key action has a "because" and a named trade-off | R1 |
| Outcome evidence | No result | Result stated, unmeasured | Baseline, change, timeframe, evidence source | R1 |
| Credibility | Inflated or unexplained numbers | Plausible | Method explained, estimates labelled, holds under probing | R1 |
| Adversity and learning | Only success | Mentions a learning | Specific setback handled and lesson applied later | R1 |
| Level calibration | Below grade scope | At grade | Above-grade scope or strategic impact | R1 |
| Context specificity | Generic category terms | Some organisation specifics | Names the organisation's own systems, programmes and priorities accurately | FP |
| Structure and time | Rambling or cut off | Recognisable STAR | Result first, proportionate, finishes in time | R1 |
| Delivery (secondary weight) | Heavy fillers, reading | Clear | Confident, conversational, eye contact with lens | R1 |

**Answer structure:** use STAR or STAR-L labels in public sector panels, where panels expect them, and result first everywhere else, especially in timed one-way video (R1).

## Organisational inventory scoping rules

Scope is set by deterministic rules before any retrieval, never by the model ad hoc (R2, D-03). Layers: L0 = team or role, L1 = business unit or function, L2 = local legal entity, region or country operation, L3 = group or global parent.

| Role level | L0 | L1 | L2 | L3 |
| --- | --- | --- | --- | --- |
| Entry or graduate | 40% | 40% | 20% | Headline only |
| Professional or specialist | 30% | 40% | 25% | 5% |
| Manager or senior specialist | 20% | 40% | 30% | 10% |
| Head of or director (country) | 10% | 30% | 40% | 20% |
| Executive or board | 5% | 20% | 40% | 35% |

*Percentages are the default share of research effort per layer.*

**L3 inclusion triggers.** Include group-level material only if at least one holds: it is named in the ad; it has an explicit local footprint (regional segment, local programme, local regulator action); or it is one of the group's top three stated priorities and the role's function delivers it. Everything else is excluded and listed on the Scope Card.

**Modifiers by organisation type**

- Multinational's local subsidiary: L2 is primary; use the local entity's filings and press; group report only for the regional segment and the function's global programme.
- Listed company: annual report, investor presentation, risk factors, latest results; scope to the reporting segment containing the role.
- Private company: filed accounts where available, website, press, funding news; weight hiring patterns more.
- Startup: funding stage, roadmap signals, founder content, hiring velocity; L0 and L1 dominate.
- Central government agency: strategic plan or statement of intent, annual report, budget documents, audit reports.
- Local government: long-term or corporate plan, annual plan and budget, council agendas, audit reports, local issues.
- NGO: charity register filings, strategic plan, impact report, funding mix.

**Modifiers by function:** customer-facing roles add competitors and sentiment; finance and risk add regulatory and audit findings; technology adds procurement notices and transformation programmes; people roles add engagement data and workforce plans.

**Recency windows:** news 12 months; strategy for the current cycle; performance for the last two reporting periods; leadership current only.

## Data sources by market

Automate only official and licensed sources; treat reviews, job boards and LinkedIn as candidate-supplied inputs (R2). All markets are treated equally (D-04).

| Market | Registry and filings | Automation status | Public sector and other |
| --- | --- | --- | --- |
| US | SEC EDGAR | data.sec.gov APIs, no key, declared User-Agent, max 10 requests per second | Agency strategic plans, Performance.gov, SAM.gov, IRS 990s |
| UK | Companies House | Free API with key, 600 requests per 5 minutes, Open Government Licence | Departmental plans, Find a Tender, Contracts Finder, Charity Commission |
| Ireland | CRO | Verify terms before integrating | Statements of strategy, Charities Regulator, eTenders |
| Canada | Corporations Canada, SEDAR+ | Verify terms before integrating | Departmental plans and results reports, CanadaBuys, CRA charities |
| Australia | ASIC, ASX, ABN Lookup | ABN Lookup free with GUID | Corporate plans, portfolio budget statements, AusTender, ACNC |
| New Zealand | Companies Register, NZX | NZBN API free with subscription key; most Companies Office APIs free | Statements of intent, SPEs, long-term plans, GETS, Charities Services |
| Singapore | ACRA, SGX | Treat as paid or licensed | Ministry and statutory board annual reports, GeBIZ |
| EU | National registers | ESCO API free | TED procurement notices, national strategies |

**Occupational frameworks:** O\*NET (CC BY 4.0, attribution; commercial users must offer a free version of features using it or seek permission) and ESCO (free API) at launch. SFIA is not used (D-13). Role benchmarking built on O\*NET sits in the free tier (D-14).

**Platforms handled by candidate input only:** LinkedIn (own export or PDF), Glassdoor and similar review sites (candidate pastes themes; app labels them reported), Seek, Indeed and other job boards (candidate pastes the ad and comparable ads, or licensed datasets).

## Legal and privacy requirements

CVs and profile data are personal data under GDPR, UK GDPR, the NZ Privacy Act 2020, the Australian Privacy Act and CCPA. GDPR is the single design baseline for all markets (D-09). A privacy lawyer reviews notices and data flows before launch.

| ID | Requirement | Source |
| --- | --- | --- |
| LR-01 | Just-in-time privacy notice at upload: what is collected, why, where stored, who sees it, how long it is kept. | R2 |
| LR-02 | Data minimisation: automatic redaction of data preparation does not need (FR-03). | D-06 |
| LR-03 | Purpose limitation: preparation only. No resale, marketing or model training without opt-in. | R2 |
| LR-04 | Retention: candidate-set, with deletion by default 90 days after the interview date. | R2 |
| LR-05 | User rights: access, correction, export and deletion; no selling or sharing (CCPA design from day one). | R2 |
| LR-06 | Security: encryption, access controls and a breach response plan. | Chat, 13 Oct |
| LR-07 | Cross-border transfers assessed for hosting location under GDPR and NZ law. | Chat, 13 Oct |
| LR-08 | NZ IPP3A (from 1 May 2026): do not compile information about third parties named in CVs or about interviewers; personas from titles only. | R2 |
| LR-09 | EU AI Act: no emotion recognition (banned in workplaces and education since 2 February 2025); no employer-side screening product without a separate conformity programme (Annex III obligations apply from 2 December 2027). | R2 |
| LR-10 | Australia: comply with the Australian Privacy Principles regardless of the small business turnover exemption, which is being narrowed. | R2 |
| LR-11 | DPIA completed before launch, given profiling-like processing. | R2 |

## Competitive positioning

Compete on the scoped organisational inventory, evidence scoring, the Fit/Gap Matrix and probe simulation; do not compete on delivery analytics or question volume (R1, R2). Pricing below is as reported in 2026 by third-party sites and must be verified before publishing.

| Tool | What it does well | Reported pricing | Gap this platform fills |
| --- | --- | --- | --- |
| Yoodli | Delivery feedback: fillers, pace, roleplays | Free 5 sessions; Pro $8/month, Advanced $20/month (annual) | Delivery, not evidence quality or organisation context |
| Big Interview | Curriculum, recorded practice, PracticeAI from JD and CV; 700+ institutions | $39 for 30 days, $99 for 3 months, $299 lifetime | No achievement inventory, scoped research or evidence scoring |
| Final Round AI | Role simulations plus live copilot | About $25/month annual; monthly figures conflict ($90 vs $150) | Live copilot conflicts with integrity checks; thin research |
| Exponent (absorbed Pramp) | Rubric-graded tech and product mocks, peer practice | About $12/month annual, $79 monthly | Narrow role families |
| interviewing.io | Senior human mocks, mainly technical | From about $179 per session | Costly per session, no evidence pipeline |
| Google Interview Warmup | Free practice in a few fields | Free | Static questions; vague answers with the right terms score the same |
| Teal, Jobscan, Huntr | CV to JD keyword matching, job tracking | Varies | Keyword matching, not outcome evidence |
| Public sector coaches (e.g. CS Interview Coach) | Grade-calibrated scoring for UK behaviours | Freemium | UK only; no NZ LSP or APS ILS equivalent at scale |

**Business model to validate:** a free inventory builder, an interview-sprint pass and a B2B channel through outplacement firms, universities, recruiters and public sector agencies (R1).

## Decision log

Thirty-seven decisions agreed so far, newest first. Append a row whenever a decision is agreed in any chat.

| Date | ID | Decision | Rationale | Source |
| --- | --- | --- | --- | --- |
| 14 Oct 2026 | D-37 | Every unmatched must-have creates a mandatory Gap Story, and readiness is blocked until it is rehearsed to standard. Must-haves are stated in the ad or inferred with confidence (weight 3) and confirmed by the candidate; a downgrade needs a logged reason. Unmatched means no story at match strength 2 or above with an evidence score of 4 or above. A targeted evidence sprint runs before a gap is declared. The Gap Story has five parts (gap, underlying need, bridge to nearest real evidence, proof of fast learning, best-fit close), all traced to the inventory or the candidate. With no adjacent evidence the story is still required and the requirement is flagged high risk. Each unmatched must-have gets a gap probe, asked by the sceptic persona in at least three mocks; readiness also needs each Gap Story scoring 5 or above in a timed rehearsal. Replaces the three-way gap move choice (bridge, learning plan or honest limitation, US-22). | The three-way choice let an unmatched must-have go into the interview with no fit argument; an honest acknowledgement is only the opening of a Gap Story, never the whole answer. | Chat |
| 14 Oct 2026 | D-36 | The Phase 1 summary shows stories ready to tell, compares like with like (stories the candidate added are reported separately), lets the candidate copy their stories, and states plainly where the test version ends. | Counts alone did not tell the founder where he stood, and the journey ended with no next step. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-35 | Claim-check questions are written for each claim and raised only where they fit; the claim and the question are shown separately, and the candidate can mark a claim as fine. | Generic questions such as "by how much?" on non-quantitative claims undermined confidence in the app. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-34 | The role-expectations step opens with a verdict (how many expected areas the stories already show), and its answers are "Yes, I have", "No, I haven't" and "Not sure". | The founder could not tell whether the table was good or bad, and "Did you leave it off your CV?" had no clear yes or no. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-33 | Stories build visibly in Situation, Action and Result form as the candidate answers; confirmation reads "Did we get this right?" with a one-click Yes, and the screen shows "Story N of M". | The bare answer playback and Save step confused the founder, and he could not tell where he was in the process. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-32 | Story questions are written by the model for each story, starting from what the CV already says and asking only what matters for that story, at most four. This replaces the fixed six-question order and template-only question wording (D-23). The no-flattery and number checks stay enforced in code on every question shown. | Fixed questions asked for details the CV already gave or that did not apply, which made the sprint mechanical and tedious. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-31 | The "strongest material" step leads with the 8 to 10 experiences that matter most for the role; the rest are available but collapsed. | Showing all 31 experiences with near-identical verdicts buried what mattered. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-30 | Rating labels speak to the candidate: Ready to tell (6 to 7), Almost there (4 to 5), Worth building (1 to 3), replacing Interview-ready, Needs detail and Not yet a story. Each card shows what is already strong and one next step, not a list of everything missing. | The interviewer-side labels and reason lists read as a verdict on the candidate rather than coaching. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-29 | Add a welcome page (what the app does, what to have ready, how long it takes) and a step tracker with plain step names on every screen. | The founder's walkthrough found no orientation and no signal of the next step. | Chat (founder walkthrough, revision 2 of 05-phase1-experience.md) |
| 14 Oct 2026 | D-28 | The team-member proof of concept (D-26) is the Phase 1 go or no-go test, judged on the same four thresholds and feedback form. | The people closest to the product give the fastest honest signal before any spend on commercialisation. | Chat |
| 14 Oct 2026 | D-27 | Text removed by redaction is held encrypted for 24 hours, visible only to the candidate, so a mistake can be restored (US-04); it is then deleted automatically. Photos are not held. | Restore needs the removed text, and a short encrypted hold keeps that need from becoming storage. | Chat |
| 14 Oct 2026 | D-26 | Run a proof of concept before commercialisation: the full Phase 0 and 1 product on the existing staging setup at its vercel.app address, tested by invited team members. No domain, production environment or paid plans until the concept is approved. Testers sign in with Google as listed test users and may use their own CVs, so every privacy rule applies on staging as it would in production. | Proves the concept with the people closest to it before spending on a commercial platform. | Chat |
| 14 Oct 2026 | D-25 | Candidates sign in with an emailed one-time code or with Google. No passwords are stored. | Least friction for candidates and nothing to leak or reset; Google covers the large share of Gmail users. | Chat |
| 14 Oct 2026 | D-24 | Scoring and classification tasks run at the lowest effort setting instead of temperature 0, which current Claude models do not accept. Score consistency is proven by the calibration run (D-16). | The intended control is unavailable on the agreed models; the calibration thresholds already measure the outcome that matters. | Chat |
| 13 Oct 2026 | D-23 | Approve the Phase 1 candidate experience: six screens, interview-readiness ratings (Interview-ready, Needs detail, Not yet a story), evidence sprint, role expectations, claim checks, rules and go or no-go thresholds. The output is interview evidence, never a rewritten CV. | Product behaviour agreed before technical build detail is written. | Chat |
| 13 Oct 2026 | D-22 | Adopt the architecture: recommended stack, Sydney hosting at launch, cost ceilings (US$0.30 per free user, US$8 per Sprint user, base scenario), six-phase build with Phase 1 as go or no-go, speech providers chosen in Phase 4. | Scales from the start on managed services; accepted on recommendation. | Chat |
| 13 Oct 2026 | D-21 | Launch in New Zealand first. The product still serves any job and industry (P10); markets open in sequence, NZ then Australia, then others. Pricing set in NZD for launch. | Home market, no scaled competitor for NZ public sector preparation, and a contained market to prove conversion before expanding. | Chat |
| 13 Oct 2026 | D-20 | Adopt the commercial model: free diagnoses, paid fixes and rehearses. Tiers: Free (one role), Interview Sprint US$39 one-off for 30 days, Pro US$24 a month or US$199 a year, organisation licences. Guardrails against dark patterns apply. | Episodic preparation suits a one-off pass; free users see an accurate diagnosis and feel the shortfall through scope, not degraded quality. | Chat |
| 13 Oct 2026 | D-19 | The app expects a level of detail, coverage and evidence for the role and probes with targeted questions wherever the input falls short. It never assumes what is provided is complete or true. | Guides the candidate to a well-rounded input; relevant experience left off a CV is recovered, and weak claims are strengthened before the interview. | Chat |
| 13 Oct 2026 | D-18 | Launch with generic job-ad-driven scoring for all markets; add framework packs afterwards in the order NZ, Australia, UK. Packs never restrict scope: the app is for any job, industry and market. | Generic scoring covers every role; packs add precision where employers use published frameworks. | Chat |
| 13 Oct 2026 | D-17 | Develop the commercial model next: pricing tiers, free versus paid split and channels. | Needed before willingness to pay can be validated. | Chat |
| 13 Oct 2026 | D-16 | Scoring calibration is AI-only: a benchmark set of answers written at known levels, checked during development. | Consistent with no humans in the platform (D-10). | Chat |
| 13 Oct 2026 | D-15 | A drill card retires only after scoring 5 or above in two separate sessions. | One good answer straight after practice can be short-term memory. | Chat |
| 13 Oct 2026 | D-14 | Role benchmarking (O\*NET based) is in the free tier; coaching, mocks and drills are paid. | Meets O\*NET's free-version condition. | Chat |
| 13 Oct 2026 | D-13 | Do not use SFIA. | Avoids a commercial licence; O\*NET and ESCO cover all occupations. | Chat |
| 13 Oct 2026 | D-12 | Panel briefs store role and title only, never names or personal notes. | Avoids the NZ IPP3A notification duty. | Chat |
| 13 Oct 2026 | D-11 | A commercial model is required; willingness to pay is validated against it. | Pricing and channels must be defined before validation can be meaningful. | Chat |
| 13 Oct 2026 | D-10 | No humans in the app or platform other than the candidate. Coach review mode removed. | Fully self-service product. | Chat |
| 13 Oct 2026 | D-09 | GDPR is the single privacy design baseline for all markets. | One privacy model largely satisfies UK GDPR, NZ, Australian and CCPA requirements. | Chat |
| 13 Oct 2026 | D-08 | Keep this master spec as the single source of truth. The founder's BestStart preparation is the example and baseline only. | Prevents findings being lost across chats; keeps the product generic. | Chat |
| 13 Oct 2026 | D-07 | Add Drill mode: pass or stay-in flashcards, three drill levels, missed cards return, cue sheet generated. | Proven in the founder baseline; fills a gap in R2. | Chat |
| 13 Oct 2026 | D-06 | Photos, date of birth, health and ethnicity are not required for interview prep. Strip them automatically on upload and never store them. | Data never held cannot be breached and needs no consent. | Chat |
| 13 Oct 2026 | D-05 | Simulate all interview formats, including self-taped one-way video with no one on the other end. | One-way video is increasingly common. | Chat, R1 |
| 13 Oct 2026 | D-04 | Treat all markets equally. | Platform is for any role in any market. | Chat |
| 13 Oct 2026 | D-03 | Scope the organisational inventory to job content, location and requirements. No global bio for a local role. | Context matters; global detail is overkill for local roles. | Chat, R2 |
| 13 Oct 2026 | D-02 | Inputs: job ad or JD, CV and LinkedIn near mandatory; organisation name and website very useful. | Enables role, organisation and evidence analysis. | Chat |
| 13 Oct 2026 | D-01 | Position as an outcome-evidence coach for any role, with findings plus a practical toolkit. | Outcome stories outperform role descriptions; no current tool scores evidence. | Chat, R1 |

## Open questions and evidence gaps

Each item needs a decision or a test before build reaches it.

**Open questions**

- [ ] Commercial model: agreed (D-20, `03-commercial-model.md`); validate willingness to pay with programme, project and public sector candidates (D-11, D-17).

**Evidence gaps (do not overclaim in marketing)**

- No study isolates quantified outcomes against duty descriptions; the strongest evidence compares concrete stories with generic self-descriptions. Market "evidence-based answers score higher", not a percentage uplift.
- Coaching effects are positive but modest (r of .09 to .25 in the Maurer studies, public-safety candidates). Instrument the app and publish internal effectiveness data.
- Spaced-rehearsal evidence is borrowed from motivational interviewing training. A/B test two versus four sessions.
- No published benchmark for LLM CV extraction accuracy. Build a labelled test set and require candidate confirmation of every metric.
- Tool pricing comes from third-party sites and changes often.
- API terms for Ireland, Canada and Singapore registries and job-ad data vendors are unverified. Legal review before automated ingestion.
- HireVue scoring detail comes mainly from vendor statements; other vendors may still analyse non-verbal signals.
