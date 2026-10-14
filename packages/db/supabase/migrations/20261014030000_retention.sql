-- US-06 / LR-04: every candidate has a deletion date. No interview date is captured
-- before Phase 2, so the default is 90 days after sign-up until one is known.
alter table public.candidates alter column retention_until set default (current_date + 90);
update public.candidates set retention_until = (created_at::date + 90) where retention_until is null;
alter table public.candidates alter column retention_until set not null;
