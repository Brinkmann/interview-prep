# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A web-based interview preparation platform that coaches candidates to give outcome-based, evidenced answers. The product is fully specified in `docs/spec/`. The specification is the source of truth: build against it, not against memory or assumptions.

| File | Contents |
| --- | --- |
| `docs/spec/01-master-spec.md` | Principles, workflow, data model, feature requirements (FR), rubric, legal requirements (LR), decision log (D) |
| `docs/spec/02-user-stories.md` | 47 user stories (US) with MoSCoW priorities |
| `docs/spec/03-commercial-model.md` | Free versus paid tiers and caps |
| `docs/spec/04-architecture.md` | Agreed stack, AI pipeline, data zones, hosting, cost ceilings, build phases |
| `docs/spec/05-phase1-experience.md` | Approved Phase 1 candidate experience (screens and wording) |
| `docs/spec/06-phase0-1-build.md` | Technical build detail for Phases 0 and 1, with acceptance tests (AT) |

Where `06-phase0-1-build.md` and `05-phase1-experience.md` differ, the experience document wins.

## Who you are working with

The founder, Oliver, is a senior programme manager, not a programmer. He approves outcomes, not code.

- Guide every manual step (creating accounts, keys, settings in Vercel, Supabase, Inngest, Anthropic, GitHub) one click at a time, in plain language. Assume no command-line experience.
- Never ask him to paste an API key, password or token into the chat. Tell him exactly where to enter it in the service's own settings.
- Report progress against the acceptance tests (AT-01 to AT-13), not in code terms.
- Discuss structure before writing code when a choice is not already settled in the spec.
- Report outcomes only: pass or fail against the acceptance tests, and any action he must take. No progress narration or intermediate updates.
- Merge your own pull requests once the GitHub checks and the staging connection check pass. Do not ask him to merge. Stop and ask only for decisions that change the spec, spend money, or need an account action only he can take.
- Prioritise the platform itself. Monitoring and support tooling get the minimum the exit criteria require.
- Write in British English. Do not use em dashes or en dashes as sentence punctuation; use commas or full stops. Be concise and give one clear recommendation rather than a list of options.

## How to build

1. Work in the phase order set in `04-architecture.md`. Current phase: **Phase 0 (foundations)**, then Phase 1.
2. Stack (agreed, D-22): Next.js (TypeScript) on Vercel; Supabase Postgres with row-level security and pgvector, hosted in Sydney (ap-southeast-2); Supabase Auth and Storage; Inngest for background jobs; Claude via the Anthropic API behind a single model gateway; Stripe from Phase 5.
3. Monorepo layout: `apps/web`, `packages/db`, `packages/ai`, `packages/jobs`, `packages/eval`.
4. Every AI call goes through `runTask(taskName, input)` in `packages/ai`. Never call a model directly from elsewhere.
5. Integrity guards (number, estimate, rating, skip, edit, tone) are enforced in code, not only in prompts.
6. Privacy is non-negotiable: redact before storing, delete original uploads after extraction, never log CV content, answers or transcripts, and keep row-level security on every personal table.
7. A phase is done only when its exit criteria in `06-phase0-1-build.md` are met.

## Recording decisions

If the founder agrees a new decision, add a row to the Decision log in `docs/spec/01-master-spec.md` (next ID after D-23) in the same change.
