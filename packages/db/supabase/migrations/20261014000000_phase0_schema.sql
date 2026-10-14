-- Phase 0 and 1 schema (06-phase0-1-build.md, Database schema and Row-level security).
--
-- Rules enforced here:
-- * Every personal table carries candidate_id, region, created_at and updated_at.
-- * Row-level security is on for every table. Personal rows are visible and writable
--   only where candidate_id = auth.uid().
-- * Child rows reference parents by (id, candidate_id), so a candidate cannot attach
--   a row to another candidate's data even though foreign key checks bypass RLS.
-- * Deleting a candidate cascades to every personal row (retention purge, US-06).
-- * AI-produced rows carry provenance: source_type, source_span, model_id,
--   prompt_version, confidence. model_id is null when plain rules produced the row.

-- Shared helpers ---------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Candidates -------------------------------------------------------------------

create table public.candidates (
  id uuid primary key references auth.users (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  retention_until date,
  persona text check (persona in ('pe1', 'pe2', 'pe3', 'pe4', 'pe5')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Personal tables --------------------------------------------------------------
-- Columns common to every personal table are written out in full in each table
-- so the schema reads plainly.

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  notice_version text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.target_roles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  job_ad_text text not null,
  ad_hash text not null,
  title text,
  truncation_warning boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, candidate_id)
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  storage_path text not null,
  status text not null default 'received'
    check (status in ('received', 'extracting', 'redacting', 'redacted', 'failed', 'deleted')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, candidate_id)
);

create table public.cv_text (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  upload_id uuid,
  redacted_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, candidate_id),
  foreign key (upload_id, candidate_id) references public.uploads (id, candidate_id) on delete set null (upload_id)
);

-- Stores what was removed, never the removed text itself.
create table public.redaction_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  cv_text_id uuid not null,
  category text not null
    check (category in ('date_of_birth', 'age', 'gender', 'marital_status', 'nationality',
                        'photo', 'health', 'ethnicity', 'religion')),
  excerpt_hash text not null,
  restored boolean not null default false,
  source_type text not null default 'cv' check (source_type = 'cv'),
  source_span int4range,
  model_id text,
  prompt_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (cv_text_id, candidate_id) references public.cv_text (id, candidate_id) on delete cascade
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  job_label text not null,
  original_text text not null,
  rank_for_role integer,
  source_type text not null check (source_type in ('cv', 'candidate_answer', 'job_ad', 'reference')),
  source_span int4range,
  model_id text,
  prompt_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, candidate_id)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  experience_id uuid not null,
  outcome text,
  baseline text,
  new_value text,
  timeframe text,
  personal_role text,
  team_role text,
  verifier text,
  is_estimate boolean,
  estimate_basis text,
  source_type text not null check (source_type in ('cv', 'candidate_answer', 'job_ad', 'reference')),
  source_span int4range,
  model_id text,
  prompt_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, candidate_id),
  foreign key (experience_id, candidate_id) references public.experiences (id, candidate_id) on delete cascade,
  -- Estimate guard (AT-06): an estimate must state its basis.
  constraint estimate_has_basis check (is_estimate is not true or nullif(trim(estimate_basis), '') is not null)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  experience_id uuid not null,
  outcome_evidence smallint not null check (outcome_evidence between 1 and 7),
  specificity smallint not null check (specificity between 1 and 7),
  ownership smallint not null check (ownership between 1 and 7),
  credibility smallint not null check (credibility between 1 and 7),
  action_reasoning smallint not null check (action_reasoning between 1 and 7),
  overall smallint not null check (overall between 1 and 7),
  band text not null check (band in ('interview_ready', 'needs_detail', 'not_yet_a_story')),
  reasons text[] not null default '{}'
    check (reasons <@ array['no_result', 'says_we', 'no_timeframe', 'no_baseline', 'no_measure',
                            'duty_not_outcome', 'unverified', 'vague_claim']),
  evidence_version integer not null,
  source_type text not null check (source_type in ('cv', 'candidate_answer', 'job_ad', 'reference')),
  source_span int4range,
  model_id text,
  prompt_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (experience_id, candidate_id) references public.experiences (id, candidate_id) on delete cascade
);

create table public.expectations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  target_role_id uuid not null,
  area text not null,
  source text not null check (source in ('in_ad', 'typical')),
  status text not null default 'not_found' check (status in ('found', 'not_found')),
  matched_experience_id uuid,
  -- Skip guard (AT-05, AT-08): skipped is stored as unanswered, never as no.
  answer text not null default 'unanswered' check (answer in ('yes', 'no', 'unsure', 'unanswered')),
  source_type text not null check (source_type in ('cv', 'candidate_answer', 'job_ad', 'reference')),
  source_span int4range,
  model_id text,
  prompt_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (target_role_id, candidate_id) references public.target_roles (id, candidate_id) on delete cascade,
  foreign key (matched_experience_id, candidate_id) references public.experiences (id, candidate_id) on delete set null (matched_experience_id)
);

create table public.probes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  trigger text not null
    check (trigger in ('missing_field', 'expectation', 'vague', 'inconsistent', 'unlikely', 'ownership')),
  target_id uuid not null,
  question text not null,
  answer text,
  resulting_action text,
  source_type text not null check (source_type in ('cv', 'candidate_answer', 'job_ad', 'reference')),
  source_span int4range,
  model_id text,
  prompt_version text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  usefulness smallint not null check (usefulness between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shared reference -------------------------------------------------------------

create table public.occupations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  scheme text not null check (scheme in ('onet', 'esco')),
  title text not null,
  tasks text[] not null default '{}',
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scheme, code)
);

-- System -----------------------------------------------------------------------
-- Cost and reliability tracking. No personal content. candidate_id allows cost per
-- user to be priced and is cleared when the candidate is deleted.

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates (id) on delete set null,
  job text not null,
  task text,
  model_id text,
  status text not null check (status in ('started', 'succeeded', 'failed', 'retried')),
  tokens_in integer,
  tokens_out integer,
  cost_estimate numeric(10, 6),
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes on candidate_id keep RLS checks and the retention purge fast.
create index on public.consents (candidate_id);
create index on public.target_roles (candidate_id);
create index on public.uploads (candidate_id);
create index on public.cv_text (candidate_id);
create index on public.redaction_log (candidate_id);
create index on public.experiences (candidate_id);
create index on public.evidence (candidate_id);
create index on public.scores (candidate_id);
create index on public.expectations (candidate_id);
create index on public.probes (candidate_id);
create index on public.feedback (candidate_id);
create index on public.job_runs (candidate_id);
create index on public.candidates (retention_until);

-- updated_at triggers and row-level security --------------------------------------

do $$
declare
  t text;
  personal text[] := array['consents', 'target_roles', 'uploads', 'cv_text', 'redaction_log', 'experiences',
                           'evidence', 'scores', 'expectations', 'probes', 'feedback'];
begin
  foreach t in array personal || array['candidates', 'occupations', 'job_runs'] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    -- Signed-out visitors get nothing, whatever the policies say.
    execute format('revoke all on public.%I from anon', t);
  end loop;

  foreach t in array personal loop
    execute format('create policy own_select on public.%I for select to authenticated
                    using (candidate_id = (select auth.uid()))', t);
    execute format('create policy own_insert on public.%I for insert to authenticated
                    with check (candidate_id = (select auth.uid()))', t);
    execute format('create policy own_update on public.%I for update to authenticated
                    using (candidate_id = (select auth.uid()))
                    with check (candidate_id = (select auth.uid()))', t);
    execute format('create policy own_delete on public.%I for delete to authenticated
                    using (candidate_id = (select auth.uid()))', t);
  end loop;
end;
$$;

create policy own_select on public.candidates for select to authenticated
  using (id = (select auth.uid()));
create policy own_insert on public.candidates for insert to authenticated
  with check (id = (select auth.uid()));
create policy own_update on public.candidates for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy own_delete on public.candidates for delete to authenticated
  using (id = (select auth.uid()));

-- Shared reference: read by signed-in users; written by the service role only.
create policy read_all on public.occupations for select to authenticated using (true);
revoke insert, update, delete, truncate on public.occupations from authenticated;

-- System: service role only. No policy means no access for anyone else.
revoke all on public.job_runs from authenticated;

-- Transient CV storage -----------------------------------------------------------
-- Private bucket. Each candidate's files live under a folder named with their id.
-- Files are never updated in place, so there is no update policy.

insert into storage.buckets (id, name, public) values ('cv-uploads', 'cv-uploads', false)
  on conflict (id) do nothing;

create policy cv_uploads_own_select on storage.objects for select to authenticated
  using (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy cv_uploads_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy cv_uploads_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
