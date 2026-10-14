# Phase 0-1 Build

Technical build detail for Phase 0 (foundations) and Phase 1 (evidence core prototype), written for Claude Code or a developer. It implements the approved candidate experience (`05-phase1-experience.md`, D-23) on the agreed architecture (`04-architecture.md`, D-22). Where this document and the Phase 1 experience document differ, the experience document wins.

## Environments and repository

- **Environments:** development, staging and production, each with its own Supabase project in ap-southeast-2 (Sydney), Vercel project and Inngest environment. Staging uses synthetic CVs only.
- **Repository:** one TypeScript monorepo: `apps/web` (Next.js), `packages/db` (schema, migrations, RLS policies, typed client), `packages/ai` (model gateway, prompt registry, output validators), `packages/jobs` (Inngest functions), `packages/eval` (calibration set and runner).
- **Secrets:** stored in Vercel and Inngest environment settings; the Anthropic key is server-side only; no secret ever reaches the browser.
- **Release gate:** migrations, RLS tests and the calibration run must pass in CI before deploy to staging or production.

## Database schema (Phase 0 and 1)

Every personal table carries `candidate_id`, `region`, `created_at` and `updated_at`. Every AI-produced row also carries provenance: `source_type` (cv, candidate_answer, job_ad, reference), `source_span`, `model_id`, `prompt_version` and `confidence`.

| Table | Zone | Key columns | Purpose |
| --- | --- | --- | --- |
| `candidates` | Personal | id (auth user), region, retention_until, persona | One row per candidate |
| `consents` | Personal | notice_version, accepted_at | Record of privacy notice acceptance |
| `target_roles` | Personal | job_ad_text, ad_hash, title, truncation_warning | The role being prepared for |
| `uploads` | Transient | storage_path, status, deleted_at | Original CV file until extraction; then deleted |
| `redaction_log` | Personal | category, excerpt_hash, restored | What was removed, without storing the removed text |
| `cv_text` | Personal | redacted_text | Redacted CV text used for extraction |
| `experiences` | Personal | job_label, original_text, rank_for_role | One row per achievement or duty found in the CV |
| `evidence` | Personal | experience_id, outcome, baseline, new_value, timeframe, personal_role, team_role, verifier, is_estimate, estimate_basis | Structured evidence gathered in the sprint |
| `scores` | Personal | experience_id, dimension scores, overall, band, reasons[], evidence_version | Interview-readiness rating history |
| `expectations` | Personal | target_role_id, area, source (in_ad or typical), status (found or not_found), matched_experience_id, answer (yes, no, unsure, unanswered) | What this role expects (Screen 4) |
| `probes` | Personal | trigger (missing_field, expectation, vague, inconsistent, unlikely, ownership), target_id, question, answer, resulting_action | Every question asked and its outcome |
| `feedback` | Personal | usefulness (1 to 5), comment | Go or no-go measurement |
| `occupations` | Shared reference | code, scheme (onet or esco), title, tasks, skills | Imported O\*NET and ESCO data for "typical for this role" |
| `job_runs` | System | job, status, tokens_in, tokens_out, cost_estimate, duration | Cost and reliability tracking, no personal content |

## Row-level security

- Personal tables: select, insert, update and delete only where `candidate_id = auth.uid()`.
- Shared reference tables: select for authenticated users; writes by the service role only.
- Jobs run with the service role but always pass and filter on `candidate_id`; no job queries across candidates.
- **Test:** an automated suite signs in as candidate A and attempts every read and write on candidate B's rows; all must fail.

## Upload and redaction pipeline

One durable workflow, triggered when a CV upload completes. Each step retries independently.

1. **Store:** file lands in a private transient bucket; `uploads.status = received`.
2. **Extract text:** parse PDF or DOCX to plain text; drop embedded images (removes photos).
3. **Rules redaction:** pattern rules remove dates of birth, ages, gender, marital status and nationality labels.
4. **Model redaction:** small model flags health, ethnicity and religion statements in free text; flagged spans removed.
5. **Log:** write `redaction_log` rows with category and a hash of the excerpt, never the excerpt itself.
6. **Save:** write `cv_text.redacted_text`.
7. **Delete original:** remove the file from storage; set `uploads.deleted_at`. The workflow fails loudly if deletion fails.
8. **Hand off:** trigger experience extraction.

**Restore:** if a candidate restores a false positive (for example "Health and Safety Coordinator" flagged as health), the restored text is re-inserted into `redacted_text` and the log row marked `restored = true`.

## Model gateway

All model calls go through one function: `runTask(taskName, input)`.

- A task registry maps each task to tier, model id (`claude-haiku-5-5`, `claude-sonnet-5-5` or `claude-opus-5-5`), prompt version, output schema, maximum tokens and effort (lowest for scoring and classification; temperature cannot be set on current models, D-24).
- Outputs are structured JSON validated against the schema; invalid output is retried once, then the job fails visibly.
- Every call writes a `job_runs` row with tokens and estimated cost; prompt and response content are never logged.
- Changing a model or prompt version requires a passing calibration run.

## Background jobs

| Job | Trigger | Concurrency |
| --- | --- | --- |
| `cv.redact` | Upload completed | Per candidate: 1 |
| `experiences.extract` | Redaction complete | Per candidate: 1 |
| `experiences.score` | Extraction complete, or evidence changed | Global limit per model tier |
| `expectations.build` | Target role saved, after extraction | Per candidate: 1 |
| `claims.check` | Extraction complete | Per candidate: 1 |
| `retention.purge` | Daily schedule, and on delete request | Single |

## Phase 1 AI tasks

| Task | Tier | Input | Output | Screen |
| --- | --- | --- | --- | --- |
| `extract_experiences` | Small | Redacted CV text | Experiences with job label and exact source span | 2 |
| `rank_for_role` | Medium | Experiences, job ad | Top 8 to 10 experiences for the sprint, with reason | 2, 3 |
| `score_experience` | Medium | Experience, evidence fields | Five dimension scores (1 to 7) and reasons from the fixed list | 2, 3 |
| `next_sprint_question` | Rules, then small | Evidence fields, persona | Next missing field in the fixed order, phrased in plain words (graduate framing for PE-1) | 3 |
| `parse_sprint_answer` | Small | Candidate's answer | Evidence fields; flags any number not labelled exact or estimate | 3 |
| `build_expectations` | Medium | Job ad, matched occupation profile | 5 to 10 expected areas, each labelled in_ad or typical, matched to experiences | 4 |
| `check_claims` | Rules plus small and medium | Experiences, job dates | Vague, inconsistent (date overlap by rule), unlikely and ownership flags, each with one question | 5 |

**Fixed sprint question order:** outcome, then baseline and new value, then timeframe, then measure, then personal versus team role, then verifier. Only missing fields are asked.

## Scoring rules

- Phase 1 dimensions and weights: outcome evidence 30%, specificity 20%, ownership 20%, credibility 20%, action reasoning 10%. Relevance and level calibration are added in Phase 2, once full role decoding exists.
- Overall score is the weighted mean, rounded to a whole number. Bands: 6 to 7 Interview-ready; 4 to 5 Needs detail; 1 to 3 Not yet a story.
- Fixed reasons, each with a plain-language label: no_result ("no result"), says_we ("says 'we' not 'I'"), no_timeframe ("no timeframe"), no_baseline ("no starting point"), no_measure ("not measured"), duty_not_outcome ("a duty, not an outcome"), unverified ("no one named who could confirm it"), vague_claim ("too vague to score").

## Integrity guards

These enforce the approved rules in code, not only in prompts.

| Guard | Rule it enforces | Mechanism |
| --- | --- | --- |
| Number guard | Never invent a number | Every number in model output must appear in the CV text or a candidate answer; otherwise the output is rejected and retried |
| Estimate guard | Estimates always labelled | A number cannot be saved until marked exact or estimate; estimates require a basis |
| Rating guard | No rating rise without new evidence | Scoring runs only when an evidence field changes; a higher band without a new field is discarded |
| Skip guard | Skipped is never "no" | Unanswered questions stored as unanswered; expectations stay not_found until answered |
| Edit guard | Never change the candidate's words unseen | Evidence notes are shown for confirmation before saving; original CV text is never modified |
| Tone guard | Honest, not flattering | Interface copy comes from approved templates; model phrasing is checked against a banned-praise list |

## Calibration set (AI-only, D-16)

Built and checked entirely by AI during development, stored in `packages/eval`, run in CI on every prompt or model change.

| Set | Size | How it is built | Proposed pass threshold |
| --- | --- | --- | --- |
| Experience statements | 150 (50 per band), across the five personas and at least 10 industries | Large model writes each statement to an explicit level specification; a second, independent large-model pass scores it; statements where the two disagree are rewritten | At least 85% exact band match; no statement off by more than one band |
| Sprint answers with numbers | 40 | Includes unlabelled numbers and seeded invented numbers | Number and estimate guards catch 100% |
| Claim checks | 30 | Known vague, inconsistent, unlikely and ownership cases | Date overlaps 100%; other types at least 80% |
| Role expectations | 30 job ads | Each with a known list of expected areas | At least 80% of known areas found and correctly labelled |

## Acceptance tests

| ID | Test | Traces to |
| --- | --- | --- |
| AT-01 | A test CV with a photo, date of birth, health line and ethnicity statement leaves none of them in `cv_text`; the redaction log lists them; the original file is gone | US-04 |
| AT-02 | PDF and DOCX CVs parse; a corrupt file shows a plain error and a suggested alternative | US-02 |
| AT-03 | A truncated job ad triggers the warning | Screen 1 |
| AT-04 | Every experience has a source span; the Screen 2 headline counts match the stored bands | US-16 |
| AT-05 | The sprint asks only missing fields, in the fixed order; skipped questions are stored as unanswered | US-17, US-45 |
| AT-06 | An unlabelled number cannot be saved; an estimate requires a basis; a seeded invented number is rejected | US-18 |
| AT-07 | A graduate persona receives study, volunteer and part-time framing | US-17 |
| AT-08 | Expectations carry an in_ad or typical label; yes adds to the sprint, no records a gap, not sure stays open | US-44 |
| AT-09 | Date overlaps are always flagged; an unlikely figure prompts a method question and is never altered by the app; "we" claims prompt an ownership question | US-46 |
| AT-10 | A rating never rises without a new evidence field | Approved rules |
| AT-11 | Summary before and after counts are correct; feedback is saved | Screen 6 |
| AT-12 | Every cross-candidate read and write attempt fails | Phase 0 |
| AT-13 | Retention purge removes all personal rows and files on the retention date and immediately on request | US-06 |

## Exit criteria

**Phase 0 is done when:** authentication, the RLS test suite, the upload and redaction pipeline, the model gateway, the job engine, the retention purge, error monitoring and the calibration harness all run in staging; and AI cost per task has been priced from current provider price lists and checked against the agreed ceilings (US$0.30 per free user, US$8 per Sprint user, base scenario).

**Phase 1 is done when:** all acceptance tests pass, the calibration thresholds are met, and the go or no-go test with about 15 NZ candidates meets the four approved thresholds. Only then does Phase 2 start.

## Out of scope for Phases 0 and 1

LinkedIn import, organisation research, full role decoding, the Fit/Gap Matrix, question prediction, mock interviews, drills, payments and framework packs.
