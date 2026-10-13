# Architecture

A serverless web tier, a durable job pipeline for every AI step, one Postgres database with row-level security, and a model gateway that routes each task to the cheapest model that does it well. Shared public research is computed once and reused; personal data stays isolated per candidate. Agreed on 13 October 2026 (D-22).

## Architecture principles

| ID | Principle | What it means in practice |
| --- | --- | --- |
| AP1 | Stateless front, durable back | Web requests never wait on an AI step; every AI step runs as a retryable background job. |
| AP2 | Compute public research once | Organisation inventories, benchmarks and framework data are cached by entity and scope and shared across candidates; only personal data is per candidate. |
| AP3 | Cheapest capable model | A model gateway routes each task to a small, medium or large model, or to plain rules, and can switch provider without code changes. |
| AP4 | Isolation by default | Every personal row is protected by row-level security; no query can read another candidate's data. |
| AP5 | Quotas enforced server-side | Free caps and tier entitlements are checked in the back end, never only in the interface. |
| AP6 | Privacy built in | Redaction before storage, provenance on every item, deletion as a scheduled job, no model training on candidate data. |
| AP7 | Region-ready | Every candidate record carries a data region, so new regions can be added without re-architecture. |
| AP8 | Measured quality | The AI-only calibration set (D-16) runs automatically on every model or prompt change before release. |

## Recommended technology stack

Managed services throughout, so the platform scales without a dedicated operations team. Supabase is recommended partly because it is already proven in the founder's PPM platform build.

| Layer | Recommendation | Why |
| --- | --- | --- |
| Web app | Next.js (TypeScript) on Vercel | Serverless scaling, global edge delivery, one language front to back. |
| Database | Supabase Postgres with row-level security and pgvector | Relational model fits the objects; RLS gives per-candidate isolation; vectors support story-to-requirement matching. |
| Authentication | Supabase Auth | Built into the same security model as the database. |
| File and video storage | Supabase Storage with lifecycle deletion | CV originals and video deleted automatically after processing. |
| Background jobs | Inngest (durable workflows) | Retries, step-level state, concurrency limits per AI provider, scheduled deletion jobs. |
| Language models | Claude via the Anthropic API, behind an internal model gateway | Small, medium and large tiers (Haiku 5.5, Sonnet 5.5, Opus 5.5); gateway keeps the provider swappable. |
| Speech-to-text | Streaming speech-to-text service with a no-retention option, chosen in Phase 4 | Needed for voice mocks and one-way video transcripts. |
| Voice for AI interviewers | Text-to-speech service with a no-retention option, chosen in Phase 4 | Persona voices for panel and AI-interviewer mocks. |
| Payments | Stripe | One-off Sprint, Pro subscriptions, organisation codes and sales tax in one service. |
| Product analytics | PostHog (EU cloud) | Activation and conversion funnels for the commercial tests. |
| Error monitoring | Sentry | Release-level error tracking. |

## AI pipeline

Each step uses the cheapest tier that does it well. Large-model use is limited to synthesis and calibration, where quality matters most and volume is lowest.

| Stage | Step | Tier | Shared or personal | Notes |
| --- | --- | --- | --- | --- |
| 0 | CV redaction | Rules plus small model | Personal | Pattern rules catch dates, photos and labels; small model catches health or ethnicity in free text. |
| 1 | Role decoding | Medium | Personal (per ad) | Span citations required; cached by ad text hash. |
| 2 | Role benchmark | Rules plus small model | Shared | O\*NET and ESCO imported in bulk; small model classifies the role; cached by occupation code. |
| 3 | Scope Card | Rules | Shared | Deterministic by design (R2). |
| 3 | Organisational inventory | Medium for extraction, large for the brief | Shared | Cached by entity and scope; refreshed on the recency windows. |
| 4 | Claim extraction and scoring | Small for extraction, medium for scoring | Personal | Scoring prompts versioned and calibrated. |
| 4 | Completeness probing | Medium | Personal | Driven by the Expectation Profile; question generation only. |
| 5 | Fit/Gap Matrix and story selection | Rules plus vector matching | Personal | Weights and selection rule are deterministic; vectors propose matches. |
| 5 | Fit narrative and 30-60-90 | Large | Personal | Low volume, high visibility. |
| 6 | Question bank | Medium | Personal, with shared templates | Templates cached per role family. |
| 7 | Mock interviews and probes | Medium | Personal | Streaming responses for live voice; text-only fallback. |
| 7 | One-way video | Speech-to-text, then medium | Personal | Video deleted after transcription unless the candidate keeps it. |
| 8 | Answer scoring and feedback | Medium | Personal | Delivery metrics computed from transcript timings, no model inference. |
| All | Calibration set (D-16) | Large as reference | Development only | Runs in the release pipeline. |

## Data architecture

The database is split into two zones. Keeping public research out of the personal zone means it can be cached and reused at scale, and personal data stays small, isolated and easy to delete.

| Zone | Contents | Access | Retention |
| --- | --- | --- | --- |
| Shared reference | O\*NET and ESCO data, occupation crosswalks, framework packs, question templates | Read-only to all | Updated on source releases |
| Shared research cache | Organisation entities, Scope Cards, evidence cards, role benchmarks | Read-only to all; written by jobs | Refreshed on recency windows; stale cards labelled |
| Personal | Candidate Context, Interview Event, Role Profile, Fact Base, Achievement Inventory, Expectation Profile, Probe Questions, Fit/Gap Matrix, Story Portfolio, Question Bank, Drill Cards, Mock Plans, Feedback Records | Owner only, enforced by row-level security | Candidate-set; default deletion 90 days after the interview |
| Transient files | CV originals, video recordings | Owner only | Deleted after extraction or transcription |

**Upload path:** file arrives in transient storage, the redaction job removes unneeded personal data and writes a redaction log, extraction writes structured objects with provenance, and the original is deleted. Only the redacted, structured data reaches the personal zone.

**Provenance:** every extracted item stores source, span or statement, date, confidence and the model and prompt version that produced it.

**Deletion:** a scheduled job deletes personal rows and files on the retention date; a candidate's delete request runs the same job immediately.

## Scaling and reliability

| Concern | Design |
| --- | --- |
| Traffic peaks | Serverless web tier scales automatically; heavy work queues rather than blocking requests. |
| AI provider limits | Job engine enforces concurrency and rate limits per provider and model; requests back off and retry instead of failing. |
| Provider outage | Model gateway can fail over to an alternative model or provider for non-scoring tasks; scoring waits rather than switching, so scores stay comparable. |
| Repeated research | Organisation and benchmark results are cached, so the hundredth candidate applying to the same employer reuses the first candidate's research. |
| Database growth | Personal data is deleted on schedule, which keeps tables small; read-heavy shared tables use read replicas when needed. |
| Live voice mocks | Streaming speech-to-text and text-to-speech over WebRTC; text-only fallback when bandwidth is poor. |
| Video uploads | Recorded in the browser, uploaded directly to storage in chunks, transcribed by a background job. |
| Abuse and cost control | Per-account quotas, sign-up verification and limits on free sessions per device. |
| Quality drift | Calibration set and regression tests run on every prompt or model change; releases blocked on failure. |
| New regions | Region field on every candidate record; a new region adds a database and storage location without changing the application. |

## Hosting, security and privacy

**Recommendation:** host the database and storage in Sydney (ap-southeast-2) at launch, because the platform launches in New Zealand first (D-21) and Australia is the natural second market. The NZ Privacy Act allows overseas storage where comparable safeguards apply, and Australia's Privacy Act is generally regarded as providing them; confirm in the privacy review. GDPR remains the design baseline (D-09), so adding an EU region when Europe or the UK opens needs no redesign (AP7).

| Area | Requirement |
| --- | --- |
| Encryption | TLS in transit; encryption at rest for database and storage. |
| Subprocessors | AI, speech and voice providers contracted for no training on customer data and minimal or zero retention; listed publicly. |
| Access | No staff access to personal data by default; break-glass access logged. |
| Secrets | API keys in a managed secrets store, rotated; never in the browser. |
| Logging | Application logs exclude CV content, answers and transcripts. |
| Breach response | Documented plan meeting the strictest notification window across the five laws (GDPR 72 hours). |
| Assurance | DPIA before launch (LR-11); privacy lawyer review of data flows; penetration test before public launch. |

## Cost model

In the base scenario (3% conversion, Sprint at US$39), each free sign-up brings in about US$1.17 of revenue on average (0.03 × 39). The free tier is viable only if a free user costs well below that.

| Target | Ceiling | Basis |
| --- | --- | --- |
| AI cost per free user | US$0.30 | About a quarter of revenue per free sign-up in the base scenario |
| AI cost per Sprint user | US$8 | About 20% of the US$39 Sprint price |

**Usage per user, to be priced in Phase 0 from current provider price lists:**

| Driver | Free user | Sprint user (estimate) |
| --- | --- | --- |
| Role decoding | 1 run | 1 to 2 runs |
| Organisation brief | 3 cards, mostly from cache | Full brief, mostly from cache |
| CV extraction and scoring | 1 run | 1 run plus re-scoring after the evidence sprint |
| Completeness probes | 3 | About 30 |
| Mock interviews | One 5-question mock, about 10 minutes of speech | About 6 mocks, 60 to 90 minutes of speech |
| Answer scoring | 5 answers | About 60 answers including re-attempts |
| Drill card marking | 10 | About 150 |
| Large-model synthesis | None | Fit narrative, 30-60-90, interview brief |

**Levers if a ceiling is breached:** route more steps to the small model, raise cache reuse, shorten the free mock, or move speech to text-only in the free tier.

## Build sequence

Six phases deliver all 27 Must stories. Phase 1 proves the core differentiator first: if evidence scoring and completeness probing do not impress candidates, nothing after it matters.

| Phase | Goal | Must stories | Exit test |
| --- | --- | --- | --- |
| 0. Foundations | Platform skeleton that scales and protects data | US-04, 06 | Auth, RLS, job engine, model gateway, redaction, deletion job and calibration harness running; AI unit costs priced |
| 1. Evidence core (prototype) | Prove evidence scoring and completeness probing | US-02, 16, 17, 18, 44, 45, 46 | Calibration set passes; test candidates rate the probing as useful |
| 2. Role and organisation | Decode the role and build the scoped brief | US-01, 05, 08, 09, 12, 14 | Every item cited or labelled; Scope Card deterministic; shared cache reused |
| 3. Prepare | Matrix, stories, narrative and questions | US-20, 21, 22, 23, 25 | Every weight-3 row covered or has a gap move |
| 4. Practise | Mocks, one-way video, probes, feedback, drills | US-27, 28, 30, 31, 33 | Video settings honoured; drill retirement rule enforced; Sprint cost under ceiling |
| 5. Ready and launch | Readiness, cue card, payments and quotas | US-37, 38 | Free caps enforced server-side; Stripe live; DPIA and penetration test complete |

The Sprint price test (`03-commercial-model.md`) runs on a landing page in parallel with Phases 0 and 1.

## Decisions to confirm

All five agreed on 13 October 2026 and recorded as D-22.

- [x] Adopt the stack as recommended (Next.js on Vercel, Supabase, Inngest, Claude behind a model gateway, Stripe).
- [x] Host in Sydney (ap-southeast-2) at launch for the NZ market, region-ready for an EU region when Europe or the UK opens.
- [x] Cost ceilings of US$0.30 per free user and US$8 per Sprint user in the base scenario, revisited after Phase 0 pricing.
- [x] Build in the six-phase sequence, with Phase 1 as the go or no-go prototype.
- [x] Select speech-to-text and voice providers in Phase 4 against latency and no-retention terms.
