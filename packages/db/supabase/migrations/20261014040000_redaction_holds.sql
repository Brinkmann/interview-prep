-- D-27: removed text is held encrypted for 24 hours so the candidate can restore a
-- false positive, then deleted. The ciphertext is useless without the server key.
alter table public.redaction_log add column marker text;
alter table public.redaction_log add constraint redaction_log_id_candidate_key unique (id, candidate_id);

create table public.redaction_holds (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  region text not null default 'ap-southeast-2',
  redaction_log_id uuid not null unique,
  ciphertext text not null,
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (redaction_log_id, candidate_id) references public.redaction_log (id, candidate_id) on delete cascade
);
create index on public.redaction_holds (candidate_id);
create index on public.redaction_holds (expires_at);

create trigger set_updated_at before update on public.redaction_holds
  for each row execute function public.set_updated_at();
alter table public.redaction_holds enable row level security;
revoke all on public.redaction_holds from anon;
create policy own_select on public.redaction_holds for select to authenticated
  using (candidate_id = (select auth.uid()));
create policy own_insert on public.redaction_holds for insert to authenticated
  with check (candidate_id = (select auth.uid()));
create policy own_update on public.redaction_holds for update to authenticated
  using (candidate_id = (select auth.uid())) with check (candidate_id = (select auth.uid()));
create policy own_delete on public.redaction_holds for delete to authenticated
  using (candidate_id = (select auth.uid()));
